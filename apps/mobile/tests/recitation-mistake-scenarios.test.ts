import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NativeQuranLiveMatcher, type CanonicalQuranWord } from "../lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../lib/recitation/quran-normalizer";

// Whole recitations through the shared matcher and mistake engine, fed the way the
// recognizer sends them: growing partials, then a final per phrase.
const PAGES = join(__dirname, "../../web/public/mushaf/v1/quran-words/pages");
const corpus: CanonicalQuranWord[] = [];
for (let page = 1; page <= 604; page += 1) {
  for (const word of JSON.parse(readFileSync(join(PAGES, `${page}.json`), "utf8")).words) {
    corpus.push({ ...word, normalizedText: normalizeQuranText(word.displayText) });
  }
}
const range = (surah: number, from: number, to: number) => corpus.filter((w) => w.surah === surah && w.ayah >= from && w.ayah <= to);
const ayah = (surah: number, number: number) => range(surah, number, number).map((w) => w.displayText).join(" ");

function recite(words: CanonicalQuranWord[], phrases: string[], confidences?: number[][]) {
  const matcher = new NativeQuranLiveMatcher(words);
  phrases.forEach((phrase, item) => {
    const tokens = phrase.split(" ");
    for (let k = 1; k < tokens.length; k += 1) matcher.feed(tokens.slice(0, k).join(" "), `p${item}`, false);
    matcher.feed(phrase, `p${item}`, true, confidences?.[item]);
  });
  const summary = matcher.finish();
  const flagged = new Map(matcher.flaggedWords().map((f) => [f.key, f.kind]));
  return { summary, flagged };
}
const mulk = (...ayahs: number[]) => recite(range(67, 1, 6), ayahs.map((n) => ayah(67, n)));
const ayahKeys = (surah: number, number: number) => range(surah, number, number).map((w) => `${w.verseKey}:${w.position}`);

describe("recitation mistakes", () => {
  it("a correct recitation has no mistakes", () => {
    const { summary, flagged } = mulk(1, 2, 3, 4, 5, 6);
    expect(flagged.size).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a skipped ayah is shown skipped in full, and the long ayah after it is read to its end", () => {
    const { flagged } = mulk(1, 3, 4, 5, 6);
    expect(ayahKeys(67, 2).every((key) => flagged.get(key) === "skipped")).toBe(true);
    expect(ayahKeys(67, 3).some((key) => flagged.has(key))).toBe(false);
  });

  it("an ayah from elsewhere read in place of the expected one is marked wrong", () => {
    const foreign = ayah(2, 255).split(" ").slice(0, 10).join(" ");
    const { flagged } = recite(range(67, 1, 6), [ayah(67, 1), foreign, ayah(67, 3), ayah(67, 4), ayah(67, 5)]);
    const wrong = ayahKeys(67, 2).filter((key) => flagged.get(key) === "mistake");
    expect(wrong.length).toBeGreaterThanOrEqual(8);
  });

  it("a later ayah read in place of the expected one is marked wrong, and the reader is still followed", () => {
    const { summary, flagged } = mulk(1, 4, 3, 5, 6);
    expect(ayahKeys(67, 2).filter((key) => flagged.get(key) === "mistake").length).toBeGreaterThanOrEqual(8);
    expect(ayahKeys(67, 4).every((key) => flagged.get(key) === "skipped")).toBe(true);
    expect(ayahKeys(67, 5).concat(ayahKeys(67, 6)).some((key) => flagged.has(key))).toBe(false);
    expect(summary.wordsRecited).toBeGreaterThan(50);
  });

  it("repeating an ayah is not a mistake", () => {
    expect(mulk(1, 1, 2, 3).flagged.size).toBe(0);
  });

  it("fast recitation heard with letters dropped, words cut short and run together is not wrong", () => {
    // What the recognizer made of a correct, fast recitation of al-Baqarah 1-5.
    const { summary, flagged } = recite(range(2, 1, 5), [
      "الم ذلك الكتاب لا ريب", "فيه هدى للمتقين", "الذين يؤمنون بالغيبيقيمون الصاة ومما", "رزقناهم ينفق",
      "والذين يؤمنون بما أنزل إليك و أنزل", "من قك وبالآخرة هم يوقن", "أول على هدى من ربهم", "وأولئك هم المفلحون",
    ]);
    expect(flagged.size).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a word left out is not counted as recited because the words around it are close", () => {
    // "بالغيب" then "الصلاة" must not be taken as "بالغيب ويقيمون" run together.
    const { summary } = recite(range(2, 1, 3), ["الم ذلك الكتاب لا ريب فيه هدى للمتقين", "الذين يؤمنون بالغيب الصلاة ومما رزقناهم ينفقون"]);
    expect(summary.wordsRecited).toBe(summary.totalWords - 1);
  });

  it("one common word misheard does not carry the reader forward past unread words", () => {
    // An-Nisa 81: "وَٱللَّهُ يَكْتُبُ" heard as "الله" alone, which also fits "عَلَى ٱللَّهِ" eight words on.
    const words = range(4, 80, 83);
    const text = words.map((w) => w.displayText);
    const upTo = text.indexOf("وَٱللَّهُ");
    // Word-by-word finals, as the recognizer sends them.
    const { summary, flagged } = recite(words, [...text.slice(0, upTo), "الله", ...text.slice(upTo + 1)]);
    expect([...flagged.values()].filter((kind) => kind === "skipped")).toEqual([]);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a wrong word the recognizer barely heard is not a mistake; one it was sure of is", () => {
    // Al-Mulk 2 with its third word replaced, the way a mumbled or wrongly read word arrives.
    const words = ayah(67, 2).split(" ");
    words[2] = "كلمةغريبة";
    const sure = (count: number) => Array(count).fill(0.97);
    const sureOfAll = recite(range(67, 1, 4), [ayah(67, 1), words.join(" "), ayah(67, 3), ayah(67, 4)], [sure(4), sure(words.length), sure(9), sure(15)]);
    expect([...sureOfAll.flagged.values()]).toEqual(["mistake"]);
    const unsure = sure(words.length);
    unsure[2] = 0.3;
    const barelyHeard = recite(range(67, 1, 4), [ayah(67, 1), words.join(" "), ayah(67, 3), ayah(67, 4)], [sure(4), unsure, sure(9), sure(15)]);
    expect(barelyHeard.flagged.size).toBe(0);
    expect(barelyHeard.summary.wordsRecited).toBe(barelyHeard.summary.totalWords);
  });

  it("the recognizer's spellings of Mushaf words are exact matches", () => {
    // «الصلوٰة» as الصلاة, «ءأنذرتهم» as أأنذرتهم, «ذٰلك» as ذلك.
    const { summary, flagged } = recite(range(2, 1, 6), [
      "الم", "ذلك الكتاب لا ريب فيه هدى للمتقين", "الذين يؤمنون بالغيب ويقيمون الصلاة ومما رزقناهم ينفقون",
      "والذين يؤمنون بما أنزل إليك وما أنزل من قبلك وبالآخرة هم يوقنون", "أولئك على هدى من ربهم وأولئك هم المفلحون",
      "إن الذين كفروا سواء عليهم أأنذرتهم أم لم تنذرهم لا يؤمنون",
    ]);
    expect(flagged.size).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a wrong ayah ending that closes the next ayah is a mistake, not a jump to it", () => {
    // Al-Nisa 16 ends «إن الله كان توابا رحيما»; read «عليما حكيما», which closes ayah 17.
    const body = "والذان يأتيانها منكم فآذوهما فإن تابا وأصلحا فأعرضوا عنهما إن الله كان";
    const expectWrongEnding = (phrases: string[]) => {
      const { flagged } = recite(range(4, 16, 18), phrases);
      expect(flagged.get("4:16:13")).toBe("mistake");
      expect(flagged.get("4:16:14")).toBe("mistake");
      expect(ayahKeys(4, 17).concat(ayahKeys(4, 18)).some((key) => flagged.has(key))).toBe(false);
    };
    expectWrongEnding([body, "عليما حكيما", ayah(4, 17), ayah(4, 18)]);
    expectWrongEnding([`${body} عليما حكيما`, ayah(4, 17), ayah(4, 18)]);
    // Said alone, the wrong ending leaves the reader where they were.
    const matcher = new NativeQuranLiveMatcher(range(4, 16, 18));
    matcher.feed(body, "a", true);
    expect(matcher.feed("عليما حكيما", "b", true).reading?.verseKey).toBe("4:16");
  });

  it("a wrong last word is shown at once, and saying it right after marks it corrected", () => {
    // Al-Baqarah 12 ends «ولكن لا يشعرون»; read «يعلمون», then stop.
    const words = range(2, 11, 16);
    const wrong = ayah(2, 12).split(" ").slice(0, -1).concat("يعلمون").join(" ");
    const key = "2:12:7";
    const matcher = new NativeQuranLiveMatcher(words);
    matcher.feed(ayah(2, 11), "a", true);
    expect(matcher.feed(wrong, "b", true).wordFeedback.get(key)).toBe("pending");
    expect(matcher.feed("يشعرون", "c", true).wordFeedback.get(key)).toBe("corrected");
    // The wrong word said alone after a pause is caught the same way.
    const alone = new NativeQuranLiveMatcher(words);
    alone.feed(ayah(2, 11), "a", true);
    alone.feed(ayah(2, 12).split(" ").slice(0, -1).join(" "), "b", true);
    expect(alone.feed("يعلمون", "c", true).wordFeedback.get(key)).toBe("pending");
    // Going on without correcting it confirms the mistake.
    const { flagged } = recite(words, [ayah(2, 11), wrong, ayah(2, 13)]);
    expect(flagged.get(key)).toBe("mistake");
    // Talk that is not recitation is not taken for the word.
    const talk = new NativeQuranLiveMatcher(words);
    talk.feed(ayah(2, 11), "a", true);
    talk.feed(ayah(2, 12).split(" ").slice(0, -1).join(" "), "b", true);
    expect(talk.feed("طيب كده", "c", true).wordFeedback.get(key)).toBeUndefined();
  });

  it("recognizer noise on a correct recitation does not turn into skipped ayahs", () => {
    // Dropped and misheard words, phrases split mid-ayah: what live recognition looks like.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const noisy = (words: CanonicalQuranWord[]) => {
      const phrases: string[] = [];
      let phrase: string[] = [];
      for (const word of words) {
        const roll = random();
        if (roll < 0.06) continue;
        phrase.push(roll < 0.14 ? `${word.displayText.slice(0, -1)}ي` : word.displayText);
        if (phrase.length >= 3 + Math.floor(random() * 5)) { phrases.push(phrase.join(" ")); phrase = []; }
      }
      if (phrase.length) phrases.push(phrase.join(" "));
      return phrases;
    };
    let skipped = 0;
    let words = 0;
    for (const [surah, from, to] of [[67, 1, 14], [2, 1, 16], [55, 1, 30], [36, 1, 20], [18, 1, 12]] as const) {
      for (let run = 0; run < 3; run += 1) {
        const corpusRange = range(surah, from, to);
        const { summary } = recite(corpusRange, noisy(corpusRange));
        skipped += summary.skippedWords;
        words += summary.totalWords;
      }
    }
    expect(skipped / words).toBeLessThan(0.01);
  });
});
