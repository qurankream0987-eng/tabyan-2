import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { InitialsAvatar } from "@/components/CircularUserCard";
import { useToast } from "@/hooks/useToast";
import { DAY_AR } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_TEACHERS } from "@/lib/demo/student-extra";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";
// ترتيب العرض: السبت أولاً — أما تحويل getDay() فيبقى على ترتيب JS (الأحد=0)
const DAY_ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const JS_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

type SessionType = "quran_hifz" | "quran_review" | "qiraat" | "tajweed_correction" | "tajweed_level" | "sharia_fiqh" | "sharia_aqeedah" | "sharia_seerah";

/** ترشيح المواعيد حسب المسار القادم من رابط الصفحة السابقة (?path=…) */
const PATH_SESSION_TYPES: Record<string, SessionType[]> = {
  quran: ["quran_hifz", "quran_review"],
  qiraat: ["qiraat"],
  tajweed: ["tajweed_level"],
  tajweed_correction: ["tajweed_correction"],
  sharia: ["sharia_fiqh", "sharia_aqeedah", "sharia_seerah"],
};
const PATH_LABELS: Record<string, string> = {
  quran: "القرآن الكريم",
  qiraat: "القراءات",
  tajweed: "دروس التجويد",
  tajweed_correction: "تصحيح التلاوة",
  sharia: "الدروس الشرعية",
};

type Schedule = {
  id: string; sessionType: string; typeLabel: string; sessionMode: string;
  maxStudents: number; availableDays: unknown; availableTimes: unknown;
  durationMinutes: number; levelId: number | null; enrolledCount?: number;
};
type Teacher = {
  teacherId: string; name: string; avgRating: string; experienceYears: number;
  specialization: string | null; schedules: Schedule[];
};

/** خانة موعد واحدة: يوم + وقت + شيخ + حلقة */
type Slot = { day: string; time: string; teacher: Teacher; schedule: Schedule };

const fmtTime12 = (t: string) => {
  const one = (x: string) => {
    const [h, m] = x.split(":").map(Number);
    const period = h >= 12 ? "مساءً" : "صباحاً";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, "0")} ${period}`;
  };
  if (t.includes("-")) {
    const [s, e] = t.split("-");
    return `${one(s)} – ${one(e)}`;
  }
  return one(t);
};

const barColor = (ratio: number) =>
  ratio >= 1 ? "bg-destructive" : ratio >= 0.75 ? "bg-gold" : "bg-emerald-500";

export default function Booking() {
  const DEMO = authStore.isDemo;
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const pathFilter = searchParams.get("path") ?? "";
  const levelIdParam = Number(searchParams.get("levelId")) || null;
  const allowedTypes = PATH_SESSION_TYPES[pathFilter];
  const teachers = trpc.student.teachers.useQuery(undefined, { enabled: !DEMO });
  const teacherRows = (DEMO ? DEMO_TEACHERS : teachers.data ?? []) as Teacher[];
  const teachersLoading = !DEMO && teachers.isLoading;

  const [sel, setSel] = useState<Slot | null>(null);
  const [booked, setBooked] = useState<Slot | null>(null);

  const book = trpc.student.bookSession.useMutation({
    onSuccess: () => {
      setBooked(sel);
      setSel(null);
      utils.student.mySessions.invalidate();
      utils.student.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });

  /* تجميع كل المواعيد حسب أيام الأسبوع */
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const t of teacherRows) {
      for (const sc of t.schedules) {
        if (allowedTypes && !allowedTypes.includes(sc.sessionType as SessionType)) continue;
        if (levelIdParam != null && sc.levelId != null && sc.levelId !== levelIdParam) continue;
        const days = (sc.availableDays as string[]) ?? [];
        const times = (sc.availableTimes as string[]) ?? [];
        for (const day of days) {
          for (const time of times) {
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push({ day, time, teacher: t, schedule: sc });
          }
        }
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [teacherRows, allowedTypes, levelIdParam]);

  const days = DAY_ORDER.filter((d) => slotsByDay.has(d));

  const nextDateFor = (dayKey: string, timeStr: string) => {
    const target = JS_DAY_KEYS.indexOf(dayKey);
    const d = new Date();
    d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
    const [h, m] = timeStr.split("-")[0].split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const confirm = () => {
    if (!sel) return;
    if (DEMO) { toast(DEMO_TOAST); setBooked(sel); setSel(null); return; }
    book.mutate({
      teacherId: sel.teacher.teacherId,
      sessionType: sel.schedule.sessionType as SessionType,
      scheduleId: sel.schedule.id,
      levelId: sel.schedule.levelId ?? undefined,
      scheduledAt: nextDateFor(sel.day, sel.time),
      durationMinutes: sel.schedule.durationMinutes,
    });
  };

  return (
    <div className="space-y-5 page-enter pb-10">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="calendar" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >حجز المواعيد الأسبوعية</h1>
        <p className="font-readex text-sm text-muted-foreground">اختر اليوم والوقت والشيخ — الموعد يتكرر أسبوعياً بشكل ثابت</p>
        {allowedTypes && (
          <div className="mt-2.5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy/10 dark:bg-gold/10 text-burgundy text-xs font-readex font-bold">
              مواعيد مسار {PATH_LABELS[pathFilter]} فقط
            </span>
          </div>
        )}
      </div>

      {teachersLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 skeleton rounded-[1.5rem]" />)}
        </div>
      ) : !days.length ? (
        <EmptyState title="لا مواعيد متاحة حالياً" hint={allowedTypes ? `لا توجد مواعيد منشورة لمسار ${PATH_LABELS[pathFilter]} بعد — ستُضاف قريباً` : "سيقوم المسؤول بإضافة جداول الحلقات قريباً"} />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day}>
              <h2 className="font-readex text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
                  <Icon name="calendar" size={13} />
                </div>
                {DAY_AR[day]}
                <span className="text-[11px] font-normal text-muted-foreground mr-auto">{slotsByDay.get(day)!.length} موعد</span>
              </h2>
              <div className="space-y-2.5">
                {slotsByDay.get(day)!.map((slot) => {
                  const sc = slot.schedule;
                  const isGroup = sc.sessionMode === "group";
                  const enrolled = typeof sc.enrolledCount === "number" ? sc.enrolledCount : 0;
                  const ratio = isGroup ? Math.min(1, enrolled / sc.maxStudents) : 0;
                  return (
                    <button
                      key={`${sc.id}-${slot.time}`}
                      onClick={() => setSel(slot)}
                      className="w-full text-start rounded-[1.25rem] border p-3.5 transition btn-press bg-card border-burgundy/10 dark:border-gold/10 hover:border-burgundy/30 dark:hover:border-gold/30 hover:shadow-card-hover"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-burgundy/5 dark:bg-gold/5 text-burgundy flex items-center justify-center shrink-0 border border-burgundy/10 dark:border-gold/10">
                          <span className="font-readex font-extrabold text-sm" dir="ltr">{slot.time}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-readex font-bold text-sm text-foreground truncate">{slot.teacher.name}</div>
                          <div className="text-[11px] text-muted-foreground font-readex flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{sc.typeLabel}</span>
                            <span className="opacity-40">·</span>
                            <span>{fmtTime12(slot.time)}</span>
                            <span className="opacity-40">·</span>
                            <span>{sc.durationMinutes} دقيقة</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs px-3.5 py-1.5 rounded-full bg-burgundy text-white dark:bg-gold dark:text-night font-readex font-bold">اختر</span>
                      </div>
                      {isGroup ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] font-readex mb-1">
                            <span className="text-muted-foreground">
                              {"المقاعد المحجوزة"}
                            </span>
                            <span className="text-muted-foreground" dir="ltr">
                              {typeof sc.enrolledCount === "number" ? `${enrolled}/${sc.maxStudents}` : `0/${sc.maxStudents}`} طالب
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor(ratio)}`} style={{ width: `${Math.max(ratio * 100, 4)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] font-readex text-muted-foreground flex items-center gap-1">
                          <Icon name="star" size={10} className="text-gold" /> حلقة فردية — {slot.teacher.specialization ?? "معلم قرآن"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* شاشة تأكيد الحجز */}
      <Modal open={!!sel} onClose={() => !book.isPending && setSel(null)}>
        {sel && (
          <div className="space-y-4">
            <h3 className="font-amiri text-xl text-burgundy text-center font-bold">تأكيد الحجز الأسبوعي</h3>
            <div className="flex items-center gap-3 rounded-2xl bg-burgundy/4 dark:bg-gold/4 border border-burgundy/8 dark:border-gold/8 p-3.5">
              <InitialsAvatar name={sel.teacher.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-readex font-bold text-sm">{sel.teacher.name}</div>
                <div className="text-[11px] text-muted-foreground font-readex flex items-center gap-1 mt-0.5">
                  <span>{sel.teacher.specialization ?? "معلم قرآن"}</span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-0.5 text-gold"><Icon name="star" size={10} />{sel.teacher.avgRating}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-readex">
              <div className="rounded-xl bg-muted p-2.5">
                <div className="text-[10px] text-muted-foreground mb-0.5">اليوم</div>
                <div className="text-sm font-bold">{DAY_AR[sel.day]}</div>
              </div>
              <div className="rounded-xl bg-muted p-2.5">
                <div className="text-[10px] text-muted-foreground mb-0.5">الوقت</div>
                <div className="text-sm font-bold" dir="ltr">{sel.time}</div>
              </div>
              <div className="rounded-xl bg-muted p-2.5">
                <div className="text-[10px] text-muted-foreground mb-0.5">الحلقة</div>
                <div className="text-sm font-bold truncate">{sel.schedule.typeLabel}</div>
              </div>
            </div>
            <p className="font-readex text-[12px] text-muted-foreground text-center leading-relaxed">
              هذا موعد أسبوعي ثابت يتكرر كل {DAY_AR[sel.day]} الساعة {fmtTime12(sel.time)} حتى نهاية المستوى الحالي
            </p>
            <div className="flex gap-2">
              <PrimaryButton className="flex-1" disabled={book.isPending} onClick={confirm}>
                {book.isPending ? "جارٍ الحجز…" : <span className="inline-flex items-center gap-1.5">تأكيد الحجز<Icon name="check" size={16} /></span>}
              </PrimaryButton>
              <button onClick={() => setSel(null)} disabled={book.isPending} className="flex-1 py-2 rounded-full bg-muted font-readex text-sm font-bold text-foreground transition hover:bg-muted/80 btn-press">تراجع</button>
            </div>
          </div>
        )}
      </Modal>

      {/* شاشة نجاح الحجز */}
      <Modal open={!!booked} onClose={() => setBooked(null)}>
        {booked && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Icon name="check" size={28} />
            </div>
            <h3 className="font-amiri text-xl font-bold text-foreground">تم تسجيل حجزك الأسبوعي</h3>
            <p className="font-readex text-sm text-muted-foreground leading-relaxed">
              حلقة {booked.schedule.typeLabel} مع {booked.teacher.name}
              <br />
              كل {DAY_AR[booked.day]} الساعة {fmtTime12(booked.time)}
            </p>
            <div className="flex gap-2 pt-1">
              <Link to="/student/schedule" className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 btn-bubble btn-primary-bubble font-readex text-sm font-bold">
                جدولي الأسبوعي
              </Link>
              <button onClick={() => setBooked(null)} className="flex-1 py-2 rounded-full bg-muted font-readex text-sm font-bold text-foreground transition hover:bg-muted/80 btn-press">إغلاق</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
