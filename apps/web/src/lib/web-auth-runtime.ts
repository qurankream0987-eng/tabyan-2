// Request ownership is local-only; no credentials are logged or persisted here.
let revision = 0;
let loginPending = false;
export const authRevision = () => revision;
export const advanceAuthRevision = () => ++revision;
export const isWebLoginPending = () => loginPending;
export function beginWebLogin() {
  if (loginPending) return null;
  loginPending = true;
  return advanceAuthRevision();
}
export function endWebLogin() { loginPending = false; }
