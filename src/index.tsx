import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  ADMIN_PASSWORD?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use(renderer)

// ---------- Helpers ----------
const ADMIN_PASSWORD_DEFAULT = 'admin123'

function checkAdmin(c: any): boolean {
  const password = c.req.header('X-Admin-Password') || ''
  const expected = c.env.ADMIN_PASSWORD || ADMIN_PASSWORD_DEFAULT
  return password === expected
}

function requireAdmin(c: any) {
  if (!checkAdmin(c)) {
    return c.json({ error: 'Unauthorized. Admin password required.' }, 401)
  }
  return null
}

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
  const guard = requireAdmin(c); if (guard) return guard
  const { name, location, start_date, end_date, description } = await c.req.json()
  if (!name) return c.json({ error: 'name required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO tournaments (name, location, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, location || null, start_date || null, end_date || null, description || null).run()
  return c.json({ id: result.meta.last_row_id, name })
})

app.delete('/api/tournaments/:id', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
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
  const guard = requireAdmin(c); if (guard) return guard
  const { tournament_id, name, coach } = await c.req.json()
  if (!tournament_id || !name) return c.json({ error: 'tournament_id and name required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO teams (tournament_id, name, coach) VALUES (?, ?, ?)'
  ).bind(tournament_id, name, coach || null).run()
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/teams/:id', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ---------- Players ----------
app.post('/api/players', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const { team_id, name, jersey_number, position, height, access_code } = await c.req.json()
  if (!team_id || !name) return c.json({ error: 'team_id and name required' }, 400)
  // generate code if not provided
  const code = access_code || generateAccessCode(name)
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO players (team_id, name, jersey_number, position, height, access_code) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(team_id, name, jersey_number || null, position || null, height || null, code).run()
    return c.json({ id: result.meta.last_row_id, access_code: code })
  } catch (e: any) {
    return c.json({ error: 'Could not create player: ' + e.message }, 400)
  }
})

app.delete('/api/players/:id', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Admin sees full player list (with access codes)
app.get('/api/admin/players', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const tournament_id = c.req.query('tournament_id')
  let query = `
    SELECT p.*, t.name as team_name
    FROM players p
    JOIN teams t ON p.team_id = t.id
  `
  const binds: any[] = []
  if (tournament_id) {
    query += ' WHERE t.tournament_id = ?'
    binds.push(tournament_id)
  }
  query += ' ORDER BY t.name, p.jersey_number'
  const stmt = c.env.DB.prepare(query)
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all()
  return c.json({ players: results })
})

// Player login: looks up by access code
app.post('/api/player/login', async (c) => {
  const { access_code } = await c.req.json()
  if (!access_code) return c.json({ error: 'access_code required' }, 400)
  const player = await c.env.DB.prepare(`
    SELECT p.*, t.name as team_name, t.tournament_id
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.access_code = ?
  `).bind(access_code).first()
  if (!player) return c.json({ error: 'Invalid access code' }, 404)
  return c.json({ player })
})

// Player stats summary (per game and totals)
app.get('/api/player/:id/stats', async (c) => {
  const id = c.req.param('id')
  const player = await c.env.DB.prepare(`
    SELECT p.*, t.name as team_name, t.tournament_id
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

  // Compute totals & averages
  const rows: any[] = games.results || []
  const n = rows.length
  const totals = {
    games: n,
    minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
    turnovers: 0, fouls: 0,
    fg_made: 0, fg_attempted: 0,
    three_made: 0, three_attempted: 0,
    ft_made: 0, ft_attempted: 0,
  }
  for (const r of rows) {
    totals.minutes += r.minutes || 0
    totals.points += r.points || 0
    totals.rebounds += r.rebounds || 0
    totals.assists += r.assists || 0
    totals.steals += r.steals || 0
    totals.blocks += r.blocks || 0
    totals.turnovers += r.turnovers || 0
    totals.fouls += r.fouls || 0
    totals.fg_made += r.fg_made || 0
    totals.fg_attempted += r.fg_attempted || 0
    totals.three_made += r.three_made || 0
    totals.three_attempted += r.three_attempted || 0
    totals.ft_made += r.ft_made || 0
    totals.ft_attempted += r.ft_attempted || 0
  }
  const averages = n === 0 ? null : {
    minutes: +(totals.minutes / n).toFixed(1),
    points: +(totals.points / n).toFixed(1),
    rebounds: +(totals.rebounds / n).toFixed(1),
    assists: +(totals.assists / n).toFixed(1),
    steals: +(totals.steals / n).toFixed(1),
    blocks: +(totals.blocks / n).toFixed(1),
    turnovers: +(totals.turnovers / n).toFixed(1),
    fg_pct: totals.fg_attempted ? +((totals.fg_made / totals.fg_attempted) * 100).toFixed(1) : 0,
    three_pct: totals.three_attempted ? +((totals.three_made / totals.three_attempted) * 100).toFixed(1) : 0,
    ft_pct: totals.ft_attempted ? +((totals.ft_made / totals.ft_attempted) * 100).toFixed(1) : 0,
  }

  return c.json({ player, games: rows, totals, averages })
})

// ---------- Games ----------
app.post('/api/games', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
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
  const guard = requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM games WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ---------- Player Stats (admin upload) ----------
app.post('/api/stats', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const body = await c.req.json()
  const { game_id, player_id } = body
  if (!game_id || !player_id) return c.json({ error: 'game_id and player_id required' }, 400)
  const fields = ['minutes', 'points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted']
  const values = fields.map(f => body[f] || 0)
  // upsert
  await c.env.DB.prepare(`
    INSERT INTO player_stats (game_id, player_id, minutes, points, rebounds, assists, steals, blocks, turnovers, fouls, fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id, player_id) DO UPDATE SET
      minutes=excluded.minutes,
      points=excluded.points,
      rebounds=excluded.rebounds,
      assists=excluded.assists,
      steals=excluded.steals,
      blocks=excluded.blocks,
      turnovers=excluded.turnovers,
      fouls=excluded.fouls,
      fg_made=excluded.fg_made,
      fg_attempted=excluded.fg_attempted,
      three_made=excluded.three_made,
      three_attempted=excluded.three_attempted,
      ft_made=excluded.ft_made,
      ft_attempted=excluded.ft_attempted
  `).bind(game_id, player_id, ...values).run()
  return c.json({ success: true })
})

// ---------- Photos (R2) ----------
// Upload photo (multipart). Anyone can upload (community gallery).
app.post('/api/photos/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const tournament_id = formData.get('tournament_id') as string
  const game_id = formData.get('game_id') as string | null
  const caption = (formData.get('caption') as string) || null
  const uploaded_by = (formData.get('uploaded_by') as string) || 'Anonymous'
  if (!file || !tournament_id) return c.json({ error: 'file and tournament_id required' }, 400)
  if (!file.type.startsWith('image/')) return c.json({ error: 'Only image files allowed' }, 400)
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File too large (max 10MB)' }, 400)

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const r2_key = `photos/${tournament_id}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`
  const buf = await file.arrayBuffer()
  await c.env.R2.put(r2_key, buf, {
    httpMetadata: { contentType: file.type }
  })
  const result = await c.env.DB.prepare(`
    INSERT INTO game_photos (game_id, tournament_id, r2_key, caption, uploaded_by, content_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(game_id || null, tournament_id, r2_key, caption, uploaded_by, file.type, file.size).run()

  return c.json({ id: result.meta.last_row_id, r2_key, url: `/api/photos/file/${result.meta.last_row_id}` })
})

// List photos for a tournament (optionally filtered by game)
app.get('/api/photos', async (c) => {
  const tournament_id = c.req.query('tournament_id')
  const game_id = c.req.query('game_id')
  if (!tournament_id) return c.json({ error: 'tournament_id required' }, 400)
  let query = `
    SELECT gp.*, g.game_date,
           ht.name as home_team_name, at.name as away_team_name
    FROM game_photos gp
    LEFT JOIN games g ON gp.game_id = g.id
    LEFT JOIN teams ht ON g.home_team_id = ht.id
    LEFT JOIN teams at ON g.away_team_id = at.id
    WHERE gp.tournament_id = ?
  `
  const binds: any[] = [tournament_id]
  if (game_id) { query += ' AND gp.game_id = ?'; binds.push(game_id) }
  query += ' ORDER BY gp.created_at DESC'
  const { results } = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json({ photos: results })
})

// Stream the photo file from R2
app.get('/api/photos/file/:id', async (c) => {
  const id = c.req.param('id')
  const photo = await c.env.DB.prepare('SELECT r2_key, content_type FROM game_photos WHERE id = ?').bind(id).first<any>()
  if (!photo) return c.notFound()
  const obj = await c.env.R2.get(photo.r2_key)
  if (!obj) return c.notFound()
  return new Response(obj.body, {
    headers: {
      'Content-Type': photo.content_type || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    }
  })
})

app.delete('/api/photos/:id', async (c) => {
  const guard = requireAdmin(c); if (guard) return guard
  const id = c.req.param('id')
  const photo = await c.env.DB.prepare('SELECT r2_key FROM game_photos WHERE id = ?').bind(id).first<any>()
  if (photo) {
    try { await c.env.R2.delete(photo.r2_key) } catch (e) {}
    await c.env.DB.prepare('DELETE FROM game_photos WHERE id = ?').bind(id).run()
  }
  return c.json({ success: true })
})

// Admin auth check
app.post('/api/admin/check', async (c) => {
  if (!checkAdmin(c)) return c.json({ ok: false }, 401)
  return c.json({ ok: true })
})

// ---------- Helpers ----------
function generateAccessCode(name: string): string {
  const initials = name.split(/\s+/).map(s => s[0]).join('').toUpperCase().slice(0, 3)
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${initials}-${rand}`
}

// ---------- Page Routes ----------
app.get('/', (c) => c.render(<HomePage />))
app.get('/admin', (c) => c.render(<AdminPage />))
app.get('/player', (c) => c.render(<PlayerPage />))
app.get('/tournament/:id', (c) => c.render(<TournamentPage id={c.req.param('id')} />))
app.get('/gallery/:id', (c) => c.render(<GalleryPage id={c.req.param('id')} />))

// ---------- JSX Page Components ----------
function HomePage() {
  return (
    <div id="page-home">
      <Header />
      <main class="max-w-6xl mx-auto px-4 py-10">
        <section class="text-center mb-12">
          <h1 class="text-5xl font-bold text-orange-600 mb-4">
            <i class="fas fa-basketball mr-3"></i>HoopStats
          </h1>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Track basketball tournament stats. Players view their performance, fans share game photos.
          </p>
        </section>

        <section class="grid md:grid-cols-3 gap-6 mb-12">
          <a href="/admin" class="card hover:shadow-lg transition border-l-4 border-orange-500">
            <i class="fas fa-clipboard-list text-3xl text-orange-500 mb-3"></i>
            <h2 class="text-xl font-bold mb-2">Admin Panel</h2>
            <p class="text-gray-600">Upload tournaments, teams, players, and game stats.</p>
          </a>
          <a href="/player" class="card hover:shadow-lg transition border-l-4 border-blue-500">
            <i class="fas fa-user-circle text-3xl text-blue-500 mb-3"></i>
            <h2 class="text-xl font-bold mb-2">Player Login</h2>
            <p class="text-gray-600">Enter your access code to view your personal stats.</p>
          </a>
          <div class="card border-l-4 border-green-500">
            <i class="fas fa-images text-3xl text-green-500 mb-3"></i>
            <h2 class="text-xl font-bold mb-2">Game Photos</h2>
            <p class="text-gray-600">Browse and upload pictures from each tournament's gallery.</p>
          </div>
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
      <Header />
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
      <Header />
      <main class="max-w-5xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6"><i class="fas fa-user-circle text-blue-500 mr-2"></i>Player Stats</h1>
        <div id="player-app">Loading...</div>
      </main>
      <script src="/static/player.js"></script>
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

function GalleryPage({ id }: { id: string }) {
  return (
    <div id="page-gallery" data-tournament-id={id}>
      <Header />
      <main class="max-w-6xl mx-auto px-4 py-8">
        <div id="gallery-app">Loading...</div>
      </main>
      <script src="/static/gallery.js"></script>
    </div>
  )
}

function Header() {
  return (
    <header class="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
      <nav class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
        <a href="/" class="text-2xl font-bold flex items-center">
          <i class="fas fa-basketball mr-2"></i>HoopStats
        </a>
        <div class="flex gap-4 text-sm font-medium">
          <a href="/" class="hover:text-orange-100"><i class="fas fa-home mr-1"></i>Home</a>
          <a href="/player" class="hover:text-orange-100"><i class="fas fa-user mr-1"></i>Player</a>
          <a href="/admin" class="hover:text-orange-100"><i class="fas fa-cog mr-1"></i>Admin</a>
        </div>
      </nav>
    </header>
  )
}

export default app
