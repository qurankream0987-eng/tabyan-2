/**
 * نتيجة «اختبار الحفظ» — واضحة وهادئة: النسبة، توزيع النتائج، وكل سؤال بموضعه.
 * التقييم شفاف: النسبة = (متقن + صحيح بتلميح) ÷ الأسئلة المُجاب عنها.
 */
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { OUTCOME_LABEL, type QuestionResult, type TestQuestion, type TestSummary } from "@/lib/recitation-ai/memorizationTest";
import ReaderSheet from "./ReaderSheet";

interface Props {
  scopeLabel: string;
  mode: "ai" | "manual";
  summary: TestSummary;
  questions: TestQuestion[];
  results: QuestionResult[];
  temporary: boolean;
  onOpenQuestion: (question: TestQuestion) => void;
  onRetryWeak: () => void;
  onNewTest: () => void;
  onClose: () => void;
}

function ayahLabel(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return `${SURAHS[surah - 1]?.name ?? ""} ${toArabicDigits(ayah)}`;
}

export default function MemorizationTestResultSheet({
  scopeLabel, mode, summary, questions, results, temporary, onOpenQuestion, onRetryWeak, onNewTest, onClose,
}: Props) {
  const byId = new Map(results.map((r) => [r.questionId, r]));
  const weakCount = results.filter((r) => r.outcome === "mistakes" || r.outcome === "self_wrong" || r.outcome === "skipped").length;
  return (
    <ReaderSheet
      title="نتيجة الاختبار"
      subtitle={`${scopeLabel}${mode === "manual" ? " · تقييم ذاتي" : ""}`}
      onClose={onClose}
      footer={(
        <div className="flex gap-2.5">
          {weakCount > 0 ? (
            <button type="button" onClick={onRetryWeak} className="tby-chip flex-1 h-12 rounded-2xl font-readex text-sm font-bold">
              أعد الأسئلة الضعيفة ({toArabicDigits(weakCount)})
            </button>
          ) : (
            <button type="button" onClick={onClose} className="tby-chip flex-1 h-12 rounded-2xl font-readex text-sm font-bold">
              العودة للمصحف
            </button>
          )}
          <button type="button" onClick={onNewTest} className="tby-primary-action flex-1 h-12 rounded-2xl font-readex text-sm font-bold inline-flex items-center justify-center gap-1.5">
            <Icon name="refresh" size={14} />
            اختبار جديد
          </button>
        </div>
      )}
    >
      <div className="text-center pt-1 pb-4">
        <p className="tby-sheet-muted font-readex text-[11px]">النتيجة</p>
        <p className="font-readex text-3xl font-bold leading-tight mt-0.5" style={{ color: "var(--mushaf-primary)" }}>
          {summary.scorePercent === null ? "—" : `${toArabicDigits(summary.scorePercent)}٪`}
        </p>
        <p className="tby-sheet-muted font-readex text-[11px] mt-1">
          {toArabicDigits(summary.answered)} من {toArabicDigits(summary.total)} أسئلة مُجاب عنها
          {temporary ? " · جلسة مؤقتة (لن تُحفظ)" : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "متقن", value: summary.mastered, tone: "var(--mushaf-correct)" },
          { label: "بتلميح", value: summary.withHints },
          { label: "أخطاء", value: summary.withMistakes, tone: summary.withMistakes ? "var(--mushaf-error)" : undefined },
          { label: "تُخطّي", value: summary.skipped },
        ].map((tile) => (
          <div key={tile.label} className="tby-sheet-card px-1 py-2.5 text-center min-w-0">
            <div className="font-readex text-lg font-bold leading-none" style={tile.tone ? { color: tile.tone } : undefined}>{toArabicDigits(tile.value)}</div>
            <div className="tby-sheet-muted font-readex text-[11px] mt-1.5 truncate">{tile.label}</div>
          </div>
        ))}
      </div>

      <ul className="mt-5 space-y-1.5" aria-label="الأسئلة">
        {questions.map((question) => {
          const result = byId.get(question.id);
          const weak = result && (result.outcome === "mistakes" || result.outcome === "self_wrong");
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onOpenQuestion(question)}
                className="tby-sheet-card w-full px-3 py-2.5 flex items-center gap-3 text-right"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-readex text-[12px] font-bold border border-[var(--mushaf-chrome-border)]">
                  {toArabicDigits(question.id)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-amiri text-base font-bold leading-tight">
                    {ayahLabel(question.start.verseKey)}
                    {question.end.verseKey !== question.start.verseKey && ` – ${toArabicDigits(question.end.ayah)}`}
                  </span>
                  <span className="block font-readex text-[11px] mt-0.5" style={{ color: weak ? "var(--mushaf-error)" : "var(--mushaf-chrome-muted)" }}>
                    {result ? OUTCOME_LABEL[result.outcome] : "لم يُجب"}
                  </span>
                </span>
                <Icon name="chevron-left" size={15} className="tby-sheet-muted shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="tby-sheet-muted font-readex text-[11px] leading-relaxed mt-4">
        النسبة = (المتقن + الصحيح بتلميح) ÷ الأسئلة المُجاب عنها. الأسئلة المتخطاة لا تدخل في النسبة وتُعرض منفصلة.
        {mode === "manual" ? " في وضع التقييم الذاتي تعتمد النتيجة على تقييمك أنت." : ""}
      </p>
    </ReaderSheet>
  );
}
