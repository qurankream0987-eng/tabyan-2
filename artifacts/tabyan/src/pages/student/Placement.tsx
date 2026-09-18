import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import VideoRecorder from "@/components/VideoRecorder";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_PLACEMENT_STATUS, DEMO_LEVELS_BY_PATH } from "@/lib/demo/student-core";

const MAX_ATTEMPTS = 3;
const ATTEMPTS_KEY = "tabyan_placement_attempts";

const INSTRUCTIONS = [
  "اقرأ سورة الفاتحة",
  "اقرأ ما تيسّر من حفظك",
];

const QURAN_RECORDING_INSTRUCTIONS = [
  "ضع الهاتف أمامك مباشرة.",
  "ارفع صوتك بوضوح أثناء التلاوة.",
  "اجلس في مكان هادئ قبل التسجيل.",
];

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toAr = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

function readAttempts(pathType: string): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return 0;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const n = obj[pathType];
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeAttempts(pathType: string, n: number): void {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    obj[pathType] = n;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(obj));
  } catch {
    /* storage full/blocked — attempts stay session-only */
  }
}

/** Optional per-skill scores — rendered only if the API ever provides them. */
interface PlacementScores {
  tajweed?: number;
  makharij?: number;
  fluency?: number;
  overall?: number;
}

export default function Placement() {
  const DEMO = authStore.isDemo;
  const [params] = useSearchParams();
  const isTilawah = params.get("path") === "tajweed_correction";
  const pathType = isTilawah ? "tajweed_correction" : "quran";
  const { toast } = useToast();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [recorded, setRecorded] = useState<{ blob: Blob; duration: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [demoResult, setDemoResult] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState<number>(() => readAttempts(pathType));
  const [studyTuhfa, setStudyTuhfa] = useState(false);
  const [tuhfaAnswered, setTuhfaAnswered] = useState(false);
  const [tuhfaInfoOpen, setTuhfaInfoOpen] = useState(false);

  const status = trpc.student.placementStatus.useQuery(undefined, { enabled: !DEMO });
  const statusData = DEMO ? DEMO_PLACEMENT_STATUS : status.data;

  // تحفة الأطفال: يظهر في أول أربعة مستويات مرتبة من مسار القرآن فقط؛
  // المستوى المستثنى/الأخير والمسارات الأخرى لا علاقة لها بتحفة الأطفال إطلاقاً.
  // المستوى يصل من رابط بطاقة المستوى (?levelId=)، وإن غاب يختاره الطالب من داخل الاختبار —
  // بدون هذه الخطوة كان السؤال لا يظهر إطلاقاً عند الدخول من الرئيسية أو اختيار المسار.
  const levelIdParam = params.get("levelId");
  const levelsQuery = trpc.student.levels.useQuery({ path: "quran" }, { enabled: !DEMO && !isTilawah });
  const quranLevels = DEMO ? (DEMO_LEVELS_BY_PATH.quran ?? []) : (levelsQuery.data ?? []);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(() => {
    const n = levelIdParam ? Number(levelIdParam) : NaN;
    return Number.isInteger(n) ? n : null;
  });
  const matchedLevel = selectedLevelId != null ? quranLevels.find((l) => l.id === selectedLevelId) : undefined;
  const matchedLevelIndex = matchedLevel ? quranLevels.findIndex((level) => level.id === matchedLevel.id) : -1;
  // فشل آمن: لا يظهر إلا عند معرفة المستوى وموقعه الفعلي ضمن أول أربعة، لا اعتماداً على ID ثابت.
  const showTuhfaChoice = !isTilawah && matchedLevelIndex >= 0 && matchedLevelIndex < 4;
  const submit = trpc.student.submitPlacement.useMutation({
    onSuccess: () => { setSent(true); utils.student.placementStatus.invalidate(); },
    onError: () => toast("خطأ في إرسال الفيديو، يرجى المحاولة مرة أخرى.", "error"),
  });

  const st = statusData?.status;

  /* When the reviewer asks for a re-record, grant a fresh set of attempts */
  useEffect(() => {
    if (st === "rejected") {
      writeAttempts(pathType, 0);
      setAttemptsUsed(0);
    }
  }, [st, pathType]);

  /* وضع العرض التجريبي فقط: بعد الإرسال تبقى الحالة "قيد المراجعة"
     ثم تظهر النتيجة تلقائياً بعد وقت تجريبي — ممنوع القفز المباشر للقبول */
  useEffect(() => {
    if (!DEMO || !sent) return;
    const t = setTimeout(() => setDemoResult(true), 8000);
    return () => clearTimeout(t);
  }, [DEMO, sent]);

  const handleAttemptUsed = () => {
    setAttemptsUsed((prev) => {
      const next = prev + 1;
      writeAttempts(pathType, next);
      return next;
    });
  };

  // الدخول للاختبار بلا levelId (من الرئيسية أو اختيار المسار) مسموح: يُرسل الاختبار عاماً
  // بلا سؤال منظومة — سؤال تحفة الأطفال مرتبط فقط بالدخول من بطاقة مستوى محدد (1-4)

  const send = async () => {
    if (!recorded) return;
    // سؤال المنظومة هو آخر خطوة — لا يُرسل الاختبار قبل اختيار إجابة صريحة عند ظهوره
    if (showTuhfaChoice && !tuhfaAnswered) return;
    if (DEMO) {
      // محاكاة كاملة للرفع في وضع العرض التجريبي
      setUploading(true);
      setProgress(0);
      const steps = [15, 32, 55, 74, 88, 95, 100];
      let i = 0;
      const advance = () => {
        if (i < steps.length) {
          setProgress(steps[i++]);
          setTimeout(advance, 280 + Math.random() * 200);
        } else {
          setUploading(false);
          setSent(true);
        }
      };
      setTimeout(advance, 320);
      return;
    }
    try {
      setUploading(true);
      const ext = recorded.blob.type.includes("mp4") ? "mp4" : "webm";
      const objectPath = await uploadFile(recorded.blob, `placement-${Date.now()}.${ext}`, setProgress);
      submit.mutate({
        videoUrl: objectPath,
        pathType: isTilawah ? "tajweed_correction" : "quran",
        durationSeconds: recorded.duration,
        studyTuhfa: showTuhfaChoice ? studyTuhfa === true : undefined,
        levelId: !isTilawah && matchedLevel ? matchedLevel.id : undefined,
      });
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : "خطأ في إرسال الفيديو، يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setUploading(false);
    }
  };

  const title = isTilawah ? "تصحيح التلاوة — اختبار القبول" : "اختبار القبول";

  /* ── بعد الإرسال — شاشة انتظار المراجعة ── */
  if ((sent || (st === "pending" && statusData?.hasVideo)) && !demoResult) {
    return (
      <div className="space-y-4 page-enter max-w-lg mx-auto">
        <GlassCard className="p-8 text-center overflow-hidden relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center text-gold-dark dark:text-gold mb-5 spring-pop">
            <Icon name="star" size={40} />
          </div>
          <h1 className="font-amiri text-3xl font-extrabold text-burgundy">تهانينا!</h1>
          <p className="font-readex text-base text-foreground mt-2 font-bold">تم إرسال اختبارك بنجاح</p>
          <p className="font-readex text-sm text-muted-foreground mt-1">وصل فيديوك إلى المشرف للمراجعة</p>
           {!isTilawah && (
             <p dir="rtl" className="font-readex text-sm text-foreground mt-4 font-bold leading-relaxed">
               تم إرسال الفيديو بنجاح. سيقوم معلم القرآن بمراجعته، وستتلقى الرد خلال ٢٤ ساعة.
             </p>
           )}

          {/* review timeline */}
          <div className="mt-7 rounded-2xl bg-[rgba(128,0,32,0.05)] dark:bg-white/5 p-5">
            <div className="flex items-start justify-between relative">
              <span className="absolute top-4 inset-x-8 h-0.5 bg-gradient-to-l from-gold via-[rgba(212,175,55,0.6)] to-border" />
              <TimelineStep icon="check" label="تم الاستلام" state="done" />
              <TimelineStep icon="clock" label="قيد المراجعة" state="active" />
              <TimelineStep icon="star" label="النتيجة" state="next" />
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[rgba(128,0,32,0.05)] dark:bg-white/5 p-5 text-right space-y-4">
            <p className="font-readex text-sm font-bold flex items-center gap-2">
              <Icon name="clock" size={18} className="text-gold-dark dark:text-gold shrink-0" />
              سيتم مراجعة الاختبار والرد خلال ٢٤ ساعة من الإرسال
            </p>
            <div>
              <p className="font-readex text-sm font-bold mb-2">سيتم إشعارك عند:</p>
              <ul className="font-readex text-sm space-y-2 pr-2">
                <li className="flex items-start gap-2.5"><Bullet />الموافقة على طلبك</li>
                <li className="flex items-start gap-2.5"><Bullet />فتح المواعيد للاختيار</li>
                <li className="flex items-start gap-2.5"><Bullet />طلب إعادة التسجيل (مع ملاحظات)</li>
              </ul>
            </div>
          </div>

          <PrimaryButton className="w-full mt-6 py-3.5 font-readex text-base" onClick={() => navigate("/student/home")}>
            العودة للرئيسية
          </PrimaryButton>
        </GlassCard>
      </div>
    );
  }

  /* ── تمت الموافقة — شاشة النتيجة ── */
  if (st === "approved" || demoResult) {
    const scores = (statusData as unknown as { scores?: PlacementScores } | undefined)?.scores;
    const hasScores =
      !!scores &&
      [scores.tajweed, scores.makharij, scores.fluency, scores.overall].some(
        (v) => typeof v === "number",
      );

    return (
      <div className="space-y-4 page-enter max-w-lg mx-auto">
        <GlassCard className="p-8 text-center overflow-hidden relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 mb-5 spring-pop">
            <Icon name="check" size={40} />
          </div>
          <h1 className="font-amiri text-3xl font-extrabold text-burgundy mb-3">تمت الموافقة!</h1>

          {statusData?.resultLevelName && (
            <p className="font-readex text-base font-bold bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] inline-block px-5 py-2 rounded-full mb-2">
              مستواك المعتمد:
              <span className="text-gold-dark dark:text-gold mx-1.5">{statusData.resultLevelName}</span>
            </p>
          )}

          {/* score dials — only when the API provides per-skill scores */}
          {hasScores && scores && (
            <div className="mt-6 rounded-2xl bg-[rgba(128,0,32,0.05)] dark:bg-white/5 p-5">
              <p className="font-readex text-sm font-extrabold text-burgundy mb-4">تقييم الأداء</p>
              <div className="flex items-end justify-center gap-4">
                {typeof scores.tajweed === "number" && <ScoreDial label="التجويد" value={scores.tajweed} />}
                {typeof scores.makharij === "number" && <ScoreDial label="مخارج الحروف" value={scores.makharij} />}
                {typeof scores.fluency === "number" && <ScoreDial label="الطلاقة" value={scores.fluency} />}
              </div>
              {typeof scores.overall === "number" && (
                <div className="mt-4 flex justify-center">
                  <ScoreDial label="التقييم العام" value={scores.overall} large />
                </div>
              )}
            </div>
          )}

          {statusData?.notes && (
            <div className="mt-5 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] p-4 text-right">
              <p className="font-readex text-sm font-bold text-burgundy mb-2 flex items-center gap-2">
                <Icon name="edit" size={18} />
                ملاحظة المراجع:
              </p>
              <p className="font-readex text-sm leading-relaxed">{statusData.notes}</p>
            </div>
          )}

          <PrimaryButton className="mt-6 w-full py-3.5 font-readex text-base" onClick={() => navigate("/student/booking")}>
            اختر موعد حلقتك
          </PrimaryButton>
        </GlassCard>
      </div>
    );
  }

  /* ── التسجيل — معالج الخطوات ── */
  const currentStep = uploading || submit.isPending ? 3 : recorded ? 2 : 1;
  const steps = ["التعليمات", "التسجيل", "المعاينة", "الإرسال"];

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      {st === "rejected" && (
        <GlassCard className="p-5 border-s-4 border-s-destructive border-t-0 border-b-0 border-e-0 rounded-none bg-destructive/5 dark:bg-destructive/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Icon name="x" size={20} />
            </div>
            <div className="space-y-1.5">
              <p className="font-readex text-base font-bold text-destructive">طُلب منك إعادة التسجيل</p>
              {statusData?.notes ? (
                <p className="font-readex text-sm text-foreground flex items-start gap-2">
                  <Icon name="edit" size={16} className="shrink-0 mt-0.5" />
                  {statusData.notes}
                </p>
              ) : (
                <p className="font-readex text-sm text-muted-foreground">راجع التعليمات أدناه ثم سجّل فيديو جديداً</p>
              )}
              <p className="font-readex text-xs font-bold text-muted-foreground flex items-center gap-1.5 pt-1">
                <Icon name="video" size={14} />
                تجدّدت محاولاتك — لديك {toAr(MAX_ATTEMPTS)} محاولات جديدة
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5 text-center overflow-hidden relative">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[rgba(128,0,32,0.1)] dark:bg-[rgba(212,175,55,0.1)] flex justify-center items-center text-burgundy mb-3 float">
          <Icon name="video" size={24} />
        </div>
        <h1 className="font-ruqaa text-[20px] font-bold text-burgundy mb-2">{title}</h1>
        <p className="mt-4 rounded-2xl bg-burgundy/5 dark:bg-gold/10 px-4 py-3 font-readex text-sm font-bold text-foreground">
          ضع الهاتف بشكل مستقيم، واجلس في مكان هادئ قبل بدء اختبار القبول.
        </p>

        {/* step wizard */}
        <div className="mt-6 flex items-center justify-center">
          {steps.map((label, i) => {
            const state = i < currentStep ? "done" : i === currentStep ? "active" : "next";
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5 w-16">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-readex text-xs font-extrabold border-2 transition-all duration-300 ${
                      state === "done"
                        ? "bg-gold border-gold text-night"
                        : state === "active"
                          ? "bg-burgundy border-burgundy text-white dark:bg-gold dark:border-gold dark:text-night scale-110 shadow-md"
                          : "bg-transparent border-border text-muted-foreground"
                    }`}
                  >
                    {state === "done" ? <Icon name="check" size={14} /> : toAr(i + 1)}
                  </span>
                  <span
                    className={`font-readex text-[10px] font-bold whitespace-nowrap ${
                      state === "next" ? "text-muted-foreground" : "text-burgundy"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span
                    className={`h-0.5 w-6 sm:w-10 -mt-5 rounded-full transition-colors duration-300 ${
                      i < currentStep ? "bg-gold" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <VideoRecorder
          maxSeconds={300}
          minSeconds={45}
          maxAttempts={MAX_ATTEMPTS}
          attemptsUsed={attemptsUsed}
          onAttemptUsed={handleAttemptUsed}
          onRecorded={(blob, duration) => setRecorded({ blob, duration })}
        />
      </GlassCard>

      <InstructionsCard
        instructions={isTilawah ? INSTRUCTIONS : [...INSTRUCTIONS, ...QURAN_RECORDING_INSTRUCTIONS]}
      />

      {recorded && (
        <GlassCard className="p-4 animate-in slide-in-from-bottom-2 overflow-hidden relative">
          <div className="font-readex text-base font-bold text-burgundy mb-4 flex items-center gap-2">
            <Icon name="check" size={20} />
            ملخص الطلب
          </div>
          <ul className="font-readex text-sm space-y-3 font-bold text-foreground">
            <li className="flex items-start gap-2.5"><Bullet />{isTilawah ? "تصحيح التلاوة" : "حفظ ومراجعة القرآن"}</li>
            <li className="flex items-start gap-2.5">
              <Bullet />
              مدة التسجيل: {toAr(recorded.duration)} ثانية
            </li>
            <li className="flex items-start gap-2.5">
              <Bullet />
              الجودة: حتى 720p — الحجم التقديري: ≈ {(recorded.blob.size / 1048576).toFixed(1)} م.ب
            </li>
          </ul>
          {uploading && (
            <div className="mt-5">
              <div className="h-3 rounded-full bg-[rgba(128,0,32,0.1)] dark:bg-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-l from-[#800020] via-[#D4AF37] to-[#800020] bg-[length:200%_100%] transition-all duration-300" /* check-colors-ignore */
                  style={{ width: `${progress}%`, animation: "shimmer 1.6s linear infinite" }}
                />
                <div className="absolute inset-0 shimmer" />
              </div>
              <p className="font-readex text-xs font-bold text-muted-foreground text-center mt-2">
                جارٍ رفع الفيديو… {toAr(progress)}٪
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {/* منظومة تحفة الأطفال — آخر خطوة في الاختبار (مستويات القرآن 1-4 فقط).
          يظهر التعريف فور اختيار «أريد»، ولا يؤثر الاختيار على نتيجة الاختبار. */}
      {showTuhfaChoice && (
        <GlassCard className="p-5 text-center animate-in slide-in-from-bottom-2">
          <div className="w-12 h-12 mx-auto icon-bubble text-burgundy mb-3">
            <Icon name="books" size={22} />
          </div>
          <h2 className="font-readex text-base font-extrabold text-foreground">هل تريد حفظ منظومة تحفة الأطفال؟</h2>
          <p className="font-readex text-xs text-muted-foreground mt-1 mb-4">خطوة اختيارية — إجابتك لا تؤثر على نتيجة الاختبار</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setStudyTuhfa(true); setTuhfaAnswered(true); setTuhfaInfoOpen(true); }}
              className={`rounded-xl border-2 px-4 py-3 font-readex text-sm font-bold transition btn-press ${
                tuhfaAnswered && studyTuhfa
                  ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night"
                  : "border-gold/40 bg-gold/8 text-gold-dark dark:text-gold hover:bg-gold/15"
              }`}
            >
              أريد
            </button>
            <button
              type="button"
              onClick={() => { setStudyTuhfa(false); setTuhfaAnswered(true); setTuhfaInfoOpen(false); }}
              className={`rounded-xl border-2 px-4 py-3 font-readex text-sm font-bold transition btn-press ${
                tuhfaAnswered && !studyTuhfa
                  ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night"
                  : "border-input text-muted-foreground hover:bg-muted"
              }`}
            >
              لا أريد
            </button>
          </div>
          {tuhfaInfoOpen && (
            <div className="mt-3 rounded-2xl bg-gold/10 dark:bg-gold/8 border border-gold/25 p-4 text-right">
              <p className="font-readex text-sm leading-relaxed text-foreground">
                هي عبارة عن أبيات شعرية تعلمك أحكام التجويد والقراءة القرآنية الصحيحة، وسيكون المقرر عليك (3) أبيات في الحلقة.
              </p>
            </div>
          )}
          {tuhfaAnswered && !tuhfaInfoOpen && (
            <p className="mt-3 font-readex text-xs font-bold text-green-600 dark:text-green-400">
              ✓ {studyTuhfa ? "اخترت حفظ المنظومة — ستُضاف لمكتبتك بعد اعتماد مستواك" : "اخترت عدم حفظ المنظومة — يمكنك تغيير اختيارك قبل الإرسال"}
            </p>
          )}
        </GlassCard>
      )}

      {/* زر الإرسال النهائي — آخر عنصر في الصفحة بعد كل الخطوات (بما فيها سؤال المنظومة) */}
      {recorded && (
        <div>
          <PrimaryButton
            className="w-full py-3.5 font-readex text-base"
            disabled={uploading || submit.isPending || (showTuhfaChoice && !tuhfaAnswered)}
            onClick={send}
          >
            {uploading || submit.isPending ? (
              "جارٍ الإرسال…"
            ) : (
              <span className="inline-flex items-center gap-2">
                إرسال للمراجعة
                <Icon name="arrow-left" size={18} />
              </span>
            )}
          </PrimaryButton>
          {showTuhfaChoice && !tuhfaAnswered && (
            <p className="font-readex text-xs font-bold text-muted-foreground text-center mt-2">
              أجب عن سؤال المنظومة أعلاه لإكمال الإرسال
            </p>
          )}
        </div>
      )}

      <div className="text-center pt-2 pb-6">
        <Link
          to="/student/home"
          className="font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-2"
        >
          رجوع
        </Link>
      </div>
    </div>
  );
}

/* ── sub-components ─────────────────────────────────────────────── */

function Bullet() {
  return (
    <span className="mt-[7px] shrink-0 inline-block w-2 h-2 rotate-45 bg-gradient-to-br from-gold to-amber-600 rounded-[2px] shadow-[0_0_6px_rgba(212,175,55,.55)]" />
  );
}

function InstructionsCard({ instructions }: { instructions: string[] }) {
  return (
    <GlassCard className="p-4">
      <div className="font-readex text-sm font-bold text-burgundy mb-3 flex items-center gap-2">
        <Icon name="books" size={18} />
        التعليمات
      </div>
      <ol className="space-y-2.5">
        {instructions.map((t, i) => (
          <li key={t} className="font-readex text-sm flex items-start gap-3 text-foreground font-bold">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[rgba(212,175,55,0.25)] to-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-gold-dark dark:text-gold text-xs font-extrabold flex items-center justify-center shrink-0">
              {toAr(i + 1)}
            </span>
            <span className="mt-1">{t}</span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

function TimelineStep({ icon, label, state }: { icon: "check" | "clock" | "star"; label: string; state: "done" | "active" | "next" }) {
  return (
    <div className="relative flex flex-col items-center gap-2 z-10">
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
          state === "done"
            ? "bg-gold border-gold text-night"
            : state === "active"
              ? "bg-burgundy border-burgundy text-white dark:bg-gold dark:border-gold dark:text-night animate-pulse"
              : "bg-card border-border text-muted-foreground"
        }`}
      >
        <Icon name={icon} size={16} />
      </span>
      <span
        className={`font-readex text-[11px] font-extrabold ${
          state === "next" ? "text-muted-foreground" : "text-burgundy"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

const DIAL_R = 34;
const DIAL_C = 2 * Math.PI * DIAL_R;

/** Animated circular score gauge — animates from 0 to the score on mount. */
function ScoreDial({ label, value, large = false }: { label: string; value: number; large?: boolean }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const size = large ? 96 : 76;
  const clamped = Math.max(0, Math.min(100, display));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 84 84" className="-rotate-90">
          <circle cx="42" cy="42" r={DIAL_R} fill="none" strokeWidth="7" className="stroke-[rgba(128,0,32,0.12)] dark:stroke-[rgba(212,175,55,0.16)]" />
          <circle
            cx="42"
            cy="42"
            r={DIAL_R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={DIAL_C}
            strokeDashoffset={DIAL_C * (1 - clamped / 100)}
            className={large ? "stroke-[var(--svg-primary)]" : "stroke-[var(--svg-accent)]"}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-readex font-extrabold text-burgundy ${large ? "text-lg" : "text-sm"}`}
          dir="ltr"
        >
          {clamped}%
        </span>
      </div>
      <span className="font-readex text-[11px] font-extrabold text-muted-foreground">{label}</span>
    </div>
  );
}
