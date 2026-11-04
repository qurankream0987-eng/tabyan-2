import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import type { InferenceSession } from "onnxruntime-node";
import { CtcDecoder, Lexicon, type CtcWord } from "./ctcDecoder";
import { QURAN_LEXICON } from "./quranLexicon";

/** FastConformer subsamples 10 ms features by 8: one output frame per 80 ms. */
export const FRAME_SECONDS = 0.08;
export const MODEL_FILE = "fastconformer_full_mixed.onnx";
export const VOCAB_FILE = "vocab.json";

export interface TilawiModelOptions {
  threadsPerInference?: number;
  /** Greedy CTC instead of the lexicon-constrained beam (TABYAN_TILAWI_DECODER=greedy). */
  decoder?: "lexicon" | "greedy";
  /** See ConstrainedDecodeOptions.freeWordPenalty (TABYAN_TILAWI_FREE_WORD_PENALTY). */
  freeWordPenalty?: number;
}

export interface Transcriber {
  /** 16 kHz mono float PCM -> words with frame positions inside that clip. */
  transcribe(audio: Float32Array): Promise<CtcWord[]>;
}

/**
 * The Tilawi FastConformer CTC model (Quran-tuned NVIDIA FastConformer,
 * CC-BY-4.0), run in-process with onnxruntime. One session is shared by all
 * recitations; `maxConcurrent` caps simultaneous inferences so a busy server
 * slows down instead of oversubscribing its CPUs.
 */
export class TilawiModel implements Transcriber {
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  private constructor(
    private readonly session: InferenceSession,
    private readonly decoder: CtcDecoder,
    private readonly maxConcurrent: number,
    private readonly lexicon: Lexicon | null,
    private readonly freeWordPenalty: number | undefined,
  ) {}

  static async load(modelDir: string, options: TilawiModelOptions = {}): Promise<TilawiModel> {
    const ort = await import("onnxruntime-node");
    const threads = options.threadsPerInference ?? 1;
    const [session, vocab] = await Promise.all([
      ort.InferenceSession.create(path.join(modelDir, MODEL_FILE), {
        graphOptimizationLevel: "all",
        intraOpNumThreads: threads,
        interOpNumThreads: 1,
      }),
      readFile(path.join(modelDir, VOCAB_FILE), "utf8").then((text) => JSON.parse(text) as Record<string, string>),
    ]);
    const maxConcurrent = Math.max(1, Math.floor(availableParallelism() / threads));
    const lexicon = options.decoder === "greedy" ? null : sharedLexicon();
    return new TilawiModel(session, new CtcDecoder(vocab), maxConcurrent, lexicon, options.freeWordPenalty);
  }

  async transcribe(audio: Float32Array): Promise<CtcWord[]> {
    await this.acquire();
    try {
      const ort = await import("onnxruntime-node");
      const [audioInput, lengthInput] = this.session.inputNames;
      const outputs = await this.session.run({
        [audioInput]: new ort.Tensor("float32", audio, [1, audio.length]),
        [lengthInput]: new ort.Tensor("int64", BigInt64Array.from([BigInt(audio.length)]), [1]),
      });
      const logprobs = outputs[this.session.outputNames[0]];
      const [, timeSteps, vocabSize] = logprobs.dims.map(Number);
      const data = logprobs.data as Float32Array;
      return this.lexicon
        ? this.decoder.decodeConstrained(data, timeSteps, vocabSize, { lexicon: this.lexicon, freeWordPenalty: this.freeWordPenalty })
        : this.decoder.decode(data, timeSteps, vocabSize);
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private release() {
    const next = this.waiting.shift();
    if (next) next();
    else this.running -= 1;
  }
}

/**
 * More threads per decode cut the time the reciter waits for the pointer (one thread
 * about 370 ms, two 230 ms, four 160 ms per decode) at the cost of fewer concurrent
 * recitations per core. TABYAN_TILAWI_THREADS overrides.
 */
function threadsPerInference() {
  const configured = Number(process.env.TABYAN_TILAWI_THREADS);
  if (Number.isInteger(configured) && configured > 0) return configured;
  const cores = availableParallelism();
  return cores >= 8 ? 4 : cores >= 4 ? 2 : 1;
}

let lexicon: Lexicon | null = null;

/** The Quran word trie, built once per process. */
export function sharedLexicon(): Lexicon {
  if (!lexicon) lexicon = new Lexicon(QURAN_LEXICON.split(" "));
  return lexicon;
}

/** Decoder settings from the environment, for tuning without a rebuild. */
export function decoderOptionsFromEnv(): Pick<TilawiModelOptions, "decoder" | "freeWordPenalty"> {
  const penalty = Number(process.env.TABYAN_TILAWI_FREE_WORD_PENALTY);
  return {
    decoder: process.env.TABYAN_TILAWI_DECODER === "greedy" ? "greedy" : "lexicon",
    freeWordPenalty: Number.isFinite(penalty) && penalty > 0 ? penalty : undefined,
  };
}

let shared: Promise<TilawiModel> | null = null;

/** Lazily loads the model once per process from TABYAN_TILAWI_MODEL_DIR. */
export function sharedTilawiModel(): Promise<TilawiModel> {
  if (!shared) {
    const modelDir = process.env.TABYAN_TILAWI_MODEL_DIR?.trim();
    shared = modelDir
      ? TilawiModel.load(modelDir, { threadsPerInference: threadsPerInference(), ...decoderOptionsFromEnv() })
      : Promise.reject(new Error("TABYAN_TILAWI_MODEL_DIR is not configured"));
    // A failed load is retried by the next session instead of being cached.
    shared.catch(() => { shared = null; });
  }
  return shared;
}
