import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon, { type IconName } from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { DEMO_ANALYTICS } from "@/lib/demo/admin-ops";

const WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function AdminAnalytics() {
  const DEMO = authStore.isDemo;
  const q = trpc.admin.analyticsOverview.useQuery(undefined, { enabled: !DEMO });
  if (!DEMO && q.isLoading) return <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-40 skeleton rounded-[1.5rem]" />)}</div>;
  const d = DEMO ? DEMO_ANALYTICS : q.data!;

  const maxLevel = Math.max(1, ...d.levelCounts.map((l) => l.c));
  const heatMax = Math.max(1, ...d.heatmap.map((h) => h.c));
  const heat = new Map(d.heatmap.map((h) => [`${h.weekday}-${h.hour}`, h.c]));

  return (
    <div className="space-y-5 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="chart" size={24} />التحليلات</h1>

      {/* Funnel */}
      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-3">قمع الانضمام</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { v: d.funnel.totalUsers, l: "إجمالي المستخدمين" },
            { v: d.funnel.totalStudents, l: "طلاب" },
            { v: d.funnel.placementSubmitted, l: "رفعوا اختبار المستوى" },
            { v: d.funnel.placementApproved, l: "اعتُمد مستواهم" },
          ].map((s, i) => (
            <div key={s.l} className="text-center rounded-xl p-3" style={{ background: `rgba(128,0,32,${0.05 + i * 0.05})` }}>
              <div className="font-amiri text-3xl text-burgundy">{s.v}</div>
              <div className="font-readex text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Level distribution */}
        <GlassCard className="p-5">
          <h2 className="font-amiri text-lg text-burgundy mb-3">توزيع الطلاب على المستويات</h2>
          <div className="space-y-2">
            {d.levelCounts.map((l) => (
              <div key={String(l.levelId)}>
                <div className="flex justify-between font-readex text-xs mb-0.5">
                  <span>{l.levelName ?? "بدون مستوى"}</span><span>{l.c}</span>
                </div>
                <div className="h-2.5 rounded-full bg-burgundy/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-burgundy to-gold" style={{ width: `${(l.c / maxLevel) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Content stats */}
        <GlassCard className="p-5">
          <h2 className="font-amiri text-lg text-burgundy mb-3">المحتوى</h2>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: d.content.booksCount, l: "كتاب في المكتبة", i: "library" },
              { v: d.content.recordingsCount, l: "تسجيل حصة", i: "video" },
              { v: d.content.fatwasPublished, l: "فتوى منشورة", i: "mosque" },
              { v: d.content.bookmarksCount, l: "إشارة مرجعية", i: "bookmark" },
            ] as { v: number; l: string; i: IconName }[]).map((s) => (
              <div key={s.l} className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3 text-center">
                <div className="flex justify-center text-burgundy mb-1"><Icon name={s.i} size={22} /></div>
                <div className="font-amiri text-2xl text-burgundy">{s.v}</div>
                <div className="font-readex text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Heatmap */}
      <GlassCard className="p-5 overflow-x-auto">
        <h2 className="font-amiri text-lg text-burgundy mb-3">خريطة الحصص (يوم × ساعة)</h2>
        <div className="min-w-[560px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `70px repeat(12, 1fr)` }}>
            <div />
            {Array.from({ length: 12 }, (_, h) => (
              <div key={h} className="text-center text-[10px] font-readex text-muted-foreground" dir="ltr">{h + 8}:00</div>
            ))}
            {WD.map((day, di) => (
              <>
                <div key={day} className="text-[11px] font-readex font-bold flex items-center">{day}</div>
                {Array.from({ length: 12 }, (_, h) => {
                  const c = heat.get(`${di + 1}-${h + 8}`) ?? 0;
                  return (
                    <div key={h} className="h-7 rounded-md flex items-center justify-center text-[10px] font-readex"
                      title={`${day} ${h + 8}:00 — ${c} حصة`}
                      style={{ background: c ? `rgba(212,175,55,${0.15 + (c / heatMax) * 0.75})` : "rgba(128,0,32,0.05)", color: c > heatMax / 2 ? "#5c0017" : "inherit" }}>
                      {c || ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Teacher stats */}
      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-3">أداء المعلمين</h2>
        <div className="space-y-2">
          {d.teacherStats.map((t) => (
            <div key={t.teacherId} className="flex items-center gap-3 rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="flex-1 font-readex text-sm font-bold">{t.fullName}</div>
              <span className="font-readex text-xs text-muted-foreground">{Number(t.completed)}/{Number(t.total)} مكتملة</span>
              <div className="w-28 h-2 rounded-full bg-burgundy/10 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Number(t.total) ? (Number(t.completed) / Number(t.total)) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
