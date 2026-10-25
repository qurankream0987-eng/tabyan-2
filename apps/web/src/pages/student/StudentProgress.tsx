import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { DEMO_PROGRESS } from "@/lib/demo/student-extra";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  completed: { label: "مكتمل", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  in_progress: { label: "جارٍ", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  locked: { label: "مقفل", cls: "bg-muted text-muted-foreground" },
};

export default function StudentProgress() {
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.student.progress.useQuery(undefined, { enabled: !DEMO });
  const rows = DEMO ? DEMO_PROGRESS : (data ?? []);

  if (!DEMO && isLoading) return (
    <div className="space-y-3 page-enter">
      {[1, 2, 3].map((i) => <div key={i} className="h-28 skeleton rounded-[1.5rem]" />)}
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy">
          <Icon name="chart" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold mt-2"
        >تقدمي</h1>
        <p className="font-readex text-sm text-muted-foreground">متابعة مستوياتك وإنجازك في كل مسار</p>
      </div>

      {!rows.length ? (
        <EmptyState title="لا تقدم بعد" hint="ابدأ أول حلقة ليظهر تقدمك هنا" />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const score = Math.min(100, Math.max(0, Number(p.averageScore)));
            const st = STATUS_META[p.status] ?? STATUS_META.locked;
            return (
              <GlassCard key={p.levelId} hover={false} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-amiri text-lg font-bold text-burgundy">{p.name}</div>
                    <div className="font-readex text-xs text-muted-foreground mt-0.5">
                      {p.completedSessions} حلقة · {p.completedJuz} أجزاء
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-readex font-bold shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-readex text-muted-foreground mb-1">
                    <span>متوسط التقييم</span>
                    <span dir="ltr">{score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-burgundy/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-burgundy to-gold transition-all duration-500" style={{ width: `${score}%` }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
