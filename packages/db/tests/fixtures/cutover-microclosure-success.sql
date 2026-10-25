\set ON_ERROR_STOP on

BEGIN;
ALTER TABLE sessions
  DROP CONSTRAINT sessions_student_id_students_user_id_fk;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_student_id_students_user_id_fk
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE SET NULL;
COMMIT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'sessions'::regclass
      AND conname = 'sessions_student_id_students_user_id_fk'
      AND confdeltype = 'n'
  ) THEN
    RAISE EXCEPTION 'Successful migration did not install ON DELETE SET NULL';
  END IF;

  IF (SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sessions'
        AND column_name = 'student_id') <> 'YES' THEN
    RAISE EXCEPTION 'Successful migration changed student_id nullability';
  END IF;

  IF (SELECT count(*) FROM students) <> (SELECT count(*) FROM cutover_before_students)
     OR (SELECT count(*) FROM sessions) <> (SELECT count(*) FROM cutover_before_sessions) THEN
    RAISE EXCEPTION 'Successful migration changed row counts';
  END IF;

  IF EXISTS (
    SELECT user_id FROM cutover_before_students
    EXCEPT
    SELECT user_id FROM students
  ) OR EXISTS (
    SELECT user_id FROM students
    EXCEPT
    SELECT user_id FROM cutover_before_students
  ) THEN
    RAISE EXCEPTION 'Successful migration changed student keys';
  END IF;

  IF EXISTS (
    SELECT id, student_id, title FROM cutover_before_sessions
    EXCEPT
    SELECT id, student_id, title FROM sessions
  ) OR EXISTS (
    SELECT id, student_id, title FROM sessions
    EXCEPT
    SELECT id, student_id, title FROM cutover_before_sessions
  ) THEN
    RAISE EXCEPTION 'Successful migration changed session values';
  END IF;

  IF EXISTS (
    SELECT tablename, indexname, indexdef FROM cutover_before_indexes
    EXCEPT
    SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('students', 'sessions')
  ) OR EXISTS (
    SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('students', 'sessions')
    EXCEPT
    SELECT tablename, indexname, indexdef FROM cutover_before_indexes
  ) THEN
    RAISE EXCEPTION 'Successful migration changed an unrelated index';
  END IF;
END $$;

-- The student row is removed directly in this disposable fixture. SET NULL
-- must preserve the session and all unrelated session data.
DELETE FROM students WHERE user_id = 'student-delete';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM students WHERE user_id = 'student-delete') THEN
    RAISE EXCEPTION 'Disposable student row was not deleted';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sessions
    WHERE id = 'session-delete' AND student_id IS NULL
      AND title = 'student will be deleted'
  ) THEN
    RAISE EXCEPTION 'The session was not preserved with student_id set to NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sessions
    WHERE id = 'session-keep' AND student_id = 'student-a'
      AND title = 'keep linked'
  ) THEN
    RAISE EXCEPTION 'An unrelated linked session changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sessions
    WHERE id = 'session-null' AND student_id IS NULL
      AND title = 'already unassigned'
  ) THEN
    RAISE EXCEPTION 'An unrelated null-linked session changed';
  END IF;
  IF (SELECT count(*) FROM sessions) <> 3 THEN
    RAISE EXCEPTION 'A session was deleted by the SET NULL behavior';
  END IF;
END $$;
