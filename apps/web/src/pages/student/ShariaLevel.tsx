import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import EmptyState from "@/components/app/EmptyState";
import Icon, { type IconName } from "@/components/app/Icon";
import PrimaryButton from "@/components/app/PrimaryButton";
import SecondaryButton from "@/components/app/SecondaryButton";
import { authStore } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";
import { SHARIA_SUBJECT_META } from "@/lib/shariaMeta";
import { ShariaProgressBar } from "./ShariaSubjects";
import { demoShariaSubjects, demoShariaLevelContent } from "@/lib/demo/sharia-demo";

const DAY_SHORT: Record<string, string> = {
  sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء",
  thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
};
const JS_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** أقرب موعد قادم ليوم/وقت محددين — إن حلّ اليوم نفسه يُؤجَّل للأسبوع التالي تفادياً لوقت فائت */
function nextOccurrence(dayKey: string, hhmm: string): string {
  const target = JS_DAYS.indexOf(dayKey);
  const d = new Date();
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

type Circle = {
  id: string; teacherId: string; teacherName: string; sessionType: string;
  maxStudents: number; enrolledCount: number; isAcceptingBookings: boolean;
  availableDays: string[]; availableTimes: string[]; durationMinutes: number;
};

/** الحلقات الجماعية المتاحة للمستوى — اسم الشيخ، الأيام، الأوقات، المقاعد، وزر تسجيل مباشر */
function LevelCircles({ levelId, subject }: { levelId: number; subject: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const q = trpc.student.teachers.useQuery(undefined);
  const [pick, setPick] = useState<{ circleId: string; day?: string; time?: string } | null>(null);
  const sessionType = subject === "seerah" ? "sharia_seerah" : subject === "fiqh" ? "sharia_fiqh" : "sharia_aqeedah";
  const book = trpc.student.bookSession.useMutation({
    onSuccess: () => {
      toast("تم تسجيلك في الحلقة بنجاح — تجدها في مواعيدك", "success");
      setPick(null);
      utils.student.teachers.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });

  const circles = ((q.data ?? []) as Array<{ teacherId: string; name: string; schedules: Circle[] }>).flatMap((t) =>
    (t.schedules ?? [])
      .filter((s) => s.sessionType === sessionType && (s as Circle & { sessionMode?: string }).sessionMode === "group")
      .filter((s) => (s as Circle & { levelId?: number | null }).levelId == null || (s as Circle & { levelId?: number | null }).levelId === levelId)
      .map((s) => ({ ...s, teacherId: t.teacherId, teacherName: t.name })),
  );

  if (q.isLoading) return <div className="h-24 skeleton rounded-[1.75rem]" />;
  if (!circles.length) {
    return (
      <EmptyState
        title="لا حلقات متاحة حالياً"
        hint="سيفتح المشرف تسجيل الحلقات قريباً — تابع الإشعارات"
      />
    );
  }

  return (
    <section className="space-y-3 pt-1">
      <h2 className="font-readex text-base font-extrabold text-burgundy flex items-center gap-2">
        <Icon name="graduation" size={18} /> الحلقات المتاحة لهذا المستوى
      </h2>
      {circles.map((c) => {
        const seats = Math.max(0, c.maxStudents - c.enrolledCount);
        const closed = !c.isAcceptingBookings;
        const full = seats === 0;
        const open = pick?.circleId === c.id;
        return (
          <GlassCard key={c.id} className="p-4 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-burgundy/8 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
                <Icon name="graduation" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex font-bold text-sm text-foreground">الشيخ {c.teacherName}</div>
                <div className="font-readex text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="inline-flex items-center gap-1"><Icon name="calendar" size={11} /> {c.availableDays.map((d) => DAY_SHORT[d] ?? d).join("، ")}</span>
                  <span className="inline-flex items-center gap-1"><Icon name="clock" size={11} /> {c.availableTimes.join("، ")}</span>
                  <span className={`inline-flex items-center gap-1 font-bold ${closed ? "text-destructive" : full ? "text-muted-foreground" : "text-gold-dark dark:text-gold"}`}>
                    <Icon name="star" size={11} />
                    {closed ? "التسجيل مغلق" : full ? "المقاعد ممتلئة" : `${seats} مقعد متاح`}
                  </span>
                </div>
              </div>
              {!closed && !full && (
                <button
                  type="button"
                  onClick={() => setPick(open ? null : { circleId: c.id })}
                  className={`shrink-0 text-xs font-extrabold font-readex rounded-full px-4 py-2 transition active:scale-95 ${open ? "bg-muted text-muted-foreground" : "bg-burgundy text-white hover:bg-burgundy-light"}`}
                >
                  {open ? "إلغاء" : "سجّل"}
                </button>
              )}
            </div>
            {open && (
              <div className="mt-4 pt-4 border-t border-burgundy/10 dark:border-gold/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <div className="font-readex text-xs font-bold text-muted-foreground mb-1.5">اختر اليوم</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.availableDays.map((d) => (
                      <button
                        key={d} type="button"
                        onClick={() => setPick({ circleId: c.id, day: d, time: pick?.time })}
                        className={`font-readex text-xs font-bold rounded-full px-3.5 py-1.5 transition active:scale-95 ${pick?.day === d ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/8 dark:bg-gold/10 text-burgundy"}`}
                      >
                        {DAY_SHORT[d] ?? d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-readex text-xs font-bold text-muted-foreground mb-1.5">اختر الوقت</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.availableTimes.map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setPick({ circleId: c.id, day: pick?.day, time: t })}
                        className={`font-readex text-xs font-bold rounded-full px-3.5 py-1.5 transition active:scale-95 ${pick?.time === t ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/8 dark:bg-gold/10 text-burgundy"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!pick?.day || !pick?.time || book.isPending}
                  onClick={() => book.mutate({
                    teacherId: c.teacherId,
                    sessionType: sessionType as "sharia_aqeedah" | "sharia_fiqh" | "sharia_seerah",
                    scheduleId: c.id,
                    levelId,
                    scheduledAt: nextOccurrence(pick!.day!, pick!.time!.split("-")[0]),
                    durationMinutes: c.durationMinutes,
                  })}
                  className="w-full bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3 rounded-full btn-press hover:opacity-90 disabled:opacity-40 transition"
                >
                  {book.isPending ? "جارٍ التسجيل..." : "تأكيد التسجيل في الحلقة"}
                </button>
              </div>
            )}
          </GlassCard>
        );
      })}
    </section>
  );
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  available: { label: "متاح", cls: "bg-gold/20 text-gold-dark dark:text-gold" },
  in_progress: { label: "جارٍ", cls: "bg-burgundy/10 text-burgundy" },
  completed: { label: "مكتمل", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

export const CONTENT_TYPE_META: Record<string, { icon: IconName; label: string }> = {
  pdf: { icon: "file-text", label: "ملف PDF" },
  text: { icon: "file-text", label: "نص مقروء" },
  audio: { icon: "headphones", label: "صوتيات" },
  video: { icon: "video", label: "مرئيات" },
  link: { icon: "link", label: "رابط خارجي" },
};

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-bold text-burgundy hover:underline">
      <span className="inline-block rotate-180"><Icon name="arrow-left" size={14} /></span>
      {label}
    </Link>
  );
}

const Bullet = () => <span className="mt-1.5 h-2 w-2 rounded-full bg-gold shrink-0" />;

type AnyLevel = { id: number | string; name: string; order: number; status: string; progressPercentage: number; contentCount?: number; requiredFor?: string | null };
type AnySubject = { key: string; name: string; description?: string | null; icon?: string | null; color?: string | null; levels: AnyLevel[] };

/** بطاقة مستوى شرعي قابلة للتوسع — تعرض الحلقات المتاحة مباشرةً عند النقر */
function ShariaLevelCard({ level, meta, index, subject }: { level: AnyLevel; meta: { icon: IconName; color: string }; index: number; subject: string }) {
  const [open, setOpen] = useState(false);
  const chip = STATUS_CHIP[level.status] ?? STATUS_CHIP.available;
  return (
    <div className="stagger-in" style={{ animationDelay: `${index * 70}ms` }}>
      <GlassCard className={`p-3 transition-all duration-300 ${open ? "pb-5" : "btn-press hover:shadow-lg"}`}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-right outline-none group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>
              <Icon name={meta.icon} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-readex text-[16px] font-bold text-foreground">{level.name}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
              </div>
            </div>
            <span className="w-9 h-9 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
              <span className={`inline-block transition-transform duration-300 ${open ? "-rotate-90" : ""}`}><Icon name="arrow-left" size={16} /></span>
            </span>
          </div>
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-burgundy/10 dark:border-gold/10 animate-in slide-in-from-top-4 duration-300">
            <Link
              to={`/student/sharia/level/${level.id}`}
              className="block text-center bg-burgundy dark:bg-gold text-white dark:text-night font-readex text-sm font-extrabold py-3.5 rounded-full btn-press hover:opacity-90 transition"
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="graduation" size={16} />
                اختر حلقة
              </span>
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── الوضع 1: /student/sharia/:subject — مستويات المادة بأسلوب بطاقات القرآن ──
function SubjectLevels({ subject }: { subject: string }) {
  const DEMO = authStore.isDemo;
  const q = trpc.sharia.subjects.useQuery(undefined, { enabled: !DEMO });
  const subjects = (DEMO ? demoShariaSubjects() : q.data ?? []) as AnySubject[];
  const data = subjects.find((s) => s.key === subject);
  const fb = SHARIA_SUBJECT_META[subject];
  // الهوية البصرية من الخادم أولاً (يحرّرها المشرف من لوحة الإدارة) مع احتياط من الثوابت
  const meta = data
    ? { icon: (data.icon ?? fb?.icon ?? "books") as IconName, color: data.color ?? fb?.color ?? "#800020", description: data.description ?? fb?.description ?? "" }
    : null;

  if (!DEMO && q.isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.75rem]" />)}</div>;
  }
  if (!data || !meta) return <EmptyState title="المادة غير موجودة" hint="تحقق من الرابط أو عد لصفحة الدروس" />;

  const pct = data.levels.length ? Math.round(data.levels.reduce((a, l) => a + l.progressPercentage, 0) / data.levels.length) : 0;

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <BackLink to="/student/sharia" label="الدروس الشرعية" />

      {/* ── ترويسة المادة ── */}
      <div className="text-center">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>
            <Icon name={meta.icon} size={30} />
          </div>
        </div>
        <h1 className="font-amiri text-2xl font-extrabold text-burgundy">{data.name}</h1>
        <p className="font-readex text-sm text-muted-foreground mt-1 px-6 leading-relaxed">{meta.description}</p>
        <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-readex font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Icon name="books" size={12} /> {data.levels.length} {data.levels.length === 1 ? "مستوى" : "مستويات"}</span>
          {pct > 0 && <span className="inline-flex items-center gap-1 text-gold-dark dark:text-gold"><Icon name="chart" size={12} /> {pct}% مكتمل</span>}
        </div>
        {pct > 0 && <ShariaProgressBar pct={pct} className="mt-3 max-w-xs mx-auto" />}
      </div>

      {/* ── بطاقات المستويات (بأسلوب المستويات القرآنية) ── */}
      {!data.levels.length ? (
        <EmptyState title="لا مستويات بعد" hint="ستضاف مستويات هذه المادة قريباً بإذن الله" />
      ) : (
        <div className="space-y-3 pt-1">
          {data.levels.map((l, i) => <ShariaLevelCard key={String(l.id)} level={l} meta={meta} index={i} subject={subject} />)}
        </div>
      )}
    </div>
  );
}

// ── الوضع 2: /student/sharia/level/:levelId — الحلقات المتاحة للمستوى ──────────
function LevelContent({ levelKey }: { levelKey: string }) {
  const DEMO = authStore.isDemo;
  const nav = useNavigate();
  const numericId = /^\d+$/.test(levelKey) ? Number(levelKey) : NaN;
  const validId = Number.isInteger(numericId) && numericId > 0 ? numericId : null;
  const realMode = !DEMO && validId != null;
  const q = trpc.sharia.levelContent.useQuery({ levelId: validId ?? 1 }, { enabled: realMode });
  const data = (realMode ? q.data : demoShariaLevelContent(levelKey)) as
    | {
        level: { id: number | string; name: string; subject: string; subjectName: string; order: number };
        content: Array<{ id: string; title: string; contentType: string; durationMinutes: number | null; status: string; progressPercentage: number }>;
      }
    | null | undefined;

  if (realMode && q.isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 skeleton rounded-[1.75rem]" />)}</div>;
  }
  if (!data) return <EmptyState title="المستوى غير موجود" />;
  const { level } = data;
  const isQuranBranch = level.subject === "aqeedah_quran";
  const sm = SHARIA_SUBJECT_META[level.subject]
    ?? (isQuranBranch ? SHARIA_SUBJECT_META.aqeedah : { icon: "books" as IconName, color: "#800020" });

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <BackLink
        to={isQuranBranch ? "/student/levels/quran" : `/student/sharia/${level.subject}`}
        label={isQuranBranch ? "مسار القرآن" : `مستويات ${level.subjectName}`}
      />

      {/* ── ترويسة المستوى ── */}
      <div className="text-center">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${sm.color}1f`, color: sm.color }}>
            <Icon name={sm.icon} size={26} />
          </div>
        </div>
        <h1 className="font-amiri text-2xl font-extrabold text-burgundy">{level.subjectName} — {level.name}</h1>
      </div>

      {realMode && typeof level.id === "number" && (
        <div className="flex gap-2" aria-label="إجراءات المستوى">
          <PrimaryButton
            className="flex-1"
            onClick={() => nav(`/student/sharia/exam/${level.id}`)}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="edit" size={16} />
              اختبار المستوى
            </span>
          </PrimaryButton>
          <SecondaryButton
            className="flex-1"
            onClick={() => nav(`/student/sharia/certificate/${level.id}`)}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="certificate" size={16} />
              الشهادة
            </span>
          </SecondaryButton>
        </div>
      )}

      {/* ── الحلقات المتاحة ── */}
      {realMode && typeof level.id === "number" && <LevelCircles levelId={level.id} subject={level.subject} />}

      {/* ── دروس المستوى (تفتح في عارض المحتوى) ── */}
      {data.content.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-amiri text-lg text-burgundy">دروس المستوى</h2>
          {data.content.map((c) => (
            <Link key={c.id} to={`/student/sharia/content/${c.id}`} className="block">
              <GlassCard className="p-3.5 rounded-2xl btn-press hover:border-gold/40 transition flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
                  <Icon name={CONTENT_TYPE_ICON[c.contentType] ?? "books"} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex text-sm font-bold text-foreground leading-snug line-clamp-1">{c.title}</div>
                  <div className="font-readex text-[11px] text-muted-foreground mt-0.5">
                    {CONTENT_TYPE_LABEL[c.contentType] ?? c.contentType}
                    {c.durationMinutes ? ` · ${c.durationMinutes} دقيقة` : ""}
                  </div>
                </div>
                {c.status === "completed" ? (
                  <span className="inline-flex items-center gap-1 font-readex text-[10px] font-bold text-green-600 dark:text-green-400 shrink-0">
                    <Icon name="check" size={12} /> مكتمل
                  </span>
                ) : c.status === "in_progress" ? (
                  <span className="font-readex text-[10px] font-bold text-gold-dark dark:text-gold shrink-0">{Math.round(c.progressPercentage)}%</span>
                ) : null}
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const CONTENT_TYPE_LABEL: Record<string, string> = { audio: "صوتي", video: "مرئي", pdf: "ملف PDF", text: "مقروء" };
const CONTENT_TYPE_ICON: Record<string, IconName> = { audio: "mic", video: "video", pdf: "books", text: "books" };

export default function ShariaLevel() {
  const params = useParams();
  if (params.levelId) return <LevelContent levelKey={params.levelId} />;
  return <SubjectLevels subject={params.subject ?? "aqeedah"} />;
}
