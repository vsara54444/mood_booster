-- =========================================================
--  MoodBooster – PostgreSQL Schema (Supabase compatible)
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
  mother_tongue   VARCHAR(10)  NOT NULL DEFAULT 'other',
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
  humor_provider        VARCHAR(20),
  song_text             TEXT,
  is_shared_anonymously BOOLEAN      NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, created_at DESC);

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

-- ---------- Judge Rotation (round-robins which provider grades humor candidates) ----------
CREATE TABLE IF NOT EXISTS judge_rotation (
  id         SMALLINT PRIMARY KEY DEFAULT 1,
  last_index INT      NOT NULL DEFAULT -1
);
INSERT INTO judge_rotation (id, last_index) VALUES (1, -1) ON CONFLICT (id) DO NOTHING;

-- =========================================================
--  Migration for an EXISTING database (multi-provider humor
--  grading + Tanglish mode). Safe to re-run - every statement
--  is idempotent. Run this in Supabase SQL Editor if your
--  tables already existed before this change.
-- =========================================================
ALTER TABLE users   ADD COLUMN IF NOT EXISTS mother_tongue VARCHAR(10) NOT NULL DEFAULT 'other';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS humor_provider VARCHAR(20);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS song_text TEXT;
-- Cached AI-generated sticker (data URI). Generated at most once per entry,
-- on demand via POST /api/entries/:entryId/sticker - never automatically.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS sticker_image TEXT;
CREATE TABLE IF NOT EXISTS judge_rotation (
  id         SMALLINT PRIMARY KEY DEFAULT 1,
  last_index INT      NOT NULL DEFAULT -1
);
INSERT INTO judge_rotation (id, last_index) VALUES (1, -1) ON CONFLICT (id) DO NOTHING;

-- =========================================================
--  Migration: Interests personalization system
--  (mother tongue / sport / actor / politician / business leader)
--  Safe to re-run - every statement is idempotent.
--  NOTE: `interest_categories.category_key = 'mother_tongue'` is a
--  DIFFERENT, additive concept from `users.mother_tongue` (the
--  short routing slug consumed by aiService.js). They are never
--  joined; `users.mother_tongue` is kept in sync from the
--  richer selection by the /api/interests route layer, see
--  routes/interests.js.
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS interest_categories (
  category_key     VARCHAR(40)  PRIMARY KEY,
  label            VARCHAR(100) NOT NULL,
  is_multi_select  BOOLEAN      NOT NULL DEFAULT false,
  sort_order       INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS interest_items (
  item_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key  VARCHAR(40)  NOT NULL REFERENCES interest_categories(category_key),
  name          VARCHAR(200) NOT NULL,
  aliases       TEXT,
  image_url     TEXT,
  metadata      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  UNIQUE (category_key, name)
);
CREATE INDEX IF NOT EXISTS idx_interest_items_name_trgm ON interest_items USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_interest_items_category   ON interest_items(category_key) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS user_interests (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(user_id),
  category_key  VARCHAR(40)  NOT NULL REFERENCES interest_categories(category_key),
  item_id       UUID         REFERENCES interest_items(item_id),
  item_name     VARCHAR(200) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_key, item_name)
);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO interest_categories (category_key, label, is_multi_select, sort_order) VALUES
  ('mother_tongue',   'Mother Tongue',            false, 1),
  ('sport',           'Favorite Sport/Game',      false, 2),
  ('actor',           'Favorite Actor/Actress',   true,  3),
  ('politician',      'Favorite Politician',      true,  4),
  ('business_leader', 'Favorite Business Leader', true,  5),
  ('musician',        'Favorite Musician',        true,  6),
  ('comedian',        'Favorite Comedian',        true,  7),
  ('personality',     'Favorite Personality',     true,  8),
  ('other_favorite',  'Any Other Favorite',       true,  9)
ON CONFLICT (category_key) DO NOTHING;

-- =========================================================
--  Migration: implicit Tamil comedic-mechanism preference learning
--  (escalation / duo_banter / wordplay / deadpan - see
--  aiService.js TAMIL_MECHANISMS and mechanismPreference.js).
--  The mechanism a user prefers is inferred from regenerate/vote
--  behavior, never asked for directly. Safe to re-run.
-- =========================================================
ALTER TABLE entries         ADD COLUMN IF NOT EXISTS humor_mechanism VARCHAR(30);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS humor_mechanism VARCHAR(30);

CREATE TABLE IF NOT EXISTS humor_feedback (
  feedback_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(user_id),
  entry_id    UUID        REFERENCES entries(entry_id),
  mechanism   VARCHAR(30) NOT NULL,
  signal      VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_humor_feedback_user ON humor_feedback(user_id, mechanism);

-- =========================================================
--  Migration: curated joke templates (offline-authored,
--  AI batch-generated + AI self-filtered) replacing live
--  per-request joke generation. See templateAuthoring.js /
--  scripts/generateJokeTemplates.js for the offline writer
--  and templateSelector.js for the request-time matcher.
--  Safe to re-run - every statement is idempotent.
-- =========================================================
CREATE TABLE IF NOT EXISTS joke_templates (
  template_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category              VARCHAR(30)  NOT NULL,
  topic_tag             VARCHAR(50)  NOT NULL DEFAULT 'general',
  mother_tongue         VARCHAR(10)  NOT NULL DEFAULT 'other',
  mechanism             VARCHAR(30),                  -- tamil only
  humor_template        TEXT         NOT NULL,
  perspective_template  TEXT         NOT NULL,
  action_template       TEXT         NOT NULL,
  song_template         TEXT,
  required_slots        JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["subject","object","event"]
  status                VARCHAR(12)  NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
  quality_score         NUMERIC(4,2),
  normalized_tokens     TEXT         NOT NULL DEFAULT '',           -- offline dedupe, see similarityService.js
  usage_count           INT          NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_joke_templates_lookup ON joke_templates(category, mother_tongue, status);

-- Per-user "already shown" list so a single user never repeats a joke within
-- their recent history, while a DIFFERENT user can still be shown the same
-- template - dedupe here is intentionally per-user, not global.
CREATE TABLE IF NOT EXISTS user_template_history (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES users(user_id),
  template_id  UUID         NOT NULL REFERENCES joke_templates(template_id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_template_history_user ON user_template_history(user_id, created_at DESC);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES joke_templates(template_id);
-- Slot values extracted once at submit time (see slotExtraction.js), reused
-- on "regenerate humor" so a rewrite never needs another AI call.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS story_slots JSONB NOT NULL DEFAULT '{}'::jsonb;

-- =========================================================
--  Migration: reusable humor library (semantic cache).
--  Request-time flow (see humorService.js) is now: classify
--  the worry -> embed it -> search `humors` for a close-enough
--  existing entry -> only call Claude/Groq (freshHumorWriter.js)
--  on a miss -> store the result so future similar worries
--  reuse it. The old joke_templates pipeline above is left in
--  place (untouched, still queryable) but is no longer read on
--  the request path. Safe to re-run - idempotent.
-- =========================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS humors (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_tongue      VARCHAR(10)  NOT NULL DEFAULT 'other',
  category           VARCHAR(30)  NOT NULL,
  subcategory        VARCHAR(40)  NOT NULL DEFAULT 'general',
  emotion            VARCHAR(40),
  humor_style        VARCHAR(30),                    -- mechanism, tamil only
  topic_keywords     TEXT[]       NOT NULL DEFAULT '{}',
  worry_text         TEXT         NOT NULL,           -- the cleaned situation this was written for
  normalized_worry_tokens TEXT    NOT NULL DEFAULT '', -- Level-1 exact/near-duplicate match, see similarityService.js
  humor_text         TEXT         NOT NULL,
  perspective_text   TEXT         NOT NULL,
  action_text        TEXT         NOT NULL,
  song_text          TEXT,
  embedding          VECTOR(768)  NOT NULL,
  quality_score      NUMERIC(4,2) NOT NULL,
  usage_count        INT          NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at       TIMESTAMPTZ,
  active             BOOLEAN      NOT NULL DEFAULT true,
  source             VARCHAR(20)  NOT NULL DEFAULT 'ai_generated',  -- never book/copyrighted text - see templateAuthoring/freshHumorWriter comments
  generation_model   VARCHAR(40),
  version            INT          NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_humors_lookup ON humors(mother_tongue, category, subcategory) WHERE active;
CREATE INDEX IF NOT EXISTS idx_humors_topic_keywords ON humors USING GIN (topic_keywords);
CREATE INDEX IF NOT EXISTS idx_humors_embedding ON humors USING hnsw (embedding vector_cosine_ops);
-- Was added after the table's first release - needed for tables created before this line existed.
ALTER TABLE humors ADD COLUMN IF NOT EXISTS normalized_worry_tokens TEXT NOT NULL DEFAULT '';

-- Per-user "already shown" list, same shape/purpose as user_template_history
-- above - keeps a single user from being served the same stored humor twice
-- within their recent history while still letting a different user reuse it.
CREATE TABLE IF NOT EXISTS user_humor_history (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES users(user_id),
  humor_id   UUID         NOT NULL REFERENCES humors(id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_humor_history_user ON user_humor_history(user_id, created_at DESC);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS humor_id UUID REFERENCES humors(id);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS subcategory VARCHAR(40);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS emotion VARCHAR(40);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS topic_keywords TEXT[] NOT NULL DEFAULT '{}';

-- =========================================================
--  Migration: Boost page brain-puzzle question bank (trivia +
--  math), replacing hardcoded frontend arrays. See routes/puzzles.js
--  and scripts/seedPuzzles.js.
-- =========================================================
CREATE TABLE IF NOT EXISTS puzzles (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category   VARCHAR(20)  NOT NULL,   -- 'trivia' | 'math'
  question   TEXT         NOT NULL,
  answer     TEXT         NOT NULL,
  explain    TEXT,
  active     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_puzzles_category ON puzzles(category) WHERE active;

-- =========================================================
--  Migration: "Guess the Song" emoji clue game (Boost page,
--  Music to Listen section). Same pattern as puzzles above -
--  clues + answers are pre-authored and stored, never generated
--  live, so playing costs zero AI API calls. See routes/songs.js
--  and scripts/seedSongs.js.
-- =========================================================
CREATE TABLE IF NOT EXISTS song_riddles (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  era        VARCHAR(10)  NOT NULL,   -- '70s' | '80s' | '90s_2000s'
  emoji_clue TEXT         NOT NULL,
  song_name  TEXT         NOT NULL,
  movie_name TEXT,
  singer     TEXT,
  active     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_song_riddles_era ON song_riddles(era) WHERE active;
