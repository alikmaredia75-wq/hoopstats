// Gallery page - admin-only upload + public view
const ADMIN_PW_KEY = 'hoopstats_admin_pw';
const root = document.getElementById('gallery-app');
const tournamentId = document.getElementById('page-gallery').dataset.tournamentId;
let tournamentData = null;
let photos = [];
let isAdmin = false;

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function authHeaders() { return { 'X-Admin-Password': sessionStorage.getItem(ADMIN_PW_KEY) || '' }; }

async function checkAdmin() {
  if (!sessionStorage.getItem(ADMIN_PW_KEY)) { isAdmin = false; return false; }
  try {
    const { data } = await axios.post('/api/admin/check', {}, { headers: authHeaders() });
    isAdmin = !!data.ok;
  } catch (e) { isAdmin = false; }
  return isAdmin;
}

async function load() {
  try {
    await checkAdmin();
    const [t, p] = await Promise.all([
      axios.get(`/api/tournaments/${tournamentId}`),
      axios.get(`/api/photos?tournament_id=${tournamentId}`)
    ]);
    tournamentData = t.data;
    photos = p.data.photos || [];
    render();
  } catch (e) {
    root.innerHTML = `<div class="alert alert-error">Failed to load gallery</div>`;
  }
}

function render() {
  const t = tournamentData.tournament;
  const games = tournamentData.games || [];
  const gameOpts = games.map(g =>
    `<option value="${g.id}">${escapeHtml(g.home_team_name)} vs ${escapeHtml(g.away_team_name)} (${g.game_date || ''})</option>`
  ).join('');

  root.innerHTML = `
    <div class="section">
      <div class="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 class="text-3xl font-bold mb-1"><i class="fas fa-images text-green-500 mr-2"></i>Photo Gallery</h1>
          <p class="text-gray-600">${escapeHtml(t.name)}</p>
        </div>
        <a href="/tournament/${t.id}" class="btn btn-secondary"><i class="fas fa-arrow-left"></i>Back to Tournament</a>
      </div>
    </div>

    ${isAdmin ? `
    <div class="section">
      <h2 class="text-lg font-bold mb-3"><i class="fas fa-cloud-upload-alt mr-1"></i>Upload Photos <span class="text-sm font-normal text-gray-500">(Admin only)</span></h2>
      <div class="grid md:grid-cols-2 gap-3">
        <div><label class="label">Photo File *</label><input id="up-file" class="input" type="file" accept="image/*" multiple /></div>
        <div><label class="label">Game (optional)</label>
          <select id="up-game" class="select">
            <option value="">— No specific game —</option>
            ${gameOpts}
          </select>
        </div>
        <div><label class="label">Caption</label><input id="up-caption" class="input" placeholder="Optional caption" /></div>
        <div><label class="label">Uploaded By</label><input id="up-name" class="input" placeholder="Admin" /></div>
      </div>
      <button id="upload-btn" class="btn btn-primary mt-3"><i class="fas fa-upload"></i>Upload</button>
      <div id="upload-status" class="mt-2"></div>
    </div>
    ` : `
    <div class="section">
      <div class="alert alert-info"><i class="fas fa-lock mr-1"></i>Only admins can upload photos. If you have admin access, sign in via the admin panel and return here.</div>
    </div>
    `}

    <div class="section">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 class="text-lg font-bold"><i class="fas fa-photo-film mr-1"></i>Photos (${photos.length})</h2>
        <select id="filter-game" class="select" style="max-width:280px">
          <option value="">All photos</option>
          ${gameOpts}
        </select>
      </div>
      <div id="gallery-grid">${renderGrid(photos)}</div>
    </div>
  `;

  if (isAdmin) {
    document.getElementById('upload-btn').addEventListener('click', uploadFiles);
  }
  document.getElementById('filter-game').addEventListener('change', (e) => {
    const v = e.target.value;
    const filtered = v ? photos.filter(p => String(p.game_id) === String(v)) : photos;
    document.getElementById('gallery-grid').innerHTML = renderGrid(filtered);
    attachPhotoHandlers();
  });
  attachPhotoHandlers();
}

function renderGrid(list) {
  if (list.length === 0) return '<p class="text-gray-500 text-center py-6">No photos yet.</p>';
  return `<div class="gallery-grid">
    ${list.map(p => `
      <div class="gallery-item" data-id="${p.id}" data-url="/api/photos/file/${p.id}" data-caption="${escapeHtml(p.caption || '')}" data-uploader="${escapeHtml(p.uploaded_by || '')}">
        <img src="/api/photos/file/${p.id}" alt="${escapeHtml(p.caption || 'Game photo')}" loading="lazy" />
        ${(p.caption || p.home_team_name) ? `
          <div class="caption">
            ${p.caption ? `<div>${escapeHtml(p.caption)}</div>` : ''}
            ${p.home_team_name ? `<div class="text-xs opacity-80">${escapeHtml(p.home_team_name)} vs ${escapeHtml(p.away_team_name)}</div>` : ''}
            ${p.uploaded_by ? `<div class="text-xs opacity-70">— ${escapeHtml(p.uploaded_by)}</div>` : ''}
          </div>
        ` : ''}
        ${isAdmin ? `<button class="del-photo-btn" data-id="${p.id}" title="Delete (admin)" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.9);color:white;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:0.85rem"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function attachPhotoHandlers() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.del-photo-btn')) return;
      openLightbox(item.dataset.url, item.dataset.caption, item.dataset.uploader);
    });
  });
  document.querySelectorAll('.del-photo-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this photo?')) return;
      try {
        await axios.delete(`/api/photos/${btn.dataset.id}`, { headers: authHeaders() });
        photos = photos.filter(p => String(p.id) !== String(btn.dataset.id));
        render();
      } catch (e) { alert(e.response?.data?.error || 'Delete failed'); }
    });
  });
}

function openLightbox(url, caption, uploader) {
  const div = document.createElement('div');
  div.className = 'modal-backdrop';
  div.innerHTML = `
    <button class="modal-close">&times;</button>
    <div class="text-center">
      <img src="${url}" alt="" />
      ${caption ? `<div class="text-white mt-3 text-lg">${escapeHtml(caption)}</div>` : ''}
      ${uploader ? `<div class="text-white opacity-70 text-sm mt-1">— ${escapeHtml(uploader)}</div>` : ''}
    </div>
  `;
  div.addEventListener('click', (e) => {
    if (e.target === div || e.target.classList.contains('modal-close')) {
      document.body.removeChild(div);
    }
  });
  document.body.appendChild(div);
}

async function uploadFiles() {
  const files = document.getElementById('up-file').files;
  const game_id = document.getElementById('up-game').value;
  const caption = document.getElementById('up-caption').value.trim();
  const uploaded_by = document.getElementById('up-name').value.trim() || 'Admin';
  const status = document.getElementById('upload-status');
  if (!files || files.length === 0) { status.innerHTML = '<div class="alert alert-error">Please choose at least one image file.</div>'; return; }

  status.innerHTML = `<div class="alert alert-info">Uploading ${files.length} file(s)...</div>`;
  let success = 0, failed = 0;
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tournament_id', tournamentId);
    if (game_id) fd.append('game_id', game_id);
    if (caption) fd.append('caption', caption);
    fd.append('uploaded_by', uploaded_by);
    try {
      await axios.post('/api/photos/upload', fd, { headers: authHeaders() });
      success++;
    } catch (e) {
      failed++;
    }
  }
  status.innerHTML = `<div class="alert ${failed === 0 ? 'alert-success' : 'alert-error'}"><i class="fas fa-check mr-1"></i>${success} uploaded${failed ? ', ' + failed + ' failed' : ''}.</div>`;
  document.getElementById('up-file').value = '';
  document.getElementById('up-caption').value = '';
  await load();
}

load();
