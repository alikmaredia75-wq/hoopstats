// Player page — Player of the Day + dropdown-based player selection (no login)
const root = document.getElementById('player-app')

const state = {
  tournaments: [],
  teams: [],
  players: [],
  selectedTournamentId: '',
  selectedTeamId: '',
  selectedPlayerId: '',
}

function render() {
  root.innerHTML = `
    <section id="potd-section" class="mb-8">
      <div class="text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading Player of the Day...</div>
    </section>

    <section class="card">
      <h2 class="text-2xl font-bold mb-4">
        <i class="fas fa-user-circle text-blue-500 mr-2"></i>Find a Player
      </h2>
      <p class="text-gray-600 mb-4 text-sm">Pick a tournament, team, and player to see their PTS / REB / AST.</p>
      <div class="grid md:grid-cols-3 gap-3 mb-4">
        <select id="sel-tournament" class="border rounded px-3 py-2">
          <option value="">Select tournament...</option>
        </select>
        <select id="sel-team" class="border rounded px-3 py-2" disabled>
          <option value="">Select team...</option>
        </select>
        <select id="sel-player" class="border rounded px-3 py-2" disabled>
          <option value="">Select player...</option>
        </select>
      </div>
      <div id="player-detail"></div>
    </section>
  `

  document.getElementById('sel-tournament').addEventListener('change', onTournamentChange)
  document.getElementById('sel-team').addEventListener('change', onTeamChange)
  document.getElementById('sel-player').addEventListener('change', onPlayerChange)
}

async function loadPOTD() {
  try {
    const { data } = await axios.get('/api/player-of-the-day')
    const p = data.player_of_the_day
    const section = document.getElementById('potd-section')
    if (!p) {
      section.innerHTML = `
        <div class="card bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500">
          <h2 class="text-2xl font-bold mb-2"><i class="fas fa-star text-yellow-500 mr-2"></i>Player of the Day</h2>
          <p class="text-gray-600">No stats recorded yet.</p>
        </div>`
      return
    }
    const total = (p.points || 0) + (p.rebounds || 0) + (p.assists || 0)
    section.innerHTML = `
      <div class="card bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500">
        <h2 class="text-2xl font-bold mb-3"><i class="fas fa-star text-yellow-500 mr-2"></i>Player of the Day</h2>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="text-3xl font-bold text-orange-700">${escapeHTML(p.player_name)}</div>
            <div class="text-gray-700 mt-1">
              #${p.jersey_number ?? '—'} • ${escapeHTML(p.team_name || '')}
              ${p.position ? ' • ' + escapeHTML(p.position) : ''}
            </div>
            <div class="text-sm text-gray-500 mt-1">
              ${escapeHTML(p.home_team_name)} ${p.home_score} – ${p.away_score} ${escapeHTML(p.away_team_name)}
              ${p.game_date ? ' • ' + escapeHTML(p.game_date) : ''}
            </div>
          </div>
          <div class="flex gap-3 text-center">
            <div class="bg-white rounded-lg px-4 py-3 shadow"><div class="text-3xl font-bold text-orange-600">${p.points}</div><div class="text-xs text-gray-500">PTS</div></div>
            <div class="bg-white rounded-lg px-4 py-3 shadow"><div class="text-3xl font-bold text-blue-600">${p.rebounds}</div><div class="text-xs text-gray-500">REB</div></div>
            <div class="bg-white rounded-lg px-4 py-3 shadow"><div class="text-3xl font-bold text-purple-600">${p.assists}</div><div class="text-xs text-gray-500">AST</div></div>
            <div class="bg-yellow-100 rounded-lg px-4 py-3 shadow"><div class="text-3xl font-bold text-yellow-700">${total}</div><div class="text-xs text-gray-600">SUM</div></div>
          </div>
        </div>
      </div>
    `
  } catch (e) {
    document.getElementById('potd-section').innerHTML = `<div class="text-red-600">Failed to load Player of the Day.</div>`
  }
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
  state.selectedPlayerId = ''
  document.getElementById('player-detail').innerHTML = ''
  const selTeam = document.getElementById('sel-team')
  const selPlayer = document.getElementById('sel-player')
  selPlayer.innerHTML = '<option value="">Select player...</option>'
  selPlayer.disabled = true
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
  state.selectedPlayerId = ''
  document.getElementById('player-detail').innerHTML = ''
  const selPlayer = document.getElementById('sel-player')
  if (!state.selectedTeamId) {
    selPlayer.innerHTML = '<option value="">Select player...</option>'
    selPlayer.disabled = true
    return
  }
  const { data } = await axios.get('/api/players', { params: { team_id: state.selectedTeamId } })
  state.players = data.players || []
  selPlayer.innerHTML = '<option value="">Select player...</option>' +
    state.players.map(p => `<option value="${p.id}">#${p.jersey_number ?? '—'} ${escapeHTML(p.name)}</option>`).join('')
  selPlayer.disabled = false
}

async function onPlayerChange(e) {
  state.selectedPlayerId = e.target.value
  if (!state.selectedPlayerId) {
    document.getElementById('player-detail').innerHTML = ''
    return
  }
  await loadPlayerDetail(state.selectedPlayerId)
}

async function loadPlayerDetail(playerId) {
  const target = document.getElementById('player-detail')
  target.innerHTML = '<div class="text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</div>'
  try {
    const { data } = await axios.get('/api/player/' + playerId + '/stats')
    const { player, games, totals, averages } = data
    target.innerHTML = `
      <div class="mt-6 pt-6 border-t">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 class="text-2xl font-bold">${escapeHTML(player.name)}</h3>
          <div class="text-gray-600">
            #${player.jersey_number ?? '—'} • ${escapeHTML(player.team_name || '')}
            ${player.position ? ' • ' + escapeHTML(player.position) : ''}
            ${player.height ? ' • ' + escapeHTML(player.height) : ''}
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="card text-center"><div class="text-3xl font-bold text-gray-700">${totals.games}</div><div class="text-xs text-gray-500 uppercase">Games</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-orange-600">${averages ? averages.points : '—'}</div><div class="text-xs text-gray-500 uppercase">PPG</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-blue-600">${averages ? averages.rebounds : '—'}</div><div class="text-xs text-gray-500 uppercase">RPG</div></div>
          <div class="card text-center"><div class="text-3xl font-bold text-purple-600">${averages ? averages.assists : '—'}</div><div class="text-xs text-gray-500 uppercase">APG</div></div>
        </div>

        <h4 class="text-lg font-bold mb-2">Game Log</h4>
        ${games.length === 0
          ? '<div class="text-gray-500">No games recorded yet.</div>'
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead class="bg-gray-100"><tr>
                <th class="text-left p-2">Date</th>
                <th class="text-left p-2">Matchup</th>
                <th class="text-right p-2">PTS</th>
                <th class="text-right p-2">REB</th>
                <th class="text-right p-2">AST</th>
              </tr></thead>
              <tbody>${games.map(g => `
                <tr class="border-b">
                  <td class="p-2">${escapeHTML(g.game_date || '—')}</td>
                  <td class="p-2">${escapeHTML(g.home_team_name)} ${g.home_score}–${g.away_score} ${escapeHTML(g.away_team_name)}</td>
                  <td class="p-2 text-right font-semibold">${g.points}</td>
                  <td class="p-2 text-right">${g.rebounds}</td>
                  <td class="p-2 text-right">${g.assists}</td>
                </tr>`).join('')}
              </tbody>
            </table></div>`
        }

        <div class="mt-4 pt-4 border-t flex flex-wrap gap-6 text-sm text-gray-700">
          <div><b>Total PTS:</b> ${totals.points}</div>
          <div><b>Total REB:</b> ${totals.rebounds}</div>
          <div><b>Total AST:</b> ${totals.assists}</div>
        </div>
      </div>
    `
  } catch (err) {
    target.innerHTML = '<div class="text-red-600">Failed to load player stats.</div>'
  }
}

function escapeHTML(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

render()
loadPOTD()
loadTournaments()
