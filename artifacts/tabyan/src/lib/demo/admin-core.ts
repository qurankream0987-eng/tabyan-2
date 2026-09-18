// بيانات وضع العرض التجريبي — نطاق صفحات المسؤول الأساسية
// الأشكال تطابق مخرجات lib/tabyan-trpc/src/routers/admin.ts حرفياً

const NOW = Date.now();
const HOUR = 3600 * 1000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const isoFuture = (msAhead: number) => new Date(NOW + msAhead).toISOString();

// ---------- admin.kpis ----------
export const DEMO_KPIS = {
  activeStudents: 50,
  sessionsToday: 8,
  completedMonth: 186,
  avgRating: "4.8",
  churnRate: 12,
  urgent: {
    pendingReviews: 2,
    pendingQiraat: 1,
    pendingPlacement: 1,
    pendingKyc: 2,
    pendingFatwas: 3,
    lateFatwas48h: 1,
  },
};

// ---------- admin.activeAdmins ----------
export const DEMO_ACTIVE_ADMINS = [
  {
    id: "demo-admin-session-1",
    userId: "demo-admin-1",
    fullName: "فهد العجمي",
    phone: "+96599001122",
    isActive: true,
    lastActivity: iso(1 * HOUR),
    createdAt: iso(3 * HOUR),
  },
];

// ---------- admin.usersList ----------
export type DemoUserRow = {
  id: string; fullName: string; phone: string; role: string; isActive: boolean;
  bannedUntil: string | null; banReason: string | null; createdAt: string;
  totalJuz?: number; levelName?: string; avgRating?: string; isMufti?: boolean; kycStatus?: string;
};

export const DEMO_USERS: DemoUserRow[] = [
  {
    id: "demo-st-1", fullName: "عبدالرحمن السبيعي", phone: "+96555102030", role: "student",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(40 * 24 * HOUR),
    totalJuz: 3, levelName: "السنبلة",
  },
  {
    id: "demo-st-2", fullName: "سارة الحربي", phone: "+96555102031", role: "student",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(35 * 24 * HOUR),
    totalJuz: 1, levelName: "الغرس",
  },
  {
    id: "demo-st-3", fullName: "عمر البدر", phone: "+96555102032", role: "student",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(60 * 24 * HOUR),
    totalJuz: 8, levelName: "النماء",
  },
  {
    id: "demo-st-4", fullName: "مريم الشهري", phone: "+96555102033", role: "student",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(20 * 24 * HOUR),
    totalJuz: 2, levelName: "الغرس",
  },
  {
    id: "demo-st-5", fullName: "حسن العلي", phone: "+96555102034", role: "student",
    isActive: true, bannedUntil: isoFuture(20 * HOUR), banReason: "غياب متكرر عن الحصص دون اعتذار",
    createdAt: iso(50 * 24 * HOUR), totalJuz: 4, levelName: "السنبلة",
  },
  {
    id: "demo-t-1", fullName: "أحمد بن صالح الهاشمي", phone: "+96599112233", role: "teacher",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(90 * 24 * HOUR),
    avgRating: "4.9", isMufti: false, kycStatus: "approved",
  },
  {
    id: "demo-t-2", fullName: "عبدالله محمد المطيري", phone: "+96599112234", role: "teacher",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(85 * 24 * HOUR),
    avgRating: "4.7", isMufti: false, kycStatus: "approved",
  },
  {
    id: "demo-t-3", fullName: "محمد القحطاني", phone: "+96599112235", role: "teacher",
    isActive: true, bannedUntil: null, banReason: null, createdAt: iso(120 * 24 * HOUR),
    avgRating: "5.0", isMufti: true, kycStatus: "approved",
  },
  {
    id: "demo-t-4", fullName: "فاطمة الزهراني", phone: "+96599112236", role: "teacher",
    isActive: false, bannedUntil: null, banReason: null, createdAt: iso(70 * 24 * HOUR),
    avgRating: "4.5", isMufti: false, kycStatus: "pending",
  },
];

// ---------- admin.levelThresholds ----------
export const DEMO_LEVELS = [
  { id: 1, name: "الغرس", path: "quran" },
  { id: 2, name: "السنبلة", path: "quran" },
  { id: 3, name: "النماء", path: "quran" },
  { id: 4, name: "الثمرة", path: "quran" },
  { id: 5, name: "الوارثون", path: "quran" },
  { id: 6, name: "تصحيح التلاوة", path: "tajweed_correction" },
  { id: 7, name: "إجازة حفص", path: "qiraat" },
  { id: 8, name: "أحكام التجويد", path: "tajweed" },
  { id: 9, name: "العقيدة", path: "sharia" },
  { id: 10, name: "الفقه", path: "sharia" },
];

// ---------- admin.kycList ----------
const KYC_QUESTIONS: { q: string; a: string }[] = [
  { q: "ما مؤهلك العلمي في القرآن الكريم؟", a: "بكالوريوس قراءات — جامعة أم القرى" },
  { q: "هل تحمل إجازة بسند متصل؟", a: "نعم، إجازة برواية حفص عن عاصم بالسند المتصل" },
  { q: "كم سنة خبرة في التدريس؟", a: "سبع سنوات في حلقات المساجد والتدريس عن بُعد" },
  { q: "ما الفئات العمرية التي درّستها؟", a: "الناشئة من 8 سنوات حتى الكبار" },
  { q: "هل لديك خبرة في التدريس عن بُعد؟", a: "نعم، ثلاث سنوات عبر المنصات التعليمية" },
  { q: "كم حصة أسبوعياً يمكنك تقديمها؟", a: "من 10 إلى 15 حصة أسبوعياً" },
  { q: "ما أوقات تفرّغك؟", a: "الفترة المسائية من العصر حتى العشاء" },
  { q: "هل تجيد أحكام التجويد نظرياً وتطبيقياً؟", a: "نعم، ودرّست متن تحفة الأطفال والجزرية" },
  { q: "لماذا تريد الانضمام إلى تبيان؟", a: "لنشر تعليم القرآن بأسلوب عصري منظم" },
  { q: "هل تقر بالالتزام بمعايير المنصة؟", a: "أقر بذلك وأتعهد بالالتزام الكامل" },
];

export const DEMO_KYC = [
  {
    teacherId: "demo-t-5",
    name: "نورة العنزي",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    answers: KYC_QUESTIONS,
    createdAt: iso(22 * HOUR),
    hoursAgo: 22,
  },
  {
    teacherId: "demo-t-6",
    name: "سعد الدوسري",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    answers: KYC_QUESTIONS,
    createdAt: iso(6 * HOUR),
    hoursAgo: 6,
  },
];

// ---------- admin.placementList ----------
export const DEMO_PLACEMENT = [
  {
    userId: "demo-st-6",
    name: "يوسف الحماد",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    pathType: "quran" as const,
    schoolStage: "متوسط",
    schoolGrade: "الثالث المتوسط",
    createdAt: iso(30 * HOUR),
    hoursAgo: 30,
  },
];

// ---------- admin.studentFile ----------
export const DEMO_STUDENT_FILE = {
  user: { id: "demo-st-1", fullName: "عبدالرحمن السبيعي", phone: "0501234567", createdAt: iso(40 * 24 * HOUR), isActive: true },
  student: {
    userId: "demo-st-1", currentLevelId: 1, totalJuz: 3,
    placementTestStatus: "approved" as const,
    placementTestVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    placementPathType: "quran" as const,
    schoolStage: "middle" as const, schoolGrade: "الثالث المتوسط",
    birthDate: "2011-05-12", parentPhone: "0509876543",
    createdAt: iso(40 * 24 * HOUR),
  },
  currentLevelName: "الغرس", currentLevelPath: "quran",
  progress: [
    { id: "dp-1", status: "in_progress", startedAt: iso(20 * 24 * HOUR), completedAt: null, completedJuz: 2, completedSessions: 8, levelName: "الغرس", levelPath: "quran" },
  ],
  sessions: [
    { id: "ds-1", scheduledAt: iso(2 * 24 * HOUR), status: "completed", sessionType: "quran_hifz", durationMinutes: 30, teacherName: "أحمد المالكي", typeLabel: "حفظ قرآن" },
    { id: "ds-2", scheduledAt: new Date(NOW + 2 * 24 * HOUR).toISOString(), status: "confirmed", sessionType: "quran_hifz", durationMinutes: 30, teacherName: "أحمد المالكي", typeLabel: "حفظ قرآن" },
  ],
};

// ---------- admin.qiraatList ----------
export const DEMO_QIRAAT = [
  {
    id: "demo-cert-1",
    studentId: "demo-st-3",
    certificateUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    status: "pending",
    adminReviewerId: null,
    reviewNotes: null,
    createdAt: iso(26 * HOUR),
    reviewedAt: null,
    studentName: "عمر البدر",
    hoursAgo: 26,
  },
  {
    id: "demo-cert-2",
    studentId: "demo-st-4",
    certificateUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    status: "approved",
    adminReviewerId: "demo-admin-1",
    reviewNotes: "إجازة موثقة بالسند — أهلاً بك في مسار القراءات",
    createdAt: iso(5 * 24 * HOUR),
    reviewedAt: iso(4 * 24 * HOUR),
    studentName: "مريم الشهري",
    hoursAgo: 120,
  },
  {
    id: "demo-cert-3",
    studentId: "demo-st-7",
    certificateUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    status: "rejected",
    adminReviewerId: "demo-admin-1",
    reviewNotes: "صورة الشهادة غير واضحة — أعد رفعها بجودة أعلى",
    createdAt: iso(7 * 24 * HOUR),
    reviewedAt: iso(6 * 24 * HOUR),
    studentName: "خالد النصار",
    hoursAgo: 168,
  },
];

// ---------- admin.promotionsList ----------
export const DEMO_PROMOTIONS = [
  {
    id: "demo-promo-1",
    studentId: "demo-st-1",
    fromLevelId: 1,
    toLevelId: 2,
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    status: "pending",
    reviewNotes: null,
    adminReviewerId: null,
    createdAt: iso(5 * HOUR),
    reviewedAt: null,
    studentName: "عبدالرحمن السبيعي",
    schoolStage: "ابتدائي",
    fromName: "الغرس",
    toName: "السنبلة",
    hoursAgo: 5,
  },
  {
    id: "demo-promo-2",
    studentId: "demo-st-2",
    fromLevelId: 1,
    toLevelId: 2,
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    status: "pending",
    reviewNotes: null,
    adminReviewerId: null,
    createdAt: iso(11 * HOUR),
    reviewedAt: null,
    studentName: "سارة الحربي",
    schoolStage: "ابتدائي",
    fromName: "الغرس",
    toName: "السنبلة",
    hoursAgo: 11,
  },
];

// ---------- admin.teachersList ----------
export const DEMO_TEACHERS = [
  { teacherId: "demo-t-1", name: "أحمد بن صالح الهاشمي", isMufti: false, kycStatus: "approved" },
  { teacherId: "demo-t-2", name: "عبدالله محمد المطيري", isMufti: false, kycStatus: "approved" },
  { teacherId: "demo-t-3", name: "محمد القحطاني", isMufti: true, kycStatus: "approved" },
  { teacherId: "demo-t-4", name: "فاطمة الزهراني", isMufti: false, kycStatus: "pending" },
  { teacherId: "demo-t-5", name: "نورة العنزي", isMufti: false, kycStatus: "pending" },
  { teacherId: "demo-t-6", name: "سعد الدوسري", isMufti: false, kycStatus: "pending" },
];

// ---------- admin.schedulesList ----------
export const DEMO_SCHEDULES = [
  {
    id: "demo-sch-1",
    teacherId: "demo-t-1",
    sessionType: "quran_hifz",
    levelId: 2,
    sessionMode: "individual",
    maxStudents: 1,
    availableDays: ["sunday", "tuesday", "thursday"],
    availableTimes: ["16:00", "17:00"],
    durationMinutes: 30,
    location: null,
    isActive: true,
    createdBy: "demo-admin-1",
    createdAt: iso(14 * 24 * HOUR),
    updatedAt: iso(14 * 24 * HOUR),
    teacherName: "أحمد بن صالح الهاشمي",
    levelName: "السنبلة",
    typeLabel: "حفظ قرآن",
  },
  {
    id: "demo-sch-2",
    teacherId: "demo-t-2",
    sessionType: "quran_review",
    levelId: 3,
    sessionMode: "group",
    maxStudents: 8,
    availableDays: ["monday", "wednesday"],
    availableTimes: ["18:00", "19:00"],
    durationMinutes: 45,
    location: null,
    isActive: true,
    createdBy: "demo-admin-1",
    createdAt: iso(10 * 24 * HOUR),
    updatedAt: iso(10 * 24 * HOUR),
    teacherName: "عبدالله محمد المطيري",
    levelName: "النماء",
    typeLabel: "مراجعة قرآن",
  },
  {
    id: "demo-sch-3",
    teacherId: "demo-t-4",
    sessionType: "tajweed_level",
    levelId: 8,
    sessionMode: "group",
    maxStudents: 10,
    availableDays: ["friday"],
    availableTimes: ["10:00"],
    durationMinutes: 60,
    location: null,
    isActive: true,
    createdBy: "demo-admin-1",
    createdAt: iso(8 * 24 * HOUR),
    updatedAt: iso(8 * 24 * HOUR),
    teacherName: "فاطمة الزهراني",
    levelName: "أحكام التجويد",
    typeLabel: "تجويد",
  },
  {
    id: "demo-sch-4",
    teacherId: "demo-t-3",
    sessionType: "qiraat",
    levelId: 7,
    sessionMode: "individual",
    maxStudents: 1,
    availableDays: ["saturday", "tuesday"],
    availableTimes: ["17:00", "20:00"],
    durationMinutes: 45,
    location: null,
    isActive: true,
    createdBy: "demo-admin-1",
    createdAt: iso(6 * 24 * HOUR),
    updatedAt: iso(6 * 24 * HOUR),
    teacherName: "محمد القحطاني",
    levelName: "إجازة حفص",
    typeLabel: "قراءات",
  },
];

// ---------- admin.bookingsList ----------
export const DEMO_BOOKINGS = [
  {
    id: "demo-book-1",
    typeLabel: "حفظ قرآن",
    studentName: "عبدالرحمن السبيعي",
    teacherName: "أحمد بن صالح الهاشمي",
    scheduledAt: iso(-2 * HOUR),
    status: "confirmed",
  },
  {
    id: "demo-book-2",
    typeLabel: "مراجعة قرآن",
    studentName: "عمر البدر",
    teacherName: "عبدالله محمد المطيري",
    scheduledAt: iso(-4 * HOUR),
    status: "scheduled",
  },
  {
    id: "demo-book-3",
    typeLabel: "تصحيح تلاوة",
    studentName: "مريم الشهري",
    teacherName: "فاطمة الزهراني",
    scheduledAt: iso(-26 * HOUR),
    status: "confirmed",
  },
  {
    id: "demo-book-4",
    typeLabel: "تجويد",
    studentName: "سارة الحربي",
    teacherName: "فاطمة الزهراني",
    scheduledAt: iso(20 * HOUR),
    status: "completed",
  },
  {
    id: "demo-book-5",
    typeLabel: "فقه",
    studentName: "خالد النصار",
    teacherName: "محمد القحطاني",
    scheduledAt: iso(28 * HOUR),
    status: "cancelled",
  },
  {
    id: "demo-book-6",
    typeLabel: "قراءات",
    studentName: "حسن العلي",
    teacherName: "محمد القحطاني",
    scheduledAt: iso(50 * HOUR),
    status: "no_show",
  },
];
