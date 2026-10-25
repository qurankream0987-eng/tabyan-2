/**
 * أسلوب كلمة QCF أثناء الإخفاء/التتبع.
 *
 * يقتصر تتبع AI على اللون داخل inline flow ولا يضيف أي خاصية هندسية:
 * لا padding ولا margin ولا transform ولا inline-block.
 */
export interface WordPresentationStyle {
  opacity: number;
  transition: string;
  color?: string;
  background?: string;
  borderRadius?: string;
  textDecorationLine?: string;
  textDecorationStyle?: "solid" | "dotted" | "dashed" | "wavy" | "double";
  textDecorationColor?: string;
  textDecorationThickness?: string;
  textUnderlineOffset?: string;
}

/**
 * حالات AI المرئية. UNREAD/EXPECTED تعود لمظهر QCF الأصلي؛ CORRECT صبغة
 * خضراء خافتة جداً للحبر فقط (ما تُلي) حتى لا يبدو المصحف كمحرر شيفرة.
 */
export type WordFeedbackState = "HEARD_PENDING" | "CORRECT" | "POSSIBLE_ERROR" | "CONFIRMED_ERROR" | "CORRECTED" | "PEEKED" | "SKIPPED";

const CURRENT = "var(--mushaf-current, var(--maroon))";
const ERROR = "var(--mushaf-error, var(--tby-feedback-error, #9f1d2b))";

/**
 * كل حالة خطأ/تلميح لها نمط خط مختلف (لا اللون وحده): مؤكد = متصل سميك،
 * محتمل = منقط كهرماني، مصحَّح = مزدوج رفيع (أثر تاريخي)، تلميح = متقطع
 * ذهبي، تخطٍّ = متموج خافت. text-decoration رسم فقط، لا هندسة.
 */
const FEEDBACK: Record<WordFeedbackState, Partial<WordPresentationStyle>> = {
  HEARD_PENDING: {
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: "color-mix(in srgb, var(--mushaf-current, var(--maroon)) 55%, transparent)",
    textDecorationThickness: "1px",
  },
  CORRECT: {
    color: "color-mix(in srgb, var(--mushaf-ink, #231710) 78%, var(--mushaf-correct, #2f6b4a))",
  },
  CONFIRMED_ERROR: {
    color: ERROR,
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
    textDecorationColor: ERROR,
    textDecorationThickness: "2px",
  },
  POSSIBLE_ERROR: {
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: "color-mix(in srgb, var(--mushaf-possible, #b7791f) 80%, transparent)",
    textDecorationThickness: "2px",
  },
  CORRECTED: {
    color: "var(--mushaf-correct, #2f6b4a)",
    textDecorationLine: "underline",
    textDecorationStyle: "double",
    textDecorationColor: "var(--mushaf-corrected, color-mix(in srgb, var(--maroon) 35%, transparent))",
    textDecorationThickness: "1px",
  },
  PEEKED: {
    color: "var(--mushaf-peek, var(--gold))",
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
    textDecorationColor: "color-mix(in srgb, var(--mushaf-peek, #8a6a1c) 60%, transparent)",
    textDecorationThickness: "1px",
  },
  SKIPPED: {
    textDecorationLine: "underline",
    textDecorationStyle: "wavy",
    textDecorationColor: "color-mix(in srgb, var(--mushaf-error, #9f1d2b) 40%, transparent)",
    textDecorationThickness: "1px",
  },
};

function prefersReducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

export function getWordPresentationStyle(
  opacity: number,
  isCurrentWord: boolean,
  isAudioAyah: boolean,
  feedback?: WordFeedbackState,
): WordPresentationStyle | undefined {
  if (opacity === 1 && !isCurrentWord && !isAudioAyah && !feedback) return undefined;
  const reduced = prefersReducedMotion();
  return {
    opacity,
    transition: reduced ? "none" : feedback
      ? "opacity 220ms ease, color 160ms ease, text-decoration-color 160ms ease"
      : "opacity 220ms ease",
    ...(isAudioAyah && !isCurrentWord ? {
      background: "var(--mushaf-audio-ayah, rgba(180,150,50,0.1))",
      borderRadius: "2px",
    } : {}),
    ...(feedback ? { ...FEEDBACK[feedback], ...(feedback === "CORRECT" ? {} : { textUnderlineOffset: "0.35em" }) } : {}),
    // الكلمة الجارية تتقدّم على صبغة CORRECT؛ أخطاء الكلمة تبقى ظاهرة بخطها السفلي.
    ...(isCurrentWord && (!feedback || feedback === "CORRECT") ? { color: CURRENT } : {}),
  };
}
