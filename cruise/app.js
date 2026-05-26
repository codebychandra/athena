'use strict';

// ── Cruise Line Portal ────────────────────────────────────────────────────────
// All sections are currently in development (coming soon).
// This file will grow as cruise-specific Zoho integrations are wired up.

const CRUISE_PAGE_TITLES = {
  requisition:    'Requisition',
  candidate:      'Candidate',
  finalinterview: 'Final Interview',
  seafarer:       'Seafarer',
  visa:           'Visa',
  deployment:     'Deployment',
  reports:        'Report',
  task:           'Task',
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  page:  'requisition',
  theme: localStorage.getItem('cti-theme') || 'light',
};

// ── Theme ─────────────────────────────────────────────────────────────────────
(function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}());

// ── Coming-soon placeholder ───────────────────────────────────────────────────
function lockedPage(key) {
  const label = CRUISE_PAGE_TITLES[key] || key;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:58vh;gap:20px;text-align:center;padding:40px 20px;">
      <div style="font-size:52px;line-height:1;opacity:0.35;">🔒</div>
      <div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;">${label}</h2>
        <p style="font-size:13px;color:var(--text-muted,#888);max-width:360px;
          line-height:1.65;margin:0 auto;">
          This section is under development. Cruise Line data integration
          and configuration are currently in progress.
        </p>
      </div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.07em;padding:4px 18px;
        border-radius:20px;background:rgba(176,26,24,0.1);color:#B01A18;">
        COMING SOON
      </span>
    </div>`;
}

// ── Pages ─────────────────────────────────────────────────────────────────────
const pages = {};
Object.keys(CRUISE_PAGE_TITLES).forEach(key => {
  pages[key] = async () => lockedPage(key);
});

// ── Router ────────────────────────────────────────────────────────────────────
async function navigate(page) {
  state.page = page;

  // Breadcrumb
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = CRUISE_PAGE_TITLES[page] || page;

  // Active nav link
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Render page
  const content = document.getElementById('main-content');
  if (!content) return;
  content.style.opacity = '0';
  try {
    content.innerHTML = await pages[page]();
  } catch (err) {
    content.innerHTML = `<div style="padding:40px;color:#B01A18;">Error loading page: ${err.message}</div>`;
  }
  content.style.opacity = '1';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyThemeToggle();
  applyDateBadge();
  applySidebar();
  navigate(state.page);

  // Nav click
  document.querySelectorAll('.nav-link[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate(a.dataset.page);
      // Close mobile sidebar
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('visible');
    });
  });
});

function applyThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  document.documentElement.setAttribute('data-theme', state.theme);
  btn.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('cti-theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
  });
}

function applyDateBadge() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-US',
    { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}

function applySidebar() {
  const sidebar = document.getElementById('sidebar');

  // Restore collapsed state from localStorage
  if (localStorage.getItem('cti-sidebar-collapsed') === '1') {
    sidebar?.classList.add('collapsed');
  }

  // Hamburger toggle (mobile)
  document.getElementById('hamburger')?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('visible');
  });
  document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('visible');
  });

  // Collapse toggle (desktop)
  document.getElementById('sidebarCollapseBtn')?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    const isCollapsed = sidebar?.classList.contains('collapsed');
    localStorage.setItem('cti-sidebar-collapsed', isCollapsed ? '1' : '0');
  });
}
