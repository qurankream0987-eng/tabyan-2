export interface RecognizedWord {
  text: string;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  /** See CtcWord.margin. */
  margin?: number;
}

/** Agreed words this close to the window's edge may still be growing. */
const GUARD_SECONDS = 0.24;
/**
 * CTC places a word where its letters spike, so a long word can show only its first
 * letters ("و" of "وعلى") for a while and still look finished. The newest word of a
 * decode is complete only once nothing has been heard after it for this long.
 */
const TAIL_SECONDS = 0.6;
/** A word this far behind the edge is settled even without agreement. */
const FORCE_SETTLE_SECONDS = 2.0;
/**
 * The last settled word heard again right after itself (or with its madd
 * tail decoded as extra letters, e.g. "الدينين") is an echo from the
 * re-decoded context, not a repetition. Slower repeats stay audible.
 */
const ECHO_SECONDS = 0.8;
/**
 * The model is not streaming: how it reads a word can change once it has heard what
 * follows. A long or drawn-out word first shows as a shorter one («ولا» of «وليحلفن»,
 * «فساد» of «فساء»), agreed on by two decodes and then replaced. The expected word is
 * believed at once; any other word only after this much audio has followed it.
 */
const OFF_PATH_CONTEXT_SECONDS = (() => {
  const value = Number(process.env.TABYAN_TILAWI_OFF_PATH_CONTEXT_SECONDS);
  return Number.isFinite(value) && value >= 0 ? value : 1;
})();

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
 * behind the edge. A flush settles every word clear of the edge, and only the
 * final commit settles a word still being spoken there.
 *
 * A word that is not the next expected one waits until a second decode still
 * says it. One bad window then never becomes a final, so the reader is not
 * stopped on it. A mistake that stays in the next decode is settled, and the
 * strict matcher still paints it red and holds until it is read right.
 */
export class WordStabilizer {
  private settledUntil = 0;
  private lastSettledKey: string | null = null;
  private previous: string[] = [];

  /** End of the last settled word, in seconds since the session started. */
  get settledUntilSeconds() {
    return this.settledUntil;
  }

  update(
    words: RecognizedWord[],
    windowEndSeconds: number,
    settle: "agreed" | "flush" | "all",
    expected: readonly string[] = [],
  ) {
    const fresh = words.filter((word) => (word.startSeconds + word.endSeconds) / 2 >= this.settledUntil);
    if (fresh.length && this.lastSettledKey
      && wordKey(fresh[0].text).startsWith(this.lastSettledKey)
      && fresh[0].startSeconds < this.settledUntil + ECHO_SECONDS) {
      fresh.shift();
    }

    let count = settle === "all" ? fresh.length : 0;
    while (count < fresh.length) {
      const word = fresh[count];
      const heardKey = wordKey(word.text);
      const expectedWord = expected[count];
      const matchesExpected = !expectedWord || heardKey === wordKey(expectedWord);
      const previousKey = this.previous[count];
      // The first time a decode names a different word, keep it in the tail.
      // The session-ending commit still releases whatever was heard.
      if (!matchesExpected && settle !== "all" && heardKey !== previousKey) break;
      if (!matchesExpected && settle !== "all" && word.endSeconds > windowEndSeconds - OFF_PATH_CONTEXT_SECONDS) break;
      const complete = count < fresh.length - 1 || word.endSeconds <= windowEndSeconds - TAIL_SECONDS;
      const clear = complete && word.endSeconds <= windowEndSeconds - GUARD_SECONDS;
      // The expected word replacing a different reading is the confirmation: settle it
      // now, instead of waiting out the reading that was held back.
      const replacedMistake = matchesExpected && previousKey !== undefined && heardKey !== previousKey;
      const agreed = clear && (settle === "flush" || heardKey === previousKey || replacedMistake);
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
