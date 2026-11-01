/**
 * Plays a student's saved recitation for the teacher. The server mints a
 * short-lived playback URL for the private object; the session token never
 * goes into the media URL.
 */
import { AudioContext, type AudioBuffer, type AudioBufferSourceNode } from "react-native-audio-api";
import { apiOrigin } from "../trpc";

export type RecordingFailure = "missing" | "forbidden" | "network";

export class RecordingPlaybackError extends Error {
  constructor(readonly failure: RecordingFailure) {
    super(failure);
  }
}

async function playbackUrl(objectPath: string, token: string): Promise<string> {
  const response = await fetch(`${apiOrigin()}/api/storage/media-playback-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ objectPath }),
  });
  if (response.status === 404) throw new RecordingPlaybackError("missing");
  if (response.status === 401 || response.status === 403) throw new RecordingPlaybackError("forbidden");
  if (!response.ok) throw new RecordingPlaybackError("network");
  const { url } = await response.json() as { url?: unknown };
  if (typeof url !== "string" || !url.startsWith("/api/storage/media-playback/")) throw new RecordingPlaybackError("network");
  return `${apiOrigin()}${url}`;
}

export interface RecordingPlayerEvents {
  onState: (state: { playing: boolean; position: number; duration: number }) => void;
}

export class RecordingPlayer {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private offset = 0;
  private startedAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly objectPath: string, private readonly events: RecordingPlayerEvents) {}

  get duration() {
    return this.buffer?.duration ?? 0;
  }

  /** Downloads the recording on first use; throws RecordingPlaybackError. */
  async play(token: string) {
    const context = this.context ??= new AudioContext();
    if (!this.buffer) {
      const url = await playbackUrl(this.objectPath, token);
      try {
        this.buffer = await context.decodeAudioData(url);
      } catch {
        throw new RecordingPlaybackError("network");
      }
    }
    if (this.context !== context) return;
    if (context.state === "suspended") await context.resume();
    if (this.offset >= this.duration) this.offset = 0;
    this.stopSource();
    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(context.destination);
    source.onEnded = () => {
      if (this.source !== source) return;
      this.source = null;
      this.offset = 0;
      this.stopTicker();
      this.emit();
    };
    this.source = source;
    this.startedAt = context.currentTime - this.offset;
    source.start(0, this.offset);
    this.stopTicker();
    this.ticker = setInterval(() => this.emit(), 250);
    this.emit();
  }

  pause() {
    if (!this.source || !this.context) return;
    this.offset = Math.min(this.duration, this.context.currentTime - this.startedAt);
    this.stopSource();
    this.stopTicker();
    this.emit();
  }

  dispose() {
    this.stopSource();
    this.stopTicker();
    const context = this.context;
    this.context = null;
    this.buffer = null;
    try { if (context) void context.close().catch(() => undefined); } catch { /* Already closed. */ }
  }

  private position() {
    if (this.source && this.context) return Math.min(this.duration, this.context.currentTime - this.startedAt);
    return this.offset;
  }

  private emit() {
    this.events.onState({ playing: this.source !== null, position: this.position(), duration: this.duration });
  }

  private stopTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private stopSource() {
    const source = this.source;
    this.source = null;
    if (!source) return;
    try {
      source.onEnded = null;
      source.stop();
      source.disconnect();
    } catch { /* Already stopped. */ }
  }
}
