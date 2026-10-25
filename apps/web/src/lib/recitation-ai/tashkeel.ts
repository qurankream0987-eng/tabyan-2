/**
 * كشف أخطاء التشكيل — EXPERIMENTAL (Part 21).
 *
 * منفصل تماماً عن أخطاء الكلمات: لا يُنتج أي علامة على المصحف ولا يدخل
 * محرك الحالات. يعمل فقط إن أعاد مزوّد ASR نصاً مشكولاً؛ مزوّدات التفريغ
 * الحالية تعيد غالباً نصاً بلا حركات، فتكون النتيجة "insufficient" وهي
 * النتيجة الصادقة الوحيدة الممكنة. لا ادعاء دقة قبل تحقق صوتي بحقيقة أرضية.
 */

/** حركات قياسية في ASR: تنوين، فتحة، ضمة، كسرة، شدة، سكون */
const HARAKAT = /[ً-ْ]/;
const ARABIC_LETTER = /[ء-يٱ]/;

export type TashkeelEvidence = "none" | "partial" | "present";

/** نسبة الكلمات العربية المشكولة في نص المزوّد الخام. */
export function tashkeelEvidence(rawText: string): { tokens: number; vocalized: number; level: TashkeelEvidence } {
  let tokens = 0;
  let vocalized = 0;
  for (const token of rawText.split(/\s+/)) {
    if (!ARABIC_LETTER.test(token)) continue;
    tokens += 1;
    if (HARAKAT.test(token)) vocalized += 1;
  }
  const ratio = tokens ? vocalized / tokens : 0;
  return { tokens, vocalized, level: ratio === 0 ? "none" : ratio >= 0.6 ? "present" : "partial" };
}

/** يوحّد رموز الرسم العثماني إلى حركات قياسية ويُسقط ما لا يقابله شيء في ASR. */
function canonicalMarks(text: string) {
  return text
    .normalize("NFC")
    .replace(/ۡ/g, "ْ")          // سكون عثماني → سكون
    .replace(/ࣰ/g, "ً")          // تنوين فتح متتابع
    .replace(/ࣱ/g, "ٌ")
    .replace(/ࣲ/g, "ٍ")
    .replace(/ٰ/g, "ا")               // ألف خنجرية حرف منطوق
    .replace(/[ؐ-ؚٓ-ٟۖ-۠ۢ-ۭـ]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي");
}

/** هيكل الكلمة: [حرف، مجموعة حركاته] */
function skeleton(text: string): { letter: string; marks: string }[] {
  const out: { letter: string; marks: string }[] = [];
  for (const ch of canonicalMarks(text)) {
    if (HARAKAT.test(ch)) {
      if (out.length) out[out.length - 1].marks += ch;
    } else if (ARABIC_LETTER.test(ch)) {
      out.push({ letter: ch, marks: "" });
    }
  }
  return out.map((entry) => ({ ...entry, marks: [...entry.marks].sort().join("") }));
}

export type TashkeelComparison = "match" | "mismatch" | "insufficient";

/**
 * يقارن حركات لفظ مسموع (خام من المزوّد) بالكلمة الكنسية.
 * محافظ عمداً: أي اختلاف في الحروف نفسها، أو غياب الحركات، = insufficient
 * (ليس خطأ تشكيل). حرف بلا حركة في المسموع لا يُقارن (تشكيل جزئي شائع).
 */
export function compareTashkeel(heardRaw: string, canonicalDisplay: string): TashkeelComparison {
  if (!HARAKAT.test(heardRaw)) return "insufficient";
  const heard = skeleton(heardRaw);
  const expected = skeleton(canonicalDisplay);
  if (heard.length !== expected.length) return "insufficient";
  let compared = 0;
  for (let i = 0; i < heard.length; i += 1) {
    if (heard[i].letter !== expected[i].letter) return "insufficient";
    if (!heard[i].marks) continue;
    compared += 1;
    if (heard[i].marks !== expected[i].marks) return "mismatch";
  }
  return compared ? "match" : "insufficient";
}

/** مراقب أدلة الجلسة: هل يكفي ما يعيده المزوّد لتفعيل الميزة أصلاً؟ */
export class TashkeelEvidenceMonitor {
  private tokens = 0;
  private vocalized = 0;

  observe(rawText: string) {
    const evidence = tashkeelEvidence(rawText);
    this.tokens += evidence.tokens;
    this.vocalized += evidence.vocalized;
  }

  get level(): TashkeelEvidence | "unknown" {
    if (this.tokens < 12) return "unknown";
    const ratio = this.vocalized / this.tokens;
    return ratio === 0 ? "none" : ratio >= 0.6 ? "present" : "partial";
  }
}
