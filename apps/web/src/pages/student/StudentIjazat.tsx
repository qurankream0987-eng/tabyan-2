import { useRef, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { uploadFile } from "@/lib/upload";
import { authStore } from "@/lib/auth";
import { DEMO_IJAZAT } from "@/lib/demo/student-extra";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";

const MAX_FILE_MB = 10;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const CONGRATS_MESSAGE =
  "نسأل الله عز وجل أن يجعلك من أهل القرآن الذين هم أهله وخاصته، وأن يوفقك في مسيرتك المباركة.";

/** شاشة القراءات — سؤال الإجازة ثم رفع الوثيقة فقط (بلا أي حقول كتابة) */
export default function StudentIjazat() {
  const DEMO = authStore.isDemo;
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = trpc.student.myIjazat.useQuery(undefined, { enabled: !DEMO });
  // وضع العرض: قائمة فارغة ليظهر سؤال الإجازة كما هو
  const rows = DEMO ? DEMO_IJAZAT : data;
  const submit = trpc.student.submitQiraatCertificate.useMutation({
    onSuccess: () => {
      toast("أُرسلت وثيقتك — ستراجعها الإدارة", "success");
      setFile(null);
      setProgress(0);
      utils.student.myIjazat.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });

  const hasPending = rows?.some((c) => c.status === "pending") ?? false;
  const approved = rows?.find((c) => c.status === "approved");

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast("صيغة غير مدعومة — PDF أو JPG أو PNG فقط", "error");
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast(`حجم الملف يتجاوز ${MAX_FILE_MB} ميجابايت`, "error");
      return;
    }
    setFile(f);
  };

  const send = async () => {
    if (!file) return;
    if (DEMO) { toast(DEMO_TOAST); return; }
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() ?? "bin";
      const objectPath = await uploadFile(file, `ijazah-${Date.now()}.${ext}`, setProgress);
      submit.mutate({ certificateUrl: objectPath });
    } catch (e) {
      toast((e as Error).message, "error");
      setUploading(false);
      setProgress(0);
    }
  };

  if (!DEMO && isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}</div>;
  }

  /* ── تم الاعتماد — رسالة التهنئة المعتمدة ── */
  if (approved) {
    return (
      <div className="space-y-4 page-enter max-w-lg mx-auto">
        <GlassCard hover={false} className="p-8 text-center overflow-hidden relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 mb-5 spring-pop">
            <Icon name="check-circle" size={40} />
          </div>
          <h1 className="font-amiri text-3xl font-extrabold text-burgundy mb-3">تهانينا!</h1>
          <p className="font-readex text-base font-bold text-foreground leading-relaxed">
            لقد تم اعتمادك في برنامج القراءات ضمن تطبيق تبيان القرآني.
          </p>
          <p className="font-readex text-sm text-muted-foreground leading-relaxed mt-3">{CONGRATS_MESSAGE}</p>
          <Link
            to="/student/levels/qiraat"
            className="block text-center bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3.5 rounded-full btn-press hover:opacity-90 transition mt-6"
          >
            <span className="inline-flex items-center gap-2">الدخول إلى برنامج القراءات <Icon name="arrow-left" size={18} /></span>
          </Link>
        </GlassCard>
        <CertsList data={rows ?? []} />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <div className="text-center pt-2">
        <div className="w-16 h-16 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="certificate" size={32} />
        </div>
        <h1
          className="hero-greeting font-amiri text-4xl font-extrabold mb-1"
        >القراءات</h1>
        <p className="font-readex text-sm text-muted-foreground">برنامج خاص بالمجازين برواية حفص عن عاصم</p>
      </div>

      {/* ── السؤال الأول: هل لديك إجازة؟ ── */}
      {!hasPending && answer === null && (
        <GlassCard className="p-6 text-center overflow-hidden relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/15 text-gold-dark dark:text-gold flex items-center justify-center mb-4">
            <Icon name="shield" size={26} />
          </div>
          <h2 className="font-amiri text-2xl font-extrabold text-burgundy leading-relaxed mb-2">
            هل لديك إجازة برواية حفص عن عاصم
            <br />
            عن طريق الشاطبية؟
          </h2>
          <p className="font-readex text-xs text-muted-foreground mb-6">هذا البرنامج مخصص لحملة الإجازة بالسند المتصل</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAnswer("yes")}
              className="py-3.5 rounded-full bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold btn-press hover:opacity-90 transition"
            >
              نعم، لديّ إجازة
            </button>
            <button
              type="button"
              onClick={() => setAnswer("no")}
              className="py-3.5 rounded-full bg-burgundy/5 dark:bg-white/5 text-burgundy font-readex text-sm font-extrabold btn-press hover:bg-burgundy/10 dark:hover:bg-white/10 transition"
            >
              لا، ليس بعد
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── مسار التحضير — لمن لا يملك إجازة ── */}
      {!hasPending && answer === "no" && (
        <GlassCard className="p-6 overflow-hidden relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
              <Icon name="quran" size={24} />
            </div>
            <h2 className="font-amiri text-2xl font-extrabold text-burgundy">مسار التحضير للإجازة</h2>
          </div>
          <ul className="space-y-3 mb-6">
            {[
              "أتقن الحفظ عبر مستويات الحفظ الخمسة حتى مستوى الوارثون",
              "تعلّم أحكام التجويد نظرياً وتطبيقياً في دروس التجويد",
              "اجتز التسميع المتصل بسندٍ لدى شيخ مجيز لتحصل على الإجازة",
              "عُد إلينا بوثيقة إجازتك — وسيفتح لك برنامج القراءات",
            ].map((t) => (
              <li key={t} className="font-readex text-sm font-bold text-foreground flex items-start gap-2.5">
                <span className="mt-[7px] shrink-0 inline-block w-2 h-2 rotate-45 bg-gradient-to-br from-gold to-amber-600 rounded-[2px]" />
                {t}
              </li>
            ))}
          </ul>
          <Link
            to="/student/levels/quran"
            className="block text-center bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3.5 rounded-full btn-press hover:opacity-90 transition"
          >
            <span className="inline-flex items-center gap-2">ابدأ من مستويات الحفظ <Icon name="arrow-left" size={18} /></span>
          </Link>
          <button
            type="button"
            onClick={() => setAnswer(null)}
            className="block mx-auto mt-4 font-readex text-xs font-bold text-muted-foreground hover:text-foreground transition"
          >
            رجوع للسؤال
          </button>
        </GlassCard>
      )}

      {/* ── رفع الوثيقة فقط — بلا أي حقول كتابة ── */}
      {!hasPending && answer === "yes" && (
        <GlassCard className="p-6 overflow-hidden relative">
          <h2 className="font-amiri text-2xl font-extrabold text-burgundy mb-2 text-center">أرسل وثيقة إجازتك</h2>
          <p className="font-readex text-xs text-muted-foreground text-center mb-5 leading-relaxed">
            ارفع صورة أو ملف الوثيقة فقط — سيستخرج المسؤول بياناتها ويراجعها خلال ٢٤–٤٨ ساعة
          </p>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-burgundy/25 dark:border-gold/25 bg-burgundy/[0.03] dark:bg-white/[0.03] hover:bg-burgundy/[0.06] dark:hover:bg-white/[0.06] transition p-8 flex flex-col items-center gap-3 btn-press"
            >
              <div className="w-14 h-14 rounded-2xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center">
                <Icon name="upload" size={26} />
              </div>
              <span className="font-readex text-sm font-extrabold text-burgundy">اضغط لاختيار الوثيقة</span>
              <span className="font-readex text-[11px] font-bold text-muted-foreground">PDF أو JPG أو PNG — بحد أقصى {MAX_FILE_MB} ميجابايت</span>
            </button>
          ) : (
            <div className="rounded-2xl bg-burgundy/[0.05] dark:bg-white/5 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
                <Icon name={file.type === "application/pdf" ? "file-text" : "photo"} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold text-foreground truncate" dir="ltr">{file.name}</div>
                <div className="font-readex text-[11px] text-muted-foreground mt-0.5">{(file.size / 1048576).toFixed(1)} ميجابايت</div>
              </div>
              {!uploading && !submit.isPending && (
                <button
                  type="button"
                  onClick={() => { setFile(null); setProgress(0); }}
                  className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 btn-press"
                  aria-label="إزالة الملف"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="h-3 rounded-full bg-burgundy/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#800020] via-[#D4AF37] to-[#800020] bg-[length:200%_100%] transition-all duration-300" /* check-colors-ignore */
                  style={{ width: `${progress}%`, animation: "shimmer 1.6s linear infinite" }}
                />
              </div>
              <p className="font-readex text-xs font-bold text-muted-foreground text-center mt-2">جارٍ رفع الوثيقة… {progress}٪</p>
            </div>
          )}

          <PrimaryButton
            className="w-full mt-5 py-3.5 font-readex text-base"
            disabled={!file || uploading || submit.isPending}
            onClick={send}
          >
            {uploading || submit.isPending ? (
              "جارٍ الإرسال…"
            ) : (
              <span className="inline-flex items-center gap-2">إرسال الوثيقة للمراجعة <Icon name="send" size={18} /></span>
            )}
          </PrimaryButton>

          <button
            type="button"
            onClick={() => { setAnswer(null); setFile(null); }}
            className="block mx-auto mt-4 font-readex text-xs font-bold text-muted-foreground hover:text-foreground transition"
          >
            رجوع
          </button>
        </GlassCard>
      )}

      {/* ── قيد المراجعة ── */}
      {hasPending && (
        <GlassCard hover={false} className="p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/15 text-gold-dark dark:text-gold flex items-center justify-center mb-3 animate-pulse">
            <Icon name="hourglass" size={26} />
          </div>
          <h2 className="font-amiri text-2xl font-extrabold text-burgundy mb-2">وثيقتك قيد المراجعة</h2>
          <p className="font-readex text-sm text-muted-foreground leading-relaxed">
            استلم المسؤول وثيقتك وسيرد عليك خلال ٢٤–٤٨ ساعة — سيصلك إشعار بالنتيجة
          </p>
        </GlassCard>
      )}

      {/* ── سجل الشهادات السابقة ── */}
      {(rows?.length ?? 0) > 0 && <CertsList data={rows ?? []} />}
    </div>
  );
}

function CertsList({ data }: { data: Array<{ id: string; status: string; createdAt: string | Date | null; certificateUrl: string; reviewNotes: string | null }> }) {
  if (!data.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="font-amiri text-xl font-bold text-burgundy">سجل الوثائق</h3>
      {!data.length ? (
        <EmptyState title="لا وثائق بعد" />
      ) : (
        data.map((c) => (
          <GlassCard key={c.id} hover={false} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={c.status} />
              <span className="text-[11px] font-readex text-muted-foreground">{fmtDateTime(c.createdAt)}</span>
            </div>
            {c.reviewNotes && (
              <div className={`rounded-xl p-3 font-readex text-xs leading-relaxed ${c.status === "rejected" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-burgundy/5 text-muted-foreground dark:bg-white/5"}`}>
                ملاحظات المراجعة: {c.reviewNotes}
              </div>
            )}
          </GlassCard>
        ))
      )}
    </section>
  );
}
