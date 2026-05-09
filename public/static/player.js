// Player page - login with access code, view stats
const PLAYER_KEY = 'hoopstats_player_code';
const root = document.getElementById('player-app');

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function renderLogin(errorMsg) {
  root.innerHTML = `
    <div class="section max-w-md mx-auto">
      <h2 class="text-xl font-bold mb-3"><i class="fas fa-key mr-2"></i>Enter Your Access Code</h2>
      <p class="text-sm text-gray-600 mb-3">Your coach or admin should have given you an access code (e.g. <code>HAWK-MJ23</code>).</p>
      ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}
      <input id="code" class="input mb-3" placeholder="ACCESS CODE" autofocus />
      <button id="login-btn" class="btn btn-primary w-full"><i class="fas fa-sign-in-alt"></i>View My Stats</button>
    </div>
  `;
  document.getElementById('code').addEventListener('keypress', e => { if (e.key === 'Enter') tryLogin(); });
  document.getElementById('login-btn').addEventListener('click', tryLogin);
}

async function tryLogin() {
  const code = document.getElementById('code').value.trim();
  if (!code) return;
  try {
    const { data } = await axios.post('/api/player/login', { access_code: code });
    sessionStorage.setItem(PLAYER_KEY, code);
    showPlayer(data.player);
  } catch (e) {
    renderLogin(e.response?.data?.error || 'Invalid access code');
  }
}

async function showPlayer(player) {
  root.innerHTML = '<div class="text-gray-500">Loading stats...</div>';
  try {
    const { data } = await axios.get(`/api/player/${player.id}/stats`);
    renderPlayerDashboard(data);
  } catch (e) {
    root.innerHTML = `<div class="alert alert-error">Failed to load stats</div>`;
  }
}

function renderPlayerDashboard(data) {
  const { player, games, totals, averages } = data;

  const avg = averages || { points:0, rebounds:0, assists:0, steals:0, blocks:0, fg_pct:0, three_pct:0, ft_pct:0, minutes:0, turnovers:0 };

  root.innerHTML = `
    <div class="section bg-gradient-to-r from-blue-500 to-blue-700 text-white">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-sm opacity-80">${escapeHtml(player.team_name)}</div>
          <h2 class="text-3xl font-bold">${escapeHtml(player.name)} ${player.jersey_number ? `<span class="opacity-80">#${player.jersey_number}</span>` : ''}</h2>
          <div class="text-sm opacity-80 mt-1">
            ${player.position ? '<i class="fas fa-basketball mr-1"></i>' + escapeHtml(player.position) : ''}
            ${player.height ? ' · ' + escapeHtml(player.height) : ''}
          </div>
        </div>
        <button id="logout-btn" class="btn btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i>Switch Player</button>
      </div>
    </div>

    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-chart-line mr-1"></i>Season Averages (${totals.games} game${totals.games===1?'':'s'})</h3>
      ${totals.games === 0 ? '<p class="text-gray-500">No game stats recorded yet.</p>' : `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="stat-box"><div class="value">${avg.points}</div><div class="label-text">PPG</div></div>
        <div class="stat-box"><div class="value">${avg.rebounds}</div><div class="label-text">RPG</div></div>
        <div class="stat-box"><div class="value">${avg.assists}</div><div class="label-text">APG</div></div>
        <div class="stat-box"><div class="value">${avg.steals}</div><div class="label-text">SPG</div></div>
        <div class="stat-box"><div class="value">${avg.blocks}</div><div class="label-text">BPG</div></div>
        <div class="stat-box"><div class="value">${avg.fg_pct}%</div><div class="label-text">FG%</div></div>
        <div class="stat-box"><div class="value">${avg.three_pct}%</div><div class="label-text">3P%</div></div>
        <div class="stat-box"><div class="value">${avg.ft_pct}%</div><div class="label-text">FT%</div></div>
      </div>
      <div class="text-sm text-gray-600">
        Totals — MIN: ${totals.minutes} · PTS: ${totals.points} · REB: ${totals.rebounds} · AST: ${totals.assists} · STL: ${totals.steals} · BLK: ${totals.blocks} · TO: ${totals.turnovers}
      </div>
      `}
    </div>

    ${games.length === 0 ? '' : `
    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-list mr-1"></i>Game-by-Game</h3>
      <div class="overflow-x-auto"><table class="stats-table">
        <thead>
          <tr>
            <th>Date</th><th>Matchup</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3P</th><th>FT</th>
          </tr>
        </thead>
        <tbody>
          ${games.map(g => `
            <tr>
              <td>${escapeHtml(g.game_date || '')}</td>
              <td class="text-left">${escapeHtml(g.home_team_name)} ${g.home_score}–${g.away_score} ${escapeHtml(g.away_team_name)}</td>
              <td>${g.minutes}</td>
              <td><strong>${g.points}</strong></td>
              <td>${g.rebounds}</td>
              <td>${g.assists}</td>
              <td>${g.steals}</td>
              <td>${g.blocks}</td>
              <td>${g.turnovers}</td>
              <td>${g.fg_made}/${g.fg_attempted}</td>
              <td>${g.three_made}/${g.three_attempted}</td>
              <td>${g.ft_made}/${g.ft_attempted}</td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    </div>
    `}

    <div class="section">
      <h3 class="text-lg font-bold mb-3"><i class="fas fa-images mr-1"></i>Tournament Photos</h3>
      <a href="/gallery/${player.tournament_id}" class="btn btn-primary"><i class="fas fa-camera-retro"></i>View & Upload Game Photos</a>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(PLAYER_KEY); renderLogin();
  });
}

(async () => {
  const code = sessionStorage.getItem(PLAYER_KEY);
  if (code) {
    try {
      const { data } = await axios.post('/api/player/login', { access_code: code });
      showPlayer(data.player);
      return;
    } catch (e) { sessionStorage.removeItem(PLAYER_KEY); }
  }
  renderLogin();
})();
