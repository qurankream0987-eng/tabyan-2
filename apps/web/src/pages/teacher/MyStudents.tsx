import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { DEMO_MY_STUDENTS } from "@/lib/demo/teacher";

export default function MyStudents() {
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.myStudents.useQuery(undefined, { enabled: !DEMO });
  const rows = DEMO ? DEMO_MY_STUDENTS : (q.data ?? []);
  const isLoading = !DEMO && q.isLoading;

  return (
    <div className="space-y-6 page-enter pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1
            className="hero-greeting font-amiri text-3xl font-bold mb-1"
          >طلابي</h1>
          <p className="font-readex text-sm text-muted-foreground">تتابع مسيرة {rows.length} طالب(ة)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 skeleton rounded-[1.5rem]" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState title="لا طلاب بعد" hint="سيظهر طلابك هنا بعد أول حصة" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => {
            const isAtRisk = s.lastScore != null && s.lastScore < 60;
            const isExcellent = s.lastScore != null && s.lastScore >= 90;
            const borderColor = isAtRisk ? 'border-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : isExcellent ? 'border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-border/50';
            const badgeColor = isAtRisk ? 'bg-destructive/10 text-destructive' : isExcellent ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground';

            return (
              <Link key={s.studentId} to={`/teacher/students/${s.studentId}`}>
                <GlassCard className={`p-5 transition hover:-translate-y-1 hover:shadow-card-hover border ${borderColor}`}>
                  <div className="flex flex-col h-full gap-3">
                    <div className="flex items-start justify-between">
                       <div className="w-12 h-12 rounded-full bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center font-amiri text-xl font-bold border-2 border-burgundy/15 dark:border-gold/15">
                         {s.name.charAt(0)}
                       </div>
                       {s.lastScore != null && (
                         <span className={`px-2 py-1 rounded-xl font-readex text-xs font-bold ${badgeColor}`}>
                           {s.lastScore}/100
                         </span>
                       )}
                    </div>
                    <div>
                      <h3 className="font-readex text-sm font-bold text-foreground truncate">{s.name}</h3>
                      <p className="font-readex text-xs text-muted-foreground mt-0.5">المستوى: {s.levelName || '—'}</p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between font-readex text-xs">
                       <span className="text-muted-foreground flex items-center gap-1"><Icon name="books" size={12}/> {s.totalJuz} أجزاء</span>
                       <span className={`flex items-center gap-1 ${s.nextSessionAt ? 'text-gold' : 'text-muted-foreground'}`}><Icon name="clock" size={12}/> {s.nextSessionAt ? 'موعد قادم' : 'لا يوجد'}</span>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
