// بيانات وضع العرض التجريبي — نطاق صفحات الطالب الأساسية
// تطابق أشكال مخرجات lib/tabyan-trpc/src/routers/student.ts حرفياً

export interface DemoLevelRow {
  id: number;
  name: string;
  nameEn: string | null;
  sessionsCount: number;
  requiredJuz: number;
  requiredSessions: number;
  minGrade: string | null;
  requiresIjazah: boolean;
  isCurrent: boolean;
  progressStatus: string;
}

export interface DemoSessionRow {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: string;
  topic: string | null;
  sessionType: string;
  levelId?: number | null;
  levelName?: string | null;
  teacherName: string;
  teacherRating: string | null;
  typeLabel: string;
}

export interface DemoDashboard {
  student: { placementTestStatus: string };
  age: number;
  levelName: string;
  enrolledPaths: string[];
  completionPercentage: number;
  stats: { totalJuz: number; sessionsCount: number; avgScore: number };
  upcoming: DemoSessionRow[];
  todayLessons: unknown[];
}

export interface DemoPaths {
  age: number;
  quran: { visible: boolean };
  tajweedCorrection: { visible: boolean };
  qiraat: { certified: boolean; certificateStatus: string | null };
}

export interface DemoPlacementStatus {
  status: string;
  hasVideo: boolean;
  resultLevelName: string | null;
  notes: string | null;
}

export interface DemoRecitationEligibility {
  age: number | null;
  birthDate: string | null;
  eligible: boolean;
}

// ── مستويات القرآن الخمسة (student.levels / path=quran) ─────────────────────
export const DEMO_QURAN_LEVELS: DemoLevelRow[] = [
  { id: 1, name: "الغرس", nameEn: "ghars", sessionsCount: 40, requiredJuz: 5, requiredSessions: 30, minGrade: "80", requiresIjazah: false, isCurrent: true, progressStatus: "in_progress" },
  { id: 2, name: "السنبلة", nameEn: "sunbulah", sessionsCount: 48, requiredJuz: 10, requiredSessions: 36, minGrade: "80", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 3, name: "النماء", nameEn: "namaa", sessionsCount: 56, requiredJuz: 15, requiredSessions: 42, minGrade: "85", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 4, name: "الثمرة", nameEn: "thamrah", sessionsCount: 64, requiredJuz: 20, requiredSessions: 48, minGrade: "85", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 5, name: "الوارثون", nameEn: "warithoon", sessionsCount: 80, requiredJuz: 25, requiredSessions: 60, minGrade: "90", requiresIjazah: true, isCurrent: false, progressStatus: "not_started" },
];

// ── دروس التجويد (path=tajweed) ──────────────────────────────────────────────
export const DEMO_TAJWEED_LEVELS: DemoLevelRow[] = [
  { id: 11, name: "التجويد الأساسي", nameEn: "basic", sessionsCount: 12, requiredJuz: 0, requiredSessions: 10, minGrade: "75", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 12, name: "التجويد المتوسط", nameEn: "intermediate", sessionsCount: 16, requiredJuz: 0, requiredSessions: 12, minGrade: "80", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 13, name: "التجويد المتقدم", nameEn: "advanced", sessionsCount: 20, requiredJuz: 0, requiredSessions: 16, minGrade: "85", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
  { id: 14, name: "إتقان التجويد", nameEn: "mastery", sessionsCount: 24, requiredJuz: 0, requiredSessions: 20, minGrade: "90", requiresIjazah: false, isCurrent: false, progressStatus: "not_started" },
];

// ── الدروس الشرعية (path=sharia): عقيدة إلزامية × ٥ (aqeedah_quran — مرتبطة بالقرآن) + مسار اختياري × ٥ (aqeedah) + فقه × ١ + سيرة × ١ ─────
const DEMO_SHARIA_DEF: Array<{ key: string; names: string[] }> = [
  { key: "aqeedah_quran", names: ["منظومة تلقين العقيدة", "منظومة البيضاء", "الأصول الثلاثة", "سلم الوصول إلى علم الأصول — الجزء الأول", "سلم الوصول إلى علم الأصول — الجزء الثاني"] },
  { key: "aqeedah", names: ["ثلاثة الأصول", "القواعد الأربع", "العقيدة الواسطية", "كتاب التوحيد", "كشف الشبهات"] },
  { key: "fiqh", names: ["الوجيز في الفقه"] },
  { key: "seerah", names: ["الرحيق المختوم"] },
];

export const DEMO_SHARIA_LEVELS: DemoLevelRow[] = DEMO_SHARIA_DEF.flatMap((s, sIdx) =>
  s.names.map((name, lIdx) => ({
    id: 21 + sIdx * 8 + lIdx,
    name,
    nameEn: s.key,
    sessionsCount: 16,
    requiredJuz: 0,
    requiredSessions: 12,
    minGrade: "75",
    requiresIjazah: false,
    isCurrent: s.key === "aqeedah" && lIdx === 0,
    progressStatus: "not_started",
  })),
);

// ── خريطة المستويات لكل مسار ────────────────────────────────────────────────
export const DEMO_LEVELS_BY_PATH: Record<string, DemoLevelRow[]> = {
  quran: DEMO_QURAN_LEVELS,
  tajweed: DEMO_TAJWEED_LEVELS,
  sharia: DEMO_SHARIA_LEVELS,
  tajweed_correction: [],
  qiraat: [],
};

// ── لوحة الطالب (student.dashboard) ──────────────────────────────────────────
function at(hours: number, minutes: number, addDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export const DEMO_DASHBOARD: DemoDashboard = {
  student: { placementTestStatus: "approved" },
  age: 45,
  levelName: "الغرس",
  enrolledPaths: ["quran"],
  completionPercentage: 35,
  stats: { totalJuz: 5, sessionsCount: 24, avgScore: 88 },
  upcoming: [
    {
      id: "demo-session-1",
      scheduledAt: at(18, 0),
      durationMinutes: 30,
      status: "confirmed",
      topic: "تسميع سورة الملك — الوجه الأول",
      sessionType: "quran_hifz",
      levelId: 1,
      levelName: "الغرس",
      teacherName: "الشيخ أحمد الحسني",
      teacherRating: "4.9",
      typeLabel: "حفظ قرآن",
    },
    {
      id: "demo-session-2",
      scheduledAt: at(17, 30, 2),
      durationMinutes: 30,
      status: "scheduled",
      topic: "مراجعة جزء عمّ",
      sessionType: "quran_review",
      levelId: 1,
      levelName: "الغرس",
      teacherName: "الشيخ محمد العتيبي",
      teacherRating: "4.8",
      typeLabel: "مراجعة قرآن",
    },
  ],
  todayLessons: [],
};

// ── المسارات (student.paths) ─────────────────────────────────────────────────
export const DEMO_PATHS: DemoPaths = {
  age: 45,
  quran: { visible: true },
  tajweedCorrection: { visible: true },
  qiraat: { certified: false, certificateStatus: null },
};

// ── حالة اختبار القبول (student.placementStatus) ────────────────────────────
export const DEMO_PLACEMENT_STATUS: DemoPlacementStatus = {
  /* يبدأ غير مُختبَر حتى يعيش المستخدم التجربة الكاملة:
     تسجيل → إرسال → قيد المراجعة → النتيجة بعد وقت تجريبي (في Placement.tsx) */
  status: "none",
  hasVideo: false,
  resultLevelName: "الغرس",
  notes: "تلاوة موفقة ومخارج سليمة — واصل الحفظ الجديد مع المراجعة اليومية",
};

// ── أهلية تصحيح التلاوة (student.recitationEligibility) ─────────────────────
export const DEMO_RECITATION_ELIGIBILITY: DemoRecitationEligibility = {
  age: 45,
  birthDate: "1980-03-15",
  eligible: true,
};
