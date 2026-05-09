// Home page - list tournaments
async function loadTournaments() {
  const container = document.getElementById('tournaments-list');
  try {
    const { data } = await axios.get('/api/tournaments');
    if (!data.tournaments || data.tournaments.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <i class="fas fa-info-circle mr-2"></i>No tournaments yet.
          <a href="/admin" class="text-orange-500 underline ml-1">Create one</a>
        </div>`;
      return;
    }
    container.innerHTML = data.tournaments.map(t => `
      <div class="card hover:shadow-lg transition">
        <h3 class="text-lg font-bold mb-1">${escapeHtml(t.name)}</h3>
        ${t.location ? `<p class="text-sm text-gray-600 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(t.location)}</p>` : ''}
        ${t.start_date ? `<p class="text-sm text-gray-600 mb-3"><i class="fas fa-calendar mr-1"></i>${escapeHtml(t.start_date)}${t.end_date ? ' - ' + escapeHtml(t.end_date) : ''}</p>` : ''}
        ${t.description ? `<p class="text-sm text-gray-700 mb-3">${escapeHtml(t.description)}</p>` : ''}
        <div class="flex gap-2 flex-wrap">
          <a href="/tournament/${t.id}" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i>View</a>
          <a href="/gallery/${t.id}" class="btn btn-secondary btn-sm"><i class="fas fa-images"></i>Photos</a>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="alert alert-error">Failed to load tournaments</div>`;
  }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

loadTournaments();
