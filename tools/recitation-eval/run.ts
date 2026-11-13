// Measures the live recitation pipeline on recorded recitations whose correctness is known:
// each clip goes through the Tilawi provider as the server runs it (chunked PCM, pauses
// committed) and its transcripts through the app's matcher and mistake engine. Reports how
// often a correct reading is stopped (a false mistake) and how often a wrong one is caught.
//
// usage (from the repository root): npx tsx tools/recitation-eval/run.ts <manifest.json> [--limit N] [--no-expect] [--out results.json] [--transcripts file.json]
//
// --transcripts feeds the matcher another recognizer's transcripts ({ clip id: text }, see
// transcribe-whisper.py) in place of running Tilawi.
//
// The manifest (see extract.py) lists clips: { id, surahName, ayaText, label, pcm } where `pcm`
// is 24 kHz mono PCM16LE, the rate the app sends. The ayah is found by its text.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TilawiStreamingProvider } from "../../apps/api/src/recitation-providers/tilawi/TilawiStreamingProvider";
import { AdpcmEncoder, decodeAdpcm, decodeMulaw, encodeMulaw } from "../../packages/domain/src/recitation-audio-codec";
import { sharedTilawiModel } from "../../apps/api/src/recitation-providers/tilawi/tilawiModel";
import { NativeQuranLiveMatcher, type CanonicalQuranWord } from "../../apps/mobile/lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../../apps/mobile/lib/recitation/quran-normalizer";
import { setQuranVocabulary } from "../../apps/mobile/lib/recitation/quran-vocabulary";

const root = process.cwd();
process.env.TABYAN_TILAWI_MODEL_DIR ??= path.join(root, "apps/api/models/tilawi");
const WORDS = path.join(root, "apps/web/public/mushaf/v1/quran-words");

interface SourceClip { id: string; surahName: string; /** A surah number, when the source gives one. */ surah?: number; ayaText: string; label: string; pcm: string; country?: string; seconds?: number }
interface Clip extends SourceClip { surah: number; ayah: number }
interface ClipResult {
  id: string; surah: number; ayah: number; label: string; country?: string; seconds?: number;
  ayahWords: number;
  /** Words it stopped on inside the ayah: for a correct clip, false mistakes. */
  mistakes: { position: number; text: string; heard: string | null; kind?: string; confidence?: number; outcome?: string }[];
  /** With --mutate: the word of the ayah replaced by another Quran word, which the reading must be stopped on. */
  planted?: { position: number; original: string; replacement: string; outcome: "caught" | "missed" | "stopped-earlier" };
  /** Every settled word with the recognizer's confidence in it. */
  finalWords?: [string, number, (number | null)?][];
  /** For each settled item: audio sent when it arrived, less the end of its last word (ms). Decode time not included. */
  finalLagMs?: number[];
  transcript: string;
  /** Word errors of the transcript against the ayah, over its length. */
  wer: number;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const VALUE_OPTIONS = ["--limit", "--out", "--transcripts", "--shard", "--mutate", "--label", "--codec"];
const manifestPath: string = args.find((arg, index) => !arg.startsWith("--") && !VALUE_OPTIONS.includes(args[index - 1])) ?? "";
if (!manifestPath) throw new Error("usage: run.ts <manifest.json> [--limit N] [--no-expect] [--out results.json]");
const useExpect = !flag("--no-expect");
const limit = Number(option("--limit")) || Infinity;
const transcriptsPath = option("--transcripts");
// --shard i/n runs every n-th clip starting at the i-th, so n processes share the work.
const [shardIndex, shardCount] = (option("--shard") ?? "0/1").split("/").map(Number);
// --mutate near|far plants a wrong word in the reference of each correct clip: the reader then
// reads a word other than the expected one, as a real mistake does, and must be stopped there.
const mutate = option("--mutate") as "near" | "far" | undefined;
// --codec pcm16k|mulaw|adpcm sends the audio as a client on that codec would: 16 kHz, encoded per 100 ms frame.
const codec = option("--codec") as "pcm16k" | "mulaw" | "adpcm" | undefined;
const onlyLabel = option("--label") ?? (mutate ? "correct" : undefined);
const transcripts: Record<string, string> | null = transcriptsPath ? JSON.parse(readFileSync(transcriptsPath, "utf8")) : null;

const corpus: CanonicalQuranWord[] = [];
for (let page = 1; page <= 604; page += 1) {
  for (const word of JSON.parse(readFileSync(path.join(WORDS, "pages", `${page}.json`), "utf8")).words) {
    corpus.push({ ...word, normalizedText: normalizeQuranText(word.displayText) });
  }
}
setQuranVocabulary(JSON.parse(readFileSync(path.join(WORDS, "search-index.json"), "utf8")).rows);
const vocabulary: string[] = [...new Set(corpus.map((word) => word.normalizedText).filter((text) => text.length >= 3))].sort();
const bySurah = new Map<number, CanonicalQuranWord[]>();
for (const word of corpus) bySurah.set(word.surah, [...(bySurah.get(word.surah) ?? []), word]);

/** Text with the letters whose spelling varies between scripts (alef, waw, ya) folded away. */
const fold = (text: string) => normalizeQuranText(text).replace(/[اويى]/g, "").replace(/\s+/g, " ").trim();

function wordErrors(heard: string[], expected: string[]) {
  let previous = Array.from({ length: expected.length + 1 }, (_, j) => j);
  for (let i = 1; i <= heard.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= expected.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (heard[i - 1] === expected[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[expected.length];
}

function hash(text: string) {
  let value = 2166136261;
  for (const letter of text) value = Math.imul(value ^ letter.codePointAt(0)!, 16777619) >>> 0;
  return value;
}
const WEAK = new Set(["ا", "و", "ي", "ى", "ء", "ة", "ه"]);
/** Same length with one strong letter changed («خلق» / «خلف») or two neighbours swapped («يعلمون» / «يعملون»). */
function isNear(a: string, b: string) {
  if (a.length !== b.length || a === b) return false;
  const differing: number[] = [];
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) differing.push(i);
  if (differing.length === 1) return !WEAK.has(a[differing[0]]) && !WEAK.has(b[differing[0]]);
  return differing.length === 2 && differing[1] === differing[0] + 1 && a[differing[0]] === b[differing[1]] && a[differing[1]] === b[differing[0]];
}
function sharedLetters(a: string, b: string) {
  const letters = new Set(a);
  let shared = 0;
  for (const letter of new Set(b)) if (letters.has(letter)) shared += 1;
  return shared;
}
/** The word to plant in place of one word of the ayah, or nothing when the ayah has no fit word. */
function plant(clipId: string, ayahWords: CanonicalQuranWord[], kind: "near" | "far") {
  const choices: { word: CanonicalQuranWord; replacement: string }[] = [];
  for (const word of ayahWords.slice(1)) {
    const text = word.normalizedText;
    if (text.length < 3) continue;
    const candidates = kind === "near"
      ? vocabulary.filter((other) => isNear(text, other))
      : vocabulary.filter((other) => Math.abs(other.length - text.length) <= 1 && sharedLetters(text, other) <= 1);
    if (candidates.length) choices.push({ word, replacement: candidates[hash(`${clipId}:${word.position}`) % candidates.length] });
  }
  return choices.length ? choices[hash(clipId) % choices.length] : null;
}

const CHUNK_BYTES = 24_000 * 2 * 0.1; // 100 ms, as the app sends
const idle = (provider: TilawiStreamingProvider) => new Promise<void>((resolve) => {
  const check = () => ((provider as unknown as { decoding: boolean }).decoding ? setImmediate(check) : resolve());
  setImmediate(check);
});

/** A 24 kHz chunk as the gateway hands it to the provider after a client sent it on `codec`. */
function overCodec(chunk: Buffer, kind: "pcm16k" | "mulaw" | "adpcm", encoder: AdpcmEncoder): Buffer {
  const source = chunk.length >> 1;
  const samples = new Float32Array(Math.round(source * 16 / 24));
  for (let i = 0; i < samples.length; i += 1) {
    const position = i * 1.5;
    const left = Math.floor(position);
    const a = chunk.readInt16LE(left * 2);
    const b = chunk.readInt16LE(Math.min(source - 1, left + 1) * 2);
    samples[i] = (a + (b - a) * (position - left)) / 32768;
  }
  const decoded = kind === "mulaw" ? decodeMulaw(encodeMulaw(samples))
    : kind === "adpcm" ? decodeAdpcm(encoder.encode(samples)).subarray(0, samples.length)
      : Int16Array.from(samples, (sample) => Math.round(Math.max(-1, Math.min(1, sample)) * 32767));
  return Buffer.from(decoded.buffer, decoded.byteOffset, decoded.byteLength);
}

async function runClip(clip: Clip, manifestDir: string): Promise<ClipResult> {
  const surahWords = bySurah.get(clip.surah) ?? [];
  let words = surahWords.filter((word) => word.ayah >= clip.ayah);
  const ayahWords = words.filter((word) => word.ayah === clip.ayah);
  const planted = mutate ? plant(clip.id, ayahWords, mutate) : null;
  if (mutate && !planted) throw new Error("no word to plant");
  if (planted) {
    words = words.map((word) => (word === planted.word ? { ...word, displayText: planted.replacement, normalizedText: planted.replacement } : word));
  }
  const plantedInfo = planted ? { position: planted.word.position, original: planted.word.normalizedText, replacement: planted.replacement } : undefined;
  const finalWords: [string, number, (number | null)?][] = [];
  const finalLagMs: number[] = [];
  let sentMs = 0;
  const matcher = new NativeQuranLiveMatcher(words, process.env.EVAL_SUBSTITUTION_CONFIDENCE ? { substitutionConfidence: Number(process.env.EVAL_SUBSTITUTION_CONFIDENCE) } : {});
  matcher.setStartPosition({ verseKey: `${clip.surah}:${clip.ayah}` });
  const finals: string[] = [];
  if (transcripts) {
    const text = transcripts[clip.id] ?? "";
    if (text) { finals.push(text); matcher.feed(text, clip.id, true); }
    return clipResult(clip, matcher, ayahWords, finals, plantedInfo, finalWords);
  }
  let finalized: () => void = () => undefined;
  const done = new Promise<void>((resolve) => { finalized = resolve; });
  let ready: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => { ready = resolve; });
  let failure: string | null = null;
  const provider: TilawiStreamingProvider = new TilawiStreamingProvider({
    onReady: () => ready(),
    onProviderEvent: () => undefined,
    onTranscript: (event) => {
      if (event.isFinal && event.text) {
        finals.push(event.text);
        if (event.endMs !== undefined) finalLagMs.push(Math.round(sentMs - event.endMs));
        event.text.split(" ").forEach((word, index) => finalWords.push([word, event.wordConfidences?.[index] ?? -1, event.wordMargins?.[index] ?? null]));
      }
      const match = matcher.feed(event.text, event.itemId, event.isFinal, event.wordConfidences);
      if (process.env.EVAL_TRACE) console.error(JSON.stringify({ item: event.itemId, final: event.isFinal, text: event.text, ms: [event.startMs, event.endMs], confidences: event.wordConfidences?.map((value) => Number(value.toFixed(2))), stops: matcher.mistakes().map((mistake) => mistake.heard) }));
      // The app tells the server which words come next after every match.
      if (useExpect) provider.noteExpected(match.diagnostics.mode === "recovery" ? [] : matcher.expectedWords(12));
    },
    onFinalized: () => finalized(),
    onError: (message) => { failure = message; finalized(); },
    onClose: () => finalized(),
  }, sharedTilawiModel, codec ? 16_000 : 24_000);
  provider.connect();
  await opened;
  if (useExpect) provider.noteExpected(matcher.expectedWords(12));
  const pcm = readFileSync(path.resolve(manifestDir, clip.pcm));
  const encoder = new AdpcmEncoder();
  for (let offset = 0; offset < pcm.length; offset += CHUNK_BYTES) {
    const chunk = pcm.subarray(offset, Math.min(pcm.length, offset + CHUNK_BYTES));
    sentMs += chunk.length / 48;
    provider.appendAudio((codec ? overCodec(chunk, codec, encoder) : chunk).toString("base64"));
    await idle(provider);
  }
  provider.commit(true, "end");
  await done;
  provider.close();
  if (failure) throw new Error(failure);
  return { ...clipResult(clip, matcher, ayahWords, finals, plantedInfo, finalWords), finalLagMs };
}

function clipResult(
  clip: Clip, matcher: NativeQuranLiveMatcher, ayahWords: CanonicalQuranWord[], finals: string[],
  planted?: { position: number; original: string; replacement: string }, finalWords: [string, number, (number | null)?][] = [],
): ClipResult {
  matcher.finish();
  const inAyah = matcher.mistakes().filter((mistake) => mistake.verseKey === `${clip.surah}:${clip.ayah}`);
  const internals = matcher as unknown as { engine: { mistakeAt(index: number): { kind: string } | null }; indexByKey: Map<string, number> };
  const kindOf = (key: string) => internals.engine.mistakeAt(internals.indexByKey.get(key) ?? -1)?.kind;
  const confidenceOf = (heard: string | null) => {
    if (!heard) return undefined;
    const found = finalWords.filter(([word]) => normalizeQuranText(word) === heard).map(([, confidence]) => confidence);
    return found.length ? Math.max(...found) : undefined;
  };
  const positions = inAyah.map((mistake) => mistake.position);
  const outcome = !planted ? undefined
    : positions.includes(planted.position) ? "caught" as const
      : positions.some((position) => position < planted.position) ? "stopped-earlier" as const : "missed" as const;
  // Spelling differences (the Mushaf's dagger alef, a recognizer's long vowels) are not word errors.
  const heard = fold(finals.join(" ")).split(" ").filter(Boolean);
  const expected = ayahWords.map((word) => fold(word.normalizedText)).filter(Boolean);
  return {
    id: clip.id, surah: clip.surah, ayah: clip.ayah, label: clip.label, country: clip.country, seconds: clip.seconds,
    ayahWords: ayahWords.length,
    mistakes: inAyah.map((mistake) => ({ position: mistake.position, text: mistake.text, heard: mistake.heard, kind: kindOf(mistake.key), confidence: confidenceOf(mistake.heard), outcome: mistake.outcome })),
    ...(planted && outcome ? { planted: { ...planted, outcome } } : {}),
    finalWords,
    transcript: finals.join(" "),
    wer: expected.length ? wordErrors(heard, expected) / expected.length : 0,
  };
}

// The dataset names the ayah by its text; an ayah read alike in several surahs is told apart
// by the surah name. Texts that are not one whole ayah (the adhan, the tashahhud, the
// isti'adha, a part of Ayat al-Kursi) are left out.
const SURAH_NUMBERS: Record<string, number> = {
  "Al-Faatihah": 1, "Ayat al-Kursi": 2, "Al-Asr": 103, "Al-Kauthar": 108, "Al-Kafiroon": 109,
  "An-Nasr": 110, "Al-Masad": 111, "Al-Ikhlas": 112, "Al-Falaq": 113, "An-Nas": 114,
};
const ayahsByText = new Map<string, { surah: number; ayah: number }[]>();
for (const [surah, words] of bySurah) {
  const texts = new Map<number, string[]>();
  for (const word of words) texts.set(word.ayah, [...(texts.get(word.ayah) ?? []), word.normalizedText]);
  for (const [ayah, parts] of texts) {
    const key = fold(parts.join(" "));
    ayahsByText.set(key, [...(ayahsByText.get(key) ?? []), { surah, ayah }]);
  }
}
async function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SourceClip[];
  const resolved: Clip[] = [];
  const unresolved = new Map<string, number>();
  for (const clip of manifest) {
    const places = ayahsByText.get(fold(clip.ayaText)) ?? [];
    const wanted = clip.surah ?? SURAH_NUMBERS[clip.surahName];
    // A numbered source can be a surah off; an ayah read alike in several places is then the nearest.
    const nearest = clip.surah === undefined ? undefined : [...places].sort((a, b) => Math.abs(a.surah - wanted) - Math.abs(b.surah - wanted))[0];
    const place = places.find((candidate) => candidate.surah === wanted) ?? nearest ?? (places.length === 1 ? places[0] : undefined);
    if (place) resolved.push({ ...clip, ...place });
    else unresolved.set(clip.surahName || String(clip.surah), (unresolved.get(clip.surahName || String(clip.surah)) ?? 0) + 1);
  }
  console.error(`${resolved.length} of ${manifest.length} clips are one whole ayah; left out: ${JSON.stringify(Object.fromEntries(unresolved))}`);
  const clips = resolved.filter((clip) => !onlyLabel || clip.label === onlyLabel).filter((_, index) => index % shardCount === shardIndex).slice(0, limit);
  const results: ClipResult[] = [];
  const started = Date.now();
  for (const [index, clip] of clips.entries()) {
    try {
      results.push(await runClip(clip, path.dirname(manifestPath)));
    } catch (error) {
      if (!(error instanceof Error && error.message === "no word to plant")) console.error(`clip ${clip.id} failed: ${error instanceof Error ? error.message : error}`);
    }
    if ((index + 1) % 50 === 0) console.error(`${index + 1}/${clips.length} clips, ${Math.round((Date.now() - started) / 1000)} s`);
  }

  const percent = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "-");
  console.log(transcripts ? `pipeline: transcripts of ${transcriptsPath}, strict matcher` : `pipeline: Tilawi ${useExpect ? "with" : "without"} expected words, strict matcher`);
  for (const label of [...new Set(results.map((result) => result.label))].sort()) {
    const group = results.filter((result) => result.label === label);
    const words = group.reduce((sum, result) => sum + result.ayahWords, 0);
    const flagged = group.filter((result) => result.mistakes.length > 0);
    const meanWer = group.reduce((sum, result) => sum + result.wer, 0) / group.length;
    console.log(`${label}: ${group.length} clips, ${words} ayah words`
      + ` | stopped on a word: ${flagged.length} clips (${percent(flagged.length, group.length)})`
      + ` | words stopped on: ${group.reduce((sum, result) => sum + result.mistakes.length, 0)} (${percent(group.reduce((sum, result) => sum + result.mistakes.length, 0), words)})`
      + ` | nothing heard: ${group.filter((result) => !result.transcript).length}`
      + ` | transcript WER: ${(meanWer * 100).toFixed(1)}%`);
    if (mutate) {
      const count = (outcome: string) => group.filter((result) => result.planted?.outcome === outcome).length;
      console.log(`  planted ${mutate} word: caught ${count("caught")} (${percent(count("caught"), group.length)}), missed ${count("missed")} (${percent(count("missed"), group.length)}), stopped earlier ${count("stopped-earlier")}`);
    }
  }
  const out = option("--out");
  if (out) writeFileSync(out, JSON.stringify(results, null, 1));
}

void main();
