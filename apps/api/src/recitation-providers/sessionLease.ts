/** Process-local ownership; no paid/distributed service or database mutation. */
export class RecitationSessionLeases {
  private readonly owners = new Map<string, { sessionId: string; owner: symbol; replace?: () => void }>();

  /**
   * `replace` lets a later socket for the same session take the lease over,
   * so a reconnect is not blocked by a stale, possibly half-open socket.
   */
  acquire(studentId: string, sessionId: string, owner: symbol, replace?: () => void): boolean {
    const current = this.owners.get(studentId);
    if (current) {
      if (current.sessionId !== sessionId || !current.replace) return false;
      current.replace();
      // The replaced owner normally releases itself; never keep two owners.
      if (this.owners.get(studentId)?.owner === current.owner) this.owners.delete(studentId);
    }
    this.owners.set(studentId, { sessionId, owner, replace });
    return true;
  }

  release(studentId: string, owner: symbol): void {
    if (this.owners.get(studentId)?.owner === owner) this.owners.delete(studentId);
  }
}

// Technical transport limits, not a monetary budget or educational range.
/** No client message at all (audio, commit or keepalive ping) for this long. */
export const RECITATION_IDLE_MS = 120_000;
/** No WebSocket pong for this long means the socket is dead or half-open. */
export const RECITATION_HEARTBEAT_TIMEOUT_MS = 30_000;
export const RECITATION_MAX_CONNECTION_MS = 2 * 60 * 60 * 1000;
export const recitationSessionLeases = new RecitationSessionLeases();
