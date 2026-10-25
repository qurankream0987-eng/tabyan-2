import { authRevision, isWebLoginPending } from "./web-auth-runtime";

const PUBLIC_AUTH = new Set([
  "auth.passwordLogin", "auth.studentPasswordLogin", "auth.adminLogin",
  "auth.completeProfile", "auth.checkPhone",
  "auth.webauthnLoginOptions", "auth.webauthnLoginVerify",
]);

/** Reject only the identity whose authenticated request actually failed.
 * 403 is a permission denial, not evidence that a session is invalid.
 * Inspect per-operation errors too: mixed tRPC batches use HTTP 207.
 */
export const sessionFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    const stored = localStorage.getItem("tabyan_token");
    if (stored) headers.set("Authorization", `Bearer ${stored}`);
  }
  const requestToken = headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
  const requestRevision = authRevision();
  const response = await globalThis.fetch(input, { ...init, headers, credentials: "include" });
  if (!requestToken || (response.status !== 401 && response.status !== 207)) return response;

  try {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const paths = decodeURIComponent(new URL(url, "http://local.test").pathname.split("/").pop() ?? "").split(",");
    const payload: unknown = await response.clone().json();
    const entries = Array.isArray(payload) ? payload : [payload];
    const rejected = entries.some((entry, index) => {
      const status = entry?.error?.json?.data?.httpStatus ?? entry?.error?.data?.httpStatus;
      return status === 401 && paths[index] && !PUBLIC_AUTH.has(paths[index]);
    });
    if (!rejected || isWebLoginPending()) return response;
    const { authStore } = await import("./auth");
    // Recheck after the async import: a successful login may have happened meanwhile.
    if (!isWebLoginPending() && requestRevision === authRevision() && authStore.token === requestToken) {
      authStore.clear();
      window.location.replace(import.meta.env.BASE_URL || "/");
    }
  } catch {
    // Proxy/network/non-JSON failures are not proof of an invalid session.
  }
  return response;
};
