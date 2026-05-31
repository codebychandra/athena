// ─────────────────────────────────────────────────────────────────────────────
//  CTI Athena — AI Knowledge Library  app.js  (v2)
// ─────────────────────────────────────────────────────────────────────────────

const WORKER_URL = 'https://cti-athena.cti-athena.workers.dev';

const ENTRY_TYPES = [
  'Definition',
  'Filter Guide',
  'Data Source',
  'Business Rule',
  'Calculation',
  'FAQ',
  'Example',
];

const PORTALS = ['Cruise Line', 'J1 Program', 'Both', 'General'];

const TYPE_COLORS = {
  'Definition':    '#1B3A6B',
  'Filter Guide':  '#2D7A55',
  'Data Source':   '#0891B2',
  'Business Rule': '#B01A18',
  'Calculation':   '#7C3AED',
  'FAQ':           '#D97706',
  'Example':       '#6B7280',
};

const PORTAL_COLORS = {
  'Cruise Line': '#B01A18',
  'J1 Program':  '#1B3A6B',
  'Both':        '#2D7A55',
  'General':     '#6B7280',
};

// ── Backward-compat normalizer ────────────────────────────────────────────────
function normalizeEntry(e) {
  return {
    ...e,
    title:  e.title  || e.topic    || '',
    type:   e.type   || 'Definition',
    portal: e.portal || e.category || 'General',
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
let allEntries   = [];
let activePortal = 'All';
let activeType   = 'All';
let searchQuery  = '';
let editingId    = null;

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.style.cssText = `
    background:${type === 'success' ? '#2D7A55' : '#B01A18'};
    color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;
    font-weight:500;margin-bottom:8px;box-shadow:0 4px 16px rgba(0,0,0,0.18);
    opacity:0;transform:translateY(-8px);
    transition:opacity 0.2s,transform 0.2s;pointer-events:none;
  `;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateY(0)'; });
  setTimeout(() => {
    t.style.opacity='0'; t.style.transform='translateY(-8px)';
    setTimeout(() => t.remove(), 220);
  }, 3000);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchEntries() {
  const res = await fetch(WORKER_URL + '/api/knowledge');
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return (data.entries || []).map(normalizeEntry);
}

async function saveEntry(entry) {
  const res = await fetch(WORKER_URL + '/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', entry }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

async function deleteEntry(id) {
  const res = await fetch(WORKER_URL + '/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

// ── Filter ────────────────────────────────────────────────────────────────────
function getFilteredEntries() {
  let list = allEntries;
  if (activePortal !== 'All') {
    list = list.filter(e => e.portal === activePortal);
  }
  if (activeType !== 'All') {
    list = list.filter(e => e.type === activeType);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(e =>
      (e.title        || '').toLowerCase().includes(q) ||
      (e.content      || '').toLowerCase().includes(q) ||
      (e.whereToFind  || '').toLowerCase().includes(q) ||
      (e.relatedTerms || '').toLowerCase().includes(q)
    );
  }
  return list;
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderPortalTabs();
  renderTypeTabs();
  renderStatsBar();
  renderTable();
}

function renderPortalTabs() {
  const c = document.getElementById('kb-portal-tabs');
  if (!c) return;
  const tabs = ['All', ...PORTALS];
  c.innerHTML = tabs.map(p => {
    const active = p === activePortal;
    const color  = p === 'All' ? '#1B3A6B' : (PORTAL_COLORS[p] || '#6B7280');
    return `<button class="kb-tab${active ? ' kb-tab-active' : ''}" data-portal="${p}"
      style="${active ? `background:${color};color:#fff;border-color:${color};` : ''}"
    >${p}</button>`;
  }).join('');
  c.querySelectorAll('[data-portal]').forEach(btn => {
    btn.addEventListener('click', () => { activePortal = btn.dataset.portal; render(); });
  });
}

function renderTypeTabs() {
  const c = document.getElementById('kb-type-tabs');
  if (!c) return;
  const tabs = ['All', ...ENTRY_TYPES];
  c.innerHTML = tabs.map(t => {
    const active = t === activeType;
    const color  = t === 'All' ? '#6B7280' : (TYPE_COLORS[t] || '#6B7280');
    return `<button class="kb-tab kb-tab-sm${active ? ' kb-tab-active' : ''}" data-type="${t}"
      style="${active ? `background:${color};color:#fff;border-color:${color};` : ''}"
    >${t}</button>`;
  }).join('');
  c.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { activeType = btn.dataset.type; render(); });
  });
}

function renderStatsBar() {
  const bar = document.getElementById('kb-stats-bar');
  if (!bar) return;
  const total = allEntries.length;
  const typeCounts = {};
  ENTRY_TYPES.forEach(t => { typeCounts[t] = allEntries.filter(e => e.type === t).length; });
  const topTypes = ENTRY_TYPES.filter(t => typeCounts[t] > 0).slice(0, 4);
  const parts = [`<strong>${total}</strong> ${total === 1 ? 'entry' : 'entries'}`];
  topTypes.forEach(t => { parts.push(`${typeCounts[t]} ${t}s`); });
  bar.innerHTML = parts.join(' &nbsp;·&nbsp; ');
}

// ── Table render ──────────────────────────────────────────────────────────────
function renderTable() {
  const wrap = document.getElementById('kb-grid');
  if (!wrap) return;
  const entries = getFilteredEntries();

  if (entries.length === 0) {
    const isEmpty = allEntries.length === 0;
    wrap.innerHTML = `
      <div class="kb-empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted,#9CA3AF);margin-bottom:12px;">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <p class="kb-empty-text">
          ${isEmpty ? 'No knowledge entries yet.<br>Add your first entry to teach the AI.' : 'No entries match your current filters.'}
        </p>
        ${isEmpty ? `<button class="kb-btn-primary" id="emptyAddBtn">+ Add Your First Entry</button>` : ''}
      </div>`;
    document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);
    return;
  }

  wrap.innerHTML = `
    <table class="kb-table">
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Knowledge Title</th>
          <th style="width:130px;">Portal</th>
          <th style="width:130px;">Category</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map((entry, i) => {
          const tc = TYPE_COLORS[entry.type]    || '#6B7280';
          const pc = PORTAL_COLORS[entry.portal] || '#6B7280';
          return `<tr class="kb-row" data-id="${escAttr(entry.id)}">
            <td style="text-align:center;color:var(--text-muted,#888);font-size:11px;">${i + 1}</td>
            <td class="kb-row-title">${escHtml(entry.title)}</td>
            <td><span class="kb-badge" style="background:${pc}18;color:${pc};border:1px solid ${pc}30;">${escHtml(entry.portal)}</span></td>
            <td><span class="kb-badge" style="background:${tc}18;color:${tc};border:1px solid ${tc}30;">${escHtml(entry.type)}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('.kb-row').forEach(row => {
    row.addEventListener('click', () => openSidePanel(row.dataset.id));
  });
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function openSidePanel(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;

  const tc = TYPE_COLORS[entry.type]    || '#6B7280';
  const pc = PORTAL_COLORS[entry.portal] || '#6B7280';

  const relatedHtml = entry.relatedTerms
    ? entry.relatedTerms.split(',').map(t => t.trim()).filter(Boolean)
        .map(t => `<span class="kb-term-tag">${escHtml(t)}</span>`).join('')
    : '';

  let panel = document.getElementById('kb-side-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'kb-side-panel';
    panel.className = 'kb-side-panel';
    document.querySelector('.kb-page')?.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="kb-sp-header">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="kb-badge" style="background:${pc}18;color:${pc};border:1px solid ${pc}30;">${escHtml(entry.portal)}</span>
        <span class="kb-badge" style="background:${tc}18;color:${tc};border:1px solid ${tc}30;">${escHtml(entry.type)}</span>
      </div>
      <button class="kb-sp-close" id="kb-sp-close-btn" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="kb-sp-title">${escHtml(entry.title)}</div>

    <div class="kb-sp-section">
      <div class="kb-sp-label">Description</div>
      <div class="kb-sp-content">${escHtml(entry.content || '—')}</div>
    </div>

    ${entry.whereToFind ? `
    <div class="kb-sp-section">
      <div class="kb-sp-label">📍 Where to Find</div>
      <div class="kb-sp-where">${escHtml(entry.whereToFind)}</div>
    </div>` : ''}

    ${relatedHtml ? `
    <div class="kb-sp-section">
      <div class="kb-sp-label">Related Terms</div>
      <div class="kb-related-terms">${relatedHtml}</div>
    </div>` : ''}

    ${entry.updatedAt ? `
    <div style="font-size:10.5px;color:var(--text-muted,#888);margin-top:auto;padding-top:16px;">
      Last updated ${relativeTime(entry.updatedAt)}
    </div>` : ''}

    <div class="kb-sp-footer">
      <button class="kb-btn-secondary kb-sp-edit-btn" data-id="${escAttr(entry.id)}">Edit</button>
      <button class="kb-btn-delete kb-sp-del-btn" data-id="${escAttr(entry.id)}">Delete</button>
    </div>`;

  panel.classList.add('kb-sp-open');

  document.getElementById('kb-sp-close-btn').addEventListener('click', closeSidePanel);
  panel.querySelector('.kb-sp-edit-btn').addEventListener('click', () => { closeSidePanel(); openEditModal(id); });
  panel.querySelector('.kb-sp-del-btn').addEventListener('click', () => { closeSidePanel(); confirmDelete(id); });

  // Highlight active row
  document.querySelectorAll('.kb-row').forEach(r => r.classList.toggle('kb-row-active', r.dataset.id === id));
}

function closeSidePanel() {
  const panel = document.getElementById('kb-side-panel');
  if (panel) panel.classList.remove('kb-sp-open');
  document.querySelectorAll('.kb-row').forEach(r => r.classList.remove('kb-row-active'));
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function renderSkeleton() {
  const wrap = document.getElementById('kb-grid');
  if (!wrap) return;
  wrap.innerHTML = `
    <table class="kb-table">
      <thead><tr>
        <th style="width:36px;">#</th><th>Knowledge Title</th>
        <th style="width:130px;">Portal</th><th style="width:130px;">Category</th>
      </tr></thead>
      <tbody>${Array(8).fill(0).map((_, i) => `
        <tr class="kb-row">
          <td style="text-align:center;"><div class="skeleton-block" style="height:11px;width:16px;margin:auto;"></div></td>
          <td><div class="skeleton-block" style="height:13px;width:${60 + (i % 3) * 15}%;"></div></td>
          <td><div class="skeleton-block" style="height:20px;width:80px;border-radius:10px;"></div></td>
          <td><div class="skeleton-block" style="height:20px;width:88px;border-radius:10px;"></div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Error banner ──────────────────────────────────────────────────────────────
function renderError(msg) {
  const wrap = document.getElementById('kb-grid');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="kb-error-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Failed to load: ${escHtml(msg)}</span>
      <button onclick="loadEntries()" style="margin-left:12px;padding:4px 12px;border-radius:6px;
        border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;font-size:12px;">Retry</button>
    </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAddModal() {
  editingId = null;
  openModal({ id: null, type: '', portal: '', title: '', content: '', whereToFind: '', relatedTerms: '' });
}

function openEditModal(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  openModal(entry);
}

function openModal(entry) {
  const modal = document.getElementById('kb-modal');
  if (!modal) return;

  document.getElementById('modal-title-label').textContent = entry.id ? 'Edit Entry' : 'Add Knowledge Entry';
  document.getElementById('modal-type').value         = entry.type   || '';
  document.getElementById('modal-portal').value       = entry.portal || '';
  document.getElementById('modal-entry-title').value  = entry.title  || '';
  document.getElementById('modal-content').value      = entry.content      || '';
  document.getElementById('modal-where').value        = entry.whereToFind  || '';
  document.getElementById('modal-related').value      = entry.relatedTerms || '';

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    document.getElementById('modal-card').style.transform = 'scale(1)';
  });
  document.getElementById('modal-entry-title').focus();
}

function closeModal() {
  const modal = document.getElementById('kb-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  document.getElementById('modal-card').style.transform = 'scale(0.97)';
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  editingId = null;
}

async function handleSave() {
  const type         = document.getElementById('modal-type').value.trim();
  const portal       = document.getElementById('modal-portal').value.trim();
  const title        = document.getElementById('modal-entry-title').value.trim();
  const content      = document.getElementById('modal-content').value.trim();
  const whereToFind  = document.getElementById('modal-where').value.trim();
  const relatedTerms = document.getElementById('modal-related').value.trim();

  if (!type)    { showToast('Please select an entry type.', 'error');  return; }
  if (!portal)  { showToast('Please select a portal.', 'error');       return; }
  if (!title)   { showToast('Title is required.', 'error');            return; }
  if (!content) { showToast('Content is required.', 'error');          return; }

  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  const entry = { type, portal, title, content, whereToFind, relatedTerms };
  if (editingId) entry.id = editingId;

  try {
    const result = await saveEntry(entry);
    if (result.ok) {
      allEntries = (result.entries || []).map(normalizeEntry);
      closeModal();
      render();
      showToast(editingId ? 'Entry updated.' : 'Entry added.');
    } else {
      showToast(result.error || 'Save failed.', 'error');
    }
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function confirmDelete(id) {
  const entry = allEntries.find(e => e.id === id);
  const label = entry?.title || 'this entry';
  if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

  try {
    const result = await deleteEntry(id);
    if (result.ok) {
      allEntries = (result.entries || allEntries.filter(e => e.id !== id)).map(normalizeEntry);
      render();
      showToast('Entry deleted.');
    } else {
      showToast(result.error || 'Delete failed.', 'error');
    }
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadEntries() {
  renderSkeleton();
  try {
    allEntries = await fetchEntries();
    render();
  } catch (err) {
    renderError(err.message);
  }
}

// ── Build page HTML ───────────────────────────────────────────────────────────
function buildPage() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const typeOptions  = ENTRY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const portalOptions = PORTALS.map(p => `<option value="${p}">${p}</option>`).join('');

  main.innerHTML = `
    <div class="kb-page">

      <!-- Header -->
      <div class="kb-page-header">
        <div class="kb-header-left">
          <h1 class="kb-page-title">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            AI Knowledge Library
          </h1>
          <p class="kb-page-subtitle">Self-service data intelligence for CTI Group</p>
        </div>
        <div class="kb-header-right">
          <button class="kb-btn-primary" id="addEntryBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Entry
          </button>
          <div class="kb-search-wrap">
            <svg class="kb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="kb-search" class="kb-search-input" placeholder="Search title, content, filters…">
          </div>
        </div>
      </div>

      <!-- Portal filter row -->
      <div class="kb-filter-section">
        <span class="kb-filter-label">Portal</span>
        <div class="kb-tab-row" id="kb-portal-tabs"></div>
      </div>

      <!-- Type filter row -->
      <div class="kb-filter-section" style="margin-top:6px;">
        <span class="kb-filter-label">Type</span>
        <div class="kb-tab-row" id="kb-type-tabs"></div>
      </div>

      <!-- Stats bar -->
      <div class="kb-stats-bar" id="kb-stats-bar"></div>

      <!-- Table container -->
      <div id="kb-grid"></div>

    </div>

    <!-- Add/Edit Modal -->
    <div id="kb-modal" style="display:none;opacity:0;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;transition:opacity 0.18s;">
      <div id="modal-card" style="background:var(--card-bg,#fff);border-radius:14px;width:600px;max-width:calc(100vw - 24px);max-height:90vh;overflow-y:auto;box-shadow:0 28px 72px rgba(0,0,0,0.22);transform:scale(0.97);transition:transform 0.18s;padding:28px 28px 24px;">

        <!-- Modal header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
          <h2 id="modal-title-label" style="font-size:16px;font-weight:700;color:var(--text,#1A1A1A);margin:0;">Add Knowledge Entry</h2>
          <button id="modal-close-btn" title="Close"
            style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;color:var(--text-muted,#9CA3AF);transition:background 0.15s;"
            onmouseover="this.style.background='var(--bg-page,#f3f4f6)'" onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Row 1: Type + Portal -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
          <div class="kb-form-group" style="margin-bottom:0">
            <label class="kb-label" for="modal-type">Type <span style="color:#B01A18">*</span></label>
            <select id="modal-type" class="kb-select">
              <option value="">— Select type —</option>
              ${typeOptions}
            </select>
          </div>
          <div class="kb-form-group" style="margin-bottom:0">
            <label class="kb-label" for="modal-portal">Portal <span style="color:#B01A18">*</span></label>
            <select id="modal-portal" class="kb-select">
              <option value="">— Select portal —</option>
              ${portalOptions}
            </select>
          </div>
        </div>

        <!-- Row 2: Title -->
        <div class="kb-form-group">
          <label class="kb-label" for="modal-entry-title">Title <span style="color:#B01A18">*</span></label>
          <input type="text" id="modal-entry-title" class="kb-input"
            placeholder="e.g. Report to Ship, MCV Visa, How is YoY calculated?">
        </div>

        <!-- Row 3: Content -->
        <div class="kb-form-group">
          <label class="kb-label" for="modal-content">Content <span style="color:#B01A18">*</span></label>
          <textarea id="modal-content" class="kb-textarea" rows="7"
            placeholder="Full explanation — define the term, describe the rule, show the calculation…"></textarea>
        </div>

        <!-- Row 4: Where to Find -->
        <div class="kb-form-group">
          <label class="kb-label" for="modal-where">Where to Find <span class="kb-optional">(optional)</span></label>
          <input type="text" id="modal-where" class="kb-input"
            placeholder="e.g. Seafarer page → filter by Onboarding Status">
        </div>

        <!-- Row 5: Related Terms -->
        <div class="kb-form-group">
          <label class="kb-label" for="modal-related">Related Terms <span class="kb-optional">(optional, comma-separated)</span></label>
          <input type="text" id="modal-related" class="kb-input"
            placeholder="e.g. OKTB, Visa, Sign On Date">
        </div>

        <!-- Footer -->
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;padding-top:16px;border-top:1px solid var(--border,#E5E7EB);">
          <button id="modal-cancel-btn" class="kb-btn-secondary">Cancel</button>
          <button id="modal-save-btn"   class="kb-btn-primary">Save</button>
        </div>
      </div>
    </div>
  `;

  // Wire events
  document.getElementById('addEntryBtn').addEventListener('click', openAddModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', handleSave);

  document.getElementById('kb-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('kb-modal')) closeModal();
  });

  document.getElementById('kb-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeSidePanel(); }
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Page wrapper */
    .kb-page {
      padding: 24px 28px;
      max-width: 1300px;
      margin: 0 auto;
    }

    /* Header */
    .kb-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 18px;
    }
    .kb-header-left { display: flex; flex-direction: column; gap: 3px; }
    .kb-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .kb-page-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--text, #1A1A1A);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 9px;
      line-height: 1.2;
    }
    .kb-page-subtitle {
      font-size: 12.5px;
      color: var(--text-muted, #888);
      margin: 0;
      padding-left: 30px;
    }

    /* Buttons */
    .kb-btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; border: none;
      background: #1B3A6B; color: #fff;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; white-space: nowrap;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .kb-btn-primary:hover  { background: #142d55; box-shadow: 0 2px 8px rgba(27,58,107,0.3); }
    .kb-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .kb-btn-secondary {
      display: inline-flex; align-items: center;
      padding: 8px 16px; border-radius: 8px;
      border: 1px solid var(--border, #E5E7EB);
      background: transparent; color: var(--text, #1A1A1A);
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: background 0.15s;
    }
    .kb-btn-secondary:hover { background: var(--bg-page, #F3F4F6); }

    /* Search */
    .kb-search-wrap { position: relative; display: flex; align-items: center; }
    .kb-search-icon {
      position: absolute; left: 10px;
      color: var(--text-muted, #9CA3AF); pointer-events: none;
    }
    .kb-search-input {
      padding: 7px 12px 7px 32px; border-radius: 8px;
      border: 1px solid var(--border, #E5E7EB);
      background: var(--card-bg, #fff); color: var(--text, #1A1A1A);
      font-size: 13px; font-family: inherit; width: 230px;
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .kb-search-input:focus { border-color: #1B3A6B; box-shadow: 0 0 0 2px rgba(27,58,107,0.12); }
    .kb-search-input::placeholder { color: var(--text-muted, #9CA3AF); }

    /* Filter bar */
    .kb-filter-section {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .kb-filter-label {
      font-size: 11.5px; font-weight: 600; color: var(--text-muted, #888);
      text-transform: uppercase; letter-spacing: 0.05em;
      min-width: 38px;
    }
    .kb-tab-row { display: flex; flex-wrap: wrap; gap: 5px; }

    /* Tabs */
    .kb-tab {
      padding: 5px 13px; border-radius: 20px;
      border: 1px solid var(--border, #E5E7EB);
      background: transparent; color: var(--text, #1A1A1A);
      font-size: 12.5px; font-weight: 500; cursor: pointer;
      font-family: inherit; transition: all 0.15s; white-space: nowrap;
    }
    .kb-tab:hover:not(.kb-tab-active) { background: var(--bg-page, #F3F4F6); }
    .kb-tab-active { font-weight: 600; }
    .kb-tab-sm { font-size: 11.5px; padding: 4px 11px; }

    /* Stats bar */
    .kb-stats-bar {
      margin: 14px 0 16px;
      font-size: 12.5px; color: var(--text-muted, #888);
      padding: 8px 14px;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #E5E7EB);
      border-radius: 8px;
      line-height: 1.5;
    }
    .kb-stats-bar strong { color: var(--text, #1A1A1A); }

    /* Table wrapper + side panel layout */
    .kb-grid { position: relative; }
    .kb-page { position: relative; }

    /* Table */
    .kb-table {
      width: 100%; border-collapse: collapse;
      background: var(--card-bg,#fff);
      border: 1px solid var(--border,#E5E7EB);
      border-radius: 10px; overflow: hidden;
    }
    .kb-table thead tr {
      background: var(--bg-page,#F9FAFB);
      border-bottom: 1px solid var(--border,#E5E7EB);
    }
    .kb-table th {
      padding: 9px 14px; text-align: left;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.05em; text-transform: uppercase;
      color: var(--text-muted,#888);
    }
    .kb-row {
      cursor: pointer;
      border-bottom: 1px solid var(--border,#f0f0f0);
      transition: background 0.12s;
    }
    .kb-row:last-child { border-bottom: none; }
    .kb-row:hover { background: var(--bg-page,#F9FAFB); }
    .kb-row-active { background: rgba(27,58,107,0.05) !important; }
    .kb-row td { padding: 9px 14px; vertical-align: middle; }
    .kb-row-title {
      font-size: 13px; font-weight: 600;
      color: var(--text,#1A1A1A);
    }

    .kb-badge {
      font-size: 11px; font-weight: 600;
      padding: 2px 9px; border-radius: 12px;
      letter-spacing: 0.02em; white-space: nowrap;
      display: inline-block;
    }

    /* Side panel */
    .kb-side-panel {
      position: fixed;
      top: 0; right: 0;
      width: 400px; height: 100vh;
      background: var(--card-bg,#fff);
      border-left: 1px solid var(--border,#E5E7EB);
      box-shadow: -6px 0 24px rgba(0,0,0,0.1);
      z-index: 9000;
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(.22,1,.36,1);
      overflow: hidden;
    }
    .kb-sp-open { transform: translateX(0); }
    .kb-sp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border,#E5E7EB);
      flex-shrink: 0;
    }
    .kb-sp-close {
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid var(--border,#ddd);
      background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted,#888); flex-shrink: 0;
      transition: background 0.15s;
    }
    .kb-sp-close:hover { background: var(--bg-page,#f5f5f5); }
    .kb-sp-title {
      font-size: 16px; font-weight: 700;
      color: var(--text,#1A1A1A);
      padding: 14px 16px 6px; line-height: 1.35;
      flex-shrink: 0;
    }
    .kb-sp-section {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border,#f0f0f0);
      flex-shrink: 0;
    }
    .kb-sp-label {
      font-size: 10.5px; font-weight: 700;
      letter-spacing: 0.07em; text-transform: uppercase;
      color: var(--text-muted,#888); margin-bottom: 6px;
    }
    .kb-sp-content {
      font-size: 13px; color: var(--text,#1A1A1A);
      line-height: 1.65; white-space: pre-wrap;
    }
    .kb-sp-where {
      font-size: 12.5px; color: var(--text,#1A1A1A);
      line-height: 1.55;
      padding: 7px 10px;
      background: var(--bg-page,#F9FAFB);
      border-radius: 7px;
      border: 1px solid var(--border,#E5E7EB);
    }
    .kb-sp-body {
      flex: 1; overflow-y: auto; min-height: 0;
    }
    .kb-sp-footer {
      display: flex; gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border,#E5E7EB);
      flex-shrink: 0; margin-top: auto;
    }

    /* Where to find (in side panel) */
    .kb-where-to-find {
      font-size: 11.5px; color: var(--text-muted,#888);
      line-height: 1.5; padding: 5px 9px;
      background: var(--bg-page,#F9FAFB); border-radius: 6px;
      border: 1px solid var(--border,#E5E7EB);
    }

    /* Related terms */
    .kb-related-terms { display: flex; flex-wrap: wrap; gap: 4px; }
    .kb-term-tag {
      font-size: 10.5px; font-weight: 500;
      padding: 1px 8px; border-radius: 10px;
      background: var(--bg-page,#F3F4F6);
      color: var(--text-muted,#6B7280);
      border: 1px solid var(--border,#E5E7EB);
    }

    .kb-updated-at { font-size: 10.5px; color: var(--text-muted,#9CA3AF); }

    .kb-btn-edit, .kb-btn-delete, .kb-btn-secondary {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 14px; border-radius: 7px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all 0.15s;
      border: 1px solid transparent;
    }
    .kb-btn-secondary { background: rgba(27,58,107,0.07); color: #1B3A6B; border-color: rgba(27,58,107,0.15); }
    .kb-btn-secondary:hover { background: rgba(27,58,107,0.14); }
    .kb-btn-edit   { background: rgba(27,58,107,0.07);  color: #1B3A6B; border-color: rgba(27,58,107,0.15); }
    .kb-btn-edit:hover   { background: rgba(27,58,107,0.14); }
    .kb-btn-delete { background: rgba(176,26,24,0.07);  color: #B01A18; border-color: rgba(176,26,24,0.15); }
    .kb-btn-delete:hover { background: rgba(176,26,24,0.14); }

    /* Empty state */
    .kb-empty-state {
      text-align: center; padding: 60px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
    }
    .kb-empty-text {
      font-size: 14px; color: var(--text-muted,#6B7280);
      max-width: 340px; line-height: 1.65; margin: 0;
    }

    /* Error banner */
    .kb-error-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px; border-radius: 10px;
      background: rgba(176,26,24,0.07);
      border: 1px solid rgba(176,26,24,0.2);
      color: #B01A18; font-size: 13px; font-weight: 500;
    }

    /* Skeleton */
    .skeleton-block {
      background: linear-gradient(90deg, var(--border,#E5E7EB) 25%, var(--bg-page,#F3F4F6) 50%, var(--border,#E5E7EB) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.4s infinite;
      border-radius: 4px;
    }
    @keyframes skeleton-shimmer { to { background-position: -200% 0; } }

    /* Modal form */
    .kb-form-group { margin-bottom: 14px; }
    .kb-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text,#1A1A1A); margin-bottom: 5px; }
    .kb-optional { font-weight: 400; color: var(--text-muted,#9CA3AF); font-size: 11.5px; }
    .kb-select, .kb-input, .kb-textarea {
      width: 100%; padding: 8px 12px; border-radius: 8px;
      border: 1px solid var(--border,#E5E7EB);
      background: var(--bg-page,#F9FAFB); color: var(--text,#1A1A1A);
      font-size: 13.5px; font-family: inherit;
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .kb-select:focus, .kb-input:focus, .kb-textarea:focus {
      border-color: #1B3A6B;
      box-shadow: 0 0 0 2px rgba(27,58,107,0.12);
      background: var(--card-bg,#fff);
    }
    .kb-textarea { resize: vertical; min-height: 130px; line-height: 1.6; }

    /* Toast container */
    .toast-container {
      position: fixed; top: 20px; right: 20px;
      z-index: 2000; display: flex;
      flex-direction: column; align-items: flex-end;
    }

    /* Responsive */
    @media (max-width: 860px) {
      .kb-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    }
    @media (max-width: 600px) {
      .kb-page { padding: 16px; }
      .kb-page-header { flex-direction: column; align-items: flex-start; }
      .kb-grid { grid-template-columns: 1fr; }
      .kb-search-input { width: 180px; }
    }

    /* Dark mode */
    [data-theme="dark"] .kb-card-inner  { background: var(--card-bg,#1E1E1E); border-color: var(--border,#2A2A2A); }
    [data-theme="dark"] .kb-search-input,
    [data-theme="dark"] .kb-select,
    [data-theme="dark"] .kb-input,
    [data-theme="dark"] .kb-textarea    { background: var(--card-bg,#1E1E1E); border-color: var(--border,#2A2A2A); }
    [data-theme="dark"] #modal-card     { background: var(--card-bg,#1E1E1E); }
    [data-theme="dark"] .kb-stats-bar   { background: var(--card-bg,#1E1E1E); border-color: var(--border,#2A2A2A); }
    [data-theme="dark"] .kb-where-to-find { background: rgba(255,255,255,0.04); border-color: var(--border,#2A2A2A); }
    [data-theme="dark"] .kb-term-tag    { background: rgba(255,255,255,0.06); border-color: var(--border,#2A2A2A); }
  `;
  document.head.appendChild(style);
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('cti-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cti-theme', next);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  injectStyles();
  buildPage();
  loadEntries();
});
