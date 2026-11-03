import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import type { InferenceSession } from "onnxruntime-node";
import { CtcDecoder, type CtcWord } from "./ctcDecoder";

/** FastConformer subsamples 10 ms features by 8: one output frame per 80 ms. */
export const FRAME_SECONDS = 0.08;
export const MODEL_FILE = "fastconformer_full_mixed.onnx";
export const VOCAB_FILE = "vocab.json";

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
  ) {}

  static async load(modelDir: string, options: { threadsPerInference?: number } = {}): Promise<TilawiModel> {
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
    return new TilawiModel(session, new CtcDecoder(vocab), maxConcurrent);
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
      return this.decoder.decode(logprobs.data as Float32Array, timeSteps, vocabSize);
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
 * Two threads per decode halve the time the reciter waits for the pointer (about
 * 370 ms to 230 ms per decode) for a quarter more CPU. TABYAN_TILAWI_THREADS overrides.
 */
function threadsPerInference() {
  const configured = Number(process.env.TABYAN_TILAWI_THREADS);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return availableParallelism() >= 4 ? 2 : 1;
}

let shared: Promise<TilawiModel> | null = null;

/** Lazily loads the model once per process from TABYAN_TILAWI_MODEL_DIR. */
export function sharedTilawiModel(): Promise<TilawiModel> {
  if (!shared) {
    const modelDir = process.env.TABYAN_TILAWI_MODEL_DIR?.trim();
    shared = modelDir
      ? TilawiModel.load(modelDir, { threadsPerInference: threadsPerInference() })
      : Promise.reject(new Error("TABYAN_TILAWI_MODEL_DIR is not configured"));
    // A failed load is retried by the next session instead of being cached.
    shared.catch(() => { shared = null; });
  }
  return shared;
}
