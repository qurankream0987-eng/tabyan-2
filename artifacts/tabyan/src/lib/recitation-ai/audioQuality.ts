/**
 * بوابة جودة الصوت المحلية (Part 41) — أرقام فقط من إطارات PCM، بلا صوت محفوظ.
 *
 * تكتشف محلياً:
 *   - low_volume: صوت مسموع لكنه ضعيف باستمرار (القارئ بعيد/الميكروفون منخفض)
 *   - clipping:   تشبّع متكرر (الصوت عالٍ جداً/قريب جداً)
 *   - noisy:      أرضية ضجيج مرتفعة لا تنخفض حتى في فترات الوقف
 * لا تكتشف تعدد المتكلمين: لا دليل موثوق من مستوى الطاقة وحده، فلا نتظاهر.
 *
 * التأثير: جودة غير موثوقة تمنع تأكيد الأخطاء في محرك الحالات (audioReliable)،
 * ولا تمنع المتابعة. تخلّف (hysteresis) يمنع وميض التنبيه.
 */
export type AudioQualityIssue = "low_volume" | "clipping" | "noisy";

export interface AudioFrameStats {
  rms: number;
  /** نسبة العينات المشبعة (|x| ≥ 0.99) داخل الإطار */
  clippedRatio: number;
}

export interface AudioQualitySnapshot {
  issue: AudioQualityIssue | null;
  /** false = لا تُؤكَّد أخطاء اعتماداً على هذا الصوت */
  reliable: boolean;
}

export const AUDIO_QUALITY_MESSAGES: Record<AudioQualityIssue, string> = {
  low_volume: "الصوت منخفض — اقترب من الجهاز",
  clipping: "الصوت مرتفع جداً — ابتعد قليلاً عن الميكروفون",
  noisy: "الضوضاء تؤثر في دقة التعرف",
};

const SPEECH_RMS = 0.02;
const AUDIBLE_RMS = 0.006;
const WINDOW = 40;               // ~4 ثوانٍ بإطارات 100ms
const MIN_FRAMES = 15;           // لا حكم قبل ~1.5 ثانية
const RAISE_AFTER = 2;           // تقييمان متتاليان لإظهار التنبيه
const CLEAR_AFTER = 6;           // تقييمات سليمة متتالية لإخفائه

export function frameStats(samples: Int16Array): AudioFrameStats {
  if (!samples.length) return { rms: 0, clippedRatio: 0 };
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i] / 32768;
    sum += x * x;
    if (x >= 0.99 || x <= -0.99) clipped += 1;
  }
  return { rms: Math.sqrt(sum / samples.length), clippedRatio: clipped / samples.length };
}

export class AudioQualityMonitor {
  private readonly rms: number[] = [];
  private readonly clipped: number[] = [];
  private candidate: AudioQualityIssue | null = null;
  private candidateCount = 0;
  private current: AudioQualityIssue | null = null;
  private cleanCount = 0;
  private evaluations = 0;

  reset() {
    this.rms.length = 0;
    this.clipped.length = 0;
    this.candidate = null;
    this.candidateCount = 0;
    this.current = null;
    this.cleanCount = 0;
    this.evaluations = 0;
  }

  observe(frame: AudioFrameStats): AudioQualitySnapshot {
    this.rms.push(frame.rms);
    this.clipped.push(frame.clippedRatio);
    if (this.rms.length > WINDOW) { this.rms.shift(); this.clipped.shift(); }
    // تقييم كل 5 إطارات (~نصف ثانية) — كلفة ثابتة صغيرة.
    this.evaluations += 1;
    if (this.rms.length >= MIN_FRAMES && this.evaluations % 5 === 0) this.evaluate();
    return this.snapshot();
  }

  snapshot(): AudioQualitySnapshot {
    return { issue: this.current, reliable: this.current === null };
  }

  private detect(): AudioQualityIssue | null {
    const n = this.rms.length;
    let speech = 0;
    let weak = 0;
    let clippedFrames = 0;
    let minRms = Infinity;
    for (let i = 0; i < n; i += 1) {
      const r = this.rms[i];
      if (r >= SPEECH_RMS) speech += 1;
      else if (r >= AUDIBLE_RMS) weak += 1;
      if (this.clipped[i] > 0.01) clippedFrames += 1;
      minRms = Math.min(minRms, r);
    }
    if (clippedFrames >= 3) return "clipping";
    // التلاوة الطبيعية فيها وقفات: إن لم تنخفض الطاقة أبداً تحت هذا الحد طوال
    // النافذة فالخلفية نفسها صاخبة.
    if (n >= WINDOW && minRms >= 0.012) return "noisy";
    if (weak / n >= 0.55 && speech / n < 0.1) return "low_volume";
    return null;
  }

  private evaluate() {
    const detected = this.detect();
    if (detected === null) {
      this.candidate = null;
      this.candidateCount = 0;
      if (this.current !== null && (this.cleanCount += 1) >= CLEAR_AFTER) {
        this.current = null;
        this.cleanCount = 0;
      }
      return;
    }
    this.cleanCount = 0;
    if (detected === this.candidate) this.candidateCount += 1;
    else { this.candidate = detected; this.candidateCount = 1; }
    if (this.candidateCount >= RAISE_AFTER) this.current = detected;
  }
}
