CREATE TABLE "account_deletion_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"requested_by_user_id" varchar(36),
	"requested_by_role" varchar(16),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "admin_login_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"phone" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"status" varchar(10) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_notifications_sent" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"admin_id" varchar(36),
	"title" varchar(200) NOT NULL,
	"body" text,
	"audience_type" varchar(20) NOT NULL,
	"audience_target" varchar(36),
	"notification_type" varchar(50) DEFAULT 'general' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_pattern" varchar(50),
	"scheduled_at" timestamp,
	"sent_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(20) DEFAULT 'sent' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"jwt_token" text NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"assessment_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"answers" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"assessment_id" varchar(36),
	"type" varchar(20) NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb,
	"correct_answer" text,
	"topic" varchar(100),
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_bank_question" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"level_id" integer,
	"pass_percentage" integer DEFAULT 70 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"duration_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"admin_id" varchar(36),
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar(36),
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token" varchar(128) NOT NULL,
	"role" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "book_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"source" varchar(30) DEFAULT 'placement_choice' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"author" varchar(150),
	"category" varchar(20) NOT NULL,
	"section" varchar(20) DEFAULT 'general' NOT NULL,
	"content_type" varchar(10) NOT NULL,
	"source_type" varchar(20) DEFAULT 'external' NOT NULL,
	"file_object_key" varchar(500),
	"file_url" varchar(500),
	"external_url" varchar(500),
	"text_content" text,
	"cover_url" varchar(500),
	"description" text,
	"audio_url" varchar(500),
	"level_ids" jsonb,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_verses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"verse_date" date NOT NULL,
	"text" text NOT NULL,
	"surah_name" varchar(60) NOT NULL,
	"surah_number" integer NOT NULL,
	"ayah_number" integer NOT NULL,
	"source" varchar(10) DEFAULT 'auto' NOT NULL,
	"set_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_verses_verse_date_unique" UNIQUE("verse_date")
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_otp_codes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(150) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"teacher_id" varchar(36),
	"student_id" varchar(36) NOT NULL,
	"hifz_score" integer DEFAULT 0 NOT NULL,
	"revision_score" integer DEFAULT 0 NOT NULL,
	"tajweed_score" integer DEFAULT 0 NOT NULL,
	"commitment_score" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"notes" varchar(500),
	"audio_notes_url" varchar(500),
	"recommendation" varchar(20),
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fatwa_answers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"question_id" varchar(36) NOT NULL,
	"mufti_id" varchar(36),
	"answer_text" text NOT NULL,
	"reference_text" varchar(500),
	"audio_url" varchar(500),
	"audio_duration_seconds" integer,
	"status" varchar(30) DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" varchar(36),
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fatwa_questions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"question_text" text NOT NULL,
	"category" varchar(20) NOT NULL,
	"image_url" varchar(500),
	"audio_url" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"mufti_id" varchar(36),
	"assigned_by" varchar(36),
	"assigned_at" timestamp,
	"priority" varchar(10) DEFAULT 'normal' NOT NULL,
	"followup_of_id" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fatwa_ratings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"answer_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"star_rating" integer NOT NULL,
	"is_helpful" boolean,
	"feedback_text" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fatwa_views" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"answer_id" varchar(36) NOT NULL,
	"viewer_id" varchar(36),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "levels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"path" varchar(30) NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"sessions_count" integer DEFAULT 0 NOT NULL,
	"required_juz" integer DEFAULT 0 NOT NULL,
	"required_sessions" integer DEFAULT 0 NOT NULL,
	"min_grade" varchar(50),
	"requires_ijazah" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"aqeedah_level_id" integer
);
--> statement-breakpoint
CREATE TABLE "mufti_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"category" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_pending_fatwas" integer DEFAULT 20 NOT NULL,
	"assigned_by" varchar(36),
	"assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"session_reminders" boolean DEFAULT true NOT NULL,
	"session_changes" boolean DEFAULT true NOT NULL,
	"evaluations" boolean DEFAULT true NOT NULL,
	"achievements" boolean DEFAULT true NOT NULL,
	"announcements" boolean DEFAULT true NOT NULL,
	"ayah_of_day" boolean DEFAULT true NOT NULL,
	"payments" boolean DEFAULT true NOT NULL,
	"reminder_before_minutes" integer DEFAULT 30 NOT NULL,
	"ayah_delivery_time" varchar(5) DEFAULT '06:00' NOT NULL,
	"dnd_during_prayer" boolean DEFAULT false NOT NULL,
	"dnd_during_session" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"vibration_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"type" varchar(30) DEFAULT 'general' NOT NULL,
	"priority" varchar(10) DEFAULT 'normal' NOT NULL,
	"primary_action_url" varchar(500),
	"primary_action_label" varchar(100),
	"secondary_action_url" varchar(500),
	"secondary_action_label" varchar(100),
	"is_read" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"expires_at" timestamp,
	"payload" jsonb,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "placement_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"path_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'recorded' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "private_media_deletion_jobs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"request_id" varchar(36),
	"owner_user_id" varchar(36),
	"object_path" varchar(500) NOT NULL,
	"deletion_reason" varchar(30) DEFAULT 'automatic_retention' NOT NULL,
	"media_type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"not_before" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"last_error_code" varchar(80),
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "promotion_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"from_level_id" integer,
	"to_level_id" integer,
	"video_url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"admin_reviewer_id" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "qiraat_certificates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"certificate_url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_reviewer_id" varchar(36),
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "recitation_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"student_id" varchar(36),
	"mode" varchar(20) DEFAULT 'general' NOT NULL,
	"surah_id" integer,
	"start_ayah" integer,
	"end_ayah" integer,
	"surah_name" varchar(100),
	"start_page" integer,
	"start_verse_key" varchar(16),
	"start_word_position" integer,
	"expected_range" jsonb,
	"policy_version" integer,
	"hide_mode" varchar(30) DEFAULT 'full_hide' NOT NULL,
	"status" varchar(20) DEFAULT 'listening' NOT NULL,
	"started_at" timestamp NOT NULL,
	"paused_seconds" integer DEFAULT 0 NOT NULL,
	"last_paused_at" timestamp,
	"ended_at" timestamp,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"teacher_id" varchar(36),
	"student_id" varchar(36),
	"video_url" varchar(500) NOT NULL,
	"duration_seconds" integer NOT NULL,
	"file_size_mb" numeric(10, 2),
	"quality" varchar(10) DEFAULT '720p' NOT NULL,
	"status" varchar(20) DEFAULT 'uploading' NOT NULL,
	"ready_at" timestamp,
	"expires_at" timestamp,
	"retention_attempts" integer DEFAULT 0 NOT NULL,
	"retention_last_error" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" varchar(36),
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_change_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"requested_new_time" timestamp,
	"reason" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"phone" varchar(20),
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"student_id" varchar(36),
	"schedule_id" varchar(36),
	"title" varchar(200),
	"session_type" varchar(30) NOT NULL,
	"type" varchar(20) DEFAULT 'individual' NOT NULL,
	"level_id" integer,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"topic" varchar(200),
	"notes" text,
	"meeting_url" varchar(500),
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sharia_content" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"author" varchar(150),
	"description" text,
	"content_type" varchar(10) NOT NULL,
	"file_url" varchar(500),
	"external_url" varchar(500),
	"text_body" text,
	"duration_minutes" integer,
	"page_count" integer,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sharia_content_progress" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"content_id" varchar(36) NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"last_position" varchar(50),
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"bookmarked" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sharia_exam_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"level_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"answers" jsonb,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sharia_exam_questions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(20) DEFAULT 'mcq' NOT NULL,
	"options" jsonb,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sharia_subjects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(40),
	"color" varchar(9),
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sharia_subjects_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "student_password_login_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" varchar(150) NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"failure_timestamps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_progress" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"level_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"completed_juz" integer DEFAULT 0 NOT NULL,
	"completed_sessions" integer DEFAULT 0 NOT NULL,
	"average_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"session_reminder_minutes" integer DEFAULT 15 NOT NULL,
	"ayah_notification" boolean DEFAULT true NOT NULL,
	"hadith_notification" boolean DEFAULT true NOT NULL,
	"ibn_qayyim_notification" boolean DEFAULT true NOT NULL,
	"activity_notification" boolean DEFAULT false NOT NULL,
	"audio_quality" varchar(20) DEFAULT 'high' NOT NULL,
	"video_quality" varchar(20) DEFAULT '720p' NOT NULL,
	"language" varchar(10) DEFAULT 'ar' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_settings_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"user_id" varchar(36) PRIMARY KEY NOT NULL,
	"current_level_id" integer,
	"total_juz" integer DEFAULT 0 NOT NULL,
	"placement_test_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"placement_test_video_url" varchar(500),
	"placement_path_type" varchar(30),
	"wants_tuhfa" boolean,
	"placement_quran_attempts" integer DEFAULT 0 NOT NULL,
	"placement_correction_attempts" integer DEFAULT 0 NOT NULL,
	"placement_test_result_level_id" integer,
	"placement_review_notes" text,
	"school_stage" varchar(20),
	"school_grade" varchar(20),
	"birth_date" date,
	"parent_phone" varchar(20),
	"gps_lat" varchar(30),
	"gps_lng" varchar(30),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" varchar(36),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "teacher_broadcasts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"audience" varchar(10) DEFAULT 'all' NOT NULL,
	"schedule_id" varchar(36),
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_certificates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"title" varchar(200),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"message_text" varchar(1000) NOT NULL,
	"audio_url" varchar(500),
	"file_url" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"video_quality" varchar(10) DEFAULT '720p' NOT NULL,
	"audio_quality" varchar(10) DEFAULT 'high' NOT NULL,
	"auto_record" boolean DEFAULT false NOT NULL,
	"reminder_minutes" integer DEFAULT 15 NOT NULL,
	"default_camera_on" boolean DEFAULT true NOT NULL,
	"default_mic_on" boolean DEFAULT true NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"vibration_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teacher_settings_teacher_id_unique" UNIQUE("teacher_id")
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"user_id" varchar(36) PRIMARY KEY NOT NULL,
	"bio" varchar(500),
	"specialization" varchar(100),
	"kyc_status" varchar(20) DEFAULT 'awaiting_assessment' NOT NULL,
	"kyc_video_url" varchar(500),
	"kyc_answers" jsonb,
	"kyc_review_notes" text,
	"is_mufti" boolean DEFAULT false NOT NULL,
	"is_volunteer" boolean DEFAULT false NOT NULL,
	"assigned_path" varchar(30),
	"assigned_level_id" integer,
	"avg_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_storage_objects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"owner_user_id" varchar(36),
	"object_path" varchar(500) NOT NULL,
	"purpose" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(150),
	"email_verified" boolean DEFAULT false NOT NULL,
	"google_id" varchar(255),
	"replit_auth_sub" varchar(255),
	"clerk_user_id" varchar(255),
	"password_hash" varchar(100),
	"username" varchar(30),
	"created_by" varchar(36),
	"account_origin" varchar(30),
	"role" varchar(20) DEFAULT 'student' NOT NULL,
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"ban_reason" text,
	"banned_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_replit_auth_sub_unique" UNIQUE("replit_auth_sub"),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"challenge" varchar(128) NOT NULL,
	"type" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "webauthn_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_schedules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"session_type" varchar(30) NOT NULL,
	"level_id" integer,
	"session_mode" varchar(20) NOT NULL,
	"max_students" integer DEFAULT 1 NOT NULL,
	"available_days" jsonb NOT NULL,
	"available_times" jsonb NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"location" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_accepting_bookings" boolean DEFAULT true NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_login_attempts" ADD CONSTRAINT "admin_login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications_sent" ADD CONSTRAINT "admin_notifications_sent_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_assignments" ADD CONSTRAINT "book_assignments_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_assignments" ADD CONSTRAINT "book_assignments_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_verses" ADD CONSTRAINT "daily_verses_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_answers" ADD CONSTRAINT "fatwa_answers_question_id_fatwa_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."fatwa_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_answers" ADD CONSTRAINT "fatwa_answers_mufti_id_teachers_user_id_fk" FOREIGN KEY ("mufti_id") REFERENCES "public"."teachers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_answers" ADD CONSTRAINT "fatwa_answers_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_questions" ADD CONSTRAINT "fatwa_questions_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_questions" ADD CONSTRAINT "fatwa_questions_mufti_id_teachers_user_id_fk" FOREIGN KEY ("mufti_id") REFERENCES "public"."teachers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_questions" ADD CONSTRAINT "fatwa_questions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_ratings" ADD CONSTRAINT "fatwa_ratings_answer_id_fatwa_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."fatwa_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_ratings" ADD CONSTRAINT "fatwa_ratings_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_views" ADD CONSTRAINT "fatwa_views_answer_id_fatwa_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."fatwa_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatwa_views" ADD CONSTRAINT "fatwa_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mufti_assignments" ADD CONSTRAINT "mufti_assignments_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mufti_assignments" ADD CONSTRAINT "mufti_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_media_deletion_jobs" ADD CONSTRAINT "private_media_deletion_jobs_request_id_account_deletion_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."account_deletion_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_requests" ADD CONSTRAINT "promotion_requests_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_requests" ADD CONSTRAINT "promotion_requests_from_level_id_levels_id_fk" FOREIGN KEY ("from_level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_requests" ADD CONSTRAINT "promotion_requests_to_level_id_levels_id_fk" FOREIGN KEY ("to_level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_requests" ADD CONSTRAINT "promotion_requests_admin_reviewer_id_users_id_fk" FOREIGN KEY ("admin_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qiraat_certificates" ADD CONSTRAINT "qiraat_certificates_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qiraat_certificates" ADD CONSTRAINT "qiraat_certificates_admin_reviewer_id_users_id_fk" FOREIGN KEY ("admin_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation_sessions" ADD CONSTRAINT "recitation_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation_sessions" ADD CONSTRAINT "recitation_sessions_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_schedule_id_weekly_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_content" ADD CONSTRAINT "sharia_content_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_content" ADD CONSTRAINT "sharia_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_content_progress" ADD CONSTRAINT "sharia_content_progress_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_content_progress" ADD CONSTRAINT "sharia_content_progress_content_id_sharia_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."sharia_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_exam_attempts" ADD CONSTRAINT "sharia_exam_attempts_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_exam_attempts" ADD CONSTRAINT "sharia_exam_attempts_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sharia_exam_questions" ADD CONSTRAINT "sharia_exam_questions_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_settings" ADD CONSTRAINT "student_settings_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_broadcasts" ADD CONSTRAINT "teacher_broadcasts_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_broadcasts" ADD CONSTRAINT "teacher_broadcasts_schedule_id_weekly_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_certificates" ADD CONSTRAINT "teacher_certificates_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_settings" ADD CONSTRAINT "teacher_settings_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_assigned_level_id_levels_id_fk" FOREIGN KEY ("assigned_level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_deletion_status" ON "account_deletion_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_book_assignment" ON "book_assignments" USING btree ("student_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookmark" ON "bookmarks" USING btree ("student_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_download" ON "downloads" USING btree ("student_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fatwa_rating" ON "fatwa_ratings" USING btree ("answer_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_mufti_category" ON "mufti_assignments" USING btree ("teacher_id","category");--> statement-breakpoint
CREATE INDEX "idx_notif_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_placement_attempts_student_path" ON "placement_attempts" USING btree ("student_id","path_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_placement_attempts_student_status" ON "placement_attempts" USING btree ("student_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_private_media_deletion_path" ON "private_media_deletion_jobs" USING btree ("object_path");--> statement-breakpoint
CREATE INDEX "idx_private_media_deletion_due" ON "private_media_deletion_jobs" USING btree ("status","not_before");--> statement-breakpoint
CREATE INDEX "idx_recordings_expiry" ON "recordings" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_participant" ON "session_participants" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_teacher" ON "sessions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_student" ON "sessions" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sharia_progress" ON "sharia_content_progress" USING btree ("student_id","content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sharia_exam_attempt" ON "sharia_exam_attempts" USING btree ("student_id","level_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "student_password_login_attempts_identifier_unique" ON "student_password_login_attempts" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_level" ON "student_progress" USING btree ("student_id","level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_storage_object_path" ON "user_storage_objects" USING btree ("object_path");--> statement-breakpoint
CREATE INDEX "idx_user_storage_owner" ON "user_storage_objects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_user_storage_retention" ON "user_storage_objects" USING btree ("purpose","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");