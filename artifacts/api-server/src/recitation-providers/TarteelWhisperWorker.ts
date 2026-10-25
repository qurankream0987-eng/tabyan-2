import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { logger } from "../lib/logger";
import { classifyProviderError } from "./provider-error-classification";

export interface TarteelTranscriptionResult {
  text: string;
  inferenceMs: number;
  audioMs: number;
  processCpuMs?: number;
  peakRssKb?: number;
  words?: { word: string; start: number; end: number }[];
}

export interface TarteelTranscriber {
  start(): Promise<void>;
  transcribe(pcm: Buffer, sampleRateHz: number): Promise<TarteelTranscriptionResult>;
}

type WorkerMessage =
  | {
      type: "ready";
      model: string;
      revision: string;
      loadMs: number;
      modelSizeBytes?: number;
      cpuThreads?: number;
      peakRssKb?: number;
    }
  | {
      type: "result";
      id: string;
      text?: string;
      inferenceMs?: number;
      audioMs?: number;
      processCpuMs?: number;
      peakRssKb?: number;
      error?: string;
      words?: { word: string; start: number; end: number }[];
    }
  | { type: "fatal"; message: string };

type PendingRequest = {
  resolve: (result: TarteelTranscriptionResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const MAX_AUDIO_BYTES = 24_000 * 2 * 30;
const MAX_PENDING_REQUESTS = 3;
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * One development-only Python process owns the local CTranslate2 model.
 * Keeping it shared avoids loading a separate model copy for each WebSocket.
 */
class PythonTarteelTranscriber implements TarteelTranscriber {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready = false;
  private startPromise: Promise<void> | null = null;
  private resolveStart: (() => void) | null = null;
  private rejectStart: ((error: Error) => void) | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor() {
    process.once("exit", () => this.child?.kill("SIGTERM"));
  }

  start(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.startPromise) return this.startPromise;

    const scriptPath = [
      resolve(process.cwd(), "src/recitation-providers/tarteel_whisper_worker.py"),
      resolve(process.cwd(), "../api-server/src/recitation-providers/tarteel_whisper_worker.py"),
      resolve(process.cwd(), "artifacts/api-server/src/recitation-providers/tarteel_whisper_worker.py"),
    ].find((candidate) => existsSync(candidate));
    if (!scriptPath) return Promise.reject(new Error("Tarteel worker script was not found from the current workspace path"));
    const pythonExecutable = process.env.TABYAN_TARTEEL_PYTHON ?? [
      resolve(process.cwd(), ".pythonlibs/bin/python"),
      resolve(process.cwd(), "../../.pythonlibs/bin/python"),
      resolve(process.cwd(), "../.pythonlibs/bin/python"),
    ].find((candidate) => existsSync(candidate)) ?? "python3";

    this.startPromise = new Promise<void>((resolveStart, rejectStart) => {
      this.resolveStart = resolveStart;
      this.rejectStart = rejectStart;
      const workerEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH || "/usr/bin:/bin",
        HOME: process.env.HOME || homedir(),
        // HF Hub treats empty cache variables as the current directory; keep weights out of artifacts.
        HF_HOME: process.env.HF_HOME || join(tmpdir(), "tabyan-huggingface"),
        HF_HUB_DISABLE_TELEMETRY: "1",
        HF_HUB_DISABLE_PROGRESS_BARS: "1",
        HF_HUB_OFFLINE: "1",
        PYTHONUNBUFFERED: "1",
      };
      if (process.env.HF_HUB_CACHE) workerEnv.HF_HUB_CACHE = process.env.HF_HUB_CACHE;
      if (process.env.TABYAN_TARTEEL_MODEL_PATH) workerEnv.TABYAN_TARTEEL_MODEL_PATH = process.env.TABYAN_TARTEEL_MODEL_PATH;
      const child = spawn(pythonExecutable, ["-u", scriptPath], {
        cwd: process.cwd(),
        env: workerEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;

      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => this.handleLine(line));
      child.stderr.on("data", (chunk: Buffer) => {
        const message = chunk.toString().trim();
        if (message) {
          logger.warn(
            { errorCategory: classifyProviderError(message) },
            "Tarteel Whisper worker emitted stderr",
          );
        }
      });
      child.once("error", (error) => this.fail(error));
      child.once("exit", (code, signal) => {
        this.fail(new Error(`Tarteel worker exited (code=${code ?? "none"}, signal=${signal ?? "none"})`), false);
      });
    });
    return this.startPromise;
  }

  async transcribe(pcm: Buffer, sampleRateHz: number): Promise<TarteelTranscriptionResult> {
    if (sampleRateHz !== 24_000) throw new Error("Tarteel trial accepts 24 kHz PCM only");
    if (pcm.length === 0 || pcm.length % 2 !== 0 || pcm.length > MAX_AUDIO_BYTES) {
      throw new Error("Tarteel utterance has an invalid PCM size");
    }
    await this.start();
    if (!this.ready || !this.child || this.child.stdin.destroyed) {
      throw new Error("Tarteel worker is not ready");
    }
    if (this.pending.size >= MAX_PENDING_REQUESTS) {
      throw new Error("Tarteel transcription queue is full");
    }

    const id = randomUUID();
    return new Promise<TarteelTranscriptionResult>((resolveResult, rejectResult) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectResult(new Error("Tarteel transcription timed out"));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult, timeout });

      const line = JSON.stringify({
        type: "transcribe",
        id,
        sampleRateHz,
        audioBase64: pcm.toString("base64"),
      });
      this.child!.stdin.write(`${line}\n`, (error) => {
        if (!error) return;
        const pending = this.pending.get(id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pending.delete(id);
        pending.reject(error);
      });
    });
  }

  stop() {
    const child = this.child;
    if (!child) return;
    this.fail(new Error("Tarteel worker stopped"), true);
  }

  private handleLine(line: string) {
    let message: WorkerMessage;
    try {
      message = JSON.parse(line) as WorkerMessage;
    } catch {
      this.fail(new Error("Tarteel worker returned invalid JSON"));
      return;
    }

    if (message.type === "ready") {
      this.ready = true;
      logger.info({
        model: message.model,
        revision: message.revision,
        modelLoadMs: message.loadMs,
        modelSizeBytes: message.modelSizeBytes,
        cpuThreads: message.cpuThreads,
        workerPeakRssKb: message.peakRssKb,
      }, "Tarteel Whisper trial model ready");
      this.resolveStart?.();
      this.resolveStart = null;
      this.rejectStart = null;
      return;
    }
    if (message.type === "fatal") {
      this.fail(new Error(message.message));
      return;
    }
    if (message.type === "result") {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        logger.info({
          audioMs: message.audioMs,
          inferenceMs: message.inferenceMs,
          processCpuMs: message.processCpuMs,
          workerPeakRssKb: message.peakRssKb,
        }, "Tarteel Whisper local inference complete");
        pending.resolve({
          text: message.text ?? "",
          inferenceMs: message.inferenceMs ?? 0,
          audioMs: message.audioMs ?? 0,
          processCpuMs: message.processCpuMs,
          peakRssKb: message.peakRssKb,
          words: message.words,
        });
      }
    }
  }

  private fail(error: Error, terminate = true) {
    const child = this.child;
    this.child = null;
    this.ready = false;
    this.startPromise = null;
    this.rejectStart?.(error);
    this.resolveStart = null;
    this.rejectStart = null;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
    if (terminate && child && child.exitCode === null) child.kill("SIGTERM");
  }
}

const pythonTarteelTranscriber = new PythonTarteelTranscriber();
export const tarteelTranscriber: TarteelTranscriber = pythonTarteelTranscriber;
export function stopTarteelWhisperWorker() {
  pythonTarteelTranscriber.stop();
}