import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import PrimaryButton from "@/components/app/PrimaryButton";
import SecondaryButton from "@/components/app/SecondaryButton";
import EmptyState from "@/components/app/EmptyState";
import Icon from "@/components/app/Icon";
import { authStore } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";

type Question = {
  id: string;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "fill_blank" | string;
  options: string[];
  points: number;
};

type ExamResult = {
  score: number;
  passed: boolean;
  passingScore: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    points: number;
    earned: number;
    correctAnswer: string | null;
    explanation: string | null;
  }>;
};

function ExamSkeleton() {
  return (
    <div className="space-y-3 page-enter max-w-lg mx-auto" aria-label="جارٍ تحميل الاختبار" aria-busy="true">
      <div className="h-24 skeleton rounded-[1.5rem]" />
      {[1, 2, 3].map((i) => <div key={i} className="h-32 skeleton rounded-[1.5rem]" />)}
    </div>
  );
}

function AccessDenied({ reason, onLogin }: { reason: string; onLogin: () => void }) {
  return (
    <EmptyState
      title="الاختبار متاح للطلاب المسجلين"
      hint={reason}
      action={
        <SecondaryButton onClick={onLogin}>
          <span className="inline-flex items-center gap-2">
            <Icon name="lock" size={16} />
            تسجيل الدخول
          </span>
        </SecondaryButton>
      }
    />
  );
}

export default function ShariaExam() {
  const { levelId: rawLevelId } = useParams<{ levelId: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const levelId = Number(rawLevelId);
  const validLevelId = Number.isInteger(levelId) && levelId > 0;
  const isStudentSession = authStore.isLoggedIn && authStore.role === "student" && !authStore.isDemo;
  const canQuery = validLevelId && isStudentSession;

  const exam = trpc.sharia.exam.useQuery(
    { levelId },
    { enabled: canQuery, retry: false },
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);

  const submitExam = trpc.sharia.submitExam.useMutation({
    onSuccess: (serverResult) => {
      const nextResult = serverResult as ExamResult;
      setResult(nextResult);
      toast(
        nextResult.passed
          ? "تهانينا! لقد نجحت في الاختبار"
          : `النتيجة: ${nextResult.score}% — الحد الأدنى: ${nextResult.passingScore}%`,
        nextResult.passed ? "success" : "error",
      );
      void exam.refetch();
    },
  });

  const questions = (exam.data?.questions ?? []) as Question[];
  const questionCount = questions.length;
  const answeredCount = questions.filter((question) => (answers[question.id] ?? "").trim().length > 0).length;
  const answeredAll = questionCount > 0 && answeredCount === questionCount;
  const current = questions[currentQuestion];

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((previous) => ({ ...previous, [questionId]: answer }));
    submitExam.reset();
  }, [submitExam]);

  const resetAttempt = () => {
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    submitExam.reset();
  };

  const handleSubmit = () => {
    if (!validLevelId || !answeredAll || exam.data?.attemptsRemaining === 0 || submitExam.isPending) return;
    submitExam.mutate({
      levelId,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? "",
      })),
    });
  };

  if (!validLevelId) {
    return <EmptyState title="المستوى غير صالح" hint="تحقق من رابط الاختبار ثم حاول مرة أخرى" />;
  }

  if (!isStudentSession) {
    return (
      <AccessDenied
        reason={authStore.isLoggedIn ? "هذا الاختبار مخصص لحسابات الطلاب فقط" : "سجّل الدخول بحساب طالب للوصول إلى اختبار المستوى"}
        onLogin={() => nav("/?auth=login")}
      />
    );
  }

  if (exam.isLoading) return <ExamSkeleton />;

  if (exam.isError) {
    return (
      <EmptyState
        title="تعذر تحميل الاختبار"
        hint={exam.error.message || "تحقق من الاتصال ثم أعد المحاولة"}
        action={
          <SecondaryButton onClick={() => void exam.refetch()}>
            <span className="inline-flex items-center gap-2">
              <Icon name="refresh" size={16} />
              إعادة المحاولة
            </span>
          </SecondaryButton>
        }
      />
    );
  }

  if (!exam.data) {
    return <EmptyState title="المستوى غير موجود" hint="لم نتمكن من العثور على هذا المستوى الشرعي" />;
  }

  if (questionCount === 0) {
    return (
      <EmptyState
        title="لا أسئلة لهذا المستوى بعد"
        hint="تُضاف أسئلة الاختبار من قبل الإدارة"
        action={<SecondaryButton onClick={() => nav(`/student/sharia/level/${levelId}`)}>العودة للمستوى</SecondaryButton>}
      />
    );
  }

  if (result) {
    return (
      <div className="space-y-4 page-enter max-w-lg mx-auto" aria-live="polite">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nav(`/student/sharia/level/${levelId}`)}
            className="icon-badge icon-badge--sm"
            aria-label="العودة إلى المستوى"
          >
            <Icon name="arrow-right" size={16} />
          </button>
          <div className="min-w-0">
            <p className="font-readex text-xs text-muted-foreground">نتيجة اختبار المستوى</p>
            <h1 className="font-amiri text-2xl font-extrabold text-burgundy truncate">{exam.data.level.name}</h1>
          </div>
        </div>

        <GlassCard className={`p-5 text-center border-2 ${result.passed ? "border-green-500/30" : "border-destructive/25"}`}>
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${result.passed ? "bg-green-100 dark:bg-green-900/40" : "bg-destructive/10"}`}>
            <Icon
              name={result.passed ? "check-circle" : "x-circle"}
              size={32}
              className={result.passed ? "text-green-600 dark:text-green-400" : "text-destructive"}
            />
          </div>
          <h2 className="font-amiri text-2xl text-burgundy">{result.passed ? "نجحت في الاختبار!" : "لم تجتز الاختبار"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 font-readex text-sm">
            <div className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="text-muted-foreground text-xs">درجتك</div>
              <div className="font-bold text-lg mt-1">{result.score}%</div>
            </div>
            <div className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="text-muted-foreground text-xs">حد النجاح</div>
              <div className="font-bold text-lg mt-1">{result.passingScore}%</div>
            </div>
            <div className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="text-muted-foreground text-xs">المحاولة</div>
              <div className="font-bold mt-1">{result.attemptsUsed}</div>
            </div>
            <div className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="text-muted-foreground text-xs">المتبقي</div>
              <div className="font-bold mt-1">{result.attemptsRemaining}</div>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-2" aria-label="مراجعة الإجابات">
          {result.results.map((answerResult, index) => (
            <GlassCard key={answerResult.questionId} className="p-4">
              <div className="flex items-center gap-2 font-readex text-sm">
                <Icon
                  name={answerResult.correct ? "check" : "x"}
                  size={16}
                  className={answerResult.correct ? "text-green-600 dark:text-green-400" : "text-destructive"}
                />
                <span className="font-bold">السؤال {index + 1}</span>
                <span className="mr-auto text-muted-foreground">{answerResult.earned}/{answerResult.points} نقطة</span>
              </div>
              {answerResult.correctAnswer !== null && (
                <p className="font-readex text-xs text-muted-foreground mt-2">
                  <span className="font-bold text-foreground">الإجابة الصحيحة:</span> {answerResult.correctAnswer}
                </p>
              )}
              {answerResult.explanation !== null && (
                <p className="font-readex text-xs text-muted-foreground mt-1 leading-relaxed">{answerResult.explanation}</p>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="flex gap-2">
          {result.passed ? (
            <PrimaryButton className="flex-1" onClick={() => nav(`/student/sharia/certificate/${levelId}`)}>
              <span className="inline-flex items-center gap-2">
                <Icon name="certificate" size={16} />
                عرض الشهادة
              </span>
            </PrimaryButton>
          ) : result.attemptsRemaining > 0 ? (
            <PrimaryButton className="flex-1" onClick={resetAttempt}>
              <span className="inline-flex items-center gap-2">
                <Icon name="refresh" size={16} />
                إعادة الاختبار
              </span>
            </PrimaryButton>
          ) : null}
          <SecondaryButton className="flex-1" onClick={() => nav(`/student/sharia/level/${levelId}`)}>
            العودة للمستوى
          </SecondaryButton>
        </div>
      </div>
    );
  }

  const questionNumber = currentQuestion + 1;
  const progress = (questionNumber / questionCount) * 100;
  const isLastQuestion = questionNumber === questionCount;
  const submitError = submitExam.error?.message;

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav(`/student/sharia/level/${levelId}`)}
          className="icon-badge icon-badge--sm"
          aria-label="العودة إلى المستوى"
        >
          <Icon name="arrow-right" size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-readex text-xs text-muted-foreground">اختبار المستوى</p>
          <h1 className="font-amiri text-2xl font-extrabold text-burgundy truncate">{exam.data.level.name}</h1>
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2 font-readex text-[11px]">
          <span className="rounded-full bg-gold/15 text-gold-dark dark:text-gold px-3 py-1.5 font-bold">
            الاجتياز من {exam.data.passPercentage}%
          </span>
          <span className={`rounded-full px-3 py-1.5 font-bold ${exam.data.attemptsRemaining > 0 ? "bg-burgundy/8 text-burgundy dark:bg-white/10 dark:text-gold" : "bg-destructive/10 text-destructive"}`}>
            المحاولات المتبقية: {exam.data.attemptsRemaining}
          </span>
          {exam.data.passed && <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/35 dark:text-green-300 px-3 py-1.5 font-bold">مجتاز سابقاً</span>}
          {exam.data.bestScore > 0 && <span className="rounded-full bg-burgundy/8 text-burgundy dark:bg-white/10 dark:text-gold px-3 py-1.5 font-bold">أفضل نتيجة: {exam.data.bestScore}%</span>}
        </div>
      </GlassCard>

      <div className="flex items-center gap-3" aria-label="تقدم الاختبار">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-readex text-muted-foreground mb-1">
            <span>سؤال {questionNumber} من {questionCount}</span>
            <span>{answeredCount} مجاب</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label={`التقدم في الاختبار ${Math.round(progress)} بالمئة`}
          >
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <GlassCard className="p-5">
        <fieldset>
          <legend className="w-full">
            <span className="flex items-start gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0 font-readex font-bold text-sm" aria-hidden="true">
                {questionNumber}
              </span>
              <span className="font-readex text-sm font-bold leading-relaxed">{current.questionText}</span>
            </span>
          </legend>

          {current.questionType === "multiple_choice" && (
            <div className="space-y-2" role="radiogroup" aria-label="اختيارات السؤال">
              {current.options.map((option, index) => {
                const selected = answers[current.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswer(current.id, option)}
                    className={`w-full text-right p-3 rounded-xl font-readex text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      selected
                        ? "bg-burgundy text-white dark:bg-gold dark:text-night font-bold"
                        : "bg-burgundy/5 dark:bg-white/5 hover:bg-burgundy/10"
                    }`}
                    role="radio"
                    aria-checked={selected}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </button>
                );
              })}
            </div>
          )}

          {current.questionType === "true_false" && (
            <div className="flex gap-3" role="radiogroup" aria-label="إجابة صح أو خطأ">
              {["صح", "خطأ"].map((option) => {
                const selected = answers[current.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswer(current.id, option)}
                    className={`flex-1 p-3 rounded-xl font-readex text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      selected
                        ? option === "صح" ? "bg-green-600 text-white" : "bg-destructive text-white"
                        : "bg-burgundy/5 dark:bg-white/5 hover:bg-burgundy/10"
                    }`}
                    role="radio"
                    aria-checked={selected}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {current.questionType === "fill_blank" && (
            <label className="block font-readex text-sm">
              <span className="sr-only">إجابة السؤال</span>
              <input
                type="text"
                value={answers[current.id] ?? ""}
                onChange={(event) => handleAnswer(current.id, event.target.value)}
                placeholder="اكتب إجابتك هنا…"
                aria-label="إجابة السؤال"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </label>
          )}
        </fieldset>
      </GlassCard>

      {submitError && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 font-readex text-sm text-destructive" role="alert" aria-live="assertive">
          {submitError}
        </div>
      )}

      <div className="flex gap-2">
        <SecondaryButton
          className="flex-1"
          onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
          disabled={currentQuestion === 0 || submitExam.isPending}
          aria-label="السؤال السابق"
        >
          <Icon name="arrow-right" size={16} />
        </SecondaryButton>
        {!isLastQuestion ? (
          <PrimaryButton className="flex-[4]" onClick={() => setCurrentQuestion((value) => value + 1)} disabled={submitExam.isPending}>
            <span className="inline-flex items-center gap-2">
              السؤال التالي
              <Icon name="arrow-left" size={16} />
            </span>
          </PrimaryButton>
        ) : (
          <PrimaryButton
            className="flex-[4]"
            onClick={handleSubmit}
            disabled={!answeredAll || exam.data.attemptsRemaining === 0 || submitExam.isPending}
            aria-describedby={submitError ? "submit-error" : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="send" size={16} />
              {submitExam.isPending ? "جارٍ التسليم…" : "تسليم الاختبار"}
            </span>
          </PrimaryButton>
        )}
      </div>

      {submitError && <span id="submit-error" className="sr-only">{submitError}</span>}
      {(!answeredAll || exam.data.attemptsRemaining === 0) && (
        <p className="text-center text-[11px] text-muted-foreground font-readex" aria-live="polite">
          {exam.data.attemptsRemaining === 0
            ? "استُنفدت المحاولات المتاحة لهذا الاختبار"
            : `أجب على جميع الأسئلة قبل التسليم (${answeredCount}/${questionCount})`}
        </p>
      )}
      <p className="text-center text-[11px] text-muted-foreground font-readex">
        يمكنك مراجعة الأسئلة السابقة قبل التسليم.
      </p>
    </div>
  );
}