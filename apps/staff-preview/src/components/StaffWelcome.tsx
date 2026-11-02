import { useState, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, BookOpenCheck, ChevronLeft, Crown, Headphones,
  Menu, Moon, Scale, ShieldCheck, Sprout, Sun, TreeDeciduous, UserRound, Wheat, X,
  type LucideIcon,
} from 'lucide-react';
import './StaffWelcome.css';

type StaffWelcomeProps = {
  onTeacherRegister: () => void;
  onStaffLogin: () => void;
};

type LearningIcon = LucideIcon;

const QuranLevels: { Icon: LearningIcon; name: string; desc: string; req: string }[] = [
  { Icon: Sprout, name: 'مستوى الغرس', desc: 'حفظ وجه واحد + مراجعة من الناس', req: 'حفظ 3 أجزاء فما فوق' },
  { Icon: Wheat, name: 'مستوى السنبلة', desc: 'حفظ وجهان + مراجعة', req: 'حفظ 5 أجزاء فما فوق' },
  { Icon: TreeDeciduous, name: 'مستوى الزرع', desc: 'ربع حزب + مراجعة ربع حزب', req: 'حفظ 10 أجزاء فما فوق' },
  { Icon: BookOpenCheck, name: 'مستوى الثمرة', desc: 'ربع حزب + مراجعة ربع حزب', req: 'حفظ 15 جزءاً فما فوق' },
  { Icon: Crown, name: 'مستوى الوارثون', desc: 'ثلاثة أوجه + مراجعة حزب + تحفة', req: 'حفظ 20 جزءاً فما فوق' },
];

const FeatureItems: { Icon: LearningIcon; text: string }[] = [
  { Icon: ShieldCheck, text: 'معلمون معتمدون' },
  { Icon: BookOpen, text: 'حلقاتك محفوظة — تسجيلات حلقاتك وتقييمات معلمك في مكان واحد.' },
  { Icon: Sprout, text: 'حفظ منهجي مستمر ضمن خطة متكاملة.' },
  { Icon: Headphones, text: 'طوّر تلاوتك عبر مستويات متدرجة في التجويد.' },
  { Icon: BookOpenCheck, text: 'صحّح تلاوتك وأتقن قراءة القرآن الكريم.' },
  { Icon: Crown, text: 'انتقل من إتقان رواية حفص إلى رحاب القراءات القرآنية الأخرى' },
  { Icon: Scale, text: 'علومٌ شرعية متكاملة في الفقه والعقيدة والسيرة.' },
  { Icon: BookOpen, text: 'مصحف تبيان AI لاختبار حفظك ومراجعة أخطائك بذكاء.' },
];

function Chevron({ open }: { open: boolean }) {
  return <ChevronLeft className={`sw-chevron${open ? ' is-open' : ''}`} size={18} aria-hidden="true" />;
}

function SectionCta({ onTeacherRegister, label = 'ابدأ رحلتك — سجّل مجاناً' }: {
  onTeacherRegister: () => void;
  label?: string;
}) {
  return (
    <div className="sw-sub-cta">
      <button type="button" onClick={onTeacherRegister} className="sw-button sw-button-primary">
        {label}
      </button>
    </div>
  );
}

function ExpandableRow({ Icon, title, desc, badge, children }: {
  Icon: LearningIcon; title: string; desc: string; badge?: string; children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = `welcome-detail-${title.replaceAll(/\s+/g, '-')}`;
  return (
    <div className="sw-expandable">
      <button
        type="button"
        className="sw-expand-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="sw-icon-bubble"><Icon size={20} aria-hidden="true" /></span>
        <span className="sw-expand-copy">
          <span className="sw-card-title">{title}</span>
          <span className="sw-card-desc">{desc}</span>
          {badge && <span className="sw-badge">{badge}</span>}
        </span>
        {children && <Chevron open={open} />}
      </button>
      {children && open && <div className="sw-expand-content" id={contentId}>{children}</div>}
    </div>
  );
}

function LevelList({ onTeacherRegister }: { onTeacherRegister: () => void }) {
  return (
    <div className="sw-detail-panel">
      <ExpandableRow Icon={BookOpenCheck} title="حفظ ومراجعة القرآن" desc="٥ مستويات: الغرس ← السنبلة ← الزرع ← الثمرة ← الوارثون">
        <div className="sw-level-list">
          {QuranLevels.map(({ Icon, name, desc, req }) => (
            <div className="sw-level-row" key={name}>
              <span className="sw-icon-bubble sw-level-icon"><Icon size={19} aria-hidden="true" /></span>
              <span>
                <span className="sw-card-title">{name}</span>
                <span className="sw-card-desc">{desc}</span>
                <span className="sw-requirement">الشرط: {req}</span>
              </span>
            </div>
          ))}
        </div>
        <SectionCta onTeacherRegister={onTeacherRegister} />
      </ExpandableRow>
      <ExpandableRow Icon={Headphones} title="تصحيح التلاوة" desc="تحسين التلاوة فقط بدون حفظ — لجميع الأعمار">
        <div className="sw-detail-copy">
          <p>• وجه واحد في كل حلقة — الشيخ يحدد المقدار</p>
          <p>• مناسب لمن لا يستطيعون الحفظ</p>
          <p>• تحسين مخارج الحروف والأداء</p>
        </div>
        <SectionCta onTeacherRegister={onTeacherRegister} />
      </ExpandableRow>
      <ExpandableRow Icon={BookOpen} title="القراءات" desc="إجازة برواية حفص عن طريق الشاطبية">
        <div className="sw-detail-copy">
          <p>• لديك إجازة؟ أرفق الوثيقة — مراجعة خلال ٢٤ ساعة</p>
          <p>• لا إجازة؟ نوجّهك لمسار التحضير (مستوى الوارثون)</p>
        </div>
        <SectionCta label="قدّم إجازتك — سجّل أولاً" onTeacherRegister={onTeacherRegister} />
      </ExpandableRow>
    </div>
  );
}

function TajweedDetails({ onTeacherRegister }: { onTeacherRegister: () => void }) {
  const levels = [
    ['المستوى الأول', 'أحكام النون الساكنة والتنوين — أحكام الميم الساكنة — القلقلة'],
    ['المستوى الثاني', 'مخارج الحروف — صفات الحروف — المدود وأقسامها'],
    ['المستوى الثالث', 'الوقف والابتداء — الحذف والإثبات'],
  ];
  return (
    <div className="sw-detail-panel">
      {levels.map(([name, text]) => (
        <div className="sw-topic-row" key={name}>
          <span className="sw-wave-icon" aria-hidden="true"><i/><i/><i/><i/></span>
          <span><span className="sw-card-title">{name}</span><span className="sw-card-desc">{text}</span></span>
        </div>
      ))}
      <SectionCta onTeacherRegister={onTeacherRegister} />
    </div>
  );
}

function ShariaDetails({ onTeacherRegister }: { onTeacherRegister: () => void }) {
  const subjects = [
    { Icon: Scale, name: 'الفقه', desc: 'أحكام العبادات والمعاملات', detail: 'مستوى دراسي متكامل' },
    { Icon: ShieldCheck, name: 'العقيدة', desc: 'أصول الإيمان والتوحيد', detail: '5 مستويات: ثلاثة الأصول — كشف الشبهات' },
    { Icon: Moon, name: 'السيرة النبوية', desc: 'حياة النبي ﷺ من الميلاد إلى الوفاة', detail: '4 مستويات: بذرة — نور — هدى — يقين' },
  ];
  return (
    <div className="sw-detail-panel">
      {subjects.map(({ Icon, name, desc, detail }) => (
        <div className="sw-topic-row sw-sharia-row" key={name}>
          <span className="sw-icon-bubble"><Icon size={20} aria-hidden="true" /></span>
          <span><span className="sw-card-title">{name}</span><span className="sw-card-desc">{desc}</span><span className="sw-requirement">{detail}</span></span>
        </div>
      ))}
      <SectionCta onTeacherRegister={onTeacherRegister} />
    </div>
  );
}

export default function StaffWelcome({ onTeacherRegister, onStaffLogin }: StaffWelcomeProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggleDarkMode = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };
  const cards = [
    { id: 'quran', Icon: BookOpenCheck, title: 'القرآن الكريم', desc: 'حفظ ومراجعة • تصحيح تلاوة • القراءات' },
    { id: 'tajweed', Icon: Headphones, title: 'دروس التجويد', desc: 'أساسي — متوسط — متقدم' },
    { id: 'sharia', Icon: Scale, title: 'الدروس الشرعية', desc: 'العقيدة — الفقه — السيرة النبوية' },
  ];

  return (
    <div className="staff-welcome" dir="rtl">
      <header className="sw-header">
        <div className="sw-header-inner">
          <button type="button" className="sw-header-button" aria-label="القائمة" onClick={() => setMenuOpen(true)} data-testid="button-open-staff-menu">
            <Menu size={20} />
          </button>
          <span className="sw-header-spacer" />
          <button type="button" role="switch" aria-checked={dark} aria-label="الوضع الليلي" className="sw-header-button" onClick={toggleDarkMode} data-testid="button-toggle-dark-mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="sw-main">
        <section className="sw-hero" aria-labelledby="staff-welcome-title">
          <div className="sw-hero-logo">
            <span className="sw-logo-halo" aria-hidden="true" />
            <img src={`${import.meta.env.BASE_URL}brand/logo-light.svg`} alt="شعار تبيان" className="sw-logo-light" />
            <img src={`${import.meta.env.BASE_URL}brand/logo-dark.svg`} alt="" className="sw-logo-dark" />
          </div>
          <h1 id="staff-welcome-title">حياك الله في تبيان</h1>
          <p className="sw-hero-subtitle">منصة تصلك بالمعلمين المعتمدين — حلقات قرآن، تجويد، علوم شرعية، وفتاوى موثوقة</p>
          <div className="sw-actions">
            <button type="button" onClick={onTeacherRegister} className="sw-button sw-button-primary sw-primary-cta">
              <ArrowRight size={18} aria-hidden="true" />
              ابدأ رحلتك — مجاناً
            </button>
            <button type="button" onClick={onStaffLogin} className="sw-button sw-button-secondary">
              <UserRound size={17} aria-hidden="true" />
              تسجيل الدخول
            </button>
            <a className="sw-button sw-button-secondary sw-mushaf-link" href="/student/mushaf-fahd">
              <BookOpen size={17} aria-hidden="true" />
              تصفّح المصحف مباشرة
            </a>
          </div>
        </section>

        <div className="sw-separator" aria-hidden="true"><span>◆</span></div>

        <section className="sw-courses" aria-label="المسارات التعليمية">
          {cards.map(({ id, Icon, title, desc }, index) => {
            const isOpen = expanded === id;
            return (
              <div className="sw-course" key={id} style={{ animationDelay: `${index * 80}ms` }}>
                <button
                  type="button"
                  className={`sw-course-card${isOpen ? ' is-open' : ''}`}
                  onClick={() => setExpanded(isOpen ? null : id)}
                  aria-expanded={isOpen}
                  aria-controls={`sw-course-content-${id}`}
                >
                  <span className="sw-icon-bubble sw-course-icon"><Icon size={26} aria-hidden="true" /></span>
                  <span className="sw-course-copy">
                    <span className="sw-course-title">{title}</span>
                    <span className="sw-course-desc">{desc}</span>
                  </span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen && (
                  <div id={`sw-course-content-${id}`} className="sw-course-content">
                    {id === 'quran' && <LevelList onTeacherRegister={onTeacherRegister} />}
                    {id === 'tajweed' && <TajweedDetails onTeacherRegister={onTeacherRegister} />}
                    {id === 'sharia' && <ShariaDetails onTeacherRegister={onTeacherRegister} />}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="sw-why" aria-labelledby="sw-why-title">
          <div className="sw-section-heading">
            <span aria-hidden="true" />
            <h2 id="sw-why-title">لماذا تبيان؟</h2>
            <span aria-hidden="true" />
          </div>
          <div className="sw-features">
            {FeatureItems.map(({ Icon, text }, index) => (
              <article className="sw-feature" key={text} style={{ animationDelay: `${index * 90}ms` }}>
                <span className="sw-icon-bubble sw-feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sw-hadith" aria-label="حديث نبوي">
          <div className="sw-hadith-divider" aria-hidden="true"><span>◆</span></div>
          <p>﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾</p>
          <small>— صحيح البخاري</small>
        </section>
      </main>

      <footer className="sw-footer">
        <nav aria-label="روابط السياسات">
          <a href="/privacy">سياسة الخصوصية</a>
          <a href="/terms">الشروط والأحكام</a>
          <a href="/support">الدعم والمساعدة</a>
        </nav>
        <p>© تبيان</p>
      </footer>
      {menuOpen && (
        <div className="sw-menu-layer" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)} data-testid="staff-menu-backdrop">
          <aside className="sw-menu" role="dialog" aria-modal="true" aria-label="قائمة تبيان">
            <div className="sw-menu-head">
              <img src={`${import.meta.env.BASE_URL}brand/logo-light.svg`} alt="تبيان" className="sw-logo-light" />
              <img src={`${import.meta.env.BASE_URL}brand/logo-dark.svg`} alt="" className="sw-logo-dark" />
              <button type="button" className="sw-header-button" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)} data-testid="button-close-staff-menu"><X size={18} /></button>
            </div>
            <button type="button" className="sw-menu-action" onClick={() => { setMenuOpen(false); onTeacherRegister(); }} data-testid="menu-teacher-register">التسجيل كمعلم</button>
            <button type="button" className="sw-menu-action" onClick={() => { setMenuOpen(false); onStaffLogin(); }} data-testid="menu-staff-login">دخول المعلمين والمشرفين</button>
            <a className="sw-menu-link" href="/privacy" onClick={() => setMenuOpen(false)}>سياسة الخصوصية</a>
            <a className="sw-menu-link" href="/terms" onClick={() => setMenuOpen(false)}>الشروط والأحكام</a>
            <a className="sw-menu-link" href="/support" onClick={() => setMenuOpen(false)}>الدعم والمساعدة</a>
            <a className="sw-menu-link" href={`${import.meta.env.BASE_URL}demo`} onClick={() => setMenuOpen(false)}>استعراض الواجهات التجريبية</a>
          </aside>
        </div>
      )}
    </div>
  );
}
