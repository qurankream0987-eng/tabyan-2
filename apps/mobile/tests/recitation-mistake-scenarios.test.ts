import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NativeQuranLiveMatcher, type CanonicalQuranWord } from "../lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../lib/recitation/quran-normalizer";
import { isQuranVocabularyWord, setQuranVocabulary } from "../lib/recitation/quran-vocabulary";
import type { SearchRow } from "@workspace/tabyan-domain/quran-search";

// Whole recitations through the shared matcher and mistake engine, fed the way the
// recognizer sends them: growing partials, then a final per phrase. The reader is stopped
// on every wrong or missing word until it is read right; nothing is ever skipped.
const PAGES = join(__dirname, "../../web/public/mushaf/v1/quran-words/pages");
const corpus: CanonicalQuranWord[] = [];
for (let page = 1; page <= 604; page += 1) {
  for (const word of JSON.parse(readFileSync(join(PAGES, `${page}.json`), "utf8")).words) {
    corpus.push({ ...word, normalizedText: normalizeQuranText(word.displayText) });
  }
}
// As in the app once the search index is loaded: every word of the Quran is known.
setQuranVocabulary((JSON.parse(readFileSync(join(PAGES, "../search-index.json"), "utf8")) as { rows: SearchRow[] }).rows);
const range = (surah: number, from: number, to: number) => corpus.filter((w) => w.surah === surah && w.ayah >= from && w.ayah <= to);
const ayahWords = (surah: number, number: number) => range(surah, number, number).map((w) => w.displayText);
const ayah = (surah: number, number: number) => ayahWords(surah, number).join(" ");

function recite(words: CanonicalQuranWord[], phrases: string[], confidences?: number[][]) {
  const matcher = new NativeQuranLiveMatcher(words);
  let last = null as ReturnType<NativeQuranLiveMatcher["feed"]> | null;
  phrases.forEach((phrase, item) => {
    const tokens = phrase.split(" ");
    for (let k = 1; k < tokens.length; k += 1) matcher.feed(tokens.slice(0, k).join(" "), `p${item}`, false);
    last = matcher.feed(phrase, `p${item}`, true, confidences?.[item]);
  });
  const summary = matcher.finish();
  const flagged = new Map(matcher.flaggedWords().map((f) => [f.key, f.kind]));
  return { summary, flagged, reading: last?.reading ?? null };
}
const mulk = (...ayahs: number[]) => recite(range(67, 1, 6), ayahs.map((n) => ayah(67, n)));
const ayahKeys = (surah: number, number: number) => range(surah, number, number).map((w) => `${w.verseKey}:${w.position}`);
const wordsOf = (summary: { wordsRecited: number }) => summary.wordsRecited;

describe("recitation mistakes", () => {
  it("a correct recitation has no mistakes", () => {
    const { summary, flagged } = mulk(1, 2, 3, 4, 5, 6);
    expect(flagged.size).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("an ayah left out stops the reader at its first word; reading it lets him go on", () => {
    const skipped = mulk(1, 3, 4, 5, 6);
    expect(skipped.flagged.get("67:2:1")).toBe("mistake");
    expect([...skipped.flagged.values()].filter((kind) => kind === "skipped")).toEqual([]);
    expect(wordsOf(skipped.summary)).toBe(ayahKeys(67, 1).length);
    expect(skipped.summary.skippedWords).toBe(0);

    const goneBack = mulk(1, 3, 2, 3, 4, 5, 6);
    expect(goneBack.flagged.get("67:2:1")).toBe("corrected");
    expect(goneBack.flagged.size).toBe(1);
    expect(goneBack.summary.wordsRecited).toBe(goneBack.summary.totalWords);
    expect(goneBack.summary.confirmedMistakes).toBe(1);
    expect(goneBack.summary.correctedWords).toBe(1);
  });

  it("an ayah from elsewhere read in place of the expected one stops the reader there", () => {
    const foreign = ayah(2, 255).split(" ").slice(0, 10).join(" ");
    const { flagged, summary } = recite(range(67, 1, 6), [ayah(67, 1), foreign, ayah(67, 3), ayah(67, 4), ayah(67, 5)]);
    expect(flagged.get("67:2:1")).toBe("mistake");
    expect(ayahKeys(67, 3).concat(ayahKeys(67, 4)).some((key) => flagged.has(key))).toBe(false);
    expect(wordsOf(summary)).toBe(ayahKeys(67, 1).length);
  });

  it("a later ayah read in place of the expected one is not followed", () => {
    const { summary, flagged } = mulk(1, 4, 3, 5, 6);
    expect(flagged.get("67:2:1")).toBe("mistake");
    expect(ayahKeys(67, 4).concat(ayahKeys(67, 5)).some((key) => flagged.has(key))).toBe(false);
    expect(wordsOf(summary)).toBe(ayahKeys(67, 1).length);
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

  it("a word left out stops the reader on it, though the words around it are close", () => {
    // "بالغيب" then "الصلاة": «ويقيمون» was not said.
    const { summary, flagged, reading } = recite(range(2, 1, 3), ["الم ذلك الكتاب لا ريب فيه هدى للمتقين", "الذين يؤمنون بالغيب الصلاة ومما رزقناهم ينفقون"]);
    expect(flagged.get("2:3:4")).toBe("mistake");
    expect(reading?.verseKey).toBe("2:3");
    expect(reading?.position).toBe(3);
    expect(summary.wordsRecited).toBe(range(2, 1, 2).length + 3);
  });

  it("Al Imran 3: «التوراة» read wrong or left out stops the reader at «وأنزل» until he says it", () => {
    // «وأنزل التوراة والإنجيل * من قبل هدى للناس وأنزل الفرقان»
    const words = range(3, 1, 5);
    const third = ayahWords(3, 3);
    const at = third.findIndex((word) => normalizeQuranText(word).startsWith("التور"));
    expect(at).toBeGreaterThan(0);
    const key = `3:3:${at + 1}`;
    const withWord = (word: string | null) => [...third.slice(0, at), ...(word ? [word] : []), ...third.slice(at + 1)].join(" ");
    for (const wrong of [withWord("الفرقان"), withWord(null)]) {
      const stopped = recite(words, [ayah(3, 1), ayah(3, 2), wrong, ayah(3, 4)]);
      expect(stopped.flagged.get(key)).toBe("mistake");
      expect(stopped.reading?.position).toBe(at);
      expect(ayahKeys(3, 4).some((k) => stopped.flagged.has(k))).toBe(false);
      expect(stopped.summary.wordsRecited).toBe(ayahKeys(3, 1).length + ayahKeys(3, 2).length + at);

      const corrected = recite(words, [ayah(3, 1), ayah(3, 2), wrong, third.slice(at - 1).join(" "), ayah(3, 4)]);
      expect(corrected.flagged.get(key)).toBe("corrected");
      expect(corrected.flagged.size).toBe(1);
      expect(corrected.reading?.verseKey).toBe("3:4");
    }
  });

  it("the summary lists each mistake: the Mushaf word, what was said instead, and how it ended", () => {
    const words = range(2, 11, 16);
    const said = (...phrases: string[]) => {
      const matcher = new NativeQuranLiveMatcher(words);
      phrases.forEach((phrase, item) => matcher.feed(phrase, `p${item}`, true));
      matcher.finish();
      return matcher.mistakes();
    };
    const head = ayah(2, 12).split(" ").slice(0, -1).join(" ");
    const corrected = said(ayah(2, 11), `${head} يعلمون`, "يشعرون");
    expect(corrected).toHaveLength(1);
    expect(corrected[0]).toMatchObject({ verseKey: "2:12", position: 7, heard: "يعلمون", outcome: "corrected" });
    expect(normalizeQuranText(corrected[0].text)).toBe("يشعرون");
    expect(said(ayah(2, 11), `${head} يعلمون`)[0].outcome).toBe("uncorrected");
    // A word left out has nothing heard in its place.
    const third = ayah(2, 13).split(" ");
    const missing = said(ayah(2, 11), ayah(2, 12), [third[0], ...third.slice(2, 6)].join(" "));
    expect(missing[0]).toMatchObject({ verseKey: "2:13", position: 2, heard: null, outcome: "uncorrected" });
    expect(said(ayah(2, 11), ayah(2, 12))).toEqual([]);
  });

  it("one common word misheard does not carry the reader forward past unread words", () => {
    // An-Nisa 81: "وَٱللَّهُ يَكْتُبُ" heard as "الله" alone, which also fits "عَلَى ٱللَّهِ" eight words on.
    const words = range(4, 80, 83);
    const text = words.map((w) => w.displayText);
    const upTo = words.findIndex((w) => w.verseKey === "4:81" && w.normalizedText === "والله");
    expect(upTo).toBeGreaterThan(0);
    // Word-by-word finals, as the recognizer sends them.
    const { summary, flagged } = recite(words, [...text.slice(0, upTo), "الله", ...text.slice(upTo + 1)]);
    expect(flagged.size).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a wrong word the recognizer barely heard is not a mistake; one it was sure of stops the reader", () => {
    // Al-Mulk 2 with its third word replaced, the way a mumbled or wrongly read word arrives.
    const words = ayah(67, 2).split(" ");
    words[2] = "كلمةغريبة";
    const sure = (count: number) => Array(count).fill(0.97);
    const sureOfAll = recite(range(67, 1, 4), [ayah(67, 1), words.join(" "), ayah(67, 3), ayah(67, 4)], [sure(4), sure(words.length), sure(9), sure(15)]);
    expect([...sureOfAll.flagged.entries()]).toEqual([["67:2:3", "mistake"]]);
    expect(sureOfAll.reading?.verseKey).toBe("67:2");
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

  it("a wrong ayah ending that closes the next ayah stops the reader; it never jumps to that ayah", () => {
    // Al-Nisa 16 ends «إن الله كان توابا رحيما»; read «عليما حكيما», which closes ayah 17.
    const body = "والذان يأتيانها منكم فآذوهما فإن تابا وأصلحا فأعرضوا عنهما إن الله كان";
    const expectStopped = (phrases: string[]) => {
      const { flagged, reading, summary } = recite(range(4, 16, 18), phrases);
      expect(flagged.get("4:16:13")).toBe("mistake");
      expect(reading?.verseKey).toBe("4:16");
      expect(reading?.position).toBe(12);
      expect(ayahKeys(4, 17).concat(ayahKeys(4, 18)).some((key) => flagged.has(key))).toBe(false);
      expect(summary.wordsRecited).toBe(12);
    };
    expectStopped([body, "عليما حكيما", ayah(4, 17), ayah(4, 18)]);
    expectStopped([`${body} عليما حكيما`, ayah(4, 17), ayah(4, 18)]);
    expectStopped([`${body} عليما حكيما ${ayah(4, 17)}`]);
    // Read right after the stop, the reader goes on.
    const { flagged, summary } = recite(range(4, 16, 18), [`${body} عليما حكيما`, "إن الله كان توابا رحيما", ayah(4, 17), ayah(4, 18)]);
    expect(flagged.get("4:16:13")).toBe("corrected");
    expect(flagged.size).toBe(1);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a wrong last word is shown at once, and saying it right after marks it corrected", () => {
    // Al-Baqarah 12 ends «ولكن لا يشعرون»; read «يعلمون», then stop.
    const words = range(2, 11, 16);
    const wrong = ayah(2, 12).split(" ").slice(0, -1).concat("يعلمون").join(" ");
    const key = "2:12:7";
    const matcher = new NativeQuranLiveMatcher(words);
    matcher.feed(ayah(2, 11), "a", true);
    expect(matcher.feed(wrong, "b", true).wordFeedback.get(key)).toBe("mistake");
    expect(matcher.feed("يشعرون", "c", true).wordFeedback.get(key)).toBe("corrected");
    // The wrong word said alone after a pause is caught the same way.
    const alone = new NativeQuranLiveMatcher(words);
    alone.feed(ayah(2, 11), "a", true);
    alone.feed(ayah(2, 12).split(" ").slice(0, -1).join(" "), "b", true);
    expect(alone.feed("يعلمون", "c", true).wordFeedback.get(key)).toBe("mistake");
    // Going on without correcting it is not followed.
    const { flagged, reading } = recite(words, [ayah(2, 11), wrong, ayah(2, 13)]);
    expect(flagged.get(key)).toBe("mistake");
    expect(reading?.verseKey).toBe("2:12");
    expect(ayahKeys(2, 13).some((k) => flagged.has(k))).toBe(false);
    // Talk that is not recitation is not taken for the word.
    const talk = new NativeQuranLiveMatcher(words);
    talk.feed(ayah(2, 11), "a", true);
    talk.feed(ayah(2, 12).split(" ").slice(0, -1).join(" "), "b", true);
    expect(talk.feed("طيب كده", "c", true).wordFeedback.get(key)).toBeUndefined();
  });

  it("another Quran word read in place of the expected one stops the reader, however close", () => {
    // «ولا الظالمين» for «ولا الضالين»: two letters apart, but a word of the Quran.
    const fatiha = range(1, 1, 7);
    const last = fatiha[fatiha.length - 1];
    const wrongEnding = recite(fatiha, [ayah(1, 1), ayah(1, 2), ayah(1, 3), ayah(1, 4), ayah(1, 5), ayah(1, 6), "صراط الذين انعمت عليهم غير المغضوب عليهم ولا الظالمين"]);
    expect(wrongEnding.flagged.get(`${last.verseKey}:${last.position}`)).toBe("mistake");
    // «لا يفعلون شيئا» for «لا يعقلون شيئا» (Al-Baqarah 170): one letter apart, both Quran words.
    const target = range(2, 170, 170).find((word) => word.normalizedText === "يعقلون")!;
    const swapped = range(2, 170, 170).map((word) => (word === target ? "يفعلون" : word.displayText)).join(" ");
    const wrongWord = recite(range(2, 169, 171), [ayah(2, 169), swapped, ayah(2, 171)]);
    expect(wrongWord.flagged.get(`2:170:${target.position}`)).toBe("mistake");
    expect(wrongWord.reading?.verseKey).toBe("2:170");
  });

  it("a drawn-out vowel written as a letter is the same word, even when that spelling is a Quran word", () => {
    // «باسم الله» and «رب» heard as «ربي»: both spellings are words of the Quran elsewhere.
    const fatiha = range(1, 1, 3);
    const { summary } = recite(fatiha, ["باسم الله الرحمن الرحيم", "الحمد لله ربي العالمين", ayah(1, 3)]);
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
    // A vowel written inside the word is another word: «قال هو الله أحد» for «قل هو الله أحد».
    const wrong = recite(range(112, 1, 1), ["قال هو الله أحد"]);
    expect(wrong.flagged.get("112:1:1")).toBe("mistake");
    // A hamza the Mushaf writes on the line: «فاسأل» for «فسـٔل», «الأيكة» for «لـٔيكة».
    expect(recite(range(23, 113, 113), ["قالوا لبثنا يوما أو بعض يوم فاسأل العادين"]).summary.confirmedMistakes).toBe(0);
    expect(recite(range(38, 13, 13), ["وثمود وقوم لوط وأصحاب الأيكة أولئك الأحزاب"]).summary.confirmedMistakes).toBe(0);
  });

  it("a wrong last word is a mistake even when it is a word of another page", () => {
    // «شك» is in the Quran but not in this ayah's pages; said for «ريب» with nothing read after it.
    for (const phrases of [["ذلك الكتاب لا شك"], ["ذلك", "الكتاب", "لا", "شك"]]) {
      const { summary, flagged } = recite(range(2, 2, 5), phrases);
      expect(summary.confirmedMistakes).toBe(1);
      expect(flagged.get("2:2:4")).toBe("mistake");
    }
  });

  it("reading on past the end of a surah, the basmala and the next surah are followed, word by word too", () => {
    // The end of Hud, the basmala, then Yusuf 1-2: as one phrase per ayah, and one word per phrase.
    const words = [...range(11, 123, 123), ...range(12, 1, 2)];
    const text = [ayah(11, 123), "بسم الله الرحمن الرحيم", ayah(12, 1), ayah(12, 2)];
    // Word by word as a recognizer sends it: letters only, no waqf marks on their own.
    for (const phrases of [text, text.join(" ").split(" ").filter((token) => /[ء-ي]/.test(token))]) {
      const matcher = new NativeQuranLiveMatcher(words);
      let unmatched = 0;
      let last = null as ReturnType<NativeQuranLiveMatcher["feed"]> | null;
      phrases.forEach((phrase, item) => {
        last = matcher.feed(phrase, `p${item}`, true);
        if (last.diagnostics.unmatched) unmatched += 1;
      });
      expect(unmatched).toBe(0);
      expect(last?.readingWords).toBe(words.length);
      expect(matcher.finish().confirmedMistakes).toBe(0);
    }
  });

  it("a word the Mushaf joins and a recognizer writes apart is one word read right", () => {
    // «يا أيها» for «يأيها» (Al-Baqarah 21), «يا قوم» (Al-Mu'minun 23), «لا انفضوا» for «لانفضوا» (Aal Imran 159).
    for (const [surah, verse, heard] of [
      [2, 21, "يا أيها الناس اعبدوا ربكم الذي خلقكم والذين من قبلكم لعلكم تتقون"],
      [23, 23, "ولقد أرسلنا نوحا إلى قومه فقال يا قوم اعبدوا الله ما لكم من إله غيره أفلا تتقون"],
      [3, 159, "فبما رحمة من الله لنت لهم ولو كنت فظا غليظ القلب لا انفضوا من حولك"],
    ] as const) {
      const { summary } = recite(range(surah, verse, verse), [heard]);
      expect(summary.confirmedMistakes).toBe(0);
    }
  });

  it("a joined word whose halves arrive as separate phrases is still one word read right", () => {
    // A recognizer that ends a phrase at every word: «يا» then «أبانا» (Yusuf 11), «يا» then «أيها».
    expect(recite(range(12, 11, 11), ["قالوا", "يا", "أبانا", "ما", "لك", "لا", "تأمنا", "على", "يوسف", "وإنا", "له", "لناصحون"]).summary.confirmedMistakes).toBe(0);
    const { summary } = recite(range(2, 21, 21), ["يا", "أيها", "الناس", "اعبدوا", "ربكم", "الذي", "خلقكم", "والذين", "من", "قبلكم", "لعلكم", "تتقون"]);
    expect(summary.confirmedMistakes).toBe(0);
    expect(summary.wordsRecited).toBe(summary.totalWords);
  });

  it("a word misheard by a letter or two, or a short word the recognizer drops, never stops a correct reading", () => {
    // Misheard endings and dropped short words, phrases split mid-ayah: live recognition noise.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const noisy = (words: CanonicalQuranWord[]) => {
      const phrases: string[] = [];
      let phrase: string[] = [];
      let lastDropped = false;
      for (const word of words) {
        const roll = random();
        const short = word.normalizedText.length <= 2;
        if (short && !lastDropped && roll < 0.3) { lastDropped = true; continue; }
        lastDropped = false;
        // A misheard ending that is not itself a Quran word («وجعلني» is: read wrong, not misheard).
        const misheard = `${word.normalizedText.slice(0, -1)}ي`;
        phrase.push(roll < 0.08 && word.normalizedText.length >= 5 && !isQuranVocabularyWord(misheard) ? misheard : word.displayText);
        if (phrase.length >= 3 + Math.floor(random() * 5)) { phrases.push(phrase.join(" ")); phrase = []; }
      }
      if (phrase.length) phrases.push(phrase.join(" "));
      return phrases;
    };
    let stopped = 0;
    let read = 0;
    let words = 0;
    for (const [surah, from, to] of [[67, 1, 14], [2, 1, 16], [55, 1, 30], [36, 1, 20], [18, 1, 12]] as const) {
      for (let run = 0; run < 3; run += 1) {
        const corpusRange = range(surah, from, to);
        const { summary } = recite(corpusRange, noisy(corpusRange));
        stopped += summary.confirmedMistakes;
        read += summary.wordsRecited;
        words += summary.totalWords;
      }
    }
    expect(stopped).toBe(0);
    expect(read).toBeGreaterThan(words * 0.97);
  });
});
