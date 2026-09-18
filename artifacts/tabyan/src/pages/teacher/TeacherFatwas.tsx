import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { FATWA_CATEGORIES } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_FATWA_INBOX } from "@/lib/demo/teacher";
import { userFacingErrorMessage } from "@/lib/user-facing-error";

type Item = {
  id: string; questionText: string; category: string; status: string; priority: string;
  assignedAt: string | Date | null; createdAt: string | Date | null; studentName: string;
  answerId: string | null; answerStatus: string | null; hoursAgo: number;
};

export default function TeacherFatwas() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.fatwaInbox.useQuery(undefined, { enabled: !DEMO });
  const data = DEMO ? DEMO_FATWA_INBOX : q.data;
  const isLoading = !DEMO && q.isLoading;
  const [sel, setSel] = useState<Item | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const answer = trpc.teacher.answerFatwa.useMutation({
    onSuccess: () => {
      toast("تم إرسال الإجابة للمراجعة", "success");
      setSel(null); setAnswerText(""); setReferenceText(""); setAudioUrl("");
      utils.teacher.fatwaInbox.invalidate();
    },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر حفظ الإجابة، حاول مرة أخرى"), "error"),
  });

  if (isLoading) return <div className="h-40 skeleton rounded-[1.5rem]" />;
  if (!data?.isMufti) return (
    <div className="pt-10"><EmptyState title="ليست لديك صلاحية الإفتاء" hint="يُعيّن  المفتين من معلمي المنصة" /></div>
  );

  const pending = (data.items as Item[]).filter((i) => i.status === "assigned");
  const answered = (data.items as Item[]).filter((i) => i.status !== "assigned");

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">
          <Icon name="mosque" size={22} />
          صندوق الفتاوى
        </h1>
        <p className="font-readex text-sm text-muted-foreground">{pending.length} سؤالاً بانتظار إجابتك — الحد الأقصى 20</p>
      </div>

      <section>
        <h2 className="font-amiri text-lg text-burgundy mb-2">بانتظار الإجابة</h2>
        {!pending.length ? <EmptyState title="لا أسئلة معلقة" /> : (
          <div className="space-y-2">
            {pending.map((f) => (
              <GlassCard key={f.id} className="p-4" onClick={() => setSel(f)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{FATWA_CATEGORIES[f.category]}</span>
                  {f.priority === "urgent" && (
                    <span className="text-[10px] font-readex bg-destructive/15 text-destructive px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Icon name="flame" size={11} />
                      عاجل
                    </span>
                  )}
                  <span className={`text-[10px] font-readex mr-auto inline-flex items-center gap-1 ${f.hoursAgo >= 36 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    <Icon name="timer" size={12} />
                    منذ {f.hoursAgo} ساعة{f.hoursAgo >= 36 ? " — يُعاد إسناده عند 48" : ""}
                  </span>
                </div>
                <p className="font-readex text-sm line-clamp-2">{f.questionText}</p>
                <div className="text-[11px] text-muted-foreground font-readex mt-1">السائل: {f.studentName}</div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {answered.length > 0 && (
        <section>
          <h2 className="font-amiri text-lg text-burgundy mb-2">أجبت عنها</h2>
          <div className="space-y-2">
            {answered.map((f) => (
              <GlassCard key={f.id} className="p-4 opacity-80">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={f.answerStatus ?? f.status} />
                  <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{FATWA_CATEGORIES[f.category]}</span>
                </div>
                <p className="font-readex text-sm line-clamp-1">{f.questionText}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Answer modal */}
      <Modal open={!!sel} onClose={() => setSel(null)} className="max-w-2xl">
        {sel && (
          <div className="space-y-3">
            <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-4">
              <div className="font-readex text-xs text-muted-foreground mb-1">سؤال {sel.studentName} — {FATWA_CATEGORIES[sel.category]}</div>
              <p className="font-readex text-sm leading-relaxed">{sel.questionText}</p>
            </div>
            <div>
              <label className="font-readex text-sm font-bold block mb-1">الإجابة <span className="text-muted-foreground font-normal">(50–2000 حرف)</span></label>
              <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={7} maxLength={2000}
                placeholder="الحمد لله… (ابدأ بالحمدلة واختم بـ«والله أعلم»)"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
              <div className="text-left text-[11px] text-muted-foreground font-readex" dir="ltr">{answerText.length}/2000</div>
            </div>
            <input value={referenceText} onChange={(e) => setReferenceText(e.target.value)} placeholder="المرجع (اختياري): الآية/الحديث/الفتاوى…"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
            <div>
              <label className="font-readex text-sm font-bold block mb-1">التسجيل الصوتي <span className="text-muted-foreground font-normal">(اختياري — حتى 10 دقائق)</span></label>
              <input dir="ltr" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://… رابط الصوت (اختياري)"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-xs focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
            <PrimaryButton className="w-full"
              disabled={answerText.trim().length < 50 || answer.isPending}
              onClick={() => {
                if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
                answer.mutate({ questionId: sel.id, answerText: answerText.trim(), referenceText: referenceText || undefined, audioUrl: audioUrl || undefined });
              }}>
              {answer.isPending ? "جارٍ الإرسال…" : (
                <span className="inline-flex items-center gap-2"><Icon name="send" size={16} />إرسال الإجابة للمراجعة</span>
              )}
            </PrimaryButton>
            <p className="text-[10px] text-muted-foreground font-readex text-center">تراجع الإدارة إجابتك قبل نشرها للطالب</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
