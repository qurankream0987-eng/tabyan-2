// بيانات العرض التجريبي — نطاق المسؤول التشغيلي
// تُستخدم عندما يكون authStore.isDemo === true (دخول بدون خادم).
// الأشكال مطابقة حرفياً لمخرجات routers/admin.ts في lib/tabyan-trpc.

// ---------- المستويات (levelThresholds) ----------
export type DemoLevel = { id: number; name: string; path: string };
export const DEMO_LEVELS: DemoLevel[] = [
  { id: 1, name: "الغرس", path: "quran" },
  { id: 2, name: "البراعم", path: "quran" },
  { id: 3, name: "الأشجار", path: "quran" },
  { id: 4, name: "الثمار", path: "quran" },
  { id: 5, name: "الوارثون", path: "quran" },
  { id: 6, name: "التجويد الأساسي", path: "tajweed" },
  { id: 7, name: "التجويد المتوسط", path: "tajweed" },
  { id: 8, name: "التجويد المتقدم", path: "tajweed" },
  { id: 9, name: "إتقان التجويد", path: "tajweed" },
];

// ---------- المكتبة (libraryList) ----------
export type DemoBook = {
  id: string; title: string; author: string | null;
  category: "aqeedah" | "fiqh" | "tajweed" | "fatwa" | "hadith";
  section: "curriculum" | "hadith" | "fatwa" | "general";
  contentType: "pdf" | "text" | "audio" | "video" | "link";
  fileUrl: string | null; externalUrl: string | null; textContent: string | null;
  levelIds: number[] | null; status: "published" | "hidden";
  createdBy: string | null; createdAt: string; updatedAt: string;
};

export const DEMO_BOOKS: DemoBook[] = [
  {
    id: "demo-book-1", title: "متن تحفة الأطفال في تجويد القرآن", author: "سليمان بن حسين الجمزوري",
    category: "tajweed", section: "curriculum", contentType: "text",
    fileUrl: null, externalUrl: null,
    textContent: "أَدَباً لِمَنْ بِهِ اهْتَدَى * شُكْراً لِرَبِّيْ وَمَوْلَايَا * صَلَّى وَسَلَّمَ دَائِمَاً عَلَى * مُحَمَّدٍ خَيْرِ مَنْ تَلَا",
    levelIds: [1, 2], status: "published",
    createdBy: "demo-admin", createdAt: "2026-01-12T09:00:00Z", updatedAt: "2026-03-02T11:30:00Z",
  },
  {
    id: "demo-book-2", title: "المقدمة الجزرية في التجويد", author: "محمد بن الجزري الشافعي",
    category: "tajweed", section: "curriculum", contentType: "pdf",
    fileUrl: "https://cdn.tabyan.example/books/jazariyyah.pdf", externalUrl: null, textContent: null,
    levelIds: [2, 3, 4], status: "published",
    createdBy: "demo-admin", createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-02-20T14:00:00Z",
  },
  {
    id: "demo-book-3", title: "العقيدة الطحاوية وشرحها الميسّر", author: "أبو جعفر أحمد بن سلامة الطحاوي",
    category: "aqeedah", section: "curriculum", contentType: "pdf",
    fileUrl: "https://cdn.tabyan.example/books/tahawiyyah.pdf", externalUrl: null, textContent: null,
    levelIds: [3], status: "published",
    createdBy: "demo-admin", createdAt: "2026-01-20T10:15:00Z", updatedAt: "2026-01-20T10:15:00Z",
  },
  {
    id: "demo-book-4", title: "الوجيز في الفقه", author: "الشيخ عبد الرحمن بن ناصر السعدي",
    category: "fiqh", section: "curriculum", contentType: "pdf",
    fileUrl: "https://cdn.tabyan.example/books/al-qawaid-al-fiqhiyyah.pdf", externalUrl: null, textContent: null,
    levelIds: null, status: "published",
    createdBy: "demo-admin", createdAt: "2026-02-01T12:00:00Z", updatedAt: "2026-04-10T09:45:00Z",
  },
  {
    id: "demo-book-5", title: "الأربعون النووية", author: "يحيى بن شرف النووي",
    category: "hadith", section: "hadith", contentType: "text",
    fileUrl: null, externalUrl: null,
    textContent: "الحديث الأول: إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى…",
    levelIds: null, status: "published",
    createdBy: "demo-admin", createdAt: "2026-02-05T07:30:00Z", updatedAt: "2026-02-05T07:30:00Z",
  },
  {
    id: "demo-book-6", title: "رياض الصالحين من كلام سيد المرسلين", author: "يحيى بن شرف النووي",
    category: "hadith", section: "hadith", contentType: "pdf",
    fileUrl: "https://cdn.tabyan.example/books/riyad-al-salihin.pdf", externalUrl: null, textContent: null,
    levelIds: null, status: "published",
    createdBy: "demo-admin", createdAt: "2026-02-11T13:20:00Z", updatedAt: "2026-05-01T16:00:00Z",
  },
  {
    id: "demo-book-7", title: "سلسلة الدروس المرئية في أحكام التلاوة", author: "إدارة تبيان التعليمية",
    category: "tajweed", section: "general", contentType: "video",
    fileUrl: "https://cdn.tabyan.example/videos/tajweed-series-01.mp4", externalUrl: null, textContent: null,
    levelIds: null, status: "published",
    createdBy: "demo-admin", createdAt: "2026-03-08T18:00:00Z", updatedAt: "2026-03-08T18:00:00Z",
  },
  {
    id: "demo-book-8", title: "مختارات من فتاوى أركان الإسلام", author: "اللجنة الدائمة للبحوث العلمية والإفتاء",
    category: "fatwa", section: "fatwa", contentType: "link",
    fileUrl: null, externalUrl: "https://alifta.example/fatawa-arkan", textContent: null,
    levelIds: null, status: "hidden",
    createdBy: "demo-admin", createdAt: "2026-03-18T09:10:00Z", updatedAt: "2026-05-22T10:00:00Z",
  },
];

// ---------- الفتاوى (fatwaInbox) ----------
export type DemoFatwaAnswer = {
  id: string; answerText: string; audioUrl: string | null; status: string; audioDurationSeconds: number | null;
};
export type DemoFatwaQuestion = {
  id: string; questionText: string; category: string; categoryLabel: string; status: string; priority: string;
  studentName: string; muftiName: string | null; hoursAgo: number; muftiId: string | null;
  answer: DemoFatwaAnswer | null;
};

export const DEMO_FATWA_INBOX: Record<"pending" | "assigned" | "answered" | "published" | "rejected", DemoFatwaQuestion[]> = {
  pending: [
    {
      id: "demo-fq-1",
      questionText: "ما حكم الصلاة بالحذاء في المسجد إذا كانت الأرضية نظيفة؟ وهل يختلف الحكم بين صلاة الفريضة والنافلة؟",
      category: "salah", categoryLabel: "صلاة", status: "pending", priority: "urgent",
      studentName: "عبد العزيز بن سعد الحربي", muftiName: null, hoursAgo: 3, muftiId: null, answer: null,
    },
    {
      id: "demo-fq-2",
      questionText: "ورثتُ مبلغاً من المال وقد حال عليه الحول عندي، فهل تجب فيه الزكاة من يوم ورثته أم من تمام الحول؟ وما مقدار النصاب بالعملة الحالية؟",
      category: "zakah", categoryLabel: "زكاة", status: "pending", priority: "normal",
      studentName: "نورة بنت فهد القحطاني", muftiName: null, hoursAgo: 27, muftiId: null, answer: null,
    },
    {
      id: "demo-fq-3",
      questionText: "أعمل مندوب مبيعات وشركتي تطلب مني إخفاء بعض عيوب المنتج عن العملاء، فما حكم ذلك؟ وهل عليّ إثم إن فعلت امتثالاً لأوامر الإدارة؟",
      category: "muamalat", categoryLabel: "معاملات", status: "pending", priority: "normal",
      studentName: "سالم بن راشد الدوسري", muftiName: null, hoursAgo: 71, muftiId: null, answer: null,
    },
  ],
  assigned: [
    {
      id: "demo-fq-4",
      questionText: "ما حكم إظلال الأصابع في التشهد، وهل الإشارة بالسبابة واجبة أم مستحبة؟ أرجو التفصيل بأدلة المذاهب.",
      category: "salah", categoryLabel: "صلاة", status: "assigned", priority: "normal",
      studentName: "محمد بن علي الشمري", muftiName: "د. عبد الله بن سالم العتيبي", hoursAgo: 9, muftiId: "demo-mufti-1", answer: null,
    },
    {
      id: "demo-fq-5",
      questionText: "سافرتُ إلى بلد يختلف توقيته عن بلدي، فكيف أضبط أوقات الصيام في رمضان؟ وهل أتبع بلدي أم البلد الذي أنا فيه؟",
      category: "siyam", categoryLabel: "صيام", status: "assigned", priority: "urgent",
      studentName: "ريم بنت خالد العنزي", muftiName: "الشيخ خالد بن ناصر الدوسري", hoursAgo: 56, muftiId: "demo-mufti-2", answer: null,
    },
  ],
  answered: [
    {
      id: "demo-fq-6",
      questionText: "ما حكم قراءة القرآن من المصحف الإلكتروني (الجوال) للمرأة الحائض دون مسّ المصحف المطبوع؟",
      category: "taharah", categoryLabel: "طهارة", status: "answered", priority: "normal",
      studentName: "أمل بنت ناصر المطيري", muftiName: "د. محمد بن عبد الرحمن السقاف", hoursAgo: 14, muftiId: "demo-mufti-3",
      answer: {
        id: "demo-fa-1",
        answerText: "الحمد لله والصلاة والسلام على رسول الله، أما بعد: فالأجهزة الإلكترونية لا تأخذ حكم المصحف المطبوع عند جمهور أهل العلم المعاصرين، لأن ما فيها ليس قرآناً مكتوباً بالحبر، وإنما هي ذبذبات كهربائية تظهر على الشاشة وتزول بإغلاقها. وعليه يجوز للحائض قراءة القرآن من الجوال دون حرج بإذن الله، وهو مذهب اللجنة الدائمة وغيرهم. والأولى مع ذلك الاقتصار على ما تدعو الحاجة إليه من قراءة، وعدم التوسع فيما يُشبه المصحف في الحكم. والله أعلم.",
        audioUrl: null, status: "pending_review", audioDurationSeconds: null,
      },
    },
    {
      id: "demo-fq-7",
      questionText: "هل يجوز الجمع بين الصلوات بسبب المطر الشديد في فصل الشتاء؟ وما شروط ذلك عند الفقهاء؟",
      category: "salah", categoryLabel: "صلاة", status: "answered", priority: "normal",
      studentName: "فهد بن عبد الرحمن الغامدي", muftiName: "د. عبد الله بن سالم العتيبي", hoursAgo: 22, muftiId: "demo-mufti-1",
      answer: {
        id: "demo-fa-2",
        answerText: "الحمد لله، أما بعد: فقد أجاز جمهور الفقهاء الجمع بين المغرب والعشاء بسبب المطر الذي يَبلّ الثياب ويُشقّ معه الخروج إلى المسجد، واستدلوا بحديث ابن عباس رضي الله عنهما أن النبي صلى الله عليه وسلم جمع بين الظهر والعصر والمغرب والعشاء بالمدينة من غير خوف ولا مطر، قيل لابن عباس: ما أراد إلى ذلك؟ قال: أراد أن لا يُحرج أمته. واشترط الحنابلة وغيرهم أن يكون المطر قائماً حال الجمع. والأحوط الاقتصار على الجمع بين المغرب والعشاء دون الظهر والعصر إلا لحاجة شديدة. والله أعلم وصلى الله على نبينا محمد.",
        audioUrl: "https://cdn.tabyan.example/answers/jamaa-matar.mp3", status: "pending_review", audioDurationSeconds: 186,
      },
    },
  ],
  published: [
    {
      id: "demo-fq-8",
      questionText: "ما حكم المداومة على صلاة الضحى، وكم أقل ركعاتها وأكثرها؟",
      category: "salah", categoryLabel: "صلاة", status: "published", priority: "normal",
      studentName: "هيا بنت سعود العتيبي", muftiName: "الشيخ خالد بن ناصر الدوسري", hoursAgo: 96, muftiId: "demo-mufti-2",
      answer: {
        id: "demo-fa-3",
        answerText: "الحمد لله، أما بعد: فصلاة الضحى سنة مؤكدة، داوم عليها النبي صلى الله عليه وسلم وأوصى بها أبا هريرة رضي الله عنه. وأقلها ركعتان، وأكثرها ثمانٌ عند الجمهور، وقيل لا حد لأكثرها، وتُصلَّى مثنى مثنى. ووقتها من ارتفاع الشمس قيد رمح إلى قبيل الزوال بقليل. والله أعلم.",
        audioUrl: null, status: "published_public", audioDurationSeconds: null,
      },
    },
    {
      id: "demo-fq-9",
      questionText: "هل تجب إعادة الحج على من حج وهو صغير لم يبلغ الحلم؟",
      category: "hajj", categoryLabel: "حج", status: "published", priority: "normal",
      studentName: "أم عبد الله الزهراني", muftiName: "د. عبد الله بن سالم العتيبي", hoursAgo: 130, muftiId: "demo-mufti-1",
      answer: {
        id: "demo-fa-4",
        answerText: "الحمد لله، أما بعد: فحج الصغير صحيح ويُثاب عليه، لكنه لا يُجزئ عن حجة الإسلام؛ فإذا بلغ وجبت عليه إعادة الحج إن كان مستطيعاً، لحديث ابن عباس رضي الله عنهما أن امرأة رفعت صبياً لها إلى النبي صلى الله عليه وسلم فقالت: ألهذا حج؟ قال: نعم ولك أجر. والله أعلم.",
        audioUrl: null, status: "published_private", audioDurationSeconds: null,
      },
    },
  ],
  rejected: [
    {
      id: "demo-fq-10",
      questionText: "أريد فتوى شخصية في قضية خلاف عائلي وطلاق وقع بيني وبين أهل زوجتي، مع تفاصيل الأسماء والوقائع.",
      category: "family", categoryLabel: "أسرة", status: "rejected", priority: "normal",
      studentName: "مستخدم محجوب الهوية", muftiName: null, hoursAgo: 48, muftiId: null, answer: null,
    },
  ],
};

// ---------- المفتون (muftisList / muftisStats / teachersList) ----------
export type DemoMufti = {
  teacherId: string; fullName: string; pending: number; answered: number; avgStars: string;
  maxPending: number; categories: { id: string; categoryLabel: string }[];
};

export const DEMO_MUFTIS: DemoMufti[] = [
  {
    teacherId: "demo-mufti-1", fullName: "د. عبد الله بن سالم العتيبي",
    pending: 4, answered: 128, avgStars: "4.8", maxPending: 10,
    categories: [
      { id: "demo-ma-1", categoryLabel: "صلاة" },
      { id: "demo-ma-2", categoryLabel: "حج" },
      { id: "demo-ma-3", categoryLabel: "فقه" },
    ],
  },
  {
    teacherId: "demo-mufti-2", fullName: "الشيخ خالد بن ناصر الدوسري",
    pending: 12, answered: 96, avgStars: "4.6", maxPending: 12,
    categories: [
      { id: "demo-ma-4", categoryLabel: "صيام" },
      { id: "demo-ma-5", categoryLabel: "زكاة" },
      { id: "demo-ma-6", categoryLabel: "معاملات" },
    ],
  },
  {
    teacherId: "demo-mufti-3", fullName: "د. محمد بن عبد الرحمن السقاف",
    pending: 2, answered: 54, avgStars: "4.9", maxPending: 8,
    categories: [
      { id: "demo-ma-7", categoryLabel: "طهارة" },
      { id: "demo-ma-8", categoryLabel: "عقيدة" },
      { id: "demo-ma-9", categoryLabel: "قراءات" },
    ],
  },
];

export const DEMO_MUFTI_STATS = {
  totalMuftis: 3, unassigned: 3, pending: 18, avgStars: "4.7", avgAnswerHours: 9.4,
};

export type DemoTeacher = { teacherId: string; name: string; isMufti: boolean; kycStatus: string };
export const DEMO_TEACHERS: DemoTeacher[] = [
  { teacherId: "demo-tch-1", name: "أ. تركي بن فهد العنزي", isMufti: false, kycStatus: "approved" },
  { teacherId: "demo-tch-2", name: "أ. يوسف بن حمد المطيري", isMufti: false, kycStatus: "approved" },
  { teacherId: "demo-tch-3", name: "أ. سالم بن راشد الشمري", isMufti: false, kycStatus: "approved" },
  { teacherId: "demo-tch-4", name: "أ. نايف بن سلطان القحطاني", isMufti: false, kycStatus: "pending" },
  { teacherId: "demo-mufti-1", name: "د. عبد الله بن سالم العتيبي", isMufti: true, kycStatus: "approved" },
  { teacherId: "demo-mufti-2", name: "الشيخ خالد بن ناصر الدوسري", isMufti: true, kycStatus: "approved" },
  { teacherId: "demo-mufti-3", name: "د. محمد بن عبد الرحمن السقاف", isMufti: true, kycStatus: "approved" },
];

// ---------- الاختبارات (assessmentsList / questionsBankList / attemptsList) ----------
export type DemoAssessment = {
  id: string; name: string; levelId: number | null; passPercentage: number; maxAttempts: number;
  durationMinutes: number | null; isActive: boolean; createdBy: string | null; createdAt: string;
  levelName: string | null; questionCount: number; attemptCount: number;
};

export const DEMO_ASSESSMENTS: DemoAssessment[] = [
  {
    id: "demo-as-1", name: "اختبار تحديد المستوى — الغرس", levelId: 1, passPercentage: 70,
    maxAttempts: 3, durationMinutes: 15, isActive: true,
    createdBy: "demo-admin", createdAt: "2026-01-10T08:00:00Z",
    levelName: "الغرس", questionCount: 12, attemptCount: 48,
  },
  {
    id: "demo-as-2", name: "اختبار أحكام النون الساكنة والتنوين", levelId: 6, passPercentage: 80,
    maxAttempts: 2, durationMinutes: 20, isActive: true,
    createdBy: "demo-admin", createdAt: "2026-02-14T10:30:00Z",
    levelName: "أحكام النون الساكنة", questionCount: 20, attemptCount: 31,
  },
  {
    id: "demo-as-3", name: "اختبار إتقان حفظ جزء عمّ", levelId: 2, passPercentage: 75,
    maxAttempts: 3, durationMinutes: 25, isActive: true,
    createdBy: "demo-admin", createdAt: "2026-03-01T09:00:00Z",
    levelName: "البراعم", questionCount: 15, attemptCount: 22,
  },
  {
    id: "demo-as-4", name: "الاختبار الشامل في التجويد — نسخة قديمة", levelId: null, passPercentage: 70,
    maxAttempts: 1, durationMinutes: 45, isActive: false,
    createdBy: "demo-admin", createdAt: "2025-12-05T12:00:00Z",
    levelName: null, questionCount: 25, attemptCount: 9,
  },
];

export type DemoBankQuestion = {
  id: string; assessmentId: string | null;
  type: "mcq" | "true_false" | "fill_blank" | "recitation";
  questionText: string; options: string[] | null; correctAnswer: string | null;
  topic: string | null; orderIndex: number; isBankQuestion: boolean;
};

export const DEMO_QUESTIONS_BANK: DemoBankQuestion[] = [
  {
    id: "demo-qb-1", assessmentId: null, type: "mcq",
    questionText: "ما حكم النون الساكنة إذا جاء بعدها حرف الباء؟",
    options: ["الإظهار", "الإدغام", "الإقلاب", "الإخفاء"],
    correctAnswer: "الإقلاب", topic: "النون الساكنة والتنوين", orderIndex: 1, isBankQuestion: true,
  },
  {
    id: "demo-qb-2", assessmentId: null, type: "mcq",
    questionText: "كم عدد حروف الإخفاء الحقيقي عند النون الساكنة؟",
    options: ["ستة", "خمسة عشر", "أربعة", "اثنان"],
    correctAnswer: "خمسة عشر", topic: "النون الساكنة والتنوين", orderIndex: 2, isBankQuestion: true,
  },
  {
    id: "demo-qb-3", assessmentId: null, type: "true_false",
    questionText: "المد الطبيعي مقداره حركتان ولا يتغير بالوقف ولا بالوصل.",
    options: null, correctAnswer: "صح", topic: "المدود", orderIndex: 3, isBankQuestion: true,
  },
  {
    id: "demo-qb-4", assessmentId: null, type: "fill_blank",
    questionText: "أكمل: حروف الإدغام بغنة مجموعة في كلمة «______».",
    options: null, correctAnswer: "ينمو", topic: "الإدغام", orderIndex: 4, isBankQuestion: true,
  },
  {
    id: "demo-qb-5", assessmentId: null, type: "recitation",
    questionText: "اقرأ سورة الفاتحة قراءة صحيحة مع مراعاة أحكام الاستعاذة والبسملة.",
    options: null, correctAnswer: null, topic: "التلاوة والتطبيق", orderIndex: 5, isBankQuestion: true,
  },
  {
    id: "demo-qb-6", assessmentId: null, type: "mcq",
    questionText: "ما مخرج حرف القاف؟",
    options: ["أقصى اللسان مع ما يحاذيه من الحنك", "وسط اللسان", "طرف اللسان", "الحلق"],
    correctAnswer: "أقصى اللسان مع ما يحاذيه من الحنك", topic: "المخارج والصفات", orderIndex: 6, isBankQuestion: true,
  },
];

export type DemoAttempt = {
  id: string; assessmentId: string; studentId: string; score: number; passed: boolean;
  answers: unknown; createdAt: string; studentName: string;
};

export const DEMO_ATTEMPTS: Record<string, DemoAttempt[]> = {
  "demo-as-1": [
    { id: "demo-at-1", assessmentId: "demo-as-1", studentId: "demo-st-1", score: 92, passed: true, answers: null, createdAt: "2026-06-02T10:20:00Z", studentName: "عبد العزيز بن سعد الحربي" },
    { id: "demo-at-2", assessmentId: "demo-as-1", studentId: "demo-st-2", score: 78, passed: true, answers: null, createdAt: "2026-06-03T14:05:00Z", studentName: "نورة بنت فهد القحطاني" },
    { id: "demo-at-3", assessmentId: "demo-as-1", studentId: "demo-st-3", score: 55, passed: false, answers: null, createdAt: "2026-06-04T09:40:00Z", studentName: "محمد بن علي الشمري" },
  ],
  "demo-as-2": [
    { id: "demo-at-4", assessmentId: "demo-as-2", studentId: "demo-st-4", score: 85, passed: true, answers: null, createdAt: "2026-06-01T18:15:00Z", studentName: "ريم بنت خالد العنزي" },
    { id: "demo-at-5", assessmentId: "demo-as-2", studentId: "demo-st-5", score: 66, passed: false, answers: null, createdAt: "2026-06-05T20:30:00Z", studentName: "فهد بن عبد الرحمن الغامدي" },
  ],
  "demo-as-3": [
    { id: "demo-at-6", assessmentId: "demo-as-3", studentId: "demo-st-6", score: 96, passed: true, answers: null, createdAt: "2026-05-28T16:45:00Z", studentName: "هيا بنت سعود العتيبي" },
  ],
  "demo-as-4": [],
};

// ---------- التحليلات (analyticsOverview) ----------
export const DEMO_ANALYTICS = {
  totalUsers: 1240, totalStudents: 986, totalTeachers: 42, totalSessions: 3180, completedSessions: 2754,
  funnel: { totalUsers: 1240, totalStudents: 986, placementSubmitted: 871, placementApproved: 742 },
  levelCounts: [
    { levelId: 1, levelName: "الغرس", c: 214 },
    { levelId: 2, levelName: "البراعم", c: 187 },
    { levelId: 3, levelName: "الأشجار", c: 142 },
    { levelId: 4, levelName: "الثمار", c: 96 },
    { levelId: 5, levelName: "الوارثون", c: 38 },
    { levelId: 6, levelName: "أحكام النون الساكنة", c: 121 },
    { levelId: null, levelName: null, c: 188 },
  ] as { levelId: number | null; levelName: string | null; c: number }[],
  heatmap: [
    { weekday: 1, hour: 16, c: 14 }, { weekday: 1, hour: 17, c: 22 }, { weekday: 1, hour: 18, c: 18 },
    { weekday: 2, hour: 16, c: 9 }, { weekday: 2, hour: 17, c: 19 }, { weekday: 2, hour: 20, c: 11 },
    { weekday: 3, hour: 15, c: 7 }, { weekday: 3, hour: 17, c: 24 }, { weekday: 3, hour: 18, c: 16 },
    { weekday: 4, hour: 16, c: 12 }, { weekday: 4, hour: 17, c: 21 }, { weekday: 4, hour: 19, c: 8 },
    { weekday: 5, hour: 17, c: 17 }, { weekday: 5, hour: 18, c: 13 }, { weekday: 5, hour: 21, c: 6 },
    { weekday: 6, hour: 10, c: 5 }, { weekday: 6, hour: 16, c: 10 }, { weekday: 7, hour: 10, c: 8 },
    { weekday: 7, hour: 11, c: 12 }, { weekday: 7, hour: 16, c: 15 },
  ] as { weekday: number; hour: number; c: number }[],
  content: { booksCount: 8, recordingsCount: 412, fatwasPublished: 156, bookmarksCount: 231 },
  teacherStats: [
    { teacherId: "demo-tch-1", fullName: "أ. تركي بن فهد العنزي", total: 412, completed: 388 },
    { teacherId: "demo-tch-2", fullName: "أ. يوسف بن حمد المطيري", total: 356, completed: 301 },
    { teacherId: "demo-tch-3", fullName: "أ. سالم بن راشد الشمري", total: 289, completed: 267 },
    { teacherId: "demo-mufti-1", fullName: "د. عبد الله بن سالم العتيبي", total: 198, completed: 190 },
  ] as { teacherId: string; fullName: string; total: number; completed: number }[],
};

// ---------- الإشعارات (notificationsTemplates / notificationsLog / notificationsRecurring) ----------
export const DEMO_NOTIFICATION_TEMPLATES = [
  { key: "welcome", title: "أهلاً بك في تبيان", body: "نسعد بانضمامك إلى منصة تبيان لتعليم القرآن الكريم. رحلتك تبدأ الآن.", type: "general" },
  { key: "reminder_24h", title: "تذكير بحصتك غداً", body: "لديك حصة مجدولة بعد 24 ساعة. نراك في موعدك بإذن الله.", type: "reminder" },
  { key: "reminder_15m", title: "تذكير: حلقتك بعد قليل", body: "تبقى 15 دقيقة على بدء الحلقة.", type: "reminder" },
  { key: "placement_approved", title: "تم اعتماد مستواك", body: "مبروك! تم تحديد مستواك ويمكنك الآن حجز حصصك.", type: "result" },
  { key: "placement_rejected", title: "إعادة اختبار تحديد المستوى", body: "نرجو إعادة تسجيل فيديو اختبار تحديد المستوى وفق الملاحظات المرسلة.", type: "result" },
  { key: "promotion", title: "تمت ترقيتك", body: "مبارك! انتقلت إلى المستوى التالي. واصل التقدم.", type: "result" },
  { key: "recording", title: "تسجيل حصتك جاهز", body: "أصبح تسجيل حصتك الأخيرة متاحاً للمراجعة في ملفك.", type: "recording" },
];

export type DemoSentNotification = {
  id: string; adminId: string | null; title: string; body: string | null;
  audienceType: string; audienceTarget: string | null; notificationType: string;
  isRecurring: boolean; recurrencePattern: string | null; scheduledAt: string | null;
  sentAt: string; status: string;
};

export const DEMO_NOTIFICATIONS_LOG: (DemoSentNotification & { adminName: string | null })[] = [
  {
    id: "demo-nt-1", adminId: "demo-admin", title: "بدء التسجيل في دورة التجويد الصيفية",
    body: "يسرّ إدارة تبيان الإعلان عن فتح التسجيل في دورة التجويد الصيفية المكثفة. المقاعد محدودة، سارعوا بالحجز.",
    audienceType: "all_students", audienceTarget: null, notificationType: "general",
    isRecurring: false, recurrencePattern: null, scheduledAt: null, sentAt: "2026-06-07T09:00:00Z", status: "sent",
    adminName: "المشرف العام",
  },
  {
    id: "demo-nt-2", adminId: "demo-admin", title: "تذكير بمواعيد اختبار نهاية المستوى",
    body: "تذكير لطلاب مستوى البراعم: اختبار إتقان حفظ جزء عمّ متاح حتى نهاية الأسبوع.",
    audienceType: "specific_level", audienceTarget: "2", notificationType: "reminder",
    isRecurring: false, recurrencePattern: null, scheduledAt: null, sentAt: "2026-06-05T18:30:00Z", status: "delivered",
    adminName: "المشرف العام",
  },
  {
    id: "demo-nt-3", adminId: "demo-admin", title: "تحديث سياسة تسجيلات الحصص",
    body: "نودّ إشعاركم بأن تسجيلات الحصص ستُحفظ لمدة ستة أشهر اعتباراً من بداية الشهر القادم.",
    audienceType: "all_teachers", audienceTarget: null, notificationType: "general",
    isRecurring: false, recurrencePattern: null, scheduledAt: null, sentAt: "2026-06-01T12:00:00Z", status: "sent",
    adminName: "المشرف العام",
  },
  {
    id: "demo-nt-4", adminId: "demo-admin", title: "تهنئة بمناسبة عشر ذي الحجة",
    body: "تقبّل الله منا ومنكم صالح الأعمال، ونسأل الله أن يجعل أيامكم عامرة بالطاعة.",
    audienceType: "all_students", audienceTarget: null, notificationType: "general",
    isRecurring: false, recurrencePattern: null, scheduledAt: null, sentAt: "2026-05-27T07:00:00Z", status: "read",
    adminName: "المشرف العام",
  },
];

export const DEMO_NOTIFICATIONS_RECURRING: DemoSentNotification[] = [
  {
    id: "demo-nt-5", adminId: "demo-admin", title: "تذكير أسبوعي بإكمال ورد المراجعة",
    body: "لا تنسَ إكمال ورد المراجعة الأسبوعي قبل نهاية يوم الجمعة.",
    audienceType: "all_students", audienceTarget: null, notificationType: "reminder",
    isRecurring: true, recurrencePattern: "weekly", scheduledAt: null, sentAt: "2026-04-15T06:00:00Z", status: "sent",
  },
  {
    id: "demo-nt-6", adminId: "demo-admin", title: "رسالة تحفيزية صباحية للمعلمين",
    body: "صباح الخير، نذكّركم بمراجعة طلبات الحجز الجديدة قبل بدء حصص اليوم.",
    audienceType: "all_teachers", audienceTarget: null, notificationType: "reminder",
    isRecurring: true, recurrencePattern: "daily_morning", scheduledAt: null, sentAt: "2026-05-10T06:00:00Z", status: "sent",
  },
];

// ---------- إعدادات النظام (settingsGet) ----------
export type DemoSetting = {
  id: string; key: string; value: string; description: string | null;
  updatedBy: string | null; updatedAt: string;
};

export const DEMO_SETTINGS: DemoSetting[] = [
  { id: "demo-set-1", key: "login_max_attempts", value: "5", description: "عدد محاولات الدخول الفاشلة قبل الحظر", updatedBy: "demo-admin", updatedAt: "2026-03-01T08:00:00Z" },
  { id: "demo-set-2", key: "login_block_duration_hours", value: "48", description: "مدة حظر الحساب بالساعات بعد تجاوز المحاولات", updatedBy: "demo-admin", updatedAt: "2026-03-01T08:00:00Z" },
  { id: "demo-set-3", key: "placement_video_duration_seconds", value: "180", description: "الحد الأقصى لطول فيديو اختبار تحديد المستوى (ثانية)", updatedBy: "demo-admin", updatedAt: "2026-03-12T10:00:00Z" },
  { id: "demo-set-4", key: "placement_review_deadline_hours", value: "72", description: "مهلة مراجعة اختبار تحديد المستوى بالساعات", updatedBy: "demo-admin", updatedAt: "2026-03-12T10:00:00Z" },
  { id: "demo-set-5", key: "promotion_video_duration_seconds", value: "240", description: "الحد الأقصى لطول فيديو طلب الترقية (ثانية)", updatedBy: "demo-admin", updatedAt: "2026-04-02T09:00:00Z" },
  { id: "demo-set-6", key: "fatwa_reassign_hours", value: "48", description: "عدد الساعات قبل إعادة إسناد سؤال الفتوى تلقائياً", updatedBy: "demo-admin", updatedAt: "2026-04-20T11:30:00Z" },
  { id: "demo-set-7", key: "recording_retention_months", value: "6", description: "مدة الاحتفاظ بتسجيلات الحصص بالأشهر", updatedBy: "demo-admin", updatedAt: "2026-05-01T12:00:00Z" },
  { id: "demo-set-8", key: "notif_ayah_time", value: "06:00", description: "وقت إرسال إشعار آية اليوم", updatedBy: "demo-admin", updatedAt: "2026-02-01T06:00:00Z" },
  { id: "demo-set-9", key: "notif_hadith_time", value: "12:00", description: "وقت إرسال إشعار حديث اليوم", updatedBy: "demo-admin", updatedAt: "2026-02-01T06:00:00Z" },
  { id: "demo-set-10", key: "notif_ibn_qayyim_time", value: "21:00", description: "وقت إرسال إشعار درر ابن القيم", updatedBy: "demo-admin", updatedAt: "2026-02-01T06:00:00Z" },
  { id: "demo-set-11", key: "notif_review_reminder_time", value: "20:00", description: "وقت إرسال تذكير المراجعة اليومي", updatedBy: "demo-admin", updatedAt: "2026-02-01T06:00:00Z" },
];
