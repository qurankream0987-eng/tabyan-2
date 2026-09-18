import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { hoursSince } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_ACTIVE_ADMINS, DEMO_KPIS } from "@/lib/demo/admin-core";

// ── Icon primitives ──────────────────────────────────────────────────────────
const ico = (d: string | string[], w = 18) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const IcoUp       = () => ico(["M12 19V5", "M5 12l7-7 7 7"]);
const IcoScroll   = () => ico(["M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z","M14 2v6h6","M16 13H8","M16 17H8"]);
const IcoVideo    = () => ico(["M23 7l-7 5 7 5V7z","M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z"]);
const IcoBadge    = () => ico(["M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z","M9 12l2 2 4-4"]);
const IcoMsg      = () => ico("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
const IcoClock    = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const IcoUsers    = () => ico(["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"], 22);
const IcoCalendar = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IcoCheck    = () => ico(["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"], 22);
const IcoStar     = () => ico("M6 3h12l4 6-10 13L2 9z", 22);
const IcoShield   = () => ico("M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z", 22);

export default function AdminHome() {
  const DEMO = authStore.isDemo;
  const kpis   = trpc.admin.kpis.useQuery(undefined, { refetchInterval: 30000, enabled: !DEMO });
  const admins = trpc.admin.activeAdmins.useQuery(undefined, { enabled: !DEMO });

  if (!DEMO && kpis.isLoading) return (
    <div className="space-y-4 page-enter">
      <div className="h-8 w-2/3 skeleton rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-[1.5rem]" />)}
      </div>
    </div>
  );

  const k = DEMO ? DEMO_KPIS : kpis.data;
  if (!k) return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-3xl text-burgundy font-bold">لوحة التحكم المركزية</h1>
      <GlassCard hover={false} className="p-6 text-center text-muted-foreground font-readex">
        تعذّر تحميل البيانات — تحقق من الاتصال
      </GlassCard>
    </div>
  );

  const u = k.urgent;
  const adminsRows: { id: string; fullName: string; phone: string | null; lastActivity: string | Date | null }[] =
    DEMO ? DEMO_ACTIVE_ADMINS : (admins.data ?? []);

  const urgentItems = [
    { label: "طلبات ترقية",             count: u.pendingReviews,   to: "/admin/promotions",     Icon: IcoUp },
    { label: "شهادات إجازة",            count: u.pendingQiraat,    to: "/admin/qiraat",          Icon: IcoScroll },
    { label: "اختبارات تحديد المستوى",  count: u.pendingPlacement, to: "/admin/students-review", Icon: IcoVideo },
    { label: "قبول المعلمين",           count: u.pendingKyc,       to: "/admin/teachers-review", Icon: IcoBadge },
    { label: "فتاوى بلا إسناد",         count: u.pendingFatwas,    to: "/admin/fatwas",          Icon: IcoMsg },
    { label: "فتاوى متأخرة +48 ساعة",   count: u.lateFatwas48h,    to: "/admin/fatwas",          Icon: IcoClock },
  ];

  const kpiCards = [
    { v: k.activeStudents, l: "طالب نشط",              Icon: IcoUsers,    accent: true },
    { v: k.sessionsToday,  l: "حصص اليوم",              Icon: IcoCalendar, accent: false },
    { v: k.completedMonth, l: "حصص مكتملة هذا الشهر",   Icon: IcoCheck,    accent: false },
    { v: `${k.avgRating}`, l: "متوسط تقييم الطلاب",     Icon: IcoStar,     accent: true },
  ];

  return (
    <div className="space-y-5 page-enter">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 icon-bubble text-burgundy shrink-0">
          <IcoShield />
        </div>
        <div>
          <h1 className="hero-greeting font-amiri text-2xl font-bold leading-tight">
            لوحة التحكم المركزية
          </h1>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((s, i) => (
          <GlassCard key={s.l} hover={false}
            className="p-4 sm:p-5 relative overflow-hidden stagger-in min-w-0"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Sparkline watermark */}
            <div className="absolute top-3 end-3 opacity-25">
              <svg width="56" height="18" viewBox="0 0 60 20" fill="none" className="text-gold">
                <path d="M0 15 L10 10 L20 12 L30 5 L40 8 L50 2 L60 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-gold mb-2">
              <s.Icon />
            </div>
            <div className="font-amiri text-2xl sm:text-3xl font-bold text-burgundy mt-1 truncate">{s.v}</div>
            <div className="font-readex text-xs text-muted-foreground mt-1 leading-tight">{s.l}</div>
          </GlassCard>
        ))}
      </div>

      {/* ── Urgent queue ── */}
      <GlassCard hover={false} className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-amiri text-xl text-burgundy font-bold">يحتاج تدخّلك الآن</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {urgentItems.map((it) => (
            <Link key={it.label + it.to} to={it.to}
              className={`flex items-center gap-2.5 rounded-2xl p-3 min-h-14 transition-all btn-press border ${
                it.count > 0
                  ? "bg-gold/12 dark:bg-gold/16 border-gold/25 hover:bg-gold/20 hover:-translate-y-0.5"
                  : "bg-muted/50 border-transparent opacity-55"
              }`}
            >
              <span className={it.count > 0 ? "text-burgundy" : "text-muted-foreground"}>
                <it.Icon />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-[11px] font-bold text-foreground leading-tight">{it.label}</div>
              </div>
              <span className={`font-amiri text-xl font-bold shrink-0 ${it.count > 0 ? "text-burgundy" : "text-muted-foreground"}`}>
                {it.count}
              </span>
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* ── Active admins ── */}
      <GlassCard hover={false} className="p-4 sm:p-5">
        <h2 className="font-amiri text-xl text-burgundy mb-4 font-bold">المشرفون النشطون</h2>
        {!DEMO && admins.isLoading ? (
          <div className="h-16 skeleton rounded-2xl" />
        ) : !DEMO && admins.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-center">
            <p className="font-readex text-sm font-bold text-destructive">تعذّر تحميل المشرفين النشطين</p>
            <p className="font-readex text-xs text-muted-foreground mt-1">حاول تحديث الصفحة مرة أخرى</p>
          </div>
        ) : !adminsRows.length ? (
          <p className="font-readex text-sm text-muted-foreground">لا جلسات إدارة نشطة</p>
        ) : (
          <div className="space-y-2">
            {adminsRows.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-burgundy/4 dark:bg-gold/4 border border-burgundy/8 dark:border-gold/8 p-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(72,187,120,0.6)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-readex text-sm font-bold text-foreground truncate">{a.fullName}</div>
                  <div className="font-readex text-xs text-muted-foreground mt-0.5 truncate" dir="ltr">{a.phone ?? "—"}</div>
                </div>
                <span className="font-readex text-[11px] text-muted-foreground whitespace-nowrap">
                  منذ {hoursSince(a.lastActivity)} س
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
