-- Live-session recordings: only finalized private objects may be shown.
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS ready_at timestamp;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS expires_at timestamp;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS retention_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS retention_last_error text;

CREATE INDEX IF NOT EXISTS idx_recordings_expiry ON recordings(expires_at);

-- The historical endSession path created a URL without uploading a file.
-- Keep the audit trail but never expose those rows as playable recordings.
UPDATE recordings
SET status = 'legacy_invalid'
WHERE video_url LIKE '/recordings/%'
  AND status IN ('ready', 'uploading', 'error');

-- At most one current ready recording can be attached to a session.
CREATE UNIQUE INDEX IF NOT EXISTS uq_recordings_ready_session
ON recordings(session_id)
WHERE is_deleted = false AND status = 'ready';