import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import { fmtDateTime } from "@/lib/format";

/* متابعة الحلقات — نظرة حية للمشرف: جارية الآن + قادمة، ودخول الحلقة الجارية كمراقب */

function StatusPill({ status }: { status: string }) {
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/15 text-green-700 dark:text-green-400 px-3 py-1 font-readex text-xs font-extrabold">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        جارية الآن
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 text-gold-dark dark:text-gold px-3 py-1 font-readex text-xs font-extrabold">
      <Icon name="clock" size={12} />
      قادمة
    </span>
  );
}

export default function AdminSessionsMonitoring() {
  const navigate = useNavigate();
  const q = trpc.admin.sessionsMonitoring.useQuery(undefined, { refetchInterval: 15000 });
  const rows = q.data ?? [];
  const live = rows.filter((r) => r.status === "in_progress");
  const upcoming = rows
    .filter((r) => r.status !== "in_progress")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (q.isLoading) return <div className="h-40 skeleton rounded-[1.5rem]" />;

  const renderRow = (s: (typeof rows)[number], isLive: boolean) => (
    <GlassCard key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-readex text-sm font-extrabold text-foreground">
            {s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}
          </span>
          <StatusPill status={s.status} />
          <span className="font-readex text-[11px] text-muted-foreground">{s.type === "group" ? "جماعية" : "فردية"}</span>
        </div>
        <div className="font-readex text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><Icon name="user" size={12} />الطالب: {s.studentName}</span>
          <span className="inline-flex items-center gap-1"><Icon name="user" size={12} />المعلم: {s.teacherName}</span>
          {s.levelName && <span className="inline-flex items-center gap-1"><Icon name="graduation" size={12} />{s.levelName}</span>}
          <span className="inline-flex items-center gap-1"><Icon name="calendar" size={12} />{fmtDateTime(s.scheduledAt)} · {s.durationMinutes} دقيقة</span>
        </div>
      </div>
      {isLive ? (
        <button
          type="button"
          onClick={() => navigate(`/admin/session/${s.id}`)}
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy text-white dark:bg-gold dark:text-night px-5 py-2.5 font-readex text-sm font-extrabold btn-press"
        >
          <Icon name="video" size={16} />
          دخول الحلقة
        </button>
      ) : (
        <span className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-input px-5 py-2.5 font-readex text-xs font-bold text-muted-foreground">
          <Icon name="clock" size={14} />
          لم تبدأ الحلقة بعد
        </span>
      )}
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy dark:text-gold">
          <Icon name="video" size={22} />
        </div>
        <div>
          <h1 className="font-amiri text-2xl text-burgundy">متابعة الحلقات</h1>
          <p className="font-readex text-xs text-muted-foreground">مراقبة الحلقات الجارية مباشرة والاطلاع على القادمة — تُحدَّث تلقائياً</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-readex text-sm font-extrabold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          جارية الآن ({live.length})
        </h2>
        {live.length ? live.map((s) => renderRow(s, true)) : (
          <GlassCard className="p-5"><EmptyState title="لا حلقات جارية الآن" hint="ستظهر هنا فور بدء المعلم أي حلقة" /></GlassCard>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-readex text-sm font-extrabold text-foreground flex items-center gap-2">
          <Icon name="calendar" size={16} className="text-gold-dark dark:text-gold" />
          قادمة ({upcoming.length})
        </h2>
        {upcoming.length ? upcoming.map((s) => renderRow(s, false)) : (
          <GlassCard className="p-5"><EmptyState title="لا حلقات قادمة" hint="الحجوزات المؤكدة ستظهر هنا" /></GlassCard>
        )}
      </section>
    </div>
  );
}
