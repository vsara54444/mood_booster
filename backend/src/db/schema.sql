-- =========================================================
--  ReLOL – PostgreSQL Schema (Supabase compatible)
--  Run once in Supabase SQL Editor:
--    Project → SQL Editor → paste this → Run
-- =========================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  user_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(256) NOT NULL UNIQUE,
  password_hash   VARCHAR(256) NOT NULL,
  display_name    VARCHAR(100),
  user_type       VARCHAR(30),
  reminder_time   TIME,
  notifications_on BOOLEAN     NOT NULL DEFAULT true,
  share_default   BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_deleted      BOOLEAN      NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ
);

-- ---------- Streaks ----------
CREATE TABLE IF NOT EXISTS streaks (
  user_id           UUID  PRIMARY KEY REFERENCES users(user_id),
  current_streak    INT   NOT NULL DEFAULT 0,
  longest_streak    INT   NOT NULL DEFAULT 0,
  last_checkin_date DATE
);

-- ---------- Daily Entries ----------
CREATE TABLE IF NOT EXISTS entries (
  entry_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(user_id),
  category              VARCHAR(30)  NOT NULL,
  raw_text              TEXT         NOT NULL,
  cleaned_text          TEXT         NOT NULL,
  mood                  SMALLINT     NOT NULL CHECK (mood BETWEEN 1 AND 5),
  humor_text            TEXT         NOT NULL,
  perspective_text      TEXT         NOT NULL,
  action_text           TEXT         NOT NULL,
  topic_tag             VARCHAR(50)  DEFAULT 'general',
  is_shared_anonymously BOOLEAN      NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, (created_at::DATE DESC));

-- ---------- Community Posts ----------
CREATE TABLE IF NOT EXISTS community_posts (
  post_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          UUID        NOT NULL REFERENCES entries(entry_id),
  category          VARCHAR(30) NOT NULL,
  anonymized_text   TEXT        NOT NULL,
  humor_text        TEXT        NOT NULL,
  perspective_text  TEXT        NOT NULL,
  funny_votes       INT         NOT NULL DEFAULT 0,
  smile_votes       INT         NOT NULL DEFAULT 0,
  not_funny_votes   INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- ---------- Votes ----------
CREATE TABLE IF NOT EXISTS votes (
  vote_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES community_posts(post_id),
  user_id    UUID        NOT NULL REFERENCES users(user_id),
  vote_type  VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vote_per_user_post UNIQUE (post_id, user_id)
);

-- ---------- Joke History (10,000-joke dedupe window) ----------
CREATE TABLE IF NOT EXISTS joke_history (
  joke_id           BIGSERIAL    PRIMARY KEY,
  joke_text         TEXT         NOT NULL,
  normalized_tokens TEXT         NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_joke_history_created ON joke_history(created_at DESC);

-- ---------- Refresh Tokens ----------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(user_id),
  token_hash VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
