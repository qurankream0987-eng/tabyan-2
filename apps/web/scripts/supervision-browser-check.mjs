#!/usr/bin/env node
/**
 * Supervision UX acceptance check — Books (/admin/library) in headless Chromium over CDP.
 *
 * Runs the real page against a running dev server. tRPC is answered by an in-browser
 * mock (Fetch domain): 60 books, recorded mutations, a slow delete for double-submit.
 * No server, database or credentials are involved.
 *
 *   PORT=5199 BASE_PATH=/ npm run dev --workspace @workspace/tabyan
 *   node apps/web/scripts/supervision-browser-check.mjs --base http://127.0.0.1:5199 [--out dir] [--chromium path] [--sweep] [--viewports desktop,android]
 *
 * Acceptance cases (per viewport): A deep-scroll Add, B deep-scroll Edit, C close keeps
 * context, D specific delete confirmation + single submit, E long form keeps Save reachable,
 * plus unsaved-changes guard, filters, and no horizontal overflow.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]?.startsWith("--") ? "" : all[index + 1] ?? ""]] : pairs), []));
const BASE = args.base ?? "http://127.0.0.1:5199";
const OUT = args.out ?? null;
const CHROMIUM = args.chromium ?? process.env.CHROMIUM ?? "chromium";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 2, mobile: true },
  "small-iphone": { width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
  "large-iphone": { width: 430, height: 932, deviceScaleFactor: 3, mobile: true },
  android: { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true },
};

const BOOKS = Array.from({ length: 60 }, (_, index) => ({
  id: `book-${index + 1}`, title: `كتاب الاختبار رقم ${index + 1}`, author: index % 3 ? "مؤلف معروف" : null,
  category: ["aqeedah", "fiqh", "tajweed", "hadith"][index % 4], section: index % 5 === 0 ? "curriculum" : "general",
  contentType: ["pdf", "text", "link", "audio"][index % 4], sourceType: "external", fileObjectKey: null, fileUrl: null,
  externalUrl: index % 4 === 2 ? "https://example.org/book" : null, textContent: index % 4 === 1 ? "نص" : null,
  coverUrl: null, description: "وصف مختصر", audioUrl: null, levelIds: index % 5 === 0 ? [1] : [],
  status: index % 7 === 0 ? "archived" : "published",
}));
const LEVELS = [{ id: 1, name: "المستوى الأول" }, { id: 2, name: "المستوى الثاني" }];
const QUERY_DATA = {
  "auth.me": { id: "admin-1", fullName: "مشرف الاختبار", phone: "", role: "admin" },
  "admin.libraryList": BOOKS,
  "admin.levelThresholds": LEVELS,
};

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message)); else resolve(data.result);
    } else if (data.method) for (const listener of listeners.get(data.method) ?? []) listener(data.params);
  };
  return new Promise((resolve, reject) => {
    ws.onerror = reject;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => { id += 1; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); }),
      on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
      close: () => ws.close(),
    });
  });
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "sv-chrome-"));
  const chrome = spawn(CHROMIUM, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--lang=ar", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = "";
    chrome.stderr.on("data", (chunk) => { buffer += chunk; const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/); if (match) resolve(match[1]); });
    chrome.on("exit", (code) => reject(new Error(`chromium exited ${code}: ${buffer.slice(-300)}`)));
  });
  return { chrome, httpBase: wsUrl.replace(/^ws/, "http").replace(/\/devtools\/browser\/.*/, "") };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openPage(httpBase, viewport) {
  const target = await (await fetch(`${httpBase}/json/new?about:blank`, { method: "PUT" })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  const mutations = [];
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", viewport);
  if (viewport.mobile) await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/trpc/*", requestStage: "Request" }] });
  cdp.on("Fetch.requestPaused", async ({ requestId, request }) => {
    const url = new URL(request.url);
    const procedures = decodeURIComponent(url.pathname.split("/api/trpc/")[1] ?? "").split(",");
    const isMutation = request.method === "POST";
    let inputs = {};
    try { inputs = isMutation ? JSON.parse(request.postData ?? "{}") : JSON.parse(url.searchParams.get("input") ?? "{}"); } catch { /* empty */ }
    const results = procedures.map((name, index) => {
      if (isMutation) { mutations.push({ name, input: inputs[index]?.json ?? null, at: Date.now() }); return { result: { data: { json: { ok: true } } } }; }
      return { result: { data: { json: name in QUERY_DATA ? QUERY_DATA[name] : null } } };
    });
    if (isMutation && procedures.includes("admin.libraryDelete")) await sleep(700);
    const body = Buffer.from(JSON.stringify(results)).toString("base64");
    await cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }], body }).catch(() => {});
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `
    try { localStorage.setItem("tabyan_token", "test-admin-token"); localStorage.setItem("tabyan_role", "admin"); localStorage.setItem("tabyan.splashSeen", "1"); localStorage.setItem("tabyan.knownAccount", "1"); } catch {}
  ` });
  return { cdp, mutations };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

const HELPERS = `
  const byText = (selector, text) => [...document.querySelectorAll(selector)].find((el) => el.textContent.trim().includes(text) && el.getClientRects().length);
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
  const dialogs = () => [...document.querySelectorAll("[data-admin-dialog]")];
  const topDialog = () => dialogs().at(-1) ?? null;
`;

async function waitFor(cdp, condition, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(cdp, `${HELPERS} return !!(${condition});`)) return true;
    await sleep(60);
  }
  return false;
}

async function tap(cdp, locator) {
  const point = await evaluate(cdp, `${HELPERS} const el = ${locator}; if (!el) return null; return rect(el);`);
  if (!point) throw new Error(`not found: ${locator}`);
  for (const type of ["mousePressed", "mouseReleased"]) await cdp.send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 });
  return point;
}

async function key(cdp, keyName, code = keyName) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code, windowsVirtualKeyCode: keyName === "Escape" ? 27 : 0 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: keyName === "Escape" ? 27 : 0 });
}

const scrollY = (cdp) => evaluate(cdp, "return Math.round(window.scrollY);");

async function settledScroll(cdp) {
  let last = -1;
  for (let i = 0; i < 40; i += 1) {
    const now = await scrollY(cdp);
    if (now === last) return now;
    last = now;
    await sleep(80);
  }
  return last;
}

async function screenshot(cdp, name) {
  if (!OUT) return;
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
}

async function runViewport(httpBase, name, viewport) {
  const { cdp, mutations } = await openPage(httpBase, viewport);
  const results = [];
  const check = (id, label, pass, detail = "") => results.push({ id, label, pass: !!pass, detail });
  await cdp.send("Page.navigate", { url: `${BASE}/admin/library` });
  const loaded = await waitFor(cdp, `document.querySelectorAll('ul[aria-label="الكتب"] > li').length === 60`, 15000);
  check("load", "list renders 60 books", loaded);
  if (!loaded) { await screenshot(cdp, `${name}-load-failed`); cdp.close(); return results; }

  // Measure against the device width: an overflowing page makes mobile Chrome zoom out, which inflates innerWidth.
  const widths = await evaluate(cdp, "return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth };");
  check("overflow", "no horizontal page overflow at device width", widths.scroll <= viewport.width + 1 && widths.inner <= viewport.width + 1, `scrollWidth=${widths.scroll} innerWidth=${widths.inner} device=${viewport.width}`);

  // Scroll deep: put book 41 in the middle of the viewport.
  // The app uses `scroll-behavior: smooth`; scroll instantly and wait until the position settles.
  await evaluate(cdp, `const li = document.querySelectorAll('ul[aria-label="الكتب"] > li')[40]; window.scrollTo({ top: li.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2, behavior: "instant" }); return true;`);
  const deep = await settledScroll(cdp);
  check("deep", "page is scrolled deep into the list", deep > 600, `scrollY=${deep}`);
  await screenshot(cdp, `${name}-1-list-deep`);

  // A — Add while deep.
  const addVisible = await evaluate(cdp, `${HELPERS} const b = document.querySelector('button[aria-label="إضافة كتاب"]'); const r = b && rect(b); return !!r && r.top >= 0 && r.bottom <= window.innerHeight;`);
  check("A.reachable", "«إضافة كتاب» is visible without scrolling back", addVisible);
  const tAdd = Date.now();
  await tap(cdp, `document.querySelector('button[aria-label="إضافة كتاب"]')`);
  const addOpened = await waitFor(cdp, `topDialog()`, 1000);
  check("A.opens", "Add opens immediately", addOpened, `${Date.now() - tAdd}ms`);
  check("A.noJump", "list position unchanged while Add is open", (await scrollY(cdp)) === deep);
  const focusInside = await evaluate(cdp, `${HELPERS} return !!topDialog()?.contains(document.activeElement) && document.activeElement.tagName === "INPUT";`);
  check("A.focus", "focus moves to the first field", focusInside);
  // E — long form: switch to text content and fill the body; Save must stay in view.
  await evaluate(cdp, `${HELPERS} const select = [...topDialog().querySelectorAll("select")].find((s) => [...s.options].some((o) => o.value === "text")); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; setter.call(select, "text"); select.dispatchEvent(new Event("change", { bubbles: true })); return true;`);
  await sleep(150);
  await evaluate(cdp, `${HELPERS} const area = topDialog().querySelector("textarea"); area.focus(); return true;`);
  await cdp.send("Input.insertText", { text: "سطر من محتوى الكتاب.\n".repeat(60) });
  await sleep(150);
  const footer = await evaluate(cdp, `${HELPERS} const b = byText("[data-admin-dialog] button", "إضافة الكتاب"); const c = byText("[data-admin-dialog] button", "إلغاء"); const rb = rect(b), rc = rect(c); const body = topDialog().querySelector(".overflow-y-auto"); return { save: rb.top >= 0 && rb.bottom <= window.innerHeight, cancel: rc.top >= 0 && rc.bottom <= window.innerHeight, scrolls: body.scrollHeight > body.clientHeight, saveHeight: Math.round(rb.height) };`);
  check("E.save", "Save visible on a long form without scrolling", footer.save && footer.scrolls, JSON.stringify(footer));
  check("E.cancel", "Cancel visible on a long form", footer.cancel);
  check("touch", "footer buttons ≥ 44px tall", footer.saveHeight >= 44, `${footer.saveHeight}px`);
  await screenshot(cdp, `${name}-2-add-long-form`);
  // Unsaved changes: Escape asks first, «تجاهل» closes.
  await key(cdp, "Escape");
  const prompted = await waitFor(cdp, `document.querySelector('[role="alertdialog"]')`, 800);
  check("dirty.prompt", "closing an edited form asks before discarding", prompted);
  await screenshot(cdp, `${name}-3-discard-prompt`);
  await tap(cdp, `byText('[role="alertdialog"] button', "تجاهل")`);
  check("dirty.discard", "«تجاهل» closes the form", await waitFor(cdp, `!topDialog()`, 800));
  check("C.afterAdd", "list position preserved after closing Add", (await scrollY(cdp)) === deep, `scrollY=${await scrollY(cdp)} expected=${deep}`);
  // Pristine form closes without a prompt.
  await tap(cdp, `document.querySelector('button[aria-label="إضافة كتاب"]')`);
  await waitFor(cdp, `topDialog()`, 800);
  await key(cdp, "Escape");
  check("dirty.none", "unchanged form closes without a prompt", await waitFor(cdp, `!topDialog() && !document.querySelector('[role="alertdialog"]')`, 800));

  // B — Edit while deep.
  const title = BOOKS[40].title;
  const tEdit = Date.now();
  await tap(cdp, `document.querySelector('button[aria-label="تعديل ${title}"]')`);
  const editOpened = await waitFor(cdp, `topDialog()`, 1000);
  check("B.opens", "Edit opens immediately", editOpened, `${Date.now() - tEdit}ms`);
  const prefilled = await evaluate(cdp, `${HELPERS} return topDialog().querySelector("input").value;`);
  check("B.values", "Edit shows the current values", prefilled === title, prefilled);
  check("B.noJump", "list position unchanged while Edit is open", (await scrollY(cdp)) === deep);
  await evaluate(cdp, `${HELPERS} const input = topDialog().querySelector("input"); input.focus(); input.select(); return true;`);
  await cdp.send("Input.insertText", { text: `${title} (مُحدّث)` });
  await screenshot(cdp, `${name}-2b-edit-open`);
  await tap(cdp, `byText("[data-admin-dialog] button", "حفظ التعديلات")`);
  const saved = await waitFor(cdp, `!topDialog()`, 2000);
  const updateCall = mutations.find((m) => m.name === "admin.libraryUpdate");
  check("B.save", "Save sends libraryUpdate with the edited title and closes", saved && updateCall?.input?.id === BOOKS[40].id && updateCall?.input?.title === `${title} (مُحدّث)`);
  check("feedback", "success toast is shown", await waitFor(cdp, `byText("[role=status], [aria-live], div", "حُفظت تعديلات الكتاب")`, 1500));
  check("C.afterEdit", "list position preserved after saving", Math.abs((await scrollY(cdp)) - deep) <= 2, `scrollY=${await scrollY(cdp)} expected=${deep}`);

  // D — Delete from the row menu: specific confirmation, single submit.
  await tap(cdp, `document.querySelector('button[aria-label="خيارات ${BOOKS[41].title}"]')`);
  await waitFor(cdp, `document.querySelector('[role="menu"]')`, 1000);
  await screenshot(cdp, `${name}-4-row-menu`);
  await tap(cdp, `byText('[role="menuitem"]', "حذف نهائي")`);
  await waitFor(cdp, `topDialog()`, 1000);
  const confirmText = await evaluate(cdp, `${HELPERS} return topDialog()?.textContent ?? "";`);
  check("D.specific", "confirmation names the book and the impact", confirmText.includes(`«${BOOKS[41].title}»`) && confirmText.includes("محفوظات الطلاب"));
  const gated = await evaluate(cdp, `${HELPERS} return byText("[data-admin-dialog] button", "حذف نهائي").disabled;`);
  check("D.gated", "delete stays disabled until «حذف» is typed", gated);
  await evaluate(cdp, `${HELPERS} topDialog().querySelector("input").focus(); return true;`);
  await cdp.send("Input.insertText", { text: "حذف" });
  await screenshot(cdp, `${name}-5-delete-confirm`);
  await tap(cdp, `byText("[data-admin-dialog] button", "حذف نهائي")`);
  await sleep(60);
  await evaluate(cdp, `${HELPERS} byText("[data-admin-dialog] button", "حذف نهائي")?.click(); return true;`);
  await waitFor(cdp, `!topDialog()`, 2500);
  check("D.single", "double press sends exactly one delete", mutations.filter((m) => m.name === "admin.libraryDelete").length === 1, `${mutations.filter((m) => m.name === "admin.libraryDelete").length} calls`);
  check("C.afterDelete", "list position preserved after delete", Math.abs((await scrollY(cdp)) - deep) <= 2);

  // Filters (inline selects on wide screens, filter sheet on phones).
  await evaluate(cdp, `window.scrollTo({ top: 0, behavior: "instant" }); return true;`);
  const archived = BOOKS.filter((b) => b.status === "archived").length;
  const setSelect = (scope) => `${HELPERS} const select = ${scope}; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; setter.call(select, "archived"); select.dispatchEvent(new Event("change", { bubbles: true })); return true;`;
  if (viewport.width < 640) {
    const inlineHidden = await evaluate(cdp, `return [...document.querySelectorAll('select[aria-label="الحالة"]')].every((el) => !el.getClientRects().length);`);
    check("filters.phone", "phones show a single filter button instead of inline selects", inlineHidden);
    await tap(cdp, `document.querySelector('button[aria-label="الفلاتر"]')`);
    await waitFor(cdp, `topDialog()?.textContent.includes("تصفية النتائج")`, 1000);
    await evaluate(cdp, setSelect(`[...topDialog().querySelectorAll("label")].find((l) => l.textContent.trim() === "الحالة").parentElement.querySelector("select")`));
    await screenshot(cdp, `${name}-7-filter-sheet`);
    await tap(cdp, `byText("[data-admin-dialog] button", "عرض النتائج")`);
    await waitFor(cdp, `!topDialog()`, 800);
    check("filters.count", "filter button shows the active count", await waitFor(cdp, `document.querySelector('button[aria-label="الفلاتر، 1 مفعّلة"]')`, 800));
  } else {
    await evaluate(cdp, setSelect(`[...document.querySelectorAll('select[aria-label="الحالة"]')][0]`));
  }
  check("filters", "status filter narrows the list", await waitFor(cdp, `document.querySelectorAll('ul[aria-label="الكتب"] > li').length === ${archived}`, 1500));
  await tap(cdp, `byText("button", "مسح الفلاتر")`);
  check("filters.clear", "«مسح الفلاتر» restores the list", await waitFor(cdp, `document.querySelectorAll('ul[aria-label="الكتب"] > li').length === 60`, 1500));

  // View drawer.
  await tap(cdp, `byText('ul[aria-label="الكتب"] button', "${BOOKS[3].title}")`);
  check("view", "tapping a book opens its details", await waitFor(cdp, `topDialog()?.textContent.includes("نوع المحتوى")`, 1000));
  await screenshot(cdp, `${name}-6-view-drawer`);
  await key(cdp, "Escape");
  await waitFor(cdp, `!topDialog()`, 800);
  cdp.close();
  return results;
}

const SWEEP_ROUTES = ["", "users", "accounts", "schedules", "sessions-monitoring", "library", "qiraat", "promotions", "levels", "sharia",
  "teachers-review", "students-review", "fatwas", "muftis", "assessments", "analytics", "notifications", "inbox", "audit-log", "settings"];

/**
 * --sweep: every supervision route at every viewport, in the app's demo mode (bundled fixtures).
 * Fails on uncaught exceptions, horizontal overflow at device width, and visible controls under 40px.
 */
async function sweepViewport(httpBase, name, viewport) {
  const { cdp } = await openPage(httpBase, viewport);
  const exceptions = [];
  cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => exceptions.push(exceptionDetails.exception?.description?.split("\n")[0] ?? exceptionDetails.text));
  const results = [];
  for (const route of SWEEP_ROUTES) {
    exceptions.length = 0;
    // `?demo=admin` is the app's DEV demo switch (main.tsx); a stored demo token alone is cleared at startup.
    await cdp.send("Page.navigate", { url: `${BASE}/admin${route ? `/${route}` : ""}?demo=admin` });
    // Wait for the mounted admin shell — not the static pre-render fallback in index.html.
    await waitFor(cdp, `document.querySelector(".admin-shell main h1, .admin-shell main h2")`, 8000);
    await sleep(500);
    const report = await evaluate(cdp, `
      const main = document.querySelector(".admin-shell main");
      if (!main) return { scroll: 0, inner: 0, small: ["admin shell did not mount"], smallCount: 1, crashed: true };
      const small = [...main.querySelectorAll("button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")]
        .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ el, r }) => (r.height < 39.5 || (el.tagName === "BUTTON" && r.width < 39.5)) && !el.closest("table thead"))
        .map(({ el, r }) => (el.getAttribute("aria-label") || el.textContent.trim() || el.tagName).slice(0, 30) + " " + Math.round(r.width) + "x" + Math.round(r.height));
      return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth, small: small.slice(0, 6), smallCount: small.length,
        crashed: !!document.querySelector("[data-error-boundary], .error-boundary") || /Something went wrong|حدث خطأ غير متوقع/.test(document.body.innerText) };`);
    const label = `/admin${route ? `/${route}` : ""}`;
    results.push({ id: `${label}`, label: "renders without exceptions", pass: !exceptions.length && !report.crashed, detail: exceptions[0] ?? "" });
    results.push({ id: `${label}`, label: "no horizontal overflow", pass: report.scroll <= viewport.width + 1 && report.inner <= viewport.width + 1, detail: `scroll=${report.scroll} inner=${report.inner}` });
    results.push({ id: `${label}`, label: "controls ≥ 40px", pass: report.smallCount === 0, detail: report.smallCount ? `${report.smallCount}: ${report.small.join(" | ")}` : "" });
    if (OUT && (report.smallCount || report.scroll > viewport.width + 1)) await screenshot(cdp, `sweep-${name}-${route || "home"}`);
  }
  cdp.close();
  return results;
}

const { chrome, httpBase } = await launch();
if (OUT) mkdirSync(OUT, { recursive: true });
let failures = 0;
try {
  const only = args.viewports ? new Set(args.viewports.split(",")) : null;
  for (const [name, viewport] of Object.entries(VIEWPORTS).filter(([key]) => !only || only.has(key))) {
    let results;
    try { results = args.sweep !== undefined ? await sweepViewport(httpBase, name, viewport) : await runViewport(httpBase, name, viewport); }
    catch (error) { results = [{ id: "crash", label: "scenario aborted", pass: false, detail: error.message }]; }
    for (const result of results) {
      if (!result.pass) failures += 1;
      console.log(`${result.pass ? "PASS" : "FAIL"}  [${name}] ${result.id.padEnd(14)} ${result.label}${result.detail ? `  (${result.detail})` : ""}`);
    }
  }
} finally {
  chrome.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
