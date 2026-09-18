import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_ASSESSMENTS, DEMO_ATTEMPTS, DEMO_LEVELS, DEMO_QUESTIONS_BANK } from "@/lib/demo/admin-ops";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

export default function AdminAssessments() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<"assessments" | "bank">("assessments");
  const assessments = trpc.admin.assessmentsList.useQuery(undefined, { enabled: !DEMO });
  const bank = trpc.admin.questionsBankList.useQuery(undefined, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const assessmentsData = DEMO ? DEMO_ASSESSMENTS : (assessments.data ?? []);
  const assessmentsLoading = !DEMO && assessments.isLoading;
  const bankData = DEMO ? DEMO_QUESTIONS_BANK : (bank.data ?? []);
  const levelsData = DEMO ? DEMO_LEVELS : (levels.data ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [qOpen, setQOpen] = useState(false);
  const [attemptsFor, setAttemptsFor] = useState<{ id: string; name: string } | null>(null);
  const attempts = trpc.admin.attemptsList.useQuery({ assessmentId: attemptsFor?.id ?? "" }, { enabled: !!attemptsFor && !DEMO });
  const attemptsData = DEMO ? (DEMO_ATTEMPTS[attemptsFor?.id ?? ""] ?? []) : (attempts.data ?? []);
  const attemptsLoading = !DEMO && attempts.isLoading;

  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState<number | undefined>();
  const [pass, setPass] = useState(70);
  const [maxAtt, setMaxAtt] = useState(3);
  const [duration, setDuration] = useState(15);

  const [qType, setQType] = useState<"mcq" | "true_false" | "fill_blank" | "recitation">("mcq");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [qTopic, setQTopic] = useState("");
  const [qAssessmentId, setQAssessmentId] = useState("");

  const invalidate = () => { utils.admin.assessmentsList.invalidate(); utils.admin.questionsBankList.invalidate(); };
  const create = trpc.admin.assessmentCreate.useMutation({
    onSuccess: () => { toast("أُنشئ الاختبار", "success"); setCreateOpen(false); setName(""); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const toggle = trpc.admin.assessmentUpdate.useMutation({
    onSuccess: () => { toast("حُدّث", "success"); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const addQ = trpc.admin.questionAdd.useMutation({
    onSuccess: () => { toast("أُضيف السؤال", "success"); setQOpen(false); setQText(""); setQOptions(""); setQAnswer(""); setQTopic(""); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="file-text" size={24} />الاختبارات وبنك الأسئلة</h1>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => setCreateOpen(true)}>+ اختبار</PrimaryButton>
          <button onClick={() => setQOpen(true)} className="px-4 py-2 rounded-xl bg-gold/20 text-gold-dark dark:text-gold font-readex font-bold text-sm">+ سؤال</button>
        </div>
      </div>

      <div className="flex gap-2">
        {([["assessments", "الاختبارات"], ["bank", `بنك الأسئلة (${bankData.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-xl font-readex text-sm transition ${tab === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
        ))}
      </div>

      {tab === "assessments" ? (
        assessmentsLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
        !assessmentsData.length ? <EmptyState title="لا اختبارات بعد" /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {assessmentsData.map((a) => (
              <GlassCard key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-readex font-bold">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground font-readex mt-1">
                      {a.levelName ? `المستوى: ${a.levelName} · ` : ""}نجاح من {a.passPercentage}٪ · {a.maxAttempts} محاولات
                      {a.durationMinutes ? ` · ${a.durationMinutes} دقيقة` : ""}
                    </div>
                    <div className="text-[11px] font-readex mt-1">{a.questionCount} سؤال · {a.attemptCount} محاولة إجابة</div>
                  </div>
                  <button onClick={() => DEMO ? blocked() : toggle.mutate({ id: a.id, isActive: !a.isActive })}
                    className={`text-[11px] font-readex px-2.5 py-1 rounded-full shrink-0 ${a.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                    {a.isActive ? "مفعّل" : "موقوف"}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setQAssessmentId(a.id); setQOpen(true); }}
                    className="flex-1 py-2 rounded-xl bg-burgundy/10 text-burgundy text-xs font-readex font-bold">+ سؤال لهذا الاختبار</button>
                  <button onClick={() => setAttemptsFor({ id: a.id, name: a.name })}
                    className="flex-1 py-2 rounded-xl bg-gold/15 text-gold-dark dark:text-gold text-xs font-readex font-bold">النتائج ({a.attemptCount})</button>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      ) : (
        !bankData.length ? <EmptyState title="بنك الأسئلة فارغ" /> : (
          <div className="space-y-2">
            {bankData.map((q) => (
              <GlassCard key={q.id} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-readex bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">
                    {q.type === "mcq" ? "اختيارات" : q.type === "true_false" ? "صح/خطأ" : q.type === "fill_blank" ? "فراغ" : "تلاوة"}
                  </span>
                  {q.topic && <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{q.topic}</span>}
                </div>
                <p className="font-readex text-sm">{q.questionText}</p>
                {q.correctAnswer && <p className="font-readex text-[11px] text-green-700 dark:text-green-400 mt-1 flex items-center gap-1"><Icon name="check" size={12} />{q.correctAnswer}</p>}
              </GlassCard>
            ))}
          </div>
        )
      )}

      {/* Create assessment */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <h3 className="font-amiri text-xl text-burgundy text-center">إنشاء اختبار</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الاختبار *"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
          <select value={levelId ?? ""} onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
            <option value="">بدون مستوى محدد</option>
            {(levelsData).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-readex text-[11px] font-bold block mb-1">النجاح من ٪</label>
              <input type="text" inputMode="numeric" minLength={1} value={pass} onChange={(e) => setPass(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))} dir="ltr"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
            </div>
            <div>
              <label className="font-readex text-[11px] font-bold block mb-1">المحاولات</label>
              <input type="text" inputMode="numeric" minLength={1} value={maxAtt} onChange={(e) => setMaxAtt(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))} dir="ltr"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
            </div>
            <div>
              <label className="font-readex text-[11px] font-bold block mb-1">الدقائق</label>
              <input type="text" inputMode="numeric" minLength={1} value={duration} onChange={(e) => setDuration(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))} dir="ltr"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
            </div>
          </div>
          <PrimaryButton className="w-full" disabled={name.trim().length < 3 || create.isPending}
            onClick={() => DEMO ? blocked() : create.mutate({ name: name.trim(), levelId, passPercentage: pass, maxAttempts: maxAtt, durationMinutes: duration })}>
            إنشاء
          </PrimaryButton>
        </div>
      </Modal>

      {/* Add question */}
      <Modal open={qOpen} onClose={() => setQOpen(false)}>
        <div className="space-y-3">
          <h3 className="font-amiri text-xl text-burgundy text-center">إضافة سؤال</h3>
          <select value={qAssessmentId} onChange={(e) => setQAssessmentId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
            <option value="">بنك الأسئلة العام (غير مرتبط باختبار)</option>
            {assessmentsData.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex gap-2">
            {([["mcq", "اختيارات"], ["true_false", "صح/خطأ"], ["fill_blank", "فراغ"], ["recitation", "تلاوة"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setQType(k)} className={`flex-1 py-2 rounded-xl text-xs font-readex ${qType === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
            ))}
          </div>
          <textarea value={qText} onChange={(e) => setQText(e.target.value)} rows={2} placeholder="نص السؤال *"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm resize-none" />
          {qType === "mcq" && (
            <input value={qOptions} onChange={(e) => setQOptions(e.target.value)} placeholder="الخيارات مفصولة بفاصلة: أ، ب، ج، د"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
          )}
          <input value={qAnswer} onChange={(e) => setQAnswer(e.target.value)} placeholder="الإجابة الصحيحة"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
          <input value={qTopic} onChange={(e) => setQTopic(e.target.value)} placeholder="الموضوع (مثال: النون الساكنة)"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
          <PrimaryButton className="w-full" disabled={qText.trim().length < 3 || addQ.isPending}
            onClick={() => DEMO ? blocked() : addQ.mutate({
              assessmentId: qAssessmentId || undefined, type: qType, questionText: qText.trim(),
              options: qType === "mcq" ? qOptions.split("،").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean) : undefined,
              correctAnswer: qAnswer || undefined, topic: qTopic || undefined, isBankQuestion: !qAssessmentId,
            })}>
            إضافة
          </PrimaryButton>
        </div>
      </Modal>

      {/* Attempts */}
      <Modal open={!!attemptsFor} onClose={() => setAttemptsFor(null)} className="max-w-2xl">
        {attemptsFor && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">نتائج: {attemptsFor.name}</h3>
            {attemptsLoading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
             !attemptsData.length ? <p className="text-center font-readex text-sm text-muted-foreground">لا محاولات بعد</p> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {attemptsData.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
                    <div className="flex-1">
                      <div className="font-readex text-sm font-bold">{a.studentName}</div>
                      <div className="text-[11px] text-muted-foreground font-readex">{fmtDateTime(a.createdAt)}</div>
                    </div>
                    <span className="font-amiri text-lg text-burgundy">{a.score}٪</span>
                    <span className={`text-[11px] font-readex px-2 py-1 rounded-full ${a.passed ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-destructive/15 text-destructive"}`}>
                      {a.passed ? "ناجح" : "راسب"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
