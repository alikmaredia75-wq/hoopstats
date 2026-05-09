-- Sample tournament
INSERT OR IGNORE INTO tournaments (id, name, location, start_date, end_date, description) VALUES
  (1, 'Spring Hoops Classic 2026', 'Downtown Arena', '2026-04-01', '2026-04-15', 'Annual community basketball tournament featuring top regional teams.');

-- Sample teams
INSERT OR IGNORE INTO teams (id, tournament_id, name, coach) VALUES
  (1, 1, 'Thunder Hawks', 'Coach Mike Daniels'),
  (2, 1, 'Riverside Wolves', 'Coach Sara Patel'),
  (3, 1, 'Court Kings', 'Coach Brian Lee'),
  (4, 1, 'City Slammers', 'Coach Tony Ramirez');

-- Sample players (access_code is what they use to view their stats)
INSERT OR IGNORE INTO players (id, team_id, name, jersey_number, position, height, access_code) VALUES
  (1, 1, 'Marcus Johnson', 23, 'SG', '6''4"', 'HAWK-MJ23'),
  (2, 1, 'Devon Carter', 11, 'PG', '6''0"', 'HAWK-DC11'),
  (3, 1, 'Tyrell Brooks', 34, 'PF', '6''8"', 'HAWK-TB34'),
  (4, 2, 'Jamal Reed', 5, 'PG', '5''11"', 'WOLF-JR05'),
  (5, 2, 'Andre Wilson', 21, 'SF', '6''6"', 'WOLF-AW21'),
  (6, 2, 'Kevin Park', 32, 'C', '6''10"', 'WOLF-KP32'),
  (7, 3, 'Chris Morgan', 7, 'SG', '6''3"', 'KING-CM07'),
  (8, 3, 'Eli Thompson', 14, 'PF', '6''7"', 'KING-ET14'),
  (9, 4, 'Ray Foster', 9, 'PG', '6''1"', 'SLAM-RF09'),
  (10, 4, 'Mike Alvarez', 25, 'C', '6''11"', 'SLAM-MA25');

-- Sample games
INSERT OR IGNORE INTO games (id, tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue) VALUES
  (1, 1, 1, 2, 88, 82, '2026-04-02', 'Court A'),
  (2, 1, 3, 4, 75, 79, '2026-04-02', 'Court B'),
  (3, 1, 1, 3, 92, 85, '2026-04-05', 'Court A');

-- Sample stats
INSERT OR IGNORE INTO player_stats (game_id, player_id, minutes, points, rebounds, assists, steals, blocks, turnovers, fouls, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted) VALUES
  (1, 1, 32, 24, 5, 3, 2, 0, 2, 3, 9, 16, 3, 7, 3, 4),
  (1, 2, 30, 14, 3, 8, 1, 0, 3, 2, 5, 11, 2, 5, 2, 2),
  (1, 3, 28, 18, 11, 1, 0, 2, 1, 4, 7, 12, 0, 1, 4, 6),
  (1, 4, 31, 16, 4, 6, 2, 0, 4, 2, 6, 14, 2, 6, 2, 3),
  (1, 5, 29, 20, 7, 2, 1, 1, 2, 3, 8, 15, 2, 5, 2, 2),
  (3, 1, 34, 28, 6, 4, 3, 1, 1, 2, 11, 19, 4, 8, 2, 2),
  (3, 3, 30, 14, 9, 2, 0, 3, 2, 4, 6, 11, 0, 0, 2, 4);
