CREATE TABLE IF NOT EXISTS "placement_attempts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "student_id" varchar(36) NOT NULL REFERENCES "students"("user_id") ON DELETE CASCADE,
  "path_type" varchar(30) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'recorded',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "submitted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_placement_attempts_student_path"
  ON "placement_attempts" ("student_id", "path_type", "created_at");
CREATE INDEX IF NOT EXISTS "idx_placement_attempts_student_status"
  ON "placement_attempts" ("student_id", "status");
