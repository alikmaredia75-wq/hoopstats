// Home page - hero + browse buttons (no descriptive blurbs, no duplicate sections)
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function buildHero() {
  const main = document.querySelector('main');
  if (!main) return;

  // Section 1: replace generic hero with styled hero
  const heroSection = main.querySelector('section:nth-child(1)');
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
          <div class="stat-chip"><div class="stat-chip-num" id="count-games">—</div><div class="stat-chip-label">Games Played</div></div>
        </div>
      </section>
    `;
  }

  // Section 2 (SSR stat strip): drop — already covered by chips above
  const ssrStatStrip = main.querySelector('section:nth-child(2)');
  if (ssrStatStrip) ssrStatStrip.remove();

  // Section that-was-3 (now nth-child(2) after the removal above): replace
  // the duplicate "Player Stats / Team Stats" browse-card block with clean buttons.
  const browseSection = main.querySelector('section:nth-child(2)');
  if (browseSection) {
    browseSection.outerHTML = `
      <section style="margin-bottom:32px">
        <div class="section-heading">Browse</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <a href="/player" class="card" style="text-align:center;padding:18px">
            <div style="font-size:24px;margin-bottom:8px;color:var(--orange)"><i class="fas fa-user-circle"></i></div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px">Player Stats</div>
          </a>
          <a href="/team" class="card" style="text-align:center;padding:18px">
            <div style="font-size:24px;margin-bottom:8px;color:var(--orange)"><i class="fas fa-users"></i></div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px">Team Stats</div>
          </a>
        </div>
      </section>
    `;
  }

  // Defensive: remove any stale tournaments grid container or leftover sections
  // that may exist from earlier server renders.
  main.querySelectorAll('section').forEach(sec => {
    const h2 = sec.querySelector('h2');
    if (h2 && /^Tournaments?$/i.test((h2.textContent || '').trim())) {
      // Only drop if this section doesn't contain real tournament cards.
      // (Our intent here is just to clean any stray duplicate.)
      const list = sec.querySelector('#tournaments-list');
      if (!list) sec.remove();
    }
  });
}

async function loadCounts() {
  try {
    const { data } = await axios.get('/api/stats/counts');
    const el = id => document.getElementById(id);
    if (el('count-players')) el('count-players').textContent = data.players ?? 0;
    if (el('count-tournaments')) el('count-tournaments').textContent = data.tournaments ?? 0;
    if (el('count-teams')) el('count-teams').textContent = data.teams ?? 0;
    if (el('count-games')) el('count-games').textContent = data.games ?? 0;
  } catch (e) {}
}

buildHero();
loadCounts();
