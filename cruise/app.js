'use strict';

// ── Cruise Line Portal ────────────────────────────────────────────────────────
// All sections are currently in development (coming soon).
// This file will grow as cruise-specific Zoho integrations are wired up.

const WORKER_URL = 'https://cti-athena.cti-athena.workers.dev';

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

const CRUISE_BRANDS = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];

// Brand-specific layout selection
const BRAND_LAYOUT = {
  'Cunard Line':  'talent-pool',     // rolling Talent Pool table
  'CUK Maritime': 'talent-pool',
  'P&O Cruises':  'monthly-demand',  // grouped by month
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  page:  'requisition',
  theme: localStorage.getItem('cti-theme') || 'light',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function escH(v) {
  return String(v ?? '').replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
async function safeJson(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}
function monthKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(key) {
  const [y, m] = key.split('-');
  const dt = new Date(parseInt(y), parseInt(m)-1, 1);
  return dt.toLocaleDateString('en-US', { month:'long', year:'numeric' }).toUpperCase();
}
function todayKey() { return monthKey(new Date()); }
function fmtReportDate(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }).toUpperCase();
}

// ── Demand config (localStorage) ─────────────────────────────────────────────
// Shape:
//   {
//     'Cunard Line': {
//       talentPool: { 'Wine Waiter/ess': 1, ... },        // running, same every month
//       monthly:    { '2026-05': { 'HOAS FB': 25, ... }}  // month-specific
//     }
//   }
function loadDemand() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem('cti-cruise-demand') || '{}'); }
  catch (_) { raw = {}; }
  // One-time migration: old shape stored months directly under brand
  Object.keys(raw).forEach(brand => {
    const node = raw[brand];
    if (node && typeof node === 'object' && !node.monthly && !node.talentPool) {
      raw[brand] = { talentPool: {}, monthly: node };
    } else {
      node.talentPool = node.talentPool || {};
      node.monthly    = node.monthly    || {};
    }
  });
  return raw;
}
function saveDemand(d) {
  try { localStorage.setItem('cti-cruise-demand', JSON.stringify(d)); } catch (_) {}
}
function brandNode(d, brand) {
  d[brand] = d[brand] || { talentPool: {}, monthly: {} };
  d[brand].talentPool = d[brand].talentPool || {};
  d[brand].monthly    = d[brand].monthly    || {};
  return d[brand];
}
function setTalentPool(brand, position, value) {
  const d = loadDemand(); const n = brandNode(d, brand);
  n.talentPool[position] = Number(value) || 0;
  saveDemand(d);
}
function setMonthlyDemand(brand, monthKey, position, value) {
  const d = loadDemand(); const n = brandNode(d, brand);
  n.monthly[monthKey] = n.monthly[monthKey] || {};
  n.monthly[monthKey][position] = Number(value) || 0;
  saveDemand(d);
}
function deletePosition(brand, type, monthKey, position) {
  const d = loadDemand(); const n = brandNode(d, brand);
  if (type === 'talentPool') delete n.talentPool[position];
  else if (n.monthly[monthKey]) delete n.monthly[monthKey][position];
  saveDemand(d);
}
function renamePosition(brand, type, monthKey, oldName, newName) {
  if (!newName || newName === oldName) return false;
  const d = loadDemand(); const n = brandNode(d, brand);
  const bucket = type === 'talentPool' ? n.talentPool : (n.monthly[monthKey] = n.monthly[monthKey] || {});
  if (!(oldName in bucket)) return false;
  if (newName in bucket) return false;   // collision — caller should warn
  bucket[newName] = bucket[oldName];
  delete bucket[oldName];
  saveDemand(d);
  return true;
}

// ── Data fetch (cached in module) ────────────────────────────────────────────
let _seafarersCache = null;
let _finalIntCache  = null;
async function fetchCruiseData(forceRefresh) {
  if (forceRefresh) { _seafarersCache = null; _finalIntCache = null; }
  if (!_seafarersCache) {
    try {
      const r = await safeJson(WORKER_URL + '/api/cruise/seafarers');
      _seafarersCache = r.data || [];
    } catch (e) { console.error('Seafarers fetch failed:', e); _seafarersCache = []; }
  }
  if (!_finalIntCache) {
    try {
      const r = await safeJson(WORKER_URL + '/api/cruise/final-interview');
      _finalIntCache = r.data || [];
    } catch (e) { console.error('Final Interview fetch failed:', e); _finalIntCache = []; }
  }
  return { seafarers: _seafarersCache, finalInt: _finalIntCache };
}

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
const pageEvents = {};
Object.keys(CRUISE_PAGE_TITLES).forEach(key => {
  pages[key] = async () => lockedPage(key);
});

// ═════════════════════════════════════════════════════════════════════════════
// REPORT PAGE — Weekly cruise hiring report generator
// ═════════════════════════════════════════════════════════════════════════════
pages.reports = async function () {
  return `
    <div class="req-page-header">
      <h1>Report</h1>
      <span class="req-page-sub">Weekly cruise hiring report — sent to CUK every Tuesday</span>
    </div>

    <div class="task-layout">
      <nav class="task-tabbar">
        <button class="task-sub-link active" data-section="generate">Generate Report</button>
        <button class="task-sub-link" data-section="demand">Requisition Setup</button>
        <button class="task-sub-link" data-section="history">History</button>
      </nav>

      <div class="task-content">

      <!-- ═══ Generate Report ═══ -->
      <section class="task-section" data-section="generate">
        <div class="card" style="padding:22px 26px;margin-bottom:18px;">
          <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;">
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Brand</div>
              <select id="rptBrand" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);min-width:200px;">
                ${CRUISE_BRANDS.map(b => `<option value="${escH(b)}">${escH(b)}</option>`).join('')}
              </select>
            </div>
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Report Date (Tuesday)</div>
              <input type="date" id="rptDate" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button id="rptRegenBtn" style="padding:9px 18px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Refresh</button>
              <button id="rptDownloadBtn" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Download This Brand</button>
              <button id="rptDownloadAllBtn" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Download All Brands</button>
            </div>
          </div>
        </div>

        <!-- The actual report preview, styled to match the CUK PDF -->
        <div id="rptPreview" class="card" style="padding:0;"></div>
      </section>

      <!-- ═══ Demand Setup ═══ -->
      <section class="task-section" data-section="demand" style="display:none;">
        <div class="card" style="padding:24px 28px;">

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;border-bottom:1px solid var(--border,#eee);padding-bottom:16px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text);">Requisition Setup</div>
              <div style="font-size:12px;color:var(--text-muted,#888);margin-top:3px;">
                <strong>Talent Pool</strong> stays constant every month. <strong>Demand</strong> is month-specific (e.g. one-time ship needs).
              </div>
            </div>
            <select id="dmdBrand" style="padding:7px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:12.5px;font-family:inherit;background:var(--card-bg,#fff);">
              ${CRUISE_BRANDS.map(b => `<option value="${escH(b)}">${escH(b)}</option>`).join('')}
            </select>
          </div>

          <!-- Type toggle + month picker -->
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:0;background:var(--bg-page,#f4f4f4);border:1px solid var(--border,#ddd);border-radius:8px;padding:3px;">
              <button id="dmdTypeTalentPool" data-type="talentPool"
                class="dmd-type-btn"
                style="padding:7px 18px;font-size:12.5px;font-weight:600;border-radius:6px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;transition:all 0.15s;">
                Talent Pool
              </button>
              <button id="dmdTypeDemand" data-type="demand"
                class="dmd-type-btn"
                style="padding:7px 18px;font-size:12.5px;font-weight:600;border-radius:6px;border:none;background:transparent;color:var(--text-muted,#888);cursor:pointer;font-family:inherit;transition:all 0.15s;">
                Monthly Demand
              </button>
            </div>
            <div id="dmdMonthWrap" style="display:none;align-items:center;gap:8px;">
              <span style="font-size:11px;color:var(--text-muted,#888);font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Month</span>
              <input type="month" id="dmdMonth" style="padding:7px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:12.5px;font-family:inherit;background:var(--card-bg,#fff);">
            </div>
            <div id="dmdTypeHint" style="margin-left:auto;font-size:11px;color:var(--text-muted,#aaa);font-style:italic;">
              Talent Pool quantities apply every month for this brand.
            </div>
          </div>

          <div id="dmdTable"></div>

          <div style="display:flex;align-items:center;gap:8px;margin-top:16px;">
            <input id="dmdNewPos" placeholder="Add position name (e.g. Sailor OS)" style="flex:1;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            <input id="dmdNewQty" type="number" min="0" placeholder="Qty" style="width:90px;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            <button id="dmdAddBtn" style="padding:8px 18px;font-size:12.5px;font-weight:600;border-radius:6px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Add Position</button>
          </div>
        </div>
      </section>

      <!-- ═══ History ═══ -->
      <section class="task-section" data-section="history" style="display:none;">
        <div class="card" style="padding:24px 28px;">
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">Generated Reports</div>
          <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:18px;">Reports you've downloaded from this device.</div>
          <div id="histList"></div>
        </div>
      </section>

      </div><!-- /.task-content -->
    </div><!-- /.task-layout -->
  `;
};

pageEvents.reports = function () {
  // Tab switching
  document.querySelectorAll('.task-sub-link').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.section;
      document.querySelectorAll('.task-sub-link').forEach(l =>
        l.classList.toggle('active', l === link));
      document.querySelectorAll('.task-section').forEach(s => {
        s.style.display = s.dataset.section === target ? '' : 'none';
      });
    });
  });

  // Default report date = today (or the nearest Tuesday)
  const dateEl  = document.getElementById('rptDate');
  const today   = new Date();
  dateEl.value  = today.toISOString().slice(0, 10);

  // ── Generate Report wiring ─────────────────────────────────────────────────
  async function regenerate() {
    const brand = document.getElementById('rptBrand').value;
    const date  = new Date(document.getElementById('rptDate').value);
    const preview = document.getElementById('rptPreview');
    preview.innerHTML = `<div style="padding:48px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;">Loading data…</div>`;
    try {
      const { seafarers, finalInt } = await fetchCruiseData(false);
      preview.innerHTML = buildReportHTML(brand, date, seafarers, finalInt);
    } catch (e) {
      preview.innerHTML = `<div style="padding:32px;color:#B01A18;font-size:13px;">Failed to load: ${escH(e.message)}</div>`;
    }
  }
  document.getElementById('rptBrand').addEventListener('change', regenerate);
  document.getElementById('rptDate').addEventListener('change', regenerate);
  document.getElementById('rptRegenBtn').addEventListener('click', async () => {
    await fetchCruiseData(true);
    regenerate();
  });
  document.getElementById('rptDownloadBtn').addEventListener('click', () => {
    downloadReportPDF(
      document.getElementById('rptBrand').value,
      new Date(document.getElementById('rptDate').value)
    );
  });
  document.getElementById('rptDownloadAllBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const reportDate = new Date(document.getElementById('rptDate').value);
    const originalLabel = btn.textContent;
    btn.disabled = true;
    try {
      const { seafarers, finalInt } = await fetchCruiseData(false);
      for (let i = 0; i < CRUISE_BRANDS.length; i++) {
        const brand = CRUISE_BRANDS[i];
        btn.textContent = `Downloading ${i+1}/${CRUISE_BRANDS.length}…`;
        await downloadBrandPDF(brand, reportDate, seafarers, finalInt);
      }
      btn.textContent = 'All 3 downloaded ✓';
      setTimeout(() => { btn.textContent = originalLabel; btn.disabled = false; }, 1800);
    } catch (err) {
      btn.textContent = 'Failed — see console';
      console.error(err);
      setTimeout(() => { btn.textContent = originalLabel; btn.disabled = false; }, 2400);
    }
  });
  regenerate();

  // ── Demand Setup wiring ────────────────────────────────────────────────────
  const dmdBrand = document.getElementById('dmdBrand');
  const dmdMonth = document.getElementById('dmdMonth');
  dmdMonth.value = todayKey();
  let dmdType = 'talentPool';  // 'talentPool' or 'demand'

  function applyTypeUI() {
    const tpBtn  = document.getElementById('dmdTypeTalentPool');
    const dmBtn  = document.getElementById('dmdTypeDemand');
    const mWrap  = document.getElementById('dmdMonthWrap');
    const hint   = document.getElementById('dmdTypeHint');
    [tpBtn, dmBtn].forEach(b => {
      const active = b.dataset.type === dmdType;
      b.style.background = active ? '#B01A18' : 'transparent';
      b.style.color      = active ? '#fff'    : 'var(--text-muted,#888)';
    });
    mWrap.style.display = dmdType === 'demand' ? 'flex' : 'none';
    hint.textContent = dmdType === 'talentPool'
      ? 'Talent Pool quantities apply every month for this brand.'
      : 'Demand quantities apply only to the selected month.';
  }

  function renderDemandTable() {
    const brand = dmdBrand.value;
    const mk    = dmdMonth.value;
    const d     = loadDemand();
    brandNode(d, brand);
    const source = dmdType === 'talentPool'
      ? (d[brand].talentPool || {})
      : (d[brand].monthly?.[mk] || {});
    const positions = Object.keys(source).sort();
    const tbl = document.getElementById('dmdTable');
    const colLabel = dmdType === 'talentPool' ? 'Talent Pool Qty' : 'Demand';
    const ctx = dmdType === 'talentPool'
      ? `${escH(brand)} — running talent pool (applies every month)`
      : `${escH(brand)} — ${escH(monthLabel(mk))}`;
    if (!positions.length) {
      tbl.innerHTML = `<div style="padding:28px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;border:1px dashed var(--border,#ddd);border-radius:8px;">
        No positions set for ${ctx}. Add one below.</div>`;
      return;
    }
    tbl.innerHTML = `
      <div style="font-size:11px;color:var(--text-muted,#888);margin-bottom:8px;letter-spacing:0.02em;">${ctx}</div>
      <div style="border:1px solid var(--border,#eee);border-radius:8px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:var(--bg-page,#fafafa);">
          <th style="padding:10px 14px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);">Position</th>
          <th style="padding:10px 14px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);width:140px;">${colLabel}</th>
          <th style="padding:10px 14px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);width:120px;">Actions</th>
        </tr></thead>
        <tbody>
          ${positions.map(p => `<tr data-row="${escH(p)}">
            <td class="dmd-name-cell" data-pos="${escH(p)}" style="padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border,#f3f3f3);">
              <span class="dmd-name-text">${escH(p)}</span>
            </td>
            <td style="padding:6px 14px;border-bottom:1px solid var(--border,#f3f3f3);text-align:right;">
              <input data-pos="${escH(p)}" type="number" min="0" value="${source[p]}" class="dmd-qty"
                style="width:80px;padding:5px 8px;border:1px solid var(--border,#ddd);border-radius:5px;font-size:13px;text-align:right;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </td>
            <td style="padding:6px 14px;text-align:center;border-bottom:1px solid var(--border,#f3f3f3);white-space:nowrap;">
              <button data-pos="${escH(p)}" class="dmd-edit" title="Rename" style="background:none;border:none;color:var(--text-muted,#888);cursor:pointer;padding:4px 8px;border-radius:5px;font-family:inherit;font-size:12px;font-weight:600;">
                Edit
              </button>
              <button data-pos="${escH(p)}" class="dmd-del" title="Remove" style="background:none;border:none;color:var(--text-muted,#aaa);cursor:pointer;padding:4px 8px;border-radius:5px;font-family:inherit;font-size:14px;line-height:1;">
                ×
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;

    document.querySelectorAll('.dmd-qty').forEach(i => {
      i.addEventListener('change', () => {
        if (dmdType === 'talentPool') setTalentPool(brand, i.dataset.pos, i.value);
        else setMonthlyDemand(brand, mk, i.dataset.pos, i.value);
      });
    });

    // Edit (rename) action
    document.querySelectorAll('.dmd-edit').forEach(b => {
      b.addEventListener('click', () => {
        const oldName = b.dataset.pos;
        const cell    = document.querySelector(`.dmd-name-cell[data-pos="${CSS.escape(oldName)}"]`);
        if (!cell) return;
        // Swap in an inline editor
        cell.innerHTML = `
          <input class="dmd-rename-input" type="text" value="${escH(oldName)}"
            style="width:100%;padding:6px 9px;border:1px solid var(--accent,#B01A18);border-radius:5px;
              font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);outline:none;">
        `;
        const input = cell.querySelector('.dmd-rename-input');
        input.focus(); input.select();
        const commit = (save) => {
          const newName = save ? input.value.trim() : oldName;
          if (save && newName && newName !== oldName) {
            const ok = renamePosition(brand, dmdType, mk, oldName, newName);
            if (!ok) {
              alert(`A position named "${newName}" already exists.`);
              return renderDemandTable();
            }
          }
          renderDemandTable();
        };
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter')      commit(true);
          else if (e.key === 'Escape') commit(false);
        });
        input.addEventListener('blur', () => commit(true));
      });
    });

    document.querySelectorAll('.dmd-del').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm(`Remove "${b.dataset.pos}"?`)) return;
        deletePosition(brand, dmdType, mk, b.dataset.pos);
        renderDemandTable();
      });
    });
  }

  document.querySelectorAll('.dmd-type-btn').forEach(b => {
    b.addEventListener('click', () => {
      dmdType = b.dataset.type;
      applyTypeUI();
      renderDemandTable();
    });
  });
  dmdBrand.addEventListener('change', renderDemandTable);
  dmdMonth.addEventListener('change', renderDemandTable);
  document.getElementById('dmdAddBtn').addEventListener('click', () => {
    const p = document.getElementById('dmdNewPos').value.trim();
    const q = document.getElementById('dmdNewQty').value;
    if (!p) return;
    if (dmdType === 'talentPool') setTalentPool(dmdBrand.value, p, q || 0);
    else setMonthlyDemand(dmdBrand.value, dmdMonth.value, p, q || 0);
    document.getElementById('dmdNewPos').value = '';
    document.getElementById('dmdNewQty').value = '';
    renderDemandTable();
  });
  applyTypeUI();
  renderDemandTable();

  // ── History wiring ─────────────────────────────────────────────────────────
  renderHistory();
};

function renderHistory() {
  const wrap = document.getElementById('histList');
  if (!wrap) return;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('cti-cruise-report-history') || '[]'); }
  catch (_) {}
  if (!hist.length) {
    wrap.innerHTML = `<div style="padding:28px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;border:1px dashed var(--border,#ddd);border-radius:8px;">No reports downloaded yet.</div>`;
    return;
  }
  wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">
    ${hist.slice().reverse().map(h => `<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border:1px solid var(--border,#eee);border-radius:8px;">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text);">${escH(h.brand)}</div>
        <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Report date: ${escH(h.reportDate)} · Generated: ${escH(new Date(h.ts).toLocaleString())}</div>
      </div>
    </div>`).join('')}
  </div>`;
}
function logHistory(brand, reportDate) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('cti-cruise-report-history') || '[]'); } catch (_) {}
  hist.push({ brand, reportDate, ts: Date.now() });
  if (hist.length > 50) hist = hist.slice(-50);
  try { localStorage.setItem('cti-cruise-report-history', JSON.stringify(hist)); } catch (_) {}
}

// ═════════════════════════════════════════════════════════════════════════════
// Report builder
// ═════════════════════════════════════════════════════════════════════════════
function aggregateBrandData(brand, allSeafarers, allFinalInt) {
  const seafarers = allSeafarers.filter(s => (s.cruiseLine || '').trim() === brand);
  const finalInt  = allFinalInt.filter(f =>
    brand === 'CUK Maritime'
      ? (f.cruiseLine === 'CUK Maritime')
      : (f.cruiseLine === brand || f.cruiseLine === '—' || !f.cruiseLine));

  // Group by Position Hired + month
  const byPosMonth = {}; // { position: { '2026-05': { hires: [], hiresWithId, hiresPending, m, f }}}
  function bucket(pos, month) {
    byPosMonth[pos] = byPosMonth[pos] || {};
    byPosMonth[pos][month] = byPosMonth[pos][month] || { withId: 0, pending: 0, male: 0, female: 0 };
    return byPosMonth[pos][month];
  }

  seafarers.forEach(s => {
    const mk = monthKey(s.hiredDate);
    if (!mk || !s.positionHired || s.positionHired === '—') return;
    const b = bucket(s.positionHired, mk);
    const hasId = s.seafarerIdNumber && String(s.seafarerIdNumber).trim();
    if (hasId) b.withId++; else b.pending++;
    if ((s.gender || '').toLowerCase().startsWith('m')) b.male++;
    else if ((s.gender || '').toLowerCase().startsWith('f')) b.female++;
  });

  // Pre-hires from Final Interview sheet — count as "pending" (no Seafarer ID yet)
  finalInt.forEach(f => {
    const mk = monthKey(f.hiredDate);
    if (!mk || !f.positionHired || f.positionHired === '—') return;
    const b = bucket(f.positionHired, mk);
    b.pending++;
    if ((f.gender || '').toLowerCase().startsWith('m')) b.male++;
    else if ((f.gender || '').toLowerCase().startsWith('f')) b.female++;
  });

  return { byPosMonth, seafarers, finalInt };
}

function buildReportHTML(brand, reportDate, allSeafarers, allFinalInt) {
  const agg    = aggregateBrandData(brand, allSeafarers, allFinalInt);
  const layout = BRAND_LAYOUT[brand] || 'talent-pool';
  return layout === 'monthly-demand'
    ? buildMonthlyDemandReport(brand, reportDate, agg)
    : buildTalentPoolReport(brand, reportDate, agg);
}

// ── Layout A: Talent Pool (Cunard, CUK Maritime) ─────────────────────────────
function buildTalentPoolReport(brand, reportDate, agg) {
  const year      = reportDate.getFullYear();
  const node      = brandNode(loadDemand(), brand);
  const talentPool= node.talentPool || {};
  // Use Talent Pool positions as the canonical list, but include any
  // positions that have hires this year even if no quota was set.
  const positions = new Set(Object.keys(talentPool));
  Object.keys(agg.byPosMonth).forEach(p => {
    if (Object.keys(agg.byPosMonth[p] || {}).some(mk => mk.startsWith(String(year)))) {
      positions.add(p);
    }
  });
  const posList = Array.from(positions).sort();

  let totalReq = 0, totalRem = 0, totalFul = 0, totalM = 0, totalF = 0;
  const rows = posList.map(pos => {
    const req = Number(talentPool[pos] || 0);
    let fulfil = 0, male = 0, female = 0;
    Object.entries(agg.byPosMonth[pos] || {}).forEach(([mk, b]) => {
      if (!mk.startsWith(String(year))) return;
      fulfil += b.withId + b.pending;
      male   += b.male;
      female += b.female;
    });
    const remaining = Math.max(0, req - fulfil);
    totalReq += req; totalRem += remaining; totalFul += fulfil;
    totalM += male; totalF += female;
    return { pos, req, remaining, fulfil, male, female };
  });

  const notes = generateNotes(brand, agg, 'talent-pool');

  return `
    <div id="rptDoc" class="rpt-doc">
      <div class="rpt-title">MONTHLY TALENT POOL ${year}</div>
      <table class="rpt-table">
        <thead>
          <tr>
            <th class="rpt-th">DEMAND POSITIONS</th>
            <th class="rpt-th rpt-num">TALENT POOL<br>REQUEST</th>
            <th class="rpt-th rpt-num">TALENT POOL<br>REMAINING</th>
            <th class="rpt-th rpt-num">TALENT POOL<br>FULFILMENT</th>
            <th class="rpt-th rpt-num">MALE<br>HEADCOUNT</th>
            <th class="rpt-th rpt-num">FEMALE<br>HEADCOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr class="rpt-section">
            <td colspan="6"><strong>MONTHLY TALENT POOL ${year}</strong></td>
          </tr>
          ${rows.length ? rows.map(r => `
            <tr>
              <td class="rpt-td">${escH(r.pos)}</td>
              <td class="rpt-td rpt-num">${r.req}</td>
              <td class="rpt-td rpt-num">${r.remaining}</td>
              <td class="rpt-td rpt-num">${r.fulfil}</td>
              <td class="rpt-td rpt-num">${r.male}</td>
              <td class="rpt-td rpt-num">${r.female}</td>
            </tr>`).join('') : `
            <tr><td colspan="6" class="rpt-empty">No demand configured for ${year}. Add positions in <strong>Requisition Setup</strong>.</td></tr>`}
          <tr class="rpt-total">
            <td class="rpt-td"><strong>TOTAL</strong></td>
            <td class="rpt-td rpt-num"><strong>${totalReq}</strong></td>
            <td class="rpt-td rpt-num"><strong>${totalRem}</strong></td>
            <td class="rpt-td rpt-num"><strong>${totalFul}</strong></td>
            <td class="rpt-td rpt-num"><strong>${totalM}</strong></td>
            <td class="rpt-td rpt-num"><strong>${totalF}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="rpt-notes-h">RECRUITING NOTES</div>
      <ul class="rpt-notes">
        ${notes.map(n => `<li>${escH(n)}</li>`).join('') || '<li>(no activity this period)</li>'}
      </ul>

      <div class="rpt-footer">
        <span>DATE: ${fmtReportDate(reportDate)}</span>
        <span>PAGE 1</span>
        <span>CTI GROUP WORLDWIDE SERVICES, INC.</span>
      </div>
    </div>
    ${REPORT_STYLES}
  `;
}

// ── Layout B: Monthly Demand vs Hiring (P&O Cruises) ─────────────────────────
function buildMonthlyDemandReport(brand, reportDate, agg) {
  const year      = reportDate.getFullYear();
  const node      = brandNode(loadDemand(), brand);
  const monthly   = node.monthly    || {};
  const talentPool= node.talentPool || {};
  const months = new Set();
  Object.keys(monthly).forEach(mk => { if (mk.startsWith(String(year))) months.add(mk); });
  Object.values(agg.byPosMonth).forEach(byMo => Object.keys(byMo).forEach(mk => {
    if (mk.startsWith(String(year))) months.add(mk);
  }));
  const monthList = Array.from(months).sort();
  // Range label e.g. "JANUARY - MAY 2026"
  let rangeLabel = String(year);
  if (monthList.length) {
    const first = monthLabel(monthList[0]).split(' ')[0];
    const last  = monthLabel(monthList[monthList.length-1]).split(' ')[0];
    rangeLabel  = first === last ? `${first} ${year}` : `${first} - ${last} ${year}`;
  }

  // ── Talent Pool block (running, applies every month) ──
  const tpPositions = Object.keys(talentPool);
  let talentPoolBlock = '';
  if (tpPositions.length) {
    const tpRows = tpPositions.sort().map(pos => {
      const req = Number(talentPool[pos] || 0);
      let fulfil = 0, male = 0, female = 0, pending = 0;
      Object.entries(agg.byPosMonth[pos] || {}).forEach(([mk, b]) => {
        if (!mk.startsWith(String(year))) return;
        fulfil += b.withId + b.pending;
        male   += b.male;
        female += b.female;
        pending += b.pending;
      });
      const remaining = Math.max(0, req - fulfil);
      return { pos, req, remaining, hired: fulfil - pending, male, female, pending };
    });
    talentPoolBlock = `
      <tr class="rpt-section"><td colspan="7"><strong>TALENT POOL (RUNNING)</strong></td></tr>
      ${tpRows.map(r => `
        <tr>
          <td class="rpt-td">${escH(r.pos)}</td>
          <td class="rpt-td rpt-num">${r.req}</td>
          <td class="rpt-td rpt-num">${r.remaining}</td>
          <td class="rpt-td rpt-num">${r.hired}</td>
          <td class="rpt-td rpt-num">${r.male}</td>
          <td class="rpt-td rpt-num">${r.female}</td>
          <td class="rpt-td rpt-num">${r.pending}</td>
        </tr>`).join('')}
    `;
  }

  // Build monthly block: each month gets a sub-header, then positions
  let monthlyBlocks = '';
  monthList.forEach(mk => {
    const monthDemand = monthly[mk] || {};
    const positions   = new Set(Object.keys(monthDemand));
    Object.keys(agg.byPosMonth).forEach(p => {
      if (agg.byPosMonth[p][mk]) positions.add(p);
    });
    // Exclude positions covered by Talent Pool — to avoid double-counting
    tpPositions.forEach(p => positions.delete(p));
    const posList = Array.from(positions).sort();
    const rows = posList.map(p => {
      const dem      = Number(monthDemand[p] || 0);
      const b        = (agg.byPosMonth[p] && agg.byPosMonth[p][mk]) || { withId:0, pending:0, male:0, female:0 };
      const hired    = b.withId;                       // strictly with ID
      const pending  = b.pending;
      const remaining= Math.max(0, dem - (hired + pending));
      return { p, dem, remaining, hired, male:b.male, female:b.female, pending };
    });
    if (!rows.length) return;
    monthlyBlocks += `
      <tr class="rpt-section"><td colspan="7"><strong>${escH(monthLabel(mk))}</strong></td></tr>
      ${rows.map(r => `
        <tr>
          <td class="rpt-td">${escH(r.p)}</td>
          <td class="rpt-td rpt-num">${r.dem}</td>
          <td class="rpt-td rpt-num">${r.remaining}</td>
          <td class="rpt-td rpt-num">${r.hired}</td>
          <td class="rpt-td rpt-num">${r.male}</td>
          <td class="rpt-td rpt-num">${r.female}</td>
          <td class="rpt-td rpt-num">${r.pending}</td>
        </tr>`).join('')}
    `;
  });

  const notes = generateNotes(brand, agg, 'monthly-demand');

  return `
    <div id="rptDoc" class="rpt-doc">
      <div class="rpt-title">${escH(rangeLabel)}</div>
      <table class="rpt-table">
        <thead>
          <tr>
            <th class="rpt-th">DEMAND POSITIONS</th>
            <th class="rpt-th rpt-num">DEMAND<br>YEAR TO DATE</th>
            <th class="rpt-th rpt-num">DEMAND<br>REMAINING</th>
            <th class="rpt-th rpt-num">HIRED<br>YEAR TO DATE</th>
            <th class="rpt-th rpt-num">MALE<br>HEADCOUNT</th>
            <th class="rpt-th rpt-num">FEMALE<br>HEADCOUNT</th>
            <th class="rpt-th rpt-num">PENDING<br>MISTRAL ID</th>
          </tr>
        </thead>
        <tbody>
          ${talentPoolBlock}
          ${monthlyBlocks}
          ${(!talentPoolBlock && !monthlyBlocks)
            ? `<tr><td colspan="7" class="rpt-empty">No demand or hires configured for ${year}.</td></tr>`
            : ''}
        </tbody>
      </table>

      <div class="rpt-notes-h">RECRUITING NOTES</div>
      <ul class="rpt-notes">
        ${notes.map(n => `<li>${escH(n)}</li>`).join('') || '<li>(no activity this period)</li>'}
      </ul>

      <div class="rpt-footer">
        <span>DATE: ${fmtReportDate(reportDate)}</span>
        <span>PAGE 1</span>
        <span>CTI GROUP WORLDWIDE SERVICES, INC.</span>
      </div>
    </div>
    ${REPORT_STYLES}
  `;
}

// Auto-generate Recruiting Notes from data
function generateNotes(brand, agg, layout) {
  const notes = [];
  const currentMonth = monthKey(new Date());
  const positions = Object.keys(agg.byPosMonth);

  positions.forEach(p => {
    const cur = agg.byPosMonth[p][currentMonth];
    if (!cur) return;
    const pending = cur.pending;
    if (cur.withId > 0 && pending === 0) {
      notes.push(`${p}: Demand has been fulfilled. ${cur.withId} candidate${cur.withId>1?'s':''} hired with Seafarer ID.`);
    } else if (cur.withId > 0 && pending > 0) {
      notes.push(`${p}: ${cur.withId} hired with ID, ${pending} pending Mistral ID registration.`);
    } else if (pending > 0) {
      notes.push(`CTI has hired ${pending} ${p} to fulfil talent pool, with Mistral ID registration currently in process.`);
    }
  });

  return notes;
}

// Inline styles for the report (shared by both layouts)
const REPORT_STYLES = `
<style>
.rpt-doc { background:#fff; color:#1A1A1A; padding:32px 36px 24px; font-family:'Inter',system-ui,sans-serif; }
.rpt-title { text-align:center; font-size:14px; font-weight:700; letter-spacing:0.08em; margin-bottom:14px; }
.rpt-table { width:100%; border-collapse:collapse; font-size:11px; }
.rpt-th { background:#1F1F1F; color:#fff; padding:9px 8px; text-align:left; font-weight:700; font-size:9px; letter-spacing:0.04em; border:1px solid #1F1F1F; vertical-align:middle; }
.rpt-th.rpt-num { text-align:center; }
.rpt-td { padding:7px 8px; border:1px solid #ddd; vertical-align:middle; }
.rpt-td.rpt-num { text-align:center; font-variant-numeric:tabular-nums; }
.rpt-section td { background:#F0F0F0; padding:7px 8px; border:1px solid #ddd; font-size:11px; }
.rpt-total td { background:#F8F8F8; border:1px solid #ccc; }
.rpt-empty { padding:14px; text-align:center; color:#999; font-size:11.5px; font-style:italic; }
.rpt-notes-h { margin-top:18px; font-size:11px; font-weight:700; letter-spacing:0.05em; padding-bottom:4px; border-bottom:1px solid #333; }
.rpt-notes { margin:8px 0 0 18px; font-size:11px; line-height:1.55; padding-left:0; }
.rpt-notes li { margin-bottom:4px; }
.rpt-footer { margin-top:22px; padding-top:10px; border-top:1px solid #333; display:flex; justify-content:space-between; font-size:9.5px; font-weight:600; letter-spacing:0.04em; color:#444; }
</style>
`;

// ── PDF download via html2pdf ────────────────────────────────────────────────
async function ensureHtml2Pdf() {
  if (window.html2pdf) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function reportFilename(brand, reportDate) {
  const datePart = reportDate.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})
    .replace(/[\s,]+/g,'_').toUpperCase();
  return `${brand.replace(/[^a-z0-9]/gi,'_').toUpperCase()}_WEEKLY_REPORT_${datePart}.pdf`;
}

async function pdfFromHTML(htmlString, filename) {
  // Render into an off-screen container so we don't disturb the visible preview
  const hidden = document.createElement('div');
  hidden.style.cssText = 'position:fixed;left:-99999px;top:0;width:1100px;background:#fff;';
  hidden.innerHTML = htmlString;
  document.body.appendChild(hidden);
  try {
    const target = hidden.querySelector('#rptDoc') || hidden;
    await window.html2pdf().set({
      margin:       [10, 10, 10, 10],
      filename,
      image:        { type:'jpeg', quality:0.98 },
      html2canvas:  { scale:2, useCORS:true, backgroundColor:'#ffffff' },
      jsPDF:        { unit:'mm', format:'a4', orientation:'landscape' },
    }).from(target).save();
  } finally {
    document.body.removeChild(hidden);
  }
}

// Download the brand currently in the preview
async function downloadReportPDF(brand, reportDate) {
  await ensureHtml2Pdf();
  const { seafarers, finalInt } = await fetchCruiseData(false);
  const html = buildReportHTML(brand, reportDate, seafarers, finalInt);
  await pdfFromHTML(html, reportFilename(brand, reportDate));
  logHistory(brand, fmtReportDate(reportDate));
  renderHistory();
}

// Download a specific brand with already-fetched data (used by "Download All")
async function downloadBrandPDF(brand, reportDate, seafarers, finalInt) {
  await ensureHtml2Pdf();
  const html = buildReportHTML(brand, reportDate, seafarers, finalInt);
  await pdfFromHTML(html, reportFilename(brand, reportDate));
  logHistory(brand, fmtReportDate(reportDate));
  renderHistory();
}

// ── Router ────────────────────────────────────────────────────────────────────
async function navigate(page) {
  state.page = page;
  try { localStorage.setItem('cti-cruise-page', page); } catch (_) {}

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
    if (pageEvents[page]) pageEvents[page]();
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

  // Restore last visited page (falls back to requisition)
  let _startPage = 'requisition';
  try {
    const saved = localStorage.getItem('cti-cruise-page');
    if (saved && CRUISE_PAGE_TITLES[saved]) _startPage = saved;
  } catch (_) {}
  navigate(_startPage);

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
