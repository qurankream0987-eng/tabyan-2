CREATE TABLE "recitation_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"teacher_id" varchar(36),
	"student_id" varchar(36) NOT NULL,
	"surah_id" integer NOT NULL,
	"start_ayah" integer NOT NULL,
	"end_ayah" integer NOT NULL,
	"hide_mode" varchar(30) DEFAULT 'progressive_reveal' NOT NULL,
	"note" varchar(500),
	"due_at" timestamp,
	"status" varchar(20) DEFAULT 'assigned' NOT NULL,
	"session_id" varchar(36),
	"result" jsonb,
	"submitted_at" timestamp,
	"teacher_score" integer,
	"teacher_feedback" varchar(1000),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "recitation_sessions" ADD COLUMN "assignment_id" varchar(36);--> statement-breakpoint
ALTER TABLE "recitation_assignments" ADD CONSTRAINT "recitation_assignments_teacher_id_teachers_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation_assignments" ADD CONSTRAINT "recitation_assignments_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation_assignments" ADD CONSTRAINT "recitation_assignments_session_id_recitation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."recitation_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recitation_assignments_student" ON "recitation_assignments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "idx_recitation_assignments_teacher" ON "recitation_assignments" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "idx_recitation_sessions_assignment" ON "recitation_sessions" USING btree ("assignment_id");