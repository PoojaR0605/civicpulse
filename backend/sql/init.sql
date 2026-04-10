CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_number   INTEGER NOT NULL UNIQUE,
  ward_name     VARCHAR(100) NOT NULL,
  city          VARCHAR(100) NOT NULL DEFAULT 'Bengaluru',
  zone          VARCHAR(50),
  boundary      GEOMETRY(POLYGON, 4326) NOT NULL,
  area_sqkm     DECIMAL(8, 4),
  population    INTEGER,
  risk_score    DECIMAL(3, 2) DEFAULT 0.50,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wards_boundary
  ON wards USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_wards_city
  ON wards (city);

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(150) UNIQUE NOT NULL,
  phone            VARCHAR(15) UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             VARCHAR(20) NOT NULL DEFAULT 'citizen'
                   CHECK (role IN ('citizen', 'officer', 'admin')),
  ward_id          UUID REFERENCES wards(id) ON DELETE SET NULL,
  department       VARCHAR(100),
  fcm_token        TEXT,
  is_verified      BOOLEAN DEFAULT FALSE,
  is_active        BOOLEAN DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone   ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users (ward_id);

CREATE TABLE IF NOT EXISTS issues (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude            DECIMAL(10, 8) NOT NULL,
  longitude           DECIMAL(11, 8) NOT NULL,
  gps_accuracy        DECIMAL(6, 2),
  location_point      GEOMETRY(POINT, 4326),
  address             TEXT,
  ward_id             UUID REFERENCES wards(id) ON DELETE SET NULL,
  category            VARCHAR(50) NOT NULL
                      CHECK (category IN (
                        'pothole', 'garbage', 'streetlight',
                        'sewage', 'encroachment', 'waterlogging', 'other'
                      )),
  title               VARCHAR(200),
  description         TEXT,
  photo_url           TEXT,
  photo_path          TEXT,
  ai_status           VARCHAR(20) DEFAULT 'pending'
                      CHECK (ai_status IN ('pending', 'validated', 'rejected', 'manual_review')),
  ai_confidence       DECIMAL(4, 3),
  ai_category         VARCHAR(50),
  ai_validated_at     TIMESTAMPTZ,
  geohash             VARCHAR(12),
  is_duplicate        BOOLEAN DEFAULT FALSE,
  parent_issue_id     UUID REFERENCES issues(id) ON DELETE SET NULL,
  status              VARCHAR(30) DEFAULT 'submitted'
                      CHECK (status IN (
                        'submitted', 'validated', 'assigned',
                        'in_progress', 'resolved', 'rejected', 'closed'
                      )),
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ,
  priority_score      DECIMAL(6, 2) DEFAULT 0,
  base_priority       INTEGER DEFAULT 5
                      CHECK (base_priority BETWEEN 1 AND 10),
  vote_count          INTEGER DEFAULT 0,
  view_count          INTEGER DEFAULT 0,
  sla_deadline        TIMESTAMPTZ,
  sla_breached        BOOLEAN DEFAULT FALSE,
  escalation_level    INTEGER DEFAULT 0,
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,
  resolution_photo    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_location
  ON issues USING GIST (location_point);

CREATE INDEX IF NOT EXISTS idx_issues_ward_id
  ON issues (ward_id);

CREATE INDEX IF NOT EXISTS idx_issues_status
  ON issues (status);

CREATE INDEX IF NOT EXISTS idx_issues_category
  ON issues (category);

CREATE INDEX IF NOT EXISTS idx_issues_reported_by
  ON issues (reported_by);

CREATE INDEX IF NOT EXISTS idx_issues_ai_status
  ON issues (ai_status);

CREATE INDEX IF NOT EXISTS idx_issues_sla_deadline
  ON issues (sla_deadline)
  WHERE sla_breached = FALSE;

CREATE INDEX IF NOT EXISTS idx_issues_geohash
  ON issues (geohash);

CREATE INDEX IF NOT EXISTS idx_issues_created_at
  ON issues (created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (issue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_issue_id ON votes (issue_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id  ON votes (user_id);

CREATE TABLE IF NOT EXISTS issue_status_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id     UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  changed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status  VARCHAR(30),
  to_status    VARCHAR(30) NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_issue_id
  ON issue_status_history (issue_id);

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id     UUID REFERENCES issues(id) ON DELETE SET NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  type         VARCHAR(50) DEFAULT 'status_update'
               CHECK (type IN (
                 'status_update', 'assigned', 'escalated',
                 'sla_breach', 'resolved', 'vote_milestone'
               )),
  is_read      BOOLEAN DEFAULT FALSE,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_issue_id
  ON notifications (issue_id);

CREATE TABLE IF NOT EXISTS sla_config (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category         VARCHAR(50) UNIQUE NOT NULL,
  base_priority    INTEGER NOT NULL DEFAULT 5,
  sla_hours        INTEGER NOT NULL,
  escalate_after   INTEGER NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sla_config (category, base_priority, sla_hours, escalate_after) VALUES
  ('sewage',       9,  4,   2),
  ('waterlogging', 8,  8,   4),
  ('garbage',      7,  24,  12),
  ('pothole',      6,  72,  48),
  ('streetlight',  5,  48,  24),
  ('encroachment', 4,  96,  72),
  ('other',        3,  120, 96)
ON CONFLICT (category) DO NOTHING;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens (token);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_wards_updated_at
  BEFORE UPDATE ON wards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO wards (
  ward_number, ward_name, city, zone,
  boundary, area_sqkm, population, risk_score
) VALUES (
  1,
  'Kempegowda Ward',
  'Bengaluru',
  'South',
  ST_GeomFromText(
    'POLYGON((
      77.5700 12.9700,
      77.5800 12.9700,
      77.5800 12.9800,
      77.5700 12.9800,
      77.5700 12.9700
    ))', 4326
  ),
  1.2,
  45000,
  0.65
) ON CONFLICT (ward_number) DO NOTHING;

SELECT 'Extensions' AS check_name, PostGIS_Version() AS result
UNION ALL
SELECT 'Tables created', COUNT(*)::TEXT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'SLA configs seeded', COUNT(*)::TEXT FROM sla_config
UNION ALL
SELECT 'Sample ward seeded', COUNT(*)::TEXT FROM wards;