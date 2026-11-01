import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { recitationAudioObjectPath } from "@workspace/tabyan-trpc/recitation-contract";
import { logger } from "../lib/logger";
import { objectStorageService } from "../storage/objectStorageRuntime";

const RECORDING_DIR = path.join(os.tmpdir(), "tabyan-recitation-audio");
const MAX_RECORDING_SECONDS = 20 * 60;
// A reconnect within this window continues the same recording file.
const KEEP_LOCAL_COPY_MS = 30 * 60_000;
const localCopyCleanups = new Map<string, NodeJS.Timeout>();

/** 16-bit mono PCM wrapped in a WAV header. */
export function pcm16ToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Keeps the student's audio of one educational session so the teacher can
 * listen to it. Chunks go to a local file (reconnects append to it); each
 * time a socket closes, the whole recording is uploaded as one WAV object.
 */
export class RecitationAudioRecorder {
  private readonly file: string;
  private readonly maxBytes: number;
  private bytes = 0;
  private pending: Promise<void>;
  private finished = false;

  constructor(private readonly sessionId: string, private readonly sampleRate: number) {
    this.file = path.join(RECORDING_DIR, `${sessionId}.pcm`);
    this.maxBytes = MAX_RECORDING_SECONDS * sampleRate * 2;
    clearTimeout(localCopyCleanups.get(sessionId));
    localCopyCleanups.delete(sessionId);
    this.pending = fs.mkdir(RECORDING_DIR, { recursive: true })
      .then(() => fs.stat(this.file))
      .then((stat) => { this.bytes += stat.size; }, () => undefined);
  }

  append(base64Audio: string): void {
    if (this.finished || this.bytes >= this.maxBytes) return;
    const chunk = Buffer.from(base64Audio, "base64");
    this.bytes += chunk.length;
    this.pending = this.pending
      .then(() => fs.appendFile(this.file, chunk))
      .catch((error: unknown) => {
        logger.warn({ err: error, sessionId: this.sessionId }, "recitation audio chunk was not saved");
      });
  }

  async finish(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    await this.pending;
    try {
      const pcm = await fs.readFile(this.file).catch(() => null);
      if (!pcm?.length) return;
      await objectStorageService.putObjectEntity(
        recitationAudioObjectPath(this.sessionId),
        pcm16ToWav(pcm, this.sampleRate),
        "audio/wav",
      );
      logger.info({ sessionId: this.sessionId, seconds: Math.round(pcm.length / (this.sampleRate * 2)) }, "recitation audio saved");
    } catch (error) {
      logger.error({ err: error, sessionId: this.sessionId }, "recitation audio upload failed");
    } finally {
      const file = this.file;
      localCopyCleanups.set(this.sessionId, setTimeout(() => {
        localCopyCleanups.delete(this.sessionId);
        void fs.unlink(file).catch(() => undefined);
      }, KEEP_LOCAL_COPY_MS).unref());
    }
  }
}
