import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use(renderer)

// ---------- Helpers ----------
const ADMIN_PASSWORD_FALLBACK = 'admin123'

async function getAdminPassword(c: any): Promise<string> {
  try {
    const row = await c.env.DB.prepare('SELECT admin_password FROM admin_settings WHERE id = 1').first<any>()
    if (row && row.admin_password) return row.admin_password
  } catch (e) {}
  return c.env.ADMIN_PASSWORD || ADMIN_PASSWORD_FALLBACK
}

async function checkAdmin(c: any): Promise<boolean> {
  const password = c.req.header('X-Admin-Password') || ''
  const expected = await getAdminPassword(c)
  return password === expected
}

async function requireAdmin(c: any) {
  if (!(await checkAdmin(c))) {
    return c.json({ error: 'Unauthorized. Admin password required.' }, 401)
  }
  return null
}

// ---------- Admin Settings ----------
app.post('/api/admin/check', async (c) => {
  if (!(await checkAdmin(c))) return c.json({ ok: false }, 401)
  return c.json({ ok: true })
})

app.post('/api/admin/change-password', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const { new_password } = await c.req.json()
  if (!new_password || typeof new_password !== 'string' || new_password.length < 4) {
    return c.json({ error: 'New password must be at least 4 characters' }, 400)
  }
  await c.env.DB.prepare('UPDATE admin_settings SET admin_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').bind(new_password).run()
  return c.json({ ok: true })
})

// ---------- Tournaments ----------
app.get('/api/tournaments', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tournaments ORDER BY created_at DESC'
  ).all()
  return c.json({ tournaments: results })
})

app.get('/api/tournaments/:id', async (c) => {
  const id = c.req.param('id')
  const t = await c.env.DB.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first()
  if (!t) return c.json({ error: 'Tournament not found' }, 404)
  const teams = await c.env.DB.prepare('SELECT * FROM teams WHERE tournament_id = ? ORDER BY name').bind(id).all()
  const games = await c.env.DB.prepare(`
    SELECT g.*, ht.name as home_team_name, at.name as away_team_name
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.tournament_id = ?
    ORDER BY g.game_date DESC
  `).bind(id).all()
  return c.json({ tournament: t, teams: teams.results, games: games.results })
})

app.post('/api/tournaments', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const { name, location, start_date, end_date, description } = await c.req.json()
  if (!name) return c.json({ error: 'name required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO tournaments (name, location, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, location || null, start_date || null, end_date || null, description || null).run()
  return c.json({ id: result.meta.last_row_id, name })
})

app.delete('/api/tournaments/:id', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM tournaments WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ---------- Teams ----------
app.get('/api/teams/:id', async (c) => {
  const id = c.req.param('id')
  const team = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first()
  if (!team) return c.json({ error: 'Team not found' }, 404)
  const players = await c.env.DB.prepare('SELECT id, team_id, name, jersey_number, position, height FROM players WHERE team_id = ? ORDER BY jersey_number').bind(id).all()
  return c.json({ team, players: players.results })
})

app.post('/api/teams', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const { tournament_id, name, coach } = await c.req.json()
  if (!tournament_id || !name) return c.json({ error: 'tournament_id and name required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO teams (tournament_id, name, coach) VALUES (?, ?, ?)'
  ).bind(tournament_id, name, coach || null).run()
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/teams/:id', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Whole-team stats (per-player season totals + averages, plus team aggregates)
app.get('/api/team/:id/stats', async (c) => {
  const id = c.req.param('id')
  const team = await c.env.DB.prepare(`
    SELECT t.*, tr.name as tournament_name
    FROM teams t
    LEFT JOIN tournaments tr ON tr.id = t.tournament_id
    WHERE t.id = ?
  `).bind(id).first<any>()
  if (!team) return c.json({ error: 'Team not found' }, 404)

  const players = await c.env.DB.prepare(
    'SELECT id, team_id, name, jersey_number, position, height FROM players WHERE team_id = ? ORDER BY jersey_number'
  ).bind(id).all()

  const playerTotals: any[] = []
  for (const p of (players.results as any[])) {
    const rows = await c.env.DB.prepare('SELECT * FROM player_stats WHERE player_id = ?').bind(p.id).all()
    const list = (rows.results as any[]) || []
    const n = list.length
    const t = { games: n, points: 0, rebounds: 0, assists: 0 }
    for (const r of list) {
      t.points += r.points || 0
      t.rebounds += r.rebounds || 0
      t.assists += r.assists || 0
    }
    const avg = n === 0 ? null : {
      points: +(t.points / n).toFixed(1),
      rebounds: +(t.rebounds / n).toFixed(1),
      assists: +(t.assists / n).toFixed(1),
    }
    playerTotals.push({ player: p, totals: t, averages: avg })
  }

  const games = await c.env.DB.prepare(`
    SELECT g.*, ht.name as home_team_name, at.name as away_team_name
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.home_team_id = ? OR g.away_team_id = ?
    ORDER BY g.game_date DESC
  `).bind(id, id).all()

  let wins = 0, losses = 0, pf = 0, pa = 0
  for (const g of (games.results as any[])) {
    const isHome = g.home_team_id == id
    const own = isHome ? g.home_score : g.away_score
    const opp = isHome ? g.away_score : g.home_score
    pf += own || 0; pa += opp || 0
    if ((own || 0) > (opp || 0)) wins++
    else if ((own || 0) < (opp || 0)) losses++
  }

  return c.json({
    team,
    record: { wins, losses, points_for: pf, points_against: pa, games: (games.results as any[]).length },
    games: games.results,
    players: playerTotals
  })
})

// ---------- Players ----------
app.get('/api/players', async (c) => {
  const tournament_id = c.req.query('tournament_id')
  const team_id = c.req.query('team_id')
  let query = `
    SELECT p.id, p.team_id, p.name, p.jersey_number, p.position, p.height, p.created_at,
           t.name as team_name, t.tournament_id
    FROM players p
    JOIN teams t ON p.team_id = t.id
  `
  const binds: any[] = []
  const where: string[] = []
  if (tournament_id) { where.push('t.tournament_id = ?'); binds.push(tournament_id) }
  if (team_id) { where.push('p.team_id = ?'); binds.push(team_id) }
  if (where.length) query += ' WHERE ' + where.join(' AND ')
  query += ' ORDER BY t.name, p.jersey_number'
  const stmt = c.env.DB.prepare(query)
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all()
  return c.json({ players: results })
})

app.post('/api/players', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const { team_id, name, jersey_number, position, height } = await c.req.json()
  if (!team_id || !name) return c.json({ error: 'team_id and name required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO players (team_id, name, jersey_number, position, height) VALUES (?, ?, ?, ?, ?)'
  ).bind(team_id, name, jersey_number || null, position || null, height || null).run()
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/players/:id', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Player profile (public, no auth, no code)
app.get('/api/player/:id', async (c) => {
  const id = c.req.param('id')
  const player = await c.env.DB.prepare(`
    SELECT p.id, p.team_id, p.name, p.jersey_number, p.position, p.height, p.created_at,
           t.name as team_name, t.tournament_id
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.id = ?
  `).bind(id).first()
  if (!player) return c.json({ error: 'Player not found' }, 404)
  return c.json({ player })
})

// Player stats summary (per game + totals + averages) — PTS/REB/AST only
app.get('/api/player/:id/stats', async (c) => {
  const id = c.req.param('id')
  const player = await c.env.DB.prepare(`
    SELECT p.id, p.team_id, p.name, p.jersey_number, p.position, p.height, p.created_at,
           t.name as team_name, t.tournament_id
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.id = ?
  `).bind(id).first()
  if (!player) return c.json({ error: 'Player not found' }, 404)

  const games = await c.env.DB.prepare(`
    SELECT ps.*, g.game_date, g.venue, g.home_score, g.away_score,
           ht.name as home_team_name, at.name as away_team_name
    FROM player_stats ps
    JOIN games g ON ps.game_id = g.id
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE ps.player_id = ?
    ORDER BY g.game_date DESC
  `).bind(id).all()

  const rows: any[] = games.results || []
  const n = rows.length
  const totals = { games: n, points: 0, rebounds: 0, assists: 0 }
  for (const r of rows) {
    totals.points += r.points || 0
    totals.rebounds += r.rebounds || 0
    totals.assists += r.assists || 0
  }
  const averages = n === 0 ? null : {
    points: +(totals.points / n).toFixed(1),
    rebounds: +(totals.rebounds / n).toFixed(1),
    assists: +(totals.assists / n).toFixed(1),
  }

  return c.json({ player, games: rows, totals, averages })
})

// Player of the Day — by PTS + REB + AST (game-date tiebreaker)
app.get('/api/player-of-the-day', async (c) => {
  const tournament_id = c.req.query('tournament_id')
  let query = `
    SELECT ps.*, p.name as player_name, p.jersey_number, p.position, p.height,
           t.name as team_name, t.tournament_id,
           g.game_date, g.home_score, g.away_score,
           ht.name as home_team_name, at.name as away_team_name
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    JOIN games g ON ps.game_id = g.id
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
  `
  const binds: any[] = []
  if (tournament_id) { query += ' WHERE t.tournament_id = ?'; binds.push(tournament_id) }
  query += ' ORDER BY (ps.points + ps.rebounds + ps.assists) DESC, g.game_date DESC LIMIT 1'
  const stmt = c.env.DB.prepare(query)
  const top = binds.length ? await stmt.bind(...binds).first() : await stmt.first()
  return c.json({ player_of_the_day: top || null })
})

// ---------- Games ----------
app.post('/api/games', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const { tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue, notes } = await c.req.json()
  if (!tournament_id || !home_team_id || !away_team_id) return c.json({ error: 'tournament_id, home_team_id, away_team_id required' }, 400)
  const result = await c.env.DB.prepare(`
    INSERT INTO games (tournament_id, home_team_id, away_team_id, home_score, away_score, game_date, venue, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(tournament_id, home_team_id, away_team_id, home_score || 0, away_score || 0, game_date || null, venue || null, notes || null).run()
  return c.json({ id: result.meta.last_row_id })
})

app.get('/api/games/:id', async (c) => {
  const id = c.req.param('id')
  const game = await c.env.DB.prepare(`
    SELECT g.*, ht.name as home_team_name, at.name as away_team_name
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.id = ?
  `).bind(id).first()
  if (!game) return c.json({ error: 'Game not found' }, 404)
  const stats = await c.env.DB.prepare(`
    SELECT ps.*, p.name as player_name, p.jersey_number, p.team_id
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.game_id = ?
    ORDER BY p.team_id, p.jersey_number
  `).bind(id).all()
  return c.json({ game, stats: stats.results })
})

app.delete('/api/games/:id', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM games WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ---------- Player Stats (admin upload) — PTS/REB/AST only ----------
app.post('/api/stats', async (c) => {
  const guard = await requireAdmin(c); if (guard) return guard
  const body = await c.req.json()
  const { game_id, player_id, points, rebounds, assists } = body
  if (!game_id || !player_id) return c.json({ error: 'game_id and player_id required' }, 400)
  await c.env.DB.prepare(`
    INSERT INTO player_stats (game_id, player_id, points, rebounds, assists)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(game_id, player_id) DO UPDATE SET
      points=excluded.points,
      rebounds=excluded.rebounds,
      assists=excluded.assists
  `).bind(game_id, player_id, points || 0, rebounds || 0, assists || 0).run()
  return c.json({ success: true })
})

// ---------- Page Routes ----------
app.get('/', (c) => c.render(<HomePage />))
app.get('/player', (c) => c.render(<PlayerPage />))
app.get('/team', (c) => c.render(<TeamPage />))
app.get('/tournament/:id', (c) => c.render(<TournamentPage id={c.req.param('id')} />))
// Hidden admin panel
app.get('/secure-admin-panel-x7q', (c) => c.render(<AdminPage />))
// Legacy redirect
app.get('/admin', (c) => c.redirect('/player'))

// ---------- JSX Page Components ----------
function HomePage() {
  return (
    <div id="page-home">
      <Header active="home" />
      <main class="max-w-6xl mx-auto px-4 py-10">
        <section class="text-center mb-12">
          <h1 class="text-5xl font-bold text-orange-600 mb-4">
            <i class="fas fa-basketball mr-3"></i>HoopStats
          </h1>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Basketball tournament stats: points, rebounds, and assists. See the Player of the Day, browse any player, or pull up a whole team's stats.
          </p>
        </section>

        <section class="grid md:grid-cols-2 gap-6 mb-12">
          <a href="/player" class="card hover:shadow-lg transition border-l-4 border-blue-500">
            <i class="fas fa-user-circle text-3xl text-blue-500 mb-3"></i>
            <h2 class="text-xl font-bold mb-2">Player Stats</h2>
            <p class="text-gray-600">Player of the Day + pick any player to see their PTS / REB / AST.</p>
          </a>
          <a href="/team" class="card hover:shadow-lg transition border-l-4 border-purple-500">
            <i class="fas fa-users text-3xl text-purple-500 mb-3"></i>
            <h2 class="text-xl font-bold mb-2">Team Stats</h2>
            <p class="text-gray-600">Pick a team to see the whole roster's averages and W/L record.</p>
          </a>
        </section>

        <section>
          <h2 class="text-2xl font-bold mb-4"><i class="fas fa-trophy text-yellow-500 mr-2"></i>Tournaments</h2>
          <div id="tournaments-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="text-gray-500">Loading tournaments...</div>
          </div>
        </section>
      </main>
      <script src="/static/home.js"></script>
    </div>
  )
}

function AdminPage() {
  return (
    <div id="page-admin">
      <Header showAdmin={true} active="admin" />
      <main class="max-w-6xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6"><i class="fas fa-clipboard-list text-orange-500 mr-2"></i>Admin Panel</h1>
        <div id="admin-app">Loading...</div>
      </main>
      <script src="/static/admin.js"></script>
    </div>
  )
}

function PlayerPage() {
  return (
    <div id="page-player">
      <Header active="player" />
      <main class="max-w-5xl mx-auto px-4 py-8">
        <div id="player-app">Loading...</div>
      </main>
      <script src="/static/player.js"></script>
    </div>
  )
}

function TeamPage() {
  return (
    <div id="page-team">
      <Header active="team" />
      <main class="max-w-6xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6"><i class="fas fa-users text-purple-500 mr-2"></i>Team Stats</h1>
        <div id="team-app">Loading...</div>
      </main>
      <script src="/static/team.js"></script>
    </div>
  )
}

function TournamentPage({ id }: { id: string }) {
  return (
    <div id="page-tournament" data-tournament-id={id}>
      <Header />
      <main class="max-w-6xl mx-auto px-4 py-8">
        <div id="tournament-app">Loading...</div>
      </main>
      <script src="/static/tournament.js"></script>
    </div>
  )
}

function Header({ showAdmin = false, active = '' }: { showAdmin?: boolean, active?: string }) {
  const linkClass = (key: string) =>
    active === key
      ? 'text-orange-500 hover:text-orange-400'
      : 'text-white hover:text-orange-300'
  return (
    <header class="bg-black text-white shadow-lg">
      <nav class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
        <a href="/" class="text-2xl font-bold flex items-center text-white">
          <i class="fas fa-basketball mr-2 text-orange-500"></i>HoopStats
        </a>
        <div class="flex gap-4 text-sm font-medium">
          <a href="/" class={linkClass('home')}><i class="fas fa-home mr-1"></i>Home</a>
          <a href="/player" class={linkClass('player')}><i class="fas fa-user mr-1"></i>Player</a>
          <a href="/team" class={linkClass('team')}><i class="fas fa-users mr-1"></i>Team</a>
          {showAdmin && <a href="/secure-admin-panel-x7q" class={linkClass('admin')}><i class="fas fa-cog mr-1"></i>Admin</a>}
        </div>
      </nav>
    </header>
  )
}

export default app
