// Home page - hero + browse cards (tournaments hidden from public view)
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// Inject hero + browse cards, and remove any leftover tournaments section
function buildHero() {
  const main = document.querySelector('main');
  if (!main) return;

  // Replace the generic hero with our styled one (3-chip stat strip — no Tournaments)
  const heroSection = main.querySelector('section:first-child');
  if (heroSection) {
    heroSection.outerHTML = `
      <section style="margin-bottom:40px">
        <div class="hero-eyebrow">Tournament Tracker</div>
        <div class="hero-title">Every Point.<br>Every Play.</div>
        <div class="hero-sub">Basketball tournament stats — points, rebounds, and assists. Find your player, scout your opponent, track your team.</div>
        <div class="stat-strip stat-strip-3" id="stat-strip">
          <div class="stat-chip"><div class="stat-chip-num" id="count-players">—</div><div class="stat-chip-label">Players</div></div>
          <div class="stat-chip"><div class="stat-chip-num" id="count-teams">—</div><div class="stat-chip-label">Teams</div></div>
          <div class="stat-chip"><div class="stat-chip-num" id="count-games">—</div><div class="stat-chip-label">Games Played</div></div>
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

  // Remove any leftover tournaments section that may have been server-rendered
  const sections = main.querySelectorAll('section');
  sections.forEach(sec => {
    const h = sec.querySelector('h1, h2, h3');
    if (h && /tournaments?/i.test(h.textContent || '')) {
      sec.remove();
    }
    const list = sec.querySelector('#tournaments-list');
    if (list) sec.remove();
  });
}

async function loadCounts() {
  try {
    const { data } = await axios.get('/api/stats/counts');
    const el = id => document.getElementById(id);
    if (el('count-players')) el('count-players').textContent = data.players ?? 0;
    if (el('count-teams')) el('count-teams').textContent = data.teams ?? 0;
    if (el('count-games')) el('count-games').textContent = data.games ?? 0;
  } catch (e) {}
}

buildHero();
loadCounts();
