import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import CountdownChip from "@/components/CountdownChip";
import EmptyState from "@/components/EmptyState";
import { authStore } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { DEMO_DASHBOARD } from "@/lib/demo/teacher";
import Icon from "@/components/Icon";

export default function TeacherHome() {
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.dashboard.useQuery(undefined, { enabled: !DEMO });
  const d = DEMO ? DEMO_DASHBOARD : q.data;
  const isLoading = !DEMO && q.isLoading;
  const isError = !DEMO && q.isError;

  if (isLoading) return (
    <div className="space-y-4 page-enter">
      <div className="space-y-2">
        <div className="h-7 w-2/3 skeleton rounded-2xl" />
        <div className="h-4 w-1/2 skeleton rounded-xl" />
      </div>
      <div className="h-40 skeleton rounded-[1.5rem]" />
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-20 skeleton rounded-2xl" />)}
      </div>
    </div>
  );

  if (isError || !d) return (
    <div className="space-y-5 page-enter">
      <GlassCard hover={false} className="p-6 text-center">
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto mb-3 hidden dark:block logo-dark" />
        <h1 className="font-amiri text-2xl text-burgundy">
          مرحباً {authStore.name ?? "أيها المعلم"}
        </h1>
        <p className="font-readex text-xs text-muted-foreground mt-1">«خيركم من تعلّم القرآن وعلّمه»</p>
      </GlassCard>
      <GlassCard hover={false} className="p-5 text-center text-muted-foreground font-readex text-sm">
        تعذّر تحميل البيانات — تحقق من الاتصال
      </GlassCard>
    </div>
  );

  const stats = [
    { v: d.weekCount,                    l: "حصص الأسبوع",   icon: "calendar"   as const },
    { v: d.studentsCount,                l: "طلابي",          icon: "user"       as const },
    { v: d.summary.pendingEvaluations,   l: "تقييمات",        icon: "graduation" as const },
    { v: d.summary.avgRating,            l: "تقييمي",         icon: "star"       as const },
  ];

  return (
    <div className="space-y-5 page-enter">

      {/* ── Hero greeting card ── */}
      <GlassCard hover={false} className="relative overflow-hidden p-6 text-center">
        {/* Subtle gold radial glow */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,175,55,0.12), transparent 70%)" }} />

        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 hidden dark:block logo-dark" />

        <h1 className="hero-greeting font-amiri text-2xl font-bold mb-0.5">
          مرحباً {authStore.name ?? "أيها المعلم"}
        </h1>
        <p className="font-readex text-xs text-muted-foreground">«خيركم من تعلّم القرآن وعلّمه»</p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-burgundy/6 dark:bg-gold/6 border border-burgundy/8 dark:border-gold/8 py-3 px-1 flex flex-col items-center gap-1 transition hover:bg-burgundy/10 dark:hover:bg-gold/10">
              <Icon name={s.icon} size={15} className="text-gold" />
              <div className="font-amiri text-xl text-burgundy font-bold">{s.v}</div>
              <div className="text-[9.5px] font-readex text-muted-foreground leading-tight text-center">{s.l}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Next session ── */}
      <section>
        <h2 className="font-amiri text-xl text-burgundy mb-3 font-bold">حصتك القادمة</h2>
        {!d.nextSession ? (
          <EmptyState title="لا حصص قادمة" hint="سيظهر هنا أقرب موعد" />
        ) : (
          <GlassCard hover={false} className="p-4 border-2 border-gold/25 dark:border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 icon-bubble text-burgundy shrink-0">
                <Icon name="graduation" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex font-bold text-sm text-foreground">
                  {d.nextSession.typeLabel}{d.nextSession.topic ? ` — ${d.nextSession.topic}` : ""}
                </div>
                <div className="text-xs text-muted-foreground font-readex mt-0.5">
                  الطالب: {d.nextSession.studentName} · {fmtDateTime(d.nextSession.scheduledAt)}
                </div>
              </div>
              <CountdownChip deadline={d.nextSession.scheduledAt} />
            </div>
            <Link
              to={`/teacher/session/${d.nextSession.id}`}
              className="flex items-center justify-center gap-2 mt-4 w-full py-2.5 btn-bubble btn-primary-bubble font-readex text-sm font-bold"
            >
              <Icon name="video" size={16} />
              دخول غرفة الحصة
            </Link>
          </GlassCard>
        )}
      </section>

      {/* ── Week summary ── */}
      <GlassCard hover={false} className="p-5">
        <h2 className="font-amiri text-xl text-burgundy mb-4 font-bold">ملخص الأسبوع</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: d.summary.completedThisWeek, l: "حصة مكتملة",   icon: "check"    as const },
            { v: d.summary.teachingHours,     l: "ساعات التدريس", icon: "calendar" as const },
            { v: d.recordingsThisMonth,       l: "تسجيل الشهر",   icon: "bookmark" as const },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-burgundy/5 dark:bg-gold/5 border border-burgundy/8 dark:border-gold/8 py-4 flex flex-col items-center gap-1.5 transition hover:bg-burgundy/10 dark:hover:bg-gold/10">
              <Icon name={s.icon} size={16} className="text-gold" />
              <div className="font-amiri text-2xl text-burgundy font-bold" dir="ltr">{s.v}</div>
              <div className="text-[10.5px] font-readex text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/teacher/evaluations">
          <GlassCard className="p-4 text-center h-full flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 icon-bubble text-burgundy">
              <Icon name="graduation" size={22} />
            </div>
            <div className="font-readex font-bold text-sm text-foreground">تقييمات معلقة</div>
            <div className="text-[11px] text-muted-foreground font-readex">{d.summary.pendingEvaluations} بانتظارك</div>
          </GlassCard>
        </Link>
        <Link to={d.pendingFatwas != null ? "/teacher/fatwas" : "/teacher/schedule"}>
          <GlassCard className="p-4 text-center h-full flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 icon-bubble text-burgundy">
              <Icon name={d.pendingFatwas != null ? "books" : "calendar"} size={22} />
            </div>
            <div className="font-readex font-bold text-sm text-foreground">
              {d.pendingFatwas != null ? "صندوق الفتاوى" : "جدولي"}
            </div>
            <div className="text-[11px] text-muted-foreground font-readex">
              {d.pendingFatwas != null ? `${d.pendingFatwas} سؤال معلق` : "مواعيدي وطلبات التغيير"}
            </div>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
}
