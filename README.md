# HoopStats — Basketball Tournament Stats App

## Project Overview
- **Name**: HoopStats
- **Goal**: Let tournament organizers upload basketball stats and photos, and let each player view their personal performance via a private access code.
- **Features**:
  - Admin panel to create tournaments, teams, players, games, and per-game stat lines
  - Per-player access code login → personal dashboard with averages and game-by-game stats
  - Public tournament pages with team rosters, scores, and box scores
  - Public photo gallery per tournament — anyone can upload game pictures (with optional caption + game tag); browse / filter by game; click to view full-size

## Live URL (sandbox preview)
- **App**: https://3000-ivfzar3w954mxllktu1pb-3844e1b6.sandbox.novita.ai

## How to Use

### As Admin
1. Open `/admin`.
2. Sign in with the default password: **`admin123`** (change in production via the `ADMIN_PASSWORD` Cloudflare secret).
3. Use the tabs to:
   - **Tournaments** — create a tournament
   - **Teams** — add teams under that tournament
   - **Players** — add players to teams. Each player gets an auto-generated **access code** (or supply your own). **Share this code with the player.**
   - **Games** — schedule a game between two teams (with final score)
   - **Stats** — pick a game + a player, fill in their box score (PTS, REB, AST, FG, 3P, FT, etc.), save. Re-saving updates the existing line.

### As a Player
1. Open `/player`.
2. Enter your access code (e.g. `HAWK-MJ23`).
3. View your season averages (PPG, RPG, APG, SPG, BPG, FG%, 3P%, FT%) and a game-by-game table.
4. Tap "View & Upload Game Photos" to jump to your tournament's gallery.

### Uploading Game Pictures
- Anyone can open `/gallery/<tournament_id>` (or click the "Photos" button from the home page / tournament page).
- Choose one or more image files, optionally pick the game it's from, add a caption and your name, then upload.
- Photos are stored in Cloudflare R2 and served via the app.

## Functional Entry URIs
| Path | Method | Auth | Description |
|---|---|---|---|
| `/` | GET | — | Home page, lists all tournaments |
| `/admin` | GET | — | Admin UI |
| `/player` | GET | — | Player login + dashboard |
| `/tournament/:id` | GET | — | Tournament detail (teams, rosters, games, box scores) |
| `/gallery/:id` | GET | — | Photo gallery with upload |
| `/api/tournaments` | GET | — | List tournaments |
| `/api/tournaments` | POST | Admin | Create tournament — body: `{name, location?, start_date?, end_date?, description?}` |
| `/api/tournaments/:id` | GET | — | Tournament + teams + games |
| `/api/tournaments/:id` | DELETE | Admin | Delete tournament (cascades) |
| `/api/teams/:id` | GET | — | Team + roster |
| `/api/teams` | POST | Admin | Create team — body: `{tournament_id, name, coach?}` |
| `/api/teams/:id` | DELETE | Admin | Delete team |
| `/api/players` | POST | Admin | Create player — body: `{team_id, name, jersey_number?, position?, height?, access_code?}` |
| `/api/players/:id` | DELETE | Admin | Delete player |
| `/api/admin/players?tournament_id=` | GET | Admin | List players (incl. access codes) |
| `/api/player/login` | POST | — | Player login — body: `{access_code}` |
| `/api/player/:id/stats` | GET | — | Player's per-game stats + totals + averages |
| `/api/games` | POST | Admin | Create game — body: `{tournament_id, home_team_id, away_team_id, home_score?, away_score?, game_date?, venue?}` |
| `/api/games/:id` | GET | — | Game + box score |
| `/api/games/:id` | DELETE | Admin | Delete game |
| `/api/stats` | POST | Admin | Upsert stat line — body: `{game_id, player_id, minutes, points, rebounds, assists, steals, blocks, turnovers, fouls, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted}` |
| `/api/photos/upload` | POST | — | Multipart upload — fields: `file`, `tournament_id`, `game_id?`, `caption?`, `uploaded_by?` |
| `/api/photos?tournament_id=&game_id=` | GET | — | List photos |
| `/api/photos/file/:id` | GET | — | Stream photo bytes from R2 |
| `/api/photos/:id` | DELETE | Admin | Delete photo (DB + R2) |
| `/api/admin/check` | POST | Admin | Verify admin password |

Admin endpoints require header `X-Admin-Password: <password>`.

## Data Architecture
- **Storage**:
  - **Cloudflare D1** (SQLite at the edge) — tournaments, teams, players, games, player_stats, game_photos (metadata)
  - **Cloudflare R2** (object storage) — actual photo bytes (key tracked in `game_photos.r2_key`)
- **Data Models** (key tables):
  - `tournaments` (name, location, dates, description)
  - `teams` (tournament_id, name, coach)
  - `players` (team_id, name, jersey_number, position, height, **access_code unique**)
  - `games` (tournament_id, home_team_id, away_team_id, home_score, away_score, date, venue)
  - `player_stats` (game_id + player_id unique, minutes/points/rebounds/assists/steals/blocks/turnovers/fouls + FG/3P/FT made & attempted)
  - `game_photos` (tournament_id, game_id, r2_key, caption, uploaded_by, content_type, size_bytes)
- **Data Flow**:
  - Admin POSTs JSON to `/api/*` (header `X-Admin-Password`) → writes to D1
  - Player POSTs `access_code` to `/api/player/login` → server looks up `players` row, returns profile; SPA then GETs `/api/player/:id/stats` for the dashboard (totals + per-game)
  - Photo upload: browser POSTs multipart to `/api/photos/upload` → server stores file in R2 under `photos/<tournament_id>/<timestamp>-<rand>.<ext>`, inserts metadata into `game_photos` → list/stream endpoints join with games for context

## Currently Completed Features
- Tournament / team / player / game / stat-line CRUD (admin-protected)
- Player access-code authentication (no email/password — just the code)
- Player dashboard: career totals, season averages (incl. shooting percentages), game-by-game table
- Public tournament page with collapsible per-game box scores
- Photo gallery per tournament with multi-file upload, caption, uploader name, optional game-tag, lightbox view, and game filter

## Features Not Yet Implemented
- Team-level standings / leaderboard view (e.g. team scoring leader, top-5 across tournament)
- Photo "like" / comment / per-player tagging
- Public deployment to Cloudflare Pages (currently running as sandbox preview only — needs `setup_cloudflare_api_key` + `wrangler pages deploy`)
- Production D1 / R2 provisioning + migration apply against remote
- Per-tournament admin roles (currently a single global admin password)
- Excel / CSV bulk import of stat lines

## Recommended Next Steps
1. Run `setup_cloudflare_api_key`, then `npx wrangler d1 create webapp-production`, paste the real `database_id` into `wrangler.jsonc`, `npx wrangler r2 bucket create webapp-photos`, set `ADMIN_PASSWORD` via `npx wrangler pages secret put ADMIN_PASSWORD`, then `npm run build && npx wrangler pages deploy dist --project-name <chosen-name>`.
2. After first deploy, `npx wrangler d1 migrations apply webapp-production` to provision tables on the remote DB.
3. Add a "Tournament leaders" widget on `/tournament/:id` (top scorer, top rebounder, etc. via SQL aggregates).
4. Add a per-photo delete button visible to admins on the gallery page.

## Deployment
- **Platform**: Cloudflare Pages + Workers + D1 + R2
- **Status**: Running locally in sandbox (Cloudflare Pages deployment pending API key setup)
- **Tech Stack**: Hono + JSX (SSR) + Vite + TypeScript + Tailwind (CDN) + Font Awesome (CDN) + Axios (CDN)
- **Local Development**: `npm run build && pm2 start ecosystem.config.cjs` → http://localhost:3000
- **Default Admin Password**: `admin123` (override with `ADMIN_PASSWORD` secret)
- **Sample Player Codes** (from seed data): `HAWK-MJ23`, `HAWK-DC11`, `WOLF-JR05`, `KING-CM07`, `SLAM-RF09`, …
- **Last Updated**: 2026-05-09
