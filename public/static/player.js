// Player page — Player of the Day + team/player dropdowns (tournaments hidden from public)
const root = document.getElementById('player-app')

const state = {
  teams: [],
  players: [],
  selectedTeamId: '',
  selectedPlayerId: '',
}

function render() {
  root.innerHTML = `
    <div id="potd-section" style="margin-bottom:28px">
      <div style="color:var(--muted);padding:20px 0"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Loading Player of the Day...</div>
    </div>

    <div class="section-heading">Find a Player</div>
    <div class="card" style="margin-bottom:20px">
      <p style="color:var(--muted);margin-bottom:14px;font-size:14px">Pick a team and player to see their PTS / REB / AST.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:4px">
        <select id="sel-team">
          <option value="">Select team...</option>
        </select>
        <select id="sel-player" disabled>
          <option value="">Select player...</option>
        </select>
      </div>
    </div>
    <div id="player-detail"></div>
  `

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
        <div class="potd-card">
          <div class="potd-label">⚡ Player of the Day</div>
          <div style="color:var(--muted);font-size:14px">No stats recorded yet.</div>
        </div>`
      return
    }
    section.innerHTML = `
      <div class="potd-card">
        <div class="potd-label">⚡ Player of the Day</div>
        <div class="potd-name">${escapeHTML(p.player_name)}</div>
        <div class="potd-meta">
          #${p.jersey_number ?? '—'} · ${escapeHTML(p.team_name || '')}
          ${p.game_date ? ' · ' + escapeHTML(p.game_date) : ''}
        </div>
        <div class="stat-pills">
          <div class="stat-pill"><div class="stat-pill-val">${p.points}</div><div class="stat-pill-label">PTS</div></div>
          <div class="stat-pill"><div class="stat-pill-val">${p.rebounds}</div><div class="stat-pill-label">REB</div></div>
          <div class="stat-pill"><div class="stat-pill-val">${p.assists}</div><div class="stat-pill-label">AST</div></div>
          <div class="stat-pill" style="border-color:rgba(232,82,10,0.3);background:rgba(232,82,10,0.1)">
            <div class="stat-pill-val" style="color:var(--orange)">${(p.points||0)+(p.rebounds||0)+(p.assists||0)}</div>
            <div class="stat-pill-label">SUM</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--muted)">
          ${escapeHTML(p.home_team_name)} ${p.home_score} – ${p.away_score} ${escapeHTML(p.away_team_name)}
        </div>
      </div>
    `
  } catch (e) {
    document.getElementById('potd-section').innerHTML = `<div class="alert alert-error">Failed to load Player of the Day.</div>`
  }
}

async function loadTeams() {
  const { data } = await axios.get('/api/teams')
  state.teams = data.teams || []
  const sel = document.getElementById('sel-team')
  sel.innerHTML = '<option value="">Select team...</option>' +
    state.teams.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('')
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
  target.innerHTML = '<div style="color:var(--muted);padding:16px 0"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Loading...</div>'
  try {
    const { data } = await axios.get('/api/player/' + playerId + '/stats')
    const { player, games, totals, averages } = data

    const initials = player.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

    target.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(232,82,10,0.2);border:2px solid rgba(232,82,10,0.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:var(--orange-light);flex-shrink:0">${initials}</div>
          <div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;line-height:1">${escapeHTML(player.name)}</div>
            <div style="font-size:13px;color:var(--muted);margin-top:3px">
              #${player.jersey_number ?? '—'} · ${escapeHTML(player.team_name || '')}
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
          <div class="stat-box"><div class="value" style="color:var(--cream)">${totals.games}</div><div class="label-text">Games</div></div>
          <div class="stat-box"><div class="value">${averages ? averages.points : '—'}</div><div class="label-text">PPG</div></div>
          <div class="stat-box"><div class="value" style="color:#60a5fa">${averages ? averages.rebounds : '—'}</div><div class="label-text">RPG</div></div>
          <div class="stat-box"><div class="value" style="color:#a78bfa">${averages ? averages.assists : '—'}</div><div class="label-text">APG</div></div>
        </div>

        <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;margin-bottom:10px;color:var(--cream)">Game Log</div>
        ${games.length === 0
          ? '<div style="color:var(--muted);font-size:14px">No games recorded yet.</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th style="text-align:left">Date</th>
                  <th style="text-align:left">Matchup</th>
                  <th style="text-align:right">PTS</th>
                  <th style="text-align:right">REB</th>
                  <th style="text-align:right">AST</th>
                </tr></thead>
                <tbody>${games.map(g => `
                  <tr>
                    <td style="color:var(--muted)">${escapeHTML(g.game_date || '—')}</td>
                    <td>${escapeHTML(g.home_team_name)} ${g.home_score}–${g.away_score} ${escapeHTML(g.away_team_name)}</td>
                    <td style="text-align:right;font-weight:700;color:var(--orange)">${g.points}</td>
                    <td style="text-align:right;color:#60a5fa">${g.rebounds}</td>
                    <td style="text-align:right;color:#a78bfa">${g.assists}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`
        }

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--navy-border);display:flex;flex-wrap:wrap;gap:20px;font-size:13px;color:var(--muted)">
          <div><span style="color:var(--cream);font-weight:600">Total PTS:</span> ${totals.points}</div>
          <div><span style="color:var(--cream);font-weight:600">Total REB:</span> ${totals.rebounds}</div>
          <div><span style="color:var(--cream);font-weight:600">Total AST:</span> ${totals.assists}</div>
        </div>
      </div>
    `
  } catch (err) {
    target.innerHTML = '<div class="alert alert-error">Failed to load player stats.</div>'
  }
}

function escapeHTML(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

render()
loadPOTD()
loadTeams()
