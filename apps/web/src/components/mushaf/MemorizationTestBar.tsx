/**
 * شريط «اختبار الحفظ» أثناء السؤال (Part 26).
 * يعرض: التقدم · الموضع (اختياري) · حالة الميكروفون · الإجراءات:
 *   التالي · تخطي · تلميح · إظهار الموضع · إيقاف مؤقت · إنهاء.
 * النتيجة بعد كل سؤال واضحة وهادئة — بلا مؤثرات ألعاب.
 */
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { OUTCOME_LABEL, type QuestionResult } from "@/lib/recitation-ai/memorizationTest";
import { presentAiPhase, type AiPhase } from "@/lib/recitation-ai/aiSessionPhase";

interface Props {
  index: number;
  total: number;
  mode: "ai" | "manual";
  aiPhase: AiPhase;
  loading: boolean;
  error: string | null;
  location: { verseKey: string } | null;
  locationShown: boolean;
  answered: boolean;
  result: QuestionResult | null;
  /** يدوي: الإجابة كُشفت وتنتظر التقييم الذاتي */
  awaitingSelfGrade: boolean;
  qualityMessage: string | null;
  busy: boolean;
  onHint: () => void;
  onToggleLocation: () => void;
  onSkip: () => void;
  onNext: () => void;
  onRevealAnswer: () => void;
  onSelfGrade: (correct: boolean) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

function locationLabel(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return `${SURAHS[surah - 1]?.name ?? ""} · الآية ${toArabicDigits(ayah)}`;
}

export default function MemorizationTestBar({
  index, total, mode, aiPhase, loading, error, location, locationShown, answered, result, awaitingSelfGrade,
  qualityMessage, busy, onHint, onToggleLocation, onSkip, onNext, onRevealAnswer, onSelfGrade, onPause, onResume, onFinish,
}: Props) {
  const paused = aiPhase === "PAUSED";
  const presentation = presentAiPhase(aiPhase);
  const last = index + 1 >= total;
  const outcomeTone = result && (result.outcome === "mistakes" || result.outcome === "self_wrong")
    ? "var(--mushaf-error)"
    : result?.outcome === "skipped" ? "var(--mushaf-chrome-muted)" : "var(--mushaf-correct)";

  return (
    <div
      className="tby-session-bar absolute inset-x-0 bottom-0 z-[25]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      dir="rtl"
      role="region"
      aria-label="اختبار الحفظ"
    >
      {/* التقدم */}
      <div className="px-4 pt-3 flex items-center gap-3">
        <span className="font-readex text-[12px] font-bold shrink-0">
          السؤال {toArabicDigits(index + 1)} من {toArabicDigits(total)}
        </span>
        <div className="tby-progress flex-1" aria-hidden>
          <span style={{ transform: `scaleX(${(index + (answered ? 1 : 0)) / Math.max(1, total)})` }} />
        </div>
        {mode === "ai" && (
          <span className="inline-flex items-center gap-1.5 shrink-0" aria-live="polite">
            <span className="tby-mic-dot" data-kind={presentation.dot} aria-hidden />
            <span className="tby-sheet-muted font-readex text-[11px]">{presentation.label}</span>
          </span>
        )}
      </div>

      {/* الحالة / التعليمات / النتيجة */}
      <div className="px-4 pt-1.5 min-h-[1.75rem]" aria-live="polite">
        {error ? (
          <p className="font-readex text-[12px]" style={{ color: "var(--mushaf-error)" }} role="alert">{error}</p>
        ) : loading ? (
          <p className="tby-sheet-muted font-readex text-[12px]">يحضّر السؤال…</p>
        ) : answered && result ? (
          <p className="font-readex text-[13px] font-bold" style={{ color: outcomeTone }}>
            {OUTCOME_LABEL[result.outcome]}
            {result.confirmedMistakes > 0 && <span className="font-normal"> · {toArabicDigits(result.confirmedMistakes)} خطأ</span>}
            {result.peeks > 0 && <span className="font-normal"> · {toArabicDigits(result.peeks)} تلميح</span>}
          </p>
        ) : awaitingSelfGrade ? (
          <p className="font-readex text-[12px]">قارن تلاوتك بالنص الظاهر ثم قيّم نفسك بصدق.</p>
        ) : (
          <p className="tby-sheet-muted font-readex text-[12px]">
            {mode === "ai" ? "أكمل التلاوة من حيث تنتهي الكلمات الظاهرة" : "سمّع التكملة من ذاكرتك، ثم اكشف الإجابة"}
            {qualityMessage ? ` · ${qualityMessage}` : ""}
          </p>
        )}
        {location && locationShown && (
          <p className="font-readex text-[11px] mt-0.5" style={{ color: "var(--mushaf-primary)" }}>{locationLabel(location.verseKey)}</p>
        )}
      </div>

      {/* الإجراءات */}
      <div className="flex items-center gap-1 px-2 h-16">
        {answered ? (
          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            className="tby-primary-action h-11 px-5 rounded-full font-readex text-sm font-bold inline-flex items-center gap-2"
          >
            {last ? "النتيجة" : "التالي"}
            <Icon name="chevron-left" size={16} />
          </button>
        ) : awaitingSelfGrade ? (
          <>
            <button type="button" onClick={() => onSelfGrade(true)} className="tby-primary-action h-11 px-4 rounded-full font-readex text-sm font-bold inline-flex items-center gap-1.5">
              <Icon name="check" size={15} /> أصبت
            </button>
            <button type="button" onClick={() => onSelfGrade(false)} className="tby-chip h-11 px-4 rounded-full font-readex text-sm font-bold">
              أخطأت
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onHint} disabled={loading || paused} className="tby-chip h-10 px-3 rounded-full inline-flex items-center gap-1.5 font-readex text-[12px] font-bold">
              <Icon name="eye" size={15} />
              <span className="hidden min-[380px]:inline">تلميح</span>
            </button>
            {mode === "manual" && (
              <button type="button" onClick={onRevealAnswer} disabled={loading} className="tby-chip h-10 px-3 rounded-full font-readex text-[12px] font-bold">
                اكشف الإجابة
              </button>
            )}
            <button type="button" onClick={onSkip} disabled={loading || busy} className="tby-icon-btn" aria-label="تخطي السؤال">
              <Icon name="arrow-left" size={17} />
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onToggleLocation}
          disabled={loading}
          aria-pressed={locationShown}
          className="tby-icon-btn"
          aria-label={locationShown ? "إخفاء الموضع" : "إظهار الموضع"}
        >
          <Icon name="map-pin" size={17} />
        </button>
        {mode === "ai" && (
          <button type="button" onClick={paused ? onResume : onPause} disabled={busy} className="tby-icon-btn" aria-label={paused ? "استئناف" : "إيقاف مؤقت"}>
            <Icon name={paused ? "play" : "pause"} size={18} />
          </button>
        )}
        <button type="button" onClick={onFinish} disabled={busy} className="tby-chip h-10 px-3.5 rounded-full font-readex text-[12px] font-bold">
          إنهاء
        </button>
      </div>
    </div>
  );
}
