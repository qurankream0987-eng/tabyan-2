import { useState } from "react";
import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon, { type IconName } from "@/components/Icon";
import SectionIcon, { type SectionIconName } from "@/components/app/SectionIcon";
import { PATH_META } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_LEVELS_BY_PATH } from "@/lib/demo/student-core";

// ── خريطة أيقونات المستويات — كل مستوى له أيقونة SVG ملوّنة مستقلة ────────────
const LEVEL_ICON: Record<string, SectionIconName> = {
  // مستويات القرآن الكريم (أسماء قاعدة البيانات والعرض التجريبي)
  "الغرس":    "seed",
  "السنبلة":  "wheat",
  "النماء":    "tree",
  "الثمرة":   "fruit",
  "الوارثون": "crown",
  // مستويات التجويد
  "التجويد الأساسي":  "wave1",
  "التجويد المتوسط":  "wave2",
  "التجويد المتقدم":  "wave3",
  "إتقان التجويد":   "wave4",
};

const PATH_FALLBACK_ICON: Record<string, SectionIconName> = {
  quran:              "hifz",
  tajweed:            "tajweed",
  tajweed_correction: "tilawah",
  qiraat:             "qiraat",
  sharia:             "sharia",
};

function Bullet() {
  return <span className="mt-[7px] shrink-0 inline-block w-2 h-2 rotate-45 bg-gradient-to-br from-gold to-amber-600 rounded-[2px] shadow-[0_0_6px_rgba(212,175,55,.55)]" />;
}

type LevelRow = {
  id: number; name: string; nameEn: string | null; sessionsCount: number;
  requiredJuz: number; requiredSessions: number; minGrade: string | null;
  requiresIjazah: boolean; isCurrent: boolean; progressStatus: string;
  aqeedahRequirement?: string | null; aqeedahStatus?: string | null; aqeedahLevelId?: number | null;
};

// ── محتوى المستند: شروط ومتطلبات مستويات القرآن ──────────────────────────────
const QURAN_DETAILS: Record<string, { cond: string; reqs: string[] }> = {
  "الغرس": {
    cond: "حفظ 5 أجزاء فما فوق",
    reqs: ["الحفظ الجديد: وجه واحد في كل حلقة", "المراجعة: تبدأ من سورة الناس"],
  },
  "السنبلة": {
    cond: "حفظ 10 أجزاء فما فوق",
    reqs: ["الحفظ الجديد: وجهان في كل حلقة", "المراجعة: تبدأ من سورة الناس"],
  },
  "النماء": {
    cond: "حفظ 15 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ربع حزب في كل حلقة", "المراجعة: ربع حزب في كل حلقة"],
  },
  "الثمرة": {
    cond: "حفظ 20 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ربع حزب في كل حلقة", "المراجعة: ربع حزب في كل حلقة"],
  },
  "الوارثون": {
    cond: "حفظ 25 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ثلاثة أوجه في كل حلقة", "المراجعة: حزب كامل في كل حلقة"],
  },
};

const AQEEDAH_CLARIFICATIONS: Record<string, string> = {
  "الثمرة": "الأبيات من 1 إلى 137",
  "الوارثون": "الأبيات من 137 إلى 290",
};

// ── دروس التجويد لكل مستوى ───────────────────────────────────────────────────
const TAJWEED_LESSONS: Record<string, string[]> = {
  "التجويد الأساسي": ["أحكام النون الساكنة والتنوين", "أحكام الميم الساكنة", "النون والميم المشددتين", "القلقلة"],
  "التجويد المتوسط": ["مخارج الحروف", "صفات الحروف", "المدود وأقسامها"],
  "التجويد المتقدم": ["الوقف والابتداء", "الحذف والإثبات"],
};

const TAJWEED_DISPLAY_NAMES: Record<string, string> = {
  "التجويد الأساسي": "المستوى الأول",
  "التجويد المتوسط": "المستوى الثاني",
  "التجويد المتقدم": "المستوى الثالث",
};

// ── مواد الدروس الشرعية ──────────────────────────────────────────────────────
const SHARIA_SUBJECTS: { key: string; name: string; icon: IconName }[] = [
  { key: "aqeedah", name: "العقيدة", icon: "shield" },
  { key: "fiqh", name: "الفقه", icon: "books" },
  { key: "seerah", name: "السيرة النبوية", icon: "quran" },
];
const SHARIA_LEVEL_DESC: Record<string, string> = {
  "البذرة": "الأساسيات", "النور": "التوسع", "الهدى": "التطبيق", "اليقين": "الاحتكام",
};

export default function Levels() {
  const DEMO = authStore.isDemo;
  const { pathId = "quran" } = useParams();
  const path = (["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"].includes(pathId) ? pathId : "quran") as "quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia";
  const { data, isLoading } = trpc.student.levels.useQuery({ path }, { enabled: !DEMO });
  const meta = PATH_META[path];

  if (!DEMO && isLoading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}</div>;

  // الوضع الحقيقي: عند فشل الـAPI أو فراغه يُعرض نفس هيكل المستويات الثابت بدل إخفاء الصفحة
  const levels = (DEMO ? (DEMO_LEVELS_BY_PATH[path] ?? []) : (data ?? [])) as LevelRow[];
  const displayedLevels = path === "tajweed"
    ? levels.filter((level) => level.name !== "إتقان التجويد")
    : levels;

  return (
    <div className="space-y-6 page-enter max-w-lg mx-auto pb-6">
      <div className="text-center pt-2 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy/15 to-gold/15 flex items-center justify-center mx-auto text-burgundy mb-3 shadow-sm">
          <Icon name={meta.icon} size={24} />
        </div>
        <h1 className="font-amiri text-xl font-extrabold text-burgundy mb-1.5">{meta.name}</h1>
        <p className="font-readex text-sm font-bold text-muted-foreground">{meta.desc}</p>
      </div>

      {!displayedLevels.length ? <EmptyState title="لا مستويات متاحة بعد" /> : path === "sharia" ? (
        <ShariaView levels={displayedLevels} />
      ) : (
        <div className="space-y-4">
          {displayedLevels.map((l) => (
            <LevelCard
              key={l.id}
              level={l}
              path={path}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-6">
        <Link to="/student/booking" className="inline-flex items-center justify-center gap-2 font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition btn-press px-6 py-3 rounded-full bg-burgundy/5 dark:bg-white/5">
          <Icon name="calendar" size={18} />
          <span>اختر حلقة في هذا المسار</span>
          <Icon name="arrow-left" size={14} className="mr-1" />
        </Link>
      </div>
    </div>
  );
}

// ── بطاقة مستوى (قرآن / تجويد / بقية المسارات) ───────────────────────────────
function LevelCard({ level: l, path }: { level: LevelRow; path: string }) {
  // PART 3 FIX: لا يُفتح أي مستوى تلقائياً — يفتح فقط بنقرة صريحة من المستخدم
  const [open, setOpen] = useState(false);
  const quran = QURAN_DETAILS[l.name];
  const tajweed = TAJWEED_LESSONS[l.name];
  const aqeedahRequirement = l.aqeedahRequirement;
  const aqeedahRange = AQEEDAH_CLARIFICATIONS[l.name];
  const hasDetails = !!quran || !!tajweed;

  // PART 1 & 2 FIX: SectionIcon بألوان ثابتة مضمّنة — لا تتأثر بـ text-* عند الـ hover
  // يزيل مشكلة اختفاء الأيقونة الناتجة عن group-hover:text-white التي تحوّل currentColor إلى أبيض
  const levelIcon = LEVEL_ICON[l.name] ?? PATH_FALLBACK_ICON[path as keyof typeof PATH_FALLBACK_ICON] ?? "hifz";
  const iconBubble = (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-burgundy/10 to-gold/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
      <SectionIcon name={levelIcon} size={28} />
    </div>
  );
  const arrowBubble = (rotated: boolean) => (
    <div className={`w-8 h-8 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 transition-all duration-300 group-hover:bg-burgundy group-hover:text-white dark:group-hover:bg-gold dark:group-hover:text-night ${rotated ? "-rotate-90" : ""}`}>
      <Icon name="arrow-left" size={16} />
    </div>
  );

  // مستوى بدون تفاصيل — البطاقة كلها زر ينقل للحجز
  if (!hasDetails) {
    return (
      <Link to={`/student/booking?levelId=${l.id}&path=${path}`} className="block group">
        <GlassCard className="p-3 btn-press hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            {iconBubble}
            <div className="flex-1 min-w-0">
              <span className="font-readex text-[16px] font-bold text-foreground">{path === "tajweed" ? (TAJWEED_DISPLAY_NAMES[l.name] ?? l.name) : `مستوى ${l.name}`}</span>
            </div>
            {l.isCurrent && (
              <span className="font-readex text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark dark:text-gold shrink-0">مستواك</span>
            )}
            {arrowBubble(false)}
          </div>
        </GlassCard>
      </Link>
    );
  }

  return (
    <GlassCard className={`p-3 transition-all duration-300 ${open ? "pb-5" : "btn-press hover:shadow-lg"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-right outline-none group cursor-pointer">
        <div className="flex items-center gap-3">
          {iconBubble}
          <div className="flex-1 min-w-0">
            <span className="font-readex text-[16px] font-bold text-foreground">{path === "tajweed" ? (TAJWEED_DISPLAY_NAMES[l.name] ?? l.name) : `مستوى ${l.name}`}</span>
          </div>
          {arrowBubble(open)}
        </div>
      </button>

      {open && quran && (
        <div className="mt-6 pt-6 border-t border-burgundy/10 dark:border-gold/10 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div>
            <div className="font-readex text-base font-extrabold text-burgundy mb-2 flex items-center gap-2"><Icon name="shield" size={18}/>شروط الالتحاق</div>
            <div className="font-readex text-sm text-foreground flex items-start gap-2.5 font-bold"><Bullet />{quran.cond}</div>
          </div>
          <div>
            <div className="font-readex text-base font-extrabold text-burgundy mb-2 flex items-center gap-2"><Icon name="books" size={18}/>متطلبات الحلقة</div>
            <ul className="space-y-2.5">
              {quran.reqs.map((r) => (
                <li key={r} className="font-readex text-sm text-foreground flex items-start gap-2.5 font-bold"><Bullet />{r}</li>
              ))}
            </ul>
          </div>
          {aqeedahRequirement && (
            <div>
              <div className="font-readex text-base font-extrabold text-burgundy mb-2 flex items-center gap-2"><Icon name="star" size={18}/>متطلب العقيدة الإلزامي</div>
              <div className="font-readex text-sm text-foreground flex items-start gap-2.5 font-bold">
                <Bullet />
                <span>
                  {l.aqeedahLevelId ? (
                    <Link to={`/student/sharia/level/${l.aqeedahLevelId}`} className="underline decoration-gold/60 underline-offset-4 hover:text-burgundy dark:hover:text-gold transition">
                      {aqeedahRequirement}
                    </Link>
                  ) : aqeedahRequirement}
                  {aqeedahRange && <span> — {aqeedahRange}</span>}
                  {l.aqeedahStatus === "completed"
                    ? <span className="text-green-700 dark:text-green-300"> — مكتمل ✓</span>
                    : <span className="font-normal text-muted-foreground"> — لا يُكتمل هذا المستوى قبل إتمامه</span>}
                </span>
              </div>
            </div>
          )}
          <Link to={`/student/placement?levelId=${l.id}&path=${path}`}
            className="block text-center bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3.5 rounded-full btn-press hover:opacity-90 transition mt-6">
            <span className="inline-flex items-center gap-2">دخول اختبار القبول <Icon name="video" size={18}/></span>
          </Link>
        </div>
      )}

      {open && tajweed && (
        <div className="mt-6 pt-6 border-t border-burgundy/10 dark:border-gold/10 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div>
            <div className="font-readex text-base font-extrabold text-burgundy mb-2 flex items-center gap-2"><Icon name="books" size={18}/>الدروس</div>
            <ul className="space-y-2.5">
              {tajweed.map((r) => (
                <li key={r} className="font-readex text-sm text-foreground flex items-start gap-2.5 font-bold"><Bullet />{r}</li>
              ))}
            </ul>
          </div>
          <Link to={`/student/booking?levelId=${l.id}&path=${path}`}
            className="block text-center bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3.5 rounded-full btn-press hover:opacity-90 transition mt-6">
            <span className="inline-flex items-center gap-2">اختر مقعداً — جدول الشيوخ <Icon name="calendar" size={18}/></span>
          </Link>
        </div>
      )}

    </GlassCard>
  );
}

// ── الدروس الشرعية: العقيدة / الفقه / السيرة النبوية ─────────────────────────
function ShariaView({ levels }: { levels: LevelRow[] }) {
  return (
    <div className="space-y-5">
      {SHARIA_SUBJECTS.map((subj) => {
        const subjLevels = levels.filter((l) => l.nameEn === subj.key);
        if (!subjLevels.length) return null;
        return (
          <GlassCard key={subj.key} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-burgundy/15 to-gold/15 flex items-center justify-center text-burgundy shrink-0">
                <Icon name={subj.icon} size={22} />
              </div>
              <h2 className="font-amiri text-2xl font-extrabold text-burgundy">{subj.name}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {subjLevels.map((l, i) => (
                <Link key={l.id} to={`/student/booking?levelId=${l.id}&path=sharia`}
                  className="rounded-2xl p-3 text-center btn-press transition-all duration-300 border shadow-sm hover:shadow-md bg-burgundy/5 dark:bg-white/5 border-burgundy/10 dark:border-gold/15 hover:bg-burgundy/10 dark:hover:bg-white/10">
                  <div className={`font-readex text-xs font-bold mb-1 ${l.isCurrent ? "text-gold-dark dark:text-gold" : "text-muted-foreground"}`}>{l.isCurrent ? "مستواك الحالي" : `المستوى ${i + 1}`}</div>
                  <div className="font-amiri text-2xl font-extrabold text-burgundy">{l.name}</div>
                  <div className="font-readex text-xs font-bold text-muted-foreground mt-1">{SHARIA_LEVEL_DESC[l.name] ?? ""}</div>
                </Link>
              ))}
            </div>
            <div className="font-readex text-xs font-bold text-muted-foreground mt-4 text-center">الكتب والمتون يضعها المشرف لكل مستوى</div>
          </GlassCard>
        );
      })}
    </div>
  );
}
