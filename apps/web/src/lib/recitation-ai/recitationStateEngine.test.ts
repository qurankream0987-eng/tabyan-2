import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QuranLiveMatcher } from "./QuranLiveMatcher";
import { normalizeQuranText } from "./normalizer";
import { RecitationStateEngine, confidenceTier } from "./recitationStateEngine";
import type { CanonicalQuranWord } from "./canonicalWords";

function loadPage(page: number): CanonicalQuranWord[] {
  const file = resolve(import.meta.dirname, `../../../public/mushaf/v1/quran-words/pages/${page}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { words: Omit<CanonicalQuranWord, "normalizedText">[] };
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
}

const page = loadPage(562);
const spoken = (from: number, to: number) => page.slice(from, to).map((word) => word.normalizedText);

/** جلسة كاملة: matcher حقيقي + المحرك، تغذية كلمة بكلمة كما يصل delta. */
function session(options: { strict?: boolean; audioReliable?: boolean; confirmationEligible?: boolean } = {}) {
  const matcher = new QuranLiveMatcher(page.slice());
  const engine = new RecitationStateEngine({ strict: options.strict, wordAt: (index) => matcher.wordAt(index) });
  let item = 0;
  const rewinds: number[] = [];
  const say = (heard: string[], final = true) => {
    item += 1;
    const itemId = `u${item}`;
    const feed = (text: string, isFinal: boolean) => {
      const update = engine.apply(matcher.feed({ text, isFinal, itemId, receivedAt: 0 }), {
        audioReliable: options.audioReliable,
        confirmationEligible: options.confirmationEligible,
      });
      if (update.rewindTo !== null) {
        matcher.rewindTo(update.rewindTo);
        rewinds.push(update.rewindTo);
      }
    };
    for (let i = 1; i <= heard.length; i += 1) feed(heard.slice(0, i).join(" "), false);
    if (final) feed(heard.join(" "), true);
  };
  return { matcher, engine, say, rewinds };
}

describe("RecitationStateEngine", () => {
  it("uncalibrated transcript evidence advances matching words but keeps mismatches for review", () => {
    const { engine, say } = session({ confirmationEligible: false });
    say([...spoken(0, 2), "خطأ", ...spoken(3, 12)]);
    expect(engine.stateAt(2)).toBe("POSSIBLE_ERROR");
    expect(engine.stateAt(10)).toBe("CORRECT");
    expect(engine.summary().confirmedMistakes).toBe(0);
  });
  it("exposes a partial match as HEARD_PENDING until a final commits it", () => {
    const { engine, matcher } = session();
    const words = spoken(0, 2);
    const partial = matcher.feed({
      text: words.join(" "),
      isFinal: false,
      itemId: "partial",
      receivedAt: 0,
    });

    const update = engine.apply(partial);

    expect(partial.provisionalIndex).toBeGreaterThanOrEqual(0);
    expect(engine.stateAt(0)).toBe("HEARD_PENDING");
    expect([...engine.visibleStates().values()]).toContain("HEARD_PENDING");
    expect(update.changed).toContain(partial.provisionalIndex);

    const final = matcher.feed({
      text: words.join(" "),
      isFinal: true,
      itemId: "partial",
      receivedAt: 1,
    });
    engine.apply(final);

    expect(engine.stateAt(0)).toBe("CORRECT");
  });

  it("marks an exact recitation correct with no mistakes", () => {
    const { engine, say } = session();
    say(spoken(0, 30));
    const summary = engine.summary();
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.unconfirmed).toBe(0);
    expect(summary.correctFirstTry).toBe(30);
    expect(summary.accuracyPercent).toBe(100);
    expect(engine.stateAt(5)).toBe("CORRECT");
    expect(engine.stateAt(30)).toBe("EXPECTED");
  });

  it("does not report accuracy for a sample too small to be meaningful", () => {
    const { engine, say } = session();
    say(spoken(0, 5));
    expect(engine.summary().accuracyPercent).toBeNull();
  });

  it("keeps a wrong word pending until later evidence confirms it", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const engine = new RecitationStateEngine({ wordAt: (index) => matcher.wordAt(index) });
    const heard = [...spoken(0, 5), "سمعنا", ...spoken(6, 12)];
    const statesAt5: string[] = [];
    for (let i = 1; i <= heard.length; i += 1) {
      engine.apply(matcher.feed({ text: heard.slice(0, i).join(" "), isFinal: false, itemId: "one", receivedAt: 0 }));
      statesAt5.push(engine.stateAt(5));
    }
    // لحظة الانحراف: محتمل فقط، ثم يتأكد بعد تقدم القارئ دون تصحيح.
    expect(statesAt5).toContain("POSSIBLE_ERROR");
    expect(statesAt5.indexOf("POSSIBLE_ERROR")).toBeLessThan(statesAt5.indexOf("CONFIRMED_ERROR"));
    expect(engine.stateAt(5)).toBe("CONFIRMED_ERROR");
    expect(engine.summary().mistakesByKind.WRONG_WORD).toBe(1);
  });

  it("detects an omitted word after the reciter continues", () => {
    const { engine, say } = session();
    say([...spoken(0, 5), ...spoken(6, 14)]);
    expect(engine.stateAt(5)).toBe("CONFIRMED_ERROR");
    expect(engine.summary().mistakesByKind.OMISSION).toBe(1);
  });

  it("recognises an immediate self-correction as corrected, not as a live error", () => {
    const { engine, say } = session();
    say([...spoken(0, 5), "سمعنا", ...spoken(5, 12)]);
    expect(engine.stateAt(5)).toBe("CORRECTED");
    const summary = engine.summary();
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.correctedMistakes).toBe(1);
    expect(engine.eventLog().some((event) => event.kind === "CORRECTION" && event.index === 5)).toBe(true);
  });

  it("turns a confirmed error into corrected when the reciter goes back and repeats it", () => {
    const { engine, say } = session();
    say([...spoken(0, 5), "سمعنا", ...spoken(6, 9)]);
    expect(engine.stateAt(5)).toBe("CONFIRMED_ERROR");
    say(spoken(4, 9));
    expect(engine.stateAt(5)).toBe("CORRECTED");
    expect(engine.summary().correctedMistakes).toBe(1);
    expect(engine.summary().confirmedMistakes).toBe(0);
  });

  it("records a repeated previous word as repetition, not a mistake", () => {
    const { engine, say } = session();
    say([...spoken(0, 5), spoken(4, 5)[0], ...spoken(5, 12)]);
    const summary = engine.summary();
    expect(summary.confirmedMistakes + summary.correctedMistakes).toBe(0);
    expect(summary.repetitions).toBeGreaterThanOrEqual(1);
  });

  it("never confirms a mistake when audio quality is unreliable", () => {
    const { engine, say } = session({ audioReliable: false });
    say([...spoken(0, 5), "سمعنا", ...spoken(6, 14)]);
    expect(engine.stateAt(5)).toBe("POSSIBLE_ERROR");
    engine.finalize();
    const summary = engine.summary();
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.unconfirmed).toBe(1);
  });

  it("strict mode holds progress at a confirmed error until it is corrected", () => {
    const { engine, matcher, say, rewinds } = session({ strict: true });
    say([...spoken(0, 5), "سمعنا", ...spoken(6, 12)]);
    expect(engine.stateAt(5)).toBe("CONFIRMED_ERROR");
    expect(engine.strictHoldAt).toBe(5);
    expect(rewinds).toContain(5);
    expect(matcher.committedIndex()).toBe(5);

    // الاستمرار دون تصحيح لا يتجاوز موضع الخطأ.
    say(spoken(12, 16));
    expect(matcher.committedIndex()).toBeLessThanOrEqual(5);

    // التصحيح يحرر التقدم.
    say(spoken(5, 10));
    expect(engine.stateAt(5)).toBe("CORRECTED");
    expect(engine.strictHoldAt).toBeNull();
    expect(matcher.committedIndex()).toBe(10);
  });

  it("non-strict mode records the error and keeps following", () => {
    const { engine, matcher, say } = session();
    say([...spoken(0, 5), "سمعنا", ...spoken(6, 16)]);
    expect(engine.stateAt(5)).toBe("CONFIRMED_ERROR");
    expect(engine.strictHoldAt).toBeNull();
    expect(matcher.committedIndex()).toBe(16);
  });

  it("graduated peeks reveal next word, several words, then the current ayah", () => {
    const { engine, say } = session();
    say(spoken(0, 2));
    expect(engine.peek(1)).toEqual([2]);
    expect(engine.stateAt(2)).toBe("PEEKED");
    expect(engine.peek(2)).toEqual([2, 3, 4]);
    const ayah = engine.peek(3);
    expect(ayah.every((index) => page[index].verseKey === page[2].verseKey)).toBe(true);
    expect(page[ayah.at(-1)! + 1].verseKey).not.toBe(page[2].verseKey);
    // كلمة مُلمَّح بها ثم قُرئت: تبقى PEEKED ولا تُحتسب صحيحة من المحاولة الأولى.
    say(spoken(2, 4));
    expect(engine.stateAt(2)).toBe("PEEKED");
    expect(engine.summary().correctFirstTry).toBe(2);
    expect(engine.eventLog().filter((event) => event.kind === "PEEK").length).toBe(3);
  });

  it("records explicit test hints once without advancing progress or creating mistakes", () => {
    const { engine, matcher, say } = session();
    say(spoken(0, 2));
    const committed = matcher.committedIndex();
    expect(engine.peekIndices([0, 2, 3, 3])).toEqual([2, 3]);
    expect(engine.peekIndices([2, 3])).toEqual([]);
    expect(matcher.committedIndex()).toBe(committed);
    expect(engine.summary().peeks).toBe(2);
    expect(engine.summary().confirmedMistakes).toBe(0);
    expect(engine.eventLog().filter(event => event.kind === "PEEK")).toHaveLength(1);
  });

  it("dismisses a false-positive mistake while keeping an auditable record", () => {
    const { engine, say } = session();
    say([...spoken(0, 5), "سمعنا", ...spoken(6, 12)]);
    expect(engine.dismissMistake(5)).toBe(true);
    expect(engine.stateAt(5)).toBe("CORRECT");
    const summary = engine.summary();
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.dismissed).toBe(1);
    expect(engine.eventLog().find((event) => event.index === 5 && event.kind === "WRONG_WORD")?.status).toBe("dismissed");
  });

  it("classifies a skipped ayah as SKIP instead of word-by-word omissions", () => {
    const { engine, say } = session();
    const ayahTwo = page.findIndex((word) => word.verseKey === "67:2");
    const ayahThree = page.findIndex((word) => word.verseKey === "67:3");
    say(spoken(0, ayahTwo));
    say(spoken(ayahThree, ayahThree + 8));
    const summary = engine.summary();
    expect(summary.mistakesByKind.SKIP).toBe(1);
    expect(summary.mistakesByKind.OMISSION ?? 0).toBe(0);
    expect(engine.stateAt(ayahTwo + 1)).toBe("SKIPPED");
  });

  it("maps confidence to explicit tiers", () => {
    expect(confidenceTier(0.9)).toBe("HIGH");
    expect(confidenceTier(0.7)).toBe("MEDIUM");
    expect(confidenceTier(0.4)).toBe("LOW");
  });
});

describe("RecitationStateEngine — popover lookup and weakest positions", () => {
  it("looks up a mistake by word index and hides it once dismissed", () => {
    const { engine, say } = session();
    say([...spoken(0, 20), "بيت", ...spoken(21, 36)]);
    expect(engine.mistakeAt(20)).toMatchObject({ kind: "WRONG_WORD", status: "confirmed" });
    engine.dismissMistake(20);
    expect(engine.mistakeAt(20)).toBeNull();
  });

  it("ranks the weakest ayahs by confirmed, then corrected mistakes, then peeks", () => {
    const { engine, say } = session();
    say([...spoken(0, 20), "بيت", ...spoken(21, 30), "سمعنا", ...spoken(30, 44)]);
    const weakest = engine.weakestAyahs();
    expect(weakest[0]).toMatchObject({ confirmed: 1 });
    expect(weakest.every((entry, i) => i === 0 || entry.confirmed <= weakest[i - 1].confirmed)).toBe(true);
  });
});

describe("RecitationStateEngine — history export", () => {
  it("exports per-ayah results and final mistakes without heard text", () => {
    const { engine, say } = session();
    say([...spoken(0, 20), "بيت", ...spoken(21, 36)]);
    engine.finalize();
    const ayahs = engine.ayahResults();
    expect(ayahs.reduce((n, a) => n + a.confirmed, 0)).toBe(1);
    expect(ayahs.reduce((n, a) => n + a.correctWords, 0)).toBe(engine.summary().correctFirstTry);
    const mistakes = engine.mistakeRecords();
    expect(mistakes).toEqual([expect.objectContaining({ kind: "WRONG_WORD", status: "confirmed" })]);
    expect(JSON.stringify(mistakes)).not.toContain("بيت");
  });
});
