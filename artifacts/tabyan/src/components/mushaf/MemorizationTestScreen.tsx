/**
 * MemorizationTestScreen — شاشة «اختبار الحفظ» المخصصة (بطاقة واحدة).
 *
 * أعلى: تقدم مضغوط + خروج. وسط: بطاقة السؤال (كلمات البداية ظاهرة، التكملة مخفية،
 * اسم السورة ورقم الآية عند إظهارهما، مؤشرات الأسطر المتبقية، شريط تقدم على الحافة).
 * أسفل: العين (الموضع) · سهم (الكلمة التالية) · سهمان (بقية الآية — يدوي) · التالي.
 * كل البيانات من مشغّل الاختبار الحقيقي؛ الكشف بالتلميح يُسجَّل تلميحاً لا خطأ.
 */
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { OUTCOME_LABEL } from "@/lib/recitation-ai/memorizationTest";
import { presentAiPhase, type AiPhase } from "@/lib/recitation-ai/aiSessionPhase";
import type { TestRunState } from "./useMemorizationTestRunner";

interface Props {
  state: TestRunState;
  /** خريطة الكشف المحسوبة من المشغّل (verseKey → آخر موضع ظاهر) */
  revealed: Map<string, number> | null;
  awaitingSelfGrade: boolean;
  aiPhase: AiPhase;
  qualityMessage: string | null;
  busy: boolean;
  onHint: () => void;
  onRevealAnswer: () => void;
  /** يكشف بقية الآية الحالية فقط (تلميح مسجَّل) — في الوضعين */
  onRevealAyah: () => void;
  onToggleLocation: () => void;
  onSkip: () => void;
  onNext: () => void;
  onSelfGrade: (correct: boolean) => void;
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
}

export default function MemorizationTestScreen({
  state, revealed, awaitingSelfGrade, aiPhase, qualityMessage, busy,
  onHint, onRevealAnswer, onRevealAyah, onToggleLocation, onSkip, onNext, onSelfGrade, onPause, onResume, onExit,
}: Props) {
  const runtime = state.runtime;
  const total = state.questions.length;
  const index = state.current;
  const paused = aiPhase === "PAUSED";
  const presentation = presentAiPhase(aiPhase);
  const answered = runtime?.answered ?? false;
  const result = runtime?.result ?? null;
  const last = index + 1 >= total;

  const words = runtime ? runtime.words.slice(runtime.cueIndex, runtime.endIndex) : [];
  const isVisible = (verseKey: string, position: number) =>
    answered || position <= (revealed?.get(verseKey) ?? 0);
  const visibleWords = words.filter((w) => isVisible(w.verseKey, w.position));
  const hiddenWords = words.filter((w) => !isVisible(w.verseKey, w.position));
  const hiddenLines = new Set(hiddenWords.map((w) => `${w.page}:${w.line}`)).size;
  const hiddenTotal = runtime ? runtime.endIndex - runtime.startIndex : 0;
  const revealedHidden = runtime ? Math.max(0, visibleWords.length - (runtime.startIndex - runtime.cueIndex)) : 0;
  const cardProgress = hiddenTotal > 0 ? Math.min(1, revealedHidden / hiddenTotal) : 0;

  const [surah, ayah] = runtime ? runtime.question.start.verseKey.split(":").map(Number) : [0, 0];
  const locationShown = runtime?.locationShown ?? false;
  const tone = result && (result.outcome === "mistakes" || result.outcome === "self_wrong")
    ? "var(--mushaf-error)"
    : result?.outcome === "skipped" ? "var(--mushaf-chrome-muted)" : "var(--mushaf-correct)";

  return (
    <section className="tby-test-screen" dir="rtl" aria-label="اختبار الحفظ" data-testid="mushaf-test-screen">
      <header className="tby-test-header" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <button type="button" className="tby-icon-btn" onClick={onExit} disabled={busy} aria-label="إنهاء الاختبار" data-testid="mushaf-test-exit">
          <Icon name="x" size={20} />
        </button>
        <div className="tby-test-header-center">
          <span className="tby-test-count">السؤال {toArabicDigits(index + 1)} من {toArabicDigits(total)}</span>
          <div className="tby-progress tby-test-progress" aria-hidden>
            <span style={{ transform: `scaleX(${(index + (answered ? 1 : 0)) / Math.max(1, total)})` }} />
          </div>
        </div>
        {state.mode === "ai" ? (
          <button
            type="button"
            className="tby-icon-btn"
            onClick={paused ? onResume : onPause}
            disabled={busy}
            aria-label={paused ? "استئناف الاستماع" : "إيقاف الاستماع مؤقتاً"}
            title={presentation.label}
            data-testid="mushaf-test-pause"
          >
            <span className="tby-test-mic">
              <Icon name={paused ? "play" : "mic"} size={18} />
              <span className="tby-mic-dot" data-kind={presentation.dot} aria-hidden />
            </span>
          </button>
        ) : <span className="tby-test-mode-tag">تقييم ذاتي</span>}
      </header>

      <div className="tby-test-body">
        <article className="tby-test-card" aria-live="polite">
          <div className="tby-test-card-meta">
            {locationShown && runtime ? (
              <>
                <span className="tby-test-surah">سورة {SURAHS[surah - 1]?.name ?? ""}</span>
                <span className="tby-test-ayah">الآية {toArabicDigits(ayah)}</span>
              </>
            ) : (
              <span className="tby-test-masked">الموضع مخفي</span>
            )}
          </div>

          {state.error ? (
            <p className="tby-test-note" style={{ color: "var(--mushaf-error)" }} role="alert">{state.error}</p>
          ) : state.loading || !runtime ? (
            <div className="tby-test-skeleton" aria-label="يحضّر السؤال" role="status">
              <span /><span /><span />
            </div>
          ) : (
            <>
              <p className="tby-test-text font-quran" lang="ar">
                {words.map((w) => (
                  <span
                    key={`${w.verseKey}:${w.position}`}
                    className="tby-test-word"
                    data-revealed={isVisible(w.verseKey, w.position)}
                    aria-hidden={!isVisible(w.verseKey, w.position)}
                    style={{ opacity: isVisible(w.verseKey, w.position) ? 1 : 0 }}
                  >{w.displayText} </span>
                ))}
                {hiddenWords.length > 0 && <span className="tby-test-ellipsis" aria-label="تكملة مخفية">…</span>}
              </p>
              {hiddenLines > 0 && (
                <div className="tby-test-lines" aria-label={`بقي ${toArabicDigits(hiddenLines)} سطر مخفي`}>
                  {Array.from({ length: Math.min(hiddenLines, 6) }, (_, i) => <span key={i} />)}
                  {hiddenLines > 6 && <em>+{toArabicDigits(hiddenLines - 6)}</em>}
                </div>
              )}
            </>
          )}

          <div className="tby-test-status">
            {answered && result ? (
              <p className="font-bold" style={{ color: tone }}>
                {OUTCOME_LABEL[result.outcome]}
                {result.confirmedMistakes > 0 && <span className="font-normal"> · {toArabicDigits(result.confirmedMistakes)} خطأ</span>}
                {result.peeks > 0 && <span className="font-normal"> · {toArabicDigits(result.peeks)} تلميح</span>}
              </p>
            ) : awaitingSelfGrade ? (
              <p>قارن تلاوتك بالنص الظاهر ثم قيّم نفسك بصدق.</p>
            ) : runtime ? (
              <p className="tby-sheet-muted">
                {state.mode === "ai" ? "أكمل التلاوة من حيث تنتهي الكلمات الظاهرة" : "سمّع التكملة من ذاكرتك، ثم اكشف"}
                {qualityMessage ? ` · ${qualityMessage}` : ""}
              </p>
            ) : null}
          </div>
          <div className="tby-test-card-progress" aria-hidden><span style={{ transform: `scaleX(${cardProgress})` }} /></div>
        </article>
      </div>

      <footer className="tby-test-controls" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {awaitingSelfGrade && !answered ? (
          <>
            <button type="button" onClick={() => onSelfGrade(false)} className="tby-chip h-12 px-5 rounded-full font-readex text-sm font-bold" data-testid="mushaf-test-self-wrong">أخطأت</button>
            <button type="button" onClick={() => onSelfGrade(true)} className="tby-primary-action h-12 px-6 rounded-full font-readex text-sm font-bold inline-flex items-center gap-1.5" data-testid="mushaf-test-self-correct">
              <Icon name="check" size={15} /> أصبت
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="tby-test-ctl"
              onClick={onToggleLocation}
              disabled={!runtime}
              aria-pressed={locationShown}
              aria-label={locationShown ? "إخفاء السورة والآية" : "إظهار السورة والآية"}
              data-testid="mushaf-test-location"
            >
              <Icon name={locationShown ? "eye" : "eye-off"} size={19} />
            </button>
            <button
              type="button"
              className="tby-test-ctl"
              onClick={onHint}
              disabled={!runtime || answered || paused || hiddenWords.length === 0}
              aria-label="كشف الكلمة التالية (يُسجَّل تلميحاً)"
              data-testid="mushaf-test-reveal-word"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              className="tby-test-ctl"
              onClick={onRevealAyah}
              disabled={!runtime || answered || paused || hiddenWords.length === 0}
              aria-label="كشف بقية الآية الحالية (يُسجَّل تلميحاً)"
              data-testid="mushaf-test-reveal-ayah"
            >
              <span className="tby-double-arrow" aria-hidden>
                <Icon name="chevron-left" size={18} /><Icon name="chevron-left" size={18} />
              </span>
            </button>
            {state.mode === "manual" && (
              <button
                type="button"
                className="tby-chip tby-test-answer"
                onClick={onRevealAnswer}
                disabled={!runtime || answered}
                data-testid="mushaf-test-reveal-answer"
              >
                الإجابة
              </button>
            )}
            <button
              type="button"
              className="tby-primary-action tby-test-next"
              onClick={answered ? onNext : onSkip}
              disabled={busy || state.loading}
              data-testid="mushaf-test-next"
            >
              {answered && last ? "النتيجة" : "التالي"}
              <Icon name="arrow-left" size={16} />
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
