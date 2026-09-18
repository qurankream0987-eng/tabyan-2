/**
 * بيانات وضع العرض التجريبي — نطاق صفحات الطالب الثانوية
 * (Booking / StudentProgress / StudentRecordings / Library / Mushaf /
 *  StudentNotifications / StudentAccount / StudentIjazat / FatwaAsk / FatwaPublic)
 * تُستخدم فقط عند الدخول التجريبي (authStore.isDemo === true) ولا يُرسل أي طلب للخادم
 */

const NOW = Date.now();
const H = 3600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const later = (ms: number) => new Date(NOW + ms).toISOString();

/* ── حجز الحلقات (student.mySessions / student.teachers) ── */

export type DemoSchedule = {
  id: string; sessionType: string; typeLabel: string; sessionMode: string;
  maxStudents: number; availableDays: string[]; availableTimes: string[];
  durationMinutes: number; levelId: number | null;
  /** عدد المسجلين — للعرض التجريبي فقط (إظهار اكتمال العدد) */
  enrolledCount?: number;
};

export type DemoTeacher = {
  teacherId: string; name: string; avgRating: string; experienceYears: number;
  specialization: string | null; schedules: DemoSchedule[];
};

export type DemoSession = {
  id: string; scheduledAt: string; durationMinutes: number; status: string;
  topic: string | null; sessionType: string; meetingUrl: string | null;
  teacherName: string; typeLabel: string;
};

export const DEMO_MY_SESSIONS: DemoSession[] = [
  {
    id: "demo-ses-1", scheduledAt: later(26 * H), durationMinutes: 30, status: "confirmed",
    topic: "تسميع سورة الملك", sessionType: "quran_hifz", meetingUrl: "/session/demo-ses-1",
    teacherName: "الشيخ أبو عبدالله", typeLabel: "حفظ قرآن",
  },
  {
    id: "demo-ses-2", scheduledAt: later(3 * D), durationMinutes: 45, status: "scheduled",
    topic: null, sessionType: "quran_review", meetingUrl: "/session/demo-ses-2",
    teacherName: "الشيخ محمد الحسني", typeLabel: "مراجعة قرآن",
  },
  {
    id: "demo-ses-3", scheduledAt: ago(2 * D), durationMinutes: 30, status: "completed",
    topic: "تصحيح مخارج الحروف", sessionType: "tajweed_level", meetingUrl: "/session/demo-ses-3",
    teacherName: "الشيخة مريم القحطاني", typeLabel: "تجويد",
  },
];

export const DEMO_TEACHERS: DemoTeacher[] = [
  {
    teacherId: "demo-t-1", name: "الشيخ أبو عبدالله", avgRating: "4.9", experienceYears: 15,
    specialization: "حفظ ومراجعة القرآن الكريم",
    schedules: [
      {
        id: "demo-sc-1", sessionType: "quran_hifz", typeLabel: "حفظ قرآن", sessionMode: "individual",
        maxStudents: 1, availableDays: ["sunday", "tuesday", "thursday"], availableTimes: ["17:00", "18:00", "19:30"],
        durationMinutes: 30, levelId: 2,
      },
      {
        id: "demo-sc-2", sessionType: "quran_review", typeLabel: "مراجعة قرآن", sessionMode: "group",
        maxStudents: 20, enrolledCount: 20, availableDays: ["saturday", "monday"], availableTimes: ["16:00"],
        durationMinutes: 45, levelId: null,
      },
    ],
  },
  {
    teacherId: "demo-t-2", name: "الشيخ محمد الحسني", avgRating: "4.7", experienceYears: 11,
    specialization: "التجويد والقراءات",
    schedules: [
      {
        id: "demo-sc-3", sessionType: "tajweed_level", typeLabel: "تجويد", sessionMode: "group",
        maxStudents: 12, enrolledCount: 7, availableDays: ["wednesday", "friday"], availableTimes: ["18:30", "20:00"],
        durationMinutes: 40, levelId: null,
      },
      {
        id: "demo-sc-6", sessionType: "tajweed_correction", typeLabel: "تصحيح تلاوة", sessionMode: "group",
        maxStudents: 10, enrolledCount: 3, availableDays: ["sunday", "wednesday"], availableTimes: ["19:00"],
        durationMinutes: 30, levelId: null,
      },
    ],
  },
  {
    teacherId: "demo-t-3", name: "الشيخة مريم القحطاني", avgRating: "5.0", experienceYears: 9,
    specialization: "تحفيظ الناشئة والدروس الشرعية",
    schedules: [
      {
        id: "demo-sc-4", sessionType: "sharia_fiqh", typeLabel: "فقه", sessionMode: "group",
        maxStudents: 15, enrolledCount: 4, availableDays: ["sunday"], availableTimes: ["17:30"],
        durationMinutes: 35, levelId: null,
      },
      {
        id: "demo-sc-5", sessionType: "quran_hifz", typeLabel: "حفظ قرآن", sessionMode: "individual",
        maxStudents: 1, availableDays: ["monday", "thursday"], availableTimes: ["16:30", "17:30"],
        durationMinutes: 25, levelId: 1,
      },
    ],
  },
];

/* ── تقدم الحفظ والمستويات (student.progress) ── */

export type DemoProgress = {
  levelId: number; status: string; completedJuz: number; completedSessions: number;
  averageScore: string; name: string; path: string; orderIndex: number;
};

export const DEMO_PROGRESS: DemoProgress[] = [
  { levelId: 1, status: "completed", completedJuz: 6, completedSessions: 24, averageScore: "92.00", name: "مستوى الغرس", path: "quran", orderIndex: 1 },
  { levelId: 2, status: "in_progress", completedJuz: 3, completedSessions: 14, averageScore: "85.50", name: "مستوى البراعم", path: "quran", orderIndex: 2 },
  { levelId: 6, status: "in_progress", completedJuz: 0, completedSessions: 5, averageScore: "78.00", name: "أحكام التلاوة", path: "tajweed", orderIndex: 3 },
  { levelId: 3, status: "locked", completedJuz: 0, completedSessions: 0, averageScore: "0.00", name: "مستوى الفراعل", path: "quran", orderIndex: 4 },
];

/* ── تسجيلات الحلقات (student.myRecordings) ── */

export type DemoRecording = {
  id: string; sessionId: string; videoUrl: string; durationSeconds: number; quality: string;
  createdAt: string; teacherName: string; topic: string | null; sessionType: string; typeLabel: string;
  evaluation: {
    totalScore: number; hifzScore: number; revisionScore: number;
    tajweedScore: number; commitmentScore: number; notes: string | null;
  } | null;
};

export const DEMO_RECORDINGS: DemoRecording[] = [
  {
    id: "demo-rec-1", sessionId: "demo-ses-r1", videoUrl: "/demo/recording-1.mp4",
    durationSeconds: 1740, quality: "720p", createdAt: ago(2 * D),
    teacherName: "الشيخ أبو عبدالله", topic: "تسميع سورة الملك كاملة", sessionType: "quran_hifz", typeLabel: "حفظ قرآن",
    evaluation: {
      totalScore: 94, hifzScore: 29, revisionScore: 19, tajweedScore: 37, commitmentScore: 9,
      notes: "أداء ممتاز — انتبه لإخفاء النون الساكنة في «من شر»، وواصل على هذا المستوى",
    },
  },
  {
    id: "demo-rec-2", sessionId: "demo-ses-r2", videoUrl: "/demo/recording-2.mp4",
    durationSeconds: 2280, quality: "1080p", createdAt: ago(6 * D),
    teacherName: "الشيخة مريم القحطاني", topic: "مراجعة جزء تبارك", sessionType: "quran_review", typeLabel: "مراجعة قرآن",
    evaluation: {
      totalScore: 86, hifzScore: 26, revisionScore: 17, tajweedScore: 34, commitmentScore: 9,
      notes: "المراجعة جيدة جداً — راجع سورة القلم قبل الحلقة القادمة",
    },
  },
  {
    id: "demo-rec-3", sessionId: "demo-ses-r3", videoUrl: "/demo/recording-3.mp4",
    durationSeconds: 1500, quality: "720p", createdAt: ago(11 * D),
    teacherName: "الشيخ محمد الحسني", topic: "أحكام النون الساكنة والتنوين", sessionType: "tajweed_level", typeLabel: "تجويد",
    evaluation: null,
  },
];

/* ── المكتبة (library.browse / library.myLibrary) ── */

export type DemoBook = {
  id: string; title: string; author: string | null; category: string; categoryLabel: string;
  section: string; contentType: string; fileUrl: string | null; externalUrl: string | null;
  textContent: string | null; isBookmarked: boolean; isDownloaded: boolean;
};

export const DEMO_BOOKS: DemoBook[] = [
  { id: "demo-b-1", title: "متن تحفة الأطفال", author: "الشيخ سليمان الجمزوري", category: "tajweed", categoryLabel: "تجويد", section: "curriculum", contentType: "pdf", fileUrl: "/objects/demo/tuhfat-al-atfal.pdf", externalUrl: null, textContent: null, isBookmarked: true, isDownloaded: true },
  { id: "demo-b-2", title: "تيسير أحكام التجويد — المستوى الأول", author: "إدارة تبيان العلمية", category: "tajweed", categoryLabel: "تجويد", section: "curriculum", contentType: "pdf", fileUrl: "/objects/demo/tajweed-1.pdf", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-3", title: "خطة حفظ جزء عم في ٣٠ يوماً", author: "إدارة تبيان العلمية", category: "tajweed", categoryLabel: "تجويد", section: "curriculum", contentType: "text", fileUrl: null, externalUrl: null, textContent: "خطة يومية مبسطة لحفظ جزء عم مع المراجعة التراكمية…", isBookmarked: true, isDownloaded: false },
  { id: "demo-b-4", title: "الأربعون النووية", author: "الإمام يحيى بن شرف النووي", category: "hadith", categoryLabel: "حديث", section: "hadith", contentType: "pdf", fileUrl: "/objects/demo/arbaeen.pdf", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: true },
  { id: "demo-b-5", title: "رياض الصالحين — كتاب الإخلاص", author: "الإمام النووي", category: "hadith", categoryLabel: "حديث", section: "hadith", contentType: "audio", fileUrl: "/objects/demo/riyadh-ikhlas.mp3", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-6", title: "بلوغ المرام — أحاديث الصلاة", author: "ابن حجر العسقلاني", category: "hadith", categoryLabel: "حديث", section: "hadith", contentType: "video", fileUrl: "/objects/demo/bulugh-salah.mp4", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-7", title: "مجموع فتاوى التجويد الميسرة", author: "لجنة الإفتاء — تبيان", category: "fatwa", categoryLabel: "فتوى", section: "fatwa", contentType: "pdf", fileUrl: "/objects/demo/fatawa-tajweed.pdf", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-8", title: "فتاوى أركان الإسلام", author: "الشيخ محمد بن صالح العثيمين", category: "fatwa", categoryLabel: "فتوى", section: "fatwa", contentType: "link", fileUrl: null, externalUrl: "https://example.com/fatawa-arkan", textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-9", title: "العقيدة الطحاوية — شرح مبسط", author: "الإمام أبو جعفر الطحاوي", category: "aqeedah", categoryLabel: "عقيدة", section: "general", contentType: "pdf", fileUrl: "/objects/demo/tahawiyyah.pdf", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
  { id: "demo-b-10", title: "الوجيز في الفقه", author: "الشيخ عبد الرحمن بن ناصر السعدي", category: "fiqh", categoryLabel: "فقه", section: "curriculum", contentType: "pdf", fileUrl: "/objects/demo/al-qawaid-al-fiqhiyyah.pdf", externalUrl: null, textContent: null, isBookmarked: false, isDownloaded: false },
];

export const DEMO_MY_LIBRARY = {
  bookmarks: DEMO_BOOKS.filter((b) => b.isBookmarked),
  downloads: DEMO_BOOKS.filter((b) => b.isDownloaded),
};

/* ── الإشعارات (student.myNotifications) ── */

export type DemoNotification = {
  id: string; userId: string; title: string; body: string | null; type: string;
  isRead: boolean; readAt: string | null; createdAt: string;
};

const DEMO_NOTIF_ITEMS: DemoNotification[] = [
  {
    id: "demo-n-1", userId: "demo-student", title: "تمت الموافقة على طلبك",
    body: "وافقت الإدارة على انضمامك لحلقة حفظ القرآن مع الشيخ أبو عبدالله — راجع مواعيدك في صفحة الحجز",
    type: "result", isRead: false, readAt: null, createdAt: ago(2 * H),
  },
  {
    id: "demo-n-2", userId: "demo-student", title: "تذكير: حلقتك غداً",
    body: "تبقى ٢٤ ساعة على حلقة «تسميع سورة الملك» مع الشيخ أبو عبدالله — حضّر محفوظك جيداً",
    type: "reminder", isRead: false, readAt: null, createdAt: ago(3 * H),
  },
  {
    id: "demo-n-3", userId: "demo-student", title: "تذكير: حلقتك بعد قليل",
    body: "تبقى 15 دقيقة على بدء الحلقة.",
    type: "reminder", isRead: false, readAt: null, createdAt: ago(5 * H),
  },
  {
    id: "demo-n-4", userId: "demo-student", title: "تقييم جديد من معلمك",
    body: "قيّمك الشيخ أبو عبدالله بـ ٩٤/١٠٠ في حلقة تسميع سورة الملك — اطلع على التفاصيل في تسجيلاتك",
    type: "result", isRead: true, readAt: ago(1 * D), createdAt: ago(2 * D),
  },
  {
    id: "demo-n-5", userId: "demo-student", title: "مبارك الترقية",
    body: "تمت ترقيتك إلى «مستوى البراعم» في مسار القرآن الكريم — نسأل الله لك التوفيق والثبات",
    type: "activity", isRead: true, readAt: ago(3 * D), createdAt: ago(4 * D),
  },
];

export const DEMO_NOTIFICATIONS = {
  items: DEMO_NOTIF_ITEMS,
  unread: DEMO_NOTIF_ITEMS.filter((n) => !n.isRead).length,
};

/* ── شاشة الإشعارات الموحّدة (notifications.list / byId / getSettings) ── */

export type DemoFeedNotification = {
  id: string; title: string; body: string | null; type: string; priority: string;
  isRead: boolean; isPinned: boolean; createdAt: string;
  primaryActionUrl: string | null; primaryActionLabel: string | null;
  secondaryActionUrl: string | null; secondaryActionLabel: string | null;
  /** بيانات موعد اختيارية (شاشة التفاصيل) */
  payload?: {
    date?: string; time?: string; durationMinutes?: number; sessionKind?: string;
    teacherName?: string; subject?: string;
  } | null;
  /** مرفقات اختيارية (شاشة التفاصيل) */
  attachments?: Array<{ name: string; kind: "pdf" | "audio" | "file"; url?: string }> | null;
};

export const DEMO_NOTIF_FEED: DemoFeedNotification[] = [
  {
    id: "demo-nf-pin-1", title: "تعميم: إجازة عيد الأضحى",
    body: "تتوقف الحلقات من يوم الأربعاء حتى السبت بمناسبة عيد الأضحى المبارك — تستأنف الجداول تلقائياً بعد الإجازة. تقبّل الله طاعتكم.",
    type: "announcement", priority: "high", isRead: true, isPinned: true, createdAt: ago(2 * D),
    primaryActionUrl: null, primaryActionLabel: null, secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-1", title: "تذكير: حلقتك بعد قليل",
    body: "تبقى 15 دقيقة على بدء الحلقة.",
    type: "session_reminder", priority: "high", isRead: false, isPinned: false, createdAt: ago(1 * H),
    primaryActionUrl: "/student/schedule", primaryActionLabel: "تأكيد الحضور",
    secondaryActionUrl: "/student/booking", secondaryActionLabel: "إلغاء / إعادة جدولة",
    payload: {
      date: "الخميس ٢٤ يوليو", time: "٨:٠٠ مساءً", durationMinutes: 45,
      sessionKind: "فردية متتالية", teacherName: "الشيخ أبو عبدالله", subject: "تسميع سورة الملك",
    },
    attachments: [
      { name: "ملف التحضير.pdf", kind: "pdf" },
      { name: "تسجيل مراجعة سابقة.mp3", kind: "audio" },
    ],
  },
  {
    id: "demo-nf-2", title: "آية اليوم",
    body: "﴿إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ﴾ — الإسراء ٩",
    type: "ayah", priority: "normal", isRead: false, isPinned: false, createdAt: ago(4 * H),
    primaryActionUrl: null, primaryActionLabel: null, secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-3", title: "تقييم جديد من معلمك",
    body: "قيّمك الشيخ أبو عبدالله بـ ٩٤/١٠٠ في حلقة تسميع سورة الملك — أحسنت، واصل التقدم",
    type: "evaluation", priority: "normal", isRead: false, isPinned: false, createdAt: ago(7 * H),
    primaryActionUrl: null, primaryActionLabel: null,
    secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-4", title: "تغيير موعد حلقة المراجعة",
    body: "نُقلت حلقة «مراجعة القرآن» من الخميس ٤:٠٠ عصراً إلى الجمعة ٥:٣٠ عصراً بطلب من المعلم",
    type: "session_change", priority: "normal", isRead: true, isPinned: false, createdAt: ago(1 * D + 3 * H),
    primaryActionUrl: null, primaryActionLabel: null,
    secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-5", title: "مبارك! أتممت جزء تبارك",
    body: "أكملت حفظ جزء تبارك كاملاً — حصلت على وسام «حافظ مثابر» وتمت إضافته لسجل إنجازاتك",
    type: "achievement", priority: "normal", isRead: true, isPinned: false, createdAt: ago(3 * D),
    primaryActionUrl: null, primaryActionLabel: null,
    secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-6", title: "تمت ترقيتك إلى مستوى البراعم",
    body: "بعد اجتياز التقييم الشهري تمت ترقيتك إلى «مستوى البراعم» في مسار القرآن الكريم — نسأل الله لك الثبات",
    type: "promotion", priority: "normal", isRead: true, isPinned: false, createdAt: ago(5 * D),
    primaryActionUrl: null, primaryActionLabel: null, secondaryActionUrl: null, secondaryActionLabel: null,
  },
  {
    id: "demo-nf-7", title: "تم استلام رسوم الاشتراك",
    body: "سُدّدت رسوم اشتراك شهر ذي الحجة (١٥٠ ر.س) بنجاح — الفاتورة متاحة في حسابك",
    type: "payment", priority: "normal", isRead: true, isPinned: false, createdAt: ago(9 * D),
    primaryActionUrl: null, primaryActionLabel: null, secondaryActionUrl: null, secondaryActionLabel: null,
  },
];

export const DEMO_NOTIF_SETTINGS = {
  sessionReminders: true, sessionChanges: true, evaluations: true, achievements: true,
  announcements: true, ayahOfDay: true, payments: false,
  dndDuringPrayer: true, dndDuringSession: true,
  pushEnabled: true, soundEnabled: true, vibrationEnabled: false,
  reminderBeforeMinutes: 15, ayahDeliveryTime: "05:30",
};

/* ── الحساب (auth.me / student.settings) ── */

export const DEMO_ME = {
  id: "demo-student",
  fullName: "أحمد الطالب",
  phone: "0512345678",
  role: "student",
  isActive: true,
  createdAt: ago(90 * D),
  student: { currentLevelId: 2, totalJuz: 9 },
  age: 14,
};

export type DemoSettings = {
  darkMode: boolean; sessionReminderMinutes: number;
  ayahNotification: boolean; hadithNotification: boolean; ibnQayyimNotification: boolean;
  activityNotification: boolean; videoQuality: string; audioQuality: string;
};

export const DEMO_SETTINGS: DemoSettings = {
  darkMode: false, sessionReminderMinutes: 15,
  ayahNotification: true, hadithNotification: true, ibnQayyimNotification: false,
  activityNotification: true, videoQuality: "720p", audioQuality: "high",
};

/* ── الإجازات (student.myIjazat) — قائمة فارغة ليظهر سؤال الإجازة ── */

export type DemoIjazah = {
  id: string; certificateUrl: string; status: string;
  reviewNotes: string | null; createdAt: string;
};

export const DEMO_IJAZAT: DemoIjazah[] = [];

/* ── الفتاوى (fatwa.myFatwas / fatwa.detail / fatwa.publicList / fatwa.publicDetail) ── */

export type DemoMyFatwa = {
  id: string; questionText: string; category: string; categoryLabel: string;
  status: string; createdAt: string; followupOfId: string | null;
};

export const DEMO_MY_FATWAS: DemoMyFatwa[] = [
  {
    id: "demo-fq-1", questionText: "ما حكم الإدغام مع الغنة في النون الساكنة، وهل يجوز ترك الغنة خفية؟",
    category: "tajweed", categoryLabel: "تجويد", status: "answered", createdAt: ago(3 * D), followupOfId: null,
  },
  {
    id: "demo-fq-2", questionText: "هل يجوز للحافظ أن يقرأ في صلاة التراويح من المصحف إذا لم يتقن الحفظ بعد؟",
    category: "salah", categoryLabel: "صلاة", status: "answered", createdAt: ago(8 * D), followupOfId: null,
  },
  {
    id: "demo-fq-3", questionText: "ما أفضل وقت لمراجعة المحفوظ يومياً، وهل تُحسب المراجعة من قيام الليل؟",
    category: "other", categoryLabel: "أخرى", status: "pending", createdAt: ago(6 * H), followupOfId: null,
  },
];

export type DemoFatwaDetail = {
  question: DemoMyFatwa & { imageUrl: string | null; audioUrl: string | null; studentId: string };
  answer: {
    id: string; answerText: string; referenceText: string | null; audioUrl: string | null;
    audioDurationSeconds: number | null; status: string; createdAt: string; muftiName: string | null;
  } | null;
  myRating: { starRating: number } | null;
};

export const DEMO_FATWA_DETAILS: Record<string, DemoFatwaDetail> = {
  "demo-fq-1": {
    question: { ...DEMO_MY_FATWAS[0], imageUrl: null, audioUrl: null, studentId: "demo-student" },
    answer: {
      id: "demo-fa-1",
      answerText: "الإدغام مع الغنة في النون الساكنة والتنوين واجب عند حروف يرملون إذا جاءت بعد النون في كلمتين، والغنة صفة لازمة للنون والميم لا تنفك عنهما، فمن تركها خفية أو أظهر النون من غير غنة فقد غيّر الخلقة ودخل في اللحن الجلي الذي يأثم به المتلقي إن تعمده.\n\nومقدار الغنة حركتان، يُعرف ذلك بالتدريب على مدها وقصرها مع شيخ متقن.",
      referenceText: "متن تحفة الأطفال للجمزوري — باب النون الساكنة والتنوين",
      audioUrl: null, audioDurationSeconds: null, status: "published_private",
      createdAt: ago(2 * D), muftiName: "الشيخ د. عبدالرحمن السالم",
    },
    myRating: { starRating: 5 },
  },
  "demo-fq-2": {
    question: { ...DEMO_MY_FATWAS[1], imageUrl: null, audioUrl: null, studentId: "demo-student" },
    answer: {
      id: "demo-fa-2",
      answerText: "يجوز للقارئ في صلاة التطوع كالتراويح وقيام الليل أن يقرأ من المصحف عند جمهور الفقهاء، لأن النظر في المصحف عمل مأمور به لا ينافي الصلاة، وقد فعلت ذلك عائشة رضي الله عنها في صلاتها خلف مولى لها يقودها من المصحف.\n\nوالأولى لمن يتقن الحفظ أن يقرأ من حفظه، فهو أجمع للقلب وأتم خشوعاً.",
      referenceText: "فتح الباري لابن حجر — كتاب صفة الصلاة",
      audioUrl: null, audioDurationSeconds: null, status: "published_private",
      createdAt: ago(7 * D), muftiName: "الشيخ د. عبدالرحمن السالم",
    },
    myRating: null,
  },
  "demo-fq-3": {
    question: { ...DEMO_MY_FATWAS[2], imageUrl: null, audioUrl: null, studentId: "demo-student" },
    answer: null,
    myRating: null,
  },
};

export type DemoPublicFatwa = {
  answerId: string; answerText: string; referenceText: string | null; audioUrl: string | null;
  audioDurationSeconds: number | null; createdAt: string; muftiName: string | null;
  questionText: string; category: string; categoryLabel: string; questionId: string;
  avgStars: string; avgRating: string; views: number;
};

export const DEMO_PUBLIC_FATWAS: DemoPublicFatwa[] = [
  {
    answerId: "demo-pf-1", questionId: "demo-pq-1",
    questionText: "ما حكم الغش في الامتحانات المدرسية، وهل يبطل أجر الطالب في دراسته؟",
    answerText: "الغش في الامتحانات حرام، لأنه خداع وكذب وأكل لحقوق الغير، وقد قال صلى الله عليه وسلم: «من غشنا فليس منا». ولا يبطل أجر الطالب في تعلمه النافع إن تاب، لكن عليه أن يتقي هذا الذنب وأن يستدرك ما فاته بالاجتهاد الصادق.",
    referenceText: "صحيح مسلم — كتاب الإيمان",
    audioUrl: null, audioDurationSeconds: null, createdAt: ago(1 * D),
    muftiName: "الشيخ د. عبدالرحمن السالم", category: "muamalat", categoryLabel: "معاملات",
    avgStars: "4.8", avgRating: "4.8", views: 312,
  },
  {
    answerId: "demo-pf-2", questionId: "demo-pq-2",
    questionText: "هل تجوز قراءة القرآن للحائض من غير مس المصحف كالهاتف أو عن ظهر قلب؟",
    answerText: "يجوز للحائض قراءة القرآن عن ظهر قلب، ومن الجهاز من غير مس مباشر للمصحف عند كثير من أهل العلم، لأن الحديث في منعها ضعيف عند محققي العلماء، ولأنها تحتاج القراءة لحفظها ومراجعتها وذكرها. والأولى إن احتاجت لمس المصحف أن تمسه بحائل كقفاز.",
    referenceText: "المغني لابن قدامة — كتاب الطهارة",
    audioUrl: null, audioDurationSeconds: null, createdAt: ago(4 * D),
    muftiName: "الشيخة د. نورة العتيبي", category: "taharah", categoryLabel: "طهارة",
    avgStars: "4.9", avgRating: "4.9", views: 528,
  },
  {
    answerId: "demo-pf-3", questionId: "demo-pq-3",
    questionText: "ما حكم صيام الست من شوال قبل قضاء ما فات من رمضان؟",
    answerText: "ذهب جمهور العلماء إلى جواز صيام الست من شوال قبل القضاء مع كون القضاء أولى وأفضل، لأن صيام الست نفل مطلق لا يشترط له إتمام رمضان قضاءً، وذهب آخرون إلى أن فضل «صيام الدهر» لا يحصل إلا بإتمام رمضان أولاً. فالأحوط تقديم القضاء ثم صيام الست.",
    referenceText: "مجموع فتاوى ابن باز",
    audioUrl: null, audioDurationSeconds: null, createdAt: ago(9 * D),
    muftiName: "الشيخ د. عبدالرحمن السالم", category: "siyam", categoryLabel: "صيام",
    avgStars: "4.6", avgRating: "4.6", views: 204,
  },
  {
    answerId: "demo-pf-4", questionId: "demo-pq-4",
    questionText: "هل يجوز الجمع بين الصلوات للمريض الذي يتعب من الوضوء المتكرر؟",
    answerText: "المرض الذي يشق معه أداء كل صلاة في وقتها عذر يبيح الجمع جمع تقديم أو تأخير عند جمهور الفقهاء، قياساً على جمع النبي صلى الله عليه وسلم لغير خوف ولا مطر لدفع الحرج عن أمته. وعلى المريض أن يجمع بقدر حاجته فقط، ويستشير طبيبه وعالم بلده في تفصيل حاله.",
    referenceText: "صحيح مسلم — حديث الجمع في المدينة",
    audioUrl: null, audioDurationSeconds: null, createdAt: ago(15 * D),
    muftiName: "الشيخ د. فهد المطيري", category: "salah", categoryLabel: "صلاة",
    avgStars: "4.7", avgRating: "4.7", views: 441,
  },
];

/* ── المصحف — بيانات محلية لوضع العرض (بدون اتصال) ── */

export type DemoSurah = { number: number; name: string; numberOfAyahs: number; revelationType: string };
export type DemoAyah = { numberInSurah: number; text: string };

export const DEMO_SURAHS: DemoSurah[] = [
  { number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 103, name: "سُورَةُ ٱلْعَصْرِ", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 108, name: "سُورَةُ ٱلْكَوْثَرِ", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 112, name: "سُورَةُ ٱلْإِخْلَاصِ", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 113, name: "سُورَةُ ٱلْفَلَقِ", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 114, name: "سُورَةُ ٱلنَّاسِ", numberOfAyahs: 6, revelationType: "Meccan" },
];

export const DEMO_AYAHS: Record<number, DemoAyah[]> = {
  1: [
    { numberInSurah: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
    { numberInSurah: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" },
    { numberInSurah: 3, text: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
    { numberInSurah: 4, text: "مَٰلِكِ يَوْمِ ٱلدِّينِ" },
    { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { numberInSurah: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ" },
    { numberInSurah: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ" },
  ],
  103: [
    { numberInSurah: 1, text: "وَٱلْعَصْرِ" },
    { numberInSurah: 2, text: "إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ" },
    { numberInSurah: 3, text: "إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ" },
  ],
  108: [
    { numberInSurah: 1, text: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ" },
    { numberInSurah: 2, text: "فَصَلِّ لِرَبِّكَ وَٱنْحَرْ" },
    { numberInSurah: 3, text: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ" },
  ],
  112: [
    { numberInSurah: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
    { numberInSurah: 2, text: "ٱللَّهُ ٱلصَّمَدُ" },
    { numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { numberInSurah: 4, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ" },
  ],
  113: [
    { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ" },
    { numberInSurah: 2, text: "مِن شَرِّ مَا خَلَقَ" },
    { numberInSurah: 3, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { numberInSurah: 4, text: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ" },
    { numberInSurah: 5, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
  ],
  114: [
    { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ" },
    { numberInSurah: 2, text: "مَلِكِ ٱلنَّاسِ" },
    { numberInSurah: 3, text: "إِلَٰهِ ٱلنَّاسِ" },
    { numberInSurah: 4, text: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ" },
    { numberInSurah: 5, text: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ" },
    { numberInSurah: 6, text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ" },
  ],
};
