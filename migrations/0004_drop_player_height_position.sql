-- Drop height and position columns from players
-- SQLite/D1 doesn't support DROP COLUMN with FKs reliably, so use the swap-table pattern.

-- Save existing players
CREATE TABLE IF NOT EXISTS players_backup AS SELECT id, team_id, name, jersey_number, created_at FROM players;

-- Drop FK-dependent tables, then players itself
DROP TABLE IF EXISTS player_stats_backup;
CREATE TABLE player_stats_backup AS SELECT * FROM player_stats;
DROP TABLE player_stats;
DROP TABLE players;

-- Recreate players without height/position
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

INSERT INTO players (id, team_id, name, jersey_number, created_at)
  SELECT id, team_id, name, jersey_number, created_at FROM players_backup;

-- Recreate player_stats
CREATE TABLE player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, player_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

INSERT INTO player_stats (id, game_id, player_id, points, rebounds, assists, created_at)
  SELECT id, game_id, player_id, points, rebounds, assists, created_at FROM player_stats_backup;

DROP TABLE players_backup;
DROP TABLE player_stats_backup;
