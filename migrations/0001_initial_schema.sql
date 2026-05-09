-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teams (a team belongs to a tournament)
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  coach TEXT,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Players (a player belongs to a team)
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  height TEXT,
  access_code TEXT UNIQUE NOT NULL, -- unique code so the player can log in to view their stats
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Games (between two teams in a tournament)
CREATE TABLE IF NOT EXISTS games (
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

-- Player stats per game
CREATE TABLE IF NOT EXISTS player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  minutes INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  fg_made INTEGER DEFAULT 0,
  fg_attempted INTEGER DEFAULT 0,
  three_made INTEGER DEFAULT 0,
  three_attempted INTEGER DEFAULT 0,
  ft_made INTEGER DEFAULT 0,
  ft_attempted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(game_id, player_id)
);

-- Game photos (stored in R2, key kept here)
CREATE TABLE IF NOT EXISTS game_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER,
  tournament_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  caption TEXT,
  uploaded_by TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_access_code ON players(access_code);
CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_game ON player_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_photos_tournament ON game_photos(tournament_id);
CREATE INDEX IF NOT EXISTS idx_photos_game ON game_photos(game_id);
