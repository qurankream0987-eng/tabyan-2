-- Phase 1A: Tabyan AI — جلسات التسميع
-- accuracyScore محجوز للمرحلة 1B (NULL دائماً في هذه المرحلة)

CREATE TABLE IF NOT EXISTS recitation_sessions (
  id              varchar(36)  PRIMARY KEY,
  user_id         varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id      varchar(36)  REFERENCES students(user_id) ON DELETE SET NULL,
  mode            varchar(20)  NOT NULL DEFAULT 'general',
  surah_id        integer,
  start_ayah      integer,
  end_ayah        integer,
  surah_name      varchar(100),
  hide_mode       varchar(30)  NOT NULL DEFAULT 'full_hide',
  status          varchar(20)  NOT NULL DEFAULT 'listening',
  started_at      timestamp    NOT NULL,
  paused_seconds  integer      NOT NULL DEFAULT 0,
  last_paused_at  timestamp,
  ended_at        timestamp,
  duration_seconds integer,
  created_at      timestamp    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_sessions_user    ON recitation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_sessions_student ON recitation_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_rec_sessions_created ON recitation_sessions(created_at);
