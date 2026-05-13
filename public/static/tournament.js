// Tournament detail page — dark theme
const root = document.getElementById('tournament-app')
const tournamentId = document.getElementById('page-tournament').dataset.tournamentId

function escapeHtml(s) {
  if (s === null || s === undefined) return ''
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
}

function statusOf(t) {
  const today = new Date().toISOString().slice(0, 10)
  const start = t.start_date || ''
  const end = t.end_date || ''
  if (start && end) {
    if (today < start) return 'upcoming'
    if (today > end) return 'completed'
    return 'active'
  }
  if (start && today < start) return 'upcoming'
  if (end && today > end) return 'completed'
  return 'active'
}

function badge(s) {
  if (s === 'active') return '<span class="badge badge-active">Active</span>'
  if (s === 'upcoming') return '<span class="badge badge-upcoming">Upcoming</span>'
  return '<span class="badge badge-completed">Completed</span>'
}

async function load() {
  try {
    const { data } = await axios.get(`/api/tournaments/${tournamentId}`)
    const teamsWithPlayers = await Promise.all(
      data.teams.map(async t => {
        const r = await axios.get(`/api/teams/${t.id}`)
        return { team: t, players: r.data.players }
      })
    )
    render(data, teamsWithPlayers)
  } catch (e) {
    root.innerHTML = `<div class="alert alert-error">Failed to load tournament</div>`
  }
}

function render(data, teamsWithPlayers) {
  const t = data.tournament
  const s = statusOf(t)
  root.innerHTML = `
    <section class="hero mb-6">
      <div class="accent-bar"></div>
      <div class="flex flex-wrap justify-between items-start gap-3 mb-2">
        ${badge(s)}
        <a href="/" class="btn btn-ghost btn-sm"><i class="fas fa-arrow-left"></i>Back</a>
      </div>
      <h1 class="text-4xl md:text-5xl font-extrabold uppercase text-white">${escapeHtml(t.name)}</h1>
      <div class="mt-3 space-y-1 text-muted">
        ${t.location ? `<p><i class="fas fa-map-marker-alt mr-2 text-accent"></i>${escapeHtml(t.location)}</p>` : ''}
        ${t.start_date ? `<p><i class="fas fa-calendar mr-2 text-accent"></i>${escapeHtml(t.start_date)}${t.end_date ? ' — ' + escapeHtml(t.end_date) : ''}</p>` : ''}
      </div>
      ${t.description ? `<p class="text-gray-300 mt-3">${escapeHtml(t.description)}</p>` : ''}
    </section>

    <section class="card-flat mb-6">
      <h2 class="font-heading uppercase text-xl font-bold mb-4 text-white"><i class="fas fa-users text-accent mr-2"></i>Teams (${teamsWithPlayers.length})</h2>
      ${teamsWithPlayers.length === 0 ? '<p class="text-muted">No teams yet.</p>' : `
        <div class="grid md:grid-cols-2 gap-4">
          ${teamsWithPlayers.map(({team, players}) => `
            <div class="card-flat" style="padding:1rem;">
              <h3 class="font-heading uppercase font-bold text-lg text-white">${escapeHtml(team.name)}</h3>
              ${team.coach ? `<p class="text-xs text-muted mb-2">Coach: ${escapeHtml(team.coach)}</p>` : ''}
              ${players.length === 0 ? '<p class="text-sm text-dim">No players yet.</p>' : `
                <ul class="text-sm space-y-1 mt-2">
                  ${players.map(p => `
                    <li class="py-1 border-b border-navy-border last:border-0 flex items-center gap-2">
                      <span class="font-heading font-bold text-accent w-8">${p.jersey_number ? '#' + p.jersey_number : ''}</span>
                      <span class="text-white">${escapeHtml(p.name)}</span>
                      ${p.position ? `<span class="text-muted text-xs"> · ${escapeHtml(p.position)}</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>
          `).join('')}
        </div>
      `}
    </section>

    <section class="card-flat">
      <h2 class="font-heading uppercase text-xl font-bold mb-4 text-white"><i class="fas fa-basketball text-accent mr-2"></i>Games (${data.games.length})</h2>
      ${data.games.length === 0 ? '<p class="text-muted">No games yet.</p>' : `
        <div class="space-y-2">
          ${data.games.map(g => `
            <div class="game-row p-3 rounded-lg cursor-pointer transition" style="background:rgba(13,27,42,0.5);border:1px solid var(--navy-border)" data-id="${g.id}">
              <div class="flex justify-between items-center flex-wrap gap-2">
                <div class="font-heading">
                  <span class="text-white">${escapeHtml(g.home_team_name)}</span>
                  <span class="text-2xl mx-2 font-extrabold ${g.home_score > g.away_score ? 'text-accent' : 'text-white'}">${g.home_score}</span>
                  <span class="text-muted">—</span>
                  <span class="text-2xl mx-2 font-extrabold ${g.away_score > g.home_score ? 'text-accent' : 'text-white'}">${g.away_score}</span>
                  <span class="text-white">${escapeHtml(g.away_team_name)}</span>
                </div>
                <div class="text-sm text-muted">${escapeHtml(g.game_date || '')} ${g.venue ? '· ' + escapeHtml(g.venue) : ''}</div>
              </div>
              <div class="game-detail mt-3" id="game-${g.id}" style="display:none"></div>
            </div>
          `).join('')}
        </div>
      `}
    </section>
  `

  document.querySelectorAll('.game-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      e.stopPropagation()
      const id = row.dataset.id
      const detail = document.getElementById(`game-${id}`)
      if (detail.style.display === 'block') { detail.style.display = 'none'; return }
      detail.innerHTML = '<div class="text-muted text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</div>'
      detail.style.display = 'block'
      try {
        const { data } = await axios.get(`/api/games/${id}`)
        renderGameDetail(detail, data)
      } catch (err) {
        detail.innerHTML = '<div class="alert alert-error">Failed to load</div>'
      }
    })
  })
}

function renderGameDetail(el, data) {
  const stats = data.stats || []
  if (stats.length === 0) {
    el.innerHTML = '<p class="text-sm text-muted">No stats recorded for this game yet.</p>'
    return
  }
  el.innerHTML = `
    <div class="overflow-x-auto mt-2"><table class="stats-table">
      <thead>
        <tr><th>#</th><th class="text-left">Player</th><th>PTS</th><th>REB</th><th>AST</th></tr>
      </thead>
      <tbody>
        ${stats.map(s => `
          <tr>
            <td class="font-heading font-bold text-accent">${s.jersey_number ?? ''}</td>
            <td class="text-left font-heading text-white">${escapeHtml(s.player_name)}</td>
            <td class="font-heading font-bold text-white">${s.points}</td>
            <td class="font-heading text-white">${s.rebounds}</td>
            <td class="font-heading text-white">${s.assists}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
  `
}

load()
