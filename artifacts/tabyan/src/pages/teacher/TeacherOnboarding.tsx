import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import VideoRecorder from "@/components/VideoRecorder";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { uploadFile, uploadVideoFile, objectUrl } from "@/lib/upload";
import { DEMO_KYC } from "@/lib/demo/teacher";

const QUESTIONS = [
  "ما مؤهلك العلمي في القرآن وعلومه؟",
  "هل تحمل إجازة بالسند؟ وفي أي رواية؟",
  "كم سنة خبرة في تعليم القرآن؟",
  "ما الفئات العمرية التي درّستها؟",
  "ما أسلوبك في التحفيز والمتابعة؟",
  "كيف تتعامل مع الطالب الضعيف؟",
  "ما أهم كتب التجويد التي درستها؟",
  "هل لديك خبرة في التعليم عن بُعد؟",
  "ما أوقات تفرغك الأسبوعية؟",
  "لماذا تريد الانضمام إلى تبيان؟",
];

type Certificate = { id: string; teacherId: string; filePath: string; title: string | null; createdAt: string | Date | null };
type VideoMethod = "record" | "upload";

function CertificatesSection({ demo }: { demo: boolean }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);

  const certsQ = trpc.teacher.myCertificates.useQuery(undefined, { enabled: !demo });
  const certs: Certificate[] = demo ? [] : ((certsQ.data as Certificate[] | undefined) ?? []);

  const add = trpc.teacher.addCertificate.useMutation({
    onSuccess: () => { toast("أُضيفت الشهادة", "success"); utils.teacher.myCertificates.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.teacher.removeCertificate.useMutation({
    onSuccess: () => { toast("حُذفت الشهادة", "success"); utils.teacher.myCertificates.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (demo) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
    setUploading(true); setPct(0);
    try {
      const path = await uploadFile(file, file.name, setPct);
      add.mutate({ filePath: path, title: title.trim() || file.name });
      setTitle("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الشهادة", "error");
    } finally {
      setUploading(false); setPct(0);
    }
  };

  return (
    <GlassCard className="p-5">
      <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">
        <Icon name="certificate" size={18} />
        شهادات ومؤهلات (اختياري)
      </h2>
      <p className="font-readex text-xs text-muted-foreground mb-3">ارفع صور أو ملفات PDF لإجازاتك وشهاداتك لتعزيز طلبك</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          placeholder="عنوان الشهادة (اختياري)…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onPick} className="hidden" />
        <button type="button" disabled={uploading || add.isPending} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-burgundy/10 text-burgundy font-readex text-sm font-bold px-4 py-2 disabled:opacity-50">
          <Icon name="plus" size={15} />
          {uploading ? "جارٍ الرفع…" : "إضافة شهادة"}
        </button>
      </div>

      {uploading && (
        <div className="mb-3">
          <div className="h-2 rounded-full bg-burgundy/10 overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] font-readex text-muted-foreground mt-1">{pct}%</div>
        </div>
      )}

      {certs.length ? (
        <div className="flex flex-wrap gap-2">
          {certs.map((c) => (
            <div key={c.id} className="inline-flex items-center gap-2 rounded-full bg-burgundy/5 dark:bg-white/5 border border-input px-3 py-1.5">
              <Icon name="file-text" size={13} />
              <span className="font-readex text-xs max-w-[10rem] truncate">{c.title || "شهادة"}</span>
              <a href={objectUrl(c.filePath)} target="_blank" rel="noreferrer" className="text-[11px] font-readex text-burgundy hover:underline inline-flex items-center gap-0.5">
                <Icon name="link" size={12} />عرض
              </a>
              <button type="button" onClick={() => { if (window.confirm("حذف هذه الشهادة؟")) remove.mutate({ id: c.id }); }}
                className="text-destructive hover:opacity-70" aria-label="حذف">
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-readex text-xs text-muted-foreground">لا شهادات مرفوعة بعد</p>
      )}
    </GlassCard>
  );
}

export default function TeacherOnboarding() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const DEMO = authStore.isDemo;
  const kycQ = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !DEMO });
  const kycData = DEMO ? DEMO_KYC : kycQ.data;
  const kycLoading = !DEMO && kycQ.isLoading;
  const utils = trpc.useUtils();
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProof, setVideoProof] = useState("");
  const [videoName, setVideoName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoMethod, setVideoMethod] = useState<VideoMethod>("upload");
  const [answers, setAnswers] = useState<string[]>(Array(10).fill(""));
  const startAssessment = trpc.teacher.startAssessment.useMutation({
    onSuccess: async () => { await utils.teacher.kycStatus.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const submit = trpc.teacher.submitKyc.useMutation({
    onSuccess: async () => {
      await utils.teacher.kycStatus.invalidate();
      setVideoUrl("");
      setVideoProof("");
      setVideoName("");
      setAnswers(Array(10).fill(""));
      toast("أُرسل طلب القبول — سيراجعه المشرف خلال 24 ساعة", "success");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
    setVideoMethod("upload");
    setUploading(true); setPct(0);
    try {
      const uploaded = await uploadVideoFile(file, file.name, setPct, "teacher_kyc_video");
      setVideoUrl(uploaded.playableObjectPath);
      setVideoProof(uploaded.videoProof);
      setVideoName(file.name);
      toast("تم رفع الفيديو", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الفيديو — حاول مرة أخرى", "error");
    } finally {
      setUploading(false); setPct(0);
    }
  };

  const onRecordedVideo = async (blob: Blob) => {
    if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
    setUploading(true); setPct(0);
    try {
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const uploaded = await uploadVideoFile(blob, `teacher-intro-${Date.now()}.${extension}`, setPct, "teacher_kyc_video");
      setVideoUrl(uploaded.playableObjectPath);
      setVideoProof(uploaded.videoProof);
      setVideoName("فيديو مصوّر من داخل التطبيق");
      setVideoMethod("upload");
      toast("تم رفع الفيديو المصوّر", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الفيديو المصوّر — حاول مرة أخرى", "error");
    } finally {
      setUploading(false); setPct(0);
    }
  };

  if (kycLoading) return <div className="h-40 skeleton rounded-[1.5rem] max-w-lg mx-auto mt-8" />;
  const st = kycData?.kycStatus;
  const reviewNotes = kycData?.notes ?? "";

  if (st === "approved") return (
    <div className="max-w-lg mx-auto pt-10 page-enter">
      <GlassCard className="p-6 text-center">
        <div className="flex justify-center mb-3 text-green-600 dark:text-green-400"><Icon name="check-circle" size={48} /></div>
        <h1 className="font-amiri text-2xl text-burgundy">تم قبول طلبك</h1>
        <p className="font-readex text-sm text-muted-foreground mt-2">أنت معلم متطوع معتمد في منصة تبيان — بارك الله فيك</p>
        {kycData?.isMufti && (
          <p className="font-readex text-sm text-gold-dark dark:text-gold mt-2 inline-flex items-center gap-1.5">
            <Icon name="mosque" size={16} />
            أنت أيضاً مفتٍ معتمد — راجع صندوق الفتاوى
          </p>
        )}
        <PrimaryButton className="w-full mt-5" onClick={() => navigate("/teacher")}>إلى لوحتي</PrimaryButton>
      </GlassCard>
    </div>
  );

  if (st === "awaiting_assessment") return (
    <div className="max-w-lg mx-auto pt-10 page-enter">
      <GlassCard className="p-6 text-center">
        <div className="flex justify-center mb-3 text-burgundy"><Icon name="clipboard" size={44} /></div>
        <h1 className="font-amiri text-2xl text-burgundy">اختبار القبول</h1>
        <p className="font-readex text-sm text-muted-foreground mt-2">يرجى الدخول إلى اختبار قبول المعلم لإتمام إجراءات التسجيل.</p>
        <p className="font-readex text-xs text-gold-dark dark:text-gold mt-3">بانتظار اختبار القبول</p>
        {/* توضيح «العمل تطوعي» — يظهر قبل الدخول إلى اختبار القبول في التسجيل الذاتي */}
        <div className="mt-4 rounded-2xl bg-gold/10 dark:bg-gold/8 border border-gold/25 p-4 text-right">
          <p className="font-readex text-sm font-extrabold text-burgundy flex items-center gap-2">
            <Icon name="star" size={16} className="shrink-0" />
            العمل في المنصة تطوعي
          </p>
          <ul className="font-readex text-xs text-foreground mt-2 space-y-1.5 leading-relaxed">
            <li>• التدريس في تبيان عمل تطوعي احتسابي بلا مقابل مادي.</li>
            <li>• تنظّم مواعيدك بنفسك ويمكنك التوقف في أي وقت.</li>
            <li>• يُعتمد حسابك بعد اجتياز اختبار القبول ومراجعة الإشراف.</li>
          </ul>
        </div>
        {/* التسجيل كمعلم متطوع فقط — لا يوجد مسار «معلم» منفصل؛ يُرسل volunteer=true دائماً */}
        <PrimaryButton
          className="w-full mt-5"
          disabled={startAssessment.isPending}
          onClick={() => {
            if (DEMO) return;
            startAssessment.mutate({ volunteer: true });
          }}
        >
          {startAssessment.isPending ? "جارٍ فتح الاختبار…" : "ادخل الاختبار"}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-3 text-xs font-readex font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
        >
          <Icon name="arrow-right" size={14} />
          رجوع
        </button>
      </GlassCard>
    </div>
  );

  if (st === "pending" && !videoUrl && answers.every((a) => !a)) return (
    <div className="max-w-lg mx-auto pt-10 page-enter space-y-4">
      <GlassCard className="p-6 text-center">
        <div className="flex justify-center mb-3 text-gold-dark dark:text-gold"><Icon name="hourglass" size={44} /></div>
        <h1 className="font-amiri text-2xl text-burgundy">طلب القبول قيد المراجعة</h1>
        <p className="font-readex text-sm text-muted-foreground mt-2">يراجع المشرف فيديو التعريف وإجاباتك — ستصلك النتيجة خلال 24 ساعة</p>
        <button onClick={() => setAnswers(Array(10).fill(" "))} className="mt-4 text-xs font-readex text-burgundy hover:underline">تعديل الطلب وإعادة الإرسال</button>
      </GlassCard>
      {reviewNotes.trim() && (
        <GlassCard className="p-5 border border-gold/50 bg-gold/10">
          <h2 className="font-amiri text-lg text-gold-dark dark:text-gold mb-1.5 flex items-center gap-2">
            <Icon name="info" size={18} />
            ملاحظات من الإدارة
          </h2>
          <p className="font-readex text-sm text-foreground/90 whitespace-pre-wrap">{reviewNotes}</p>
        </GlassCard>
      )}
      <CertificatesSection demo={DEMO} />
    </div>
  );

  const allAnswered = answers.every((a) => a.trim().length >= 3);

  /* زر خروج دائم من اختبار قبول المعلم: إن وُجد محتوى غير مُرسل يُطلب تأكيد.
     الكاميرا/المايك يتوقفان تلقائياً عند مغادرة الصفحة (تنظيف VideoRecorder). */
  const hasUnsentWork = !!videoUrl || answers.some((a) => a.trim());
  const handleExit = () => {
    if (hasUnsentWork && !window.confirm("لديك محتوى غير مُرسل في الاختبار — سيُفقد ما لم يُرسل. هل تريد الخروج؟")) return;
    navigate("/");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/5 border border-input px-4 py-2 font-readex text-xs font-extrabold text-muted-foreground hover:text-foreground transition btn-press"
        >
          <Icon name="arrow-right" size={14} />
          خروج من الاختبار
        </button>
      </div>
      <GlassCard className="p-5 text-center">
        <div className="flex justify-center mb-2 text-burgundy"><Icon name="id-card" size={40} /></div>
        <h1 className="font-amiri text-2xl text-burgundy">اختبار قبول المعلم</h1>
        {st === "in_progress" && (
          <p className="font-readex text-xs text-gold-dark dark:text-gold mt-2">الاختبار قيد التنفيذ</p>
        )}
        {st === "rejected" && (
          <div className="mt-2 rounded-xl bg-destructive/10 text-destructive font-readex text-sm p-3">
            رُفض طلبك السابق{kycData?.notes ? `: ${kycData.notes}` : ""} — يمكنك إعادة التقديم
          </div>
        )}
        <p className="font-readex text-sm text-muted-foreground mt-2">خطوتان: فيديو تعريفي + 10 أسئلة</p>
      </GlassCard>

      {st === "pending" && reviewNotes.trim() && (
        <GlassCard className="p-5 border border-gold/50 bg-gold/10">
          <h2 className="font-amiri text-lg text-gold-dark dark:text-gold mb-1.5 flex items-center gap-2">
            <Icon name="info" size={18} />
            ملاحظات من الإدارة
          </h2>
          <p className="font-readex text-sm text-foreground/90 whitespace-pre-wrap">{reviewNotes}</p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">
          <Icon name="video" size={18} />
          ١. الفيديو التعريفي
        </h2>
        <p className="font-readex text-xs text-muted-foreground mb-3">صوّر فيديو تعريفيًا لمدة <b>30 ثانية على الأقل</b> تتلو فيه آيات بصوتك، أو أرفق فيديو جاهزًا من الاستديو</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            disabled={uploading}
            onClick={() => setVideoMethod("record")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 font-readex text-sm font-bold transition disabled:opacity-50 ${
              videoMethod === "record"
                ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night"
                : "border-input bg-background text-burgundy"
            }`}
          >
            <Icon name="camera" size={16} />
            سجل مقطع فيديو
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => setVideoMethod("upload")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 font-readex text-sm font-bold transition disabled:opacity-50 ${
              videoMethod === "upload"
                ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night"
                : "border-input bg-background text-burgundy"
            }`}
          >
            <Icon name="upload" size={16} />
            ارفق المقطع
          </button>
        </div>

        {videoMethod === "record" && !videoUrl && (
          <VideoRecorder
            minSeconds={30}
            maxSeconds={60}
            onRecorded={onRecordedVideo}
          />
        )}

        {videoMethod === "upload" && (
          <>
            <input ref={videoRef} type="file" accept="video/*" onChange={onPickVideo} className="hidden" />
            <button type="button" disabled={uploading} onClick={() => videoRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm font-bold text-burgundy disabled:opacity-50">
              <Icon name="upload" size={16} />
              {uploading ? "جارٍ الرفع…" : videoUrl ? "استبدال الفيديو" : "ارفق المقطع"}
            </button>
          </>
        )}

        {uploading && (
          <div className="mt-2">
            <div className="h-2 rounded-full bg-burgundy/10 overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] font-readex text-muted-foreground mt-1">جارٍ الرفع… {pct}%</div>
          </div>
        )}

        {videoUrl && !uploading && (
          <>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-green-600/10 text-green-700 dark:text-green-400 px-3 py-2">
              <Icon name="check-circle" size={16} />
              <span className="font-readex text-xs">تم رفع الفيديو: <b className="break-all">{videoName || "الملف"}</b></span>
            </div>
            <video src={objectUrl(videoUrl)} controls className="w-full rounded-xl mt-2 max-h-44 bg-night" />
          </>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-3 flex items-center gap-2">
          <Icon name="edit" size={18} />
          ٢. الأسئلة العشرة
        </h2>
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <div key={i}>
              <label className="font-readex text-xs font-bold block mb-1">{i + 1}. {q}</label>
              <textarea value={answers[i]} rows={2}
                onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            </div>
          ))}
        </div>
        <PrimaryButton className="w-full mt-4" disabled={!videoUrl || !videoProof || uploading || !allAnswered || submit.isPending}
          onClick={() => {
            if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
            submit.mutate({ videoUrl, videoProof, answers: QUESTIONS.map((q, i) => ({ q, a: answers[i].trim() })) });
          }}>
          {submit.isPending ? "جارٍ الإرسال…" : (
            <span className="inline-flex items-center gap-2"><Icon name="send" size={16} />إرسال طلب القبول</span>
          )}
        </PrimaryButton>
      </GlassCard>

      <CertificatesSection demo={DEMO} />
    </div>
  );
}
