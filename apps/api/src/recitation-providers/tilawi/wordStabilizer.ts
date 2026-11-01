export interface RecognizedWord {
  text: string;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
}

/** Agreed words this close to the window's edge may still be growing. */
const GUARD_SECONDS = 0.24;
/** A word this far behind the edge is settled even without agreement. */
const FORCE_SETTLE_SECONDS = 2.0;
/**
 * The last settled word heard again right after itself (or with its madd
 * tail decoded as extra letters, e.g. "الدينين") is an echo from the
 * re-decoded context, not a repetition. Slower repeats stay audible.
 */
const ECHO_SECONDS = 0.8;

/** Spelling-insensitive identity: hamza seats, alef maqsura and ta marbuta vary between hops. */
export function wordKey(text: string): string {
  return text
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/**
 * Decides which re-decoded words are final (local agreement): a word settles
 * once two consecutive decodes agree on it and it has cleared the window's
 * edge. Words the decodes keep disagreeing on are settled once they are well
 * behind the edge, and a pause or final commit settles everything.
 */
export class WordStabilizer {
  private settledUntil = 0;
  private lastSettledKey: string | null = null;
  private previous: string[] = [];

  /** End of the last settled word, in seconds since the session started. */
  get settledUntilSeconds() {
    return this.settledUntil;
  }

  update(words: RecognizedWord[], windowEndSeconds: number, settleAll: boolean) {
    const fresh = words.filter((word) => (word.startSeconds + word.endSeconds) / 2 >= this.settledUntil);
    if (fresh.length && this.lastSettledKey
      && wordKey(fresh[0].text).startsWith(this.lastSettledKey)
      && fresh[0].startSeconds < this.settledUntil + ECHO_SECONDS) {
      fresh.shift();
    }

    let count = settleAll ? fresh.length : 0;
    while (count < fresh.length) {
      const word = fresh[count];
      const agreed = wordKey(word.text) === this.previous[count]
        && word.endSeconds <= windowEndSeconds - GUARD_SECONDS;
      if (!agreed && word.endSeconds > windowEndSeconds - FORCE_SETTLE_SECONDS) break;
      count += 1;
    }

    const settled = fresh.slice(0, count);
    const pending = fresh.slice(count);
    if (settled.length) {
      const last = settled[settled.length - 1];
      this.settledUntil = last.endSeconds;
      this.lastSettledKey = wordKey(last.text);
    }
    this.previous = pending.map((word) => wordKey(word.text));
    return { settled, pending };
  }
}
