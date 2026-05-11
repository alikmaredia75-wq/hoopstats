# HoopStats

## Project Overview
- **Name**: HoopStats
- **Goal**: A simple basketball tournament stats site. Pick a player or a team and see their points, rebounds, and assists. Browse the Player of the Day on the front of the player area. Admins enter all data through a hidden admin panel.
- **Features**:
  - Public Player of the Day (top PTS + REB + AST in the most recent game)
  - Public player browsing: tournament → team → player dropdowns, then PTS / REB / AST totals, averages, and per-game log
  - Public team browsing: tournament → team dropdowns, then W/L record + per-player PTS / REB / AST totals & averages
  - Tournament detail page with team rosters, games, and per-game PTS / REB / AST box scores
  - Hidden admin panel (admin password only) to manage tournaments, teams, players, games, and stats
  - Admin can change the admin password from the Settings tab

## URLs
- **Local dev**: http://localhost:3000
- **Production**: not yet deployed
- **Public pages**: `/`, `/player`, `/team`, `/tournament/:id`
- **Hidden admin panel**: `/secure-admin-panel-x7q` (legacy `/admin` redirects to `/player`)

## Functional Entry URIs

### Public API
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/tournaments` | List tournaments |
| GET | `/api/tournaments/:id` | One tournament with its teams & games |
| GET | `/api/teams/:id` | One team with its players |
| GET | `/api/team/:id/stats` | Team aggregated stats: record + per-player totals/averages (PTS/REB/AST) |
| GET | `/api/players?tournament_id=&team_id=` | Players, filterable by tournament and/or team |
| GET | `/api/player/:id` | Player profile (public, no code) |
| GET | `/api/player/:id/stats` | Player game log + totals + averages (PTS/REB/AST) |
| GET | `/api/player-of-the-day?tournament_id=` | Top performer by PTS+REB+AST |
| GET | `/api/games/:id` | One game with its stats |

### Admin API (require header `X-Admin-Password: <password>`)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/admin/check` | Validate password |
| POST | `/api/admin/change-password` | Set new admin password (min 4 chars) |
| POST/DELETE | `/api/tournaments[/:id]` | Create / delete tournament |
| POST/DELETE | `/api/teams[/:id]` | Create / delete team |
| POST/DELETE | `/api/players[/:id]` | Create / delete player |
| POST/DELETE | `/api/games[/:id]` | Create / delete game |
| POST | `/api/stats` | Upsert per-game stats (PTS / REB / AST) |

## Data Architecture
- **Storage**: Cloudflare D1 (SQLite). Local dev runs against the local D1 SQLite stored under `.wrangler/state/v3/d1/`.
- **Data models**:
  - `tournaments(id, name, location, start_date, end_date, description, created_at)`
  - `teams(id, tournament_id, name, coach, logo_url, created_at)`
  - `players(id, team_id, name, jersey_number, position, height, created_at)` — no access codes
  - `games(id, tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue, notes, created_at)`
  - `player_stats(id, game_id, player_id, points, rebounds, assists, created_at)` — only three stat columns, unique on `(game_id, player_id)`
  - `admin_settings(id=1, admin_password)` — single-row table holding the current admin password (default `admin123`)
- **Migrations**:
  - `0001_initial_schema.sql` — initial schema
  - `0002_admin_team_auth.sql` — added admin_settings (historical; access_code columns were dropped later)
  - `0003_simplify.sql` — dropped game_photos, simplified `player_stats` to PTS/REB/AST, removed all access codes from `players` and `teams`

## User Guide
1. **Browse player stats** — go to `/player`. Player of the Day is shown at the top. Below it, pick a tournament, then team, then player to see their PTS / REB / AST.
2. **Browse team stats** — go to `/team`. Pick a tournament and team to see the W/L record and the whole roster's PTS / REB / AST.
3. **Browse tournament details** — go to `/tournament/:id` for rosters and games; click a game to expand the per-player PTS / REB / AST box score.
4. **Admin** — go to `/secure-admin-panel-x7q`, sign in with the admin password (default `admin123`, changeable in Settings), then use the tabs to add tournaments, teams, players, games, and stats. Stats entry asks only for PTS / REB / AST.

## What's NOT in the app
- No player access codes
- No team access codes
- No game photo gallery
- No advanced stats (no MIN / STL / BLK / FG / 3P / FT)

## Deployment
- **Platform**: Cloudflare Pages (Hono on Workers runtime)
- **Status**: ❌ Not yet deployed to production
- **Tech Stack**: Hono + TypeScript + JSX SSR + Vite + Cloudflare D1; frontend uses Tailwind CSS, Font Awesome, and Axios via CDN
- **Last Updated**: 2026-05-11

## Local Development
```bash
npm run build
pm2 start ecosystem.config.cjs
# visit http://localhost:3000
```
Admin password defaults to `admin123` and can be changed from the admin panel's Settings tab.
