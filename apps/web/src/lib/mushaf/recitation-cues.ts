import { readAccountStorage, writeAccountStorage } from "@/lib/account-storage";

/**
 * أصوات تفاعل تبيان AI — إشارات UI قصيرة مستقلة عن صوت القرآن والتسجيل.
 *
 * تستخدم نغمات Web Audio مولّدة محلياً حتى لا يوجد fetch أو ملف صوتي جديد
 * لكل نقرة، وتبقى دورة الميكروفون/المزوّد خارج هذه الطبقة تماماً.
 */

export const RECITATION_CUES = ["start", "pause", "resume", "end", "mistake", "correction", "ayah"] as const;
export type RecitationCue = typeof RECITATION_CUES[number];

export const RECITATION_CUES_STORAGE_KEY = "tabyan.mushaf.recitationInteractionSounds";

interface CueTone {
  frequency: number;
  offset: number;
  duration: number;
  gain: number;
}

const CUE_TONES: Record<RecitationCue, CueTone[]> = {
  mistake: [{ frequency: 293.66, offset: 0, duration: 0.12, gain: 0.025 }],
  correction: [
    { frequency: 554.37, offset: 0, duration: 0.09, gain: 0.028 },
    { frequency: 739.99, offset: 0.09, duration: 0.13, gain: 0.025 },
  ],
  ayah: [{ frequency: 659.25, offset: 0, duration: 0.1, gain: 0.018 }],
  start: [
    { frequency: 523.25, offset: 0, duration: 0.08, gain: 0.045 },
    { frequency: 659.25, offset: 0.07, duration: 0.1, gain: 0.04 },
  ],
  pause: [
    { frequency: 392, offset: 0, duration: 0.09, gain: 0.035 },
  ],
  resume: [
    { frequency: 440, offset: 0, duration: 0.08, gain: 0.035 },
    { frequency: 554.37, offset: 0.07, duration: 0.1, gain: 0.04 },
  ],
  end: [
    { frequency: 523.25, offset: 0, duration: 0.1, gain: 0.035 },
    { frequency: 392, offset: 0.09, duration: 0.13, gain: 0.03 },
  ],
};

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const audioWindow = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

export function getRecitationCuesEnabled(accountId: string | null): boolean {
  return readAccountStorage(accountId, RECITATION_CUES_STORAGE_KEY) !== "false";
}

export function setRecitationCuesEnabled(enabled: boolean, accountId: string | null): void {
  if (!accountId || typeof window === "undefined") return;
  try {
    writeAccountStorage(accountId, RECITATION_CUES_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event("tabyan:recitation-cues-changed"));
  } catch {
    // إعداد اختياري؛ عدم توفر localStorage لا يعطل التسميع.
  }
}

export class RecitationCuePlayer {
  private context: AudioContext | null = null;
  private disposed = false;

  constructor(private readonly accountId: string | null) {}

  /**
   * يستدعى من user gesture قبل انتظار start mutation، حتى لا يصطدم cue البدء
   * بقيود autoplay بعد عودة الطلب الشبكي.
   */
  prepare(): void {
    if (this.disposed || this.context || !getRecitationCuesEnabled(this.accountId)) return;
    const Context = getAudioContextConstructor();
    if (!Context) return;
    try {
      this.context = new Context();
      void this.context.resume().catch(() => {
        if (import.meta.env.DEV) console.debug("[TABYAN_UI_CUE] AudioContext resume deferred");
      });
    } catch {
      this.context = null;
    }
  }

  async playCue(cue: RecitationCue): Promise<boolean> {
    if (this.disposed || !getRecitationCuesEnabled(this.accountId)) return false;
    // Only prepare() inside a user gesture may create the context.
    // Transcript/READY events must not attempt to unlock browser autoplay.
    const context = this.context;
    if (!context) return false;

    try {
      // Some browsers leave resume() pending under autoplay restrictions.
      // Never hold the microphone lifecycle or final result for optional sound.
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const resumed = await Promise.race([
        context.resume().then(() => true, () => false),
        new Promise<boolean>((resolve) => { timeout = setTimeout(() => resolve(false), 200); }),
      ]);
      clearTimeout(timeout);
      if (!resumed) return false;
      if (context.state !== "running" || this.disposed || !getRecitationCuesEnabled(this.accountId)) return false;
      const startAt = context.currentTime + 0.005;
      for (const tone of CUE_TONES[cue]) {
        this.scheduleTone(context, tone, startAt + tone.offset);
      }
      return true;
    } catch {
      if (import.meta.env.DEV) console.debug("[TABYAN_UI_CUE] cue playback unavailable", cue);
      return false;
    }
  }

  dispose(): void {
    this.disposed = true;
    const context = this.context;
    this.context = null;
    if (context) void context.close().catch(() => {});
  }

  private scheduleTone(context: AudioContext, tone: CueTone, startAt: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const endAt = startAt + tone.duration;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }
}