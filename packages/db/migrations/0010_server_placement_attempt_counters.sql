ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "placement_quran_attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "placement_correction_attempts" integer DEFAULT 0 NOT NULL;