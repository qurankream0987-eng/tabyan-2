/** Share one in-flight user action. No delayed call: preserve user activation. */
export function runSessionAction<T>(
  flight: { current: Promise<T> | null },
  action: () => Promise<T>,
): Promise<T> {
  if (flight.current) return flight.current;
  const pending = action().finally(() => {
    if (flight.current === pending) flight.current = null;
  });
  flight.current = pending;
  return pending;
}

/** A completion cue must not precede the socket's clean close handshake. */
export function waitForCleanSocketClose(ws: WebSocket, timeoutMs = 5000): Promise<boolean> {
  if (ws.readyState === 3) return Promise.resolve(false);
  return new Promise((resolve) => {
    let failed = false;
    const finish = (clean: boolean) => {
      clearTimeout(timer);
      ws.removeEventListener("close", onClose);
      ws.removeEventListener("error", onError);
      ws.removeEventListener("message", onMessage);
      resolve(clean && !failed);
    };
    const onClose = (event: CloseEvent) => finish(event.code === 1000 || event.code === 1005);
    const onError = () => { failed = true; };
    const onMessage = (event: MessageEvent) => {
      try { if (JSON.parse(String(event.data)).t === "error") failed = true; } catch { /* Not a gateway message. */ }
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    ws.addEventListener("close", onClose);
    ws.addEventListener("error", onError);
    ws.addEventListener("message", onMessage);
  });
}
