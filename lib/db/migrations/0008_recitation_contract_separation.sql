-- Task 100: General starts are free-form; Educational ranges remain explicit.
-- Existing range columns are deliberately retained for legacy sessions.
ALTER TABLE recitation_sessions
  ADD COLUMN IF NOT EXISTS start_page integer,
  ADD COLUMN IF NOT EXISTS start_verse_key varchar(16),
  ADD COLUMN IF NOT EXISTS start_word_position integer,
  ADD COLUMN IF NOT EXISTS expected_range jsonb,
  ADD COLUMN IF NOT EXISTS policy_version integer;