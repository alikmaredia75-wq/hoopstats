// Tournament detail page
const root = document.getElementById('tournament-app');
const tournamentId = document.getElementById('page-tournament').dataset.tournamentId;

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

async function load() {
  try {
    const { data } = await axios.get(`/api/tournaments/${tournamentId}`);
    const teamsWithPlayers = await Promise.all(
      data.teams.map(async t => {
        const r = await axios.get(`/api/teams/${t.id}`);
        return { team: t, players: r.data.players };
      })
    );
    render(data, teamsWithPlayers);
  } catch (e) {
    root.innerHTML = `<div class="alert alert-error">Failed to load tournament</div>`;
  }
}

function render(data, teamsWithPlayers) {
  const t = data.tournament;
  root.innerHTML = `
    <div class="section">
      <div class="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 class="text-3xl font-bold mb-1"><i class="fas fa-trophy text-yellow-500 mr-2"></i>${escapeHtml(t.name)}</h1>
          ${t.location ? `<p class="text-gray-600"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(t.location)}</p>` : ''}
          ${t.start_date ? `<p class="text-gray-600"><i class="fas fa-calendar mr-1"></i>${escapeHtml(t.start_date)}${t.end_date ? ' - ' + escapeHtml(t.end_date) : ''}</p>` : ''}
          ${t.description ? `<p class="text-gray-700 mt-2">${escapeHtml(t.description)}</p>` : ''}
        </div>
        <a href="/gallery/${t.id}" class="btn btn-primary"><i class="fas fa-images"></i>Photo Gallery</a>
      </div>
    </div>

    <div class="section">
      <h2 class="text-xl font-bold mb-3"><i class="fas fa-users mr-1"></i>Teams (${teamsWithPlayers.length})</h2>
      ${teamsWithPlayers.length === 0 ? '<p class="text-gray-500">No teams yet.</p>' : `
        <div class="grid md:grid-cols-2 gap-4">
          ${teamsWithPlayers.map(({team, players}) => `
            <div class="border border-gray-200 rounded-lg p-4">
              <h3 class="font-bold text-lg">${escapeHtml(team.name)}</h3>
              ${team.coach ? `<p class="text-sm text-gray-500 mb-2">Coach: ${escapeHtml(team.coach)}</p>` : ''}
              ${players.length === 0 ? '<p class="text-sm text-gray-400">No players yet.</p>' : `
                <ul class="text-sm">
                  ${players.map(p => `
                    <li class="py-1 border-b border-gray-100 last:border-0">
                      <span class="font-semibold">${p.jersey_number ? '#' + p.jersey_number : ''}</span>
                      ${escapeHtml(p.name)}
                      ${p.position ? `<span class="text-gray-500"> · ${escapeHtml(p.position)}</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <div class="section">
      <h2 class="text-xl font-bold mb-3"><i class="fas fa-basketball mr-1"></i>Games (${data.games.length})</h2>
      ${data.games.length === 0 ? '<p class="text-gray-500">No games yet.</p>' : `
        <div class="space-y-2">
          ${data.games.map(g => `
            <div class="border border-gray-200 rounded-lg p-3 hover:bg-orange-50 cursor-pointer game-row" data-id="${g.id}">
              <div class="flex justify-between items-center">
                <div class="font-bold">
                  ${escapeHtml(g.home_team_name)}
                  <span class="text-2xl mx-2 ${g.home_score > g.away_score ? 'text-orange-600' : ''}">${g.home_score}</span>
                  —
                  <span class="text-2xl mx-2 ${g.away_score > g.home_score ? 'text-orange-600' : ''}">${g.away_score}</span>
                  ${escapeHtml(g.away_team_name)}
                </div>
                <div class="text-sm text-gray-500">${escapeHtml(g.game_date || '')} ${g.venue ? '· ' + escapeHtml(g.venue) : ''}</div>
              </div>
              <div class="game-detail mt-3" id="game-${g.id}" style="display:none"></div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  document.querySelectorAll('.game-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = row.dataset.id;
      const detail = document.getElementById(`game-${id}`);
      if (detail.style.display === 'block') { detail.style.display = 'none'; return; }
      detail.innerHTML = '<div class="text-gray-500">Loading...</div>';
      detail.style.display = 'block';
      try {
        const { data } = await axios.get(`/api/games/${id}`);
        renderGameDetail(detail, data);
      } catch (err) {
        detail.innerHTML = '<div class="alert alert-error">Failed to load</div>';
      }
    });
  });
}

function renderGameDetail(el, data) {
  const stats = data.stats || [];
  if (stats.length === 0) {
    el.innerHTML = '<p class="text-sm text-gray-500">No stats recorded for this game yet.</p>';
    return;
  }
  el.innerHTML = `
    <div class="overflow-x-auto"><table class="stats-table">
      <thead>
        <tr><th>#</th><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3P</th><th>FT</th></tr>
      </thead>
      <tbody>
        ${stats.map(s => `
          <tr>
            <td>${s.jersey_number ?? ''}</td>
            <td class="text-left font-semibold">${escapeHtml(s.player_name)}</td>
            <td>${s.minutes}</td>
            <td><strong>${s.points}</strong></td>
            <td>${s.rebounds}</td>
            <td>${s.assists}</td>
            <td>${s.steals}</td>
            <td>${s.blocks}</td>
            <td>${s.fg_made}/${s.fg_attempted}</td>
            <td>${s.three_made}/${s.three_attempted}</td>
            <td>${s.ft_made}/${s.ft_attempted}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
  `;
}

load();
