// Feeds a transcript to the matcher at an ayah and prints the words it stopped on.
// usage: npx tsx tools/recitation-eval/probe.ts <surah:ayah> "<transcript>" [--no-vocabulary] [--stream] [--into-next]
import { readFileSync } from "node:fs";
import path from "node:path";
import { NativeQuranLiveMatcher, type CanonicalQuranWord } from "../../apps/mobile/lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../../apps/mobile/lib/recitation/quran-normalizer";
import { setQuranVocabulary } from "../../apps/mobile/lib/recitation/quran-vocabulary";

const WORDS = path.join(process.cwd(), "apps/web/public/mushaf/v1/quran-words");
const [place, transcript] = process.argv.slice(2);
const [surah, ayah] = place.split(":").map(Number);
const words: CanonicalQuranWord[] = [];
for (let page = 1; page <= 604; page += 1) {
  for (const word of JSON.parse(readFileSync(path.join(WORDS, "pages", `${page}.json`), "utf8")).words) {
    if ((word.surah === surah && word.ayah >= ayah) || (process.argv.includes("--into-next") && word.surah === surah + 1)) words.push({ ...word, normalizedText: normalizeQuranText(word.displayText) });
  }
}
if (!process.argv.includes("--no-vocabulary")) setQuranVocabulary(JSON.parse(readFileSync(path.join(WORDS, "search-index.json"), "utf8")).rows);
const matcher = new NativeQuranLiveMatcher(words);
matcher.setStartPosition({ verseKey: place });
let last: ReturnType<typeof matcher.feed> | undefined;
// «/» in the transcript ends a recognizer item: each part is streamed, then final.
for (const [item, part] of transcript.split("/").map((text) => text.trim()).filter(Boolean).entries()) {
  if (process.argv.includes("--stream")) {
    const tokens = process.argv.includes("--letters") ? [...part].map((_, k) => part.slice(0, k + 1)) : part.split(" ").map((_, k, all) => all.slice(0, k + 1).join(" "));
    for (const partial of tokens) if (partial.trim() === partial) matcher.feed(partial, `probe-${item}`, false);
  }
  last = matcher.feed(part, `probe-${item}`, true);
}
console.log("read:    ", last?.readingWords, "of", last?.totalWords, "words");
matcher.finish();
console.log("expected:", words.filter((word) => word.ayah === ayah).map((word) => word.normalizedText).join(" | "));
console.log("heard:   ", normalizeQuranText(transcript));
console.log("stops:   ", JSON.stringify(matcher.mistakes().map((m) => ({ at: m.verseKey, text: m.text, heard: m.heard })), null, 0));
