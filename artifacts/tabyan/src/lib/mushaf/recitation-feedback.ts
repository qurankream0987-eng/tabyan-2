import type { RecitationWordState, WordRef } from "@/lib/recitation-ai/recitationStateEngine";
import type { ConfirmedTabyanRecitationEvent } from "@workspace/tabyan-domain";
import type { RecitationCue } from "./recitation-cues";

interface FeedbackSource {
  stateAt(index: number): RecitationWordState;
  wordAt(index: number): WordRef | null;
}

/** Local feedback only: never starts a microphone, provider or network request. */
export class RecitationFeedback {
  private sessionId: string | null = null;
  private ready = false;
  private failed = false;
  private ended = false;
  private startPlayed = false;
  private confirmed = new Set<string>();
  private corrected = new Set<string>();
  private ayahs = new Set<string>();
  private lastToneAt = -Infinity;

  constructor(
    private readonly play: (cue: RecitationCue) => unknown,
    private readonly now: () => number = () => Date.now(),
  ) {}

  begin(sessionId: string): void {
    this.sessionId = sessionId;
    this.ready = false;
    this.failed = false;
    this.ended = false;
    this.startPlayed = false;
    this.confirmed.clear();
    this.corrected.clear();
    this.ayahs.clear();
    this.lastToneAt = -Infinity;
  }

  async providerReady(): Promise<void> {
    if (!this.sessionId || this.ready || this.ended) return;
    this.ready = true;
    this.failed = false;
    if (!this.startPlayed) {
      this.startPlayed = true;
      await this.emit("start");
    }
  }

  providerFailed(): void {
    this.failed = true;
    this.ready = false;
  }

  async complete(normal: boolean): Promise<void> {
    const successful = normal && this.ready && !this.failed && !this.ended;
    this.ended = true;
    if (successful) await this.emit("end");
  }

  observeConfirmed(events: readonly ConfirmedTabyanRecitationEvent[]): void {
    if (!this.ready || this.failed || this.ended) return;
    let cue: RecitationCue | null = null;
    for (const event of events) {
      if (event.authority !== "tabyan_state_engine") continue;
      const key = `${this.sessionId}:${event.eventId}`;
      if (event.type === "mistake_confirmed" && !this.confirmed.has(key)) {
        this.confirmed.add(key);
        this.corrected.delete(key);
        cue = "mistake";
      } else if (event.type === "mistake_corrected" && this.confirmed.has(key) && !this.corrected.has(key)) {
        this.corrected.add(key);
        this.confirmed.delete(key);
        if (cue !== "mistake") cue = "correction";
      }
    }
    this.emitCoalesced(cue);
  }

  /** Positive progress can cue a clean ayah; tentative/error states do not enter this path. */
  observeProgress(changed: readonly number[], source: FeedbackSource): void {
    if (!this.ready || this.failed || this.ended) return;
    let cue: RecitationCue | null = null;
    for (const index of changed) {
      const word = source.wordAt(index);
      if (!word || source.stateAt(index) !== "CORRECT" || this.ayahs.has(word.verseKey)) continue;
      // A milestone needs the entire canonical ayah, not just its last word.
      // A middle-of-ayah start, peek, possible error or confirmed error is not success.
      const next = source.wordAt(index + 1);
      // null can mean an unloaded next page. Do not invent an ayah ending.
      if (!next || next.verseKey === word.verseKey) continue;
      let first = index;
      while (first > 0 && source.wordAt(first - 1)?.verseKey === word.verseKey) first--;
      if (source.wordAt(first)?.position !== 1) continue;
      let clean = true;
      for (let i = first; i <= index; i++) {
        if (source.stateAt(i) !== "CORRECT") { clean = false; break; }
      }
      if (clean) {
        this.ayahs.add(word.verseKey);
        cue ??= "ayah";
      }
    }
    this.emitCoalesced(cue);
  }

  private emitCoalesced(cue: RecitationCue | null): void {
    // Coalesce transcript bursts; never queue a backlog of stale tones.
    // A quick, genuine self-correction must not be lost to mistake throttling.
    if (cue && (cue === "correction" || this.now() - this.lastToneAt >= 650)) {
      this.lastToneAt = this.now();
      this.emit(cue);
    }
  }

  private async emit(cue: RecitationCue): Promise<void> {
    try {
      await this.play(cue);
    } catch { /* Sound is secondary; recitation continues silently. */ }
  }
}
