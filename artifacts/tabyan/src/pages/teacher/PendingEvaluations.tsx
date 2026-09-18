import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_PENDING_EVALUATIONS } from "@/lib/demo/teacher";

export default function PendingEvaluations() {
  const navigate = useNavigate();
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.pendingEvaluations.useQuery(undefined, { enabled: !DEMO });
  const rows = DEMO ? DEMO_PENDING_EVALUATIONS : (q.data ?? []);
  const isLoading = !DEMO && q.isLoading;

  return (
    <div className="space-y-4 page-enter">
      <button
        type="button"
        onClick={() => navigate("/teacher")}
        className="inline-flex items-center gap-2 rounded-xl bg-burgundy/10 px-4 py-2 text-burgundy font-readex text-sm font-bold transition hover:bg-burgundy/15 btn-press"
      >
        <Icon name="arrow-right" size={17} />
        رجوع
      </button>
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="edit" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >تقييمات معلقة</h1>
        <p className="font-readex text-sm text-muted-foreground">حصص مكتملة بانتظار تقييمك</p>
      </div>
      {isLoading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
       !rows.length ? <EmptyState title="لا تقييمات معلقة" hint="أحسنت! كل الحصص المكتملة مُقيَّمة" /> : (
        <div className="space-y-2">
          {rows.map((s) => (
            <GlassCard key={s.id} className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 icon-bubble text-gold shrink-0">
                <Icon name="edit" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate">{s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}</div>
                <div className="text-[11px] text-muted-foreground font-readex mt-0.5">{s.studentName} · {fmtDateTime(s.scheduledAt)}</div>
              </div>
              <Link to={`/teacher/evaluate/${s.id}`}
                className="px-4 py-2 rounded-xl bg-burgundy text-white dark:bg-gold dark:text-night text-xs font-readex font-bold transition btn-press hover:opacity-90 shrink-0">
                قيّم الآن
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
