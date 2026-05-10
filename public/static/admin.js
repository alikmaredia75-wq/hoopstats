// Admin panel - manage everything; change password; upload photos
const ADMIN_PW_KEY = 'hoopstats_admin_pw';
let adminPw = sessionStorage.getItem(ADMIN_PW_KEY) || '';
let state = { tournaments: [], currentTournamentId: null, teams: [], players: [], games: [], photos: [], tab: 'tournaments' };

const root = document.getElementById('admin-app');

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function authHeaders() { return { 'X-Admin-Password': adminPw }; }

async function checkAuth() {
  if (!adminPw) return false;
  try {
    const { data } = await axios.post('/api/admin/check', {}, { headers: authHeaders() });
    return !!data.ok;
  } catch (e) { return false; }
}

function renderLogin(errorMsg) {
  root.innerHTML = `
    <div class="section max-w-md mx-auto">
      <h2 class="text-xl font-bold mb-3"><i class="fas fa-lock mr-2"></i>Admin Login</h2>
      <p class="text-sm text-gray-600 mb-3">Default password on first run is <code class="bg-gray-100 px-1">admin123</code>. Change it after you log in.</p>
      ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}
      <input id="admin-pw" type="password" class="input mb-3" placeholder="Admin password" autofocus />
      <button id="login-btn" class="btn btn-primary w-full"><i class="fas fa-sign-in-alt"></i>Sign in</button>
    </div>
  `;
  document.getElementById('admin-pw').addEventListener('keypress', e => { if (e.key === 'Enter') tryLogin(); });
  document.getElementById('login-btn').addEventListener('click', tryLogin);
}

async function tryLogin() {
  adminPw = document.getElementById('admin-pw').value.trim();
  if (!adminPw) return;
  const ok = await checkAuth();
  if (ok) {
    sessionStorage.setItem(ADMIN_PW_KEY, adminPw);
    init();
  } else {
    renderLogin('Invalid password');
  }
}

async function loadTournaments() {
  const { data } = await axios.get('/api/tournaments');
  state.tournaments = data.tournaments || [];
}

async function loadTournamentData(id) {
  state.currentTournamentId = id;
  const { data } = await axios.get(`/api/tournaments/${id}`);
  state.games = data.games || [];
  const [tm, pl, ph] = await Promise.all([
    axios.get(`/api/admin/teams?tournament_id=${id}`, { headers: authHeaders() }),
    axios.get(`/api/admin/players?tournament_id=${id}`, { headers: authHeaders() }),
    axios.get(`/api/photos?tournament_id=${id}`)
  ]);
  state.teams = tm.data.teams || [];
  state.players = pl.data.players || [];
  state.photos = ph.data.photos || [];
}

function setTab(tab) { state.tab = tab; render(); }

async function render() {
  const tournamentSelect = state.tournaments.map(t =>
    `<option value="${t.id}" ${t.id == state.currentTournamentId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`
  ).join('');

  root.innerHTML = `
    <div class="section">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <label class="font-semibold">Tournament:</label>
          <select id="tournament-select" class="select" style="max-width:300px">
            <option value="">-- Select --</option>
            ${tournamentSelect}
          </select>
        </div>
        <button id="logout-btn" class="btn btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i>Logout</button>
      </div>
    </div>

    <div class="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
      <button class="tab-btn ${state.tab === 'tournaments' ? 'active' : ''}" data-tab="tournaments"><i class="fas fa-trophy mr-1"></i>Tournaments</button>
      <button class="tab-btn ${state.tab === 'teams' ? 'active' : ''}" data-tab="teams"><i class="fas fa-users mr-1"></i>Teams</button>
      <button class="tab-btn ${state.tab === 'players' ? 'active' : ''}" data-tab="players"><i class="fas fa-user mr-1"></i>Players</button>
      <button class="tab-btn ${state.tab === 'games' ? 'active' : ''}" data-tab="games"><i class="fas fa-basketball mr-1"></i>Games</button>
      <button class="tab-btn ${state.tab === 'stats' ? 'active' : ''}" data-tab="stats"><i class="fas fa-chart-bar mr-1"></i>Stats</button>
      <button class="tab-btn ${state.tab === 'photos' ? 'active' : ''}" data-tab="photos"><i class="fas fa-images mr-1"></i>Photos</button>
      <button class="tab-btn ${state.tab === 'settings' ? 'active' : ''}" data-tab="settings"><i class="fas fa-cog mr-1"></i>Settings</button>
    </div>

    <div id="tab-content"></div>
  `;

  document.getElementById('tournament-select').addEventListener('change', async (e) => {
    if (e.target.value) { await loadTournamentData(e.target.value); render(); }
    else { state.currentTournamentId = null; state.teams = []; state.players = []; state.games = []; state.photos = []; render(); }
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_PW_KEY); adminPw = ''; renderLogin();
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const content = document.getElementById('tab-content');
  if (state.tab === 'tournaments') content.innerHTML = renderTournamentsTab();
  else if (state.tab === 'teams') content.innerHTML = renderTeamsTab();
  else if (state.tab === 'players') content.innerHTML = renderPlayersTab();
  else if (state.tab === 'games') content.innerHTML = renderGamesTab();
  else if (state.tab === 'stats') content.innerHTML = renderStatsTab();
  else if (state.tab === 'photos') content.innerHTML = renderPhotosTab();
  else if (state.tab === 'settings') content.innerHTML = renderSettingsTab();
  attachTabHandlers();
}

function renderTournamentsTab() {
  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-plus-circle mr-1"></i>Create Tournament</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <div><label class="label">Name *</label><input id="t-name" class="input" /></div>
        <div><label class="label">Location</label><input id="t-location" class="input" /></div>
        <div><label class="label">Start Date</label><input id="t-start" class="input" type="date" /></div>
        <div><label class="label">End Date</label><input id="t-end" class="input" type="date" /></div>
        <div class="md:col-span-2"><label class="label">Description</label><textarea id="t-desc" class="textarea"></textarea></div>
      </div>
      <button id="create-tournament" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Create Tournament</button>
    </div>
    <div class="section">
      <h3 class="text-lg font-bold mb-3">Existing Tournaments</h3>
      ${state.tournaments.length === 0 ? '<p class="text-gray-500">None yet.</p>' : `
        <div class="space-y-2">
          ${state.tournaments.map(t => `
            <div class="flex items-center justify-between border border-gray-200 rounded-lg p-3">
              <div>
                <div class="font-bold">${escapeHtml(t.name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(t.location || '')} ${t.start_date ? '· ' + escapeHtml(t.start_date) : ''}</div>
              </div>
              <button class="btn btn-danger btn-sm del-tournament" data-id="${t.id}"><i class="fas fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderTeamsTab() {
  if (!state.currentTournamentId) return `<div class="alert alert-info">Select a tournament first.</div>`;
  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-plus-circle mr-1"></i>Add Team</h3>
      <div class="grid md:grid-cols-3 gap-3">
        <div><label class="label">Team Name *</label><input id="team-name" class="input" /></div>
        <div><label class="label">Coach</label><input id="team-coach" class="input" /></div>
        <div><label class="label">Team Code (optional)</label><input id="team-code" class="input" placeholder="auto-generated if blank" /></div>
      </div>
      <button id="create-team" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Add Team</button>
      <p class="text-sm text-gray-500 mt-2"><i class="fas fa-info-circle mr-1"></i>Share the team code so players can view <strong>whole-team stats</strong> at <code>/team</code>.</p>
    </div>
    <div class="section">
      <h3 class="text-lg font-bold mb-3">Teams (${state.teams.length})</h3>
      ${state.teams.length === 0 ? '<p class="text-gray-500">No teams yet.</p>' : `
        <div class="overflow-x-auto"><table class="stats-table">
          <thead><tr><th>Name</th><th>Coach</th><th>Team Code</th><th></th></tr></thead>
          <tbody>
            ${state.teams.map(t => `
              <tr>
                <td class="text-left font-semibold">${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.coach || '')}</td>
                <td>
                  <span class="access-code">${escapeHtml(t.access_code || '')}</span>
                  <button class="btn btn-secondary btn-sm edit-team-code" data-id="${t.id}" data-code="${escapeHtml(t.access_code || '')}" style="margin-left:0.4rem"><i class="fas fa-pen"></i></button>
                </td>
                <td><button class="btn btn-danger btn-sm del-team" data-id="${t.id}"><i class="fas fa-trash"></i></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
    </div>
  `;
}

function renderPlayersTab() {
  if (!state.currentTournamentId) return `<div class="alert alert-info">Select a tournament first.</div>`;
  if (state.teams.length === 0) return `<div class="alert alert-info">Add teams first.</div>`;
  const teamOpts = state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-user-plus mr-1"></i>Add Player</h3>
      <div class="grid md:grid-cols-3 gap-3">
        <div><label class="label">Team *</label><select id="p-team" class="select">${teamOpts}</select></div>
        <div><label class="label">Name *</label><input id="p-name" class="input" /></div>
        <div><label class="label">Jersey #</label><input id="p-num" class="input" type="number" /></div>
        <div><label class="label">Position</label><input id="p-pos" class="input" placeholder="PG, SG, SF, PF, C" /></div>
        <div><label class="label">Height</label><input id="p-ht" class="input" placeholder="6'2&quot;" /></div>
        <div><label class="label">Access Code (optional)</label><input id="p-code" class="input" placeholder="auto-generated if blank" /></div>
      </div>
      <button id="create-player" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Add Player</button>
      <p class="text-sm text-gray-500 mt-2"><i class="fas fa-info-circle mr-1"></i>Share each player's code so they can view their personal stats at <code>/player</code>.</p>
    </div>
    <div class="section">
      <h3 class="text-lg font-bold mb-3">Players (${state.players.length})</h3>
      ${state.players.length === 0 ? '<p class="text-gray-500">No players yet.</p>' : `
        <div class="overflow-x-auto"><table class="stats-table">
          <thead><tr><th>#</th><th>Name</th><th>Team</th><th>Pos</th><th>Height</th><th>Access Code</th><th></th></tr></thead>
          <tbody>
            ${state.players.map(p => `
              <tr>
                <td>${p.jersey_number ?? ''}</td>
                <td class="text-left font-semibold">${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.team_name)}</td>
                <td>${escapeHtml(p.position || '')}</td>
                <td>${escapeHtml(p.height || '')}</td>
                <td><span class="access-code">${escapeHtml(p.access_code)}</span></td>
                <td><button class="btn btn-danger btn-sm del-player" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
    </div>
  `;
}

function renderGamesTab() {
  if (!state.currentTournamentId) return `<div class="alert alert-info">Select a tournament first.</div>`;
  if (state.teams.length < 2) return `<div class="alert alert-info">Add at least 2 teams first.</div>`;
  const teamOpts = state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-plus-circle mr-1"></i>Add Game</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <div><label class="label">Home Team *</label><select id="g-home" class="select">${teamOpts}</select></div>
        <div><label class="label">Away Team *</label><select id="g-away" class="select">${teamOpts}</select></div>
        <div><label class="label">Home Score</label><input id="g-hs" class="input" type="number" value="0" /></div>
        <div><label class="label">Away Score</label><input id="g-as" class="input" type="number" value="0" /></div>
        <div><label class="label">Date</label><input id="g-date" class="input" type="date" /></div>
        <div><label class="label">Venue</label><input id="g-venue" class="input" /></div>
      </div>
      <button id="create-game" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Add Game</button>
    </div>
    <div class="section">
      <h3 class="text-lg font-bold mb-3">Games (${state.games.length})</h3>
      ${state.games.length === 0 ? '<p class="text-gray-500">No games yet.</p>' : `
        <div class="space-y-2">
          ${state.games.map(g => `
            <div class="flex items-center justify-between border border-gray-200 rounded-lg p-3">
              <div>
                <div class="font-bold">${escapeHtml(g.home_team_name)} ${g.home_score} — ${g.away_score} ${escapeHtml(g.away_team_name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(g.game_date || '')} ${g.venue ? '· ' + escapeHtml(g.venue) : ''}</div>
              </div>
              <button class="btn btn-danger btn-sm del-game" data-id="${g.id}"><i class="fas fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderStatsTab() {
  if (!state.currentTournamentId) return `<div class="alert alert-info">Select a tournament first.</div>`;
  if (state.games.length === 0) return `<div class="alert alert-info">Add a game first.</div>`;
  if (state.players.length === 0) return `<div class="alert alert-info">Add players first.</div>`;
  const gameOpts = state.games.map(g => `<option value="${g.id}">${escapeHtml(g.home_team_name)} vs ${escapeHtml(g.away_team_name)} (${g.game_date || ''})</option>`).join('');
  const playerOpts = state.players.map(p => `<option value="${p.id}" data-team="${p.team_id}">#${p.jersey_number ?? ''} ${escapeHtml(p.name)} (${escapeHtml(p.team_name)})</option>`).join('');

  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-chart-bar mr-1"></i>Upload Stat Line</h3>
      <p class="text-sm text-gray-500 mb-3">Re-uploading for the same player + game updates their existing stats.</p>
      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <div><label class="label">Game *</label><select id="s-game" class="select">${gameOpts}</select></div>
        <div><label class="label">Player *</label><select id="s-player" class="select">${playerOpts}</select></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${[
          ['minutes','Min'],['points','PTS'],['rebounds','REB'],['assists','AST'],
          ['steals','STL'],['blocks','BLK'],['turnovers','TO'],['fouls','PF'],
          ['fg_made','FGM'],['fg_attempted','FGA'],['three_made','3PM'],['three_attempted','3PA'],
          ['ft_made','FTM'],['ft_attempted','FTA']
        ].map(([k,label]) => `
          <div><label class="label">${label}</label><input id="s-${k}" class="input" type="number" value="0" min="0" /></div>
        `).join('')}
      </div>
      <button id="save-stats" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Save Stats</button>
      <div id="stats-msg"></div>
    </div>
  `;
}

function renderPhotosTab() {
  if (!state.currentTournamentId) return `<div class="alert alert-info">Select a tournament first.</div>`;
  const gameOpts = state.games.map(g => `<option value="${g.id}">${escapeHtml(g.home_team_name)} vs ${escapeHtml(g.away_team_name)} (${g.game_date || ''})</option>`).join('');

  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-cloud-upload-alt mr-1"></i>Upload Game Photos</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <div><label class="label">Photo File(s) *</label><input id="up-file" class="input" type="file" accept="image/*" multiple /></div>
        <div><label class="label">Game (optional)</label>
          <select id="up-game" class="select">
            <option value="">— No specific game —</option>
            ${gameOpts}
          </select>
        </div>
        <div><label class="label">Caption</label><input id="up-caption" class="input" placeholder="Optional" /></div>
        <div><label class="label">Uploaded By</label><input id="up-name" class="input" placeholder="Admin" /></div>
      </div>
      <button id="upload-btn" class="btn btn-primary mt-3"><i class="fas fa-upload"></i>Upload</button>
      <div id="upload-status" class="mt-2"></div>
    </div>

    <div class="section">
      <h3 class="text-lg font-bold mb-3">Existing Photos (${state.photos.length})</h3>
      ${state.photos.length === 0 ? '<p class="text-gray-500">No photos uploaded yet.</p>' : `
        <div class="gallery-grid">
          ${state.photos.map(p => `
            <div class="gallery-item">
              <img src="/api/photos/file/${p.id}" alt="" loading="lazy" />
              ${p.caption ? `<div class="caption">${escapeHtml(p.caption)}</div>` : ''}
              <button class="del-photo-btn" data-id="${p.id}" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.9);color:white;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer"><i class="fas fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <div class="section">
      <a href="/gallery/${state.currentTournamentId}" target="_blank" class="btn btn-secondary"><i class="fas fa-external-link-alt"></i>View Public Gallery Page</a>
    </div>
  `;
}

function renderSettingsTab() {
  return `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-key mr-1"></i>Change Admin Password</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <div><label class="label">New Password *</label><input id="np-1" type="password" class="input" placeholder="At least 4 characters" /></div>
        <div><label class="label">Confirm New Password *</label><input id="np-2" type="password" class="input" /></div>
      </div>
      <button id="change-pw-btn" class="btn btn-primary mt-3"><i class="fas fa-save"></i>Update Password</button>
      <div id="pw-msg" class="mt-2"></div>
      <p class="text-sm text-gray-500 mt-3">After changing, you'll need to log in again with the new password.</p>
    </div>
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-link mr-1"></i>Admin Panel URL</h3>
      <p class="text-sm text-gray-600 mb-2">This admin panel lives at a hidden URL. Bookmark it — there is no link to it from any public page.</p>
      <div class="bg-gray-100 p-3 rounded font-mono text-sm break-all">
        ${escapeHtml(window.location.origin)}/secure-admin-panel-x7q
      </div>
    </div>
  `;
}

function attachTabHandlers() {
  // Tournament create
  const ct = document.getElementById('create-tournament');
  if (ct) ct.addEventListener('click', async () => {
    const name = document.getElementById('t-name').value.trim();
    if (!name) return alert('Name required');
    try {
      await axios.post('/api/tournaments', {
        name,
        location: document.getElementById('t-location').value.trim(),
        start_date: document.getElementById('t-start').value,
        end_date: document.getElementById('t-end').value,
        description: document.getElementById('t-desc').value.trim()
      }, { headers: authHeaders() });
      await loadTournaments(); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  });
  document.querySelectorAll('.del-tournament').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete tournament and all its data?')) return;
    await axios.delete(`/api/tournaments/${b.dataset.id}`, { headers: authHeaders() });
    if (state.currentTournamentId == b.dataset.id) state.currentTournamentId = null;
    await loadTournaments(); render();
  }));

  // Team create
  const cTeam = document.getElementById('create-team');
  if (cTeam) cTeam.addEventListener('click', async () => {
    const name = document.getElementById('team-name').value.trim();
    if (!name) return alert('Name required');
    try {
      const res = await axios.post('/api/teams', {
        tournament_id: state.currentTournamentId,
        name,
        coach: document.getElementById('team-coach').value.trim(),
        access_code: document.getElementById('team-code').value.trim() || null
      }, { headers: authHeaders() });
      alert(`Team added! Team code: ${res.data.access_code}\nShare this with the team so they can view all-team stats.`);
      await loadTournamentData(state.currentTournamentId); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  });
  document.querySelectorAll('.del-team').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete team and its players?')) return;
    await axios.delete(`/api/teams/${b.dataset.id}`, { headers: authHeaders() });
    await loadTournamentData(state.currentTournamentId); render();
  }));
  document.querySelectorAll('.edit-team-code').forEach(b => b.addEventListener('click', async () => {
    const newCode = prompt('New team code:', b.dataset.code);
    if (!newCode || newCode.trim() === '' || newCode === b.dataset.code) return;
    try {
      await axios.put(`/api/teams/${b.dataset.id}/access-code`, { access_code: newCode.trim() }, { headers: authHeaders() });
      await loadTournamentData(state.currentTournamentId); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  }));

  // Player create
  const cP = document.getElementById('create-player');
  if (cP) cP.addEventListener('click', async () => {
    const name = document.getElementById('p-name').value.trim();
    if (!name) return alert('Name required');
    try {
      const res = await axios.post('/api/players', {
        team_id: document.getElementById('p-team').value,
        name,
        jersey_number: document.getElementById('p-num').value || null,
        position: document.getElementById('p-pos').value.trim(),
        height: document.getElementById('p-ht').value.trim(),
        access_code: document.getElementById('p-code').value.trim() || null
      }, { headers: authHeaders() });
      alert(`Player added! Access code: ${res.data.access_code}`);
      await loadTournamentData(state.currentTournamentId); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  });
  document.querySelectorAll('.del-player').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete player?')) return;
    await axios.delete(`/api/players/${b.dataset.id}`, { headers: authHeaders() });
    await loadTournamentData(state.currentTournamentId); render();
  }));

  // Game create
  const cG = document.getElementById('create-game');
  if (cG) cG.addEventListener('click', async () => {
    const home = document.getElementById('g-home').value;
    const away = document.getElementById('g-away').value;
    if (home === away) return alert('Home and away teams must differ');
    try {
      await axios.post('/api/games', {
        tournament_id: state.currentTournamentId,
        home_team_id: home,
        away_team_id: away,
        home_score: +document.getElementById('g-hs').value || 0,
        away_score: +document.getElementById('g-as').value || 0,
        game_date: document.getElementById('g-date').value,
        venue: document.getElementById('g-venue').value.trim()
      }, { headers: authHeaders() });
      await loadTournamentData(state.currentTournamentId); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  });
  document.querySelectorAll('.del-game').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete game and its stats?')) return;
    await axios.delete(`/api/games/${b.dataset.id}`, { headers: authHeaders() });
    await loadTournamentData(state.currentTournamentId); render();
  }));

  // Stats save
  const sS = document.getElementById('save-stats');
  if (sS) sS.addEventListener('click', async () => {
    const fields = ['minutes','points','rebounds','assists','steals','blocks','turnovers','fouls','fg_made','fg_attempted','three_made','three_attempted','ft_made','ft_attempted'];
    const payload = {
      game_id: document.getElementById('s-game').value,
      player_id: document.getElementById('s-player').value,
    };
    fields.forEach(f => payload[f] = +document.getElementById('s-' + f).value || 0);
    try {
      await axios.post('/api/stats', payload, { headers: authHeaders() });
      document.getElementById('stats-msg').innerHTML = '<div class="alert alert-success"><i class="fas fa-check mr-1"></i>Stats saved!</div>';
      setTimeout(() => { const m = document.getElementById('stats-msg'); if (m) m.innerHTML = ''; }, 2500);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  });

  // Photo upload
  const uB = document.getElementById('upload-btn');
  if (uB) uB.addEventListener('click', async () => {
    const files = document.getElementById('up-file').files;
    const game_id = document.getElementById('up-game').value;
    const caption = document.getElementById('up-caption').value.trim();
    const uploaded_by = document.getElementById('up-name').value.trim() || 'Admin';
    const status = document.getElementById('upload-status');
    if (!files || files.length === 0) { status.innerHTML = '<div class="alert alert-error">Please choose at least one file.</div>'; return; }
    status.innerHTML = `<div class="alert alert-info">Uploading ${files.length} file(s)...</div>`;
    let success = 0, failed = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tournament_id', state.currentTournamentId);
      if (game_id) fd.append('game_id', game_id);
      if (caption) fd.append('caption', caption);
      fd.append('uploaded_by', uploaded_by);
      try { await axios.post('/api/photos/upload', fd, { headers: authHeaders() }); success++; }
      catch (e) { failed++; }
    }
    status.innerHTML = `<div class="alert ${failed === 0 ? 'alert-success' : 'alert-error'}"><i class="fas fa-check mr-1"></i>${success} uploaded${failed ? ', ' + failed + ' failed' : ''}.</div>`;
    await loadTournamentData(state.currentTournamentId);
    render();
  });
  document.querySelectorAll('.del-photo-btn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this photo?')) return;
    try {
      await axios.delete(`/api/photos/${btn.dataset.id}`, { headers: authHeaders() });
      await loadTournamentData(state.currentTournamentId); render();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  }));

  // Change password
  const cpBtn = document.getElementById('change-pw-btn');
  if (cpBtn) cpBtn.addEventListener('click', async () => {
    const p1 = document.getElementById('np-1').value;
    const p2 = document.getElementById('np-2').value;
    const msg = document.getElementById('pw-msg');
    if (!p1 || p1.length < 4) { msg.innerHTML = '<div class="alert alert-error">Password must be at least 4 characters.</div>'; return; }
    if (p1 !== p2) { msg.innerHTML = '<div class="alert alert-error">Passwords do not match.</div>'; return; }
    try {
      await axios.post('/api/admin/change-password', { new_password: p1 }, { headers: authHeaders() });
      msg.innerHTML = '<div class="alert alert-success"><i class="fas fa-check mr-1"></i>Password updated. Logging you out…</div>';
      setTimeout(() => {
        sessionStorage.removeItem(ADMIN_PW_KEY);
        adminPw = '';
        renderLogin('Please sign in again with your new password.');
      }, 1500);
    } catch (e) { msg.innerHTML = `<div class="alert alert-error">${escapeHtml(e.response?.data?.error || 'Failed')}</div>`; }
  });
}

async function init() {
  root.innerHTML = '<div class="text-gray-500">Loading...</div>';
  await loadTournaments();
  if (state.tournaments.length > 0 && !state.currentTournamentId) {
    state.currentTournamentId = state.tournaments[0].id;
    await loadTournamentData(state.currentTournamentId);
  }
  render();
}

(async () => {
  if (await checkAuth()) init();
  else renderLogin();
})();
