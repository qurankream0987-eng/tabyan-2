import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime, isToday } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { demoSchedule } from "@/lib/demo/teacher";

const RANGES = [["today", "اليوم"], ["tomorrow", "غداً"], ["week", "الأسبوع"], ["month", "الشهر"]] as const;
const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";

export default function TeacherSchedule() {
  const [range, setRange] = useState<"today" | "tomorrow" | "week" | "month">("week");
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.schedule.useQuery({ range }, { enabled: !DEMO });
  const data = DEMO ? demoSchedule(range) : q.data;
  const isLoading = !DEMO && q.isLoading;
  const respond = trpc.teacher.respondChangeRequest.useMutation({
    onSuccess: (_, v) => { toast(v.approve ? "قبلت الموعد الجديد" : "اعتذرت عن الموعد الجديد", "success"); utils.teacher.schedule.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const onRespond = (id: string, approve: boolean) => {
    if (DEMO) { toast(DEMO_TOAST, "info"); return; }
    respond.mutate({ id, approve });
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="calendar" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >جدولي</h1>
        <p className="font-readex text-xs text-muted-foreground">الجداول يُنشئها  — يمكنك الرد على طلبات تغيير المواعيد</p>
      </div>

      <div className="flex gap-2">
        {RANGES.map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            className={`flex-1 py-2.5 rounded-2xl font-readex text-sm font-bold transition-all ${range === k ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-bubble" : "bg-burgundy/8 dark:bg-gold/8 text-burgundy"}`}>
            {l}
          </button>
        ))}
      </div>

      {(data?.changeRequests.length ?? 0) > 0 && (
        <GlassCard className="teacher-schedule-card p-4">
          <h2 className="font-amiri text-lg font-bold text-burgundy mb-3 flex items-center gap-2">
            <Icon name="refresh" size={18} />
            طلبات تغيير الموعد
          </h2>
          <div className="space-y-2">
            {data!.changeRequests.map((r) => (
              <div key={r.id} className="teacher-schedule-card rounded-2xl bg-gold/10 dark:bg-gold/8 p-3">
                <div className="font-readex text-sm font-bold">{r.studentName}</div>
                <div className="text-xs text-muted-foreground font-readex">يطلب موعداً جديداً: {fmtDateTime(r.requestedNewTime)}</div>
                {r.reason && <div className="text-xs text-muted-foreground font-readex">السبب: {r.reason}</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onRespond(r.id, true)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-readex font-bold inline-flex items-center justify-center gap-1.5 transition hover:bg-green-700 btn-press">
                    <Icon name="check" size={14} />
                    قبول
                  </button>
                  <button onClick={() => onRespond(r.id, false)} className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-readex font-bold transition hover:bg-destructive/20 btn-press">اعتذار</button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {isLoading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
       !data?.sessions.length ? <EmptyState title="لا حصص في هذه الفترة" /> : (
        <div className="space-y-2">
          {data.sessions.map((s) => (
            <GlassCard key={s.id} className="teacher-schedule-card p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                s.status === "completed" ? "bg-green-500/10 text-green-600" : isToday(s.scheduledAt) ? "bg-red-500/10 text-red-500" : "bg-burgundy/10 text-burgundy"
              }`}>
                <Icon name={s.status === "completed" ? "check-circle" : isToday(s.scheduledAt) ? "video" : "calendar"} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate">{s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}</div>
                <div className="text-[11px] text-muted-foreground font-readex mt-0.5">
                  {s.studentName} · {fmtDateTime(s.scheduledAt)} · {s.durationMinutes} د {s.type === "group" ? "· جماعية" : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={s.status} />
                {["scheduled", "confirmed"].includes(s.status) && (
                  <Link to={`/teacher/session/${s.id}`} className="text-[11px] font-readex text-burgundy font-bold hover:underline">الغرفة ←</Link>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
