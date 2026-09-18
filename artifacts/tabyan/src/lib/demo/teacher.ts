// بيانات وضع العرض التجريبي — نطاق المعلم
// تطابق أشكال مخرجات lib/tabyan-trpc/src/routers/teacher.ts حرفياً

const DAY = 86400000;
const now = Date.now();
/** تاريخ نسبي من الآن: إزاحة بالأيام + ساعة ودقيقة */
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date(now + dayOffset * DAY);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const TYPE_LABELS: Record<string, string> = {
  quran_hifz: "حفظ قرآن", quran_review: "مراجعة قرآن", qiraat: "قراءات",
  tajweed_correction: "تصحيح تلاوة", tajweed_level: "تجويد",
  sharia_fiqh: "فقه", sharia_aqeedah: "عقيدة", sharia_seerah: "سيرة",
};

export const DEMO_TEACHER_NAME = "أ. فهد العتيبي";

// ─── الحصص (مصدر موحّد تُشتق منه القوائم) ───────────────────────
type DemoSession = {
  id: string; scheduledAt: string; durationMinutes: number; status: string;
  topic: string | null; sessionType: string; type: string;
  studentId: string; studentName: string; levelId: string | null;
};
const ses = (
  id: string, dayOffset: number, h: number, m: number, dur: number, status: string,
  sessionType: string, topic: string | null, studentId: string, studentName: string, type = "individual",
): DemoSession => ({
  id, scheduledAt: at(dayOffset, h, m), durationMinutes: dur, status, topic,
  sessionType, type, studentId, studentName, levelId: null,
});

const SESSIONS: DemoSession[] = [
  // اليوم
  ses("demo-s1",  0, 17, 0,  45, "confirmed", "quran_hifz",   "سورة الكهف — الآيات 1-10",       "demo-st1", "أحمد الرشيدي"),
  ses("demo-s2",  0, 19, 30, 30, "scheduled", "quran_review", "مراجعة جزء عمّ",                  "demo-st2", "سارة القحطاني"),
  ses("demo-s3",  0, 21, 0,  40, "scheduled", "tajweed_level","أحكام النون الساكنة والتنوين",    "demo-st5", "عبدالله العنزي", "group"),
  // غداً وبقية الأسبوع
  ses("demo-s4",  1, 16, 0,  30, "scheduled", "quran_hifz",   "سورة الملك كاملة",                "demo-st3", "خالد الدوسري"),
  ses("demo-s5",  2, 18, 0,  45, "scheduled", "qiraat",       "رواية ورش — باب الإمالة",          "demo-st4", "نورة المطيري"),
  ses("demo-s6",  3, 17, 30, 30, "scheduled", "tajweed_correction", "الفاتحة وأول البقرة",        "demo-st6", "ريما الشمري"),
  ses("demo-s7",  5, 20, 0,  45, "scheduled", "quran_hifz",   "سورة يس — الآيات 1-20",            "demo-st2", "سارة القحطاني"),
  // لاحقاً هذا الشهر
  ses("demo-s8",  8, 17, 0,  30, "scheduled", "quran_review", "مراجعة الجزء الثلاثون",            "demo-st7", "يوسف العجمي"),
  ses("demo-s9", 12, 19, 0,  45, "scheduled", "sharia_fiqh",  "فقه الطهارة — أحكام الوضوء",       "demo-st8", "مريم السبيعي"),
  ses("demo-s10",18, 18, 30, 40, "scheduled", "tajweed_level","أحكام الميم الساكنة",              "demo-st5", "عبدالله العنزي", "group"),
  // مكتملة بانتظار التقييم (3)
  ses("demo-pe1", -1, 17, 0, 45, "completed", "quran_hifz",   "سورة الكهف — الآيات 11-20",        "demo-st1", "أحمد الرشيدي"),
  ses("demo-pe2", -2, 19, 0, 30, "completed", "quran_review", "مراجعة سورتي النبأ والنازعات",     "demo-st3", "خالد الدوسري"),
  ses("demo-pe3", -3, 18, 0, 45, "completed", "qiraat",       "رواية حفص — سورة مريم",            "demo-st4", "نورة المطيري"),
  // مكتملة قديمة مُقيَّمة
  ses("demo-old1",-5, 17, 0, 45, "completed", "quran_hifz",   "سورة الكهف — الآيات 21-30",        "demo-st1", "أحمد الرشيدي"),
  ses("demo-old2",-6, 20, 0, 30, "completed", "quran_review", "مراجعة جزء تبارك",                 "demo-st2", "سارة القحطاني"),
];

const withLabel = (s: DemoSession) => ({ ...s, typeLabel: TYPE_LABELS[s.sessionType] });

// ─── teacher.dashboard ───────────────────────────────────────────
export const DEMO_DASHBOARD = {
  teacher: null,
  nextSession: (() => {
    const n = SESSIONS.filter((s) => new Date(s.scheduledAt).getTime() >= now && ["scheduled", "confirmed"].includes(s.status))
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];
    return n ? withLabel(n) : null;
  })(),
  weekCount: SESSIONS.filter((s) => {
    const t = new Date(s.scheduledAt).getTime();
    return t >= now && t <= now + 7 * DAY;
  }).length,
  studentsCount: 8,
  recordingsThisMonth: 4,
  pendingFatwas: 3,
  summary: {
    completedThisWeek: 5,
    pendingEvaluations: 3,
    teachingHours: "6:30",
    avgRating: "4.8",
  },
};

// ─── teacher.schedule (يحاكي منطق النافذة الزمنية في الـ router) ──
export function demoSchedule(range: "today" | "tomorrow" | "week" | "month") {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (range === "tomorrow") start.setDate(start.getDate() + 1);
  const end = new Date(start);
  if (range === "today" || range === "tomorrow") end.setDate(end.getDate() + 1);
  else if (range === "month") end.setDate(end.getDate() + 30);
  else end.setDate(end.getDate() + 7);
  const sessions = SESSIONS
    .filter((s) => { const t = +new Date(s.scheduledAt); return t >= +start && t <= +end; })
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
    .map(withLabel);
  const changeRequests = [
    {
      id: "demo-cr1", sessionId: "demo-s4",
      requestedNewTime: at(1, 20, 0),
      reason: "عندي اختبار مدرسي بنفس الموعد، أرجو التأجيل ساعتين",
      studentName: "خالد الدوسري",
    },
    {
      id: "demo-cr2", sessionId: "demo-s6",
      requestedNewTime: at(4, 17, 30),
      reason: "سفر عائلي طارئ — هل يمكن نقل الحصة لليوم التالي؟",
      studentName: "ريما الشمري",
    },
  ];
  return { sessions, changeRequests };
}

// ─── teacher.pendingEvaluations ──────────────────────────────────
export const DEMO_PENDING_EVALUATIONS = SESSIONS
  .filter((s) => s.id.startsWith("demo-pe"))
  .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))
  .map(withLabel);

// ─── teacher.sessionRoom (لصفحة التقييم) ─────────────────────────
export function demoSessionRoom(id: string) {
  const s = SESSIONS.find((x) => x.id === id) ?? SESSIONS.find((x) => x.id === "demo-pe1")!;
  return {
    id: s.id, scheduledAt: s.scheduledAt, status: s.status,
    sessionType: s.sessionType, topic: s.topic, durationMinutes: s.durationMinutes,
    notes: null as string | null, teacherId: "demo-teacher", studentId: s.studentId,
    studentName: s.studentName, levelId: s.levelId, typeLabel: TYPE_LABELS[s.sessionType],
  };
}

// ─── teacher.myStudents ──────────────────────────────────────────
export const DEMO_MY_STUDENTS = [
  { studentId: "demo-st1", name: "أحمد الرشيدي",   totalJuz: 12, currentLevelId: "demo-lv3", levelName: "المستوى الثالث — الشداد",  lastScore: 88, nextSessionAt: at(0, 17, 0) },
  { studentId: "demo-st2", name: "سارة القحطاني",  totalJuz: 7,  currentLevelId: "demo-lv2", levelName: "المستوى الثاني — البراعم", lastScore: 92, nextSessionAt: at(0, 19, 30) },
  { studentId: "demo-st3", name: "خالد الدوسري",   totalJuz: 3,  currentLevelId: "demo-lv1", levelName: "المستوى الأول — الغرس",   lastScore: 74, nextSessionAt: at(1, 16, 0) },
  { studentId: "demo-st4", name: "نورة المطيري",   totalJuz: 20, currentLevelId: "demo-lv4", levelName: "المستوى الرابع — الرواد",  lastScore: 95, nextSessionAt: at(2, 18, 0) },
  { studentId: "demo-st5", name: "عبدالله العنزي", totalJuz: 5,  currentLevelId: "demo-lv2", levelName: "المستوى الثاني — البراعم", lastScore: 81, nextSessionAt: at(0, 21, 0) },
  { studentId: "demo-st6", name: "ريما الشمري",    totalJuz: 1,  currentLevelId: "demo-lv1", levelName: "المستوى الأول — الغرس",   lastScore: null as number | null, nextSessionAt: at(3, 17, 30) },
  { studentId: "demo-st7", name: "يوسف العجمي",    totalJuz: 15, currentLevelId: "demo-lv4", levelName: "المستوى الرابع — الرواد",  lastScore: 90, nextSessionAt: at(8, 17, 0) },
  { studentId: "demo-st8", name: "مريم السبيعي",   totalJuz: 9,  currentLevelId: "demo-lv3", levelName: "المستوى الثالث — الشداد",  lastScore: 77, nextSessionAt: at(12, 19, 0) },
];

// ─── teacher.studentDetail ───────────────────────────────────────
const PHONES: Record<string, string> = {
  "demo-st1": "0501112233", "demo-st2": "0502223344", "demo-st3": "0503334455", "demo-st4": "0504445566",
  "demo-st5": "0505556677", "demo-st6": "0506667788", "demo-st7": "0507778899", "demo-st8": "0508889900",
};
const EVAL_BANK: Record<string, { total: number; h: number; r: number; t: number; c: number; notes: string }[]> = {
  "demo-st1": [
    { total: 88, h: 27, r: 17, t: 35, c: 9, notes: "حفظ متقن، ينتبه لأحكام المدود. راجع مواضع الوقف في الآيات 15-18." },
    { total: 84, h: 25, r: 16, t: 34, c: 9, notes: "تحسّن ملحوظ في مخارج الحروف، واصل." },
    { total: 79, h: 24, r: 15, t: 32, c: 8, notes: "يحتاج تركيزاً أكبر على التفخيم والترقيق." },
  ],
  "demo-st2": [
    { total: 92, h: 28, r: 18, t: 37, c: 9, notes: "أداء متميز — مرشّحة للترقية قريباً بإذن الله." },
    { total: 90, h: 27, r: 18, t: 36, c: 9, notes: "مراجعة جزء عمّ متقنة." },
  ],
  "demo-st3": [{ total: 74, h: 22, r: 13, t: 30, c: 9, notes: "التزام ممتاز، نعمل على إتقان الحفظ الجديد." }],
  "demo-st4": [
    { total: 95, h: 29, r: 19, t: 38, c: 9, notes: "تلاوة رائعة برواية حفص — استعدي لاختبار الإجازة." },
    { total: 93, h: 28, r: 19, t: 37, c: 9, notes: "ضبط عالٍ للمتن." },
  ],
  "demo-st5": [{ total: 81, h: 24, r: 16, t: 33, c: 8, notes: "أحسن في تطبيق أحكام النون الساكنة." }],
  "demo-st6": [],
  "demo-st7": [{ total: 90, h: 27, r: 18, t: 36, c: 9, notes: "مراجعة الجزء الثلاثون كاملة بنجاح." }],
  "demo-st8": [{ total: 77, h: 23, r: 15, t: 31, c: 8, notes: "نركّز الفترة القادمة على فقه الطهارة نظرياً." }],
};

export function demoStudentDetail(studentId: string) {
  const st = DEMO_MY_STUDENTS.find((x) => x.studentId === studentId) ?? DEMO_MY_STUDENTS[0];
  const evals = (EVAL_BANK[st.studentId] ?? []).map((e, i) => ({
    id: `demo-ev-${st.studentId}-${i}`,
    studentId: st.studentId, teacherId: "demo-teacher", sessionId: `demo-evs-${st.studentId}-${i}`,
    hifzScore: e.h, revisionScore: e.r, tajweedScore: e.t, commitmentScore: e.c,
    totalScore: e.total, notes: e.notes, audioNotesUrl: null as string | null,
    recommendation: e.total >= 90 ? "promote" : "keep", isCompleted: true,
    createdAt: at(-3 - i * 4, 20, 0),
  }));
  const upcoming = SESSIONS
    .filter((s) => s.studentId === st.studentId && new Date(s.scheduledAt).getTime() >= now)
    .map((s) => ({
      id: s.id, scheduledAt: s.scheduledAt, status: s.status, sessionType: s.sessionType,
      topic: s.topic, durationMinutes: s.durationMinutes, type: s.type,
      teacherId: "demo-teacher", studentId: s.studentId, levelId: s.levelId, notes: null as string | null,
    }));
  const recordings = SESSIONS
    .filter((s) => s.studentId === st.studentId && s.status === "completed")
    .map((s, i) => ({
      id: `demo-rec-${st.studentId}-${i}`, sessionId: s.id, videoUrl: `/recordings/${s.id}.mp4`,
      durationSeconds: s.durationMinutes * 60, createdAt: s.scheduledAt,
    }));
  return {
    info: {
      user: {
        id: st.studentId, fullName: st.name, phone: PHONES[st.studentId] ?? "0500000000",
        role: "student", avatarUrl: null as string | null, isActive: true,
      },
      student: {
        userId: st.studentId, totalJuz: st.totalJuz, currentLevelId: st.currentLevelId,
        birthDate: "2012-04-15", schoolStage: "middle", schoolGrade: "الثاني متوسط", parentPhone: "0509998877",
      },
    },
    evaluations: evals,
    upcoming,
    recordings,
    // بيانات تجريبية: الطالب الأول يرغب في حفظ المنظومة، الباقون لم يحددوا بعد
    wantsTuhfa: st.studentId === "demo-s1" ? true : null,
  };
}

// ─── teacher.myRecordings ────────────────────────────────────────
export const DEMO_MY_RECORDINGS = [
  { id: "demo-rec1", sessionId: "demo-pe1",  videoUrl: "/recordings/demo-pe1.mp4",  durationSeconds: 2700, createdAt: at(-1, 17, 45),  studentName: "أحمد الرشيدي",  topic: "سورة الكهف — الآيات 11-20",      sessionType: "quran_hifz",   typeLabel: "حفظ قرآن",    hasEvaluation: false },
  { id: "demo-rec2", sessionId: "demo-pe2",  videoUrl: "/recordings/demo-pe2.mp4",  durationSeconds: 1800, createdAt: at(-2, 19, 30),  studentName: "خالد الدوسري",  topic: "مراجعة سورتي النبأ والنازعات",    sessionType: "quran_review", typeLabel: "مراجعة قرآن", hasEvaluation: false },
  { id: "demo-rec3", sessionId: "demo-pe3",  videoUrl: "/recordings/demo-pe3.mp4",  durationSeconds: 2700, createdAt: at(-3, 18, 45),  studentName: "نورة المطيري",  topic: "رواية حفص — سورة مريم",           sessionType: "qiraat",       typeLabel: "قراءات",      hasEvaluation: false },
  { id: "demo-rec4", sessionId: "demo-old1", videoUrl: "/recordings/demo-old1.mp4", durationSeconds: 2700, createdAt: at(-5, 17, 45),  studentName: "أحمد الرشيدي",  topic: "سورة الكهف — الآيات 21-30",      sessionType: "quran_hifz",   typeLabel: "حفظ قرآن",    hasEvaluation: true },
  { id: "demo-rec5", sessionId: "demo-old2", videoUrl: "/recordings/demo-old2.mp4", durationSeconds: 1800, createdAt: at(-6, 20, 30),  studentName: "سارة القحطاني", topic: "مراجعة جزء تبارك",                sessionType: "quran_review", typeLabel: "مراجعة قرآن", hasEvaluation: true },
];

// ─── teacher.fatwaInbox ──────────────────────────────────────────
export const DEMO_FATWA_INBOX = {
  isMufti: true,
  items: [
    {
      id: "demo-fw1",
      questionText: "ما حكم قراءة القرآن من المصحف الإلكتروني في الجوال بدون وضوء؟ وهل يختلف الحكم إذا كنت أقرأ من الذاكرة أثناء قيادة السيارة؟",
      category: "taharah", status: "assigned", priority: "normal",
      assignedAt: at(0, 9, 0), createdAt: at(0, 8, 30), studentName: "سارة القحطاني",
      answerId: null as string | null, answerStatus: null as string | null, hoursAgo: 6,
    },
    {
      id: "demo-fw2",
      questionText: "أعمل في شركة ووقت صلاة الظهر يأتي وأنا في اجتماعات متواصلة، هل يجوز لي الجمع بين الظهر والعصر في آخر الوقت؟ وما الضابط في ذلك؟",
      category: "salah", status: "assigned", priority: "urgent",
      assignedAt: at(-2, 10, 0), createdAt: at(-2, 9, 0), studentName: "يوسف العجمي",
      answerId: null as string | null, answerStatus: null as string | null, hoursAgo: 40,
    },
    {
      id: "demo-fw3",
      questionText: "عندي مبلغ من المال حال عليه الحول وأنا أدخره لشراء بيت، هل تجب فيه الزكاة أم أنه من المال المُعدّ للحاجة؟",
      category: "zakah", status: "assigned", priority: "normal",
      assignedAt: at(-1, 14, 0), createdAt: at(-1, 13, 0), studentName: "مريم السبيعي",
      answerId: null as string | null, answerStatus: null as string | null, hoursAgo: 22,
    },
    {
      id: "demo-fw4",
      questionText: "ما صحة حديث «من حفظ عشر آيات من أول سورة الكهف عُصم من الدجال»؟ وهل يكفي حفظ أول السورة أم آخرها؟",
      category: "aqeedah", status: "answered", priority: "normal",
      assignedAt: at(-4, 11, 0), createdAt: at(-4, 10, 0), studentName: "أحمد الرشيدي",
      answerId: "demo-fwa1", answerStatus: "approved", hoursAgo: 96,
    },
    {
      id: "demo-fw5",
      questionText: "هل يجوز الاستماع للقرآن أثناء النوم بنية مراجعة الحفظ؟ وهل يؤثر ذلك على خشوع القلب؟",
      category: "tajweed", status: "answered", priority: "normal",
      assignedAt: at(-6, 16, 0), createdAt: at(-6, 15, 0), studentName: "نورة المطيري",
      answerId: "demo-fwa2", answerStatus: "pending", hoursAgo: 130,
    },
  ],
};

// ─── teacher.settings ────────────────────────────────────────────
export type DemoTeacherSettings = {
  id: string; teacherId: string;
  videoQuality: "360p" | "480p" | "720p" | "1080p";
  audioQuality: "low" | "medium" | "high";
  autoRecord: boolean; reminderMinutes: number;
  defaultCameraOn: boolean; defaultMicOn: boolean;
  notificationsEnabled: boolean; soundEnabled: boolean; vibrationEnabled: boolean;
};
export const DEMO_TEACHER_SETTINGS: DemoTeacherSettings = {
  id: "demo-ts1", teacherId: "demo-teacher",
  videoQuality: "720p", audioQuality: "high",
  autoRecord: true, reminderMinutes: 15,
  defaultCameraOn: true, defaultMicOn: true,
  notificationsEnabled: true, soundEnabled: true, vibrationEnabled: true,
};

// ─── teacher.kycStatus ───────────────────────────────────────────
export const DEMO_KYC = { kycStatus: "approved", notes: null as string | null, isMufti: true };

// ─── auth.me (لمعلم العرض) ───────────────────────────────────────
export const DEMO_ME = {
  id: "demo-teacher", fullName: DEMO_TEACHER_NAME, phone: "0501234567",
  role: "teacher", avatarUrl: null as string | null, isActive: true,
  teacher: {
    userId: "demo-teacher",
    bio: "معلم قرآن كريم مجاز برواية حفص عن عاصم بالسند المتصل — خبرة 12 عاماً في التعليم عن بُعد، متخصص في مسارات الحفظ والقراءات.",
    kycStatus: "approved", isMufti: true,
  },
};
