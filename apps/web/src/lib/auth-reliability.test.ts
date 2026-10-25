import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { getQueryKey } from "@trpc/react-query";

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    location: { replace: vi.fn(), reload: vi.fn() },
  });
});
afterEach(() => vi.unstubAllGlobals());

function response(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
const rejection = { error: { json: { message: "الجلسة غير صالحة", code: -32001, data: { httpStatus: 401, code: "UNAUTHORIZED" } } } };

it("late HTTP 401 belongs to the old request, not the incoming administrator", async () => {
  const { authStore } = await import("./auth");
  const { sessionFetch } = await import("./session-fetch");
  authStore.set("fixture-expired", "student");
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
  const pending = sessionFetch("/api/trpc/auth.me");
  authStore.set("fixture-admin-new", "admin");
  finish(response(401, rejection));
  await pending;
  expect(authStore.token).toBe("fixture-admin-new");
  expect(window.location.replace).not.toHaveBeenCalled();
});

it.each([403, 401])("public credential errors (%i) stay in the form without logout", async (status) => {
  const { authStore } = await import("./auth");
  const { sessionFetch } = await import("./session-fetch");
  authStore.set("fixture-existing", "student");
  vi.stubGlobal("fetch", vi.fn(async () => response(status, rejection)));
  await sessionFetch("/api/trpc/auth.studentPasswordLogin");
  expect(authStore.token).toBe("fixture-existing");
  expect(window.location.replace).not.toHaveBeenCalled();
});

it.each([401, 207])("current rejected session (%i) is cleared once, including mixed batches", async (status) => {
  const { authStore } = await import("./auth");
  const { sessionFetch } = await import("./session-fetch");
  authStore.set("fixture-expired", "student");
  vi.stubGlobal("fetch", vi.fn(async () => response(status, status === 207
    ? [{ result: { data: {} } }, rejection] : rejection)));
  await sessionFetch(status === 207 ? "/api/trpc/student.teachers,auth.me" : "/api/trpc/auth.me");
  expect(authStore.token).toBeNull();
  expect(authStore.role).toBeNull();
  expect(window.location.replace).toHaveBeenCalledTimes(1);
});

it.each(["student", "teacher", "admin"] as const)("%s first submit commits verified role and exact me cache before notifying guards", async (role) => {
  const { authStore } = await import("./auth");
  const { queryClient, trpc } = await import("../providers/trpc");
  const { loginWebSession } = await import("./web-login");
  const user = { id: `fixture-${role}`, role, fullName: "حساب اختبار", phone: "" };
  const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer fixture-${role}`);
    return response(200, { result: { data: { json: user } } });
  });
  vi.stubGlobal("fetch", fetchMock);
  const operation = vi.fn(async () => ({ token: `fixture-${role}`, role }));
  const snapshots: unknown[] = [];
  authStore.subscribe(() => snapshots.push(queryClient.getQueryData(getQueryKey(trpc.auth.me, undefined, "query"))));
  const result = await loginWebSession(operation, role);
  expect(operation).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result?.role).toBe(role);
  expect(authStore.role).toBe(role);
  expect(snapshots).toEqual([user]);
  expect(localStorage.getItem("tabyan_token")).toBe(`fixture-${role}`); // reload source
});

it("double-click creates one logical operation", async () => {
  const { loginWebSession } = await import("./web-login");
  let finish!: (value: { token: string; role: string }) => void;
  const operation = vi.fn(() => new Promise<{ token: string; role: string }>((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", vi.fn(async () => response(200, { result: { data: { json: { id: "fixture", role: "admin", fullName: "اختبار" } } } })));
  const first = loginWebSession(operation, "admin");
  expect(await loginWebSession(operation, "admin")).toBeNull();
  finish({ token: "fixture", role: "admin" });
  await first;
  expect(operation).toHaveBeenCalledTimes(1);
});

it("logout during login cannot resurrect the late session", async () => {
  const { authStore } = await import("./auth");
  const { loginWebSession } = await import("./web-login");
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
  const pending = loginWebSession(async () => ({ token: "fixture", role: "student" }));
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  authStore.clear();
  finish(response(200, { result: { data: { json: { id: "fixture", role: "student", fullName: "اختبار" } } } }));
  await expect(pending).rejects.toThrow("أُلغيت");
  expect(authStore.token).toBeNull();
});

it("wrong credentials and role mismatch never commit a session", async () => {
  const { authStore } = await import("./auth");
  const { loginWebSession } = await import("./web-login");
  await expect(loginWebSession(async () => { throw new Error("بيانات غير صحيحة"); })).rejects.toThrow("بيانات غير صحيحة");
  vi.stubGlobal("fetch", vi.fn(async () => response(200, { result: { data: { json: { id: "fixture", role: "teacher", fullName: "اختبار" } } } })));
  await expect(loginWebSession(async () => ({ token: "fixture", role: "teacher" }), "admin")).rejects.toThrow("ليس حساب مشرف");
  expect(authStore.token).toBeNull();
});

it("student A → teacher → administrator → student B never retains private identity", async () => {
  const { authStore } = await import("./auth");
  const { loginWebSession } = await import("./web-login");
  const { queryClient, trpc } = await import("../providers/trpc");
  const privateKey = getQueryKey(trpc.student.progress);
  for (const [id, role] of [["A", "student"], ["T", "teacher"], ["S", "admin"], ["B", "student"]] as const) {
    vi.stubGlobal("fetch", vi.fn(async () => response(200, { result: { data: { json: { id, role, fullName: id } } } })));
    await loginWebSession(async () => ({ token: `fixture-${id}`, role }));
    expect(queryClient.getQueryData(privateKey)).toBeUndefined();
    expect(authStore.role).toBe(role);
    queryClient.setQueryData(privateKey, { id });
    authStore.clear();
    expect(localStorage.getItem("tabyan_token")).toBeNull();
    expect(queryClient.getQueryData(privateKey)).toBeUndefined();
  }
});

it("phone formatting/digits use the identifier endpoint while usernames remain literal", async () => {
  const { loginIdentifierTarget } = await import("./login-identifier");
  for (const phone of ["٠٥١٢٣٤٥٦٧٨", "۰۵۱۲۳۴۵۶۷۸", "00965 5555 1234", "+965 (5555) 1234"]) {
    expect(loginIdentifierTarget(phone).kind).toBe("identifier");
  }
  expect(loginIdentifierTarget("teacher١")).toEqual({ kind: "username", value: "teacher١" });
  expect(loginIdentifierTarget(" user@example.com ").kind).toBe("identifier");
});

it("reload restores committed storage and reload after logout stays logged out", async () => {
  const { authStore } = await import("./auth");
  authStore.set("fixture-persisted", "teacher", "معلم اختبار");
  vi.resetModules();
  const restored = (await import("./auth")).authStore;
  expect(restored.token).toBe("fixture-persisted");
  expect(restored.role).toBe("teacher");
  restored.clear();
  vi.resetModules();
  expect((await import("./auth")).authStore.token).toBeNull();
});

it("a protected permission denial or a server outage does not invalidate the current identity", async () => {
  const { authStore } = await import("./auth");
  const { sessionFetch } = await import("./session-fetch");
  authStore.set("fixture-valid", "student");
  for (const status of [403, 500]) {
    vi.stubGlobal("fetch", vi.fn(async () => response(status, { error: { json: { data: { httpStatus: status } } } })));
    await sessionFetch("/api/trpc/student.progress");
    expect(authStore.token).toBe("fixture-valid");
  }
  expect(window.location.replace).not.toHaveBeenCalled();
});

it("technical/JSON errors are hidden and recovery-pending remains an Arabic message", async () => {
  const { userFacingErrorMessage } = await import("./user-facing-error");
  const fallback = "تعذّر تسجيل الدخول";
  for (const message of ['[{"message":"بيانات غير صحيحة"}]', "SQL: خطأ داخلي", "Clerk: تعذّر الدخول"]) {
    expect(userFacingErrorMessage(new Error(message), fallback)).toBe(fallback);
  }
  expect(userFacingErrorMessage(new Error("AUTH_RECOVERY_PENDING"), fallback)).toContain("استرداد الوصول");
  expect(userFacingErrorMessage(new Error("كلمة السر غير صحيحة"), fallback)).toBe("كلمة السر غير صحيحة");
});

it("a permission denial must not destroy an existing valid student session", async () => {
  const { authStore } = await import("./auth");
  const { queryClient, trpc } = await import("../providers/trpc");
  authStore.set("fixture-student", "student", "طالب اختبار");
  const key = getQueryKey(trpc.student.progress);
  queryClient.setQueryData(key, {});
  const query = queryClient.getQueryCache().find({ queryKey: key })!;
  queryClient.getQueryCache().config.onError?.({ data: { httpStatus: 403 } }, query);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(authStore.token).toBe("fixture-student");
  expect(window.location.replace).not.toHaveBeenCalled();
});

it("a queued rejection from an old session must not clear the first successful admin login", async () => {
  const { authStore } = await import("./auth");
  const { queryClient, trpc } = await import("../providers/trpc");
  authStore.set("fixture-expired", "student");
  const key = getQueryKey(trpc.auth.me);
  queryClient.setQueryData(key, {});
  const query = queryClient.getQueryCache().find({ queryKey: key })!;
  queryClient.getQueryCache().config.onError?.({ data: { httpStatus: 401 } }, query);
  authStore.set("fixture-admin-first-submit", "admin", "مشرف اختبار");
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(authStore.token).toBe("fixture-admin-first-submit");
  expect(authStore.role).toBe("admin");
  expect(window.location.replace).not.toHaveBeenCalled();
});
