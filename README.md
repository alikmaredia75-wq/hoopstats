# HoopStats — Basketball Tournament Stats App

## Project Overview
- **Name**: HoopStats
- **Goal**: Tournament organizers (admins) upload basketball stats and game photos. Players view their personal performance, whole teams view all-team stats, and fans browse photos.
- **Features**:
  - Hidden admin panel with **changeable password** (no link from public pages)
  - Player access codes → personal dashboard (PPG, RPG, FG%, etc., game-by-game)
  - **Team access codes** → whole-team stat sheet with W/L record, PPG for/against, roster averages sorted by PPG
  - **Player of the Day** featured prominently on the player landing page (no login required)
  - Admin-only photo upload to Cloudflare R2 (anyone can view; only admins post or delete)

## Live URL (sandbox preview)
- **App**: https://3000-ivfzar3w954mxllktu1pb-3844e1b6.sandbox.novita.ai
- **Hidden admin panel**: https://3000-ivfzar3w954mxllktu1pb-3844e1b6.sandbox.novita.ai/secure-admin-panel-x7q

## How to Use

### As Admin (hidden URL)
1. Open `/secure-admin-panel-x7q` directly — there is no link to it from any public page.
2. Sign in. The default password is **`admin123`**.
3. Use the **Settings** tab to change your password — you'll be logged out and asked to sign in again with the new one.
4. Then use the other tabs:
   - **Tournaments** — create / delete tournaments
   - **Teams** — add teams; each team gets a unique **team code** (e.g. `HAWKS-2026`). Share it with the team so they can view whole-team stats. You can edit any team's code by clicking the pencil icon.
   - **Players** — add players, each with an auto-generated **player access code**. Share with each player.
   - **Games** — schedule matchups + final scores
   - **Stats** — pick a game + player, fill in the box score; re-saving updates the existing line
   - **Photos** — upload one or many game pictures (admin only); delete any photo

### As a Player (`/player`)
1. The first thing you see is the **Player of the Day** — the standout performance across all uploaded stats (no login needed).
2. Below that, enter your player access code (e.g. `HAWK-MJ23`) to view your personal dashboard: averages, totals, and a game-by-game box score.

### As a Team (`/team`)
1. Enter your team code (e.g. `HAWKS-2026`).
2. See your team's record (W-L), points for/against, point differential, and a roster table with each player's season averages sorted by PPG.
3. See a per-game result list (W/L badges, scores, dates).

### Game Photos (`/gallery/:tournament_id`)
- **Anyone** can browse and click photos for a full-size lightbox view.
- **Only admins** can upload or delete (a notice tells regular visitors that uploads are admin-only).

## Functional Entry URIs
| Path | Method | Auth | Description |
|---|---|---|---|
| `/` | GET | — | Home + tournament list |
| `/player` | GET | — | Player of the Day + personal-stats login |
| `/team` | GET | — | Team-code login + whole-team stats |
| `/tournament/:id` | GET | — | Public tournament page (teams, schedule, box scores) |
| `/gallery/:id` | GET | — | Photo gallery (admin upload, public view) |
| `/secure-admin-panel-x7q` | GET | — | Hidden admin panel |
| `/admin` | GET | — | Redirects to `/player` (legacy) |
| `/api/admin/check` | POST | Admin | Verify admin password (`X-Admin-Password` header) |
| `/api/admin/change-password` | POST | Admin | `{new_password}` — updates stored password |
| `/api/tournaments` | GET/POST | — / Admin | List / create tournaments |
| `/api/tournaments/:id` | GET / DELETE | — / Admin | Read / delete tournament |
| `/api/teams/:id` | GET | — | Public team + roster (no codes leaked) |
| `/api/teams` | POST | Admin | `{tournament_id, name, coach?, access_code?}` |
| `/api/teams/:id/access-code` | PUT | Admin | `{access_code}` |
| `/api/teams/:id` | DELETE | Admin | Delete team |
| `/api/team/login` | POST | — | `{access_code}` → team |
| `/api/team/:id/stats` | GET | — | Whole-team stats + roster averages + W/L |
| `/api/admin/teams?tournament_id=` | GET | Admin | Teams with codes |
| `/api/players` | POST | Admin | `{team_id, name, jersey_number?, position?, height?, access_code?}` |
| `/api/players/:id` | DELETE | Admin | Delete player |
| `/api/admin/players?tournament_id=` | GET | Admin | Players with codes |
| `/api/player/login` | POST | — | `{access_code}` → player |
| `/api/player/:id/stats` | GET | — | Player totals + averages + per-game box scores |
| `/api/player-of-the-day` | GET | — | Best single-game performance (optional `?tournament_id=`) |
| `/api/games` | POST | Admin | Create game |
| `/api/games/:id` | GET / DELETE | — / Admin | Game + box score / delete |
| `/api/stats` | POST | Admin | Upsert per-player per-game stat line |
| `/api/photos/upload` | POST | **Admin** | Multipart: `file, tournament_id, game_id?, caption?, uploaded_by?` |
| `/api/photos?tournament_id=&game_id=` | GET | — | Public photo list |
| `/api/photos/file/:id` | GET | — | Stream photo bytes from R2 |
| `/api/photos/:id` | DELETE | Admin | Delete photo (R2 + D1) |

All admin endpoints require header: `X-Admin-Password: <current password>`.

## Data Architecture
- **Storage**:
  - **Cloudflare D1** (SQLite) — relational data
  - **Cloudflare R2** — photo file bytes (key stored in `game_photos.r2_key`)
- **Data Models**:
  - `admin_settings` (id=1, **admin_password**, updated_at) — single-row, password changeable from UI
  - `tournaments` (name, location, dates, description)
  - `teams` (tournament_id, name, coach, **access_code unique**) — team password for whole-team view
  - `players` (team_id, name, jersey_number, position, height, **access_code unique**)
  - `games` (tournament_id, home_team_id, away_team_id, scores, date, venue)
  - `player_stats` (game_id + player_id unique; minutes/points/rebounds/assists/steals/blocks/turnovers/fouls + FG/3P/FT made & attempted)
  - `game_photos` (tournament_id, game_id, r2_key, caption, uploaded_by, content_type, size_bytes)
- **Player of the Day algorithm**: highest `points + 1.2·reb + 1.5·ast + 2·stl + 2·blk − to` across all uploaded stat lines (latest game wins ties). Restrictable by tournament via `?tournament_id=`.

## Currently Completed Features
- Hidden admin panel at `/secure-admin-panel-x7q` (no public link)
- Changeable admin password from the Settings tab; stored in D1, persists across deployments
- Team passwords (auto-generated or admin-set, editable) gating a whole-team stats view
- Per-player access codes gating the personal stats view
- Public player landing page leads with **Player of the Day** (no login required)
- Admin-only photo upload/delete; public viewing of photos
- Tournament / team / player / game / stat-line CRUD
- Player dashboard: career totals, season averages w/ shooting percentages, per-game table
- Team dashboard: W-L record, PPG for/against, differential, roster averages sorted by PPG, game results list
- Public tournament page with collapsible per-game box scores

## Features Not Yet Implemented
- Tournament-wide leaderboard (top scorer / rebounder / etc.)
- Photo bulk-delete and reordering
- Public deployment to Cloudflare Pages (currently sandbox preview only — needs `setup_cloudflare_api_key` + `wrangler pages deploy`)
- Multi-admin roles (currently a single shared admin password)
- Excel/CSV bulk import of stat lines

## Recommended Next Steps
1. Run `setup_cloudflare_api_key`, then `npx wrangler d1 create webapp-production`, paste the returned `database_id` into `wrangler.jsonc`, `npx wrangler r2 bucket create webapp-photos`, then `npm run build && npx wrangler pages deploy dist --project-name <chosen-name>`. After deploy, run `npx wrangler d1 migrations apply webapp-production` against the remote to provision tables.
2. Add a "Tournament Leaders" widget on `/tournament/:id` driven by SQL aggregates.
3. Add bulk CSV stat import in the Stats tab.

## Deployment
- **Platform**: Cloudflare Pages + Workers + D1 + R2
- **Status**: Running locally in sandbox (Cloudflare Pages deployment pending API key setup)
- **Tech Stack**: Hono + JSX (SSR) + Vite + TypeScript + Tailwind (CDN) + Font Awesome (CDN) + Axios (CDN)
- **Local Dev**: `npm run build && pm2 start ecosystem.config.cjs` → http://localhost:3000
- **Default Admin Password**: `admin123` (change from Settings tab after first login)
- **Sample Team Codes**: `HAWKS-2026`, `WOLVES-2026`, `KINGS-2026`, `SLAM-2026`
- **Sample Player Codes**: `HAWK-MJ23`, `HAWK-DC11`, `WOLF-JR05`, `KING-CM07`, `SLAM-RF09`, …
- **Last Updated**: 2026-05-10
