-- Admin settings (single row with id=1 for changeable admin password)
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY,
  admin_password TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed the initial admin password (only inserts if not present)
INSERT OR IGNORE INTO admin_settings (id, admin_password) VALUES (1, 'admin123');

-- Add team access code so a whole team can view their combined stats
ALTER TABLE teams ADD COLUMN access_code TEXT;

-- Backfill: give existing teams a default code derived from team id
UPDATE teams SET access_code = 'TEAM-' || id || '-CHANGEME' WHERE access_code IS NULL OR access_code = '';

-- Index for fast team-code lookup
CREATE INDEX IF NOT EXISTS idx_teams_access_code ON teams(access_code);
