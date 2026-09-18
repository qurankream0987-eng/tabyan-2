import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { DAY_AR } from "@/lib/format";

// ترتيب العرض: السبت أولاً — أما تحويل getDay() فيبقى على ترتيب JS (الأحد=0)
const DAY_ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const JS_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function StudentSchedule() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.student.mySessions.useQuery();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [newDay, setNewDay] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");

  const cancel = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { toast("تم إرسال طلب إلغاء الحجز", "success"); setCancelId(null); utils.student.mySessions.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const change = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { toast("تم إرسال طلب التغيير", "success"); setChangeId(null); setNewDay(""); setNewTime(""); setReason(""); utils.student.mySessions.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const activeBookings = (sessions ?? []).filter((b) => b.status === "scheduled" || b.status === "confirmed").map((b) => {
    const date = new Date(b.scheduledAt);
    const dayOfWeek = JS_DAY_KEYS[date.getDay()];
    const timeSlot = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { ...b, dayOfWeek, timeSlot, currentStudents: 1, maxStudents: 1, levelName: "" };
  });
  const grouped = DAY_ORDER.filter((d) => activeBookings.some((b) => b.dayOfWeek === d));

  if (isLoading) return (
    <div className="space-y-3 page-enter">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}
    </div>
  );

  return (
    <div className="space-y-6 page-enter pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1
            className="hero-greeting font-amiri text-3xl font-bold mb-1"
          >جدولي الأسبوعي</h1>
        </div>
      </div>

      {!activeBookings.length ? (
        <GlassCard hover={false} className="p-10 text-center" style={{ borderStyle: "dashed" } as React.CSSProperties}>
          <div className="w-20 h-20 icon-bubble flex items-center justify-center mx-auto mb-4 text-burgundy">
            <Icon name="calendar" size={36} />
          </div>
          <p className="font-amiri text-2xl text-foreground mb-2">لا مواعيد محجوزة بعد</p>
          <p className="font-readex text-sm text-muted-foreground mb-6 max-w-sm mx-auto">ابدأ بحجز موعدك الأول لبدء رحلة التعلم</p>
          <Link to="/student/booking" className="inline-flex items-center gap-2 px-8 py-3 btn-bubble btn-primary-bubble font-readex text-base font-bold">
            <Icon name="plus" size={16} /> سجل الآن
          </Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.map((day) => (
            <div key={day} className="space-y-3">
              <h3 className="font-readex text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
                  <Icon name="calendar" size={13} />
                </div>
                {DAY_AR[day]}
              </h3>
              <div className="space-y-3">
                {activeBookings.filter((b) => b.dayOfWeek === day).map((b) => (
                  <GlassCard key={b.id} hover={false} className="p-4 flex flex-col transition hover:shadow-card-hover group">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-burgundy/5 dark:bg-gold/5 text-burgundy flex items-center justify-center shrink-0 border border-burgundy/10 dark:border-gold/10">
                        <span className="font-readex font-extrabold text-sm" dir="ltr">{b.timeSlot}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-readex font-bold text-sm text-foreground mb-1">{b.teacherName}</div>
                        <div className="flex flex-wrap gap-1 text-[11px] font-readex text-muted-foreground">
                          <span className="bg-muted px-2 py-0.5 rounded-full">{b.typeLabel}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full">{b.durationMinutes} د</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => { setChangeId(b.id); setNewDay(b.dayOfWeek); setNewTime(b.timeSlot); setReason(""); }}
                        className="py-2 rounded-xl bg-burgundy/5 dark:bg-gold/5 text-burgundy font-readex text-xs font-bold transition hover:bg-burgundy hover:text-white dark:hover:bg-gold dark:hover:text-night btn-press"
                      >
                        تغيير
                      </button>
                      <button
                        onClick={() => setCancelId(b.id)}
                        className="py-2 rounded-xl bg-destructive/5 text-destructive font-readex text-xs font-bold transition hover:bg-destructive hover:text-white btn-press"
                      >
                        إلغاء
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeBookings.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <GlassCard hover={false} className="p-5 flex items-start gap-3 bg-burgundy/5 dark:bg-gold/5 border-none">
            <Icon name="shield" size={20} className="text-burgundy/50/50 mt-0.5 shrink-0" />
            <div className="font-readex text-sm text-muted-foreground">
              <p className="font-bold text-foreground mb-1">تعليمات المواعيد الثابتة</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>المواعيد أعلاه ثابتة وتتكرر أسبوعياً حتى انتهائك من المستوى.</li>
                <li>يُسمح بتغيير الموعد مرة واحدة شهرياً وفق الأوقات المتاحة للمعلم.</li>
                <li>إلغاء الموعد نهائياً يتطلب مراجعة من الإدارة لتأكيد الإلغاء.</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Modals remain the same functionally, with updated btn styles */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)}>
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
             <Icon name="x" size={24} />
          </div>
          <h3 className="font-readex text-xl font-bold text-center text-foreground">تأكيد الإلغاء</h3>
          <p className="font-readex text-sm text-center text-muted-foreground">هل أنت متأكد من رغبتك في إلغاء هذا الحجز الأسبوعي؟ لا يمكن التراجع عن هذا الإجراء إلا بطلب جديد.</p>
          <div className="flex gap-2 pt-2">
            <PrimaryButton className="flex-1 !bg-destructive !text-white border-none shadow-none" onClick={() => cancelId && cancel.mutate({ sessionId: cancelId, requestedNewTime: "cancel", reason: "cancel" })}>
              {cancel.isPending ? "جارٍ الإلغاء…" : "تأكيد الإلغاء"}
            </PrimaryButton>
            <button onClick={() => setCancelId(null)} className="flex-1 py-2 rounded-full bg-muted font-readex text-sm font-bold text-foreground transition hover:bg-muted/80 btn-press">تراجع</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!changeId} onClose={() => setChangeId(null)}>
        <div className="space-y-4">
          <h3 className="font-readex text-xl font-bold text-foreground text-center">طلب تغيير الموعد</h3>
          <div className="space-y-3 text-start">
             <div>
               <label className="font-readex text-sm font-bold block text-muted-foreground mb-1.5">اليوم الجديد</label>
               <div className="flex flex-wrap gap-2">
                 {DAY_ORDER.map((d) => (
                   <button key={d} onClick={() => setNewDay(d)} className={`px-4 py-2 rounded-full text-xs font-bold font-readex transition btn-press ${newDay === d ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-muted text-foreground hover:bg-muted/80"}`}>
                     {DAY_AR[d]}
                   </button>
                 ))}
               </div>
             </div>
             <div>
               <label className="font-readex text-sm font-bold block text-muted-foreground mb-1.5">الوقت الجديد</label>
               <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                 className="w-full rounded-xl border border-border bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-burgundy dark:focus:ring-gold transition" />
             </div>
             <div>
               <label className="font-readex text-sm font-bold block text-muted-foreground mb-1.5">السبب (اختياري)</label>
               <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500}
                 placeholder="اذكر سبب طلب التغيير (مثل: تعارض مع وقت الدوام)..."
                 className="w-full rounded-xl border border-border bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-burgundy dark:focus:ring-gold resize-none transition" />
             </div>
          </div>
          <div className="flex gap-2 pt-2">
            <PrimaryButton className="flex-1" disabled={!newDay || !newTime || change.isPending}
              onClick={() => changeId && change.mutate({ sessionId: changeId, requestedNewTime: `${newDay} ${newTime}`, reason: reason || "change" })}>
              {change.isPending ? "جاري الإرسال…" : "إرسال الطلب"}
            </PrimaryButton>
            <button onClick={() => setChangeId(null)} className="flex-1 py-2 rounded-full bg-muted font-readex text-sm font-bold text-foreground transition hover:bg-muted/80 btn-press">تراجع</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
