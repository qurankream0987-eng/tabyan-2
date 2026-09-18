/**
 * أصوات تفاعل تبيان AI — إشارات UI قصيرة مستقلة عن صوت القرآن والتسجيل.
 *
 * تستخدم نغمات Web Audio مولّدة محلياً حتى لا يوجد fetch أو ملف صوتي جديد
 * لكل نقرة، وتبقى دورة الميكروفون/المزوّد خارج هذه الطبقة تماماً.
 */

export const RECITATION_CUES = ["start", "pause", "resume", "end"] as const;
export type RecitationCue = typeof RECITATION_CUES[number];

export const RECITATION_CUES_STORAGE_KEY = "tabyan.mushaf.recitationInteractionSounds";

interface CueTone {
  frequency: number;
  offset: number;
  duration: number;
  gain: number;
}

const CUE_TONES: Record<RecitationCue, CueTone[]> = {
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

export function getRecitationCuesEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(RECITATION_CUES_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setRecitationCuesEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECITATION_CUES_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event("tabyan:recitation-cues-changed"));
  } catch {
    // إعداد اختياري؛ عدم توفر localStorage لا يعطل التسميع.
  }
}

export class RecitationCuePlayer {
  private context: AudioContext | null = null;
  private disposed = false;

  /**
   * يستدعى من user gesture قبل انتظار start mutation، حتى لا يصطدم cue البدء
   * بقيود autoplay بعد عودة الطلب الشبكي.
   */
  prepare(): void {
    if (this.disposed || this.context || !getRecitationCuesEnabled()) return;
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
    if (this.disposed || !getRecitationCuesEnabled()) return false;
    this.prepare();
    const context = this.context;
    if (!context) return false;

    try {
      await context.resume();
      if (context.state !== "running" || this.disposed || !getRecitationCuesEnabled()) return false;
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