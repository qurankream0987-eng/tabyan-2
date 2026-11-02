#!/usr/bin/env node
/**
 * Smart Mushaf — real-browser live-follow check (headless Chromium over CDP).
 *
 * Drives the real /student/smart-mushaf-v3 route of a running DEV server with
 * the dev-only fake stream and a fake media device, and reports:
 *   - event → applied / committed / painted latency (p50 / p95 / p99)
 *   - tap → "preparing" visible, tap → mic ready, mic → speech
 *   - layout shifts, long tasks, JS heap growth
 *   - glyph geometry drift relative to its page while states change
 *   - horizontal overflow, and whether the dock ever covers the cursor
 *
 * No network beyond the local dev server; no recognition provider is called.
 *
 *   node smart-mushaf-v3/scripts/browser-live-check.mjs --base http://127.0.0.1:25999 \
 *     [--chromium /path/to/chromium] [--out ./out] [--cases A,B,C,D,E,F,G,M]
 *     [--fake-audio speech-like.wav]   (synthetic signal for VAD timing; not recitation)
 *     [--mode TASMEE|CORRECTION] [--dark x]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const BASE = args.base ?? 'http://127.0.0.1:25999';
const CHROMIUM = args.chromium ?? process.env.CHROMIUM ?? 'chromium';
const OUT = args.out ?? join(tmpdir(), 'smart-mushaf-check');
mkdirSync(OUT, { recursive: true });
const here = dirname(fileURLToPath(import.meta.url));

/** Densest page by recitable word count (case B). */
function densestPage() {
  let best = { page: 0, words: 0 };
  for (let p = 3; p <= 604; p += 1) {
    const data = JSON.parse(readFileSync(join(here, '../../public/mushaf/v1/pages', `${p}.json`), 'utf8'));
    const words = data.v.reduce((sum, v) => sum + v.w.filter((w) => w[2] === 0).length, 0);
    if (words > best.words) best = { page: p, words };
  }
  return best;
}

const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };
const CASES = {
  A: { label: 'A normal page (p.50, 120 ms/word)', viewport: PHONE, page: 50, scenario: 'continuous120', seconds: 8 },
  B: { label: 'B densest page', viewport: PHONE, page: null, scenario: 'continuous80', seconds: 8 },
  C: { label: 'C page boundary (p.2 → p.3)', viewport: PHONE, page: 2, scenario: 'continuous80', seconds: 9 },
  // Browser zoom 300% on a 1280×800 laptop window = a 427×267 CSS viewport at DPR 3.
  D: { label: 'D 300% browser zoom (1280×800 window)', viewport: { width: 427, height: 267, deviceScaleFactor: 3, mobile: false }, page: 50, scenario: 'continuous120', seconds: 8 },
  E: { label: 'E continuous 2-minute recitation', viewport: PHONE, page: 2, scenario: 'marathon', seconds: 120 },
  F: { label: 'F rapid candidate updates', viewport: PHONE, page: 50, scenario: 'rapidCandidates', seconds: 7 },
  G: { label: 'G small phone 320×568', viewport: { width: 320, height: 568, deviceScaleFactor: 2, mobile: true }, page: 50, scenario: 'continuous120', seconds: 6 },
  L: { label: 'L large phone 430×932', viewport: { width: 430, height: 932, deviceScaleFactor: 3, mobile: true }, page: 50, scenario: 'continuous120', seconds: 6 },
  L1: { label: 'L1 large phone 430×932 at DPR 1 (raster control)', viewport: { width: 430, height: 932, deviceScaleFactor: 1, mobile: true }, page: 50, scenario: 'continuous120', seconds: 6 },
  K: { label: 'K Android 412×915', viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true }, page: 50, scenario: 'continuous120', seconds: 6 },
  W: { label: 'W desktop 1440×900', viewport: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, page: 50, scenario: 'continuous120', seconds: 6 },
  M: { label: 'M mixed: pause, backtrack, disconnect', viewport: PHONE, page: 2, scenario: 'mixed', seconds: 12 },
  N: { label: 'N landscape phone 844×390', viewport: { width: 844, height: 390, deviceScaleFactor: 3, mobile: true }, page: 50, scenario: 'continuous120', seconds: 6 },
};

// ── Minimal CDP client ────────────────────────────────────────────────────
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
      if (data.error) reject(new Error(`${data.error.message}`));
      else resolve(data.result);
    } else if (data.method) {
      for (const listener of listeners.get(data.method) ?? []) listener(data.params);
    }
  };
  return new Promise((resolve, reject) => {
    ws.onerror = reject;
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            id += 1;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
        close: () => ws.close(),
      });
  });
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'sm-chrome-'));
  const chrome = spawn(CHROMIUM, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    ...(args['fake-audio'] ? [`--use-file-for-fake-audio-capture=${args['fake-audio']}`] : []),
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk;
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    chrome.on('exit', (code) => reject(new Error(`chromium exited ${code}: ${buffer.slice(-400)}`)));
  });
  return { chrome, httpBase: wsUrl.replace(/^ws/, 'http').replace(/\/devtools\/browser\/.*/, '') };
}

const PAGE_PROBE = `
  window.__perf = { shifts: [], longtasks: [], loaf: [], phaseChanges: [], marks: [] };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) if (n.classList && n.classList.contains('sm-slot')) window.__perf.marks.push(['mount', Math.round(performance.now())]);
        for (const n of r.removedNodes) if (n.classList && n.classList.contains('sm-slot')) window.__perf.marks.push(['unmount', Math.round(performance.now())]);
        if (r.type === 'attributes' && r.target.classList.contains('sm-paper')) window.__perf.marks.push(['page-ready', Math.round(performance.now())]);
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    let last = 0;
    addEventListener('scroll', () => { const t = performance.now(); if (t - last > 200) window.__perf.marks.push(['scroll', Math.round(t)]); last = t; }, { passive: true });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => window.__perf.marks.push(['font', Math.round(performance.now())]));
  });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__perf.loaf.push({
          t: e.startTime,
          d: Math.round(e.duration),
          render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
          style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
          scripts: (e.scripts || []).map((x) => (x.invoker || '') + ' ' + Math.round(x.duration) + 'ms ' + String(x.sourceURL || '').split('/').pop() + ':' + (x.sourceFunctionName || '')).slice(0, 3),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const sources = (e.sources || []).map((s) => {
          const n = s.node;
          if (!n) return '?';
          const own = n.nodeType === 1 ? n : n.parentElement;
          const cls = own && own.className && typeof own.className === 'string' ? own.className.split(' ')[0] : own ? own.nodeName : '#text';
          return cls + ' dx=' + Math.round(s.currentRect.x - s.previousRect.x) + ' dy=' + Math.round(s.currentRect.y - s.previousRect.y);
        });
        window.__perf.shifts.push({ value: e.value, recent: e.hadRecentInput, t: e.startTime, sources });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longtasks.push({ d: e.duration, t: e.startTime });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
`;

const evaluate = async (cdp, expression) => {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(cdp, expression, timeoutMs = 20_000) {
  const started = Date.now();
  for (;;) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    if (Date.now() - started > timeoutMs) throw new Error(`timeout waiting for ${expression}`);
    await sleep(100);
  }
}

async function runCase(httpBase, key, spec) {
  const target = await (await fetch(`${httpBase}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', spec.viewport);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: spec.viewport.mobile, maxTouchPoints: 5 });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_PROBE });
  if (args.css) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(args.css)}; document.head.appendChild(s); });`,
    });
  }
  const mic = args['no-mic'] !== undefined ? '&smMic=0' : '';
  const mode = args.mode ?? 'CORRECTION';
  if (args.dark !== undefined) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { localStorage.setItem('tabyan.smartMushaf.preferences.v1', JSON.stringify({ darkMode: true, showRecitedWords: true, autoFollow: true })); } catch {}`,
    });
  }
  const url = `${BASE}/student/smart-mushaf-v3?smProvider=fake-stream&smScenario=${spec.scenario}&smMode=${mode}&smPage=${spec.page}${mic}`;
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, `window.__smartMushafLive && document.querySelectorAll('.sm-paper[data-ready]').length > 0 && document.querySelector('[data-testid="smart-mushaf-mic"]')`);
  await waitFor(cdp, `window.__smartMushafLive.viewRef.current`);
  await sleep(2000); // fonts, header fitting, scenario preload, idle audio pre-warm
  const heapStart = (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value;

  // Real tap on the mic button; time until the dock shows a non-idle phase.
  await evaluate(cdp, `(() => {
    const dock = document.querySelector('.sm-dock');
    const t0 = performance.now();
    window.__perf.tapAt = t0;
    new MutationObserver(() => {
      const phase = dock.dataset.phase;
      if (!window.__perf.firstPhaseAt && phase !== 'IDLE') {
        window.__perf.firstPhaseAt = performance.now();
        window.__perf.firstPhase = phase;
      }
    }).observe(dock, { attributes: true, attributeFilter: ['data-phase'] });
    window.__smartMushafLive.meter.reset();
  })()`);
  const rect = await evaluate(cdp, `(() => { const r = document.querySelector('[data-testid="smart-mushaf-mic"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });

  // Geometry + dock-overlap sampling while recitation runs.
  await evaluate(cdp, `(() => {
    window.__geo = { samples: new Map(), covered: 0, checks: 0, maxDrift: 0, stateChanges: 0 };
    const tick = () => {
      const live = window.__smartMushafLive;
      const cursor = live.store.getCursor();
      const dock = document.querySelector('.sm-dock');
      const el = cursor >= 0 ? live.store.getElement(cursor) : null;
      if (el && dock) {
        const r = el.getBoundingClientRect();
        const d = dock.getBoundingClientRect();
        window.__geo.checks += 1;
        if (r.bottom > d.top + 1 && r.top < d.bottom) window.__geo.covered += 1;
      }
      for (let o = cursor - 6; o <= cursor + 6; o += 1) {
        const w = o >= 0 ? live.store.getElement(o) : null;
        if (!w) continue;
        const paper = w.closest('.sm-paper').getBoundingClientRect();
        const r = w.getBoundingClientRect();
        const box = [r.left - paper.left, r.top - paper.top, r.width, r.height];
        const key = o;
        const seen = window.__geo.samples.get(key);
        if (!seen) window.__geo.samples.set(key, { box, state: w.dataset.s });
        else {
          if (seen.state !== w.dataset.s) window.__geo.stateChanges += 1;
          seen.state = w.dataset.s;
          for (let i = 0; i < 4; i += 1) window.__geo.maxDrift = Math.max(window.__geo.maxDrift, Math.abs(box[i] - seen.box[i]));
        }
      }
      window.__geo.timer = setTimeout(tick, 60);
    };
    tick();
  })()`);

  await sleep(spec.seconds * 1000);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `case-${key}.png`), Buffer.from(shot.data, 'base64'));

  const result = await evaluate(cdp, `(() => {
    clearTimeout(window.__geo.timer);
    const live = window.__smartMushafLive;
    const snap = live.controller.getSnapshot();
    const t = snap.session.timings;
    const cursor = live.store.getCursor();
    const key = cursor >= 0 ? live.index.keyAt(cursor) : null;
    const shifts = window.__perf.shifts.filter((s) => s.t > window.__perf.tapAt);
    return {
      phase: snap.session.phase,
      cursor: key ? key.surah + ':' + key.ayah + ':' + key.wordIndex : null,
      recited: snap.recited,
      skipped: snap.skipped,
      latency: live.meter.report(),
      tapToVisiblePhaseMs: window.__perf.firstPhaseAt ? +(window.__perf.firstPhaseAt - window.__perf.tapAt).toFixed(1) : null,
      firstVisiblePhase: window.__perf.firstPhase ?? null,
      tapToMicReadyMs: t.micReadyAt && t.tapAt ? Math.round(t.micReadyAt - t.tapAt) : null,
      tapToProviderReadyMs: t.providerReadyAt && t.tapAt ? Math.round(t.providerReadyAt - t.tapAt) : null,
      micReadyToSpeechMs: t.firstSpeechAt && t.micReadyAt ? Math.round(t.firstSpeechAt - t.micReadyAt) : null,
      tapToFirstPositionMs: t.firstPositionAt && t.tapAt ? Math.round(t.firstPositionAt - t.tapAt) : null,
      layoutShiftTotal: +shifts.reduce((sum, s) => sum + s.value, 0).toFixed(4),
      layoutShiftCount: shifts.length,
      layoutShiftSources: [...new Set(shifts.flatMap((s) => s.sources))].slice(0, 8),
      longAnimationFrames: window.__perf.loaf.filter((l) => l.t > window.__perf.tapAt).sort((a, b) => b.d - a.d).slice(0, 4)
        .map((l) => ({ ...l, near: window.__perf.marks.filter(([, t]) => t >= l.t - 250 && t <= l.t + l.d + 50).map(([k, t]) => k + '@' + Math.round(t - l.t)) })),
      longTasks: window.__perf.longtasks.filter((l) => l.t > window.__perf.tapAt).length,
      longTaskMaxMs: Math.round(Math.max(0, ...window.__perf.longtasks.filter((l) => l.t > window.__perf.tapAt).map((l) => l.d))),
      glyphGeometryMaxDriftPx: +window.__geo.maxDrift.toFixed(3),
      glyphStateChangesObserved: window.__geo.stateChanges,
      dockCoveredCursorSamples: window.__geo.covered + '/' + window.__geo.checks,
      horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mountedPages: [...document.querySelectorAll('.sm-paper')].map((p) => +p.dataset.mushafPage),
      paperWidth: Math.round(document.querySelector('.sm-paper').getBoundingClientRect().width),
      viewportWidth: window.innerWidth,
    };
  })()`);
  const heapEnd = (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value;
  result.heapGrowthMB = +((heapEnd - heapStart) / 1048576).toFixed(2);
  await cdp.send('Runtime.evaluate', { expression: 'window.__smartMushafLive.controller.stop()', awaitPromise: true });
  cdp.close();
  await fetch(`${httpBase}/json/close/${target.id}`).catch(() => {});
  return result;
}

const { chrome, httpBase } = await launch();
const selected = (args.cases ?? 'A,B,C,D,F,G,L,K,W,N,M').split(',');
const report = {};
try {
  const dense = densestPage();
  CASES.B.page = dense.page;
  CASES.B.label += ` (p.${dense.page}, ${dense.words} words)`;
  for (const key of selected) {
    const spec = CASES[key];
    if (!spec) continue;
    process.stderr.write(`▶ ${spec.label}\n`);
    report[key] = { label: spec.label, ...(await runCase(httpBase, key, spec)) };
  }
} finally {
  chrome.kill('SIGTERM');
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
