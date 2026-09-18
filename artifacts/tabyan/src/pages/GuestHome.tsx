import { useEffect, useState } from "react";
import AppHeader from "@/components/app/AppHeader";
import GlassCard from "@/components/app/GlassCard";
import StudentRegisterFlow from "@/components/app/StudentRegisterFlow";
import TeacherRegisterFlow from "@/components/app/TeacherRegisterFlow";
import Modal from "@/components/app/Modal";
import { Link, useSearchParams } from "react-router";
import Icon from "@/components/Icon";
import SectionIcon, { type SectionIconName } from "@/components/app/SectionIcon";

/** محوّلات SectionIcon لتتوافق مع توقيع أيقونات الصفحة — هوية بصرية واحدة */
const Si = (name: SectionIconName) =>
  function SiIcon({ size = 26, className }: { size?: number; className?: string }) {
    return <SectionIcon name={name} size={size} className={className} />;
  };
const SiSeed = Si("seed"), SiWheat = Si("wheat"), SiTree = Si("tree"), SiFruit = Si("fruit"), SiCrown = Si("crown");
const SiQuran = Si("quran"), SiTajweed = Si("tajweed"), SiSharia = Si("sharia");
const SiHifz = Si("hifz"), SiTilawah = Si("tilawah"), SiQiraat = Si("qiraat");
const SiScale = Si("scale"), SiShield = Si("shield"), SiMoon = Si("moon");
const TAJ_ROW_ICONS = [Si("wave1"), Si("wave2"), Si("wave3"), Si("wave4")];

// ─── SVG Icon Library ────────────────────────────────────────────────────────
const S = 1.8;
const Ico = ({ d, vb = "0 0 24 24", size = 26, ...p }: { d: string|string[]; vb?: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    {(Array.isArray(d) ? d : [d]).map((path, i) => <path key={i} d={path} />)}
  </svg>
);

const IcoBook    = (p: {size?:number;className?:string}) => <Ico {...p} d={["M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z","M4 19a2 2 0 0 0 2 2h13","M9 7h7M9 11h5"]} />;
const IcoMic     = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z","M19 10v2a7 7 0 0 1-14 0v-2","M12 19v3"]} />;
const IcoLeaf    = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 22V12","M5 9c0-4 4-7 7-7 3.5 0 6 2.5 6 6.5C18 13 15 16 12 16S6 13 6 11"]} />;
const IcoGrain   = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 22V9","M5 7.5C5 5 7 3 9.5 3 12 3 13 5 12 9","M19 7.5C19 5 17 3 14.5 3 12 3 11 5 12 9","M5 15c0 2.5 2 4.5 4.5 4.5S14 17.5 12 13","M19 15c0 2.5-2 4.5-4.5 4.5S10 17.5 12 13"]} />;
const IcoTree    = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 22v-6","M8 8H5l7-6 7 6h-3","M6 12H4l8-7 8 7h-2","M4 16H3l9-8 9 8h-1"]} />;
const IcoFruit   = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 7c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7z","M12 7c0-2 1-3 2-4"]} />;
const IcoCrown   = (p: {size?:number;className?:string}) => <Ico {...p} d={["M2 19h20","M3 19l2-9 4.5 4L12 5l2.5 9L19 10l2 9"]} />;
const IcoScroll  = (p: {size?:number;className?:string}) => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]} />;
const IcoScale   = (p: {size?:number;className?:string}) => <Ico {...p} d={["M12 3v18","M3 7l4.5 8H3l4.5 8","M21 7l-4.5 8H21l-4.5 8"]} />;
const IcoMoon    = (p: {size?:number;className?:string}) => <Ico {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
const IcoWave    = (p: {size?:number;className?:string}) => <Ico {...p} d="M3 12h2l2-6 3 12 3-15 3 12 2-6h3" />;
const IcoBadge   = (p: {size?:number;className?:string}) => <Ico {...p} d={["M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z","M9 12l2 2 4-4"]} />;
const IcoChevron = ({ open, size = 18 }: { open: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round"
    className="text-gold shrink-0 transition-transform duration-300"
    style={{ transform: open ? "rotate(-90deg)" : "rotate(180deg)" }}>
    <path d="M15 6l-6 6 6 6"/>
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────
const QURAN_LEVELS = [
  { icon: SiSeed,  name: "مستوى الغرس",            desc: "حفظ وجه واحد + مراجعة من الناس",    req: "حفظ 5 أجزاء على الأقل" },
  { icon: SiTree,  name: "مستوى النماء",            desc: "ربع حزب + مراجعة ربع حزب",         req: "حفظ 15 جزءاً على الأقل" },
  { icon: SiWheat, name: "مستوى السنبلة",           desc: "حفظ وجهان + مراجعة", req: "حفظ 10 أجزاء على الأقل" },
  { icon: SiFruit, name: "مستوى الثمرة",            desc: "ربع حزب + مراجعة ربع حزب",         req: "حفظ 20 جزءاً على الأقل" },
  { icon: SiCrown, name: "مستوى الوارثون", desc: "ثلاثة أوجه + مراجعة حزب + تحفة",    req: "حفظ 25 جزءاً على الأقل" },
];

const TAJWEED_LEVELS = [
  { n: "المستوى الأول", t: "أحكام النون الساكنة والتنوين — أحكام الميم الساكنة — القلقلة" },
  { n: "المستوى الثاني", t: "مخارج الحروف — صفات الحروف — المدود وأقسامها" },
  { n: "المستوى الثالث", t: "الوقف والابتداء — الحذف والإثبات" },
];

const SHARIA_SECTIONS = [
  { Icon: SiScale,  name: "الفقه",          desc: "أحكام العبادات والمعاملات",              texts: "مستوى دراسي متكامل" },
  { Icon: SiShield, name: "العقيدة",         desc: "أصول الإيمان والتوحيد",                  texts: "5 مستويات: ثلاثة الأصول — كشف الشبهات" },
  { Icon: SiMoon,   name: "السيرة النبوية",  desc: "حياة النبي ﷺ من الميلاد إلى الوفاة",   texts: "4 مستويات: بذرة — نور — هدى — يقين" },
];

// ─── Sub-section CTA ─────────────────────────────────────────────────────────
function SectionCta({ label = "ابدأ رحلتك — سجّل مجاناً", onReg }: { label?: string; onReg: () => void }) {
  return (
    <div className="px-4 pb-4 pt-3">
      <button onClick={onReg}
        className="w-full py-3 rounded-2xl btn-bubble btn-primary-bubble font-readex font-bold text-sm">
        {label}
      </button>
    </div>
  );
}

// ─── Collapsible sub-card ─────────────────────────────────────────────────────
function SubCard({ Icon, title, desc, badge, children, border = true }:
  { Icon: React.FC<{size?:number;className?:string}>; title: string; desc: string; badge?: string; children?: React.ReactNode; border?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={border ? "border-t border-burgundy/8 dark:border-gold/8" : ""}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-right hover:bg-burgundy/3 dark:hover:bg-gold/3 transition-colors group">
        <span className="w-10 h-10 icon-bubble shrink-0 text-burgundy transition-transform duration-200 group-hover:scale-110">
          <Icon size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-amiri text-base font-bold text-burgundy">{title}</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 font-readex">{desc}</p>
          {badge && (
            <span className="inline-block mt-1 text-[10px] font-bold font-readex bg-gold/12 dark:bg-gold/18 text-burgundy rounded-full px-2.5 py-0.5 border border-gold/20">
              {badge}
            </span>
          )}
        </div>
        {children && <IcoChevron open={open} size={16} />}
      </button>
      {children && open && (
        <div className="bg-background/40 dark:bg-popover/40" style={{ animation: "stagger-in 0.28s cubic-bezier(0.22,1,0.36,1) both" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Level row ───────────────────────────────────────────────────────────────
function LevelRow({ LvIcon, name, desc, req, index }: {
  LvIcon: React.FC<{size?:number;className?:string}>; name: string; desc: string; req: string; index: number;
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 ${index > 0 ? "border-t border-burgundy/6 dark:border-gold/6" : ""}`}>
      <div className="w-9 h-9 icon-bubble shrink-0 text-gold">
        <LvIcon size={18} />
      </div>
      <div className="flex-1">
        <p className="font-amiri text-base font-bold text-burgundy">{name}</p>
        <p className="text-xs text-muted-foreground font-readex">{desc}</p>
        <p className="text-[10px] text-gold/70 mt-0.5 font-readex">الشرط: {req}</p>
      </div>
    </div>
  );
}

// ─── Section Content Components ──────────────────────────────────────────────
function QuranContent({ onReg }: { onReg: () => void }) {
  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-burgundy/12 dark:border-gold/12 bg-white/55 dark:bg-popover/60">
      <SubCard Icon={SiHifz} title="حفظ ومراجعة القرآن" desc="٥ مستويات: الغرس ← السنبلة ← النماء ← الثمرة ← الوارثون" border={false}>
        {QURAN_LEVELS.map((lv, i) => <LevelRow key={lv.name} LvIcon={lv.icon} name={lv.name} desc={lv.desc} req={lv.req} index={i} />)}
        <SectionCta onReg={onReg} />
      </SubCard>
      <SubCard Icon={SiTilawah} title="تصحيح التلاوة" desc="تحسين التلاوة فقط بدون حفظ — لجميع الأعمار">
        <div className="px-5 pt-2 pb-1 space-y-1.5 text-xs text-muted-foreground font-readex">
          <p>• وجه واحد في كل حلقة — الشيخ يحدد المقدار</p>
          <p>• مناسب لمن لا يستطيعون الحفظ</p>
          <p>• تحسين مخارج الحروف والأداء</p>
        </div>
        <SectionCta onReg={onReg} />
      </SubCard>
      <SubCard Icon={SiQiraat} title="القراءات" desc="إجازة برواية حفص عن طريق الشاطبية">
        <div className="px-5 pt-2 pb-1 space-y-1.5 text-xs text-muted-foreground font-readex">
          <p>• لديك إجازة؟ أرفق الوثيقة — مراجعة خلال ٢٤ ساعة</p>
          <p>• لا إجازة؟ نوجّهك لمسار التحضير (مستوى الوارثون)</p>
        </div>
        <SectionCta label="قدّم إجازتك — سجّل أولاً" onReg={onReg} />
      </SubCard>
    </div>
  );
}

function TajweedContent({ onReg }: { onReg: () => void }) {
  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-burgundy/12 dark:border-gold/12 bg-white/55 dark:bg-popover/60">
      {TAJWEED_LEVELS.map((lv, i) => {
        const RowIco = TAJ_ROW_ICONS[i] ?? TAJ_ROW_ICONS[0];
        return (
        <div key={lv.n} className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? "border-t border-burgundy/6 dark:border-gold/6" : ""}`}>
          <div className="w-9 h-9 icon-bubble shrink-0">
            <RowIco size={22} />
          </div>
          <div className="flex-1">
            <p className="font-amiri text-base font-bold text-burgundy">{lv.n}</p>
            <p className="text-xs text-muted-foreground font-readex">{lv.t}</p>
          </div>
        </div>
        );
      })}
      <div className="mx-4 mb-3 mt-1 rounded-2xl bg-gold/8 dark:bg-gold/10 border border-gold/18 px-4 py-2.5 flex items-center gap-2.5">
        <SiSharia size={18} className="shrink-0" />
        <p className="font-readex text-xs text-muted-foreground">
          متن <span className="text-gold font-bold">تحفة الأطفال</span>: مقرر مستوى الوارثون، وعنصر تقييم اختياري في اختبار القبول
        </p>
      </div>
      <SectionCta onReg={onReg} />
    </div>
  );
}

function ShariaContent({ onReg }: { onReg: () => void }) {
  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-burgundy/12 dark:border-gold/12 bg-white/55 dark:bg-popover/60">
      {SHARIA_SECTIONS.map(({ Icon, name, desc, texts }, i) => (
        <div key={name} className={`flex items-start gap-3 px-4 py-4 ${i > 0 ? "border-t border-burgundy/6 dark:border-gold/6" : ""}`}>
          <span className="w-10 h-10 icon-bubble text-burgundy shrink-0 mt-0.5">
            <Icon size={20} />
          </span>
          <div className="flex-1">
            <p className="font-amiri text-base font-bold text-burgundy">{name}</p>
            <p className="text-xs text-muted-foreground font-readex">{desc}</p>
            <p className="text-[10px] text-gold/70 font-readex mt-0.5">{texts}</p>
          </div>
        </div>
      ))}
      <SectionCta onReg={onReg} />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function GuestHome() {
  const [authView, setAuthView] = useState<"closed" | "choice" | "student" | "teacher" | "login">("closed");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const reg = () => setAuthView("choice");
  const login = () => setAuthView("login");

  // بعد تسجيل الخروج نصل هنا بـ ?auth=login — نفتح كلمة السر مباشرة من شاشة الترحيب
  useEffect(() => {
    if (searchParams.get("auth") === "login") {
      setAuthView("login");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const CARDS = [
    { id: "quran",   Icon: SiQuran,   title: "القرآن الكريم",    desc: "حفظ ومراجعة • تصحيح تلاوة • القراءات",   Content: () => <QuranContent   onReg={reg} /> },
    { id: "tajweed", Icon: SiTajweed, title: "دروس التجويد",     desc: "أساسي — متوسط — متقدم",                    Content: () => <TajweedContent onReg={reg} /> },
    { id: "sharia",  Icon: SiSharia,  title: "الدروس الشرعية",   desc: "العقيدة — الفقه — السيرة النبوية",         Content: () => <ShariaContent  onReg={reg} /> },
  ];

  const FEATURES = [
    { Icon: IcoBadge,  title: "معلمون معتمدون",  desc: "قبول بفيديو تعريفي واختبار معرفي ومراجعة خلال ٢٤ ساعة" },
    { Icon: IcoScroll, title: "حلقاتك محفوظة",   desc: "تسجيلات حلقاتك وتقييمات معلمك في مكان واحد" },
  ];

  const loginDropdown = (
    <div className="py-2">
      <button onClick={login} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors rounded-xl text-right">
        <span className="w-8 h-8 rounded-xl bg-burgundy/8 dark:bg-gold/8 flex items-center justify-center text-burgundy shrink-0"><Icon name="user" size={16} /></span>
        <span className="font-readex font-bold text-sm text-foreground">تسجيل الدخول بكلمة السر</span>
      </button>
      <button onClick={reg} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors rounded-xl text-right">
        <span className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center text-burgundy shrink-0"><Icon name="plus" size={16} /></span>
        <span className="font-readex font-bold text-sm text-foreground">إنشاء حساب جديد</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen relative" dir="rtl">
      <AppHeader showBell={false} loginDropdown={loginDropdown} />

      <main className="max-w-lg mx-auto px-4 pb-24 relative z-10 page-enter">

        {/* ── Hero ── */}
        <section className="text-center pt-10 pb-8">
          {/* Logo */}
          <div className="relative w-36 mx-auto mb-6 float">
            <div className="absolute inset-0 bg-gold/25 dark:bg-gold/12 blur-3xl rounded-full scale-150 pointer-events-none" />
            <img src="/logo.png" alt="تبيان" className="w-full relative z-10 logo-light dark:hidden" />
            <img src="/logo.png" alt="تبيان" className="w-full relative z-10 hidden dark:block logo-dark" />
          </div>

          {/* Headline */}
          <h1 className="hero-greeting font-amiri text-4xl sm:text-5xl mb-3 leading-tight font-bold">
            تعلّم القرآن الكريم مع تبيان
          </h1>

          {/* Subtitle */}
          <p className="font-readex text-xl text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
            منصة تصلك بالمعلمين المعتمدين — حلقات قرآن، تجويد، علوم شرعية، وفتاوى موثوقة
          </p>

          {/* Primary CTA */}
          <button
            onClick={reg}
            className="inline-flex items-center justify-center gap-2 btn-bubble btn-primary-bubble font-readex font-bold text-base px-10 py-3.5 w-full sm:w-auto cta-shine"
          >
            <Icon name="arrow-right" size={18} />
            ابدأ رحلتك — مجاناً
          </button>
          <Link
            to="/student/mushaf-fahd"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-burgundy/25 bg-white/50 px-8 py-3 font-readex text-sm font-bold text-burgundy transition hover:-translate-y-0.5 hover:border-burgundy/50 hover:bg-white/80 dark:border-gold/35 dark:bg-night-surface/40 dark:text-gold dark:hover:border-gold/60 dark:hover:bg-night-surface/60"
          >
            <Icon name="quran" size={17} />
            تصفّح المصحف مباشرة
          </Link>
        </section>

        {/* ── Separator ── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burgundy/18 dark:via-gold/18 to-transparent" />
          <span className="text-gold/60 text-sm">◆</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burgundy/18 dark:via-gold/18 to-transparent" />
        </div>

        {/* ── Three Section Cards ── */}
        <section className="space-y-4">
          {CARDS.map(({ id, Icon, title, desc, Content }, cardIdx) => {
            const isOpen = expanded === id;
            return (
              <div
                key={id}
                className="stagger-in"
                style={{ animationDelay: `${cardIdx * 80}ms` }}
              >
                <GlassCard
                  onClick={() => setExpanded(isOpen ? null : id)}
                  className={`flex items-center gap-4 ${isOpen ? "rounded-b-none shadow-none border-b-0" : ""}`}
                >
                  <div className="w-14 h-14 icon-bubble text-burgundy shrink-0 transition-transform duration-200 group-hover:scale-110">
                    <Icon size={26} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-amiri text-xl text-burgundy leading-tight font-bold">{title}</h2>
                    <p className="text-sm text-muted-foreground font-readex mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pr-1">
                    <IcoChevron open={isOpen} />
                  </div>
                </GlassCard>
                {isOpen && <Content />}
              </div>
            );
          })}
        </section>

        {/* ── Why Tabyan ── */}
        <section className="mt-10">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burgundy/18 dark:via-gold/18 to-transparent" />
            <h2 className="font-amiri text-2xl font-bold text-burgundy">لماذا تبيان؟</h2>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-burgundy/18 dark:via-gold/18 to-transparent" />
          </div>

          <div className="grid gap-3.5">
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <GlassCard key={title} hover={false}
                className="flex items-center gap-4 stagger-in"
                style={{ animationDelay: `${i * 90}ms` } as React.CSSProperties}>
                <div className="w-12 h-12 rounded-2xl icon-bubble text-gold shrink-0">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-amiri text-lg font-bold text-burgundy">{title}</h3>
                  <p className="text-sm text-muted-foreground font-readex">{desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Hadith footer ── */}
        <div className="mt-12 text-center">
          {/* Gold line */}
          <div className="flex items-center gap-2 justify-center mb-5">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-gold text-lg">◆</span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <p className="font-readex text-muted-foreground text-2xl leading-loose">
            ﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾
          </p>
          <p className="font-readex text-xs text-muted-foreground/60 mt-2">— صحيح البخاري</p>
        </div>

      </main>

      <Modal open={authView === "choice"} onClose={() => setAuthView("closed")} className="text-right">
        <div className="text-center">
          <h2 className="font-amiri text-2xl text-burgundy font-bold">إنشاء حساب جديد</h2>
          <p className="font-readex text-sm text-muted-foreground mt-1 mb-6">اختر نوع الحساب للبدء في رحلتك مع تبيان</p>
          <div className="grid gap-3">
            <button onClick={() => setAuthView("student")} className="rounded-2xl border-2 border-burgundy/20 bg-burgundy/5 p-4 text-right hover:border-burgundy/50 transition">
              <span className="font-amiri text-xl font-bold text-burgundy">طالب</span>
              <span className="block font-readex text-xs text-muted-foreground mt-1">حفظ القرآن ومتابعة التقدم والدروس</span>
            </button>
            <button onClick={() => setAuthView("teacher")} className="rounded-2xl border-2 border-gold/30 bg-gold/8 p-4 text-right hover:border-gold transition">
              <span className="font-amiri text-xl font-bold text-burgundy">معلم</span>
              <span className="block font-readex text-xs text-muted-foreground mt-1">إدارة الحلقات ومتابعة الطلاب</span>
            </button>
          </div>
          <button onClick={login} className="w-full mt-4 font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition">
            لدي حساب بالفعل — تسجيل الدخول
          </button>
        </div>
      </Modal>
      <StudentRegisterFlow
        open={authView === "student" || authView === "login"}
        startMode={authView === "login" ? "login" : "register"}
        onClose={() => setAuthView("closed")}
      />
      <TeacherRegisterFlow open={authView === "teacher"} onClose={() => setAuthView("closed")} />
    </div>
  );
}
