// Team page — dropdown-based team selection (redesigned)
const root = document.getElementById('team-app')

const state = {
  tournaments: [],
  teams: [],
  selectedTournamentId: '',
  selectedTeamId: '',
}

function render() {
  root.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <p style="color:var(--muted);margin-bottom:14px;font-size:14px">Pick a tournament and team to see the whole roster's PTS / REB / AST averages and record.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <select id="sel-tournament">
          <option value="">Select tournament...</option>
        </select>
        <select id="sel-team" disabled>
          <option value="">Select team...</option>
        </select>
      </div>
    </div>
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
  target.innerHTML = '<div style="color:var(--muted);padding:16px 0"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Loading...</div>'
  try {
    const { data } = await axios.get('/api/team/' + teamId + '/stats')
    const { team, record, players, games } = data

    const totalGames = record.wins + record.losses
    const winPct = totalGames > 0 ? Math.round((record.wins / totalGames) * 100) : 0

    // Team averages across all players
    let totalPts = 0, totalReb = 0, totalAst = 0, playerCount = 0
    for (const p of players) {
      if (p.averages) {
        totalPts += p.averages.points
        totalReb += p.averages.rebounds
        totalAst += p.averages.assists
        playerCount++
      }
    }

    target.innerHTML = `
      <!-- Team Header -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:12px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800">${escapeHTML(team.name)}</div>
          <div style="font-size:13px;color:var(--muted)">${escapeHTML(team.tournament_name || '')}</div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="font-size:13px;color:var(--muted)">${record.wins}W – ${record.losses}L</div>
          <div class="wl-bar-wrap"><div class="wl-bar" style="width:${winPct}%"></div></div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:var(--win)">${winPct}%</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div class="stat-box"><div class="value" style="color:var(--win)">${record.wins}</div><div class="label-text">Wins</div></div>
          <div class="stat-box"><div class="value" style="color:var(--loss)">${record.losses}</div><div class="label-text">Losses</div></div>
          <div class="stat-box"><div class="value" style="color:var(--orange)">${record.points_for}</div><div class="label-text">Pts For</div></div>
          <div class="stat-box"><div class="value" style="color:#60a5fa">${record.points_against}</div><div class="label-text">Pts Agn</div></div>
        </div>
      </div>

      <!-- Roster -->
      <div class="card" style="margin-bottom:16px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;margin-bottom:14px">
          Roster
        </div>
        ${players.length === 0
          ? '<div style="color:var(--muted);font-size:14px">No players on this team yet.</div>'
          : `<div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th style="text-align:left">#</th>
                  <th style="text-align:left">Player</th>
                  <th style="text-align:left">Pos</th>
                  <th style="text-align:right">GP</th>
                  <th style="text-align:right">PPG</th>
                  <th style="text-align:right">RPG</th>
                  <th style="text-align:right">APG</th>
                  <th style="text-align:right">Tot PTS</th>
                  <th style="text-align:right">Tot REB</th>
                  <th style="text-align:right">Tot AST</th>
                </tr></thead>
                <tbody>${players.map(p => {
                  const maxPts = Math.max(...players.filter(x=>x.averages).map(x=>x.averages.points), 1)
                  const pctPts = p.averages ? Math.round((p.averages.points / maxPts) * 100) : 0
                  return `
                    <tr>
                      <td>
                        <div style="width:28px;height:28px;border-radius:6px;background:rgba(232,82,10,0.18);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:13px;color:var(--orange-light)">
                          ${p.player.jersey_number ?? '—'}
                        </div>
                      </td>
                      <td style="font-weight:600">${escapeHTML(p.player.name)}</td>
                      <td style="color:var(--muted)">${escapeHTML(p.player.position || '—')}</td>
                      <td style="text-align:right;color:var(--muted)">${p.totals.games}</td>
                      <td style="text-align:right">
                        <div style="color:var(--orange);font-weight:700">${p.averages ? p.averages.points : '—'}</div>
                        ${p.averages ? `<div style="width:100%;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${pctPts}%;background:var(--orange);border-radius:2px"></div></div>` : ''}
                      </td>
                      <td style="text-align:right;color:#60a5fa">${p.averages ? p.averages.rebounds : '—'}</td>
                      <td style="text-align:right;color:#a78bfa">${p.averages ? p.averages.assists : '—'}</td>
                      <td style="text-align:right;color:var(--muted)">${p.totals.points}</td>
                      <td style="text-align:right;color:var(--muted)">${p.totals.rebounds}</td>
                      <td style="text-align:right;color:var(--muted)">${p.totals.assists}</td>
                    </tr>`
                }).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>

      <!-- Games -->
      <div class="card">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;margin-bottom:14px">Games</div>
        ${(!games || games.length === 0)
          ? '<div style="color:var(--muted);font-size:14px">No games recorded.</div>'
          : `<div>${games.map(g => {
              const isHome = g.home_team_id == team.id
              const own = isHome ? g.home_score : g.away_score
              const opp = isHome ? g.away_score : g.home_score
              const won = (own || 0) > (opp || 0)
              const lost = (own || 0) < (opp || 0)
              const resultColor = won ? 'var(--win)' : lost ? 'var(--loss)' : 'var(--muted)'
              const resultText = won ? 'W' : lost ? 'L' : 'T'
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--navy-border);font-size:13px">
                <span style="color:var(--muted)">${escapeHTML(g.game_date || '—')}</span>
                <span style="color:var(--cream)">${escapeHTML(g.home_team_name)} ${g.home_score} – ${g.away_score} ${escapeHTML(g.away_team_name)}</span>
                <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;color:${resultColor}">${resultText}</span>
              </div>`
            }).join('')}</div>`
        }
      </div>
    `
  } catch (err) {
    target.innerHTML = '<div class="alert alert-error">Failed to load team stats.</div>'
  }
}

function escapeHTML(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

render()
loadTournaments()
