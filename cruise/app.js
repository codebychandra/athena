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

// ── Multiselect helpers (ported from J1) ─────────────────────────────────────
function buildMS(id, label, opts) {
  const items = opts.map(v => `
    <label class="j1-ms-item">
      <input type="checkbox" class="j1-ms-cb" value="${escH(v)}">
      <span class="j1-ms-opt">${escH(v)}</span>
    </label>`).join('');
  return `
    <div class="j1-multiselect" id="${id}">
      <button class="j1-ms-btn" type="button">
        <span class="j1-ms-lbl">${escH(label)}</span><span class="j1-ms-badge"></span><span class="j1-ms-arrow">▾</span>
      </button>
      <div class="j1-ms-panel">
        <div class="j1-ms-list">${items}</div>
        <div class="j1-ms-footer">
          <button class="j1-ms-clear-one" type="button">Clear</button>
          <span class="j1-ms-sel-count"></span>
        </div>
      </div>
    </div>`;
}
function buildColMS(id, opts) {
  const items = opts.map(v =>
    `<label class="j1-ms-item"><input type="checkbox" class="j1-ms-cb" value="${escH(v)}"><span class="j1-ms-opt">${escH(v)}</span></label>`
  ).join('');
  return `<div id="${id}" class="j1-multiselect req-cf-ms">
    <button class="j1-ms-btn" type="button" style="height:26px;font-size:10px;padding:0 6px;width:100%;">
      <span class="j1-ms-lbl">All</span><span class="j1-ms-badge"></span><span class="j1-ms-arrow">▾</span>
    </button>
    <div class="j1-ms-panel">
      <div class="j1-ms-list">${items}</div>
      <div class="j1-ms-footer"><button class="j1-ms-clear-one" type="button">Clear</button><span class="j1-ms-sel-count"></span></div>
    </div>
  </div>`;
}
function msGetVals(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  return [...el.querySelectorAll('.j1-ms-cb:checked')].map(cb => cb.value);
}
function msClear(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelectorAll('.j1-ms-cb').forEach(cb => cb.checked = false);
  _msUpdateBadge(el);
}
function _msUpdateBadge(el) {
  const checked = el.querySelectorAll('.j1-ms-cb:checked').length;
  const badge = el.querySelector('.j1-ms-badge');
  const count = el.querySelector('.j1-ms-sel-count');
  if (badge) badge.textContent = checked ? ` (${checked})` : '';
  if (count) count.textContent = checked ? `${checked} selected` : '';
  el.querySelector('.j1-ms-btn')?.classList.toggle('j1-ms-active', checked > 0);
}
function msOnChange(id, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelectorAll('.j1-ms-cb').forEach(input => input.addEventListener('change', () => { _msUpdateBadge(el); cb(); }));
  el.querySelector('.j1-ms-clear-one')?.addEventListener('click', e => { e.stopPropagation(); msClear(id); cb(); });
}
let _msOutsideClickBound = false;
function initMS(container) {
  (container || document).querySelectorAll('.j1-multiselect').forEach(ms => {
    if (ms.dataset.msInit) return;
    ms.dataset.msInit = '1';
    const btn = ms.querySelector('.j1-ms-btn');
    const panel = ms.querySelector('.j1-ms-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = panel.classList.contains('open');
      document.querySelectorAll('.j1-ms-panel.open').forEach(p => p.classList.remove('open'));
      if (!isOpen) panel.classList.add('open');
    });
  });
  if (!_msOutsideClickBound) {
    _msOutsideClickBound = true;
    document.addEventListener('click', e => {
      if (!e.target.closest('.j1-multiselect')) {
        document.querySelectorAll('.j1-ms-panel.open').forEach(p => p.classList.remove('open'));
      }
    }, { capture: true });
  }
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
// One-time migration: rename legacy abbreviated position keys to full names.
// Runs every loadDemand() — idempotent: if the new name already exists it
// leaves the data alone.
const LEGACY_POSITION_RENAMES = {
  'HOAS Galley':       'Hotel Assistant Galley',
  'HOAS Housekeeping': 'Hotel Assistant Housekeeping',
  'HOAS FB':           'Hotel Assistant Food and Beverage',
  'HOAS HK':           'Hotel Assistant Housekeeping',
  'Housekeeper DNC':   'Housekeeper (Deck/Night/Crew)',
};
function migratePositionNames(raw) {
  let changed = false;
  const rename = (bucket) => {
    if (!bucket) return;
    Object.keys(LEGACY_POSITION_RENAMES).forEach(oldName => {
      const newName = LEGACY_POSITION_RENAMES[oldName];
      if (oldName in bucket && !(newName in bucket)) {
        bucket[newName] = bucket[oldName];
        delete bucket[oldName];
        changed = true;
      } else if (oldName in bucket) {
        delete bucket[oldName];   // new name already exists — just drop the legacy key
        changed = true;
      }
    });
  };
  Object.values(raw).forEach(brand => {
    if (brand && typeof brand === 'object') {
      rename(brand.talentPool);
      if (brand.monthly) Object.values(brand.monthly).forEach(rename);
    }
  });
  return changed;
}

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
  // One-time migration: rename legacy abbreviated position keys
  if (migratePositionNames(raw)) {
    try { localStorage.setItem('cti-cruise-demand', JSON.stringify(raw)); } catch (_) {}
  }
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

// ── CUK Mistral Request report ───────────────────────────────────────────────
const CUK_BRANDS = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];
// Column label -> record field accessor
const MISTRAL_COLUMNS = [
  ['Hired Date',            r => r.hiredDate],
  ['Seafarer Name',         r => r.fullName],
  ['Position Hired',        r => r.positionHired],
  ['Cruise Line',           r => r.cruiseLine],
  ['Place of Birth',        r => r.placeOfBirth],
  ['Date of Birth',         r => r.dateOfBirth],
  ['Gender',                r => r.gender],
  ['Marital Status',        r => r.maritalStatus],
  ['Email',                 r => r.email],
  ['Mobile',                r => r.phone],
  ['Passport Number',       r => r.passportNumber],
  ['Passport Issued Date',  r => r.passportIssuedDate],
  ['Passport Expired Date', r => r.passportExpiredDate],
  ['Passport Issued Nation',r => r.passportIssuedNation],
  ['Hair Color',            r => r.hairColor],
  ['Height',                r => r.height],
  ['Eye Color',             r => r.eyeColor],
  ['Weight',                r => r.weight],
  ['Country',               r => r.country],
  ['City',                  r => r.city],
  ['Street',                r => r.street],
  ['Postal Code',           r => r.postalCode],
  ['Gateway Airport',       r => r.gatewayAirport],
];
function cleanVal(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return (s === '—') ? '' : s;
}
// Hired seafarers in CUK brands with no Seafarer ID yet.
// opts: { from:'YYYY-MM-DD', to:'YYYY-MM-DD', excludeResigned:bool }
function mistralRequestRows(seafarers, opts = {}) {
  const from = opts.from ? new Date(opts.from) : null;
  const to   = opts.to   ? new Date(opts.to)   : null;
  if (to) to.setHours(23, 59, 59, 999);
  const excludeResigned = opts.excludeResigned !== false;   // default true
  return seafarers.filter(s => {
    if (!CUK_BRANDS.includes((s.cruiseLine || '').trim())) return false;
    if (s.seafarerIdNumber && String(s.seafarerIdNumber).trim()) return false;  // already has ID
    if (!s.hiredDate) return false;   // must be hired
    if (excludeResigned) {
      const ob = (s.onboardingStatus || '').trim().toLowerCase();
      if (ob === 'resign' || ob === 'resigned') return false;
    }
    const d = new Date(s.hiredDate);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }).sort((a, b) => new Date(a.hiredDate) - new Date(b.hiredDate));
}

// ── Editable recruiting notes (per brand, this session) ──────────────────────
const _reportNotes = {};   // brand -> raw textarea string
function notesLines(str) {
  return (str || '').split('\n').map(s => s.trim()).filter(Boolean);
}
// Auto-generate the recruiting notes array for a brand (used as the default
// textarea content and when a brand hasn't been edited).
function computeAutoNotes(brand, seafarers, finalInt, reportDate) {
  const agg    = aggregateBrandData(brand, seafarers, finalInt);
  const layout = BRAND_LAYOUT[brand] || 'talent-pool';
  const node   = brandNode(loadDemand(), brand);
  const year   = (reportDate || new Date()).getFullYear();
  let allowed;
  if (layout === 'monthly-demand') {
    allowed = new Set(Object.keys(node.talentPool || {}));
    Object.keys(node.monthly || {}).forEach(mk => {
      if (mk.startsWith(String(year))) Object.keys(node.monthly[mk]).forEach(p => allowed.add(p));
    });
  } else {
    allowed = new Set(Object.keys(node.talentPool || {}));
  }
  return generateNotes(brand, agg, layout, allowed);
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
// REQUISITION PAGE — cruise job openings (Sea Based + River)
// ═════════════════════════════════════════════════════════════════════════════
const CRUISE_REQ_CATEGORIES = ['Sea Based', 'River'];
let _reqRows = [];   // cached for chart init in pageEvents

async function fetchCruiseRequisitions() {
  const r = await safeJson(WORKER_URL + '/api/recruit/job-openings');
  const all = r.data || [];
  return all.filter(j => CRUISE_REQ_CATEGORIES.includes((j.placementCategory || '').trim()));
}

pages.requisition = async function () {
  let rows = [], errorMsg = null;
  try { rows = await fetchCruiseRequisitions(); }
  catch (e) { errorMsg = e.message; }
  _reqRows = rows;

  const totalHeadcount = rows.reduce((s, r) => s + (parseInt(r.numPositions) || 0), 0);
  const cruiseLines    = [...new Set(rows.map(r => r.clientName).filter(v => v && v !== '—'))];
  const depts          = [...new Set(rows.map(r => r.department).filter(v => v && v !== '—'))];

  if (errorMsg) {
    return `
      <div class="req-page-header"><h1>Requisition</h1></div>
      <div class="req-error-banner"><span>⚠️</span><div><strong>Server error</strong> — ${escH(errorMsg)}</div></div>`;
  }
  if (!rows.length) {
    return `
      <div class="req-page-header"><h1>Requisition</h1>
        <span class="req-page-sub">Cruise job openings</span></div>
      <div class="card" style="text-align:center;padding:48px 24px;">
        <div style="font-size:40px;margin-bottom:12px;opacity:0.2;">🚢</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-muted);">No cruise requisitions found.</div>
      </div>`;
  }

  const statuses = [...new Set(rows.map(r => r.status).filter(v => v && v !== '—'))].sort();
  const positions= [...new Set(rows.map(r => r.positionName).filter(v => v && v !== '—'))].sort();

  // Column defs: field used for filter/sort; ms = categorical (multiselect), text = contains
  const COLS = REQ_COLS;

  const thSort = COLS.map(c =>
    `<th data-field="${c.field}" class="sortable" style="cursor:pointer;user-select:none;white-space:nowrap;">
       ${escH(c.label)} <span class="req-sort-icon">⇅</span>
     </th>`).join('');

  const colFilterOpts = { clientName: cruiseLines, status: statuses, department: depts, positionName: positions };
  const thFilter = COLS.map(c => {
    const opts = colFilterOpts[c.field];
    return `<th>${opts
      ? buildColMS(`reqCF_${c.field}`, opts)
      : `<input class="req-cf req-col-f" data-field="${c.field}" type="text" placeholder="—" style="width:100%;height:26px;font-size:10px;padding:0 6px;border:1px solid var(--border,#ddd);border-radius:5px;background:var(--card-bg,#fff);color:var(--text);">`
    }</th>`;
  }).join('');

  return `
    <div class="req-page-header">
      <h1>Requisition</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Cruise job openings (Sea Based &amp; River)</span>
    </div>

    <!-- Global filter bar -->
    <div class="card req-filter-bar">
      ${buildMS('reqCruiseFilter', 'Cruise Line', cruiseLines)}
      ${buildMS('reqStatusFilter', 'Status', statuses)}
      ${buildMS('reqDeptFilter', 'Department', depts)}
      <button id="reqClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="reqCount" class="req-count-badge">${rows.length} requisitions</span>
    </div>

    <!-- KPIs -->
    <div class="req-kpi-grid">
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Requisitions</span>
        <span class="req-kpi-value" style="color:#1B3A6B;" id="reqKpiCount">${rows.length}</span>
        <span class="req-kpi-sub">cruise job openings</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Headcount</span>
        <span class="req-kpi-value" style="color:#B01A18;" id="reqKpiHeadcount">${totalHeadcount.toLocaleString()}</span>
        <span class="req-kpi-sub">open positions</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Cruise Lines</span>
        <span class="req-kpi-value" style="color:#2D7A55;" id="reqKpiLines">${cruiseLines.length}</span>
        <span class="req-kpi-sub">clients</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Departments</span>
        <span class="req-kpi-value" style="color:#B87A14;" id="reqKpiDepts">${depts.length}</span>
        <span class="req-kpi-sub">departments</span>
      </div>
    </div>

    <!-- Charts -->
    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Headcount by Cruise Line</div>
        <div class="req-card-sub">Open positions per cruise line</div>
        <canvas id="reqLineChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">Headcount by Department</div>
        <div class="req-card-sub">Open positions per department</div>
        <canvas id="reqDeptChart"></canvas>
      </div>
    </div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="reqMainTable">
          <thead>
            <tr id="reqSortRow">${thSort}</tr>
            <tr id="reqColFilterRow">${thFilter}</tr>
          </thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
    </div>`;
};

// Cruise requisition table columns
const REQ_COLS = [
  { label:'Cruise Line',        field:'clientName',       render:r => escH(r.clientName) },
  { label:'Requisition Status', field:'status',           render:r => reqStatusBadge(r.status) },
  { label:'Department',         field:'department',       render:r => escH(r.department) },
  { label:'Rank',               field:'positionName',     render:r => `<span style="font-weight:600;color:var(--text);">${escH(r.positionName)}</span>` },
  { label:'Marlins (%)',        field:'marlins',          render:r => escH(r.marlins) },
  { label:'Salary',             field:'salary',           render:r => escH(r.salary) },
  { label:'Payment Frequency',  field:'paymentFrequency', render:r => escH(r.paymentFrequency) },
  { label:'Contract Length',    field:'contractLength',   render:r => escH(r.contractLength) },
  { label:'Flight Ticket',      field:'flightTicket',     render:r => escH(r.flightTicket) },
];

function renderReqTableBody(rows) {
  const tb = document.getElementById('reqTableBody');
  if (!tb) return;
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="${REQ_COLS.length}" style="padding:24px;text-align:center;color:var(--text-muted,#aaa);font-size:12px;">No requisitions match the filters.</td></tr>`;
    return;
  }
  tb.innerHTML = rows.map(r => `<tr>${REQ_COLS.map(c =>
    `<td style="padding:10px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:12px;white-space:nowrap;">${c.render(r)}</td>`).join('')}</tr>`).join('');
}

// Wire global filters, column filters, and sorting for the cruise requisition table
function wireRequisitionFilters() {
  let sortField = null, sortDir = 1;

  function currentFiltered() {
    const gCruise = msGetVals('reqCruiseFilter');
    const gStatus = msGetVals('reqStatusFilter');
    const gDept   = msGetVals('reqDeptFilter');
    // column filters
    const colMS = {};
    ['clientName','status','department','positionName'].forEach(f => {
      const vals = msGetVals(`reqCF_${f}`);
      if (vals.length) colMS[f] = vals;
    });
    const colText = {};
    document.querySelectorAll('.req-col-f').forEach(inp => {
      const v = inp.value.trim().toLowerCase();
      if (v) colText[inp.dataset.field] = v;
    });

    let out = _reqRows.filter(r => {
      if (gCruise.length && !gCruise.includes(r.clientName)) return false;
      if (gStatus.length && !gStatus.includes(r.status)) return false;
      if (gDept.length   && !gDept.includes(r.department)) return false;
      for (const f in colMS)   if (!colMS[f].includes(r[f])) return false;
      for (const f in colText) if (!String(r[f] ?? '').toLowerCase().includes(colText[f])) return false;
      return true;
    });

    if (sortField) {
      out = out.slice().sort((a, b) => {
        let av = a[sortField], bv = b[sortField];
        if (sortField === 'numPositions') { av = +av||0; bv = +bv||0; return (av-bv)*sortDir; }
        return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric:true }) * sortDir;
      });
    }
    return out;
  }

  function apply() {
    const rows = currentFiltered();
    renderReqTableBody(rows);
    // update KPIs
    const hc = rows.reduce((s, r) => s + (parseInt(r.numPositions) || 0), 0);
    const setT = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setT('reqKpiCount', rows.length);
    setT('reqKpiHeadcount', hc.toLocaleString());
    setT('reqKpiLines', new Set(rows.map(r => r.clientName).filter(v => v && v !== '—')).size);
    setT('reqKpiDepts', new Set(rows.map(r => r.department).filter(v => v && v !== '—')).size);
    setT('reqCount', `${rows.length} requisition${rows.length !== 1 ? 's' : ''}`);
    if (window._cruiseReqRenderCharts) window._cruiseReqRenderCharts(rows);
  }

  initMS();
  ['reqCruiseFilter','reqStatusFilter','reqDeptFilter',
   'reqCF_clientName','reqCF_status','reqCF_department','reqCF_positionName'].forEach(id => msOnChange(id, apply));
  document.querySelectorAll('.req-col-f').forEach(inp => inp.addEventListener('input', apply));
  document.getElementById('reqClearBtn')?.addEventListener('click', () => {
    ['reqCruiseFilter','reqStatusFilter','reqDeptFilter',
     'reqCF_clientName','reqCF_status','reqCF_department','reqCF_positionName'].forEach(msClear);
    document.querySelectorAll('.req-col-f').forEach(inp => inp.value = '');
    sortField = null; sortDir = 1;
    document.querySelectorAll('#reqSortRow .req-sort-icon').forEach(s => s.textContent = '⇅');
    apply();
  });
  document.querySelectorAll('#reqSortRow th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const f = th.dataset.field;
      if (sortField === f) sortDir *= -1; else { sortField = f; sortDir = 1; }
      document.querySelectorAll('#reqSortRow .req-sort-icon').forEach(s => s.textContent = '⇅');
      th.querySelector('.req-sort-icon').textContent = sortDir > 0 ? '↑' : '↓';
      apply();
    });
  });

  renderReqTableBody(_reqRows);   // initial fill
}

function reqStatusBadge(s) {
  const map = { 'Active':'#2D7A55', 'On Hold':'#B87A14', 'Closed':'#6B7280', 'Filled':'#1B3A6B' };
  const c = map[s] || '#6B7280';
  return s && s !== '—'
    ? `<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;
        background:${c}18;color:${c};border:1px solid ${c}30;white-space:nowrap;">${escH(s)}</span>`
    : '<span style="color:var(--text-muted,#aaa);">—</span>';
}

pageEvents.requisition = function () {
  if (!_reqRows.length) return;
  wireRequisitionFilters();      // global + column filters + sorting
  if (typeof Chart === 'undefined') return;

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const tick = dark ? '#aaa' : '#555';
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ` ${c.parsed.y} positions` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tick, font: { size: 10 } } },
      y: { display: false, beginAtZero: true },   // hide y-axis numbers entirely
    },
  };

  // Build charts from the currently-filtered rows
  window._cruiseReqCharts = window._cruiseReqCharts || {};
  const mkBar = (id, entries, color) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window._cruiseReqCharts[id]) window._cruiseReqCharts[id].destroy();
    window._cruiseReqCharts[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ data: entries.map(e => e[1]), backgroundColor: color, borderRadius: 0, maxBarThickness: 46 }],
      },
      options: baseOpts,
    });
  };

  window._cruiseReqRenderCharts = (rows) => {
    const by = (key) => {
      const m = {};
      rows.forEach(r => { const k = r[key] || '—'; if (k === '—') return; m[k] = (m[k] || 0) + (parseInt(r.numPositions) || 0); });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    mkBar('reqLineChart', by('clientName'), '#B01A18');
    mkBar('reqDeptChart', by('department'), '#1B3A6B');
  };
  window._cruiseReqRenderCharts(_reqRows);
};

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
        <button class="task-sub-link active" data-section="generate">CUK Weekly Report</button>
        <button class="task-sub-link" data-section="mistral">CUK Mistral ID Request</button>
        <button class="task-sub-link" data-section="history">History</button>
      </nav>

      <div class="task-content">

      <!-- ═══ Generate Report ═══ -->
      <section class="task-section" data-section="generate">

        <!-- Inner sub-nav: Report vs Requisition Setup -->
        <div class="rpt-subnav">
          <button class="rpt-subnav-btn active" data-sub="report">Report</button>
          <button class="rpt-subnav-btn" data-sub="setup">Requisition Setup</button>
        </div>

        <div id="rptReportPanel">
        <div class="card" style="padding:22px 26px;margin-bottom:18px;">
          <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;">
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Brand</div>
              <select id="rptBrand" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);min-width:200px;">
                ${CRUISE_BRANDS.map(b => `<option value="${escH(b)}">${escH(b)}</option>`).join('')}
              </select>
            </div>
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Report Date</div>
              <input type="date" id="rptDate" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button id="rptRegenBtn" style="padding:9px 18px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Refresh</button>
              <button id="rptDownloadBtn" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Download This Brand</button>
              <button id="rptDownloadAllBtn" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Download All Brands</button>
            </div>
          </div>
        </div>

        <!-- The actual report preview (Recruiting Notes are editable inline) -->
        <div id="rptPreview" class="card" style="padding:0;"></div>
        </div><!-- /#rptReportPanel -->

        <!-- Requisition Setup panel (lives inside CUK Weekly Report) -->
        <div id="rptSetupPanel" style="display:none;"></div>
      </section>

      <!-- ═══ Mistral Request ═══ -->
      <section class="task-section" data-section="mistral" style="display:none;">
        <div class="card" style="padding:22px 26px;margin-bottom:18px;">
          <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text);">CUK Mistral Request</div>
              <div style="font-size:12px;color:var(--text-muted,#888);margin-top:3px;">
                Hired seafarers across Cunard, P&amp;O and CUK Maritime with no Seafarer ID yet — Mistral registration needed.
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button id="mistralRefresh" style="padding:9px 18px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Refresh</button>
              <button id="mistralDownload" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Download Excel (CSV)</button>
            </div>
          </div>

          <!-- Filters -->
          <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border,#eee);">
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Hired From</div>
              <input type="date" id="mistralFrom" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Hired To</div>
              <input type="date" id="mistralTo" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer;">
              <input type="checkbox" id="mistralExclResign" checked style="width:15px;height:15px;accent-color:#B01A18;cursor:pointer;">
              Exclude resigned
            </label>
            <button id="mistralApply" style="padding:8px 18px;font-size:12.5px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Apply Filters</button>
          </div>
        </div>
        <div id="mistralPreview" class="card" style="padding:0;overflow:auto;"></div>
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
            <button id="dmdAddBtn" style="padding:8px 18px;font-size:12.5px;font-weight:600;border-radius:6px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Add Position</button>
          </div>

          <!-- Footer actions -->
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border,#eee);display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="dmdSaveBtn"
              style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Requisition
            </button>
            <button id="dmdExportBtn"
              style="padding:8px 16px;font-size:12.5px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">
              Export JSON
            </button>
            <label id="dmdImportLabel"
              style="padding:8px 16px;font-size:12.5px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">
              Import JSON
              <input id="dmdImportInput" type="file" accept="application/json" style="display:none;">
            </label>
            <button id="dmdLoadDefaultsBtn"
              style="padding:8px 16px;font-size:12.5px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">
              Load CTI Defaults
            </button>
            <span id="dmdSaveStatus" style="margin-left:auto;font-size:11.5px;color:var(--text-muted,#888);"></span>
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
  // Relocate the Requisition Setup markup into the CUK Weekly Report tab
  // (it used to be its own top-level tab).
  const setupPanel = document.getElementById('rptSetupPanel');
  const demandSec  = document.querySelector('.task-section[data-section="demand"]');
  if (setupPanel && demandSec) {
    demandSec.classList.remove('task-section');
    demandSec.removeAttribute('data-section');
    demandSec.style.display = '';
    setupPanel.appendChild(demandSec);
  }

  // Top-tab switching
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

  // Inner sub-nav (Report vs Requisition Setup) within CUK Weekly Report
  document.querySelectorAll('.rpt-subnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      document.querySelectorAll('.rpt-subnav-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      const rp = document.getElementById('rptReportPanel');
      const sp = document.getElementById('rptSetupPanel');
      if (rp) rp.style.display = sub === 'report' ? '' : 'none';
      if (sp) sp.style.display = sub === 'setup'  ? '' : 'none';
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
      // Notes start blank by default — use the Auto-fill button to generate.
      if (_reportNotes[brand] == null) _reportNotes[brand] = '';
      const notes = notesLines(_reportNotes[brand]);
      preview.innerHTML = buildReportHTML(brand, date, seafarers, finalInt, notes, true) +
        buildDataStatusBadge(brand, seafarers, finalInt);

      // Wire the inline editable notes textarea (lives inside the report)
      const inline = document.getElementById('rptNotesInline');
      if (inline) {
        inline.addEventListener('input', () => { _reportNotes[brand] = inline.value; });
      }
      document.getElementById('rptNotesAuto')?.addEventListener('click', async () => {
        const fresh = await fetchCruiseData(false);
        _reportNotes[brand] = computeAutoNotes(brand, fresh.seafarers, fresh.finalInt, date).join('\n');
        regenerate();
      });
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
    const brand = document.getElementById('rptBrand').value;
    downloadReportPDF(
      brand,
      new Date(document.getElementById('rptDate').value),
      notesLines(_reportNotes[brand])
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
        // Use edited notes if present, else auto-generate for that brand
        const notes = _reportNotes[brand] != null
          ? notesLines(_reportNotes[brand])
          : computeAutoNotes(brand, seafarers, finalInt, reportDate);
        await downloadBrandPDF(brand, reportDate, seafarers, finalInt, notes);
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

  // ── Mistral Request wiring ─────────────────────────────────────────────────
  function mistralOpts() {
    return {
      from: document.getElementById('mistralFrom')?.value || null,
      to:   document.getElementById('mistralTo')?.value   || null,
      excludeResigned: document.getElementById('mistralExclResign')?.checked !== false,
    };
  }
  async function renderMistral() {
    const wrap = document.getElementById('mistralPreview');
    if (!wrap) return;
    wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;">Loading…</div>`;
    try {
      const { seafarers } = await fetchCruiseData(false);
      const rows = mistralRequestRows(seafarers, mistralOpts());
      if (!rows.length) {
        wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;">No pending Mistral requests — every hired CUK seafarer already has a Seafarer ID.</div>`;
        return;
      }
      const th = MISTRAL_COLUMNS.map(([label]) =>
        `<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;
          text-transform:uppercase;color:var(--text-muted,#888);background:var(--bg-page,#fafafa);
          border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;">${escH(label)}</th>`).join('');
      const trs = rows.map(r => `<tr>${MISTRAL_COLUMNS.map(([,fn]) =>
        `<td style="padding:8px 12px;border-bottom:1px solid var(--border,#f0f0f0);font-size:11.5px;white-space:nowrap;">${escH(cleanVal(fn(r)))}</td>`).join('')}</tr>`).join('');
      wrap.innerHTML = `
        <div style="padding:12px 16px;font-size:12px;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);">
          <strong style="color:var(--text);">${rows.length}</strong> seafarer${rows.length!==1?'s':''} pending Mistral ID registration
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${th}</tr></thead>
          <tbody>${trs}</tbody>
        </table>`;
    } catch (e) {
      wrap.innerHTML = `<div style="padding:32px;color:#B01A18;font-size:13px;">Failed to load: ${escH(e.message)}</div>`;
    }
  }
  function downloadMistralCSV(rows) {
    const esc = v => {
      const s = cleanVal(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const header = MISTRAL_COLUMNS.map(([label]) => esc(label)).join(',');
    const lines  = rows.map(r => MISTRAL_COLUMNS.map(([,fn]) => esc(fn(r))).join(','));
    const csv    = '﻿' + [header, ...lines].join('\r\n');   // BOM for Excel
    const blob   = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url;
    a.download = `CUK_MISTRAL_REQUEST_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById('mistralRefresh')?.addEventListener('click', async () => {
    await fetchCruiseData(true);
    renderMistral();
  });
  document.getElementById('mistralApply')?.addEventListener('click', renderMistral);
  document.getElementById('mistralDownload')?.addEventListener('click', async () => {
    const { seafarers } = await fetchCruiseData(false);
    downloadMistralCSV(mistralRequestRows(seafarers, mistralOpts()));
  });
  // Render the Mistral table the first time its tab is opened
  let _mistralLoaded = false;
  document.querySelectorAll('.task-sub-link').forEach(link => {
    if (link.dataset.section === 'mistral') {
      link.addEventListener('click', () => {
        if (!_mistralLoaded) { _mistralLoaded = true; renderMistral(); }
      });
    }
  });

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
    flashSaveStatus('Position added');
    renderDemandTable();
  });

  // ── Save Requisition ───────────────────────────────────────────────────────
  // Flushes any pending qty edits (in case a number input wasn't blurred),
  // then re-renders and shows confirmation.
  function flashSaveStatus(msg, isError) {
    const el = document.getElementById('dmdSaveStatus');
    if (!el) return;
    el.textContent = (isError ? '✗ ' : '✓ ') + msg;
    el.style.color = isError ? '#B01A18' : '#2D7A55';
    el.style.fontWeight = '600';
    clearTimeout(flashSaveStatus._t);
    flashSaveStatus._t = setTimeout(() => {
      el.textContent = ''; el.style.fontWeight = '';
    }, 2400);
  }
  document.getElementById('dmdSaveBtn').addEventListener('click', () => {
    // Commit any unblurred number inputs
    document.querySelectorAll('.dmd-qty').forEach(i => {
      if (dmdType === 'talentPool') setTalentPool(dmdBrand.value, i.dataset.pos, i.value);
      else setMonthlyDemand(dmdBrand.value, dmdMonth.value, i.dataset.pos, i.value);
    });
    renderDemandTable();
    flashSaveStatus(`Requisition saved — ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
  });

  // ── Export JSON (full requisition config) ──────────────────────────────────
  document.getElementById('dmdExportBtn').addEventListener('click', () => {
    const data = loadDemand();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `cruise-requisition-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashSaveStatus('Exported to JSON');
  });

  // ── Load CTI Defaults ──────────────────────────────────────────────────────
  // Fetches the bundled defaults file (requisition-defaults.json) and
  // overwrites current local config after confirmation.
  document.getElementById('dmdLoadDefaultsBtn').addEventListener('click', async () => {
    const existing = loadDemand();
    const hasData  = Object.keys(existing).some(b =>
      Object.keys(existing[b].talentPool || {}).length ||
      Object.keys(existing[b].monthly    || {}).length);
    if (hasData && !confirm('This will replace your current requisition config with the CTI defaults. Continue?')) return;
    try {
      const res = await fetch(`requisition-defaults.json?_=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      saveDemand(parsed);
      flashSaveStatus('CTI defaults loaded');
      renderDemandTable();
    } catch (err) {
      flashSaveStatus(`Load failed: ${err.message}`, true);
    }
  });

  // ── Import JSON ────────────────────────────────────────────────────────────
  document.getElementById('dmdImportInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid format');
      if (!confirm(`Replace current requisition config with the file? This cannot be undone.`)) {
        e.target.value = ''; return;
      }
      saveDemand(parsed);
      flashSaveStatus(`Imported ${Object.keys(parsed).length} brand${Object.keys(parsed).length!==1?'s':''}`);
      renderDemandTable();
    } catch (err) {
      flashSaveStatus(`Import failed: ${err.message}`, true);
    } finally {
      e.target.value = '';
    }
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
// Talent pool / pipeline eligibility filter for Seafarers.
// Matches the Zoho Recruit filter the user defined:
//   Employment Status = New Hire
//   Sign On Date is empty
//   Onboarding Status in [Completing Documents, Ready to Go, Rescheduled]
//
// The filter is tolerant of missing fields: if a field is empty/null on the
// record (e.g. the worker hasn't been redeployed yet to expose it) we treat
// that field as "pass" so the report doesn't blank out. Only when the field
// IS populated and the value is wrong do we exclude the row.
const ELIGIBLE_ONBOARDING = new Set([
  'completing documents',
  'ready to go',
  'rescheduled',
]);
function isTalentPoolEligible(s) {
  const emp = (s.employmentStatus || '').trim().toLowerCase();
  if (emp && emp !== 'new hire') return false;
  if (s.signOnDate) return false;                          // already deployed -> exclude
  const ob = (s.onboardingStatus || '').trim().toLowerCase();
  if (ob && !ELIGIBLE_ONBOARDING.has(ob)) return false;
  return true;
}

// Demand (P&O) eligibility — different rule from the talent pool:
//   Onboarding Status is NOT Resign  AND  Hire Date on/after the cutoff.
// Default cutoff is 1 Jan 2025; specific positions can override it.
const DEMAND_HIRE_CUTOFF = new Date('2026-01-01');
const DEMAND_POSITION_CUTOFFS = {
  // (HOAS F&B is handled as a special hire-date-bucketed case below, not a cutoff)
};

// Positions allocated by ACTUAL hire-date month rather than the waterfall.
// A hire counts in the demand month matching its Hired_Date (e.g. hired in
// January → January's hired number). Used for HOAS F&B special request.
const DEMAND_BY_HIRE_MONTH = new Set([
  'Hotel Assistant Food and Beverage',
]);

// Manual reallocations applied AFTER hire-month bucketing — move N hires from
// one month's surplus into another month to cover its shortfall.
// position -> [ { from:'YYYY-MM', to:'YYYY-MM', count:N } ]
const DEMAND_REALLOCATIONS = {
  'Hotel Assistant Food and Beverage': [
    { from: '2026-02', to: '2026-01', count: 1 },
  ],
};
function isDemandEligible(s) {
  const ob = (s.onboardingStatus || '').trim().toLowerCase();
  if (ob === 'resign' || ob === 'resigned') return false;
  if (!s.hiredDate) return false;
  const d = new Date(s.hiredDate);
  if (isNaN(d)) return false;
  const cutoff = DEMAND_POSITION_CUTOFFS[s.positionHired] || DEMAND_HIRE_CUTOFF;
  return d >= cutoff;
}

function aggregateBrandData(brand, allSeafarers, allFinalInt) {
  // Pick the eligibility rule by layout:
  //   talent-pool  (Cunard, CUK) → New Hire / no Sign On / onboarding in list
  //   monthly-demand (P&O)       → onboarding != Resign AND hired >= 2025-01-01
  const layout     = BRAND_LAYOUT[brand] || 'talent-pool';
  const eligibleFn = layout === 'monthly-demand' ? isDemandEligible : isTalentPoolEligible;
  const seafarers  = allSeafarers.filter(s =>
    (s.cruiseLine || '').trim() === brand && eligibleFn(s)
  );
  const finalInt  = allFinalInt.filter(f =>
    brand === 'CUK Maritime'
      ? (f.cruiseLine === 'CUK Maritime')
      : (f.cruiseLine === brand || f.cruiseLine === '—' || !f.cruiseLine));

  const genderOf = g => {
    const x = (g || '').toLowerCase();
    return x.startsWith('m') ? 'M' : x.startsWith('f') ? 'F' : '';
  };

  // Pool of eligible records per position. Hire date is captured only so the
  // monthly-demand layout can order the waterfall allocation — it does NOT
  // filter anyone out. Talent Pool ignores date entirely.
  const byPosition = {};   // pos -> [ { hasId, gender, hiredDate } ]
  function pushRec(pos, rec) {
    if (!pos || pos === '—') return;
    (byPosition[pos] = byPosition[pos] || []).push(rec);
  }

  seafarers.forEach(s => pushRec(s.positionHired, {
    hasId:     !!(s.seafarerIdNumber && String(s.seafarerIdNumber).trim()),
    gender:    genderOf(s.gender),
    hiredDate: s.hiredDate ? new Date(s.hiredDate) : null,
    source:    'recruit',
  }));
  // NOTE: Final Interview sheet pre-hires are intentionally NOT counted for now.
  // Both Talent Pool and Demand use Recruit Seafarers only. Re-enable later by
  // pushing finalInt records here as pending (hasId:false).

  // Sort each position's pool by hire date ascending (records with no date last)
  Object.values(byPosition).forEach(arr => arr.sort((a, b) => {
    if (!a.hiredDate && !b.hiredDate) return 0;
    if (!a.hiredDate) return 1;
    if (!b.hiredDate) return -1;
    return a.hiredDate - b.hiredDate;
  }));

  return { byPosition, seafarers, finalInt };
}

function buildReportHTML(brand, reportDate, allSeafarers, allFinalInt, notesOverride, editable) {
  const agg    = aggregateBrandData(brand, allSeafarers, allFinalInt);
  const layout = BRAND_LAYOUT[brand] || 'talent-pool';
  return layout === 'monthly-demand'
    ? buildMonthlyDemandReport(brand, reportDate, agg, notesOverride, editable)
    : buildTalentPoolReport(brand, reportDate, agg, notesOverride, editable);
}

// Recruiting Notes block — editable textarea in the preview, static bullets in the PDF.
function renderNotesSection(notes, editable) {
  if (editable) {
    return `
      <div class="rpt-notes-h" style="display:flex;align-items:center;justify-content:space-between;">
        <span>RECRUITING NOTES</span>
        <button type="button" id="rptNotesAuto" class="rpt-notes-auto">Auto-fill</button>
      </div>
      <textarea id="rptNotesInline" class="rpt-notes-edit" rows="4"
        placeholder="Type recruiting notes — one line per bullet">${escH(notes.join('\n'))}</textarea>`;
  }
  return `
    <div class="rpt-notes-h">RECRUITING NOTES</div>
    <ul class="rpt-notes">
      ${notes.map(n => `<li>${escH(n)}</li>`).join('') || '<li>(no activity this period)</li>'}
    </ul>`;
}

// CTI-branded report header (logo + company name + report title)
function reportHeader(brand, reportDate, subtitle) {
  return `
    <div class="rpt-brandhead">
      <div class="rpt-brandhead-left">
        <img src="../logo.jpg" class="rpt-logo" alt="CTI Group"
             onerror="this.style.display='none'">
        <div class="rpt-brandhead-text">
          <div class="rpt-company">CTI GROUP WORLDWIDE SERVICES, INC.</div>
          <div class="rpt-division">Cruise Recruitment Division</div>
        </div>
      </div>
      <div class="rpt-brandhead-right">
        <div class="rpt-doc-type">WEEKLY RECRUITMENT REPORT</div>
        <div class="rpt-doc-date">${fmtReportDate(reportDate)}</div>
      </div>
    </div>
    <div class="rpt-brandbar"></div>
    <div class="rpt-report-title">
      <span class="rpt-brand-name">${escH(brand)}</span>
      <span class="rpt-report-sub">${escH(subtitle)}</span>
    </div>`;
}

// Small diagnostic strip below the report — shows whether the API actually
// returned any rows so the user can tell "0 hires because no data" from
// "0 hires because filter didn't match anything".
function buildDataStatusBadge(brand, allSeafarers, allFinalInt) {
  const totalSeaf = allSeafarers.length;
  const totalFi   = allFinalInt.length;
  const brandSeaf = allSeafarers.filter(s => (s.cruiseLine || '').trim() === brand).length;
  const brandFi   = allFinalInt.filter(f => (brand === 'CUK Maritime')
      ? f.cruiseLine === 'CUK Maritime'
      : (f.cruiseLine === brand || f.cruiseLine === '—' || !f.cruiseLine)).length;
  const layout    = BRAND_LAYOUT[brand] || 'talent-pool';
  const eligFn    = layout === 'monthly-demand' ? isDemandEligible : isTalentPoolEligible;
  const eligible  = allSeafarers.filter(s =>
    (s.cruiseLine || '').trim() === brand && eligFn(s)
  ).length;

  const warn = (totalSeaf === 0);
  const dot = warn ? '#B01A18' : '#2D7A55';
  return `
    <div style="padding:14px 24px;border-top:1px dashed var(--border,#eee);
      display:flex;flex-wrap:wrap;gap:18px;align-items:center;font-size:11.5px;
      color:var(--text-muted,#888);background:var(--bg-page,#fafafa);
      border-radius:0 0 12px 12px;">
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${dot};"></span>
        <strong style="color:var(--text);">Data status</strong>
      </span>
      <span>Recruit Seafarers (all brands): <strong style="color:var(--text);">${totalSeaf}</strong></span>
      <span>${escH(brand)} matches: <strong style="color:var(--text);">${brandSeaf}</strong></span>
      <span>Pool-eligible: <strong style="color:var(--text);">${eligible}</strong></span>
      <span style="opacity:0.6;">|</span>
      <span>Final Interview sheet rows: <strong style="color:var(--text);">${totalFi}</strong></span>
      <span>${escH(brand)} matches: <strong style="color:var(--text);">${brandFi}</strong></span>
      ${warn ? `<span style="margin-left:auto;color:#B01A18;font-weight:600;">
        No Seafarers returned — deploy worker or check ZOHO_SHEET_RESOURCE_ID.
      </span>` : ''}
    </div>`;
}

// ── Layout A: Talent Pool (Cunard, CUK Maritime) ─────────────────────────────
// NO hire-date filter — the talent pool is a running count of everyone
// currently eligible and in the pool, regardless of when they were hired.
function buildTalentPoolReport(brand, reportDate, agg, notesOverride, editable) {
  const year      = reportDate.getFullYear();
  const node      = brandNode(loadDemand(), brand);
  const talentPool= node.talentPool || {};
  // Only the positions configured in Requisition Setup appear in the report —
  // hires in any other position are intentionally ignored here.
  const posList = Object.keys(talentPool).sort();

  // Fulfilment = records WITH Seafarer ID Number (any hire date).
  // Male/Female headcount = gender split of the fulfilment (with-ID) records,
  // so MALE + FEMALE = FULFILMENT (matches the original CUK reports).
  let totalReq = 0, totalRem = 0, totalFul = 0, totalM = 0, totalF = 0;
  const rows = posList.map(pos => {
    const req    = Number(talentPool[pos] || 0);
    const recs   = agg.byPosition[pos] || [];
    const withId = recs.filter(r => r.hasId);
    const fulfil = withId.length;
    const male   = withId.filter(r => r.gender === 'M').length;
    const female = withId.filter(r => r.gender === 'F').length;
    const remaining = Math.max(0, req - fulfil);
    totalReq += req; totalRem += remaining; totalFul += fulfil;
    totalM += male; totalF += female;
    return { pos, req, remaining, fulfil, male, female };
  });

  const notes = notesOverride || generateNotes(brand, agg, 'talent-pool', new Set(posList));

  return `
    <div id="rptDoc" class="rpt-doc">
      ${reportHeader(brand, reportDate, `Monthly Talent Pool — ${year}`)}
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

      ${renderNotesSection(notes, editable)}

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
// Hires for a position are POOLED (any hire date) and waterfall-allocated
// across the demand months in chronological order: fill January's demand
// first, overflow into February, and so on.
//   e.g. 5 Commis hired, demand 3 (Jan) + 3 (Feb) → 3 land in Jan, 2 in Feb.
function buildMonthlyDemandReport(brand, reportDate, agg, notesOverride, editable) {
  const year      = reportDate.getFullYear();
  const node      = brandNode(loadDemand(), brand);
  const monthly   = node.monthly    || {};
  const talentPool= node.talentPool || {};

  // Demand months for the report year, chronological
  const monthList = Object.keys(monthly)
    .filter(mk => mk.startsWith(String(year)))
    .sort();

  let rangeLabel = String(year);
  if (monthList.length) {
    const first = monthLabel(monthList[0]).split(' ')[0];
    const last  = monthLabel(monthList[monthList.length-1]).split(' ')[0];
    rangeLabel  = first === last ? `${first} ${year}` : `${first} - ${last} ${year}`;
  }

  // ── Talent Pool block (running, no date filter) ──
  const tpPositions = Object.keys(talentPool);
  let talentPoolBlock = '';
  if (tpPositions.length) {
    const tpRows = tpPositions.sort().map(pos => {
      const req    = Number(talentPool[pos] || 0);
      const recs   = agg.byPosition[pos] || [];
      const withId = recs.filter(r => r.hasId);
      const fulfil = withId.length;
      const male   = withId.filter(r => r.gender === 'M').length;
      const female = withId.filter(r => r.gender === 'F').length;
      const pending= recs.filter(r => !r.hasId).length;
      const remaining = Math.max(0, req - fulfil);
      return { pos, req, remaining, hired: fulfil, male, female, pending };
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

  // ── Waterfall allocation of pooled hires across demand months ──
  // For each demand position, walk the months in order, taking up to that
  // month's demand from the (date-sorted) pool of hires.
  const demandPositions = new Set();
  monthList.forEach(mk => Object.keys(monthly[mk] || {}).forEach(p => demandPositions.add(p)));
  tpPositions.forEach(p => demandPositions.delete(p));   // avoid double-count with TP block

  // alloc[pos][mk] = { dem, hired, pending, male, female, remaining }
  const alloc = {};
  demandPositions.forEach(pos => {
    alloc[pos] = {};
    const recs = (agg.byPosition[pos] || []).slice();    // already date-sorted asc

    if (DEMAND_BY_HIRE_MONTH.has(pos)) {
      // Special case: bucket each hire into the demand month matching its
      // actual Hired_Date month (not the waterfall).
      const monthRecs = {};   // mk -> [records]
      monthList.forEach(mk => {
        monthRecs[mk] = recs.filter(r => r.hiredDate && monthKey(r.hiredDate) === mk);
      });
      // Apply manual reallocations (move surplus from one month to another)
      (DEMAND_REALLOCATIONS[pos] || []).forEach(({ from, to, count }) => {
        if (!monthRecs[from] || !monthRecs[to]) return;
        const moved = monthRecs[from].splice(0, count);   // take from the front
        monthRecs[to] = monthRecs[to].concat(moved);
      });
      monthList.forEach(mk => {
        const dem = Number(monthly[mk]?.[pos] || 0);
        // Cap the counted hires at the month's demand — surplus is ignored.
        const inMonth = (monthRecs[mk] || []).slice(0, dem);
        alloc[pos][mk] = {
          dem,
          hired:     inMonth.filter(r => r.hasId).length,
          pending:   inMonth.filter(r => !r.hasId).length,
          male:      inMonth.filter(r => r.hasId && r.gender === 'M').length,
          female:    inMonth.filter(r => r.hasId && r.gender === 'F').length,
          remaining: Math.max(0, dem - inMonth.length),
        };
      });
      return;
    }

    // Default: waterfall — fill each month's demand from the shared pool.
    let idx = 0;
    monthList.forEach(mk => {
      const dem   = Number(monthly[mk]?.[pos] || 0);
      const take  = Math.max(0, Math.min(dem, recs.length - idx));
      const slice = recs.slice(idx, idx + take);
      idx += take;
      alloc[pos][mk] = {
        dem,
        hired:     slice.filter(r => r.hasId).length,
        pending:   slice.filter(r => !r.hasId).length,
        male:      slice.filter(r => r.hasId && r.gender === 'M').length,
        female:    slice.filter(r => r.hasId && r.gender === 'F').length,
        remaining: Math.max(0, dem - slice.length),
      };
    });
  });

  // Render each month's block with a per-month subtotal, plus a grand total.
  let monthlyBlocks = '';
  const grand = { dem:0, remaining:0, hired:0, male:0, female:0, pending:0 };
  monthList.forEach(mk => {
    const positions = Object.keys(monthly[mk] || {})
      .filter(p => demandPositions.has(p))
      .sort();
    if (!positions.length) return;
    const sub = { dem:0, remaining:0, hired:0, male:0, female:0, pending:0 };
    const rowsHtml = positions.map(p => {
      const a = alloc[p][mk];
      sub.dem+=a.dem; sub.remaining+=a.remaining; sub.hired+=a.hired;
      sub.male+=a.male; sub.female+=a.female; sub.pending+=a.pending;
      return `
        <tr>
          <td class="rpt-td">${escH(p)}</td>
          <td class="rpt-td rpt-num">${a.dem}</td>
          <td class="rpt-td rpt-num">${a.remaining}</td>
          <td class="rpt-td rpt-num">${a.hired}</td>
          <td class="rpt-td rpt-num">${a.male}</td>
          <td class="rpt-td rpt-num">${a.female}</td>
          <td class="rpt-td rpt-num">${a.pending}</td>
        </tr>`;
    }).join('');
    // accumulate into grand total
    grand.dem+=sub.dem; grand.remaining+=sub.remaining; grand.hired+=sub.hired;
    grand.male+=sub.male; grand.female+=sub.female; grand.pending+=sub.pending;
    // Month header row carries the month's subtotal in the numeric columns
    monthlyBlocks += `
      <tr class="rpt-section">
        <td><strong>${escH(monthLabel(mk))}</strong></td>
        <td class="rpt-num"><strong>${sub.dem}</strong></td>
        <td class="rpt-num"><strong>${sub.remaining}</strong></td>
        <td class="rpt-num"><strong>${sub.hired}</strong></td>
        <td class="rpt-num"><strong>${sub.male}</strong></td>
        <td class="rpt-num"><strong>${sub.female}</strong></td>
        <td class="rpt-num"><strong>${sub.pending}</strong></td>
      </tr>
      ${rowsHtml}
    `;
  });
  // Grand total row appended after all months
  if (monthlyBlocks) {
    monthlyBlocks += `
      <tr class="rpt-total">
        <td class="rpt-td"><strong>TOTAL</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.dem}</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.remaining}</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.hired}</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.male}</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.female}</strong></td>
        <td class="rpt-td rpt-num"><strong>${grand.pending}</strong></td>
      </tr>`;
  }

  const notes = notesOverride || generateNotes(brand, agg, 'monthly-demand',
    new Set([...demandPositions, ...tpPositions]));

  return `
    <div id="rptDoc" class="rpt-doc">
      ${reportHeader(brand, reportDate, `Demand vs Hiring — ${escH(rangeLabel)}`)}
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

      ${renderNotesSection(notes, editable)}

      <div class="rpt-footer">
        <span>DATE: ${fmtReportDate(reportDate)}</span>
        <span>PAGE 1</span>
        <span>CTI GROUP WORLDWIDE SERVICES, INC.</span>
      </div>
    </div>
    ${REPORT_STYLES}
  `;
}

// Auto-generate Recruiting Notes from the pooled records (no date filter).
// `allowed` optionally restricts notes to a set of position names.
function generateNotes(brand, agg, layout, allowed) {
  const notes = [];
  const positions = (allowed ? [...allowed] : Object.keys(agg.byPosition)).sort();
  positions.forEach(p => {
    const recs    = agg.byPosition[p];
    if (!recs) return;
    const withId  = recs.filter(r => r.hasId).length;
    const pending = recs.filter(r => !r.hasId).length;
    if (withId > 0 && pending > 0) {
      notes.push(`${p}: ${withId} hired with Seafarer ID, ${pending} pending Mistral ID registration.`);
    } else if (pending > 0) {
      notes.push(`CTI has hired ${pending} ${p}${pending>1?'s':''} to fulfil talent pool, with Mistral ID registration currently in process.`);
    }
  });
  return notes;
}

// Inline styles for the report (shared by both layouts)
const REPORT_STYLES = `
<style>
.rpt-doc { background:#fff; color:#1A1A1A; padding:30px 36px 24px; font-family:'Inter',system-ui,sans-serif; }
/* ── Branded header ── */
.rpt-brandhead { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.rpt-brandhead-left { display:flex; align-items:center; gap:14px; }
.rpt-logo { height:120px; width:auto; object-fit:contain; }
.rpt-company { font-size:14px; font-weight:800; letter-spacing:0.02em; color:#1A1A1A; line-height:1.2; }
.rpt-division { font-size:10px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#B01A18; margin-top:2px; }
.rpt-brandhead-right { text-align:right; }
.rpt-doc-type { font-size:10px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#1A1A1A; }
.rpt-doc-date { font-size:11px; color:#666; margin-top:2px; }
.rpt-brandbar { height:3px; background:#B01A18; margin:10px 0 0; border-radius:2px; }
.rpt-report-title { display:flex; align-items:baseline; gap:10px; margin:14px 0 16px; }
.rpt-brand-name { font-size:17px; font-weight:800; color:#1A1A1A; letter-spacing:-0.01em; }
.rpt-report-sub { font-size:12px; font-weight:600; color:#777; }
.rpt-title { text-align:center; font-size:14px; font-weight:700; letter-spacing:0.08em; margin-bottom:14px; }
.rpt-table { width:100%; border-collapse:collapse; font-size:11px; }
.rpt-th { background:#1F1F1F; color:#fff; padding:9px 8px; text-align:left; font-weight:700; font-size:9px; letter-spacing:0.04em; border:1px solid #1F1F1F; vertical-align:middle; }
.rpt-th.rpt-num { text-align:center; }
.rpt-td { padding:7px 8px; border:1px solid #ddd; vertical-align:middle; }
.rpt-td.rpt-num { text-align:center; font-variant-numeric:tabular-nums; }
.rpt-section td { background:#F0F0F0; padding:7px 8px; border:1px solid #ddd; font-size:11px; }
.rpt-section .rpt-num { text-align:center; font-variant-numeric:tabular-nums; }
.rpt-subtotal td { background:#FAFAFA; border:1px solid #e0e0e0; color:#444; }
.rpt-total td { background:#EDEDED; border:1px solid #bbb; }
.rpt-empty { padding:14px; text-align:center; color:#999; font-size:11.5px; font-style:italic; }
.rpt-notes-h { margin-top:18px; font-size:11px; font-weight:700; letter-spacing:0.05em; padding-bottom:4px; border-bottom:1px solid #333; }
.rpt-notes { margin:8px 0 0 18px; font-size:11px; line-height:1.55; padding-left:0; }
.rpt-notes li { margin-bottom:4px; }
.rpt-notes-auto { font-size:10px; font-weight:600; border:1px solid #ccc; background:#fff;
  color:#666; border-radius:6px; padding:3px 10px; cursor:pointer; font-family:inherit; }
.rpt-notes-auto:hover { border-color:#B01A18; color:#B01A18; }
.rpt-notes-edit { width:100%; margin-top:8px; padding:9px 11px; border:1px dashed #B01A18;
  border-radius:6px; font-size:11px; line-height:1.6; font-family:inherit; color:#1A1A1A;
  background:#fffdfd; resize:vertical; box-sizing:border-box; }
.rpt-notes-edit:focus { outline:none; border-style:solid; box-shadow:0 0 0 2px rgba(176,26,24,0.12); }
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
  // Render into an off-screen container sized to A4 landscape content width
  // (297mm − 2×10mm margins ≈ 277mm → ~1047px at 96dpi) so the report maps
  // cleanly onto the page without over-scaling.
  const hidden = document.createElement('div');
  hidden.style.cssText = 'position:fixed;left:-99999px;top:0;width:1047px;background:#fff;';
  hidden.innerHTML = htmlString;
  document.body.appendChild(hidden);
  try {
    // Wait for the logo (and any images) to finish loading so html2canvas
    // doesn't capture them blank.
    await Promise.all([...hidden.querySelectorAll('img')].map(img =>
      img.complete ? Promise.resolve()
        : new Promise(res => { img.onload = img.onerror = res; })
    ));
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
async function downloadReportPDF(brand, reportDate, notes) {
  await ensureHtml2Pdf();
  const { seafarers, finalInt } = await fetchCruiseData(false);
  const html = buildReportHTML(brand, reportDate, seafarers, finalInt, notes);
  await pdfFromHTML(html, reportFilename(brand, reportDate));
  logHistory(brand, fmtReportDate(reportDate));
  renderHistory();
}

// Download a specific brand with already-fetched data (used by "Download All")
async function downloadBrandPDF(brand, reportDate, seafarers, finalInt, notes) {
  await ensureHtml2Pdf();
  const html = buildReportHTML(brand, reportDate, seafarers, finalInt, notes);
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

  // Server status badge + last-updated + refresh button
  checkServerStatus();
  startLastUpdatedTicker();
  document.getElementById('refreshDataBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.spinning === '1') return;
    btn.dataset.spinning = '1';
    btn.style.pointerEvents = 'none';
    btn.style.animation = 'spin 0.65s linear infinite';
    try {
      await fetchCruiseData(true);     // force refetch seafarers + sheet
      await checkServerStatus();
      _lastUpdated = Date.now();
      renderLastUpdated();
      await navigate(state.page);      // re-render current page with fresh data
    } finally {
      btn.style.animation = '';
      btn.style.pointerEvents = '';
      btn.dataset.spinning = '0';
    }
  });
});

// ── Server status badge (mirrors J1) ────────────────────────────────────────
const zohoState = { connected: false, checked: false };
async function checkServerStatus() {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(WORKER_URL + '/api/status', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('no server');
    const data = await res.json();
    zohoState.connected = !!data.connected;
  } catch {
    zohoState.connected = false;
  }
  zohoState.checked = true;
  updateServerBadge();
}
function updateServerBadge() {
  const badge = document.getElementById('zohoBadge');
  if (!badge) return;
  if (zohoState.connected) {
    badge.textContent      = 'Server Live';
    badge.style.background  = 'rgba(45,122,85,0.15)';
    badge.style.color       = '#2D7A55';
  } else {
    badge.textContent      = 'Server';
    badge.style.background   = 'rgba(176,26,24,0.12)';
    badge.style.color        = '#B01A18';
  }
}

// ── Last-updated ticker ──────────────────────────────────────────────────────
let _lastUpdated = Date.now();
function renderLastUpdated() {
  const el = document.getElementById('lastUpdatedTime');
  if (!el) return;
  const secs = Math.round((Date.now() - _lastUpdated) / 1000);
  if (secs < 10)      el.textContent = 'Just now';
  else if (secs < 60) el.textContent = `${secs}s ago`;
  else if (secs < 3600) el.textContent = `${Math.floor(secs/60)}m ago`;
  else el.textContent = `${Math.floor(secs/3600)}h ago`;
}
function startLastUpdatedTicker() {
  renderLastUpdated();
  setInterval(renderLastUpdated, 15000);
}

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
