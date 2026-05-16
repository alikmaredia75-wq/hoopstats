// Home page - list tournaments (redesigned)
async function loadTournaments() {
  const container = document.getElementById('tournaments-list');
  try {
    const { data } = await axios.get('/api/tournaments');
    if (!data.tournaments || data.tournaments.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted)">
          <i class="fas fa-info-circle" style="margin-right:8px"></i>No tournaments yet.
        </div>`;
      return;
    }

    // Determine badge for each tournament based on dates
    container.innerHTML = data.tournaments.map(t => {
      const badge = getTournamentBadge(t);
      return `
        <div class="card" style="cursor:default">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
            <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700">${escapeHtml(t.name)}</h3>
            ${badge}
          </div>
          ${t.location ? `<p style="font-size:13px;color:var(--muted);margin-bottom:4px"><i class="fas fa-map-marker-alt" style="margin-right:6px;color:var(--orange)"></i>${escapeHtml(t.location)}</p>` : ''}
          ${t.start_date ? `<p style="font-size:13px;color:var(--muted);margin-bottom:10px"><i class="fas fa-calendar" style="margin-right:6px;color:var(--orange)"></i>${escapeHtml(t.start_date)}${t.end_date ? ' – ' + escapeHtml(t.end_date) : ''}</p>` : ''}
          ${t.description ? `<p style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.5">${escapeHtml(t.description)}</p>` : ''}
          <a href="/tournament/${t.id}" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i>View</a>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="alert alert-error">Failed to load tournaments</div>`;
  }
}

function getTournamentBadge(t) {
  if (!t.start_date && !t.end_date) return '';
  const now = new Date();
  const start = t.start_date ? new Date(t.start_date) : null;
  const end = t.end_date ? new Date(t.end_date) : null;
  if (end && now > end) return '<span class="badge badge-done">Completed</span>';
  if (start && now < start) return '<span class="badge badge-upcoming">Upcoming</span>';
  return '<span class="badge badge-active">● Active</span>';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// Inject hero section above tournaments
function buildHero() {
  const main = document.querySelector('main');
  if (!main) return;

  // Replace the generic hero with our styled one
  const heroSection = main.querySelector('section:first-child');
  if (heroSection) {
    heroSection.outerHTML = `
      <section style="margin-bottom:40px">
        <div class="hero-eyebrow">Tournament Tracker</div>
        <div class="hero-title">Every Point.<br>Every Play.</div>
        <div class="hero-sub">Basketball tournament stats — points, rebounds, and assists. Find your player, scout your opponent, track your team.</div>
        <div class="stat-strip" id="stat-strip">
          <div class="stat-chip"><div class="stat-chip-num" id="count-players">—</div><div class="stat-chip-label">Players</div></div>
          <div class="stat-chip"><div class="stat-chip-num" id="count-tournaments">—</div><div class="stat-chip-label">Tournaments</div></div>
          <div class="stat-chip"><div class="stat-chip-num" id="count-teams">—</div><div class="stat-chip-label">Teams</div></div>
          <div class="stat-chip"><div class="stat-chip-num">—</div><div class="stat-chip-label">Games Played</div></div>
        </div>
      </section>
    `;
  }

  // Restyle nav cards section
  const cardsSection = main.querySelector('section:nth-child(2)');
  if (cardsSection) {
    cardsSection.innerHTML = `
      <div class="section-heading">Browse</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:32px">
        <a href="/player" class="card">
          <div style="font-size:24px;margin-bottom:10px;color:var(--orange)"><i class="fas fa-user-circle"></i></div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;margin-bottom:4px">Player Stats</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.5">Player of the Day + pick any player to see their PTS / REB / AST breakdown.</div>
        </a>
        <a href="/team" class="card">
          <div style="font-size:24px;margin-bottom:10px;color:var(--orange)"><i class="fas fa-users"></i></div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;margin-bottom:4px">Team Stats</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.5">Pick a team to see the whole roster's averages and W/L record.</div>
        </a>
      </div>
    `;
  }

  // Style tournaments section header
  const tourSection = main.querySelector('section:last-child');
  if (tourSection) {
    const heading = tourSection.querySelector('h2');
    if (heading) {
      heading.className = '';
      heading.style.cssText = 'font-family:"Barlow Condensed",sans-serif;font-size:20px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px';
      heading.innerHTML = 'Tournaments <span style="flex:1;height:1px;background:rgba(255,255,255,0.07);display:block"></span>';
    }
    const grid = tourSection.querySelector('#tournaments-list');
    if (grid) {
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px';
    }
  }
}

async function loadCounts() {
  try {
    const [tourRes, playerRes] = await Promise.all([
      axios.get('/api/tournaments'),
      axios.get('/api/players')
    ]);
    const tournaments = tourRes.data.tournaments || [];
    const players = playerRes.data.players || [];
    const teamIds = new Set(players.map(p => p.team_id));

    const el = id => document.getElementById(id);
    if (el('count-players')) el('count-players').textContent = players.length;
    if (el('count-tournaments')) el('count-tournaments').textContent = tournaments.length;
    if (el('count-teams')) el('count-teams').textContent = teamIds.size;
  } catch(e) {}
}

buildHero();
loadTournaments();
loadCounts();
