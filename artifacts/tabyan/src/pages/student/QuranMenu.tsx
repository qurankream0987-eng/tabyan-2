import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import SectionIcon, { type SectionIconName } from "@/components/app/SectionIcon";
import { authStore } from "@/lib/auth";
import { DEMO_PATHS } from "@/lib/demo/student-core";

/** شاشة القرآن الكريم — القائمة الرئيسية: عناوين فقط، التفاصيل داخل كل قسم */
export default function QuranMenu() {
  const DEMO = authStore.isDemo;
  const paths = trpc.student.paths.useQuery(undefined, { enabled: !DEMO });
  const qiraat = DEMO ? DEMO_PATHS.qiraat : paths.data?.qiraat;

  const sections: Array<{ to: string; icon: SectionIconName; title: string; badge?: string; locked?: boolean }> = [
    { to: "/student/levels/quran", icon: "hifz", title: "حفظ ومراجعة القرآن" },
    { to: "/student/tilawah", icon: "tilawah", title: "تصحيح التلاوة" },
    {
      to: "/student/ijazat",
      icon: "qiraat",
      title: "القراءات",
      badge: qiraat?.certified ? "إجازتك معتمدة" : qiraat?.certificateStatus === "pending" ? "قيد المراجعة" : "يتطلب إجازة",
      locked: !qiraat?.certified,
    },
  ];

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <div className="text-center pt-2 mb-6">
        <h1 className="font-amiri text-xl font-extrabold text-burgundy mb-1.5">القرآن الكريم</h1>
        <p className="font-readex text-sm text-muted-foreground">اختر مسارك القرآني</p>
      </div>

      {/* نفس مقاسات بطاقات "مسارات التعلم" في الصفحة الرئيسية بالضبط */}
      <div className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <Link key={s.title} to={s.to} className="block stagger-in group" style={{ animationDelay: `${i * 80}ms` }}>
            <GlassCard className="p-0 overflow-hidden btn-press rounded-[28px]">
              <div className="p-3 flex gap-3 items-center">
                <div className="w-11 h-11 rounded-2xl bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                  <SectionIcon name={s.icon} size={38} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-readex font-bold text-base text-foreground">{s.title}</span>
                    <div className="w-8 h-8 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 transition-all duration-300 group-hover:bg-burgundy group-hover:text-white dark:group-hover:bg-gold dark:group-hover:text-night">
                      <Icon name="arrow-left" size={16} />
                    </div>
                  </div>
                  {s.badge && (
                    <span className={`inline-block mt-1 text-[11px] font-readex font-bold px-3 py-1 rounded-full ${s.locked ? "bg-burgundy/10 text-burgundy dark:bg-white/10" : "bg-gold/20 text-gold-dark dark:text-gold"}`}>
                      {s.badge}
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
