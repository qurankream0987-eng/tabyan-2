/**
 * حالة تبيان AI الموحّدة للواجهة — تُشتق من مصدرين فقط بدل أعلام متضاربة:
 *   1) طور جلسة التسميع على الخادم (useRecitationSession)
 *   2) حالة النقل الصوتي (useOpenAiRealtimeTranscription)
 * + أعلام محلية صريحة: تحضير corpus القرآن، وإعادة الاتصال التلقائية.
 *
 * الترتيب مقصود: النتيجة ← إعادة الاتصال ← الخطأ ← الإيقاف ← مراحل البدء ← الاستماع.
 */
import type { RecitationPhase } from "@/lib/mushaf/useRecitationSession";

export type TransportState = "idle" | "connecting" | "requesting_mic" | "listening" | "stopping" | "failed";

export type AiPhase =
  | "IDLE"
  | "REQUESTING_MIC"
  | "PREPARING"
  | "LISTENING"
  | "PROCESSING"
  | "PAUSED"
  | "RECONNECTING"
  | "ERROR"
  | "COMPLETED";

export interface AiPhaseInput {
  recitation: RecitationPhase;
  transport: TransportState;
  /** تحميل كلمات القرآن الكنسية/تهيئة المطابق قبل فتح الميكروفون */
  preparing: boolean;
  reconnecting: boolean;
  /** هل الجلسة تستعمل تبيان AI أصلاً (مزوّد مفعّل)؟ */
  aiEnabled: boolean;
}

export function deriveAiPhase(input: AiPhaseInput): AiPhase {
  const { recitation, transport, preparing, reconnecting, aiEnabled } = input;
  if (recitation === "result") return "COMPLETED";
  if (recitation === "idle" || recitation === "setup") {
    return transport === "failed" && aiEnabled ? "ERROR" : "IDLE";
  }
  // جلسة نشطة أو موقوفة
  if (!aiEnabled) return recitation === "paused" ? "PAUSED" : "LISTENING";
  if (reconnecting) return "RECONNECTING";
  if (transport === "failed") return "ERROR";
  if (recitation === "paused") return "PAUSED";
  if (transport === "stopping") return "PROCESSING";
  if (transport === "requesting_mic") return "REQUESTING_MIC";
  if (preparing || transport === "connecting") return "PREPARING";
  if (transport === "listening") return "LISTENING";
  return "IDLE";
}

export interface AiPhasePresentation {
  label: string;
  /** شكل مؤشر الميكروفون — لا يعتمد على اللون وحده: النص يرافقه دائماً */
  dot: "listening" | "pending" | "paused" | "error" | "done" | "idle";
  /** هل يُعرض زر إعادة المحاولة؟ */
  canRetry: boolean;
}

const PRESENTATION: Record<AiPhase, AiPhasePresentation> = {
  IDLE: { label: "ابدأ التلاوة", dot: "idle", canRetry: false },
  REQUESTING_MIC: { label: "اسمح بالميكروفون", dot: "pending", canRetry: false },
  PREPARING: { label: "يستعد…", dot: "pending", canRetry: false },
  LISTENING: { label: "يستمع الآن", dot: "listening", canRetry: false },
  PROCESSING: { label: "ينهي المقطع…", dot: "pending", canRetry: false },
  PAUSED: { label: "متوقف مؤقتاً", dot: "paused", canRetry: false },
  RECONNECTING: { label: "يعيد الاتصال…", dot: "pending", canRetry: false },
  ERROR: { label: "تعذّر الاستماع", dot: "error", canRetry: true },
  COMPLETED: { label: "اكتملت الجلسة", dot: "done", canRetry: false },
};

export function presentAiPhase(phase: AiPhase): AiPhasePresentation {
  return PRESENTATION[phase];
}

/** فشل نقل عابر يستحق إعادة محاولة تلقائية؛ رفض الميكروفون أو الخادم لا. */
export type TransportFailure = "mic" | "unsupported" | "server" | "transport" | "timeout";

export const RECONNECT_DELAYS_MS = [800, 2_500] as const;

export function shouldAutoReconnect(failure: TransportFailure | null, attempts: number, recitation: RecitationPhase) {
  return recitation === "active"
    && (failure === "transport" || failure === "timeout")
    && attempts < RECONNECT_DELAYS_MS.length;
}

/**
 * Gateway errors a fresh connection can recover from: a provider stream that
 * broke or closed, and the gateway's idle cleanup. Everything else (auth,
 * forbidden session, replaced socket, disabled feature) is final.
 */
const RETRYABLE_GATEWAY_ERRORS: ReadonlySet<string> = new Set(["PROVIDER_STREAM_ERROR", "PROVIDER_CLOSED", "SESSION_IDLE"]);

export function gatewayErrorFailure(code: string | null | undefined): TransportFailure {
  return code && RETRYABLE_GATEWAY_ERRORS.has(code) ? "transport" : "server";
}
