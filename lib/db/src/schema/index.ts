// Tabyan — Drizzle ORM (PostgreSQL) schema
// Converted from the approved MASTER_SRS v2.0 reference schema. UUIDs as varchar(36).
// NOTE: bookings+sessions unified into `sessions`; recordings unified (session-linked).

import {
  pgTable, varchar, text, integer, boolean, timestamp, date,
  numeric, jsonb, uniqueIndex, index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => varchar("id", { length: 36 }).primaryKey();
const createdAt = () => timestamp("created_at").defaultNow();
const updatedAt = () => timestamp("updated_at").defaultNow();

// ---------- Core ----------
export const users = pgTable("users", {
  id: id(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  // nullable منذ دفعة حسابات الإشراف — الحسابات المنشأة من لوحة الإشراف تدخل باسم مستخدم بلا هاتف
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 150 }),
  // توثيق البريد الاختياري في تسجيل الطالب — لا يصبح true إلا بكود تحقق خادمي
  emailVerified: boolean("email_verified").notNull().default(false),
  // ربط Google للطلاب — sub المُتحقق منه خادمياً فقط؛ nullable+unique (الفهرس ضمن القيد) ولا يؤثر على المستخدمين الحاليين
  googleId: varchar("google_id", { length: 255 }).unique(),
  // كلمة السر تُخزَّن تجزئةً bcrypt فقط — ممنوع أي نص صريح (bcrypt $2b$ hash = 60 حرفاً)
  passwordHash: varchar("password_hash", { length: 100 }),
  // اسم مستخدم فريد (يُخزَّن lowercase) لحسابات المشرفين/المعلمين المنشأة من لوحة الإشراف
  username: varchar("username", { length: 30 }).unique(),
  // من أنشأ الحساب (معرف المشرف) وأصله — supervisor_created = أُنشئ من لوحة الإشراف، self_registered = تسجيل ذاتي
  createdBy: varchar("created_by", { length: 36 }),
  accountOrigin: varchar("account_origin", { length: 30 }).$type<"supervisor_created" | "self_registered">(),
  role: varchar("role", { length: 20 }).$type<"student" | "teacher" | "admin">().notNull().default("student"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  banReason: text("ban_reason"),
  bannedUntil: timestamp("banned_until"),
  createdAt: createdAt(),
});

export const students = pgTable("students", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  currentLevelId: integer("current_level_id"),
  totalJuz: integer("total_juz").notNull().default(0),
  placementTestStatus: varchar("placement_test_status", { length: 20 }).$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  placementTestVideoUrl: varchar("placement_test_video_url", { length: 500 }),
  placementPathType: varchar("placement_path_type", { length: 30 }).$type<"quran" | "tajweed_correction">(),
  // اختيار الطالب لمنظومة تحفة الأطفال: null = لم يُسأل/لم يُكمل الاختبار
  wantsTuhfa: boolean("wants_tuhfa"),
  placementTestResultLevelId: integer("placement_test_result_level_id"),
  placementReviewNotes: text("placement_review_notes"),
  schoolStage: varchar("school_stage", { length: 20 }).$type<"primary" | "middle" | "high">(),
  schoolGrade: varchar("school_grade", { length: 20 }),
  birthDate: date("birth_date"),
  parentPhone: varchar("parent_phone", { length: 20 }),
  gpsLat: varchar("gps_lat", { length: 30 }),
  gpsLng: varchar("gps_lng", { length: 30 }),
  createdAt: createdAt(),
});

export const teachers = pgTable("teachers", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bio: varchar("bio", { length: 500 }),
  specialization: varchar("specialization", { length: 100 }),
  kycStatus: varchar("kyc_status", { length: 20 }).$type<"awaiting_assessment" | "in_progress" | "pending" | "approved" | "rejected">().notNull().default("awaiting_assessment"),
  kycVideoUrl: varchar("kyc_video_url", { length: 500 }),
  kycAnswers: jsonb("kyc_answers"),
  kycReviewNotes: text("kyc_review_notes"),
  isMufti: boolean("is_mufti").notNull().default(false),
  // معلم متطوع — يُضبط من اختبار القبول ولا يغيّر مسار التوثيق
  isVolunteer: boolean("is_volunteer").notNull().default(false),
  // المسار/المستوى المعيَّنان عند إنشاء الحساب من لوحة الإشراف (إرشادي — الجدولة الفعلية عبر weeklySchedules)
  assignedPath: varchar("assigned_path", { length: 30 }).$type<"quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia">(),
  assignedLevelId: integer("assigned_level_id").references((): AnyPgColumn => levels.id, { onDelete: "set null" }),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).notNull().default("0"),
  experienceYears: integer("experience_years").notNull().default(0),
  createdAt: createdAt(),
});

// شهادات/مؤهلات المعلم المرفوعة اختيارياً — يراجعها المشرف ضمن ملف التوثيق
export const teacherCertificates = pgTable("teacher_certificates", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  title: varchar("title", { length: 200 }),
  createdAt: createdAt(),
});

// سجل الإشعارات الجماعية التي يرسلها المعلم لطلابه — المستلمون يُحسمون من الخادم
export const teacherBroadcasts = pgTable("teacher_broadcasts", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  audience: varchar("audience", { length: 10 }).$type<"all" | "schedule">().notNull().default("all"),
  scheduleId: varchar("schedule_id", { length: 36 }).references(() => weeklySchedules.id, { onDelete: "set null" }),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: createdAt(),
});

export const levels = pgTable("levels", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  path: varchar("path", { length: 30 }).$type<"quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia">().notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  sessionsCount: integer("sessions_count").notNull().default(0),
  requiredJuz: integer("required_juz").notNull().default(0),
  requiredSessions: integer("required_sessions").notNull().default(0),
  minGrade: varchar("min_grade", { length: 50 }),
  requiresIjazah: boolean("requires_ijazah").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isHidden: boolean("is_hidden").notNull().default(false),
  // للمستويات القرآنية: متطلب العقيدة الإلزامي المرتبط بهذا المستوى (معرّف مستوى sharia/name_en=aqeedah_quran)
  aqeedahLevelId: integer("aqeedah_level_id"),
});

// مواد الدروس الشرعية (العقيدة الاختيارية/الفقه/السيرة) — تُدار بالكامل من لوحة الإدارة
export const shariaSubjects = pgTable("sharia_subjects", {
  id: id(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 40 }),
  color: varchar("color", { length: 9 }),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- Scheduling & Sessions ----------
export const weeklySchedules = pgTable("weekly_schedules", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  sessionType: varchar("session_type", { length: 30 }).notNull(),
  levelId: integer("level_id").references(() => levels.id, { onDelete: "set null" }),
  sessionMode: varchar("session_mode", { length: 20 }).$type<"individual" | "group">().notNull(),
  maxStudents: integer("max_students").notNull().default(1),
  availableDays: jsonb("available_days").notNull(),   // ["sunday","monday"]
  availableTimes: jsonb("available_times").notNull(), // ["16:00","17:00"]
  durationMinutes: integer("duration_minutes").notNull().default(30),
  location: varchar("location", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  // فتح/إغلاق التسجيل في الحلقة — يتحكم به المشرف
  isAcceptingBookings: boolean("is_accepting_bookings").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).references(() => students.userId, { onDelete: "cascade" }),
  scheduleId: varchar("schedule_id", { length: 36 }).references(() => weeklySchedules.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }),
  sessionType: varchar("session_type", { length: 30 }).notNull(),
  type: varchar("type", { length: 20 }).$type<"individual" | "group">().notNull().default("individual"),
  levelId: integer("level_id").references(() => levels.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  status: varchar("status", { length: 20 }).$type<"scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show">().notNull().default("scheduled"),
  topic: varchar("topic", { length: 200 }),
  notes: text("notes"),
  meetingUrl: varchar("meeting_url", { length: 500 }),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("idx_sessions_teacher").on(t.teacherId), index("idx_sessions_student").on(t.studentId)]);

export const sessionParticipants = pgTable("session_participants", {
  id: id(),
  sessionId: varchar("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_participant").on(t.sessionId, t.studentId)]);

export const scheduleChangeRequests = pgTable("schedule_change_requests", {
  id: id(),
  sessionId: varchar("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  requestedNewTime: timestamp("requested_new_time"),
  reason: varchar("reason", { length: 500 }),
  status: varchar("status", { length: 20 }).$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  reviewedAt: timestamp("reviewed_at"),
});

// ---------- Recordings & Evaluation ----------
export const recordings = pgTable("recordings", {
  id: id(),
  sessionId: varchar("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id", { length: 36 }).references(() => teachers.userId, { onDelete: "set null" }),
  studentId: varchar("student_id", { length: 36 }).references(() => students.userId, { onDelete: "set null" }),
  videoUrl: varchar("video_url", { length: 500 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  fileSizeMb: numeric("file_size_mb", { precision: 10, scale: 2 }),
  quality: varchar("quality", { length: 10 }).$type<"360p" | "480p" | "720p" | "1080p">().notNull().default("720p"),
  // لا يصبح السجل ready إلا بعد أن يؤمَّن object فعلي ويُفحص في Object Storage.
  // legacy_invalid يحجب الروابط الوهمية القديمة من أي واجهة عرض.
  status: varchar("status", { length: 20 }).$type<"uploading" | "ready" | "failed" | "legacy_invalid">().notNull().default("uploading"),
  readyAt: timestamp("ready_at"),
  expiresAt: timestamp("expires_at"),
  retentionAttempts: integer("retention_attempts").notNull().default(0),
  retentionLastError: text("retention_last_error"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  createdAt: createdAt(),
}, (t) => [
  index("idx_recordings_expiry").on(t.expiresAt),
]);

export const evaluations = pgTable("evaluations", {
  id: id(),
  sessionId: varchar("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id", { length: 36 }).references(() => teachers.userId, { onDelete: "set null" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  hifzScore: integer("hifz_score").notNull().default(0),       // /50
  revisionScore: integer("revision_score").notNull().default(0), // /20
  tajweedScore: integer("tajweed_score").notNull().default(0),   // /20
  commitmentScore: integer("commitment_score").notNull().default(0), // /10
  totalScore: integer("total_score").notNull().default(0),       // computed in code
  notes: varchar("notes", { length: 500 }),
  audioNotesUrl: varchar("audio_notes_url", { length: 500 }),
  recommendation: varchar("recommendation", { length: 20 }).$type<"promote" | "keep" | "review">(),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const studentProgress = pgTable("student_progress", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  levelId: integer("level_id").notNull().references(() => levels.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).$type<"locked" | "in_progress" | "completed">().notNull().default("in_progress"),
  completedJuz: integer("completed_juz").notNull().default(0),
  completedSessions: integer("completed_sessions").notNull().default(0),
  averageScore: numeric("average_score", { precision: 5, scale: 2 }).notNull().default("0"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (t) => [uniqueIndex("uq_student_level").on(t.studentId, t.levelId)]);

export const promotionRequests = pgTable("promotion_requests", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  fromLevelId: integer("from_level_id").references(() => levels.id),
  toLevelId: integer("to_level_id").references(() => levels.id),
  videoUrl: varchar("video_url", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  reviewNotes: text("review_notes"),
  adminReviewerId: varchar("admin_reviewer_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  reviewedAt: timestamp("reviewed_at"),
});

export const qiraatCertificates = pgTable("qiraat_certificates", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  certificateUrl: varchar("certificate_url", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  adminReviewerId: varchar("admin_reviewer_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  createdAt: createdAt(),
  reviewedAt: timestamp("reviewed_at"),
});

// ---------- Library ----------
export const books = pgTable("books", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(),
  author: varchar("author", { length: 150 }),
  category: varchar("category", { length: 20 }).$type<"aqeedah" | "fiqh" | "seerah" | "tajweed" | "quran" | "qiraat" | "fatwa" | "hadith">().notNull(),
  section: varchar("section", { length: 20 }).$type<"curriculum" | "hadith" | "fatwa" | "general">().notNull().default("general"),
  contentType: varchar("content_type", { length: 10 }).$type<"pdf" | "text" | "audio" | "video" | "link">().notNull(),
  sourceType: varchar("source_type", { length: 20 }).$type<"uploaded" | "external">().notNull().default("external"),
  fileObjectKey: varchar("file_object_key", { length: 500 }),
  fileUrl: varchar("file_url", { length: 500 }),
  externalUrl: varchar("external_url", { length: 500 }),
  textContent: text("text_content"),
  coverUrl: varchar("cover_url", { length: 500 }),
  description: text("description"),
  audioUrl: varchar("audio_url", { length: 500 }),
  levelIds: jsonb("level_ids"), // number[] — null/empty = general (all levels)
  status: varchar("status", { length: 20 }).$type<"published" | "hidden" | "archived">().notNull().default("published"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bookmarks = pgTable("bookmarks", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_bookmark").on(t.studentId, t.bookId)]);

export const downloads = pgTable("downloads", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_download").on(t.studentId, t.bookId)]);

// كتاب مُسجَّل تلقائياً كمقرر دراسي للطالب (مثلاً تحفة الأطفال عند اختياره في اختبار القبول) —
// يميّز "المقرر المُسنَد" عن الكتاب العام الذي يتصفحه أي طالب دون أن يُحتسب مقرراً
export const bookAssignments = pgTable("book_assignments", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 30 }).notNull().default("placement_choice"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_book_assignment").on(t.studentId, t.bookId)]);

// ---------- Fatwa ----------
export const fatwaQuestions = pgTable("fatwa_questions", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  audioUrl: varchar("audio_url", { length: 500 }),
  status: varchar("status", { length: 20 }).$type<"pending" | "assigned" | "answered" | "published" | "rejected" | "cancelled">().notNull().default("pending"),
  muftiId: varchar("mufti_id", { length: 36 }).references(() => teachers.userId, { onDelete: "set null" }),
  assignedBy: varchar("assigned_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  priority: varchar("priority", { length: 10 }).$type<"normal" | "urgent">().notNull().default("normal"),
  followupOfId: varchar("followup_of_id", { length: 36 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const fatwaAnswers = pgTable("fatwa_answers", {
  id: id(),
  questionId: varchar("question_id", { length: 36 }).notNull().references(() => fatwaQuestions.id, { onDelete: "cascade" }),
  muftiId: varchar("mufti_id", { length: 36 }).references(() => teachers.userId, { onDelete: "set null" }),
  answerText: text("answer_text").notNull(),
  referenceText: varchar("reference_text", { length: 500 }),
  audioUrl: varchar("audio_url", { length: 500 }),
  audioDurationSeconds: integer("audio_duration_seconds"),
  status: varchar("status", { length: 30 }).$type<"pending_review" | "published_public" | "published_private" | "rejected">().notNull().default("pending_review"),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: createdAt(),
});

export const muftiAssignments = pgTable("mufti_assignments", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  maxPendingFatwas: integer("max_pending_fatwas").notNull().default(20),
  assignedBy: varchar("assigned_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("uq_mufti_category").on(t.teacherId, t.category)]);

export const fatwaRatings = pgTable("fatwa_ratings", {
  id: id(),
  answerId: varchar("answer_id", { length: 36 }).notNull().references(() => fatwaAnswers.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  starRating: integer("star_rating").notNull(),
  isHelpful: boolean("is_helpful"),
  feedbackText: varchar("feedback_text", { length: 500 }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_fatwa_rating").on(t.answerId, t.studentId)]);

export const fatwaViews = pgTable("fatwa_views", {
  id: id(),
  answerId: varchar("answer_id", { length: 36 }).notNull().references(() => fatwaAnswers.id, { onDelete: "cascade" }),
  viewerId: varchar("viewer_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: createdAt(),
});

// ---------- Assessments ----------
export const assessments = pgTable("assessments", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  levelId: integer("level_id").references(() => levels.id, { onDelete: "set null" }),
  passPercentage: integer("pass_percentage").notNull().default(70),
  maxAttempts: integer("max_attempts").notNull().default(3),
  durationMinutes: integer("duration_minutes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: id(),
  assessmentId: varchar("assessment_id", { length: 36 }).references(() => assessments.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).$type<"mcq" | "true_false" | "fill_blank" | "recitation">().notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options"),
  correctAnswer: text("correct_answer"),
  topic: varchar("topic", { length: 100 }),
  orderIndex: integer("order_index").notNull().default(0),
  isBankQuestion: boolean("is_bank_question").notNull().default(false),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: id(),
  assessmentId: varchar("assessment_id", { length: 36 }).notNull().references(() => assessments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  answers: jsonb("answers"),
  createdAt: createdAt(),
});

// ---------- Messaging & Notifications ----------
export const teacherMessages = pgTable("teacher_messages", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().references(() => teachers.userId, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  messageText: varchar("message_text", { length: 1000 }).notNull(),
  audioUrl: varchar("audio_url", { length: 500 }),
  fileUrl: varchar("file_url", { length: 500 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  type: varchar("type", { length: 30 }).notNull().default("general"),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"),
  primaryActionUrl: varchar("primary_action_url", { length: 500 }),
  primaryActionLabel: varchar("primary_action_label", { length: 100 }),
  secondaryActionUrl: varchar("secondary_action_url", { length: 500 }),
  secondaryActionLabel: varchar("secondary_action_label", { length: 100 }),
  isRead: boolean("is_read").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  /** بيانات الموعد المرتبط: { teacherName, subject, date, time, durationMinutes, sessionKind } */
  payload: jsonb("payload"),
  /** مرفقات الإشعار: Array<{ name, kind: "pdf"|"audio"|"file", url? }> */
  attachments: jsonb("attachments"),
  createdAt: createdAt(),
}, (t) => [index("idx_notif_user").on(t.userId)]);

export const notificationSettings = pgTable("notification_settings", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  sessionReminders: boolean("session_reminders").notNull().default(true),
  sessionChanges: boolean("session_changes").notNull().default(true),
  evaluations: boolean("evaluations").notNull().default(true),
  achievements: boolean("achievements").notNull().default(true),
  announcements: boolean("announcements").notNull().default(true),
  ayahOfDay: boolean("ayah_of_day").notNull().default(true),
  payments: boolean("payments").notNull().default(true),
  reminderBeforeMinutes: integer("reminder_before_minutes").notNull().default(30),
  ayahDeliveryTime: varchar("ayah_delivery_time", { length: 5 }).notNull().default("06:00"),
  dndDuringPrayer: boolean("dnd_during_prayer").notNull().default(false),
  dndDuringSession: boolean("dnd_during_session").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  vibrationEnabled: boolean("vibration_enabled").notNull().default(true),
  updatedAt: updatedAt(),
});

export const adminNotificationsSent = pgTable("admin_notifications_sent", {
  id: id(),
  adminId: varchar("admin_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  audienceType: varchar("audience_type", { length: 20 }).$type<"all_students" | "all_teachers" | "specific_level" | "specific_user">().notNull(),
  audienceTarget: varchar("audience_target", { length: 36 }),
  notificationType: varchar("notification_type", { length: 50 }).notNull().default("general"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 50 }),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at").default(sql`CURRENT_TIMESTAMP`),
  status: varchar("status", { length: 20 }).$type<"sent" | "delivered" | "read" | "failed">().notNull().default("sent"),
});

// ---------- Admin & Security ----------
export const adminLoginAttempts = pgTable("admin_login_attempts", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  phone: varchar("phone", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 10 }).$type<"success" | "failed" | "blocked">().notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  blockedUntil: timestamp("blocked_until"),
  createdAt: createdAt(),
});

// حالة حماية دخول الطالب/المعلم بالهاتف أو البريد.
// صف واحد لكل مُعرّف مطبّع؛ يُحدَّث تحت advisory lock ويُحذف بعد نجاح الدخول.
export const studentPasswordLoginAttempts = pgTable("student_password_login_attempts", {
  id: id(),
  identifier: varchar("identifier", { length: 150 }).notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  failureTimestamps: jsonb("failure_timestamps").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  blockedUntil: timestamp("blocked_until"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("student_password_login_attempts_identifier_unique").on(t.identifier),
]);

export const adminSessions = pgTable("admin_sessions", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  jwtToken: text("jwt_token").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  lastActivity: timestamp("last_activity").default(sql`CURRENT_TIMESTAMP`),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  adminId: varchar("admin_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 36 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: createdAt(),
});

export const systemSettings = pgTable("system_settings", {
  id: id(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

// ---------- Daily Verse (آية اليوم) ----------
export const dailyVerses = pgTable("daily_verses", {
  id: id(),
  verseDate: date("verse_date").notNull().unique(),          // YYYY-MM-DD
  text: text("text").notNull(),                              // الرسم العثماني
  surahName: varchar("surah_name", { length: 60 }).notNull(),
  surahNumber: integer("surah_number").notNull(),
  ayahNumber: integer("ayah_number").notNull(),
  source: varchar("source", { length: 10 }).notNull().default("auto"), // auto | admin
  setBy: varchar("set_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// ---------- Settings ----------
export const teacherSettings = pgTable("teacher_settings", {
  id: id(),
  teacherId: varchar("teacher_id", { length: 36 }).notNull().unique().references(() => teachers.userId, { onDelete: "cascade" }),
  videoQuality: varchar("video_quality", { length: 10 }).$type<"360p" | "480p" | "720p" | "1080p">().notNull().default("720p"),
  audioQuality: varchar("audio_quality", { length: 10 }).$type<"low" | "medium" | "high">().notNull().default("high"),
  autoRecord: boolean("auto_record").notNull().default(false),
  reminderMinutes: integer("reminder_minutes").notNull().default(15),
  defaultCameraOn: boolean("default_camera_on").notNull().default(true),
  defaultMicOn: boolean("default_mic_on").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  vibrationEnabled: boolean("vibration_enabled").notNull().default(true),
  updatedAt: updatedAt(),
});

export const studentSettings = pgTable("student_settings", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().unique().references(() => students.userId, { onDelete: "cascade" }),
  darkMode: boolean("dark_mode").notNull().default(false),
  sessionReminderMinutes: integer("session_reminder_minutes").notNull().default(15),
  ayahNotification: boolean("ayah_notification").notNull().default(true),
  hadithNotification: boolean("hadith_notification").notNull().default(true),
  ibnQayyimNotification: boolean("ibn_qayyim_notification").notNull().default(true),
  activityNotification: boolean("activity_notification").notNull().default(false),
  audioQuality: varchar("audio_quality", { length: 20 }).notNull().default("high"),
  videoQuality: varchar("video_quality", { length: 20 }).notNull().default("720p"),
  language: varchar("language", { length: 10 }).notNull().default("ar"),
  updatedAt: updatedAt(),
});

// ---------- Sharia curriculum ----------
export const shariaContent = pgTable("sharia_content", {
  id: id(),
  levelId: integer("level_id").notNull().references(() => levels.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  author: varchar("author", { length: 150 }),
  description: text("description"),
  contentType: varchar("content_type", { length: 10 }).$type<"pdf" | "text" | "audio" | "video" | "link">().notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  externalUrl: varchar("external_url", { length: 500 }),
  textBody: text("text_body"),
  durationMinutes: integer("duration_minutes"),
  pageCount: integer("page_count"),
  orderIndex: integer("order_index").notNull().default(0),
  status: varchar("status", { length: 20 }).$type<"published" | "hidden">().notNull().default("published"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const shariaContentProgress = pgTable("sharia_content_progress", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => shariaContent.id, { onDelete: "cascade" }),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  lastPosition: varchar("last_position", { length: 50 }),
  status: varchar("status", { length: 20 }).$type<"in_progress" | "completed">().notNull().default("in_progress"),
  bookmarked: boolean("bookmarked").notNull().default(false),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("uq_sharia_progress").on(t.studentId, t.contentId)]);

export const shariaExamQuestions = pgTable("sharia_exam_questions", {
  id: id(),
  levelId: integer("level_id").notNull().references(() => levels.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).$type<"mcq" | "true_false" | "fill_blank">().notNull().default("mcq"),
  options: jsonb("options"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const shariaExamAttempts = pgTable("sharia_exam_attempts", {
  id: id(),
  studentId: varchar("student_id", { length: 36 }).notNull().references(() => students.userId, { onDelete: "cascade" }),
  levelId: integer("level_id").notNull().references(() => levels.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  answers: jsonb("answers"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("uq_sharia_exam_attempt").on(t.studentId, t.levelId, t.attemptNumber)]);

// ---------- OTP ----------
export const otpCodes = pgTable("otp_codes", {
  id: id(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  // عدّاد محاولات التحقق الفاشلة على هذا الرمز — يُبطل الرمز عند بلوغ الحد
  attempts: integer("attempts").notNull().default(0),
  createdAt: createdAt(),
});

// ---------- رموز تحقق البريد الإلكتروني (خطوة اختيارية في تسجيل الطالب) ----------
export const emailOtpCodes = pgTable("email_otp_codes", {
  id: id(),
  email: varchar("email", { length: 150 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  // عدّاد محاولات التحقق الفاشلة — يُبطل الكود عند بلوغ الحد (نفس نمط رموز الهاتف)
  attempts: integer("attempts").notNull().default(0),
  createdAt: createdAt(),
});

// ---------- سجل الأحداث الأمنية (بلا كلمات سر أو رموز OTP إطلاقاً) ----------
export const securityEvents = pgTable("security_events", {
  id: id(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: createdAt(),
});

// ---------- Auth tokens (custom, no OAuth) ----------
export const authTokens = pgTable("auth_tokens", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  role: varchar("role", { length: 20 }).$type<"student" | "teacher" | "admin">().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: createdAt(),
});

// ---------- WebAuthn (الدخول بالبصمة — تحقق خادمي كامل بالمفتاح العام) ----------
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),   // base64url
  publicKey: text("public_key").notNull(),                  // base64url — مفتاح عام فقط
  counter: integer("counter").notNull().default(0),
  transports: jsonb("transports"),
  createdAt: createdAt(),
});

export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: id(),
  userId: varchar("user_id", { length: 36 }),               // فارغ لتحدي الدخول قبل معرفة المستخدم
  challenge: varchar("challenge", { length: 128 }).notNull(),
  type: varchar("type", { length: 20 }).$type<"registration" | "authentication">().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: createdAt(),
});

// ---------- Tabyan AI — جلسات التسميع (Phase 1A — بدون AI) ----------
// سجل كل جلسة تسميع يقوم بها المستخدم (عام أو تعليمي مرتبط بالمقرر)
// accuracyScore و ai_feedback محجوزان للمرحلة 1B عند ربط نموذج STT
export const recitationSessions = pgTable("recitation_sessions", {
  id: id(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  // للتسميع التعليمي: يُملأ دائماً بـ userId إذا كان الطالب هو المستخدم نفسه
  studentId: varchar("student_id", { length: 36 }).references(() => students.userId, { onDelete: "set null" }),
  // 'general' = تسميع شخصي بدون معلم | 'educational' = مرتبط بمسار الطالب (يراه المعلم)
  mode: varchar("mode", { length: 20 }).$type<"general" | "educational">().notNull().default("general"),
  surahId: integer("surah_id"),          // 1-114
  startAyah: integer("start_ayah"),      // رقم أول آية
  endAyah: integer("end_ayah"),          // رقم آخر آية (شامل)
  surahName: varchar("surah_name", { length: 100 }), // مُخزَّن للعرض السريع
  // GENERAL يحفظ موضع البداية فقط؛ ليس نطاقاً متوقعاً ولا يفرض نقطة نهاية.
  startPage: integer("start_page"),
  startVerseKey: varchar("start_verse_key", { length: 16 }),
  startWordPosition: integer("start_word_position"),
  // EDUCATIONAL فقط: نطاق صريح ومتحقق منه خادمياً. الجلسات القديمة تستعمل الأعمدة أعلاه.
  expectedRange: jsonb("expected_range").$type<{
    start: { surahId: number; ayah: number; wordPosition?: number };
    end: { surahId: number; ayah: number; wordPosition?: number };
  }>(),
  policyVersion: integer("policy_version"),
  hideMode: varchar("hide_mode", { length: 30 })
    .$type<"full_hide" | "first_word" | "progressive_reveal" | "visible_review">()
    .notNull().default("full_hide"),
  status: varchar("status", { length: 20 })
    .$type<"listening" | "paused" | "completed" | "failed" | "cancelled">()
    .notNull().default("listening"),
  startedAt: timestamp("started_at").notNull(),
  pausedSeconds: integer("paused_seconds").notNull().default(0), // مجموع فترات الإيقاف بالثواني
  lastPausedAt: timestamp("last_paused_at"),                     // لحساب مدة الإيقاف الحالية عند الاستئناف
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),  // صافي وقت التسميع النشط (بالثواني)
  // accuracyScore varchar(10) — محجوز للمرحلة 1B (NULL دائماً في 1A)
  createdAt: createdAt(),
});
