-- Streetfeed database schema

CREATE TABLE IF NOT EXISTS streets (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  households INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  house_number TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  street_id  INT REFERENCES streets(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'resident',   -- resident, moderator, admin
  status     TEXT NOT NULL DEFAULT 'pending',    -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, street_id)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  street_id      INT REFERENCES streets(id) ON DELETE CASCADE,
  user_id        INT REFERENCES users(id) ON DELETE SET NULL,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  end_date       DATE,
  license_plate  TEXT,
  event_date     TEXT,
  event_time     TEXT,
  event_location TEXT,
  bring_list     TEXT[],
  photo_key      TEXT,
  link           TEXT,
  carrier        TEXT,
  allow_join     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migratie: voeg ontbrekende kolommen toe aan bestaande posts tabel
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link       TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS carrier    TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS allow_join BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS rsvps (
  id         SERIAL PRIMARY KEY,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- yes, maybe, no
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL PRIMARY KEY,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id         SERIAL PRIMARY KEY,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, category)
);

-- Seed: first street
INSERT INTO streets (name, households) VALUES ('Reyer Anslostraat', 111)
  ON CONFLICT DO NOTHING;

-- Migratie: startdatum voor blokkades en containers
ALTER TABLE posts ADD COLUMN IF NOT EXISTS start_date DATE;

-- Migratie: starttijd en eindtijd voor werkzaamheden
ALTER TABLE posts ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Migratie: joins tabel voor aanmeldknop
CREATE TABLE IF NOT EXISTS joins (
  id         SERIAL PRIMARY KEY,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Migratie: locatie en sub-type voor berichten
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- Migratie: stad per straat (voor BAG API lookup)
ALTER TABLE streets ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Amsterdam';

-- Migratie: opgehaald/gevonden status voor bezorgingberichten
ALTER TABLE posts ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false;

-- Migratie: hernoem categorieën naar nieuwe namen
UPDATE posts SET category = 'bezorging'   WHERE category = 'package';
UPDATE posts SET category = 'straatzaken' WHERE category IN ('works', 'blockage', 'container', 'waste');
UPDATE posts SET category = 'melding'     WHERE category = 'incident';
UPDATE posts SET category = 'evenement'   WHERE category = 'event';
UPDATE posts SET category = 'melding'     WHERE category = 'general';

-- Migratie: hernoem notification_prefs categorieën
UPDATE notification_prefs SET category = 'bezorging'   WHERE category = 'package';
UPDATE notification_prefs SET category = 'straatzaken' WHERE category IN ('works', 'blockage', 'container', 'waste');
UPDATE notification_prefs SET category = 'melding'     WHERE category = 'incident';
UPDATE notification_prefs SET category = 'evenement'   WHERE category = 'event';
DELETE FROM notification_prefs                         WHERE category = 'general';

-- Seed: super admin
UPDATE users SET is_super_admin = true WHERE email = 'wendy@fred6.nl';
