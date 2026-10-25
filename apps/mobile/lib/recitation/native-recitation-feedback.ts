export type NativeRecitationCue = "start" | "mistake" | "correction" | "end";

/** Cue policy only, not another educational state machine or ASR grader. */
export class NativeRecitationFeedback {
  enabled = true;
  private started = false;
  private ended = false;
  private confirmed = new Set<string>();
  private corrected = new Set<string>();

  constructor(private readonly play: (cue: NativeRecitationCue) => unknown) {}

  ready() {
    if (this.started || this.ended) return;
    this.started = true;
    this.emit("start");
  }

  observeWordState(key: string, state: string, authoritativeEvidence = false) {
    if (!this.started || this.ended) return;
    // A raw ASR mismatch/position confidence must never trigger this cue.
    if (state === "CONFIRMED_ERROR" && authoritativeEvidence && !this.confirmed.has(key)) {
      this.confirmed.add(key);
      this.corrected.delete(key);
      this.emit("mistake");
    } else if (state === "CORRECTED" && this.confirmed.has(key) && !this.corrected.has(key)) {
      this.corrected.add(key);
      this.emit("correction");
    }
  }

  complete(success: boolean): Promise<void> {
    if (this.ended) return Promise.resolve();
    this.ended = true;
    if (success && this.started) return this.emit("end");
    return Promise.resolve();
  }

  private emit(cue: NativeRecitationCue): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return Promise.race([
        Promise.resolve(this.play(cue)).then(() => {}, () => {}),
        new Promise<void>((resolve) => { timer = setTimeout(resolve, 250); }),
      ]).finally(() => clearTimeout(timer));
    }
    catch { return Promise.resolve(); }
  }
}
