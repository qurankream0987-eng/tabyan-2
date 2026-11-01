/**
 * حالة تسليم نتيجة واجب التسميع للمعلم — تظهر أعلى ملخص الجلسة التعليمية.
 * النتيجة يحسبها التطبيق على جهاز الطالب، والتقييم للمعلم وحده.
 */
import Icon from "@/components/app/Icon";
import { toArabicNum } from "@/lib/recitation-types";
import type { AssignmentResultPayload } from "@/lib/recitation-assignments";

export type AssignmentSubmission =
  | { status: "submitting" | "submitted"; sessionId: string; payload: AssignmentResultPayload }
  | { status: "failed"; sessionId: string; payload: AssignmentResultPayload; message: string }
  /** لا نتيجة: لم تعمل المتابعة الآلية في هذه الجلسة. */
  | { status: "unavailable"; sessionId: string; payload: null }
  /** لم يُسمع شيء من نطاق الواجب. */
  | { status: "empty"; sessionId: string; payload: AssignmentResultPayload };

export default function AssignmentSubmissionNotice({
  submission,
  onRetry,
}: {
  submission: AssignmentSubmission;
  onRetry?: () => void;
}) {
  const tone = submission.status === "submitted"
    ? "var(--mushaf-correct)"
    : submission.status === "submitting"
      ? "var(--mushaf-primary)"
      : "var(--mushaf-error)";
  const payload = submission.payload;

  return (
    <section
      className="tby-sheet-card px-3.5 py-3 mb-4"
      style={{ borderColor: `color-mix(in srgb, ${tone} 45%, transparent)` }}
      aria-live="polite"
      aria-label="تسليم واجب التسميع"
    >
      <div className="flex items-center gap-2 font-readex text-sm font-bold" style={{ color: tone }}>
        {submission.status === "submitting" ? (
          <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Icon name={submission.status === "submitted" ? "check-circle" : "alert-triangle"} size={16} />
        )}
        {submission.status === "submitting" && "جارٍ إرسال النتيجة لمعلمك…"}
        {submission.status === "submitted" && "سُلِّم الواجب لمعلمك"}
        {submission.status === "failed" && "لم يُسلَّم الواجب"}
        {submission.status === "unavailable" && "لم يُسلَّم الواجب"}
        {submission.status === "empty" && "لم يُسلَّم الواجب"}
      </div>

      <p className="tby-sheet-muted font-readex text-[11px] leading-relaxed mt-1.5">
        {submission.status === "submitting" && "تُرسل النتيجة كما حسبها التطبيق على جهازك."}
        {submission.status === "submitted" && "سيراجع معلمك تسميعك ويقيّمه بنفسه. يمكنك إعادة التسميع قبل تقييمه، وآخر تسليم يحل محل السابق."}
        {submission.status === "failed" && `${submission.message} — أعد المحاولة، فالجلسة محفوظة.`}
        {submission.status === "unavailable" && "لم تعمل المتابعة الآلية في هذه الجلسة فلا توجد نتيجة تُرسل. أعد التسميع من «جلسة جديدة»."}
        {submission.status === "empty" && "لم يُسمع شيء من نطاق الواجب في هذه الجلسة. أعد التسميع من «جلسة جديدة»."}
      </p>

      {payload && submission.status !== "empty" && (
        <p className="tby-sheet-muted font-readex text-[11px] mt-1.5">
          {toArabicNum(payload.wordsRecited)} من {toArabicNum(payload.totalWords)} كلمة
          · {toArabicNum(payload.confirmedMistakes)} خطأ
          · {toArabicNum(payload.skippedWords)} تخطٍّ
          · {toArabicNum(payload.correctedWords)} مصحَّح
          · {toArabicNum(payload.peekedWords)} تلميح
        </p>
      )}

      {submission.status === "failed" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tby-primary-action mt-3 w-full h-10 rounded-xl font-readex text-sm font-bold inline-flex items-center justify-center gap-1.5"
        >
          <Icon name="refresh" size={14} />
          أعد إرسال النتيجة
        </button>
      )}
    </section>
  );
}
