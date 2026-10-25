/** Process-local ownership; no paid/distributed service or database mutation. */
export class RecitationSessionLeases {
  private readonly owners = new Map<string, { sessionId: string; owner: symbol }>();

  acquire(studentId: string, sessionId: string, owner: symbol): boolean {
    if (this.owners.has(studentId)) return false;
    this.owners.set(studentId, { sessionId, owner });
    return true;
  }

  release(studentId: string, owner: symbol): void {
    if (this.owners.get(studentId)?.owner === owner) this.owners.delete(studentId);
  }
}

// Technical transport limits, not a monetary budget or educational range.
export const RECITATION_IDLE_MS = 120_000;
export const RECITATION_MAX_CONNECTION_MS = 2 * 60 * 60 * 1000;
export const recitationSessionLeases = new RecitationSessionLeases();
