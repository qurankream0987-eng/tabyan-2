-- REVIEW ARTIFACT ONLY — DO NOT EXECUTE.
-- Scoped for the development database after confirming public.placement_attempts is absent.
-- This file is not wired into the project's post-merge schema flow.
-- The explicit FK name matches the current Drizzle schema.

BEGIN;

CREATE TABLE IF NOT EXISTS public.placement_attempts (
  id varchar(36) PRIMARY KEY NOT NULL,
  student_id varchar(36) NOT NULL,
  path_type varchar(30) NOT NULL,
  status varchar(20) DEFAULT 'recorded' NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  submitted_at timestamp without time zone,
  CONSTRAINT placement_attempts_student_id_students_user_id_fk
    FOREIGN KEY (student_id)
    REFERENCES public.students(user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_placement_attempts_student_path
  ON public.placement_attempts USING btree (student_id, path_type, created_at);

CREATE INDEX IF NOT EXISTS idx_placement_attempts_student_status
  ON public.placement_attempts USING btree (student_id, status);

COMMIT;
