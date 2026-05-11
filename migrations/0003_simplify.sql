-- Simplify: only PTS/REB/AST, drop access codes, drop photos.
-- Strategy: drop FK-dependent tables first (no constraint to violate),
-- then drop & recreate parent tables.

-- Drop the photos table entirely (no other table depends on it)
DROP TABLE IF EXISTS game_photos;

-- Drop player_stats (it depends on games + players)
DROP TABLE IF EXISTS player_stats;

-- Drop games (it depends on teams)
DROP TABLE IF EXISTS games_backup;
CREATE TABLE games_backup AS SELECT * FROM games;
DROP TABLE games;

-- Drop players (it depends on teams)
DROP TABLE IF EXISTS players_backup;
CREATE TABLE players_backup AS SELECT id, team_id, name, jersey_number, position, height, created_at FROM players;
DROP TABLE players;

-- Drop teams (it depends on tournaments)
DROP TABLE IF EXISTS teams_backup;
CREATE TABLE teams_backup AS SELECT id, tournament_id, name, coach, logo_url, created_at FROM teams;
DROP TABLE teams;

-- Recreate teams WITHOUT access_code
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  coach TEXT,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);
INSERT INTO teams (id, tournament_id, name, coach, logo_url, created_at)
  SELECT id, tournament_id, name, coach, logo_url, created_at FROM teams_backup;
DROP TABLE teams_backup;
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);

-- Recreate players WITHOUT access_code
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  height TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
INSERT INTO players (id, team_id, name, jersey_number, position, height, created_at)
  SELECT id, team_id, name, jersey_number, position, height, created_at FROM players_backup;
DROP TABLE players_backup;
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

-- Recreate games
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  game_date TEXT,
  venue TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id)
);
INSERT INTO games (id, tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue, notes, created_at)
  SELECT id, tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue, notes, created_at FROM games_backup;
DROP TABLE games_backup;
CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);

-- Recreate player_stats with only PTS/REB/AST
CREATE TABLE player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(game_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_game ON player_stats(game_id);

-- Re-seed sample stats with just PTS/REB/AST
INSERT OR IGNORE INTO player_stats (game_id, player_id, points, rebounds, assists) VALUES
  (1, 1, 24, 5, 3),
  (1, 2, 14, 3, 8),
  (1, 3, 18, 11, 1),
  (1, 4, 16, 4, 6),
  (1, 5, 20, 7, 2),
  (3, 1, 28, 6, 4),
  (3, 3, 14, 9, 2);
