/**
 * Ayah-by-ayah Quran audio for the Mushaf reader, from EveryAyah (no API key),
 * with the same reciters as the web reader. Playback continues to the next
 * ayah and stops at the end of the surah.
 */
import { AudioContext, type AudioBuffer, type AudioBufferSourceNode } from "react-native-audio-api";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";

export const RECITERS = [
  { id: "Alafasy_128kbps", name: "مشاري راشد العفاسي" },
  { id: "Husary_128kbps", name: "محمود خليل الحصري" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "عبد الباسط عبد الصمد" },
  { id: "Minshawy_Murattal_128kbps", name: "محمد صديق المنشاوي" },
  { id: "Ghamadi_40kbps", name: "سعد الغامدي" },
] as const;
export type ReciterId = (typeof RECITERS)[number]["id"];
export const DEFAULT_RECITER: ReciterId = "Alafasy_128kbps";

export interface AyahRef {
  surah: number;
  ayah: number;
}

function ayahUrl(reciter: ReciterId, { surah, ayah }: AyahRef) {
  return `https://everyayah.com/data/${reciter}/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
}

function nextAyah({ surah, ayah }: AyahRef): AyahRef | null {
  return ayah < (SURAHS[surah - 1]?.ayahs ?? 0) ? { surah, ayah: ayah + 1 } : null;
}

export interface AyahAudioEvents {
  /** The ayah now playing, or null once playback has stopped. */
  onAyah: (ayah: AyahRef | null) => void;
  onError: () => void;
}

export class AyahAudioPlayer {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  /** Bumped on every play/stop so late downloads and end events of old ayahs are ignored. */
  private generation = 0;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();

  constructor(private readonly events: AyahAudioEvents, private reciter: ReciterId = DEFAULT_RECITER) {}

  setReciter(reciter: ReciterId) {
    this.reciter = reciter;
    this.buffers.clear();
  }

  play(from: AyahRef) {
    this.stopSource();
    const generation = ++this.generation;
    void this.playAyah(from, generation);
  }

  stop() {
    this.generation += 1;
    this.stopSource();
    this.events.onAyah(null);
  }

  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.buffers.clear();
    try { if (context) void context.close().catch(() => undefined); } catch { /* Already closed. */ }
  }

  private load(ayah: AyahRef) {
    const context = this.context ??= new AudioContext();
    const url = ayahUrl(this.reciter, ayah);
    let buffer = this.buffers.get(url);
    if (!buffer) {
      buffer = context.decodeAudioData(url);
      buffer.catch(() => this.buffers.delete(url));
      this.buffers.set(url, buffer);
      // Only the current and next ayah are kept.
      while (this.buffers.size > 3) this.buffers.delete(this.buffers.keys().next().value!);
    }
    return buffer;
  }

  private async playAyah(ayah: AyahRef, generation: number) {
    try {
      this.events.onAyah(ayah);
      const buffer = await this.load(ayah);
      const context = this.context;
      if (generation !== this.generation || !context) return;
      if (context.state === "suspended") await context.resume();
      const following = nextAyah(ayah);
      // Download the next ayah while this one plays, so playback runs on without a gap.
      if (following) void this.load(following).catch(() => undefined);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onEnded = () => {
        if (generation !== this.generation || this.source !== source) return;
        this.source = null;
        if (following) void this.playAyah(following, generation);
        else this.stop();
      };
      this.source = source;
      source.start();
    } catch {
      if (generation !== this.generation) return;
      this.stop();
      this.events.onError();
    }
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
