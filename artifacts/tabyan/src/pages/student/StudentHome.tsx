import { useEffect, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import SectionIcon, { type SectionIconName } from "@/components/app/SectionIcon";
import { authStore } from "@/lib/auth";
import { fmtTime, sessionDayLabel } from "@/lib/format";
import { DEMO_DASHBOARD, type DemoDashboard, type DemoSessionRow } from "@/lib/demo/student-core";
import productRegistry from "../../../../../lib/tabyan-domain/product-registry.json";

// ── آيات اليوم الدوارة ────────────────────────────────────────────────────────
// آية احتياطية تظهر فقط إذا تعذر الوصول للخادم
const FALLBACK_VERSE = { text: "إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوا وَّالَّذِينَ هُم مُّحْسِنُونَ", surahName: "النحل", ayahNumber: 128 };
const DEMO_SETTINGS_KEY = "tabyan.demo.studentSettings";
const LEGACY_DEMO_AYAH_KEY = "tabyan.demo.ayahNotification";

function readDemoAyahEnabled(): boolean {
  try {
    const rawSettings = localStorage.getItem(DEMO_SETTINGS_KEY);
    if (rawSettings) {
      const settings = JSON.parse(rawSettings) as { ayahNotification?: unknown };
      if (typeof settings.ayahNotification === "boolean") return settings.ayahNotification;
    }
    const legacy = localStorage.getItem(LEGACY_DEMO_AYAH_KEY);
    return legacy === null ? true : legacy !== "false";
  } catch {
    return true;
  }
}

// ── ربط أنواع الحلقات بالمسارات الثلاثة ──────────────────────────────────────
type LearningPathKey = "quran" | "tajweed" | "sharia";

const SESSION_TYPE_TO_PATH = productRegistry.sessionTypeToLearningFeature as Record<string, LearningPathKey>;
const PATH_ORDER = productRegistry.learningFeatureOrder as LearningPathKey[];
const PATH_TITLES = Object.fromEntries(
  PATH_ORDER.map((key) => [key, productRegistry.paths[key].homeLabel]),
) as Record<LearningPathKey, string>;

// ── مسارات التعلم ─────────────────────────────────────────────────────────────
type PathCard = { path: LearningPathKey; to: string; icon: SectionIconName; title: string; subtitle: string; subItems: string[] };

const LEARNING_PATHS: PathCard[] = [
  {
    path: "quran",
    to: "/student/quran",
    icon: "quran",
    title: "القرآن الكريم",
    subtitle: "حفظ ومراجعة وتلاوة",
    subItems: ["🌱 الغرس — 5 أجزاء فما فوق", "🌾 السنبلة — 10 أجزاء", "🌿 النماء — 15 جزءاً", "🍎 الثمرة — 20 جزءاً", "👑 الوارثون — 25 جزءاً"],
  },
  {
    path: "tajweed",
    to: "/student/levels/tajweed",
    icon: "tajweed",
    title: "دروس التجويد",
    subtitle: "أحكام وقواعد التلاوة",
    subItems: ["أساسي — أحكام النون والميم والمدود", "متوسط — مخارج الحروف وصفاتها", "متقدم — الوقف والابتداء"],
  },
  {
    path: "sharia",
    to: "/student/sharia",
    icon: "sharia",
    title: "الدروس الشرعية",
    subtitle: "عقيدة وفقه وسيرة نبوية",
    subItems: ["☀️ العقيدة — خمسة مستويات اختيارية", "⚖️ الفقه — الوجيز في الفقه", "🌙 السيرة النبوية — الرحيق المختوم"],
  },
];

// لوحة فارغة آمنة للوضع الحقيقي عند فشل الـAPI — نفس الأقسام تظهر مع حالات فراغ
const EMPTY_DASHBOARD: DemoDashboard = {
  student: { placementTestStatus: "none" },
  age: 0,
  levelName: "",
  enrolledPaths: [],
  completionPercentage: 0,
  stats: { totalJuz: 0, sessionsCount: 0, avgScore: 0 },
  upcoming: [],
  todayLessons: [],
};

// ── الصفحة الرئيسية ──────────────────────────────────────────────────────────
export default function StudentHome() {
  const DEMO = authStore.isDemo;
  const [demoAyahEnabled, setDemoAyahEnabled] = useState(true);
  const { data, isLoading } = trpc.student.dashboard.useQuery(
    undefined,
    { enabled: !DEMO, retry: 1, retryDelay: 800 },
  );
  const settings = trpc.student.settings.useQuery(undefined, { enabled: !DEMO });

  // مزامنة وضع العرض التجريبي بين صفحة الحساب والصفحة الرئيسية.
  useEffect(() => {
    if (!DEMO) return;
    setDemoAyahEnabled(readDemoAyahEnabled());
    const sync = () => setDemoAyahEnabled(readDemoAyahEnabled());
    window.addEventListener("tabyan:ayah-notification-changed", sync);
    return () => window.removeEventListener("tabyan:ayah-notification-changed", sync);
  }, [DEMO]);

  if (!DEMO && isLoading) return <LoadingState />;

  // واجهة واحدة في الوضعين — عند غياب البيانات الحقيقية تُعرض نفس الأقسام مع حالات فراغ بدل الإخفاء
  const d = (DEMO ? DEMO_DASHBOARD : (data ?? EMPTY_DASHBOARD)) as DemoDashboard;
  const progressPercent = d.completionPercentage ?? 0;

  // التسجيل الفعلي يأتي من الخادم (حجوزات نشطة/تقدّم دراسي) — لا يتأثر بغياب موعد قادم
  const enrolledPaths = PATH_ORDER.filter((p) => d.enrolledPaths.includes(p));

  // بطاقات المواعيد: لكل مسار مسجّل بطاقة مستقلة تعرض حلقاته القادمة فقط
  const upcomingByPath: Record<LearningPathKey, DemoSessionRow[]> = { quran: [], tajweed: [], sharia: [] };
  for (const s of d.upcoming) {
    const p = SESSION_TYPE_TO_PATH[s.sessionType];
    if (p) upcomingByPath[p].push(s);
  }

  return (
    <div className="space-y-6 page-enter pb-10">

      {/* 1. Greeting */}
      <GreetingHeader name={authStore.name} levelName={d.levelName || null} progress={progressPercent} />

      {/* 2. آية اليوم — تُعرض فقط عند تفعيلها من الحساب */}
      {(DEMO ? demoAyahEnabled : settings.data?.ayahNotification !== false) && <VerseOfDay />}

      {/* 3. بطاقات مواعيد المسارات المسجل فيها الطالب فقط — بطاقة مستقلة لكل مسار */}
      {enrolledPaths.map((path) => (
        <PathScheduleCard key={path} path={path} sessions={upcomingByPath[path]} />
      ))}

      {/* 4. بطاقات اختيار المسارات التي لم يسجل فيها الطالب */}
      <LearningPathCards enrolledPaths={enrolledPaths} />

      {/* 5. Placement reminder */}
      {d.student && d.student.placementTestStatus !== "approved" && (
        <GlassCard hover={false} className="p-5 flex items-center gap-4 border-s-4 border-s-gold shadow-gold">
          <div className="w-11 h-11 rounded-2xl bg-gold/12 flex items-center justify-center shrink-0">
            <SectionIcon name="camera" size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-readex font-bold text-sm text-foreground">اختبار تحديد المستوى</div>
            <div className="font-readex text-xs text-muted-foreground mt-0.5">أكمل الاختبار ليتم اعتماد مستواك وبدء رحلتك</div>
          </div>
          <Link
            to="/student/placement"
            className="shrink-0 bg-gold/12 text-gold-dark dark:text-gold font-readex text-xs font-bold px-4 py-2 rounded-full hover:bg-gold/25 transition btn-press"
          >
            فتح
          </Link>
        </GlassCard>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-5 page-enter">
      <div className="space-y-2">
        <div className="h-8 w-3/4 skeleton rounded-2xl" />
        <div className="h-4 w-1/2 skeleton rounded-xl" />
      </div>
      <div className="h-36 skeleton rounded-[1.5rem]" />
      <div className="h-48 skeleton rounded-[1.5rem]" />
      {[1, 2, 3].map((i) => <div key={i} className="h-32 w-full skeleton rounded-[1.5rem]" />)}
    </div>
  );
}

function VerseOfDay() {
  // آية اليوم من مصدر حقيقي (الرسم العثماني) — تتغير يومياً، ويمكن للمسؤول تخصيصها
  const { data } = trpc.dailyVerse.today.useQuery(undefined, {
    staleTime: 30 * 60_000,
    retry: 1,
  });
  const verse = data?.verse ?? FALLBACK_VERSE;
  return (
    <section>
      <GlassCard hover={false} className="relative overflow-hidden border-none p-0">
        <div
          className="absolute inset-0 rounded-[1.5rem]"
          style={{ background: "linear-gradient(135deg, #800020 0%, #A02040 60%, #5F1530 100%)" }}
        />
        <div
          className="absolute inset-0 opacity-20 rounded-[1.5rem]"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.55) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 px-5 py-5 text-center">
          <span className="verse-day-chip inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gold/15 border-0 text-gold rounded-full text-base font-readex font-bold mb-3 tracking-wide">
            آية اليوم
          </span>
          <p className="font-quran text-lg sm:text-xl leading-loose text-gold mb-2 px-2">
            ﴿ {verse.text} ﴾
          </p>
          <p className="font-readex text-sm text-gold">
            سورة {verse.surahName}، آية {verse.ayahNumber}
          </p>
        </div>
      </GlassCard>
    </section>
  );
}

function PathScheduleCard({ path, sessions }: { path: LearningPathKey; sessions: DemoSessionRow[] }) {
  const next = sessions[0];
  if (!next) return null;
  return (
    <section>
      <GlassCard hover={false} className="relative overflow-hidden border-none p-0">
        <div
          className="absolute inset-0 rounded-[1.5rem]"
          style={{ background: "linear-gradient(135deg, #800020 0%, #A02040 55%, #5F1530 100%)" }}
        />
        <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="font-readex text-xl sm:text-2xl font-extrabold text-gold mb-2 leading-snug">
              الواجب
            </h2>
            <p className="inline-flex items-center gap-2 font-readex text-sm font-bold text-gold bg-white/12 rounded-xl px-3 py-1.5 mb-3">
              <Icon name="books" size={14} className="session-card-icon" />
              سورة الملك من الآية (1) إلى (10)
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-gold font-readex text-sm">
              {next.levelName ? (
                <span className="flex items-center gap-1.5"><Icon name="books" size={13} className="session-card-icon" />{next.levelName}</span>
              ) : null}
              <span className="flex items-center gap-1.5"><Icon name="user" size={13} className="session-card-icon" />{next.teacherName}</span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={13} className="session-card-icon" />
                {sessionDayLabel(next.scheduledAt)} — {fmtTime(next.scheduledAt)}
              </span>
            </div>
          </div>
          <Link
            to={`/student/session/${next.id}`}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-burgundy hover:bg-maroon text-white font-readex text-sm font-bold px-6 py-3 rounded-full shadow-xl btn-bubble transition hover:-translate-y-0.5"
          >
            <Icon name="video" size={15} className="session-card-icon" />
            ادخل إلى الحلقة
          </Link>
        </div>
      </GlassCard>
    </section>
  );
}

function LearningPathCards({ enrolledPaths }: { enrolledPaths: LearningPathKey[] }) {
  const visible = LEARNING_PATHS.filter((p) => !enrolledPaths.includes(p.path));
  if (visible.length === 0) return null;
  return (
    <section>
      <div className="flex flex-col gap-4">
        {visible.map((p, i) => (
          <Link key={p.to} to={p.to} className="block stagger-in group" style={{ animationDelay: `${i * 80}ms` }}>
            <GlassCard className="p-0 overflow-hidden btn-press rounded-[28px]">
              <div className="p-3 flex gap-3 items-center">
                <div className="w-11 h-11 rounded-2xl bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center shrink-0">
                  <SectionIcon name={p.icon} size={38} />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="font-readex font-bold text-base text-gold">{p.title}</span>
                  <div className="w-8 h-8 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 transition-all duration-300 group-hover:bg-burgundy group-hover:text-white dark:group-hover:bg-gold dark:group-hover:text-night">
                    <Icon name="arrow-left" size={16} />
                  </div>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GreetingHeader({ name, levelName, progress }: { name: string | null; levelName: string | null | undefined; progress: number }) {
  return (
    <header className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="hero-greeting font-amiri text-3xl md:text-4xl font-bold mb-1 leading-tight">
          أهلاً، {name ? name.split(" ")[0] : "طالبنا"}
        </h1>
        <p className="font-readex text-sm text-muted-foreground">
          {levelName && levelName !== "—"
            ? `مستواك الحالي: ${levelName}`
            : "أكمل إعداد حسابك لتبدأ رحلتك القرآنية"}
        </p>
      </div>

      {levelName && levelName !== "—" && (
        <div className="w-full md:w-52">
          <div className="flex justify-between text-xs font-readex text-muted-foreground mb-1.5">
            <span>مستوى الإنجاز</span>
            <span className="font-bold text-burgundy">{progress}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #800020 0%, #D4AF37 100%)",
                boxShadow: "0 0 8px rgba(212,175,55,0.45)",
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
