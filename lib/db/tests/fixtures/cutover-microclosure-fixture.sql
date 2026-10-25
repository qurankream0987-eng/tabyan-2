\set ON_ERROR_STOP on

-- Synthetic fixture only. These are source-shaped rows, not production data.
CREATE TABLE users (
  id text PRIMARY KEY,
  avatar_url text
);

CREATE TABLE students (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  placement_test_video_url text
);

CREATE TABLE teachers (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kyc_video_url text
);

CREATE TABLE teacher_certificates (
  id text PRIMARY KEY,
  teacher_id text NOT NULL REFERENCES teachers(user_id) ON DELETE CASCADE,
  file_path text
);

CREATE TABLE promotion_requests (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
  video_url text
);

CREATE TABLE qiraat_certificates (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
  certificate_url text
);

CREATE TABLE sessions (
  id text PRIMARY KEY,
  student_id text,
  title text NOT NULL,
  CONSTRAINT sessions_student_id_students_user_id_fk
    FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

CREATE TABLE recordings (id text PRIMARY KEY, video_url text);
CREATE TABLE books (id text PRIMARY KEY, file_object_key text);
CREATE TABLE sharia_content (id text PRIMARY KEY, file_url text);
CREATE TABLE teacher_messages (
  id text PRIMARY KEY,
  audio_url text,
  file_url text
);
CREATE TABLE evaluations (id text PRIMARY KEY, audio_notes_url text);
CREATE TABLE fatwa_questions (
  id text PRIMARY KEY,
  image_url text,
  audio_url text
);
CREATE TABLE fatwa_answers (id text PRIMARY KEY, audio_url text);
CREATE TABLE notifications (id text PRIMARY KEY, attachments jsonb);

-- In production this is Object Storage metadata checked by exact key, not a
-- bucket listing. Here it is a local fixture table for deterministic tests.
CREATE TABLE fixture_object_presence (object_path text PRIMARY KEY);
CREATE TABLE fixture_orphaned_references (
  owner_user_id text NOT NULL,
  object_path text NOT NULL,
  purpose text NOT NULL
);

CREATE TABLE user_storage_objects (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL,
  object_path text NOT NULL UNIQUE,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
);

CREATE TABLE fixture_backfill_audit (
  path_hash text PRIMARY KEY,
  source_refs text NOT NULL,
  owner_user_id text NOT NULL,
  purpose text NOT NULL,
  decision text NOT NULL
);

INSERT INTO users (id, avatar_url) VALUES
  ('student-a', '/objects/legacy/avatar-a'),
  ('student-b', '/objects/legacy/ambiguous-avatar'),
  ('student-c', '/objects/legacy/ambiguous-avatar'),
  ('student-missing', '/objects/legacy/missing-object'),
  ('student-delete', NULL),
  ('teacher-a', NULL),
  ('admin-a', NULL);

INSERT INTO students (user_id, placement_test_video_url) VALUES
  ('student-a', '/objects/legacy/placement-a'),
  ('student-b', NULL),
  ('student-c', NULL),
  ('student-missing', NULL),
  ('student-delete', NULL);

INSERT INTO teachers (user_id, kyc_video_url) VALUES
  ('teacher-a', '/objects/legacy/kyc-a');

-- Repeated references by the same owner/purpose must become one ledger row.
INSERT INTO teacher_certificates (id, teacher_id, file_path) VALUES
  ('cert-1', 'teacher-a', '/objects/legacy/teacher-cert-a'),
  ('cert-2', 'teacher-a', '/objects/legacy/teacher-cert-a');

INSERT INTO promotion_requests (id, student_id, video_url) VALUES
  ('promotion-1', 'student-a', '/objects/legacy/promotion-a');
INSERT INTO qiraat_certificates (id, student_id, certificate_url) VALUES
  ('qiraat-1', 'student-a', '/objects/legacy/qiraat-a');

INSERT INTO sessions (id, student_id, title) VALUES
  ('session-keep', 'student-a', 'keep linked'),
  ('session-delete', 'student-delete', 'student will be deleted'),
  ('session-null', NULL, 'already unassigned');

-- Each of these paths is shared, lacks a proven single owner, or is only a
-- notification copy. None is eligible for an ownership-ledger backfill.
INSERT INTO recordings VALUES ('recording-1', '/objects/legacy/shared-recording');
INSERT INTO books VALUES ('book-1', '/objects/legacy/shared-book');
INSERT INTO sharia_content VALUES ('sharia-1', '/objects/legacy/shared-sharia');
INSERT INTO teacher_messages VALUES
  ('message-1', '/objects/legacy/shared-message', '/objects/legacy/shared-message-file');
INSERT INTO evaluations VALUES ('evaluation-1', '/objects/legacy/shared-evaluation');
INSERT INTO fatwa_questions VALUES
  ('question-1', '/objects/legacy/shared-fatwa-question', '/objects/legacy/shared-fatwa-question-audio');
INSERT INTO fatwa_answers VALUES ('answer-1', '/objects/legacy/shared-fatwa-answer');
INSERT INTO notifications VALUES
  ('notification-1', '[{"url":"/objects/legacy/shared-message"},{"url":"/objects/legacy/notification-only"}]');

-- This synthetic orphan represents an owner reference whose user row is gone.
-- Its path exists, but it must not be assigned to a nonexistent user.
INSERT INTO fixture_orphaned_references VALUES
  ('deleted-user', '/objects/legacy/deleted-owner', 'user_upload');

INSERT INTO fixture_object_presence (object_path) VALUES
  ('/objects/legacy/avatar-a'),
  ('/objects/legacy/ambiguous-avatar'),
  ('/objects/legacy/placement-a'),
  ('/objects/legacy/teacher-cert-a'),
  ('/objects/legacy/promotion-a'),
  ('/objects/legacy/qiraat-a'),
  ('/objects/legacy/kyc-a'),
  ('/objects/legacy/shared-recording'),
  ('/objects/legacy/shared-book'),
  ('/objects/legacy/shared-sharia'),
  ('/objects/legacy/shared-message'),
  ('/objects/legacy/shared-message-file'),
  ('/objects/legacy/shared-evaluation'),
  ('/objects/legacy/shared-fatwa-question'),
  ('/objects/legacy/shared-fatwa-question-audio'),
  ('/objects/legacy/shared-fatwa-answer'),
  ('/objects/legacy/notification-only'),
  ('/objects/legacy/deleted-owner'),
  ('/objects/legacy/unknown-object');
-- /objects/legacy/missing-object is deliberately absent from the exact-key
-- presence fixture. /objects/legacy/unknown-object has no database reference.

-- Existing exact owner/purpose evidence is preserved and not duplicated.
INSERT INTO user_storage_objects (id, owner_user_id, object_path, purpose, status)
VALUES ('existing-avatar-a', 'student-a', '/objects/legacy/avatar-a', 'user_upload', 'reserved');

CREATE VIEW fixture_shared_paths AS
  SELECT video_url AS object_path FROM recordings
  UNION SELECT file_object_key FROM books
  UNION SELECT file_url FROM sharia_content
  UNION SELECT audio_url FROM teacher_messages
  UNION SELECT file_url FROM teacher_messages
  UNION SELECT audio_notes_url FROM evaluations
  UNION SELECT image_url FROM fatwa_questions
  UNION SELECT audio_url FROM fatwa_questions
  UNION SELECT audio_url FROM fatwa_answers
  UNION
    SELECT attachment ->> 'url'
    FROM notifications n
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(n.attachments, '[]'::jsonb))
      AS notification_attachment(attachment);

CREATE VIEW fixture_legacy_owner_candidates AS
WITH source_refs AS (
  SELECT id AS owner_user_id, avatar_url AS object_path, 'user_upload' AS purpose,
         'users.avatar_url' AS source_ref
  FROM users
  WHERE avatar_url IS NOT NULL
  UNION ALL
  SELECT user_id, placement_test_video_url, 'student_placement_video',
         'students.placement_test_video_url'
  FROM students
  WHERE placement_test_video_url IS NOT NULL
  UNION ALL
  SELECT student_id, video_url, 'student_placement_video',
         'promotion_requests.video_url'
  FROM promotion_requests
  WHERE video_url IS NOT NULL
  UNION ALL
  SELECT student_id, certificate_url, 'qiraat_certificate',
         'qiraat_certificates.certificate_url'
  FROM qiraat_certificates
  WHERE certificate_url IS NOT NULL
  UNION ALL
  SELECT user_id, kyc_video_url, 'teacher_kyc_video',
         'teachers.kyc_video_url'
  FROM teachers
  WHERE kyc_video_url IS NOT NULL
  UNION ALL
  SELECT teacher_id, file_path, 'user_upload',
         'teacher_certificates.file_path'
  FROM teacher_certificates
  WHERE file_path IS NOT NULL
  UNION ALL
  SELECT owner_user_id, object_path, purpose,
         'fixture_only.orphaned_reference'
  FROM fixture_orphaned_references
),
canonical_refs AS (
  SELECT *
  FROM source_refs
  WHERE object_path LIKE '/objects/%'
    AND position('..' IN object_path) = 0
    AND position(chr(92) IN object_path) = 0
),
grouped_refs AS (
  SELECT
    object_path,
    min(owner_user_id) AS owner_user_id,
    min(purpose) AS purpose,
    count(DISTINCT owner_user_id) AS owner_count,
    count(DISTINCT purpose) AS purpose_count,
    string_agg(DISTINCT source_ref, ',' ORDER BY source_ref) AS source_refs
  FROM canonical_refs
  GROUP BY object_path
)
SELECT
  g.object_path,
  g.owner_user_id,
  g.purpose,
  g.source_refs
FROM grouped_refs g
JOIN users u ON u.id = g.owner_user_id
JOIN fixture_object_presence p ON p.object_path = g.object_path
WHERE g.owner_count = 1
  AND g.purpose_count = 1
  AND NOT EXISTS (
    SELECT 1 FROM fixture_shared_paths s WHERE s.object_path = g.object_path
  );

CREATE FUNCTION run_fixture_backfill() RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  conflicting_rows integer;
  inserted_rows integer;
BEGIN
  SELECT count(*) INTO conflicting_rows
  FROM fixture_legacy_owner_candidates c
  JOIN user_storage_objects existing USING (object_path)
  WHERE existing.owner_user_id IS DISTINCT FROM c.owner_user_id
     OR existing.purpose IS DISTINCT FROM c.purpose;

  IF conflicting_rows > 0 THEN
    RAISE EXCEPTION 'Conflicting pre-existing ledger evidence; stop without overwriting';
  END IF;

  INSERT INTO user_storage_objects (id, owner_user_id, object_path, purpose, status)
  SELECT md5(c.object_path), c.owner_user_id, c.object_path, c.purpose, 'reserved'
  FROM fixture_legacy_owner_candidates c
  ON CONFLICT (object_path) DO NOTHING;
  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  INSERT INTO fixture_backfill_audit
    (path_hash, source_refs, owner_user_id, purpose, decision)
  SELECT md5(c.object_path), c.source_refs, c.owner_user_id, c.purpose, 'verified_candidate'
  FROM fixture_legacy_owner_candidates c
  ON CONFLICT (path_hash) DO NOTHING;

  RETURN inserted_rows;
END;
$$;

-- Check deterministic ownership, source-duplicate collapse, idempotency, and
-- exclusion of ambiguity, sharing, unknown references, missing objects, and
-- deleted owners. This function only inserts ledger rows; it never deletes.
DO $$
DECLARE
  inserted_rows integer;
  rerun_inserted_rows integer;
  total_rows integer;
BEGIN
  inserted_rows := run_fixture_backfill();
  rerun_inserted_rows := run_fixture_backfill();

  IF inserted_rows <> 5 OR rerun_inserted_rows <> 0 THEN
    RAISE EXCEPTION 'Backfill was not duplicate-safe/idempotent: first %, rerun %',
      inserted_rows, rerun_inserted_rows;
  END IF;

  SELECT count(*) INTO total_rows FROM user_storage_objects;
  IF total_rows <> 6 THEN
    RAISE EXCEPTION 'Expected six unique ledger paths, found %', total_rows;
  END IF;

  IF (SELECT count(*) FROM user_storage_objects
      WHERE object_path = '/objects/legacy/teacher-cert-a') <> 1 THEN
    RAISE EXCEPTION 'Repeated source references created duplicate ledger rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_storage_objects
    WHERE object_path = '/objects/legacy/placement-a'
      AND owner_user_id = 'student-a'
      AND purpose = 'student_placement_video'
  ) OR NOT EXISTS (
    SELECT 1 FROM user_storage_objects
    WHERE object_path = '/objects/legacy/teacher-cert-a'
      AND owner_user_id = 'teacher-a'
      AND purpose = 'user_upload'
  ) THEN
    RAISE EXCEPTION 'A deterministic reference received the wrong owner or purpose';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_storage_objects
    WHERE object_path IN (
      '/objects/legacy/ambiguous-avatar',
      '/objects/legacy/missing-object',
      '/objects/legacy/deleted-owner',
      '/objects/legacy/unknown-object',
      '/objects/legacy/shared-recording',
      '/objects/legacy/shared-book',
      '/objects/legacy/shared-sharia',
      '/objects/legacy/shared-message',
      '/objects/legacy/shared-message-file',
      '/objects/legacy/shared-evaluation',
      '/objects/legacy/shared-fatwa-question',
      '/objects/legacy/shared-fatwa-question-audio',
      '/objects/legacy/shared-fatwa-answer',
      '/objects/legacy/notification-only'
    )
  ) THEN
    RAISE EXCEPTION 'Ambiguous, shared, unknown, missing, or orphan media was assigned';
  END IF;

  IF (SELECT count(*) FROM fixture_backfill_audit) <> 6 THEN
    RAISE EXCEPTION 'Expected one audit decision per unique verified path';
  END IF;
END $$;

-- A path already registered to a different owner is a stop condition, not an
-- ON CONFLICT case to silently ignore or overwrite.
INSERT INTO users (id, avatar_url) VALUES
  ('student-conflict', '/objects/legacy/conflicting-ledger');
INSERT INTO fixture_object_presence (object_path) VALUES
  ('/objects/legacy/conflicting-ledger');
INSERT INTO user_storage_objects (id, owner_user_id, object_path, purpose, status)
VALUES (
  'conflicting-ledger-row',
  'teacher-a',
  '/objects/legacy/conflicting-ledger',
  'user_upload',
  'reserved'
);

DO $$
DECLARE
  conflict_stopped boolean := false;
BEGIN
  BEGIN
    PERFORM run_fixture_backfill();
  EXCEPTION WHEN raise_exception THEN
    conflict_stopped := true;
  END;

  IF NOT conflict_stopped THEN
    RAISE EXCEPTION 'Conflicting owner evidence did not stop the backfill';
  END IF;
  IF (SELECT owner_user_id FROM user_storage_objects
      WHERE object_path = '/objects/legacy/conflicting-ledger')
      IS DISTINCT FROM 'teacher-a' THEN
    RAISE EXCEPTION 'Backfill overwrote a conflicting owner';
  END IF;
END $$;

-- Snapshots for the sessions FK transaction test. They are created before any
-- migration or student-delete semantics are exercised.
CREATE TABLE cutover_before_students AS
SELECT user_id FROM students;
CREATE TABLE cutover_before_sessions AS
SELECT id, student_id, title FROM sessions;
CREATE TABLE cutover_before_indexes AS
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('students', 'sessions');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'sessions'::regclass
      AND conname = 'sessions_student_id_students_user_id_fk'
      AND confdeltype = 'c'
  ) THEN
    RAISE EXCEPTION 'Fixture does not start with the expected CASCADE FK';
  END IF;
  IF (SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sessions'
        AND column_name = 'student_id') <> 'YES' THEN
    RAISE EXCEPTION 'Fixture student_id must be nullable';
  END IF;
END $$;
