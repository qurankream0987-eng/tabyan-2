/**
 * Tabyan AI — real-audio recitation benchmark.
 *
 * Streams REAL reciter audio (quran.com per-verse recordings with word-level
 * timestamps) at real-time pace, in the same 100ms / 24kHz PCM16 frames the
 * browser AudioWorklet produces, through the SAME provider adapter the gateway
 * uses (the selected API-server adapter) and the SAME client-side segmenter,
 * matcher and state engine. Word timestamps give ground truth for latency.
 *
 * What it does NOT measure: browser capture, WebSocket hop to the gateway, and
 * React render. Deviation scenarios are splices of real audio at word
 * boundaries (not a human making the mistake), and clearly labelled as such.
 *
 * Usage:
 *   BENCH_PROVIDER=openai OPENAI_API_KEY=... npx tsx tools/benchmarks/recitation-audio-benchmark.ts [scenario...]
 *   BENCH_PROVIDER=tarteel npx tsx tools/benchmarks/recitation-audio-benchmark.ts [scenario...]
 * Env: BENCH_PROVIDER (default openai), BENCH_CACHE_DIR (default OS tmp), BENCH_OUT (JSON path).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { OpenAiRealtimeProvider } from "../../apps/api/src/recitation-providers/OpenAiRealtimeProvider";
import { TarteelWhisperProvider } from "../../apps/api/src/recitation-providers/TarteelWhisperProvider";
import { stopTarteelWhisperWorker } from "../../apps/api/src/recitation-providers/TarteelWhisperWorker";
import type {
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "../../apps/api/src/recitation-providers/types";
import { QuranLiveMatcher } from "../../apps/web/src/lib/recitation-ai/QuranLiveMatcher";
import { normalizeQuranText } from "../../apps/web/src/lib/recitation-ai/normalizer";
import { RecitationStateEngine } from "../../apps/web/src/lib/recitation-ai/recitationStateEngine";
import { UtteranceSegmenter } from "../../apps/web/src/lib/recitation-ai/latencyTelemetry";
import type { CanonicalQuranWord } from "../../apps/web/src/lib/recitation-ai/canonicalWords";

const RATE = 24_000;
const FRAME_SAMPLES = RATE / 10;
const RECITATION_ID = 7; // Mishary Rashid Alafasy (quran.com), murattal
const AUDIO_BASE = "https://verses.quran.com/";
const CACHE = process.env.BENCH_CACHE_DIR ?? join(tmpdir(), "tabyan-recitation-bench");

interface VerseAudio { verseKey: string; pcm: Int16Array; segments: Map<number, [number, number]> }
interface TimelineWord { verseKey: string; position: number; endMs: number }
interface Timeline { pcm: Int16Array; words: TimelineWord[]; spokenWordKeys: string[] }

// ─── audio acquisition ────────────────────────────────────────────────────────

async function loadChapterAudio(chapter: number): Promise<Map<string, VerseAudio>> {
  mkdirSync(CACHE, { recursive: true });
  const metaPath = join(CACHE, `${RECITATION_ID}-${chapter}.json`);
  if (!existsSync(metaPath)) {
    const response = await fetch(`https://api.quran.com/api/v4/recitations/${RECITATION_ID}/by_chapter/${chapter}?per_page=50&fields=segments`);
    if (!response.ok) throw new Error(`segments ${response.status}`);
    writeFileSync(metaPath, await response.text());
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
    audio_files: { verse_key: string; url: string; segments: number[][] }[];
  };
  const verses = new Map<string, VerseAudio>();
  const requiredVerses = new Set([`${chapter}:1`, `${chapter}:2`, `${chapter}:3`]);
  for (const file of meta.audio_files.filter((entry) => requiredVerses.has(entry.verse_key))) {
    const base = join(CACHE, file.verse_key.replace(":", "_"));
    if (!existsSync(`${base}.pcm`)) {
      const response = await fetch(new URL(file.url, AUDIO_BASE));
      if (!response.ok) throw new Error(`audio ${file.verse_key} ${response.status}`);
      writeFileSync(`${base}.mp3`, Buffer.from(await response.arrayBuffer()));
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", `${base}.mp3`, "-ac", "1", "-ar", String(RATE), "-f", "s16le", `${base}.pcm`]);
    }
    const bytes = readFileSync(`${base}.pcm`);
    const segments = new Map<number, [number, number]>();
    for (const segment of file.segments) segments.set(segment[1], [segment[2], segment[3]]);
    verses.set(file.verse_key, {
      verseKey: file.verse_key,
      pcm: new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2),
      segments,
    });
  }
  return verses;
}

// ─── scenario construction (splices of real audio at word boundaries) ─────────

type Piece =
  | { kind: "words"; verseKey: string; from: number; to: number }
  | { kind: "silence"; ms: number }
  /** real audio of a word from elsewhere, labelled as a spoken wrong word */
  | { kind: "foreign"; verseKey: string; position: number };

function build(verses: Map<string, VerseAudio>, pieces: Piece[]): Timeline {
  const chunks: Int16Array[] = [];
  const words: TimelineWord[] = [];
  const spokenWordKeys: string[] = [];
  let cursorMs = 300;
  chunks.push(new Int16Array(RATE * 0.3));
  const sampleAt = (ms: number) => Math.max(0, Math.round((ms / 1000) * RATE));
  for (const piece of pieces) {
    if (piece.kind === "silence") {
      chunks.push(new Int16Array(sampleAt(piece.ms)));
      cursorMs += piece.ms;
      continue;
    }
    const verse = verses.get(piece.verseKey);
    if (!verse) throw new Error(`missing ${piece.verseKey}`);
    const from = piece.kind === "words" ? piece.from : piece.position;
    const to = piece.kind === "words" ? piece.to : piece.position;
    const start = verse.segments.get(from)?.[0];
    const end = verse.segments.get(to)?.[1];
    if (start === undefined || end === undefined) throw new Error(`segment ${piece.verseKey}:${from}-${to}`);
    const slice = verse.pcm.slice(sampleAt(start), Math.min(verse.pcm.length, sampleAt(end + 60)));
    chunks.push(slice);
    for (let position = from; position <= to; position += 1) {
      spokenWordKeys.push(`${piece.verseKey}:${position}`);
    }
    if (piece.kind === "words") {
      for (let position = from; position <= to; position += 1) {
        const [, wordEnd] = verse.segments.get(position)!;
        words.push({ verseKey: piece.verseKey, position, endMs: cursorMs + (wordEnd - start) });
      }
    }
    cursorMs += (slice.length / RATE) * 1000;
  }
  chunks.push(new Int16Array(RATE * 1.5));
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Int16Array(total);
  let offset = 0;
  for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length; }
  return { pcm, words, spokenWordKeys };
}

function tempo(timeline: Timeline, factor: number): Timeline {
  const input = join(CACHE, "tempo-in.pcm");
  const output = join(CACHE, "tempo-out.pcm");
  writeFileSync(input, Buffer.from(timeline.pcm.buffer));
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(RATE), "-ac", "1", "-i", input,
    "-filter:a", `atempo=${factor}`, "-f", "s16le", "-ar", String(RATE), "-ac", "1", output]);
  const bytes = readFileSync(output);
  return {
    pcm: new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2),
    words: timeline.words.map((word) => ({ ...word, endMs: word.endMs / factor })),
    spokenWordKeys: timeline.spokenWordKeys,
  };
}

function withNoise(timeline: Timeline, snrDb: number, seed = 1): Timeline {
  let signalPower = 0;
  let count = 0;
  for (const sample of timeline.pcm) if (Math.abs(sample) > 300) { signalPower += sample * sample; count += 1; }
  const noiseRms = Math.sqrt(signalPower / Math.max(1, count)) / 10 ** (snrDb / 20);
  let state = seed;
  const gaussian = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const u = (state + 1) / 0x80000001;
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const v = (state + 1) / 0x80000001;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pcm = new Int16Array(timeline.pcm.length);
  for (let i = 0; i < pcm.length; i += 1) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(timeline.pcm[i] + gaussian() * noiseRms)));
  return { ...timeline, pcm };
}

function gain(timeline: Timeline, factor: number): Timeline {
  return { ...timeline, pcm: Int16Array.from(timeline.pcm, (sample) => Math.round(sample * factor)) };
}

interface Expectation {
  /** verseKey:position of words whose confirmed mistakes are ground truth */
  mistakes: { word: string; kind: string }[];
  /** verseKey:position expected to end CORRECTED */
  corrections: string[];
  finalWord: string;
}

interface Scenario { name: string; category: string; timeline: Timeline; expect: Expectation }

function scenarios(verses: Map<string, VerseAudio>): Scenario[] {
  const w = (verseKey: string, from: number, to: number): Piece => ({ kind: "words", verseKey, from, to });
  const len = (verseKey: string) => verses.get(verseKey)!.segments.size;
  const all = (verseKey: string) => w(verseKey, 1, len(verseKey));
  const base = build(verses, [all("67:1"), all("67:2")]);
  return [
    { name: "clear_67_1-3", category: "normal", timeline: build(verses, [all("67:1"), all("67:2"), all("67:3")]),
      expect: { mistakes: [], corrections: [], finalWord: `67:3:${len("67:3")}` } },
    { name: "pause_2500ms", category: "pause", timeline: build(verses, [all("67:1"), { kind: "silence", ms: 2500 }, all("67:2")]),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "repeated_word", category: "repeat", timeline: build(verses, [w("67:1", 1, 3), w("67:1", 3, len("67:1"))]),
      expect: { mistakes: [], corrections: [], finalWord: `67:1:${len("67:1")}` } },
    { name: "omitted_word", category: "skip", timeline: build(verses, [all("67:1"), w("67:2", 1, 3), w("67:2", 5, len("67:2"))]),
      expect: { mistakes: [{ word: "67:2:4", kind: "OMISSION" }], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "wrong_word_uncorrected", category: "mismatch", timeline: build(verses, [all("67:1"), w("67:2", 1, 5), { kind: "foreign", verseKey: "67:3", position: 4 }, w("67:2", 7, len("67:2"))]),
      expect: { mistakes: [{ word: "67:2:6", kind: "WRONG_WORD" }], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "self_correction", category: "self-correction", timeline: build(verses, [w("67:1", 1, 5), { kind: "foreign", verseKey: "67:3", position: 4 }, w("67:1", 6, len("67:1"))]),
      expect: { mistakes: [], corrections: ["67:1:6"], finalWord: `67:1:${len("67:1")}` } },
    { name: "jump_forward_skip_ayah", category: "skip", timeline: build(verses, [all("67:1"), all("67:3")]),
      expect: { mistakes: [{ word: "67:2:1", kind: "SKIP" }], corrections: [], finalWord: `67:3:${len("67:3")}` } },
    { name: "restart_ayah_backward", category: "repeat", timeline: build(verses, [all("67:1"), w("67:2", 1, 5), { kind: "silence", ms: 600 }, all("67:2")]),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "fast_x1.3", category: "fast", timeline: tempo(base, 1.3),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "slow_x0.8", category: "slow", timeline: tempo(base, 0.8),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "noise_snr10db", category: "noise", timeline: withNoise(base, 10),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
    { name: "weak_mic_x0.08", category: "weak-mic", timeline: gain(base, 0.08),
      expect: { mistakes: [], corrections: [], finalWord: `67:2:${len("67:2")}` } },
  ];
}

// ─── canonical corpus (same page JSON the web app serves) ────────────────────

function loadPageWords(page: number): CanonicalQuranWord[] {
  const file = resolve(import.meta.dirname, `../../apps/web/public/mushaf/quran-words/pages/${page}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { words: Omit<CanonicalQuranWord, "normalizedText">[] };
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
}

// ─── live run ────────────────────────────────────────────────────────────────

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))]);
};

function editDistance(reference: string[], hypothesis: string[]) {
  let previous = Array.from({ length: hypothesis.length + 1 }, (_, index) => index);
  for (let i = 1; i <= reference.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= hypothesis.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (reference[i - 1] === hypothesis[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[hypothesis.length];
}

const scoreTokens = (text: string) => normalizeQuranText(text)
  .replace(/[،؛؟.,!:'"()[\]{}]/g, "")
  .split(/\s+/)
  .filter(Boolean);

async function run(scenario: Scenario, providerName: "openai" | "tarteel", apiKey?: string) {
  const words = [...loadPageWords(562), ...loadPageWords(563)];
  const matcher = new QuranLiveMatcher(words, { generalPositionFollowing: true, ignoreOptionalBasmala: true });
  const engine = new RecitationStateEngine({ wordAt: (index) => matcher.wordAt(index) });
  const segmenter = new UtteranceSegmenter();
  const truthIndex = scenario.timeline.words.map((word) => ({ ...word, index: matcher.indexOfWord(word.verseKey, word.position) }));
  const firstEnd = new Map<number, number>();
  for (const word of truthIndex) if (!firstEnd.has(word.index)) firstEnd.set(word.index, word.endMs);

  const shownAt = new Map<number, number>();
  const committedAt = new Map<number, number>();
  const matcherMs: number[] = [];
  const partials = new Map<string, string>();
  const finalTexts: string[] = [];
  const commitRequestedAt: number[] = [];
  const providerLatency: number[] = [];
  const providerErrors: string[] = [];
  const providerConnectStartedAt = performance.now();
  let providerReadyMs: number | null = null;
  let startedAt = 0;
  let firstPartialMs: number | null = null;
  let firstPartialReceivedAtMs: number | null = null;
  let firstFinalReceivedAtMs: number | null = null;
  let firstAudioForwardedMs: number | null = null;
  let firstAudioAcceptedMs: number | null = null;
  let firstCommitAcceptedMs: number | null = null;
  let finals = 0;
  let deltas = 0;
  let expectedFinals = 0;
  let audioSinceCommit = 0;
  const elapsed = () => performance.now() - startedAt;

  const provider = await new Promise<SpeechRecognitionProvider>((resolveReady, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("provider connect timeout")),
      providerName === "tarteel" ? 300_000 : 15_000,
    );
    const events: SpeechRecognitionProviderEvents = {
      onReady: () => {
        providerReadyMs = Math.round(performance.now() - providerConnectStartedAt);
        clearTimeout(timeout);
        resolveReady(instance);
      },
      onProviderEvent: () => {},
      onAudioForwarded: () => { firstAudioForwardedMs ??= Math.round(elapsed()); },
      onAudioAccepted: () => { firstAudioAcceptedMs ??= Math.round(elapsed()); },
      onCommitAccepted: () => { firstCommitAcceptedMs ??= Math.round(elapsed()); },
      onError: (message) => { providerErrors.push(message); console.error(`  provider error: ${message}`); },
      onClose: () => {},
      onTranscript: (event) => {
        if (!startedAt) return;
        const itemId = event.itemId ?? "item";
        const now = elapsed();
        let text = event.text;
        if (!event.isFinal) {
          deltas += 1;
          firstPartialMs ??= now;
          firstPartialReceivedAtMs ??= Math.round(now);
          text = event.textIsDelta === false ? event.text : `${partials.get(itemId) ?? ""}${event.text}`;
          partials.set(itemId, text);
        } else {
          finals += 1;
          firstFinalReceivedAtMs ??= Math.round(now);
          partials.delete(itemId);
          finalTexts.push(event.text);
          const requestedAt = commitRequestedAt.shift();
          if (requestedAt !== undefined) providerLatency.push(now - requestedAt);
        }
        const match = matcher.feed({ text, isFinal: event.isFinal, itemId, receivedAt: now });
        matcherMs.push(match.matcherMs);
        engine.apply(match);
        for (let index = 0; index < match.committedIndex; index += 1) {
          if (!committedAt.has(index)) committedAt.set(index, now);
          if (!shownAt.has(index)) shownAt.set(index, now);
        }
        if (match.provisionalIndex >= 0) {
          for (let index = match.committedIndex; index <= match.provisionalIndex; index += 1) if (!shownAt.has(index)) shownAt.set(index, now);
        }
      },
    };
    const instance: SpeechRecognitionProvider = providerName === "tarteel"
      ? new TarteelWhisperProvider(events)
      : new OpenAiRealtimeProvider(apiKey!, events);
    instance.connect();
  });

  const commitBufferedAudio = () => {
    if (audioSinceCommit === 0) return;
    audioSinceCommit = 0;
    expectedFinals += 1;
    commitRequestedAt.push(elapsed());
    provider.commit();
  };

  // Real-time pacing: one 100ms frame per 100ms of wall clock, drift-corrected.
  const pcm = scenario.timeline.pcm;
  startedAt = performance.now();
  for (let frame = 0, offset = 0; offset < pcm.length; frame += 1, offset += FRAME_SAMPLES) {
    const chunk = pcm.slice(offset, offset + FRAME_SAMPLES);
    let sum = 0;
    for (const sample of chunk) sum += (sample / 32768) ** 2;
    const rms = Math.sqrt(sum / Math.max(1, chunk.length));
    provider.appendAudio(Buffer.from(chunk.buffer).toString("base64"));
    audioSinceCommit += chunk.length;
    if (segmenter.observe(rms, frame * 100)) commitBufferedAudio();
    const due = startedAt + (frame + 1) * 100;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  commitBufferedAudio();
  const finalDeadline = Date.now() + (providerName === "tarteel" ? 120_000 : 8_000);
  while (finals + providerErrors.length < expectedFinals && Date.now() < finalDeadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 1_500));
  provider.close();
  engine.finalize();

  // ─── scoring ───────────────────────────────────────────────────────────────
  const commitLatency: number[] = [];
  const shownLatency: number[] = [];
  let spokenCovered = 0;
  const spoken = [...firstEnd.keys()];
  for (const index of spoken) {
    const end = firstEnd.get(index)!;
    if (committedAt.has(index)) { commitLatency.push(committedAt.get(index)! - end); spokenCovered += 1; }
    if (shownAt.has(index)) shownLatency.push(shownAt.get(index)! - end);
  }
  const key = (index: number) => { const word = matcher.wordAt(index); return word ? `${word.verseKey}:${word.position}` : "?"; };
  const confirmed = engine.eventLog()
    .filter((event) => event.status === "confirmed" && event.kind !== "CORRECTION")
    .map((event) => ({ word: key(event.index), kind: event.kind }));
  const corrected = engine.eventLog().filter((event) => event.kind === "CORRECTION").map((event) => key(event.index));
  const truePositives = confirmed.filter((c) => scenario.expect.mistakes.some((m) => m.word === c.word));
  const finalWordIndex = matcher.committedIndex() - 1;
  const expectedFinal = scenario.timeline.words.at(-1)!;
  const expectedFinalIndex = matcher.indexOfWord(expectedFinal.verseKey, expectedFinal.position);
  const referenceTokens = scenario.timeline.spokenWordKeys.map((key) => {
    const separator = key.lastIndexOf(":");
    const index = matcher.indexOfWord(key.slice(0, separator), Number(key.slice(separator + 1)));
    return matcher.wordAt(index)?.normalizedText ?? "";
  }).filter(Boolean);
  const referenceText = referenceTokens.join(" ");
  const hypothesisText = finalTexts.join(" ");
  const hypothesisTokens = scoreTokens(hypothesisText);
  const wordErrors = editDistance(referenceTokens, hypothesisTokens);
  return {
    name: scenario.name,
    category: scenario.category,
    provider: providerName,
    audioSeconds: Math.round(pcm.length / RATE),
    providerReadyMs,
    firstAudioForwardedMs,
    firstAudioAcceptedMs,
    firstCommitAcceptedMs,
    deltas,
    finals,
    firstPartialReceivedAtMs,
    firstFinalReceivedAtMs,
    expectedFinals,
    unresolvedFinals: Math.max(0, expectedFinals - finals - providerErrors.length),
    providerErrors,
    providerLatencyP50: percentile(providerLatency, 0.5),
    providerLatencyP95: percentile(providerLatency, 0.95),
    providerLatencyMax: providerLatency.length ? Math.round(Math.max(...providerLatency)) : null,
    firstPartialMs: firstPartialMs === null ? null : Math.round(firstPartialMs - (scenario.timeline.words[0]?.endMs ?? 0)),
    referenceTokenCount: referenceTokens.length,
    hypothesisTokenCount: hypothesisTokens.length,
    wordErrors,
    wordErrorRate: referenceTokens.length ? Number((wordErrors / referenceTokens.length).toFixed(3)) : null,
    referenceText,
    hypothesisText,
    spokenWords: spoken.length,
    wordsCommitted: spokenCovered,
    wordShownLatencyP50: percentile(shownLatency, 0.5),
    wordShownLatencyP95: percentile(shownLatency, 0.95),
    wordCommitLatencyP50: percentile(commitLatency, 0.5),
    wordCommitLatencyP95: percentile(commitLatency, 0.95),
    wordCommitLatencyMax: commitLatency.length ? Math.round(Math.max(...commitLatency)) : null,
    matcherP95Ms: Number((percentile(matcherMs.map((ms) => ms * 1000), 0.95)! / 1000).toFixed(3)),
    finalLocation: key(finalWordIndex),
    finalLocationCorrect: finalWordIndex === expectedFinalIndex,
    expectedMistakes: scenario.expect.mistakes,
    confirmedMistakes: confirmed,
    mistakeTruePositives: truePositives.length,
    mistakeFalsePositives: confirmed.length - truePositives.length,
    expectedCorrections: scenario.expect.corrections,
    corrections: corrected,
    summary: engine.summary(),
  };
}

async function main() {
  const wanted = process.argv.slice(2);
  if (wanted.includes("--help") || wanted.includes("-h")) {
    console.log("Usage: BENCH_PROVIDER=openai|tarteel npx tsx tools/benchmarks/recitation-audio-benchmark.ts [scenario...]");
    console.log("Scenarios: clear_67_1-3 pause_2500ms repeated_word omitted_word wrong_word_uncorrected self_correction jump_forward_skip_ayah restart_ayah_backward fast_x1.3 slow_x0.8 noise_snr10db weak_mic_x0.08");
    return;
  }
  const providerName = process.env.BENCH_PROVIDER ?? "openai";
  if (providerName !== "openai" && providerName !== "tarteel") {
    throw new Error("BENCH_PROVIDER must be openai or tarteel");
  }
  const apiKey = providerName === "openai" ? process.env.OPENAI_API_KEY : undefined;
  if (providerName === "openai" && !apiKey) throw new Error("OPENAI_API_KEY is required for the OpenAI benchmark");
  const verses = await loadChapterAudio(67);
  const list = scenarios(verses).filter((scenario) => !wanted.length || wanted.includes(scenario.name));
  if (!list.length) throw new Error(`No benchmark scenarios matched: ${wanted.join(", ")}`);
  const results = [];
  for (const scenario of list) {
    console.log(`▶ ${scenario.name} (${Math.round(scenario.timeline.pcm.length / RATE)}s)`);
    try {
      const result = await run(scenario, providerName, apiKey);
      results.push(result);
      console.log(`  WER=${result.wordErrorRate} provider p50/p95=${result.providerLatencyP50}/${result.providerLatencyP95}ms shown p50/p95=${result.wordShownLatencyP50}/${result.wordShownLatencyP95}ms committed=${result.wordsCommitted}/${result.spokenWords} final=${result.finalLocation} ok=${result.finalLocationCorrect} mistakes=${JSON.stringify(result.confirmedMistakes)} corrections=${JSON.stringify(result.corrections)}`);
    } catch (error) {
      console.log(`  FAILED: ${(error as Error).message}`);
      results.push({ name: scenario.name, error: (error as Error).message });
    }
  }
  if (providerName === "tarteel") stopTarteelWhisperWorker();
  const model = providerName === "openai"
    ? "gpt-live-transcribe"
    : "tarteel-ai/whisper-base-ar-quran (CTranslate2 int8)";
  const out = process.env.BENCH_OUT ?? join(CACHE, `results-${providerName}.json`);
  writeFileSync(out, JSON.stringify({ provider: providerName, model, reciter: "Alafasy (quran.com recitation 7)", runAt: new Date().toISOString(), results }, null, 2));
  console.log(`results → ${out}`);
}

void main().catch((error) => { console.error(error); process.exit(1); });
