// Team page — dropdown-based team selection (no login), PTS/REB/AST only
const root = document.getElementById('team-app')

const state = {
  tournaments: [],
  teams: [],
  selectedTournamentId: '',
  selectedTeamId: '',
}

function render() {
  root.innerHTML = `
    <section class="card mb-6">
      <p class="text-gray-600 mb-4 text-sm">Pick a tournament and team to see the whole roster's PTS / REB / AST averages and record.</p>
      <div class="grid md:grid-cols-2 gap-3">
        <select id="sel-tournament" class="border rounded px-3 py-2">
          <option value="">Select tournament...</option>
        </select>
        <select id="sel-team" class="border rounded px-3 py-2" disabled>
          <option value="">Select team...</option>
        </select>
      </div>
    </section>
    <div id="team-detail"></div>
  `
  document.getElementById('sel-tournament').addEventListener('change', onTournamentChange)
  document.getElementById('sel-team').addEventListener('change', onTeamChange)
}

async function loadTournaments() {
  const { data } = await axios.get('/api/tournaments')
  state.tournaments = data.tournaments || []
  const sel = document.getElementById('sel-tournament')
  sel.innerHTML = '<option value="">Select tournament...</option>' +
    state.tournaments.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('')
}

async function onTournamentChange(e) {
  state.selectedTournamentId = e.target.value
  state.selectedTeamId = ''
  document.getElementById('team-detail').innerHTML = ''
  const selTeam = document.getElementById('sel-team')
  if (!state.selectedTournamentId) {
    selTeam.innerHTML = '<option value="">Select team...</option>'
    selTeam.disabled = true
    return
  }
  const { data } = await axios.get('/api/tournaments/' + state.selectedTournamentId)
  state.teams = data.teams || []
  selTeam.innerHTML = '<option value="">Select team...</option>' +
    state.teams.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('')
  selTeam.disabled = false
}

async function onTeamChange(e) {
  state.selectedTeamId = e.target.value
  if (!state.selectedTeamId) {
    document.getElementById('team-detail').innerHTML = ''
    return
  }
  await loadTeamDetail(state.selectedTeamId)
}

async function loadTeamDetail(teamId) {
  const target = document.getElementById('team-detail')
  target.innerHTML = '<div class="text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</div>'
  try {
    const { data } = await axios.get('/api/team/' + teamId + '/stats')
    const { team, record, players, games } = data

    target.innerHTML = `
      <section class="card mb-6">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 class="text-2xl font-bold">${escapeHTML(team.name)}</h2>
          <div class="text-gray-600">${escapeHTML(team.tournament_name || '')}</div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="card text-center"><div class="text-3xl font-bold text-green-600">${record.wins}</div><div class="text-xs text-gray-500 uppercase">Wins</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-red-600">${record.losses}</div><div class="text-xs text-gray-500 uppercase">Losses</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-gray-700">${record.games}</div><div class="text-xs text-gray-500 uppercase">Games</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-orange-600">${record.points_for}</div><div class="text-xs text-gray-500 uppercase">PF</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-blue-600">${record.points_against}</div><div class="text-xs text-gray-500 uppercase">PA</div></div>
        </div>
      </section>

      <section class="card mb-6">
        <h3 class="text-xl font-bold mb-3"><i class="fas fa-clipboard-list text-purple-500 mr-2"></i>Roster</h3>
        ${players.length === 0
          ? '<div class="text-gray-500">No players on this team yet.</div>'
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead class="bg-gray-100"><tr>
                <th class="text-left p-2">#</th>
                <th class="text-left p-2">Player</th>
                <th class="text-left p-2">Pos</th>
                <th class="text-right p-2">GP</th>
                <th class="text-right p-2">PPG</th>
                <th class="text-right p-2">RPG</th>
                <th class="text-right p-2">APG</th>
                <th class="text-right p-2">Tot PTS</th>
                <th class="text-right p-2">Tot REB</th>
                <th class="text-right p-2">Tot AST</th>
              </tr></thead>
              <tbody>${players.map(p => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="p-2">${p.player.jersey_number ?? '—'}</td>
                  <td class="p-2 font-semibold">${escapeHTML(p.player.name)}</td>
                  <td class="p-2">${escapeHTML(p.player.position || '—')}</td>
                  <td class="p-2 text-right">${p.totals.games}</td>
                  <td class="p-2 text-right">${p.averages ? p.averages.points : '—'}</td>
                  <td class="p-2 text-right">${p.averages ? p.averages.rebounds : '—'}</td>
                  <td class="p-2 text-right">${p.averages ? p.averages.assists : '—'}</td>
                  <td class="p-2 text-right">${p.totals.points}</td>
                  <td class="p-2 text-right">${p.totals.rebounds}</td>
                  <td class="p-2 text-right">${p.totals.assists}</td>
                </tr>`).join('')}
              </tbody>
            </table></div>`
        }
      </section>

      <section class="card">
        <h3 class="text-xl font-bold mb-3"><i class="fas fa-calendar text-orange-500 mr-2"></i>Games</h3>
        ${(!games || games.length === 0)
          ? '<div class="text-gray-500">No games recorded.</div>'
          : `<div class="space-y-2">${games.map(g => {
              const isHome = g.home_team_id == team.id
              const own = isHome ? g.home_score : g.away_score
              const opp = isHome ? g.away_score : g.home_score
              const result = (own || 0) > (opp || 0) ? '<span class="text-green-600 font-bold">W</span>' : (own || 0) < (opp || 0) ? '<span class="text-red-600 font-bold">L</span>' : '<span class="text-gray-500 font-bold">T</span>'
              return `<div class="flex items-center justify-between p-2 border-b text-sm">
                <span>${escapeHTML(g.game_date || '—')}</span>
                <span>${escapeHTML(g.home_team_name)} ${g.home_score} – ${g.away_score} ${escapeHTML(g.away_team_name)}</span>
                <span>${result}</span>
              </div>`
            }).join('')}</div>`
        }
      </section>
    `
  } catch (err) {
    target.innerHTML = '<div class="text-red-600">Failed to load team stats.</div>'
  }
}

function escapeHTML(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

render()
loadTournaments()
