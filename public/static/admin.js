// Admin panel — simplified: no Photos tab, no access codes, stats limited to PTS/REB/AST
const root = document.getElementById('admin-app')

const state = {
  password: sessionStorage.getItem('admin_password') || '',
  authed: false,
  tab: 'tournaments',
  tournaments: [],
  teams: [],
  players: [],
  games: [],
  selectedTournamentId: '',
  selectedGameId: '',
}

function authHeaders() {
  return { 'X-Admin-Password': state.password }
}

async function tryAuth() {
  try {
    await axios.post('/api/admin/check', {}, { headers: authHeaders() })
    state.authed = true
    sessionStorage.setItem('admin_password', state.password)
    render()
    loadTournaments()
  } catch {
    state.authed = false
    state.password = ''
    sessionStorage.removeItem('admin_password')
    renderLogin('Incorrect password.')
  }
}

function renderLogin(error = '') {
  root.innerHTML = `
    <div class="max-w-md mx-auto card-flat">
      <h2 class="font-heading uppercase text-2xl font-bold mb-2 text-white"><i class="fas fa-lock text-accent mr-2"></i>Admin Login</h2>
      <p class="text-muted mb-4 text-sm">Enter the admin password to manage tournaments, teams, players, games, and stats.</p>
      ${error ? `<div class="alert alert-error">${error}</div>` : ''}
      <input type="password" id="admin-pw" class="mb-3" placeholder="Admin password" autofocus />
      <button id="admin-login-btn" class="btn btn-primary w-full">Sign In</button>
    </div>
  `
  document.getElementById('admin-login-btn').onclick = () => {
    state.password = document.getElementById('admin-pw').value.trim()
    if (state.password) tryAuth()
  }
  document.getElementById('admin-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('admin-login-btn').click()
  })
}

function render() {
  if (!state.authed) { renderLogin(); return }
  root.innerHTML = `
    <div class="mb-4 flex flex-wrap gap-1 border-b" style="border-color: var(--navy-border)">
      ${tabBtn('tournaments', 'Tournaments', 'fa-trophy')}
      ${tabBtn('teams', 'Teams', 'fa-users')}
      ${tabBtn('players', 'Players', 'fa-user')}
      ${tabBtn('games', 'Games', 'fa-calendar')}
      ${tabBtn('stats', 'Stats Entry', 'fa-chart-bar')}
      ${tabBtn('settings', 'Settings', 'fa-cog')}
      <button id="logout-btn" class="ml-auto btn btn-ghost btn-sm"><i class="fas fa-sign-out-alt"></i>Logout</button>
    </div>
    <div id="tab-content"></div>
  `
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render() })
  document.getElementById('logout-btn').onclick = () => {
    state.authed = false; state.password = ''; sessionStorage.removeItem('admin_password'); renderLogin()
  }
  renderTab()
}

function tabBtn(id, label, icon) {
  const active = state.tab === id
  return `<button data-tab="${id}" class="tab-btn ${active ? 'active' : ''}"><i class="fas ${icon} mr-1"></i>${label}</button>`
}

function renderTab() {
  const c = document.getElementById('tab-content')
  if (state.tab === 'tournaments') renderTournamentsTab(c)
  else if (state.tab === 'teams') renderTeamsTab(c)
  else if (state.tab === 'players') renderPlayersTab(c)
  else if (state.tab === 'games') renderGamesTab(c)
  else if (state.tab === 'stats') renderStatsTab(c)
  else if (state.tab === 'settings') renderSettingsTab(c)
}

// ---------------- Tournaments ----------------
async function loadTournaments() {
  const { data } = await axios.get('/api/tournaments')
  state.tournaments = data.tournaments || []
  if (state.tab === 'tournaments') renderTab()
}

function renderTournamentsTab(c) {
  c.innerHTML = `
    <div class="card-flat mb-4">
      <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white"><i class="fas fa-plus text-accent mr-2"></i>New Tournament</h3>
      <div class="grid md:grid-cols-3 gap-2">
        <input id="t-name" class="" placeholder="Tournament name" />
        <input id="t-loc" class="" placeholder="Location" />
        <button id="t-add" class="btn btn-primary">Add</button>
      </div>
    </div>
    <div class="card-flat">
      <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white">Existing</h3>
      <table class="w-full text-sm">
        <thead style="background:var(--navy)"><tr><th class="text-left p-2">ID</th><th class="text-left p-2">Name</th><th class="text-left p-2">Location</th><th class="p-2"></th></tr></thead>
        <tbody>${state.tournaments.map(t => `
          <tr class="border-b" style="border-color:var(--navy-border)"><td class="p-2">${t.id}</td><td class="p-2">${escapeHTML(t.name)}</td><td class="p-2">${escapeHTML(t.location || '')}</td>
          <td class="p-2 text-right"><button class="text-red-400 hover:text-red-300 font-heading uppercase text-xs" data-del-t="${t.id}">Delete</button></td></tr>
        `).join('')}</tbody>
      </table>
    </div>
  `
  document.getElementById('t-add').onclick = async () => {
    const name = document.getElementById('t-name').value.trim()
    const location = document.getElementById('t-loc').value.trim()
    if (!name) return alert('Name required')
    await axios.post('/api/tournaments', { name, location }, { headers: authHeaders() })
    document.getElementById('t-name').value = ''
    document.getElementById('t-loc').value = ''
    loadTournaments()
  }
  document.querySelectorAll('[data-del-t]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this tournament? Teams, players, games, and stats inside will also be removed.')) return
    await axios.delete('/api/tournaments/' + b.dataset.delT, { headers: authHeaders() })
    loadTournaments()
  })
}

// ---------------- Teams ----------------
async function loadTeams(tournament_id) {
  if (!tournament_id) { state.teams = []; return }
  const { data } = await axios.get('/api/tournaments/' + tournament_id)
  state.teams = data.teams || []
}

function renderTeamsTab(c) {
  c.innerHTML = `
    <div class="card-flat mb-4">
      <label class="label">Tournament</label>
      <select id="team-tour" class="mb-3 w-full md:w-auto">
        <option value="">Select tournament...</option>
        ${state.tournaments.map(t => `<option value="${t.id}" ${state.selectedTournamentId==t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('')}
      </select>
      <div id="team-form-area"></div>
    </div>
    <div id="team-list" class="card-flat"><div class="text-muted">Pick a tournament...</div></div>
  `
  document.getElementById('team-tour').onchange = async (e) => {
    state.selectedTournamentId = e.target.value
    await loadTeams(state.selectedTournamentId)
    renderTeamFormArea()
    renderTeamList()
  }
  if (state.selectedTournamentId) { renderTeamFormArea(); renderTeamList() }
}

function renderTeamFormArea() {
  const area = document.getElementById('team-form-area')
  if (!state.selectedTournamentId) { area.innerHTML = ''; return }
  area.innerHTML = `
    <div class="grid md:grid-cols-3 gap-2">
      <input id="team-name" class="" placeholder="Team name" />
      <input id="team-coach" class="" placeholder="Coach (optional)" />
      <button id="team-add" class="btn btn-primary">Add Team</button>
    </div>
  `
  document.getElementById('team-add').onclick = async () => {
    const name = document.getElementById('team-name').value.trim()
    const coach = document.getElementById('team-coach').value.trim()
    if (!name) return alert('Name required')
    await axios.post('/api/teams', { tournament_id: state.selectedTournamentId, name, coach }, { headers: authHeaders() })
    document.getElementById('team-name').value = ''
    document.getElementById('team-coach').value = ''
    await loadTeams(state.selectedTournamentId)
    renderTeamList()
  }
}

function renderTeamList() {
  const list = document.getElementById('team-list')
  if (!state.selectedTournamentId) { list.innerHTML = '<div class="text-muted">Pick a tournament...</div>'; return }
  list.innerHTML = `
    <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white">Teams</h3>
    ${state.teams.length === 0
      ? '<div class="text-muted">No teams yet.</div>'
      : `<table class="w-full text-sm">
          <thead style="background:var(--navy)"><tr><th class="text-left p-2">ID</th><th class="text-left p-2">Name</th><th class="text-left p-2">Coach</th><th class="p-2"></th></tr></thead>
          <tbody>${state.teams.map(t => `
            <tr class="border-b" style="border-color:var(--navy-border)"><td class="p-2">${t.id}</td><td class="p-2">${escapeHTML(t.name)}</td><td class="p-2">${escapeHTML(t.coach || '')}</td>
            <td class="p-2 text-right"><button class="text-red-400 hover:text-red-300 font-heading uppercase text-xs" data-del-team="${t.id}">Delete</button></td></tr>
          `).join('')}</tbody>
        </table>`
    }
  `
  document.querySelectorAll('[data-del-team]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete team and all its players/stats?')) return
    await axios.delete('/api/teams/' + b.dataset.delTeam, { headers: authHeaders() })
    await loadTeams(state.selectedTournamentId)
    renderTeamList()
  })
}

// ---------------- Players ----------------
async function loadPlayers(team_id) {
  if (!team_id) { state.players = []; return }
  const { data } = await axios.get('/api/players', { params: { team_id } })
  state.players = data.players || []
}

function renderPlayersTab(c) {
  const teamId = state.selectedTeamForPlayer || ''
  c.innerHTML = `
    <div class="card-flat mb-4">
      <div class="grid md:grid-cols-2 gap-2 mb-3">
        <select id="pl-tour" class="">
          <option value="">Select tournament...</option>
          ${state.tournaments.map(t => `<option value="${t.id}" ${state.selectedTournamentId==t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('')}
        </select>
        <select id="pl-team" class="">
          <option value="">Select team...</option>
          ${state.teams.map(t => `<option value="${t.id}" ${teamId==t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('')}
        </select>
      </div>
      <div id="pl-form-area"></div>
    </div>
    <div id="pl-list" class="card-flat"><div class="text-muted">Pick a team...</div></div>
  `
  document.getElementById('pl-tour').onchange = async (e) => {
    state.selectedTournamentId = e.target.value
    state.selectedTeamForPlayer = ''
    await loadTeams(state.selectedTournamentId)
    renderPlayersTab(c)
  }
  document.getElementById('pl-team').onchange = async (e) => {
    state.selectedTeamForPlayer = e.target.value
    await loadPlayers(state.selectedTeamForPlayer)
    renderPlayerFormArea()
    renderPlayerList()
  }
  if (state.selectedTeamForPlayer) { renderPlayerFormArea(); renderPlayerList() }
}

function renderPlayerFormArea() {
  const area = document.getElementById('pl-form-area')
  if (!state.selectedTeamForPlayer) { area.innerHTML = ''; return }
  area.innerHTML = `
    <div class="grid md:grid-cols-3 gap-2">
      <input id="p-name" class="" placeholder="Player name" />
      <input id="p-num" type="number" class="" placeholder="Jersey #" />
      <button id="p-add" class="btn btn-primary">Add Player</button>
    </div>
  `
  document.getElementById('p-add').onclick = async () => {
    const name = document.getElementById('p-name').value.trim()
    if (!name) return alert('Name required')
    await axios.post('/api/players', {
      team_id: state.selectedTeamForPlayer,
      name,
      jersey_number: document.getElementById('p-num').value || null,
    }, { headers: authHeaders() })
    document.getElementById('p-name').value = ''
    document.getElementById('p-num').value = ''
    await loadPlayers(state.selectedTeamForPlayer)
    renderPlayerList()
  }
}

function renderPlayerList() {
  const list = document.getElementById('pl-list')
  if (!state.selectedTeamForPlayer) { list.innerHTML = '<div class="text-muted">Pick a team...</div>'; return }
  list.innerHTML = `
    <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white">Players</h3>
    ${state.players.length === 0
      ? '<div class="text-muted">No players yet.</div>'
      : `<table class="w-full text-sm">
          <thead style="background:var(--navy)"><tr><th class="text-left p-2">ID</th><th class="text-left p-2">#</th><th class="text-left p-2">Name</th><th class="p-2"></th></tr></thead>
          <tbody>${state.players.map(p => `
            <tr class="border-b" style="border-color:var(--navy-border)">
              <td class="p-2">${p.id}</td>
              <td class="p-2">${p.jersey_number ?? '—'}</td>
              <td class="p-2">${escapeHTML(p.name)}</td>
              <td class="p-2 text-right"><button class="text-red-400 hover:text-red-300 font-heading uppercase text-xs" data-del-p="${p.id}">Delete</button></td>
            </tr>
          `).join('')}</tbody>
        </table>`
    }
  `
  document.querySelectorAll('[data-del-p]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete player and their stats?')) return
    await axios.delete('/api/players/' + b.dataset.delP, { headers: authHeaders() })
    await loadPlayers(state.selectedTeamForPlayer)
    renderPlayerList()
  })
}

// ---------------- Games ----------------
async function loadGames(tournament_id) {
  if (!tournament_id) { state.games = []; return }
  const { data } = await axios.get('/api/tournaments/' + tournament_id)
  state.games = data.games || []
  state.teams = data.teams || []
}

function renderGamesTab(c) {
  c.innerHTML = `
    <div class="card-flat mb-4">
      <label class="label">Tournament</label>
      <select id="g-tour" class="mb-3 w-full md:w-auto">
        <option value="">Select tournament...</option>
        ${state.tournaments.map(t => `<option value="${t.id}" ${state.selectedTournamentId==t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('')}
      </select>
      <div id="g-form"></div>
    </div>
    <div id="g-list" class="card-flat"><div class="text-muted">Pick a tournament...</div></div>
  `
  document.getElementById('g-tour').onchange = async (e) => {
    state.selectedTournamentId = e.target.value
    await loadGames(state.selectedTournamentId)
    renderGameForm()
    renderGameList()
  }
  if (state.selectedTournamentId) { renderGameForm(); renderGameList() }
}

function renderGameForm() {
  const f = document.getElementById('g-form')
  if (!state.selectedTournamentId) { f.innerHTML = ''; return }
  const opts = state.teams.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('')
  f.innerHTML = `
    <div class="grid md:grid-cols-6 gap-2">
      <select id="g-home" class=""><option value="">Home...</option>${opts}</select>
      <input id="g-hs" type="number" class="" placeholder="Home score" />
      <select id="g-away" class=""><option value="">Away...</option>${opts}</select>
      <input id="g-as" type="number" class="" placeholder="Away score" />
      <input id="g-date" type="date" class="" />
      <button id="g-add" class="btn btn-primary">Add Game</button>
    </div>
    <input id="g-venue" class="mt-2" placeholder="Venue (optional)" />
  `
  document.getElementById('g-add').onclick = async () => {
    const home_team_id = document.getElementById('g-home').value
    const away_team_id = document.getElementById('g-away').value
    if (!home_team_id || !away_team_id) return alert('Both teams required')
    if (home_team_id === away_team_id) return alert('Pick two different teams')
    await axios.post('/api/games', {
      tournament_id: state.selectedTournamentId,
      home_team_id, away_team_id,
      home_score: parseInt(document.getElementById('g-hs').value) || 0,
      away_score: parseInt(document.getElementById('g-as').value) || 0,
      game_date: document.getElementById('g-date').value || null,
      venue: document.getElementById('g-venue').value.trim() || null,
    }, { headers: authHeaders() })
    await loadGames(state.selectedTournamentId)
    renderGameList()
  }
}

function renderGameList() {
  const list = document.getElementById('g-list')
  if (!state.selectedTournamentId) { list.innerHTML = '<div class="text-muted">Pick a tournament...</div>'; return }
  list.innerHTML = `
    <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white">Games</h3>
    ${state.games.length === 0
      ? '<div class="text-muted">No games yet.</div>'
      : `<table class="w-full text-sm">
          <thead style="background:var(--navy)"><tr><th class="text-left p-2">ID</th><th class="text-left p-2">Date</th><th class="text-left p-2">Matchup</th><th class="p-2"></th></tr></thead>
          <tbody>${state.games.map(g => `
            <tr class="border-b" style="border-color:var(--navy-border)">
              <td class="p-2">${g.id}</td>
              <td class="p-2">${escapeHTML(g.game_date || '—')}</td>
              <td class="p-2">${escapeHTML(g.home_team_name)} ${g.home_score} – ${g.away_score} ${escapeHTML(g.away_team_name)}</td>
              <td class="p-2 text-right"><button class="text-red-400 hover:text-red-300 font-heading uppercase text-xs" data-del-g="${g.id}">Delete</button></td>
            </tr>
          `).join('')}</tbody>
        </table>`
    }
  `
  document.querySelectorAll('[data-del-g]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete game and its stats?')) return
    await axios.delete('/api/games/' + b.dataset.delG, { headers: authHeaders() })
    await loadGames(state.selectedTournamentId)
    renderGameList()
  })
}

// ---------------- Stats Entry (PTS/REB/AST only) ----------------
function renderStatsTab(c) {
  c.innerHTML = `
    <div class="card-flat mb-4">
      <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white"><i class="fas fa-chart-bar text-accent mr-2"></i>Enter Player Stats</h3>
      <p class="text-sm text-muted mb-3">Enter the player's totals (PTS / REB / AST) for a single game. Submitting again for the same game and player will overwrite existing stats.</p>
      <div class="grid md:grid-cols-2 gap-2 mb-3">
        <select id="s-tour" class="">
          <option value="">Select tournament...</option>
          ${state.tournaments.map(t => `<option value="${t.id}" ${state.selectedTournamentId==t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('')}
        </select>
        <select id="s-game" class=""><option value="">Select game...</option></select>
      </div>
      <div class="grid md:grid-cols-2 gap-2 mb-3">
        <select id="s-team" class=""><option value="">Select team...</option></select>
        <select id="s-player" class=""><option value="">Select player...</option></select>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <input id="s-pts" type="number" min="0" class="" placeholder="PTS" />
        <input id="s-reb" type="number" min="0" class="" placeholder="REB" />
        <input id="s-ast" type="number" min="0" class="" placeholder="AST" />
      </div>
      <button id="s-save" class="btn btn-primary">Save Stats</button>
      <div id="s-msg" class="mt-2 text-sm"></div>
    </div>
  `

  let games = []
  let teams = []
  let players = []

  const tourSel = document.getElementById('s-tour')
  const gameSel = document.getElementById('s-game')
  const teamSel = document.getElementById('s-team')
  const playerSel = document.getElementById('s-player')

  tourSel.onchange = async () => {
    state.selectedTournamentId = tourSel.value
    games = []; teams = []; players = []
    gameSel.innerHTML = '<option value="">Select game...</option>'
    teamSel.innerHTML = '<option value="">Select team...</option>'
    playerSel.innerHTML = '<option value="">Select player...</option>'
    if (!state.selectedTournamentId) return
    const { data } = await axios.get('/api/tournaments/' + state.selectedTournamentId)
    games = data.games || []
    teams = data.teams || []
    gameSel.innerHTML = '<option value="">Select game...</option>' +
      games.map(g => `<option value="${g.id}">${escapeHTML(g.game_date || '')} — ${escapeHTML(g.home_team_name)} vs ${escapeHTML(g.away_team_name)}</option>`).join('')
    teamSel.innerHTML = '<option value="">Select team...</option>' +
      teams.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('')
  }

  teamSel.onchange = async () => {
    playerSel.innerHTML = '<option value="">Select player...</option>'
    if (!teamSel.value) return
    const { data } = await axios.get('/api/players', { params: { team_id: teamSel.value } })
    players = data.players || []
    playerSel.innerHTML = '<option value="">Select player...</option>' +
      players.map(p => `<option value="${p.id}">#${p.jersey_number ?? '—'} ${escapeHTML(p.name)}</option>`).join('')
  }

  document.getElementById('s-save').onclick = async () => {
    const msg = document.getElementById('s-msg')
    msg.textContent = ''
    const game_id = gameSel.value
    const player_id = playerSel.value
    if (!game_id || !player_id) { msg.innerHTML = '<span class="text-red-600">Pick a game and player.</span>'; return }
    try {
      await axios.post('/api/stats', {
        game_id, player_id,
        points: parseInt(document.getElementById('s-pts').value) || 0,
        rebounds: parseInt(document.getElementById('s-reb').value) || 0,
        assists: parseInt(document.getElementById('s-ast').value) || 0,
      }, { headers: authHeaders() })
      msg.innerHTML = '<span class="text-green-600"><i class="fas fa-check mr-1"></i>Saved.</span>'
      document.getElementById('s-pts').value = ''
      document.getElementById('s-reb').value = ''
      document.getElementById('s-ast').value = ''
    } catch (e) {
      msg.innerHTML = '<span class="text-red-600">Failed to save.</span>'
    }
  }

  // auto-trigger if a tournament is already selected
  if (state.selectedTournamentId) {
    tourSel.value = state.selectedTournamentId
    tourSel.dispatchEvent(new Event('change'))
  }
}

// ---------------- Settings ----------------
function renderSettingsTab(c) {
  c.innerHTML = `
    <div class="card-flat max-w-md">
      <h3 class="font-heading uppercase text-lg font-bold mb-3 text-white"><i class="fas fa-key text-accent mr-2"></i>Change Admin Password</h3>
      <input id="new-pw" type="password" class="mb-2" placeholder="New password (min 4 chars)" />
      <input id="new-pw2" type="password" class="mb-2" placeholder="Confirm new password" />
      <button id="pw-save" class="btn btn-primary">Update Password</button>
      <div id="pw-msg" class="mt-2 text-sm"></div>
    </div>
  `
  document.getElementById('pw-save').onclick = async () => {
    const a = document.getElementById('new-pw').value
    const b = document.getElementById('new-pw2').value
    const msg = document.getElementById('pw-msg')
    if (a.length < 4) { msg.innerHTML = '<span class="text-red-600">Password too short (min 4).</span>'; return }
    if (a !== b) { msg.innerHTML = '<span class="text-red-600">Passwords do not match.</span>'; return }
    try {
      await axios.post('/api/admin/change-password', { new_password: a }, { headers: authHeaders() })
      state.password = a
      sessionStorage.setItem('admin_password', a)
      msg.innerHTML = '<span class="text-green-600"><i class="fas fa-check mr-1"></i>Password updated.</span>'
      document.getElementById('new-pw').value = ''
      document.getElementById('new-pw2').value = ''
    } catch (e) {
      msg.innerHTML = '<span class="text-red-600">Failed: ' + (e.response?.data?.error || 'unknown error') + '</span>'
    }
  }
}

// ---------------- Utils ----------------
function escapeHTML(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

// ---------------- Bootstrap ----------------
if (state.password) {
  tryAuth()
} else {
  renderLogin()
}
