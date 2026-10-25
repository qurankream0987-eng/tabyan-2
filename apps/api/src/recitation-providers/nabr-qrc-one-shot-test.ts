import type { NabrQrcSessionContext } from "./nabr-qrc-session";

/** Acceptance-test sessions must start at Al-Fatiha 1:1, word 1. */
export function isEligibleNabrQrcOneShotSession(session: NabrQrcSessionContext): boolean {
  return session.mode === "general"
    && session.startVerseKey === "1:1"
    && (session.startWordPosition ?? 1) === 1;
}

/**
 * Process-local burn-once gate for the explicitly armed development acceptance
 * test. Restore the environment flags immediately after its single attempt.
 */
export class NabrQrcOneShotTestGate {
  private claimed = false;

  claim(session: NabrQrcSessionContext): boolean {
    if (this.claimed || !isEligibleNabrQrcOneShotSession(session)) return false;
    this.claimed = true;
    return true;
  }
}
