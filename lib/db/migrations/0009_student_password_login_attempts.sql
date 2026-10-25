CREATE TABLE IF NOT EXISTS "student_password_login_attempts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "identifier" varchar(150) NOT NULL,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "failure_timestamps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "blocked_until" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_password_login_attempts_identifier_unique"
  ON "student_password_login_attempts" ("identifier");