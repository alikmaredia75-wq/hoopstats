-- Sample tournament
INSERT OR IGNORE INTO tournaments (id, name, location, start_date, end_date, description) VALUES
  (1, 'Spring Hoops Classic 2026', 'Downtown Arena', '2026-04-01', '2026-04-15', 'Annual community basketball tournament featuring top regional teams.'),
  (2, 'Summer Showdown 2026', 'City Sports Complex', '2026-07-10', '2026-07-25', 'Mid-summer regional bracket play.'),
  (3, 'Fall Invitational 2025', 'Eastside Arena', '2025-10-01', '2025-10-15', 'Wrapped tournament from last season.');

-- Sample teams
INSERT OR IGNORE INTO teams (id, tournament_id, name, coach) VALUES
  (1, 1, 'Thunder Hawks', 'Coach Mike Daniels'),
  (2, 1, 'Riverside Wolves', 'Coach Sara Patel'),
  (3, 1, 'Court Kings', 'Coach Brian Lee'),
  (4, 1, 'City Slammers', 'Coach Tony Ramirez');

-- Sample players
INSERT OR IGNORE INTO players (id, team_id, name, jersey_number, position, height) VALUES
  (1, 1, 'Marcus Johnson', 23, 'SG', '6''4"'),
  (2, 1, 'Devon Carter', 11, 'PG', '6''0"'),
  (3, 1, 'Tyrell Brooks', 34, 'PF', '6''8"'),
  (4, 2, 'Jamal Reed', 5, 'PG', '5''11"'),
  (5, 2, 'Andre Wilson', 21, 'SF', '6''6"'),
  (6, 2, 'Kevin Park', 32, 'C', '6''10"'),
  (7, 3, 'Chris Morgan', 7, 'SG', '6''3"'),
  (8, 3, 'Eli Thompson', 14, 'PF', '6''7"'),
  (9, 4, 'Ray Foster', 9, 'PG', '6''1"'),
  (10, 4, 'Mike Alvarez', 25, 'C', '6''11"');

-- Sample games
INSERT OR IGNORE INTO games (id, tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue) VALUES
  (1, 1, 1, 2, 88, 82, '2026-04-02', 'Court A'),
  (2, 1, 3, 4, 75, 79, '2026-04-02', 'Court B'),
  (3, 1, 1, 3, 92, 85, '2026-04-05', 'Court A'),
  (4, 1, 2, 4, 80, 88, '2026-04-05', 'Court B');

-- Sample player stats (PTS / REB / AST only)
INSERT OR IGNORE INTO player_stats (game_id, player_id, points, rebounds, assists) VALUES
  (1, 1, 22, 5, 6),
  (1, 2, 18, 3, 8),
  (1, 3, 16, 10, 2),
  (1, 4, 20, 4, 5),
  (1, 5, 14, 6, 3),
  (1, 6, 12, 8, 1),
  (2, 7, 19, 4, 4),
  (2, 8, 21, 9, 2),
  (2, 9, 24, 5, 7),
  (2, 10, 18, 11, 1),
  (3, 1, 28, 6, 4),
  (3, 2, 15, 4, 9),
  (3, 3, 20, 12, 3),
  (3, 7, 22, 5, 5),
  (3, 8, 18, 8, 2),
  (4, 4, 17, 3, 6),
  (4, 5, 19, 7, 2),
  (4, 6, 13, 9, 1),
  (4, 9, 26, 4, 5),
  (4, 10, 20, 10, 2);
