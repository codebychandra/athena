// ─────────────────────────────────────────────────────────────────────────────
//  CTI Athena — AI Knowledge Library  app.js
// ─────────────────────────────────────────────────────────────────────────────

const WORKER_URL = 'https://cti-athena.cti-athena.workers.dev';
const DEFAULT_CATEGORIES = ['Visa', 'Operations', 'Process', 'Cruise Line', 'J1 Program', 'HR Policy', 'Other'];

const CAT_COLORS = {
  'Visa':         '#0891B2',
  'Operations':   '#1B3A6B',
  'Process':      '#7C3AED',
  'Cruise Line':  '#B01A18',
  'J1 Program':   '#2D7A55',
  'HR Policy':    '#D97706',
  'Other':        '#6B7280',
};

function getCatColor(cat) {
  return CAT_COLORS[cat] || '#6B7280';
}

// ── State ─────────────────────────────────────────────────────────────────────
let allEntries = [];
let activeCategory = 'All';
let searchQuery = '';
let editingId = null;

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)  return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText = `
    background: ${type === 'success' ? '#2D7A55' : '#B01A18'};
    color: #fff;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
  `;
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(-8px)';
    setTimeout(() => t.remove(), 220);
  }, 3000);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchEntries() {
  const res = await fetch(WORKER_URL + '/api/knowledge');
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.entries || [];
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
  let entries = allEntries;
  if (activeCategory !== 'All') {
    entries = entries.filter(e => e.category === activeCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    entries = entries.filter(e =>
      (e.topic || '').toLowerCase().includes(q) ||
      (e.content || '').toLowerCase().includes(q)
    );
  }
  return entries;
}

// ── All categories from entries + defaults ─────────────────────────────────────
function getAllCategories() {
  const fromEntries = allEntries.map(e => e.category).filter(Boolean);
  const combined = [...DEFAULT_CATEGORIES, ...fromEntries];
  return ['All', ...Array.from(new Set(combined))];
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderFilterTabs();
  renderCards();
}

function renderFilterTabs() {
  const container = document.getElementById('kb-category-tabs');
  if (!container) return;
  const categories = getAllCategories();
  container.innerHTML = categories.map(cat => {
    const isActive = cat === activeCategory;
    const color = cat === 'All' ? '#1B3A6B' : getCatColor(cat);
    return `
      <button
        class="kb-tab${isActive ? ' kb-tab-active' : ''}"
        data-cat="${cat}"
        style="${isActive ? `background:${color};color:#fff;border-color:${color};` : ''}"
      >${cat}</button>
    `;
  }).join('');

  container.querySelectorAll('.kb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      render();
    });
  });
}

function renderCards() {
  const grid = document.getElementById('kb-grid');
  if (!grid) return;
  const entries = getFilteredEntries();

  if (entries.length === 0) {
    const isEmpty = allEntries.length === 0;
    grid.innerHTML = `
      <div class="kb-empty-state">
        <div class="kb-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted,#9CA3AF)">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <p class="kb-empty-text">
          ${isEmpty
            ? 'No knowledge entries yet. Add your first entry to teach the AI.'
            : 'No entries match your search.'}
        </p>
        ${isEmpty ? `<button class="kb-btn-primary" id="emptyAddBtn">+ Add Entry</button>` : ''}
      </div>
    `;
    document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);
    return;
  }

  grid.innerHTML = entries.map(entry => {
    const color = getCatColor(entry.category || 'Other');
    const preview = (entry.content || '').slice(0, 180);
    return `
      <div class="kb-card" data-id="${entry.id}">
        <div class="kb-card-inner" style="border-left: 4px solid ${color};">
          <div class="kb-card-header">
            <span class="kb-badge" style="background:${color}18;color:${color};border:1px solid ${color}30;">
              ${entry.category || 'Other'}
            </span>
          </div>
          <div class="kb-card-topic">${escHtml(entry.topic || '')}</div>
          <div class="kb-card-content" data-full="${escAttr(entry.content || '')}"
               data-expanded="false">${escHtml(preview)}${(entry.content || '').length > 180 ? '<span class="kb-expand-hint"> … <span class="kb-read-more">read more</span></span>' : ''}</div>
          <div class="kb-card-footer">
            <span class="kb-updated-at">${relativeTime(entry.updatedAt)}</span>
            <div class="kb-card-actions">
              <button class="kb-btn-edit" data-id="${entry.id}" title="Edit entry">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="kb-btn-delete" data-id="${entry.id}" title="Delete entry">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach events
  grid.querySelectorAll('.kb-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  grid.querySelectorAll('.kb-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
  });
  grid.querySelectorAll('.kb-read-more').forEach(span => {
    span.addEventListener('click', (e) => {
      const contentEl = e.target.closest('.kb-card-content');
      if (!contentEl) return;
      const expanded = contentEl.dataset.expanded === 'true';
      if (!expanded) {
        contentEl.innerHTML = escHtml(contentEl.dataset.full) + '<span class="kb-expand-hint"> <span class="kb-read-less">show less</span></span>';
        contentEl.dataset.expanded = 'true';
        contentEl.querySelector('.kb-read-less')?.addEventListener('click', ev => {
          const el = ev.target.closest('.kb-card-content');
          const full = el.dataset.full || '';
          const preview = full.slice(0, 180);
          el.innerHTML = escHtml(preview) + (full.length > 180 ? '<span class="kb-expand-hint"> … <span class="kb-read-more">read more</span></span>' : '');
          el.dataset.expanded = 'false';
          el.querySelector('.kb-read-more')?.addEventListener('click', arguments.callee);
        });
      }
    });
  });
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function renderSkeleton() {
  const grid = document.getElementById('kb-grid');
  if (!grid) return;
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="kb-card">
      <div class="kb-card-inner" style="border-left:4px solid #e5e7eb;">
        <div class="skeleton-block" style="height:20px;width:70px;border-radius:12px;margin-bottom:12px;"></div>
        <div class="skeleton-block" style="height:18px;width:80%;margin-bottom:8px;"></div>
        <div class="skeleton-block" style="height:14px;width:100%;margin-bottom:4px;"></div>
        <div class="skeleton-block" style="height:14px;width:90%;margin-bottom:4px;"></div>
        <div class="skeleton-block" style="height:14px;width:75%;margin-bottom:16px;"></div>
        <div style="display:flex;justify-content:space-between;">
          <div class="skeleton-block" style="height:12px;width:60px;"></div>
          <div style="display:flex;gap:8px;">
            <div class="skeleton-block" style="height:28px;width:55px;border-radius:6px;"></div>
            <div class="skeleton-block" style="height:28px;width:65px;border-radius:6px;"></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Error banner ──────────────────────────────────────────────────────────────
function renderError(msg) {
  const grid = document.getElementById('kb-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="kb-error-banner" style="grid-column:1/-1;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Failed to load knowledge entries: ${escHtml(msg)}</span>
      <button onclick="loadEntries()" style="margin-left:12px;padding:4px 12px;border-radius:6px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;font-size:12px;">Retry</button>
    </div>
  `;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAddModal() {
  editingId = null;
  openModal({ id: null, category: '', topic: '', content: '' });
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

  const isCustomCat = entry.category && !DEFAULT_CATEGORIES.includes(entry.category);

  document.getElementById('modal-title').textContent = entry.id ? 'Edit Entry' : 'Add Knowledge Entry';
  const catSelect = document.getElementById('modal-category');
  catSelect.value = isCustomCat ? 'Custom...' : (entry.category || '');

  const customCatWrap = document.getElementById('modal-custom-cat-wrap');
  const customCatInput = document.getElementById('modal-custom-category');
  if (isCustomCat) {
    customCatWrap.style.display = 'block';
    customCatInput.value = entry.category;
  } else {
    customCatWrap.style.display = 'none';
    customCatInput.value = '';
  }

  document.getElementById('modal-topic').value   = entry.topic   || '';
  document.getElementById('modal-content').value = entry.content || '';

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    document.getElementById('modal-card').style.transform = 'scale(1)';
  });
  document.getElementById('modal-topic').focus();
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
  const catSelect = document.getElementById('modal-category');
  let category = catSelect.value;
  if (category === 'Custom...') {
    category = document.getElementById('modal-custom-category').value.trim();
  }
  const topic   = document.getElementById('modal-topic').value.trim();
  const content = document.getElementById('modal-content').value.trim();

  if (!category) { showToast('Please select or enter a category.', 'error'); return; }
  if (!topic)    { showToast('Topic is required.', 'error'); return; }
  if (!content)  { showToast('Content is required.', 'error'); return; }

  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  const entry = { category, topic, content };
  if (editingId) entry.id = editingId;

  try {
    const result = await saveEntry(entry);
    if (result.ok) {
      allEntries = result.entries || allEntries;
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
  const topic = entry?.topic || 'this entry';
  if (!confirm(`Delete "${topic}"? This cannot be undone.`)) return;

  try {
    const result = await deleteEntry(id);
    if (result.ok) {
      allEntries = result.entries || allEntries.filter(e => e.id !== id);
      render();
      showToast('Entry deleted.');
    } else {
      showToast(result.error || 'Delete failed.', 'error');
    }
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Load entries ──────────────────────────────────────────────────────────────
async function loadEntries() {
  renderSkeleton();
  try {
    allEntries = await fetchEntries();
    render();
  } catch (err) {
    renderError(err.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('cti-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cti-theme', next);
  });
}

// ── Build page structure ──────────────────────────────────────────────────────
function buildPage() {
  const main = document.getElementById('main-content');
  if (!main) return;

  main.innerHTML = `
    <div class="kb-page">

      <!-- Page header -->
      <div class="kb-page-header">
        <div class="kb-page-header-left">
          <h1 class="kb-page-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            AI Knowledge Library
          </h1>
          <span class="kb-entry-count" id="kb-entry-count"></span>
        </div>
        <div class="kb-page-header-right">
          <button class="kb-btn-primary" id="addEntryBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Entry
          </button>
          <div class="kb-search-wrap">
            <svg class="kb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="kb-search-input" id="kb-search" placeholder="Search topic or content…">
          </div>
        </div>
      </div>

      <!-- Category filter tabs -->
      <div class="kb-category-tabs" id="kb-category-tabs"></div>

      <!-- Cards grid -->
      <div class="kb-grid" id="kb-grid"></div>

    </div>

    <!-- Add/Edit Modal -->
    <div id="kb-modal" style="display:none;opacity:0;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;align-items:center;justify-content:center;transition:opacity 0.18s;">
      <div id="modal-card" style="background:var(--card-bg,#fff);border-radius:14px;width:520px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.2);transform:scale(0.97);transition:transform 0.18s;padding:28px 28px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h2 id="modal-title" style="font-size:16px;font-weight:700;color:var(--text,#1A1A1A);margin:0;">Add Knowledge Entry</h2>
          <button id="modal-close-btn" title="Close"
            style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;color:var(--text-muted,#9CA3AF);font-size:18px;transition:background 0.15s;"
            onmouseover="this.style.background='var(--bg-page,#f3f4f6)'" onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="kb-form-group">
          <label class="kb-label" for="modal-category">Category</label>
          <select id="modal-category" class="kb-select">
            <option value="">— Select category —</option>
            ${DEFAULT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            <option value="Custom...">Custom…</option>
          </select>
        </div>

        <div id="modal-custom-cat-wrap" class="kb-form-group" style="display:none;">
          <label class="kb-label" for="modal-custom-category">Custom Category Name</label>
          <input type="text" id="modal-custom-category" class="kb-input" placeholder="Enter custom category…">
        </div>

        <div class="kb-form-group">
          <label class="kb-label" for="modal-topic">Topic</label>
          <input type="text" id="modal-topic" class="kb-input" placeholder="e.g. C1/D Processing Time">
        </div>

        <div class="kb-form-group">
          <label class="kb-label" for="modal-content">Content</label>
          <textarea id="modal-content" class="kb-textarea" rows="7" placeholder="Enter the knowledge content that the AI should know…"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">
          <button id="modal-cancel-btn" class="kb-btn-secondary">Cancel</button>
          <button id="modal-save-btn" class="kb-btn-primary">Save</button>
        </div>
      </div>
    </div>
  `;

  // Wire up events
  document.getElementById('addEntryBtn').addEventListener('click', openAddModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', handleSave);

  document.getElementById('kb-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('kb-modal')) closeModal();
  });

  document.getElementById('modal-category').addEventListener('change', (e) => {
    const wrap = document.getElementById('modal-custom-cat-wrap');
    wrap.style.display = e.target.value === 'Custom...' ? 'block' : 'none';
  });

  document.getElementById('kb-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Inline styles ─────────────────────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .kb-page {
      padding: 24px 28px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Page header */
    .kb-page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 20px;
    }
    .kb-page-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .kb-page-header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .kb-page-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #1A1A1A);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kb-entry-count {
      font-size: 12px;
      color: var(--text-muted, #6B7280);
      background: var(--bg-page, #F3F4F6);
      padding: 2px 10px;
      border-radius: 12px;
      font-weight: 500;
    }

    /* Primary button */
    .kb-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: #1B3A6B;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, box-shadow 0.15s;
      white-space: nowrap;
    }
    .kb-btn-primary:hover { background: #142d55; box-shadow: 0 2px 8px rgba(27,58,107,0.3); }

    /* Secondary button */
    .kb-btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--border, #E5E7EB);
      background: transparent;
      color: var(--text, #1A1A1A);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .kb-btn-secondary:hover { background: var(--bg-page, #F3F4F6); }

    /* Search */
    .kb-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .kb-search-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted, #9CA3AF);
      pointer-events: none;
    }
    .kb-search-input {
      padding: 7px 12px 7px 32px;
      border-radius: 8px;
      border: 1px solid var(--border, #E5E7EB);
      background: var(--card-bg, #fff);
      color: var(--text, #1A1A1A);
      font-size: 13px;
      font-family: inherit;
      width: 220px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .kb-search-input:focus {
      border-color: #1B3A6B;
      box-shadow: 0 0 0 2px rgba(27,58,107,0.12);
    }
    .kb-search-input::placeholder { color: var(--text-muted, #9CA3AF); }

    /* Category tabs */
    .kb-category-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 20px;
    }
    .kb-tab {
      padding: 5px 14px;
      border-radius: 20px;
      border: 1px solid var(--border, #E5E7EB);
      background: transparent;
      color: var(--text, #1A1A1A);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .kb-tab:hover { background: var(--bg-page, #F3F4F6); }
    .kb-tab-active { font-weight: 600; }

    /* Cards grid */
    .kb-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 700px) {
      .kb-grid { grid-template-columns: 1fr; }
      .kb-page { padding: 16px; }
      .kb-page-header { flex-direction: column; align-items: flex-start; }
    }

    /* Card */
    .kb-card { min-width: 0; }
    .kb-card-inner {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #E5E7EB);
      border-radius: 10px;
      padding: 16px 18px 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .kb-card-inner:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.07);
      transform: translateY(-1px);
    }
    .kb-card-header { display: flex; align-items: center; gap: 8px; }
    .kb-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      letter-spacing: 0.02em;
    }
    .kb-card-topic {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text, #1A1A1A);
      line-height: 1.35;
    }
    .kb-card-content {
      font-size: 13px;
      color: var(--text-muted, #6B7280);
      line-height: 1.6;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .kb-expand-hint { font-style: normal; }
    .kb-read-more, .kb-read-less {
      color: #1B3A6B;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .kb-read-more:hover, .kb-read-less:hover { text-decoration: underline; }
    .kb-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
      gap: 8px;
    }
    .kb-updated-at {
      font-size: 11px;
      color: var(--text-muted, #9CA3AF);
    }
    .kb-card-actions { display: flex; gap: 6px; }
    .kb-btn-edit, .kb-btn-delete {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
      border: 1px solid transparent;
    }
    .kb-btn-edit {
      background: rgba(27,58,107,0.08);
      color: #1B3A6B;
      border-color: rgba(27,58,107,0.15);
    }
    .kb-btn-edit:hover { background: rgba(27,58,107,0.15); }
    .kb-btn-delete {
      background: rgba(176,26,24,0.08);
      color: #B01A18;
      border-color: rgba(176,26,24,0.15);
    }
    .kb-btn-delete:hover { background: rgba(176,26,24,0.15); }

    /* Empty state */
    .kb-empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 56px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .kb-empty-icon { opacity: 0.45; }
    .kb-empty-text {
      font-size: 14px;
      color: var(--text-muted, #6B7280);
      max-width: 340px;
      line-height: 1.6;
    }

    /* Error banner */
    .kb-error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      border-radius: 10px;
      background: rgba(176,26,24,0.07);
      border: 1px solid rgba(176,26,24,0.2);
      color: #B01A18;
      font-size: 13px;
      font-weight: 500;
    }

    /* Modal form */
    .kb-form-group { margin-bottom: 16px; }
    .kb-label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #1A1A1A);
      margin-bottom: 6px;
    }
    .kb-select, .kb-input, .kb-textarea {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, #E5E7EB);
      background: var(--bg-page, #F9FAFB);
      color: var(--text, #1A1A1A);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .kb-select:focus, .kb-input:focus, .kb-textarea:focus {
      border-color: #1B3A6B;
      box-shadow: 0 0 0 2px rgba(27,58,107,0.12);
      background: var(--card-bg, #fff);
    }
    .kb-textarea {
      resize: vertical;
      min-height: 130px;
      line-height: 1.6;
    }

    /* Dark mode overrides */
    [data-theme="dark"] .kb-card-inner { background: var(--card-bg, #1E1E1E); border-color: var(--border, #2A2A2A); }
    [data-theme="dark"] .kb-search-input { background: var(--card-bg, #1E1E1E); }
    [data-theme="dark"] .kb-select,
    [data-theme="dark"] .kb-input,
    [data-theme="dark"] .kb-textarea { background: var(--card-bg, #1E1E1E); border-color: var(--border, #2A2A2A); }
    [data-theme="dark"] #modal-card { background: var(--card-bg, #1E1E1E); }

    /* Toast container positioning */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
  `;
  document.head.appendChild(style);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  injectStyles();
  buildPage();
  loadEntries();

  // Update entry count whenever render happens
  const origRender = render;
  window.render = function() {
    origRender();
    const countEl = document.getElementById('kb-entry-count');
    if (countEl) {
      const filtered = getFilteredEntries();
      countEl.textContent = filtered.length === allEntries.length
        ? `${allEntries.length} ${allEntries.length === 1 ? 'entry' : 'entries'}`
        : `${filtered.length} of ${allEntries.length}`;
    }
  };
});
