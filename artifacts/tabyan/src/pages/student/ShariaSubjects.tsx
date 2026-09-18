import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon, { type IconName } from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { SHARIA_SUBJECT_META } from "@/lib/shariaMeta";
import { demoShariaSubjects, DEMO_SHARIA_SUMMARY } from "@/lib/demo/sharia-demo";

export { SHARIA_SUBJECT_META } from "@/lib/shariaMeta";

export function ShariaProgressBar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-burgundy/10 dark:bg-white/10 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-l from-gold to-gold-dark transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

type AnyLevel = { id: number | string; name: string; order: number; status: string; progressPercentage: number; contentCount?: number };
type AnySubject = { key: string; name: string; description?: string | null; icon?: string | null; color?: string | null; levels: AnyLevel[] };

/** الدروس الشرعية — الصفحة الرئيسية: ملخص التقدم + إكمال التعلم + المواد الثلاث (العقيدة بخمسة مستويات، الفقه، السيرة) */
export default function ShariaSubjects() {
  const DEMO = authStore.isDemo;
  const subjectsQ = trpc.sharia.subjects.useQuery(undefined, { enabled: !DEMO });
  const summaryQ = trpc.sharia.summary.useQuery(undefined, { enabled: !DEMO });

  const subjects = (DEMO ? demoShariaSubjects() : subjectsQ.data ?? []) as AnySubject[];
  const summary = (DEMO ? DEMO_SHARIA_SUMMARY : summaryQ.data) as
    | { total: number; completed: number; remaining: number; percentage: number; lastStudied: null | { contentId: string; title: string; levelName: string; subjectName: string; progressPercentage: number } }
    | undefined;
  const isLoading = !DEMO && subjectsQ.isLoading;

  // بطاقات المواد — القائمة وترتيبها من الخادم (تُدار من لوحة الإدارة)؛ الهوية البصرية احتياط من الثوابت
  const cards = subjects.map((s) => {
    const fb = SHARIA_SUBJECT_META[s.key];
    const meta = { icon: (s.icon ?? fb?.icon ?? "books") as IconName, color: s.color ?? fb?.color ?? "#800020" };
    return { key: s.key, name: s.name, levels: s.levels ?? [], meta };
  });

  const last = summary?.lastStudied ?? null;

  if (!isLoading && !cards.length) {
    return (
      <div className="space-y-4 page-enter max-w-lg mx-auto">
        <EmptyState title="لا مواد متاحة حالياً" hint="ستُضاف مواد الدروس الشرعية قريباً بإذن الله" />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      {/* ── الترويسة ── */}
      <div className="text-center pt-2">
        <h1 className="font-amiri text-3xl font-extrabold text-burgundy mb-1.5">الدروس الشرعية</h1>
        <p className="font-readex text-sm text-muted-foreground leading-relaxed px-4">
          العلم الشرعي نورٌ يُقود إلى العمل — مواد اختيارية{cards.length ? `: ${cards.map((c) => c.name).join("، ")}` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[28px]" />)}</div>
      ) : (
        <>
          {/* ── ملخص التقدم ── */}
          {summary && (
            <GlassCard hover={false} className="relative overflow-hidden border-none p-0">
              <div className="absolute inset-0 rounded-[1.5rem]" style={{ background: "linear-gradient(135deg, #800020 0%, #A02040 60%, #5F1530 100%)" }} />
              <div className="absolute inset-0 opacity-20 rounded-[1.5rem]" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.55) 0%, transparent 70%)" }} />
              <div className="relative z-10 px-5 py-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="font-readex text-xs font-bold text-gold mb-1">مسيرتك في العلم الشرعي</div>
                    <div className="font-amiri text-3xl font-extrabold text-gold leading-none">
                      {summary.percentage}<span className="text-lg text-gold">%</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-full border-2 border-gold/40 bg-gold/15 flex items-center justify-center text-gold">
                    <Icon name="graduation" size={26} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: summary.completed, l: "درساً مكتملاً" },
                    { v: summary.remaining, l: "درساً متبقياً" },
                    { v: last?.levelName ?? "—", l: "مستواك الحالي" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-white/10 px-2 py-2.5">
                      <div className="font-readex text-base font-extrabold text-gold truncate">{s.v}</div>
                      <div className="font-readex text-[10px] text-gold mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* ── المواد الثلاث ── */}
          <div className="flex flex-col gap-3 pt-1">
            {cards.map((c, i) => (
              <Link key={c.key} to={`/student/sharia/${c.key}`} className="block stagger-in group" style={{ animationDelay: `${i * 80}ms` }}>
                <GlassCard className="p-0 overflow-hidden rounded-[24px] btn-press">
                  <div className="p-3 flex gap-3 items-center">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                      style={{ backgroundColor: `${c.meta.color}1f`, color: c.meta.color }}
                    >
                      <Icon name={c.meta.icon} size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-readex font-extrabold text-sm text-foreground">{c.name}</span>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
                      <Icon name="arrow-left" size={14} />
                    </span>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
