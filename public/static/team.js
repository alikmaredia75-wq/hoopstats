// Team page - login with team code, view whole-team stats
const TEAM_KEY = 'hoopstats_team_code';
const root = document.getElementById('team-app');

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function renderLogin(errorMsg) {
  root.innerHTML = `
    <div class="section max-w-md mx-auto">
      <h2 class="text-xl font-bold mb-3"><i class="fas fa-key mr-2"></i>Enter Team Code</h2>
      <p class="text-sm text-gray-600 mb-3">Your coach should have given you a team access code (e.g. <code>HAWKS-2026</code>). With this code you can see <em>all</em> of your team's stats at once.</p>
      ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}
      <input id="code" class="input mb-3" placeholder="TEAM CODE" autofocus />
      <button id="login-btn" class="btn btn-primary w-full" style="background:#8b5cf6"><i class="fas fa-sign-in-alt"></i>View Team Stats</button>
    </div>
  `;
  document.getElementById('code').addEventListener('keypress', e => { if (e.key === 'Enter') tryLogin(); });
  document.getElementById('login-btn').addEventListener('click', tryLogin);
}

async function tryLogin() {
  const code = document.getElementById('code').value.trim();
  if (!code) return;
  try {
    const { data } = await axios.post('/api/team/login', { access_code: code });
    sessionStorage.setItem(TEAM_KEY, code);
    showTeam(data.team);
  } catch (e) {
    renderLogin(e.response?.data?.error || 'Invalid team code');
  }
}

async function showTeam(team) {
  root.innerHTML = '<div class="text-gray-500">Loading team stats...</div>';
  try {
    const { data } = await axios.get(`/api/team/${team.id}/stats`);
    renderTeamDashboard(data);
  } catch (e) {
    root.innerHTML = `<div class="alert alert-error">Failed to load team stats</div>`;
  }
}

function renderTeamDashboard(data) {
  const { team, record, games, players } = data;

  // Team totals across all players
  let totals = { points:0, rebounds:0, assists:0, steals:0, blocks:0, turnovers:0 };
  for (const p of players) {
    totals.points += p.totals.points;
    totals.rebounds += p.totals.rebounds;
    totals.assists += p.totals.assists;
    totals.steals += p.totals.steals;
    totals.blocks += p.totals.blocks;
    totals.turnovers += p.totals.turnovers;
  }
  const ppg = record.games ? (record.points_for / record.games).toFixed(1) : '0.0';
  const oppg = record.games ? (record.points_against / record.games).toFixed(1) : '0.0';

  // sort players by points-per-game (descending)
  const sortedPlayers = [...players].sort((a, b) => (b.averages?.points || 0) - (a.averages?.points || 0));

  root.innerHTML = `
    <div class="section" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-sm opacity-80">${escapeHtml(team.tournament_name || '')}</div>
          <h2 class="text-3xl font-bold">${escapeHtml(team.name)}</h2>
          ${team.coach ? `<div class="text-sm opacity-90 mt-1"><i class="fas fa-user-tie mr-1"></i>Coach ${escapeHtml(team.coach)}</div>` : ''}
        </div>
        <button id="logout-btn" class="btn btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i>Switch Team</button>
      </div>
    </div>

    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-trophy mr-1"></i>Team Record</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="stat-box" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#c4b5fd"><div class="value" style="color:#6d28d9">${record.wins}-${record.losses}</div><div class="label-text" style="color:#5b21b6">Record</div></div>
        <div class="stat-box" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#c4b5fd"><div class="value" style="color:#6d28d9">${record.games}</div><div class="label-text" style="color:#5b21b6">Games</div></div>
        <div class="stat-box" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#c4b5fd"><div class="value" style="color:#6d28d9">${ppg}</div><div class="label-text" style="color:#5b21b6">PPG (For)</div></div>
        <div class="stat-box" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#c4b5fd"><div class="value" style="color:#6d28d9">${oppg}</div><div class="label-text" style="color:#5b21b6">PPG (Against)</div></div>
        <div class="stat-box" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#c4b5fd"><div class="value" style="color:#6d28d9">${record.points_for - record.points_against >= 0 ? '+' : ''}${record.points_for - record.points_against}</div><div class="label-text" style="color:#5b21b6">Differential</div></div>
      </div>
    </div>

    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-users mr-1"></i>Roster Stats (Season Averages)</h3>
      ${players.length === 0 ? '<p class="text-gray-500">No players on this team yet.</p>' : `
        <div class="overflow-x-auto"><table class="stats-table">
          <thead>
            <tr><th>#</th><th>Player</th><th>Pos</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th><th>FT%</th></tr>
          </thead>
          <tbody>
            ${sortedPlayers.map(({ player, totals, averages }) => `
              <tr>
                <td>${player.jersey_number ?? ''}</td>
                <td class="text-left font-semibold">${escapeHtml(player.name)}</td>
                <td>${escapeHtml(player.position || '')}</td>
                <td>${totals.games}</td>
                <td>${averages ? averages.minutes : '-'}</td>
                <td><strong>${averages ? averages.points : '-'}</strong></td>
                <td>${averages ? averages.rebounds : '-'}</td>
                <td>${averages ? averages.assists : '-'}</td>
                <td>${averages ? averages.steals : '-'}</td>
                <td>${averages ? averages.blocks : '-'}</td>
                <td>${averages ? averages.fg_pct + '%' : '-'}</td>
                <td>${averages ? averages.three_pct + '%' : '-'}</td>
                <td>${averages ? averages.ft_pct + '%' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
    </div>

    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-basketball mr-1"></i>Game Results</h3>
      ${games.length === 0 ? '<p class="text-gray-500">No games yet.</p>' : `
        <div class="space-y-2">
          ${games.map(g => {
            const isHome = g.home_team_id == team.id;
            const own = isHome ? g.home_score : g.away_score;
            const opp = isHome ? g.away_score : g.home_score;
            const won = own > opp;
            const tied = own === opp;
            return `
              <div class="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span class="font-bold text-lg ${won ? 'text-green-600' : tied ? 'text-gray-600' : 'text-red-600'}">${won ? 'W' : tied ? 'T' : 'L'}</span>
                  <span class="ml-3">${escapeHtml(isHome ? g.away_team_name : g.home_team_name)} ${isHome ? '@' : 'vs'} <strong>${own}</strong>-${opp}</span>
                </div>
                <div class="text-sm text-gray-500">${escapeHtml(g.game_date || '')}</div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(TEAM_KEY); renderLogin();
  });
}

(async () => {
  const code = sessionStorage.getItem(TEAM_KEY);
  if (code) {
    try {
      const { data } = await axios.post('/api/team/login', { access_code: code });
      showTeam(data.team);
      return;
    } catch (e) { sessionStorage.removeItem(TEAM_KEY); }
  }
  renderLogin();
})();
