import type { RecitationPhase } from "./useRecitationSession";

export type RecitationAiState = "idle" | "connecting" | "listening" | "stopping" | "failed";
export type RecitationAiIndicatorKind = "listening" | "paused" | "reconnecting" | "failed";

export interface RecitationAiIndicator {
  kind: RecitationAiIndicatorKind;
  label: string;
  shortLabel: string;
}

/**
 * الحالات المرئية للمستخدم أربع فقط. حالات النقل الداخلية مثل idle وstopping
 * لا تُسرّب إلى الواجهة؛ تظهر كإعادة اتصال إلى أن يصبح AI جاهزاً أو يفشل.
 */
export function getRecitationAiIndicator(
  state: RecitationAiState,
  recitationPhase: RecitationPhase,
): RecitationAiIndicator {
  if (state === "failed") {
    return { kind: "failed", label: "تبيان AI • تعذر الاتصال", shortLabel: "تعذر الاتصال" };
  }
  if (recitationPhase === "paused") {
    return { kind: "paused", label: "تبيان AI • متوقف مؤقتًا", shortLabel: "متوقف مؤقتًا" };
  }
  if (state === "listening") {
    return { kind: "listening", label: "تبيان AI • يستمع", shortLabel: "يستمع" };
  }
  return { kind: "reconnecting", label: "تبيان AI • إعادة الاتصال", shortLabel: "إعادة الاتصال" };
}