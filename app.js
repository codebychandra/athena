'use strict';

// ============================
// CONSTANTS
// ============================
const DIVISION_COLORS = {
  cruise: '#B01A18',
  j1:     '#1B3A6B',
  marine: '#2D7A55',
  visa:   '#B87A14'
};

const DIVISION_NAMES = {
  cruise: 'Cruise Line',
  j1:     'J1 Cultural Exchange',
  marine: 'Marine Travel',
  visa:   'Visa Services'
};

const PAGE_TITLES = {
  dashboard:    'Dashboard',
  analytics:    'Analytics',
  cruise:       'Cruise Line',
  j1:           'Placement',
  marine:       'Marine Travel',
  visa:         'Visa Services',
  clients:      'Clients',
  reports:      'Report',
  compliance:   'Compliance',
  marketing:    'Marketing',
  j1visa:       'Visa',
  requisition:  'Requisition',
  travel:       'Travel',
  participant:  'Participant',
  talentpool:   'Talent Pool',
  housing:      'Housing',
  returnhome:   'Return Home',
  task:         'Task',
};

// Pages that are locked (no live data yet)
const LOCKED_PAGES = new Set(['dashboard','analytics','cruise','marine','visa']);

// ── Locked page placeholder ───────────────────────────────────
function lockedPage(name) {
  const label = PAGE_TITLES[name] || name;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:58vh;gap:20px;text-align:center;padding:40px 20px;">
      <div style="font-size:52px;line-height:1;opacity:0.35;">🔒</div>
      <div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;">${label}</h2>
        <p style="font-size:13px;color:var(--text-muted,#888);max-width:360px;
          line-height:1.65;margin:0 auto;">
          This section is under development. Data integration and configuration
          are currently in progress.
        </p>
      </div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.07em;padding:4px 18px;
        border-radius:20px;background:rgba(176,26,24,0.1);color:#B01A18;">
        COMING SOON
      </span>
    </div>`;
}

// ============================
// STATE
// ============================
const state = {
  page:      'j1',
  theme:     localStorage.getItem('cti-theme') || 'light',
  period:    'month',
  dataCache: {},
  charts:    new Map(),
  zoho:      { connected: false, checked: false }
};

// ============================
// CHART DEFAULTS
// ============================
function applyChartDefaults() {
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = state.theme === 'dark' ? '#888888' : '#6B6B6B';
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.plugins.tooltip.backgroundColor = '#1A1A1A';
  Chart.defaults.plugins.tooltip.titleColor = '#FFFFFF';
  Chart.defaults.plugins.tooltip.bodyColor = '#CCCCCC';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
}

function gridColor() {
  return state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
}

// ============================
// UTILITIES
// ============================
function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}

function fmtCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + Number(n).toLocaleString();
}

function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(str + 'T00:00:00'));
  } catch { return str; }
}

function badge(status) {
  if (!status) return '';
  const map = {
    'additional docs': 'additional',
    'under review':    'under-review',
    'on hold':         'on-hold',
    'in good standing':'placed'
  };
  const key = status.toLowerCase();
  const cls = map[key] || key.replace(/\s+/g, '-');
  return `<span class="badge badge--${cls}">${status}</span>`;
}

function divisionBadge(div) {
  const d = (div || '').toLowerCase();
  const names = { cruise:'Cruise', j1:'J1', marine:'Marine', visa:'Visa' };
  return `<span class="badge badge--${d}">${names[d] || div}</span>`;
}

function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function simpleKpi(label, value) {
  return `<div class="kpi-card"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span></div>`;
}

function kpiCard(label, value, change, sub) {
  const pos = change >= 0;
  return `
    <div class="kpi-card">
      <span class="kpi-label">${label}</span>
      <span class="kpi-value">${value}</span>
      <span class="kpi-change ${pos ? 'positive' : 'negative'}">${pos ? '↑' : '↓'} ${Math.abs(change)}% vs last period</span>
      <div class="text-muted" style="margin-top:2px;">${sub}</div>
    </div>`;
}

// ============================
// TOAST
// ============================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================
// ── Safe fetch helper — always returns JSON or throws a clean error ──────────
// Prevents "Unexpected token '<'" when the server returns an HTML error page.
async function safeJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const ct  = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    // Server returned HTML (not running, 404, or unhandled Express error)
    throw new Error(res.status === 401 ? 'NOT_AUTHENTICATED'
      : `Server not reachable (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ZOHO INTEGRATION
// ============================
async function checkZohoStatus() {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch('/api/status', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('no server');
    const data = await res.json();
    state.zoho.connected = data.connected;
    state.zoho.checked   = true;
    updateZohoBadge();
  } catch {
    state.zoho.connected = false;
    state.zoho.checked   = true;
    updateZohoBadge();
  }
}

function updateZohoBadge() {
  const badge = document.getElementById('zohoBadge');
  if (!badge) return;
  if (state.zoho.connected) {
    badge.textContent   = 'Server Live';
    badge.style.background = 'rgba(45,122,85,0.15)';
    badge.style.color      = '#2D7A55';
  } else {
    badge.textContent   = 'Server';
    badge.style.background = 'rgba(176,26,24,0.12)';
    badge.style.color      = '#B01A18';
    badge.style.cursor     = 'pointer';
    badge.onclick = () => { window.location.href = '/auth/zoho'; };
  }
}

// ============================
// CHARTS
// ============================
function createChart(id, config) {
  if (state.charts.has(id)) {
    state.charts.get(id).destroy();
    state.charts.delete(id);
  }
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const chart = new Chart(canvas, config);
  state.charts.set(id, chart);
  return chart;
}

function destroyAllCharts() {
  if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
  state.charts.forEach(c => c.destroy());
  state.charts.clear();
}

function lineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: hexToRgba(color, 0.08),
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.3,
    fill: false
  };
}

function barDataset(label, data, color) {
  return {
    label,
    data,
    backgroundColor: hexToRgba(color, 0.85),
    borderColor: color,
    borderWidth: 1,
    borderRadius: 4
  };
}

function darkBorder() {
  return state.theme === 'dark' ? '#1E1E1E' : '#FFFFFF';
}

// ============================
// ROUTER
// ============================
const pages      = {};
const chartInits = {};
const pageEvents = {};

async function showPage(name) {
  if (!PAGE_TITLES[name]) name = 'dashboard';
  state.page = name;

  document.title = `${PAGE_TITLES[name]} — CTI Group`;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === name));
  document.getElementById('topbar-title').textContent = PAGE_TITLES[name];

  destroyAllCharts();

  const content = document.getElementById('main-content');
  content.style.opacity = '0';
  content.innerHTML = `
    <div class="loading-state">
      <div class="skeleton-block tall"></div>
      <div class="skeleton-row-group">
        <div class="skeleton-block"></div><div class="skeleton-block"></div>
        <div class="skeleton-block"></div><div class="skeleton-block"></div>
      </div>
      <div class="skeleton-row-group">
        <div class="skeleton-block medium"></div><div class="skeleton-block medium"></div>
      </div>
    </div>`;
  content.style.opacity = '1';

  await new Promise(r => setTimeout(r, 400));

  try {
    const locked = LOCKED_PAGES.has(name);
    const html   = locked ? lockedPage(name) : await pages[name]();
    content.style.opacity = '0';
    content.innerHTML = html;
    await new Promise(r => requestAnimationFrame(r));
    content.style.transition = 'opacity 0.15s ease';
    content.style.opacity = '1';
    if (!locked && chartInits[name]) await chartInits[name]();
    if (!locked && pageEvents[name]) pageEvents[name]();
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="error-banner">Failed to load data — retrying...</div>`;
    content.style.opacity = '1';
  }

  if (window.innerWidth <= 1024) closeSidebar();
}

// ============================
// PAGE: J1 CULTURAL EXCHANGE
// ============================

// Parse Zoho date "06 Nov 2025 00:00:00" → Date (no time)
function parseZohoDate(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) return new Date(`${m[2]} ${m[1]}, ${m[3]}`);
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

// Format date as "May 2026" (no time, no day)
function fmtMonthYear(d) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Format date as "Nov 6, 2025" (no time)
function fmtDateOnly(d) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format a raw Zoho cell value — strip time from date columns
function j1FormatCell(col, val) {
  if (val == null || val === '') return '—';
  if (col === 'Program Start Date' || col === 'Program End Date') {
    const d = parseZohoDate(String(val));
    return d ? fmtDateOnly(d) : String(val).split(' ').slice(0,3).join(' ');
  }
  return String(val);
}

// ── J1 table sort / col-filter state ──────────────────────────
let _j1SortCol          = null;
let _j1SortDir          = 'asc';
let _j1ColTextFilters   = {};  // { 'First Name': 'John' }
let _j1ColMultiFilters  = {};  // { 'Hosting Company': ['Casa','AIFS'] }
let _j1ColDateFilters   = {};  // { 'Program Start Date': {cond:'after',val:'2025-01-01',val2:''} }
let _j1GlobalRows       = null;

const J1_SHOW_COLS = ['Hosting Company','First Name','Last Name','Gender',
  'Selected Job','Program Start Date','Program End Date',
  'Processing Sponsor','J1 Application Status'];

// ── HTML-escape helper ────────────────────────────────────────
function escH(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Global filter bar — simple dropdowns, drives charts + table ─
function j1BuildFilterBar(allRows) {
  const uniq = (key) => [...new Set(allRows.map(r => r[key]).filter(Boolean))].sort();
  const sel = (id, placeholder, opts) => `
    <select id="${id}" style="font-size:12px;padding:4px 8px;height:32px;
      border:1px solid var(--border,#ddd);border-radius:6px;
      background:var(--surface,#fff);color:var(--text,#333);max-width:160px;">
      <option value="">${placeholder}</option>
      ${opts.map(v => `<option value="${escH(v)}">${escH(v)}</option>`).join('')}
    </select>`;
  return `
    <div id="j1FilterBar" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;
      padding:12px 0 16px;border-bottom:1px solid var(--border,#eee);margin-bottom:16px;">
      <input id="j1FSearch" type="search" placeholder="🔍 Search name, host…"
        style="font-size:12px;padding:4px 10px;height:32px;width:190px;
          border:1px solid var(--border,#ddd);border-radius:6px;
          background:var(--surface,#fff);color:var(--text,#333);">
      ${sel('j1FHost',    'All Hosts',    uniq('Hosting Company'))}
      ${sel('j1FGender',  'All Genders',  uniq('Gender'))}
      ${sel('j1FJob',     'All Roles',    uniq('Selected Job'))}
      ${sel('j1FSponsor', 'All Sponsors', uniq('Processing Sponsor'))}
      <button id="j1FClear"
        style="height:32px;padding:0 12px;border:1.5px solid #B01A18;border-radius:6px;
          background:transparent;color:#B01A18;font-size:12px;font-weight:600;cursor:pointer;">
        ✕ Clear</button>
      <span id="j1FCount" style="font-size:12px;font-weight:600;color:#888;margin-left:4px;">
        ${allRows.length} participants</span>
    </div>`;
}

// ── Table filter bar — multi-select + date, only affects table ─
function j1BuildTableFilterBar(allRows) {
  const uniq = (key) => [...new Set(allRows.map(r => r[key]).filter(Boolean))].sort();

  function ms(wrpId, label, opts) {
    const items = opts.map(v => `
      <label class="j1-ms-item">
        <input type="checkbox" class="j1-ms-cb" value="${escH(v)}">
        <span class="j1-ms-opt">${escH(v)}</span>
      </label>`).join('');
    return `
      <div class="j1-multiselect" id="${wrpId}">
        <button class="j1-ms-btn" type="button">
          <span class="j1-ms-lbl">${label}</span><span class="j1-ms-badge"></span><span class="j1-ms-arrow">▾</span>
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

  const iSty = `font-size:12px;padding:3px 7px;height:30px;
    border:1px solid var(--border,#ddd);border-radius:6px;
    background:var(--surface,#fff);color:var(--text,#333);`;

  return `
    <div id="j1TableFilterBar" style="display:flex;flex-wrap:wrap;align-items:center;
      gap:8px;padding:10px 0 12px;border-bottom:1px solid var(--border,#eee);margin-bottom:10px;">
      ${ms('j1TMHost',    'Host',    uniq('Hosting Company'))}
      ${ms('j1TMGender',  'Gender',  uniq('Gender'))}
      ${ms('j1TMJob',     'Role',    uniq('Selected Job'))}
      ${ms('j1TMSponsor', 'Sponsor', uniq('Processing Sponsor'))}
      ${ms('j1TMStatus',  'Status',  uniq('J1 Application Status'))}
      <div style="display:flex;align-items:center;gap:4px;
        border-left:1px solid var(--border,#eee);padding-left:10px;">
        <select id="j1TFDateField" style="${iSty}max-width:120px;">
          <option value="">📅 Date…</option>
          <option value="Program Start Date">Start Date</option>
          <option value="Program End Date">End Date</option>
        </select>
        <select id="j1TFDateCond" style="${iSty}display:none;">
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="on">On</option>
          <option value="between">Between</option>
        </select>
        <input type="date" id="j1TFDateVal"  style="${iSty}display:none;">
        <input type="date" id="j1TFDateVal2" style="${iSty}display:none;">
      </div>
      <button id="j1TFClear"
        style="height:30px;padding:0 12px;border:1.5px solid #B01A18;border-radius:6px;
          background:transparent;color:#B01A18;font-size:12px;font-weight:600;cursor:pointer;">
        ✕ Clear</button>
      <span id="j1TFCount" style="font-size:12px;color:#888;margin-left:2px;"></span>
    </div>`;
}

// ── Re-render all charts with a new (filtered) rows array ─────
function j1UpdateCharts(rows) {
  const C = DIVISION_COLORS.j1;

  // ── KPI card helpers ────────────────────────────────────────
  const setKpi = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // ── Chart update helpers ─────────────────────────────────────
  const reBar = (id, entries) => {
    const ch = state.charts.get(id);
    if (!ch) return;
    ch.data.labels           = entries.map(e=>e[0]);
    ch.data.datasets[0].data = entries.map(e=>e[1]);
    ch.update();
  };
  const reDoughnut = (id, map, colors) => {
    const ch = state.charts.get(id);
    if (!ch) return;
    ch.data.labels                        = Object.keys(map);
    ch.data.datasets[0].data              = Object.values(map);
    ch.data.datasets[0].backgroundColor  = Object.keys(map).map((_,i)=>colors[i%colors.length]);
    ch.update();
  };

  // ── Compute KPI values from filtered rows ───────────────────
  const today      = new Date();
  let maleCount    = 0, femaleCount = 0, activeCount = 0, totalDurDays = 0, durCount = 0;
  const hostSet    = new Set();

  rows.forEach(r => {
    const g = (r['Gender'] || '').toLowerCase();
    if (g === 'male')   maleCount++;
    if (g === 'female') femaleCount++;

    const host = r['Hosting Company'];
    if (host) hostSet.add(host);

    const startD = parseZohoDate(r['Program Start Date']);
    const endD   = parseZohoDate(r['Program End Date']);
    if (startD && endD && startD <= today && endD >= today) activeCount++;
    if (startD && endD) {
      totalDurDays += (endD - startD) / (1000 * 60 * 60 * 24);
      durCount++;
    }
  });

  const avgDurMonths = durCount ? (totalDurDays / durCount / 30.44).toFixed(1) : '0.0';

  // ── Update KPI cards ────────────────────────────────────────
  setKpi('j1KpiTotal',  fmt(rows.length));
  setKpi('j1KpiActive', fmt(activeCount));
  setKpi('j1KpiMale',   fmt(maleCount));
  setKpi('j1KpiFemale', fmt(femaleCount));
  setKpi('j1KpiHosts',  fmt(hostSet.size));
  setKpi('j1KpiDur',    avgDurMonths + ' mo');

  // ── 1 Hosting ───────────────────────────────────────────────
  const hMap = {};
  rows.forEach(r=>{const h=r['Hosting Company']||'?'; hMap[h]=(hMap[h]||0)+1;});
  reBar('chartJ1Hosting', Object.entries(hMap).sort((a,b)=>b[1]-a[1]).slice(0,10));

  // ── 2 Gender ────────────────────────────────────────────────
  const gMap = {};
  rows.forEach(r=>{const g=r['Gender']||'Other'; gMap[g]=(gMap[g]||0)+1;});
  reDoughnut('chartJ1Gender', gMap, [C,'#B01A18','#888']);

  // ── 3 Job ───────────────────────────────────────────────────
  const jMap = {};
  rows.forEach(r=>{const j=r['Selected Job']||'?'; jMap[j]=(jMap[j]||0)+1;});
  const jS  = Object.entries(jMap).sort((a,b)=>b[1]-a[1]);
  const jCh = state.charts.get('chartJ1Job');
  if (jCh) {
    const JC = [C,'#2D7A55','#B87A14','#B01A18','#888'];
    jCh.data.labels                      = jS.map(e=>e[0]);
    jCh.data.datasets[0].data            = jS.map(e=>e[1]);
    jCh.data.datasets[0].backgroundColor = jS.map((_,i)=>hexToRgba(JC[i%JC.length],0.85));
    jCh.data.datasets[0].borderColor     = jS.map((_,i)=>JC[i%JC.length]);
    jCh.update();
  }

  // ── 4 Sponsor ───────────────────────────────────────────────
  const sMap = {};
  rows.forEach(r=>{const s=r['Processing Sponsor']||'?'; sMap[s]=(sMap[s]||0)+1;});
  reDoughnut('chartJ1Sponsor', sMap, [C,'#B01A18','#2D7A55','#B87A14','#6B47DC','#888']);
}

// ── Re-render the placement report table (rows are pre-filtered) ─
function j1RenderTable(rows) {
  const tbody = document.getElementById('j1TableBody');
  if (!tbody) return;

  // Sort only — filtering is done upstream in applyTableFilter()
  let data = rows;
  if (_j1SortCol) {
    data = [...data].sort((a,b) => {
      const va = a[_j1SortCol]||'', vb = b[_j1SortCol]||'';
      return _j1SortDir==='asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }
  state.dataCache['j1-table-rows'] = data;

  tbody.innerHTML = data.map((row, idx) => {
    const cells = J1_SHOW_COLS.map(c=>`<td>${j1FormatCell(c,row[c])}</td>`).join('');
    return `<tr>
      ${cells}
      <td><button class="j1-view-btn" data-idx="${idx}"
        style="padding:3px 10px;border-radius:4px;border:none;
          background:${DIVISION_COLORS.j1};color:#fff;font-size:11px;
          font-weight:600;cursor:pointer;white-space:nowrap;">
        👤 View</button></td>
    </tr>`;
  }).join('');

  // Sort icon feedback
  document.querySelectorAll('#j1TableHead th[data-col]').forEach(th=>{
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = th.dataset.col===_j1SortCol
      ? (_j1SortDir==='asc'?' ▲':' ▼') : ' ⇅';
  });

  // Bind view buttons
  tbody.querySelectorAll('.j1-view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const row = state.dataCache['j1-table-rows']?.[+btn.dataset.idx];
      if (row) openJ1ParticipantPanel(row);
    });
  });
}

// ── Participant profile side panel ────────────────────────────
function openJ1ParticipantPanel(row) {
  const first   = (row['First Name']||'').trim();
  const last    = (row['Last Name'] ||'').trim();
  const name    = `${first} ${last}`.trim();
  const C       = DIVISION_COLORS.j1;
  const startD  = parseZohoDate(row['Program Start Date']);
  const endD    = parseZohoDate(row['Program End Date']);
  const durMo   = (startD&&endD)
    ? ((endD-startD)/(1000*60*60*24*30.44)).toFixed(1)+' months' : '—';

  document.getElementById('panelTitle').textContent = name;
  document.getElementById('panelBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;padding-bottom:24px;">

      <div style="display:flex;align-items:center;gap:14px;padding-bottom:14px;
        border-bottom:2px solid ${C}30;">
        <div style="width:56px;height:56px;border-radius:50%;background:${C};flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:20px;font-weight:700;">${initials(name)||'?'}</div>
        <div>
          <div style="font-size:17px;font-weight:700;">${name}</div>
          <span style="font-size:11px;font-weight:600;margin-top:4px;display:inline-block;
            background:${C}20;color:${C};padding:2px 8px;border-radius:12px;">
            ${row['J1 Application Status']||'J1'}</span>
        </div>
      </div>

      ${j1PanelSection('Program', [
        ['Host',        row['Hosting Company']],
        ['Role',        row['Selected Job']],
        ['Department',  row['Department']],
        ['Option',      row['Program Option']],
        ['Source',      row['J1 Program Sources']]
      ], C)}

      ${j1PanelSection('Program Dates', [
        ['Start',    startD ? fmtDateOnly(startD) : '—'],
        ['End',      endD   ? fmtDateOnly(endD)   : '—'],
        ['Duration', durMo]
      ], C)}

      ${j1PanelSection('Sponsorship', [
        ['Sponsor',     row['Processing Sponsor']],
        ['Invoice',     row['Program Sponsor Invoice Status']],
        ['Investment',  row['Total Paid Investment']
          ? '$'+Number(row['Total Paid Investment']).toLocaleString() : '—']
      ], C)}

      ${(row['Housing Name']||row['Housing Address'])
        ? j1PanelSection('Housing',[
            ['Name',    row['Housing Name']],
            ['Address', row['Housing Address']]
          ], C) : ''}

      ${j1PanelSection('Contact', [
        ['Email', row['Email']
          ? `<a href="mailto:${row['Email']}" style="color:${C};">${row['Email']}</a>`:'—']
      ], C)}
    </div>`;

  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('active');
}

function j1PanelSection(title, fields, color) {
  const content = fields.filter(([,v])=>v&&v!=='—'&&v!=='').map(([label,val])=>`
    <div style="display:grid;grid-template-columns:100px 1fr;gap:6px;
      padding:6px 0;border-bottom:1px solid var(--border,#eee);">
      <span style="font-size:11px;font-weight:600;color:#999;
        text-transform:uppercase;letter-spacing:0.04em;">${label}</span>
      <span style="font-size:13px;">${val}</span>
    </div>`).join('');
  if (!content) return '';
  return `<div>
    <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;
      letter-spacing:0.08em;padding-bottom:6px;margin-bottom:4px;
      border-bottom:2px solid ${color};">${title}</div>
    ${content}
  </div>`;
}

// Build executive summary text from live rows
function generateJ1Summary(rows) {
  const total = rows.length;
  const today = new Date();

  const males   = rows.filter(r => r['Gender'] === 'Male').length;
  const females = rows.filter(r => r['Gender'] === 'Female').length;

  const active = rows.filter(r => {
    const s = parseZohoDate(r['Program Start Date']);
    const e = parseZohoDate(r['Program End Date']);
    return s && e && s <= today && e >= today;
  }).length;

  const hostMap = {};
  rows.forEach(r => { const h = r['Hosting Company']||'Unknown'; hostMap[h]=(hostMap[h]||0)+1; });
  const hostTop3 = Object.entries(hostMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const jobMap = {};
  rows.forEach(r => { const j = r['Selected Job']||'Unknown'; jobMap[j]=(jobMap[j]||0)+1; });
  const jobTop = Object.entries(jobMap).sort((a,b)=>b[1]-a[1]);

  const spMap = {};
  rows.forEach(r => { const s = r['Processing Sponsor']||'Unknown'; spMap[s]=(spMap[s]||0)+1; });
  const spList = Object.entries(spMap).sort((a,b)=>b[1]-a[1]);

  const starts   = rows.map(r => parseZohoDate(r['Program Start Date'])).filter(Boolean);
  const ends     = rows.map(r => parseZohoDate(r['Program End Date'])).filter(Boolean);
  const minStart = starts.length ? new Date(Math.min(...starts.map(d=>d.getTime()))) : null;
  const maxEnd   = ends.length   ? new Date(Math.max(...ends.map(d=>d.getTime())))   : null;

  const durations = rows.map(r => {
    const s = parseZohoDate(r['Program Start Date']);
    const e = parseZohoDate(r['Program End Date']);
    return (s && e) ? (e - s) / (1000 * 60 * 60 * 24 * 30.44) : null;
  }).filter(Boolean);
  const avgDur = durations.length
    ? (durations.reduce((a,b)=>a+b,0) / durations.length).toFixed(1)
    : 'N/A';

  return `CTI Group's J1 Cultural Exchange currently has ${total} participants placed across ${Object.keys(hostMap).length} hosting companies. ` +
    `${active} participants are actively on program in the United States right now. ` +
    `Gender distribution is nearly balanced — ${males} male and ${females} female participants. ` +
    `The top hosting partners are ${hostTop3.map(e=>`${e[0]} with ${e[1]} placements`).join(', ')}. ` +
    `In terms of roles, ${jobTop[0][0]} is the most common position at ${Math.round(jobTop[0][1]/total*100)}% — ${jobTop[0][1]} of ${total} participants — followed by ${jobTop.slice(1).map(e=>`${e[0]} (${e[1]})`).join(', ')}. ` +
    `For sponsorship, ${spList.map(e=>`${e[0]} handles ${e[1]} participants (${Math.round(e[1]/total*100)}%)`).join(', and ')}. ` +
    `Programs span from ${fmtMonthYear(minStart)} to ${fmtMonthYear(maxEnd)}, with an average duration of ${avgDur} months per placement.`;
}


// ============================
// PAGE: REPORTS
// ============================
pages.reports = async function () {
  const reports = [
    { icon:'👥', title:'Recruitment Report',
      desc:'Candidate pipeline, sourcing channels, and recruitment funnel across all divisions.' },
    { icon:'📋', title:'Onboarding Report',
      desc:'New hire onboarding progress, documentation status, and completion rates by division.' },
    { icon:'🛳️', title:'C1/D Visa Report',
      desc:'Crew member C1/D visa application statuses, approval rates, and processing timelines.' },
    { icon:'🎓', title:'J1 Visa Report',
      desc:'J1 exchange visitor visa statuses, sponsor activity, and program compliance data.' },
    { icon:'🚢', title:'Cruise Line Deployment Report',
      desc:'Crew deployment schedules, vessel assignments, and rotation status for cruise clients.' },
    { icon:'📊', title:'J1 Placement Report',
      desc:'Full J1 participant placement data — host, role, dates, sponsor, and application status.' },
    { icon:'📅', title:'CUK Weekly Report',
      desc:'Weekly activity summary for Carnival UK (CUK Maritime) operations and crew status.' },
    { icon:'🗺️', title:'CUK RAG Heat Map Report',
      desc:'Red-Amber-Green status heat map for CUK crew readiness and compliance indicators.' }
  ];

  const lockBtn = (label) => `
    <button disabled
      style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border,#ddd);
        background:var(--bg-page,#f9f9f9);color:var(--text-muted,#bbb);
        font-size:12px;font-weight:600;cursor:not-allowed;display:flex;
        align-items:center;justify-content:center;gap:5px;">
      🔒 ${label}
    </button>`;

  const cards = reports.map(r => `
    <div class="report-card">
      <div style="font-size:30px;line-height:1;margin-bottom:6px;">${r.icon}</div>
      <h4>${r.title}</h4>
      <p>${r.desc}</p>
      <div class="report-actions" style="display:flex;gap:8px;margin-top:4px;">
        ${lockBtn('Generate PDF')}
        ${lockBtn('Export CSV')}
      </div>
    </div>`).join('');

  return `
    <div class="page-header"><h1>Reports</h1>
      <p class="subtitle">Available reports for CTI Group operations</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:11px 16px;
      background:rgba(176,26,24,0.06);border:1px solid rgba(176,26,24,0.2);
      border-radius:8px;margin-bottom:24px;">
      <span style="font-size:16px;">🔒</span>
      <span style="font-size:13px;color:#B01A18;font-weight:500;">
        Report generation and export are being configured and will be available soon.
      </span>
    </div>
    <div class="report-grid">${cards}</div>`;
};

// ============================
// PAGE: COMPLIANCE
// ============================
pages.compliance = async function () {
  const C = DIVISION_COLORS.j1;
  const docs = [
    { file:'CTI Group_J1_Program_Terms_and_Conditions.pdf',           icon:'📋', label:'J1 Program Terms & Conditions',                   cat:'Agreement' },
    { file:'CTI-AGG-J1-001_Program_General_Policy.pdf',               icon:'📄', label:'Program General Policy',                          cat:'Policy' },
    { file:'CTI-AGG-J1-002_Program_Knowledge_Checklist.pdf',          icon:'✅', label:'Program Knowledge Checklist',                     cat:'Checklist' },
    { file:'CTI-AGG-J1-003_Housing_Agreement_Room_Sharing_Acknowledgment_and_Early_Termination_Policy.pdf', icon:'🏠', label:'Housing Agreement & Early Termination Policy', cat:'Agreement' },
    { file:'CTI-AGG-J1-004_Parent_and_Student_Commitment_Agreement.pdf', icon:'🤝', label:'Parent & Student Commitment Agreement',        cat:'Agreement' },
    { file:'CTI-SOP-J1-001_Pre-Embassy_Screening_Protocol.pdf',      icon:'🏛️', label:'Pre-Embassy Screening Protocol',                  cat:'SOP' },
    { file:'CTI-SOP-J1-002_Marketing_and_Recruiter_Communications.pdf', icon:'📢', label:'Marketing & Recruiter Communications',          cat:'SOP' },
    { file:'CTI-SOP-J1-003_Active_Participant_Monitoring.pdf',       icon:'👁️', label:'Active Participant Monitoring',                   cat:'SOP' },
    { file:'CTI-SOP-J1-004_Pre-Departure_Orientation_and_Interview_Readiness.pdf', icon:'✈️', label:'Pre-Departure Orientation & Interview Readiness', cat:'SOP' },
  ];
  const catColor = { SOP:'#1B3A6B', Agreement:'#B01A18', Policy:'#2D7A55', Checklist:'#B87A14', Guide:'#6B47DC' };

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Compliance</h1>
        <p class="subtitle">Program agreements, SOPs, and compliance documents</p>
      </div>
    </div>

    <!-- Document library -->
    <div class="card">
      <div class="card-title" style="margin-bottom:4px;">📁 Program Documents</div>
      <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:18px;">
        ${docs.length} documents · Click to download
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${docs.map(d => `
          <a href="docs/${encodeURIComponent(d.file)}" target="_blank" download="${d.file}"
            style="display:flex;align-items:center;gap:14px;padding:13px 16px;
              border:1px solid var(--border,#E5E7EB);border-radius:10px;text-decoration:none;
              color:var(--text,#1A1A1A);background:var(--bg,#fff);transition:all 0.15s;"
            onmouseover="this.style.background='var(--bg-subtle,#F9FAFB)';this.style.borderColor='${C}'"
            onmouseout="this.style.background='var(--bg,#fff)';this.style.borderColor='var(--border,#E5E7EB)'">
            <span style="font-size:22px;flex-shrink:0;">${d.icon}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.label}</div>
              <div style="font-size:11px;color:var(--text-muted,#999);margin-top:2px;">${d.file}</div>
            </div>
            <span style="font-size:10px;font-weight:700;letter-spacing:0.06em;padding:3px 10px;
              border-radius:20px;flex-shrink:0;
              background:${catColor[d.cat] || '#888'}18;color:${catColor[d.cat] || '#888'};">
              ${d.cat}
            </span>
            <span style="font-size:14px;color:var(--text-muted,#aaa);flex-shrink:0;">↓</span>
          </a>`).join('')}
      </div>
    </div>`;
};

// ============================
// PAGE: J1 VISA STATUS
// ============================
pages.j1visa = async function () {
  let recruitRows = [], crmRows = [], errorMsg = null;
  const [rRes, cRes] = await Promise.allSettled([
    safeJson('/api/recruit/j1-participants'),
    safeJson('/api/crm/j1-participants'),
  ]);
  if (rRes.status === 'fulfilled') recruitRows = rRes.value?.data || [];
  else errorMsg = rRes.reason?.message;
  if (cRes.status === 'fulfilled') crmRows = cRes.value?.data || [];

  // Filter: active status only + visa status not blank
  const _parActiveSet = new Set(PAR_STATUSES);
  const allRows = [...recruitRows, ...crmRows].filter(r =>
    _parActiveSet.has(r.placementStatus) && r.visaAppointment && r.visaAppointment !== '—'
  );
  state.dataCache['visa-rows'] = allRows;
  _visaSortCol = null; _visaSortDir = 'asc';

  const today = new Date(); today.setHours(0,0,0,0);
  const totalVisa   = allRows.length;
  const cntApproved = allRows.filter(r => r.visaStatus === 'Approved').length;
  // Cumulative rejections: Rejected 1st=1, Pending 2nd=1, Rejected 2nd=2, Pending 3rd=2, Rejected 3rd=3
  const cntRejected = allRows.reduce((s, r) => s + visaRejectionCount(r.visaStatus), 0);
  const cntPending  = allRows.filter(r => /pending/i.test(r.visaStatus)).length;
  const cntUpcoming = allRows.filter(r => {
    if (!r.visaAppointment || r.visaAppointment === '—') return false;
    const d = new Date(r.visaAppointment);
    return !isNaN(d.getTime()) && d >= today;
  }).length;
  // Success rate: approved / (approved + people currently in any rejected status)
  const cntRejPeople = allRows.filter(r => /rejected/i.test(r.visaStatus)).length;
  const successRate  = (cntApproved + cntRejPeople) > 0
    ? Math.round(cntApproved / (cntApproved + cntRejPeople) * 100) : null;
  const authErr = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED')||errorMsg.includes('401'));

  // Filter dropdown options
  const visaStatuses = [...new Set(allRows.map(r=>r.visaStatus).filter(v=>v&&v!=='—'))].sort();
  const countries    = [...new Set(allRows.map(r=>r.country).filter(v=>v&&v!=='—'))].sort();
  const sponsors     = [...new Set(allRows.map(r=>r.processingSponsor).filter(v=>v&&v!=='—'))].sort();
  // Month/Year options from appointment dates
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const apptDates = allRows.map(r=>r.visaAppointment).filter(v=>v&&v!=='—').map(v=>new Date(v)).filter(d=>!isNaN(d));
  const apptYears  = [...new Set(apptDates.map(d=>d.getFullYear()))].sort((a,b)=>a-b);
  const apptMonths = [...new Set(apptDates.map(d=>d.getMonth()))].sort((a,b)=>a-b);

  // Table headers
  const thSort = VISA_TABLE_COLS.map(col =>
    col.sortable
      ? `<th data-visafield="${escH(col.field)}" class="sortable" style="cursor:pointer;user-select:none;white-space:nowrap;">${col.label} <span class="req-sort-icon">⇅</span></th>`
      : `<th style="white-space:nowrap;">${col.label}</th>`
  ).join('') + '<th style="width:52px;"></th>';

  const sources    = [...new Set(allRows.map(r=>r.programSource).filter(v=>v&&v!=='—'))].sort();
  const placStats  = [...new Set(allRows.map(r=>r.placementStatus).filter(v=>v&&v!=='—'))].sort();
  const refLetters = [...new Set(allRows.map(r=>r.refLetterStatus).filter(v=>v&&v!=='—'))].sort();
  const visaEligSet = new Set();
  allRows.forEach(r => {
    if (r.eligiblePrograms && r.eligiblePrograms !== '—')
      r.eligiblePrograms.split(',').forEach(p => { const t = p.trim(); if (t) visaEligSet.add(t); });
  });
  const visaEligOpts = [...visaEligSet].sort();

  const cfDropdowns = {
    placementStatus:  placStats,
    programSource:    sources,
    eligiblePrograms: visaEligOpts,
    country:          countries,
    processingSponsor:sponsors,
    visaStatus:       visaStatuses,
    refLetterStatus:  refLetters,
  };
  const thFilter = VISA_TABLE_COLS.map(col => {
    if (col.datecol) return `<th style="min-width:170px;padding:2px 4px;">
      <div style="display:flex;gap:2px;align-items:center;">
        <select class="req-cf req-cf-date-cond" data-visafield="${escH(col.field)}"
          title="Before / On or Before / On / On or After / After"
          style="width:42px;flex-shrink:0;padding:1px 2px;font-size:12px;text-align:center;">
          <option value="">–</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="eq">=</option><option value="gte">≥</option><option value="gt">&gt;</option>
        </select>
        <input type="date" class="req-cf req-cf-date-val" data-visafield="${escH(col.field)}"
          style="flex:1;padding:1px 3px;font-size:11px;min-width:0;">
      </div>
    </th>`;
    const opts = cfDropdowns[col.field];
    return `<th>${opts
      ? `<select class="req-cf" data-visafield="${escH(col.field)}"><option value="">All</option>${opts.map(v=>`<option value="${escH(v)}">${escH(v)}</option>`).join('')}</select>`
      : `<input class="req-cf req-col-f" data-visafield="${escH(col.field)}" type="text" placeholder="—">`
    }</th>`;
  }).join('') + '<th></th>';

  return `
    <div class="req-page-header">
      <h1>Visa</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">${totalVisa} participants with visa appointment</span>
    </div>

    ${errorMsg ? `<div class="req-error-banner"><span>${authErr?'🔑':'⚠️'}</span>
      <div><strong>${authErr?'Not connected to Zoho':'Server error'}</strong>
      ${authErr?' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>':` — ${escH(errorMsg)}`}
      </div></div>` : ''}

    <!-- Filter Bar (sticky) -->
    <div class="card req-filter-bar">
      <select id="visaStatusFilter" class="req-gsel">
        <option value="">All Visa Statuses</option>
        ${visaStatuses.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="visaApptMonth" class="req-gsel">
        <option value="">All Months</option>
        ${apptMonths.map(m=>`<option value="${m}">${MONTH_NAMES[m]}</option>`).join('')}
      </select>
      <select id="visaApptYear" class="req-gsel">
        <option value="">All Years</option>
        ${apptYears.map(y=>`<option value="${y}">${y}</option>`).join('')}
      </select>
      <select id="visaCountryFilter" class="req-gsel">
        <option value="">All Countries</option>
        ${countries.map(c=>`<option value="${escH(c)}">${escH(c)}</option>`).join('')}
      </select>
      <select id="visaSponsorFilter" class="req-gsel">
        <option value="">All Sponsors</option>
        ${sponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <button id="visaClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="visaCount" class="req-count-badge">${allRows.length} records</span>
    </div>

    <!-- KPIs (5 + success rate donut) -->
    <div class="req-kpi-grid" style="grid-template-columns:repeat(6,1fr);">
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Applications</span>
        <span class="req-kpi-value" style="color:#1B3A6B;" id="visaKpiTotal">${totalVisa.toLocaleString()}</span>
        <span class="req-kpi-sub">with visa status</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Approved</span>
        <span class="req-kpi-value" style="color:#2D7A55;" id="visaKpiApproved">${cntApproved.toLocaleString()}</span>
        <span class="req-kpi-sub">participants approved</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Rejections</span>
        <span class="req-kpi-value" style="color:#B01A18;" id="visaKpiRejected">${cntRejected.toLocaleString()}</span>
        <span class="req-kpi-sub">total rejection events</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Pending</span>
        <span class="req-kpi-value" style="color:#D97706;" id="visaKpiPending">${cntPending.toLocaleString()}</span>
        <span class="req-kpi-sub">awaiting decision</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Upcoming Appt.</span>
        <span class="req-kpi-value" style="color:#0891B2;" id="visaKpiUpcoming">${cntUpcoming.toLocaleString()}</span>
        <span class="req-kpi-sub">future appointments</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Success Rate</span>
        <span class="req-kpi-value" style="color:${successRate !== null ? (successRate >= 80 ? '#2D7A55' : successRate >= 50 ? '#D97706' : '#B01A18') : '#6B7280'};" id="visaKpiRate">${successRate !== null ? successRate + '%' : 'N/A'}</span>
        <span class="req-kpi-sub">approved vs rejected</span>
      </div>
    </div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="visaMainTable">
          <thead>
            <tr id="visaSortRow">${thSort}</tr>
            <tr id="visaColFilterRow">${thFilter}</tr>
          </thead>
          <tbody id="visaTableBody"></tbody>
        </table>
      </div>
    </div>`;
};

pageEvents.j1visa = function () {
  const allRows = state.dataCache['visa-rows'] || [];
  if (!allRows.length) return;

  // ── Helpers ───────────────────────────────────────────
  function visaBadge(s) {
    const c = visaStatusColor(s);
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${c}18;color:${c};border:1px solid ${c}40;white-space:nowrap;">${escH(s||'—')}</span>`;
  }
  function statusBadge(s) {
    const c = PAR_STATUS_COLORS[s] || '#888';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${c}18;color:${c};border:1px solid ${c}40;white-space:nowrap;">${escH(s||'—')}</span>`;
  }
  function fmtDate(v) {
    if (!v || v === '—') return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  // Journey trail — infer full step sequence from current status
  const VISA_JOURNEY_MAP = {
    'Pending':               [['Pending','p']],
    'Approved':              [['Approved','a']],
    'Rejected 1st Attempt':  [['Rej. 1st','r']],
    'Pending 2nd Interview': [['Rej. 1st','r'],['Pend. 2nd','p']],
    'Rejected 2nd Attempt':  [['Rej. 1st','r'],['Pend. 2nd','p'],['Rej. 2nd','r']],
    'Pending 3rd Interview': [['Rej. 1st','r'],['Pend. 2nd','p'],['Rej. 2nd','r'],['Pend. 3rd','p']],
    'Rejected 3rd Attempt':  [['Rej. 1st','r'],['Pend. 2nd','p'],['Rej. 2nd','r'],['Pend. 3rd','p'],['Rej. 3rd','r']],
  };
  function journeyBadges(status) {
    const steps = VISA_JOURNEY_MAP[status];
    if (!steps) return visaBadge(status); // fallback for unknown statuses
    const tc = t => t==='a' ? '#2D7A55' : t==='r' ? '#B01A18' : '#D97706';
    return steps.map(([lbl, t], i) => {
      const isLast = i === steps.length - 1;
      const c = tc(t);
      const badge = `<span title="${escH(status)}" style="display:inline-block;padding:1px 5px;border-radius:10px;font-size:9px;font-weight:700;background:${c}${isLast?'22':'0f'};color:${c};border:1px solid ${c}${isLast?'55':'25'};white-space:nowrap;">${escH(lbl)}</span>`;
      return i < steps.length - 1
        ? badge + '<span style="color:#bbb;font-size:9px;margin:0 1px;">›</span>'
        : badge;
    }).join('');
  }

  function cellContent(r, col) {
    const v   = r[col.field];
    const str = (v === null || v === undefined || v === '') ? '—' : String(v);
    if (col.statusbadge) return statusBadge(str);
    if (col.journeycol)  return str === '—' ? '—' : journeyBadges(str);
    if (col.datecol)     return fmtDate(str);
    return escH(str);
  }

  function readVisaDateFilters() {
    const out = {};
    document.querySelectorAll('#visaColFilterRow .req-cf-date-val').forEach(input => {
      const val = input.value; if (!val) return;
      const field  = input.dataset.visafield;
      const condEl = document.querySelector(`#visaColFilterRow .req-cf-date-cond[data-visafield="${field}"]`);
      const cond   = condEl?.value; if (!cond) return;
      out[field] = { cond, val };
    });
    return out;
  }

  function applyFilters(base) {
    const gSt    = document.getElementById('visaStatusFilter')?.value  || '';
    const gCtry  = document.getElementById('visaCountryFilter')?.value || '';
    const gSp    = document.getElementById('visaSponsorFilter')?.value || '';
    const gMonth = document.getElementById('visaApptMonth')?.value     || '';
    const gYear  = document.getElementById('visaApptYear')?.value      || '';
    const colF   = {};
    document.querySelectorAll('#visaColFilterRow .req-cf').forEach(el => {
      if (el.classList.contains('req-cf-date-cond') || el.classList.contains('req-cf-date-val')) return;
      const v = el.value.trim(); if (v) colF[el.dataset.visafield] = v.toLowerCase();
    });
    const dateColF = readVisaDateFilters();
    return base.filter(r => {
      if (gSt   && r.visaStatus        !== gSt)   return false;
      if (gCtry && r.country           !== gCtry) return false;
      if (gSp   && r.processingSponsor !== gSp)   return false;
      if (gMonth !== '' || gYear !== '') {
        const appt = r.visaAppointment;
        if (!appt || appt === '—') return false;
        const d = new Date(appt);
        if (isNaN(d.getTime())) return false;
        if (gMonth !== '' && d.getMonth() !== parseInt(gMonth)) return false;
        if (gYear  !== '' && d.getFullYear() !== parseInt(gYear))  return false;
      }
      for (const [f, fv] of Object.entries(colF)) {
        if (f === 'eligiblePrograms') {
          const progs = (r.eligiblePrograms || '').split(',').map(s => s.trim().toLowerCase());
          if (!progs.some(p => p.includes(fv))) return false;
        } else {
          if (!String(r[f]||'').toLowerCase().includes(fv)) return false;
        }
      }
      for (const [field, { cond, val }] of Object.entries(dateColF)) {
        const rd = parseDateStr(String(r[field] || ''));
        const fd = new Date(val + 'T00:00:00');
        if (!rd) return false;
        if (cond === 'lt'  && !(rd <  fd)) return false;
        if (cond === 'lte' && !(rd <= fd)) return false;
        if (cond === 'eq'  && rd.toISOString().slice(0,10) !== val) return false;
        if (cond === 'gte' && !(rd >= fd)) return false;
        if (cond === 'gt'  && !(rd >  fd)) return false;
      }
      return true;
    });
  }
  function doSort(rows) {
    if (!_visaSortCol) return rows;
    const isDate = ['visaPaymentDate','visaAppointment','visaExpiredDate'].includes(_visaSortCol);
    return [...rows].sort((a, b) => {
      let av = a[_visaSortCol], bv = b[_visaSortCol];
      if (isDate) {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
        return _visaSortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av||'').localeCompare(String(bv||''));
      return _visaSortDir === 'asc' ? cmp : -cmp;
    });
  }
  function renderRows(rows) {
    if (!rows.length) return `<tr><td colspan="${VISA_TABLE_COLS.length+1}" style="text-align:center;padding:32px;color:var(--text-muted);">No matching records.</td></tr>`;
    return rows.map(r => `<tr>${VISA_TABLE_COLS.map(col=>`<td>${cellContent(r,col)}</td>`).join('')}<td></td></tr>`).join('');
  }

  function updateKpis(rows) {
    const today      = new Date(); today.setHours(0,0,0,0);
    const approved   = rows.filter(r => r.visaStatus === 'Approved').length;
    const rejected   = rows.reduce((s, r) => s + visaRejectionCount(r.visaStatus), 0); // total events
    const rejPeople  = rows.filter(r => /rejected/i.test(r.visaStatus)).length;
    const pending    = rows.filter(r => /pending/i.test(r.visaStatus)).length;
    const upcoming   = rows.filter(r => {
      if (!r.visaAppointment || r.visaAppointment === '—') return false;
      const d = new Date(r.visaAppointment);
      return !isNaN(d.getTime()) && d >= today;
    }).length;
    const rate = (approved + rejPeople) > 0 ? Math.round(approved/(approved+rejPeople)*100) : null;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('visaKpiTotal',    rows.length.toLocaleString());
    set('visaKpiApproved', approved.toLocaleString());
    set('visaKpiRejected', rejected.toLocaleString());
    set('visaKpiPending',  pending.toLocaleString());
    set('visaKpiUpcoming', upcoming.toLocaleString());
    const rateEl = document.getElementById('visaKpiRate');
    if (rateEl) {
      rateEl.textContent = rate !== null ? rate + '%' : 'N/A';
      rateEl.style.color = rate === null ? '#6B7280' : rate >= 80 ? '#2D7A55' : rate >= 50 ? '#D97706' : '#B01A18';
    }
  }

  let _currentRows = [...allRows];
  function refresh() {
    _currentRows = doSort(applyFilters([...allRows]));
    const tbody = document.getElementById('visaTableBody');
    if (tbody) tbody.innerHTML = renderRows(_currentRows);
    const cnt = document.getElementById('visaCount');
    if (cnt) cnt.textContent = `${_currentRows.length} of ${allRows.length} records`;
    updateKpis(_currentRows);
  }

  refresh();

  // Filters
  ['visaStatusFilter','visaApptMonth','visaApptYear','visaCountryFilter','visaSponsorFilter'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', refresh));

  // Column filters (text, dropdowns, date cond+val)
  document.querySelectorAll('#visaColFilterRow .req-cf').forEach(el =>
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', refresh));
  // Auto-clear date value when condition is reset to blank
  document.querySelectorAll('#visaColFilterRow .req-cf-date-cond').forEach(sel => {
    sel.addEventListener('change', () => {
      if (!sel.value) {
        const v = document.querySelector(`#visaColFilterRow .req-cf-date-val[data-visafield="${sel.dataset.visafield}"]`);
        if (v) v.value = '';
      }
    });
  });

  // Sort
  document.getElementById('visaSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-visafield]'); if (!th) return;
    const field = th.dataset.visafield;
    if (_visaSortCol === field) _visaSortDir = _visaSortDir === 'asc' ? 'desc' : 'asc';
    else { _visaSortCol = field; _visaSortDir = 'asc'; }
    document.querySelectorAll('#visaSortRow .req-sort-icon').forEach(el => {
      el.textContent = '⇅'; el.closest('th')?.classList.remove('req-sort-asc','req-sort-desc');
    });
    const icon = th.querySelector('.req-sort-icon');
    if (icon) { icon.textContent = _visaSortDir === 'asc' ? '↑' : '↓'; th.classList.add(_visaSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc'); }
    refresh();
  });

  // Clear
  document.getElementById('visaClearBtn')?.addEventListener('click', () => {
    ['visaStatusFilter','visaApptMonth','visaApptYear','visaCountryFilter','visaSponsorFilter'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelectorAll('#visaColFilterRow .req-cf').forEach(el => el.value = '');
    _visaSortCol = null; _visaSortDir = 'asc';
    document.querySelectorAll('#visaSortRow .req-sort-icon').forEach(el => el.textContent = '⇅');
    document.querySelectorAll('#visaSortRow th').forEach(th => th.classList.remove('req-sort-asc','req-sort-desc'));
    refresh();
  });
};

// ============================
// PAGE: REQUISITION
// ============================
// Column indices — must match J1_REQ_SHOW_COLS in server.js (13 cols)
// 0:Hosting Company  1:Department  2:Position Name  3:Requisition  4:Client Name Analytics
// 5:J1 Program Type  6:Requisition Status  7:Contract Length  8:Salary  9:City
// 10:Target Date  11:Date Opened("Start Date")  12:Housing Availability
const REQ_CI = {
  company:   0, dept:      1, position: 2, slots:    3,
  sponsor:   4, progType:  5, status:   6, contract: 7,
  salary:    8, city:      9, target:  10, start:   11, housing: 12,
  payFreq:  13
};

// Table display column order (indices into data row)
const REQ_TABLE_COLS = [
  { label: 'Sponsor',          ci: 4,  sortable: true  },
  { label: 'J1 Program Type',  ci: 5,  sortable: false, tags: true },
  { label: 'Hosting Company',  ci: 0,  sortable: true  },
  { label: 'Department',       ci: 1,  sortable: true,  badge: true },
  { label: 'Headcount',        ci: 3,  sortable: true,  center: true, num: true },
  { label: 'Start Date',       ci: 11, sortable: true  },
  { label: 'Target Date',      ci: 10, sortable: true  },
  { label: 'Housing',          ci: 12, sortable: true  },
  { label: 'Salary',           ci: 8,  sortable: true  },
  { label: 'Pay Freq.',        ci: 13, sortable: true  },
  { label: 'Contract',         ci: 7,  sortable: true  },
];

// Sort state — Requisition
let _reqSortCol = null;
let _reqSortDir = 'asc';
let _reqColFilters = {};

// ── PAR (Participant) column indices ──────────────────
// 0:Email  1:Program End Date  2:First Name  3:Gender  4:Housing Name
// 5:Program Start Date  6:J1 Application Status  7:Processing Sponsor
// 8:J1 Program Sources  9:Hosting Company  10:Department
// 11:Program Sponsor Invoice Status  12:Total Paid Investment
// 13:Selected Job  14:Housing Address  15:Program Option  16:Last Name
// Participant — field names on normalized row objects (Recruit + CRM)
const PAR_STATUSES = [
  'New Submission','On Hold','Consultation Call','Sales Call',
  'Stage 1','Stage 2','Stage 3','Stage 4','USA Onboard','Program Completed',
];
const PAR_PLACEMENT_STATUSES = new Set(['USA Onboard','Program Completed']);
const PAR_STATUS_COLORS = {
  'New Submission':    '#6B7280',
  'On Hold':           '#D97706',
  'Consultation Call': '#0891B2',
  'Sales Call':        '#7C3AED',
  'Stage 1':           '#DC4A2D',
  'Stage 2':           '#EA580C',
  'Stage 3':           '#0F766E',
  'Stage 4':           '#0369A1',
  'USA Onboard':       '#1B3A6B',
  'Program Completed': '#2D7A55',
};
// PAR_TABLE_COLS uses object field names, not numeric indices (data is Recruit/CRM objects)
const PAR_TABLE_COLS = [
  { label:'Status',            field:'placementStatus',   sortable:true,  statusbadge:true               },
  { label:'J1 Source',         field:'programSource',     sortable:true                                  },
  { label:'First Name',        field:'firstName',         sortable:true                                  },
  { label:'Last Name',         field:'lastName',          sortable:true                                  },
  { label:'Country',           field:'country',           sortable:true                                  },
  { label:'Department',        field:'department',        sortable:true,  badge:true                     },
  { label:'Eligible Programs', field:'eligiblePrograms',  sortable:true                                  },
  { label:'Sponsor',           field:'processingSponsor', sortable:true                                  },
  { label:'Hosting Company',   field:'hostCompany',       sortable:true                                  },
  { label:'Start Date',        field:'programStart',      sortable:true,  datecol:true                   },
  { label:'End Date',          field:'programEnd',        sortable:true,  datecol:true                   },
  { label:'App Source',        field:'_source',           sortable:true,  sourcebadge:true               },
];
// Sort state — Participant
let _parSortCol   = null;
let _parSortDir   = 'asc';
let _parActiveTab = 'All';

// ── Visa page constants ───────────────────────────────
const VISA_STATUS_COLORS = {
  'Approved':             '#2D7A55',
  'Rejected 1st Attempt': '#B01A18',
  'Rejected 2nd Attempt': '#B01A18',
  'Rejected 3rd Attempt': '#B01A18',
  'Pending 2nd Interview':'#D97706',
  'Pending 3rd Interview':'#D97706',
};
function visaStatusColor(s) {
  if (!s || s === '—') return '#6B7280';
  if (s === 'Approved') return '#2D7A55';
  if (/rejected/i.test(s)) return '#B01A18';
  if (/pending/i.test(s)) return '#D97706';
  return '#6B7280';
}
// Returns the cumulative number of rejection EVENTS implied by a visa status.
// "Pending 2nd Interview" = 1 prior rejection; "Rejected 3rd Attempt" = 3 rejections.
function visaRejectionCount(status) {
  if (!status || status === '—') return 0;
  if (status === 'Rejected 1st Attempt' || status === 'Pending 2nd Interview') return 1;
  if (status === 'Rejected 2nd Attempt' || status === 'Pending 3rd Interview') return 2;
  if (status === 'Rejected 3rd Attempt') return 3;
  return 0;
}
const VISA_TABLE_COLS = [
  { label:'J1 App Status',     field:'placementStatus',  sortable:true,  statusbadge:true },
  { label:'J1 Source',         field:'programSource',    sortable:true                    },
  { label:'First Name',        field:'firstName',        sortable:true                    },
  { label:'Last Name',         field:'lastName',         sortable:true                    },
  { label:'Eligible Programs', field:'eligiblePrograms', sortable:true                    },
  { label:'Country',           field:'country',          sortable:true                    },
  { label:'Sponsor',           field:'processingSponsor',sortable:true                    },
  { label:'Visa Journey',      field:'visaStatus',       sortable:true,  journeycol:true  },
  { label:'Payment Date',      field:'visaPaymentDate',  sortable:true,  datecol:true     },
  { label:'Appointment Date',  field:'visaAppointment',  sortable:true,  datecol:true     },
  { label:'Expired Date',      field:'visaExpiredDate',  sortable:true,  datecol:true     },
  { label:'Support Letter',    field:'refLetterStatus',  sortable:true                    },
];
let _visaSortCol = null, _visaSortDir = 'asc';

// ── Talent Pool constants ─────────────────────────────
const TP_STATUSES = ['New Submission','On Hold','Consultation Call','Sales Call'];
const TP_TABLE_COLS = [
  { label:'Status',            field:'placementStatus',   sortable:true,  statusbadge:true },
  { label:'J1 Source',         field:'programSource',     sortable:true                    },
  { label:'First Name',        field:'firstName',         sortable:true                    },
  { label:'Last Name',         field:'lastName',          sortable:true                    },
  { label:'Country',           field:'country',           sortable:true                    },
  { label:'Department',        field:'department',        sortable:true,  badge:true        },
  { label:'Eligible Programs', field:'eligiblePrograms',  sortable:true                    },
  { label:'App Source',        field:'_source',           sortable:true,  sourcebadge:true  },
];
let _tpSortCol   = null;
let _tpSortDir   = 'asc';
let _tpActiveTab = 'All';

pages.requisition = async function () {
  const C = DIVISION_COLORS.j1;

  let rawRows  = [];
  let errorMsg = null;

  try {
    const json = await safeJson('/api/zoho/j1-requisition');
    rawRows  = json.data?.rows || [];
  } catch (e) { errorMsg = e.message; }

  // Server already filters for Active + J1 Program; double-check defensively
  const rows = rawRows.filter(r =>
    (!r[REQ_CI.status] || r[REQ_CI.status] === 'Active')
  );

  // Cache for pageEvents
  state.dataCache['req-rows']    = rows;
  state.dataCache['req-rawrows'] = rawRows;

  // Summary stats
  const totalHeadcount = rows.reduce((s,r) => s + (parseInt(r[REQ_CI.slots])||0), 0);
  const sponsors  = [...new Set(rows.map(r=>r[REQ_CI.sponsor]).filter(v=>v&&v!=='—'))].sort();
  const depts     = [...new Set(rows.map(r=>r[REQ_CI.dept]).filter(v=>v&&v!=='—'))].sort();
  const progTypes = [...new Set(rows.map(r=>r[REQ_CI.progType]).filter(v=>v&&v!=='—')
      .flatMap(v=>v.split(';').map(t=>t.trim())))].sort();
  const hosting   = [...new Set(rows.map(r=>r[REQ_CI.company]).filter(v=>v&&v!=='—'))].sort();
  const housings  = [...new Set(rows.map(r=>r[REQ_CI.housing]).filter(v=>v&&v!=='—'))].sort();
  const authErr   = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));

  // ── column filter select builder ────────────────────────
  const mkCFSel = (id, opts, placeholder) =>
    `<select id="${id}" class="req-cf req-cf-sel">
       <option value="">${escH(placeholder || 'All')}</option>
       ${opts.map(v=>`<option value="${escH(v)}">${escH(v)}</option>`).join('')}
     </select>`;

  // ── table header/filter rows ─────────────────────────────
  const thSort = REQ_TABLE_COLS.map(col =>
    col.sortable
      ? `<th data-rcol="${col.ci}" class="sortable" style="cursor:pointer;user-select:none;${col.center?'text-align:center;':''}">
           ${col.label} <span class="req-sort-icon">⇅</span>
         </th>`
      : `<th>${col.label}</th>`
  ).join('') + '<th style="width:52px;"></th>';

  const colFilterMap = { 4: sponsors, 1: depts, 12: housings };
  const thFilter = REQ_TABLE_COLS.map(col => {
    const opts = colFilterMap[col.ci];
    return `<th>${
      opts
        ? mkCFSel(`reqCF_${col.ci}`, opts, 'All')
        : `<input class="req-cf req-col-f" data-rcol="${col.ci}" type="text" placeholder="—">`
    }</th>`;
  }).join('') + '<th></th>';

  return `
    <!-- ── Page header ───────────────────────────────────── -->
    <div class="req-page-header">
      <h1>Requisition</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Active J1 Program Job Openings</span>
    </div>

    ${errorMsg ? `
    <div class="req-error-banner">
      <span>${authErr ? '🔑' : '⚠️'}</span>
      <div>
        <strong>${authErr ? 'Not connected to Zoho' : 'Server error'}</strong>
        ${authErr
          ? ' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>'
          : ` — ${escH(errorMsg)}`}
      </div>
    </div>` : ''}

    ${rows.length > 0 ? `
    <!-- ── Global Filter Bar ─────────────────────────────── -->
    <div class="card req-filter-bar">
      <select id="reqDeptFilter" class="req-gsel">
        <option value="">All Departments</option>
        ${depts.map(d=>`<option value="${escH(d)}">${escH(d)}</option>`).join('')}
      </select>
      <select id="reqProgTypeFilter">
        <option value="">All Program Types</option>
        ${progTypes.map(p=>`<option value="${escH(p)}">${escH(p)}</option>`).join('')}
      </select>
      <select id="reqSponsorFilter">
        <option value="">All Sponsors</option>
        ${sponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="reqHousingFilter">
        <option value="">All Housing</option>
        ${housings.map(h=>`<option value="${escH(h)}">${escH(h)}</option>`).join('')}
      </select>
      <button id="reqClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="reqCount" class="req-count-badge">${rows.length} requisitions</span>
    </div>

    <!-- ── KPI Grid ──────────────────────────────────────── -->
    <div class="req-kpi-grid">
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Requisitions</span>
        <span class="req-kpi-value" style="color:#1B3A6B;" id="reqKpiCount">${rows.length}</span>
        <span class="req-kpi-sub">active J1 job openings</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Headcount</span>
        <span class="req-kpi-value" style="color:${C};" id="reqKpiSlots">${totalHeadcount.toLocaleString()}</span>
        <span class="req-kpi-sub">open positions</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Sponsors</span>
        <span class="req-kpi-value" style="color:#6B47DC;" id="reqKpiSponsors">${sponsors.length}</span>
        <span class="req-kpi-sub">sponsors</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Hosting Companies</span>
        <span class="req-kpi-value" id="reqKpiHosting">${hosting.length}</span>
        <span class="req-kpi-sub">hosting companies</span>
      </div>
    </div>

    <!-- ── Chart Row ─────────────────────────────────────── -->
    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Headcount by Sponsor</div>
        <div class="req-card-sub">Open positions per sponsor</div>
        <canvas id="reqSponsorChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">Opening by Department</div>
        <div class="req-card-sub">Total headcount per department</div>
        <canvas id="reqDeptChart"></canvas>
      </div>
    </div>

    <!-- ── Date Chart ─────────────────────────────────────── -->
    <div class="card req-date-card">
      <div class="req-card-title">Opening by Start Date &amp; Cumulative Projection</div>
      <div class="req-card-sub">Monthly headcount · bars = new openings · line = running total</div>
      <canvas id="reqDateChart"></canvas>
    </div>

    <!-- ── Table ──────────────────────────────────────────── -->
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
    </div>

    <!-- ── Executive Summary floating button ─────────────── -->
    <button class="exec-summary-btn" id="execSummaryBtn" title="Executive Summary — click to hear dashboard narration">🎙</button>

    ` : `
    <div class="card" style="text-align:center;padding:48px 24px;">
      <div style="font-size:40px;margin-bottom:12px;opacity:0.2;">📋</div>
      <div style="font-size:13px;font-weight:600;color:var(--text-muted);">No active requisition data available.</div>
    </div>`}`;
};

pageEvents.requisition = function () {
  const C    = DIVISION_COLORS.j1;
  const rows = state.dataCache['req-rows'] || [];
  const DL   = window.ChartDataLabels;
  if (!rows.length) return;

  const SP_COLORS = ['#1B3A6B','#B01A18','#059669','#B87A14','#6B47DC','#E05A2B','#0891B2','#7C3AED'];

  // ── prog type tags ─────────────────────────────────────────
  function progTags(val) {
    return (val||'').split(';').map(t=>t.trim()).filter(Boolean)
      .map(t=>`<span class="req-prog-tag">${escH(t)}</span>`).join('')
      || '<span style="color:var(--text-muted)">—</span>';
  }

  // ── table render ───────────────────────────────────────────
  let _currentRows = [...rows];

  function cellContent(r, col) {
    const v = r[col.ci] ?? '';
    if (col.tags)   return progTags(String(v));
    if (col.badge)  return `<span class="req-dept-badge">${escH(String(v)||'—')}</span>`;
    if (col.num)    return `<span class="req-slots-num" style="color:${C};">${v||'0'}</span>`;
    return escH(String(v)||'—');
  }

  function renderRows(subset) {
    if (!subset.length) return `<tr><td colspan="${REQ_TABLE_COLS.length+1}"
      style="text-align:center;padding:32px;color:var(--text-muted);">No matching records.</td></tr>`;
    return subset.map(r => {
      const idx = rows.indexOf(r);
      return `<tr>${REQ_TABLE_COLS.map(col =>
        `<td style="${col.center?'text-align:center;':''}">${cellContent(r,col)}</td>`
      ).join('')}
      <td style="text-align:center;">
        <button class="req-detail-btn" data-idx="${idx}">Details</button>
      </td></tr>`;
    }).join('');
  }

  function refreshKPIs() {
    const hc = _currentRows.reduce((t,r)=>t+(parseInt(r[REQ_CI.slots])||0),0);
    const sp = [...new Set(_currentRows.map(r=>r[REQ_CI.sponsor]).filter(v=>v&&v!=='—'))].length;
    const ht = [...new Set(_currentRows.map(r=>r[REQ_CI.company]).filter(v=>v&&v!=='—'))].length;
    const el = id => document.getElementById(id);
    if (el('reqKpiCount'))   el('reqKpiCount').textContent   = _currentRows.length;
    if (el('reqKpiSlots'))   el('reqKpiSlots').textContent   = hc.toLocaleString();
    if (el('reqKpiSponsors'))el('reqKpiSponsors').textContent= sp;
    if (el('reqKpiHosting')) el('reqKpiHosting').textContent = ht;
    if (el('reqCount'))      el('reqCount').textContent      = `${_currentRows.length} of ${rows.length} requisitions`;
  }

  function refreshTable() {
    const tbody = document.getElementById('reqTableBody');
    if (tbody) tbody.innerHTML = renderRows(_currentRows);
    refreshKPIs();
  }

  refreshTable();

  // ── column sort ────────────────────────────────────────────
  document.getElementById('reqSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-rcol]');
    if (!th) return;
    const col = parseInt(th.dataset.rcol);
    if (_reqSortCol === col) { _reqSortDir = _reqSortDir === 'asc' ? 'desc' : 'asc'; }
    else { _reqSortCol = col; _reqSortDir = col === 3 ? 'desc' : 'asc'; }
    // reset all icons
    document.querySelectorAll('#reqSortRow .req-sort-icon').forEach(el => {
      el.textContent = '⇅'; el.closest('th')?.classList.remove('req-sort-asc','req-sort-desc');
    });
    const icon = th.querySelector('.req-sort-icon');
    if (icon) {
      icon.textContent = _reqSortDir === 'asc' ? '↑' : '↓';
      th.classList.add(_reqSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc');
    }
    _currentRows = [..._currentRows].sort((a, b) => {
      let av = a[_reqSortCol]||'', bv = b[_reqSortCol]||'';
      if (_reqSortCol === 3) { av = parseInt(av)||0; bv = parseInt(bv)||0; }
      const cmp = typeof av === 'number' ? av-bv : String(av).localeCompare(String(bv));
      return _reqSortDir === 'asc' ? cmp : -cmp;
    });
    refreshTable();
  });

  // ── chart data builders ────────────────────────────────────
  function buildSponsorData(active) {
    const sm = {};
    active.forEach(r => { const s=r[REQ_CI.sponsor]||'?'; sm[s]=(sm[s]||0)+(parseInt(r[REQ_CI.slots])||0); });
    return Object.entries(sm).sort((a,b)=>b[1]-a[1]);
  }
  function buildDeptData(active) {
    const dm = {};
    active.forEach(r => { const d=r[REQ_CI.dept]||'?'; dm[d]=(dm[d]||0)+(parseInt(r[REQ_CI.slots])||0); });
    return Object.entries(dm).sort((a,b)=>b[1]-a[1]);
  }
  function buildDateData(active) {
    const mm = {};
    active.forEach(r => {
      const raw=r[REQ_CI.start]; if(!raw) return;
      const m=raw.substring(0,7);
      mm[m]=(mm[m]||0)+(parseInt(r[REQ_CI.slots])||0);
    });
    const sorted = Object.keys(mm).sort();
    const labels = sorted.map(m=>{ const [y,mo]=m.split('-'); return new Date(+y,+mo-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
    const vals   = sorted.map(m=>mm[m]);
    const cumul  = sorted.map((_,i)=>sorted.slice(0,i+1).reduce((t,k)=>t+(mm[k]||0),0));
    return { labels, vals, cumul };
  }

  // ── chart right-click: data popup ─────────────────────────
  function showChartPopup(chartId, title, e) {
    document.querySelectorAll('.req-ctx-popup').forEach(p=>p.remove());
    const chart = state.charts.get(chartId);
    if (!chart) return;
    const labels = chart.data.labels || [];
    const datasets = chart.data.datasets || [];
    const rowsHtml = labels.map((lbl,i) =>
      `<tr><td>${escH(String(lbl))}</td>${datasets.map(ds=>
        `<td style="text-align:right;font-weight:600;">${(ds.data[i]||0).toLocaleString()}</td>`
      ).join('')}</tr>`
    ).join('');
    const popup = document.createElement('div');
    popup.className = 'req-ctx-popup';
    popup.innerHTML = `
      <div class="req-ctx-popup-hdr">
        <span>${escH(title)}</span>
        <button class="req-ctx-popup-close">✕</button>
      </div>
      <table>
        <thead><tr>
          <th>Label</th>
          ${datasets.map(ds=>`<th style="text-align:right;">${escH(ds.label||'')}</th>`).join('')}
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    // Position near cursor, keep inside viewport
    popup.style.left = Math.min(e.clientX, window.innerWidth - 440) + 'px';
    popup.style.top  = Math.min(e.clientY, window.innerHeight - 380) + 'px';
    document.body.appendChild(popup);
    popup.querySelector('.req-ctx-popup-close').onclick = () => popup.remove();
    setTimeout(() => {
      const close = ev => { if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 100);
  }

  // ── chart refresh ──────────────────────────────────────────
  function refreshCharts(active) {
    const sc = state.charts.get('reqSponsorChart');
    if (sc) {
      const sp = buildSponsorData(active);
      sc.data.labels = sp.map(e=>e[0]);
      sc.data.datasets[0].data = sp.map(e=>e[1]);
      sc.data.datasets[0].backgroundColor = sp.map((_,i)=>SP_COLORS[i%SP_COLORS.length]);
      sc.update();
    }
    const dc2 = state.charts.get('reqDeptChart');
    if (dc2) {
      const dp = buildDeptData(active);
      dc2.data.labels = dp.map(e=>e[0]);
      dc2.data.datasets[0].data = dp.map(e=>e[1]);
      dc2.data.datasets[0].backgroundColor = dp.map((_,i)=>SP_COLORS[i%SP_COLORS.length]);
      dc2.update();
    }
    const dc = state.charts.get('reqDateChart');
    if (dc) {
      const { labels, vals, cumul } = buildDateData(active);
      dc.data.labels = labels;
      dc.data.datasets[0].data = vals;
      dc.data.datasets[1].data = cumul;
      dc.update();
    }
  }

  // ── unified filter ─────────────────────────────────────────
  function applyAllFilters() {
    const gDept    = document.getElementById('reqDeptFilter')?.value     || '';
    const gProg    = document.getElementById('reqProgTypeFilter')?.value || '';
    const gSponsor = document.getElementById('reqSponsorFilter')?.value  || '';
    const gHousing = document.getElementById('reqHousingFilter')?.value  || '';

    // column selects
    const cfDept    = document.getElementById(`reqCF_${REQ_CI.dept}`)?.value    || '';
    const cfSponsor = document.getElementById(`reqCF_${REQ_CI.sponsor}`)?.value || '';
    const cfHousing = document.getElementById(`reqCF_${REQ_CI.housing}`)?.value || '';

    // text column filters
    const colFilters = {};
    document.querySelectorAll('.req-col-f').forEach(el => {
      const v = el.value.trim();
      if (v) colFilters[parseInt(el.dataset.rcol)] = v.toLowerCase();
    });

    _currentRows = rows.filter(r => {
      if (gDept    && r[REQ_CI.dept]    !== gDept)    return false;
      if (gSponsor && r[REQ_CI.sponsor] !== gSponsor) return false;
      if (gHousing && r[REQ_CI.housing] !== gHousing) return false;
      if (gProg) {
        const tags = (r[REQ_CI.progType]||'').split(';').map(t=>t.trim());
        if (!tags.includes(gProg)) return false;
      }
      if (cfDept    && r[REQ_CI.dept]    !== cfDept)    return false;
      if (cfSponsor && r[REQ_CI.sponsor] !== cfSponsor) return false;
      if (cfHousing && r[REQ_CI.housing] !== cfHousing) return false;
      for (const [ci, fv] of Object.entries(colFilters)) {
        if (!String(r[ci]||'').toLowerCase().includes(fv)) return false;
      }
      return true;
    });

    if (_reqSortCol !== null) {
      _currentRows = [..._currentRows].sort((a,b) => {
        let av=a[_reqSortCol]||'', bv=b[_reqSortCol]||'';
        if (_reqSortCol===3) { av=parseInt(av)||0; bv=parseInt(bv)||0; }
        const cmp=typeof av==='number'?av-bv:String(av).localeCompare(String(bv));
        return _reqSortDir==='asc'?cmp:-cmp;
      });
    }
    refreshTable();
    refreshCharts(_currentRows);
  }

  ['reqDeptFilter','reqProgTypeFilter','reqSponsorFilter','reqHousingFilter'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', applyAllFilters));
  [`reqCF_${REQ_CI.dept}`,`reqCF_${REQ_CI.sponsor}`,`reqCF_${REQ_CI.housing}`].forEach(id =>
    document.getElementById(id)?.addEventListener('change', applyAllFilters));
  document.querySelectorAll('.req-col-f').forEach(el => el.addEventListener('input', applyAllFilters));

  document.getElementById('reqClearBtn')?.addEventListener('click', () => {
    ['reqDeptFilter','reqProgTypeFilter','reqSponsorFilter','reqHousingFilter',
     `reqCF_${REQ_CI.dept}`,`reqCF_${REQ_CI.sponsor}`,`reqCF_${REQ_CI.housing}`]
      .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelectorAll('.req-col-f').forEach(el=>el.value='');
    _reqSortCol=null; _reqSortDir='asc';
    document.querySelectorAll('#reqSortRow .req-sort-icon').forEach(el=>{ el.textContent='⇅'; });
    document.querySelectorAll('#reqSortRow th').forEach(th=>th.classList.remove('req-sort-asc','req-sort-desc'));
    _currentRows = [...rows];
    refreshTable();
    refreshCharts(_currentRows);
  });

  // ── details modal ──────────────────────────────────────────
  function openDetails(idx) {
    const r = rows[idx];
    if (!r) return;
    const fld = (label, val, full) => (val && val !== '—')
      ? `<div style="${full?'grid-column:1/-1;':''}margin-bottom:12px;">
           <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:2px;">${label}</div>
           <div style="font-size:11px;font-weight:500;">${escH(val)}</div>
         </div>` : '';
    document.getElementById('modalTitle').textContent = r[REQ_CI.company] || 'Requisition Details';
    document.getElementById('modalBody').innerHTML = `
      <div style="padding:4px 0 10px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${progTags(r[REQ_CI.progType])}
          <span class="req-dept-badge">${escH(r[REQ_CI.dept]||'')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;
          background:rgba(176,26,24,0.06);border-radius:10px;border:1px solid rgba(176,26,24,0.14);margin-bottom:14px;">
          <div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${C};">Headcount</div>
            <div style="font-size:34px;font-weight:800;color:${C};line-height:1.1;">${r[REQ_CI.slots]||'0'}</div>
          </div>
          <div style="border-left:1px solid rgba(176,26,24,0.18);padding-left:14px;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);">Position</div>
            <div style="font-size:13px;font-weight:700;margin-top:3px;">${escH(r[REQ_CI.position]||'—')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;">
          ${fld('Sponsor', r[REQ_CI.sponsor])}
          ${fld('Contract Length', r[REQ_CI.contract])}
          ${fld('Salary', r[REQ_CI.salary])}
          ${fld('Payment Frequency', r[REQ_CI.payFreq])}
          ${fld('Start Date', r[REQ_CI.start])}
          ${fld('Target Date', r[REQ_CI.target])}
          ${fld('City', r[REQ_CI.city])}
          ${fld('Housing', r[REQ_CI.housing])}
        </div>
      </div>`;
    document.getElementById('modalOverlay').classList.add('active');
  }

  document.getElementById('reqTableBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.req-detail-btn');
    if (btn) openDetails(parseInt(btn.dataset.idx));
  });
  document.getElementById('modalClose')?.addEventListener('click', () =>
    document.getElementById('modalOverlay')?.classList.remove('active'));
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay'))
      document.getElementById('modalOverlay')?.classList.remove('active');
  });

  // ── Chart 1: Headcount by Sponsor (doughnut) ──────────────
  const spData = buildSponsorData(rows);
  createChart('reqSponsorChart', {
    type: 'doughnut',
    plugins: DL ? [DL] : [],
    data: {
      labels: spData.map(e=>e[0]),
      datasets: [{ label:'Headcount',
        data: spData.map(e=>e[1]),
        backgroundColor: spData.map((_,i)=>SP_COLORS[i%SP_COLORS.length]),
        borderWidth: 2,
        borderColor: 'var(--bg-card,#fff)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      layout: { padding: 8 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font:{size:10}, padding:10, boxWidth:10, usePointStyle:true }
        },
        tooltip: { callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} openings`
        }},
        datalabels: DL ? {
          font: { size: 10, weight: '700' },
          color: '#fff',
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct = total > 0 ? Math.round(v/total*100) : 0;
            return pct >= 5 ? v.toLocaleString() : '';
          }
        } : false
      }
    }
  });

  // right-click → data popup
  document.getElementById('reqSponsorChart')?.addEventListener('contextmenu', e => {
    e.preventDefault(); showChartPopup('reqSponsorChart','Headcount by Sponsor',e);
  });

  // ── Chart 2: Opening by Department (vertical bar) ──────────
  const dpData = buildDeptData(rows);
  createChart('reqDeptChart', {
    type: 'bar',
    plugins: DL ? [DL] : [],
    data: {
      labels: dpData.map(e=>e[0]),
      datasets: [{ label:'Headcount',
        data: dpData.map(e=>e[1]),
        backgroundColor: dpData.map((_,i)=>SP_COLORS[i%SP_COLORS.length]),
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()} openings` }},
        datalabels: DL ? {
          anchor: 'end', align: 'top', offset: 2,
          font: { size: 10, weight: '700' },
          color: 'var(--text-primary,#1A1A1A)',
          formatter: v => v > 0 ? v.toLocaleString() : ''
        } : false
      },
      scales: {
        x: { grid:{display:false}, ticks:{font:{size:10}, maxRotation:45}, border:{display:false} },
        y: { grid:{display:false}, ticks:{display:false}, border:{display:false}, beginAtZero:true }
      }
    }
  });
  document.getElementById('reqDeptChart')?.addEventListener('contextmenu', e => {
    e.preventDefault(); showChartPopup('reqDeptChart','Opening by Department',e);
  });

  // ── Chart 3: Opening by Start Date + Cumulative ────────────
  const { labels: dtLabels, vals: dtVals, cumul: dtCumul } = buildDateData(rows);
  createChart('reqDateChart', {
    type: 'bar',
    plugins: DL ? [DL] : [],
    data: {
      labels: dtLabels,
      datasets: [
        { label: 'New Openings',
          type: 'bar',
          data: dtVals,
          backgroundColor: hexToRgba(C, 0.75),
          yAxisID: 'y',
          order: 2 },
        { label: 'Cumulative',
          type: 'line',
          data: dtCumul,
          borderColor: '#6B47DC',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          borderDash: [5,4],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#6B47DC',
          tension: 0.3,
          fill: false,
          yAxisID: 'y2',
          order: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position:'top', labels:{ font:{size:10}, usePointStyle:true, padding:14 } },
        tooltip: { mode:'index', intersect:false },
        datalabels: DL ? {
          display: ctx => ctx.datasetIndex===0 && (ctx.dataset.data[ctx.dataIndex]||0) > 0,
          anchor:'end', align:'top', offset:2,
          font:{ size:10, weight:'700' }, color:C,
          formatter: v => v > 0 ? v.toLocaleString() : ''
        } : false
      },
      scales: {
        x:  { grid:{display:false}, ticks:{font:{size:10}, maxRotation:45} },
        y:  { grid:{color:'rgba(0,0,0,0.04)'}, ticks:{display:false}, border:{display:false}, beginAtZero:true },
        y2: { position:'right', grid:{display:false}, ticks:{display:false}, border:{display:false}, beginAtZero:true }
      }
    }
  });
  document.getElementById('reqDateChart')?.addEventListener('contextmenu', e => {
    e.preventDefault(); showChartPopup('reqDateChart','Opening by Start Date',e);
  });

  // ── Executive Summary (Web Speech API) ────────────────────
  const execBtn = document.getElementById('execSummaryBtn');
  if (execBtn && window.speechSynthesis) {
    execBtn.addEventListener('click', () => {
      const synth = window.speechSynthesis;
      if (synth.speaking) { synth.cancel(); execBtn.classList.remove('speaking'); return; }
      const hc  = _currentRows.reduce((t,r)=>t+(parseInt(r[REQ_CI.slots])||0),0);
      const sp  = [...new Set(_currentRows.map(r=>r[REQ_CI.sponsor]).filter(v=>v&&v!=='—'))].length;
      const ht  = [...new Set(_currentRows.map(r=>r[REQ_CI.company]).filter(v=>v&&v!=='—'))].length;
      const top = buildDeptData(_currentRows).slice(0,3).map(e=>`${e[0]} with ${e[1]}`).join(', ');
      const text = `Requisition Dashboard Summary for CTI Group J1 Program. ` +
        `Currently showing ${_currentRows.length} active requisition${_currentRows.length!==1?'s':''}, ` +
        `with a total of ${hc} open positions across ${sp} sponsor${sp!==1?'s':''} ` +
        `and ${ht} hosting ${ht!==1?'companies':'company'}. ` +
        (top ? `Top departments by headcount are: ${top}. ` : '') +
        `Use the filters above to narrow by department, program type, sponsor, or housing availability.`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.92; utter.pitch = 1;
      utter.onstart = () => execBtn.classList.add('speaking');
      utter.onend   = () => execBtn.classList.remove('speaking');
      utter.onerror = () => execBtn.classList.remove('speaking');
      synth.speak(utter);
    });
  } else if (execBtn) {
    execBtn.title = 'Executive Summary (speech not supported in this browser)';
    execBtn.style.opacity = '0.5';
  }
};

// ============================
// PAGE: PARTICIPANT
// ============================
pages.participant = async function () {
  let recruitRows = [], crmRows = [], errorMsg = null;
  try {
    const [rRes, cRes] = await Promise.allSettled([
      safeJson('/api/recruit/j1-participants'),
      safeJson('/api/crm/j1-participants'),
    ]);
    if (rRes.status === 'fulfilled') recruitRows = rRes.value?.data || [];
    else errorMsg = rRes.reason?.message;
    if (cRes.status === 'fulfilled') crmRows = cRes.value?.data || [];
  } catch (e) { errorMsg = e.message; }

  // Normalize: ensure department field exists (now mapped directly on both sources)
  function normalizeRow(r) {
    return { ...r };
  }
  const PAR_ACTIVE_STATUSES = new Set(PAR_STATUSES);
  const rawRows = [
    ...recruitRows.map(normalizeRow),
    ...crmRows.map(normalizeRow),
  ].filter(r => PAR_ACTIVE_STATUSES.has(r.placementStatus));
  state.dataCache['par-rows'] = rawRows;
  _parActiveTab = 'All';

  // Status counts
  const statusCounts = {};
  PAR_STATUSES.forEach(s => { statusCounts[s] = 0; });
  rawRows.forEach(r => {
    const s = r.placementStatus || '';
    if (s in statusCounts) statusCounts[s]++;
  });
  const totalPlacement = (statusCounts['USA Onboard'] || 0) + (statusCounts['Program Completed'] || 0);

  // Filter dropdown options
  const sources   = [...new Set(rawRows.map(r=>r.programSource).filter(v=>v&&v!=='—'))].sort();
  const depts     = [...new Set(rawRows.map(r=>r.department).filter(v=>v&&v!=='—'))].sort();
  const countries = [...new Set(rawRows.map(r=>r.country).filter(v=>v&&v!=='—'))].sort();
  const sponsors  = [...new Set(rawRows.map(r=>r.processingSponsor).filter(v=>v&&v!=='—'))].sort();
  // Eligible Programs: multi-value field — collect all individual values
  const eligibleSet = new Set();
  rawRows.forEach(r => {
    if (r.eligiblePrograms && r.eligiblePrograms !== '—')
      r.eligiblePrograms.split(',').forEach(p => { const t = p.trim(); if (t) eligibleSet.add(t); });
  });
  const eligibleOpts = [...eligibleSet].sort();
  const authErr   = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED')||errorMsg.includes('401'));

  // Tab bar: All + each status + Total Placement
  const tabsHtml = ['All', ...PAR_STATUSES, 'Total Placement'].map(s => {
    const count = s === 'All' ? rawRows.length
                : s === 'Total Placement' ? totalPlacement
                : (statusCounts[s] || 0);
    const extra = s === 'Total Placement' ? ' par-tab-placement' : '';
    return `<button class="par-tab${s==='All'?' active':''}${extra}" data-status="${escH(s)}">${escH(s)}<span class="par-tab-count">${count}</span></button>`;
  }).join('');

  // Table sort header
  const thSort = PAR_TABLE_COLS.map(col =>
    col.sortable
      ? `<th data-pfield="${escH(col.field)}" class="sortable" style="cursor:pointer;user-select:none;${col.center?'text-align:center;':''}white-space:nowrap;">${col.label} <span class="req-sort-icon">⇅</span></th>`
      : `<th style="white-space:nowrap;">${col.label}</th>`
  ).join('') + '<th style="width:52px;"></th>';

  // Table column-level filters
  const cfDropdowns = {
    'placementStatus':   [...PAR_STATUSES],
    'programSource':     sources,
    'department':        depts,
    'country':           countries,
    'processingSponsor': sponsors,
    'eligiblePrograms':  eligibleOpts,
  };
  const thFilter = PAR_TABLE_COLS.map(col => {
    if (col.money || col.sourcebadge) return '<th></th>';
    if (col.datecol) return `<th style="min-width:170px;padding:2px 4px;">
      <div style="display:flex;gap:2px;align-items:center;">
        <select class="req-cf req-cf-date-cond" data-pfield="${escH(col.field)}"
          title="Before / On or Before / On / On or After / After"
          style="width:42px;flex-shrink:0;padding:1px 2px;font-size:12px;text-align:center;">
          <option value="">–</option>
          <option value="lt" title="Before">&lt;</option>
          <option value="lte" title="On or Before">≤</option>
          <option value="eq" title="On">=</option>
          <option value="gte" title="On or After">≥</option>
          <option value="gt" title="After">&gt;</option>
        </select>
        <input type="date" class="req-cf req-cf-date-val" data-pfield="${escH(col.field)}"
          style="flex:1;padding:1px 3px;font-size:11px;min-width:0;">
      </div>
    </th>`;
    const opts = cfDropdowns[col.field];
    return `<th>${opts
      ? `<select class="req-cf" data-pfield="${escH(col.field)}"><option value="">All</option>${opts.map(v=>`<option value="${escH(v)}">${escH(v)}</option>`).join('')}</select>`
      : `<input class="req-cf req-col-f" data-pfield="${escH(col.field)}" type="text" placeholder="—">`
    }</th>`;
  }).join('') + '<th></th>';

  return `
    <div class="req-page-header">
      <h1>Participant</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Recruit (${recruitRows.length}) + CRM (${crmRows.length}) · ${rawRows.length} total</span>
    </div>

    ${errorMsg ? `<div class="req-error-banner"><span>${authErr?'🔑':'⚠️'}</span>
      <div><strong>${authErr?'Not connected to Zoho':'Server error'}</strong>
      ${authErr?' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>':` — ${escH(errorMsg)}`}
      </div></div>` : ''}

    ${rawRows.length > 0 ? `
    <!-- Filter Bar -->
    <div class="card req-filter-bar">
      <select id="parStatusFilter" class="req-gsel">
        <option value="">All Statuses</option>
        ${PAR_STATUSES.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
        <option value="Total Placement">Total Placement</option>
      </select>
      <select id="parSourceFilter" class="req-gsel">
        <option value="">All J1 Sources</option>
        ${sources.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="parDeptFilter" class="req-gsel">
        <option value="">All Departments</option>
        ${depts.map(d=>`<option value="${escH(d)}">${escH(d)}</option>`).join('')}
      </select>
      <select id="parCountryFilter" class="req-gsel">
        <option value="">All Countries</option>
        ${countries.map(c=>`<option value="${escH(c)}">${escH(c)}</option>`).join('')}
      </select>
      <select id="parSponsorFilter" class="req-gsel">
        <option value="">All Sponsors</option>
        ${sponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <span class="par-date-label">Start</span>
      <select id="parStartDateCond" class="req-gsel" style="width:46px;padding:4px 2px;font-size:12px;text-align:center;" title="Before / On or Before / On / On or After / After">
        <option value="">–</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="eq">=</option><option value="gte">≥</option><option value="gt">&gt;</option>
      </select><input type="date" id="parStartDateFilter" class="req-gsel par-date-input">
      <span class="par-date-label">End</span>
      <select id="parEndDateCond" class="req-gsel" style="width:46px;padding:4px 2px;font-size:12px;text-align:center;" title="Before / On or Before / On / On or After / After">
        <option value="">–</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="eq">=</option><option value="gte">≥</option><option value="gt">&gt;</option>
      </select><input type="date" id="parEndDateFilter" class="req-gsel par-date-input">
      <button id="parClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="parCount" class="req-count-badge">${rawRows.length} participants</span>
    </div>

    <!-- Tab Bar -->
    <div class="par-tab-bar">${tabsHtml}</div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="parMainTable">
          <thead>
            <tr id="parSortRow">${thSort}</tr>
            <tr id="parColFilterRow">${thFilter}</tr>
          </thead>
          <tbody id="parTableBody"></tbody>
        </table>
      </div>
    </div>

    ` : `<div class="card" style="text-align:center;padding:48px 24px;">
      <div style="font-size:40px;margin-bottom:12px;opacity:0.2;">👥</div>
      <div style="font-size:13px;font-weight:600;color:var(--text-muted);">No participant data available.</div>
    </div>`}`;
};

pageEvents.participant = function () {
  const allRows = state.dataCache['par-rows'] || [];
  if (!allRows.length) return;

  function getTabRows() {
    if (_parActiveTab === 'All') return [...allRows];
    if (_parActiveTab === 'Total Placement') return allRows.filter(r => PAR_PLACEMENT_STATUSES.has(r.placementStatus));
    return allRows.filter(r => r.placementStatus === _parActiveTab);
  }

  function parseDateStr(str) {
    if (!str || str === '—') return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
    const p = str.split('/');
    if (p.length === 3) return new Date(+p[2], +p[0] - 1, +p[1]);
    return null;
  }

  function fmtDate(str) {
    if (!str || str === '—') return '—';
    const d = parseDateStr(str);
    if (!d || isNaN(d)) return str;
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  function statusBadge(status) {
    const color = PAR_STATUS_COLORS[status] || '#888';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${color}18;color:${color};border:1px solid ${color}40;white-space:nowrap;">${escH(status||'—')}</span>`;
  }

  function sourceBadge(src) {
    const isR = src === 'recruit';
    const color = isR ? '#1B3A6B' : '#7C3AED';
    const label = isR ? 'Recruit' : 'CRM';
    return `<span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;background:${color}15;color:${color};border:1px solid ${color}30;white-space:nowrap;">${label}</span>`;
  }

  function cellContent(r, col) {
    const v = r[col.field];
    const str = (v === null || v === undefined || v === '') ? '—' : String(v);
    if (col.statusbadge) return statusBadge(str);
    if (col.sourcebadge) return sourceBadge(str);
    if (col.badge)   return str === '—' ? str : `<span class="req-dept-badge">${escH(str)}</span>`;
    if (col.datecol) return escH(fmtDate(str === '—' ? '' : str));
    return escH(str);
  }

  function renderRows(subset) {
    if (!subset.length) return `<tr><td colspan="${PAR_TABLE_COLS.length+1}" style="text-align:center;padding:32px;color:var(--text-muted);">No matching records.</td></tr>`;
    return subset.map(r => `<tr>${PAR_TABLE_COLS.map(col =>
      `<td style="${col.center?'text-align:center;':''}">${cellContent(r, col)}</td>`
    ).join('')}<td style="text-align:center;"><button class="req-detail-btn" data-pidx="${allRows.indexOf(r)}">Details</button></td></tr>`
    ).join('');
  }

  function refreshCount(rows) {
    const el = document.getElementById('parCount');
    if (!el) return;
    const total = allRows.length;
    el.textContent = rows.length === total
      ? `${total} participants`
      : `${rows.length} of ${total} participants`;
  }

  // Recount tab badges based on current non-status global filters
  function refreshTabCounts() {
    const gSrc  = document.getElementById('parSourceFilter')?.value   || '';
    const gDpt  = document.getElementById('parDeptFilter')?.value     || '';
    const gCtry = document.getElementById('parCountryFilter')?.value  || '';
    const gSp   = document.getElementById('parSponsorFilter')?.value  || '';
    const gsD     = document.getElementById('parStartDateFilter')?.value  || '';
    const gsDCond = document.getElementById('parStartDateCond')?.value    || '';
    const geD     = document.getElementById('parEndDateFilter')?.value    || '';
    const geDCond = document.getElementById('parEndDateCond')?.value      || '';
    const colF  = {};
    document.querySelectorAll('#parColFilterRow .req-cf').forEach(el => {
      if (el.classList.contains('req-cf-date-cond') || el.classList.contains('req-cf-date-val')) return;
      const v = el.value.trim();
      if (v && el.dataset.pfield !== 'placementStatus') colF[el.dataset.pfield] = v.toLowerCase();
    });

    const dateColF = readDateColFilters('parColFilterRow');
    const base = allRows.filter(r => {
      if (gSrc  && r.programSource     !== gSrc)  return false;
      if (gDpt  && r.department        !== gDpt)  return false;
      if (gCtry && r.country           !== gCtry) return false;
      if (gSp   && r.processingSponsor !== gSp)   return false;
      if (gsD && gsDCond && !applyDateColFilter(r, 'programStart', gsDCond, gsD)) return false;
      if (geD && geDCond && !applyDateColFilter(r, 'programEnd',   geDCond, geD)) return false;
      for (const [field, fv] of Object.entries(colF)) {
        if (field === 'eligiblePrograms') {
          const progs = (r.eligiblePrograms || '').split(',').map(s => s.trim().toLowerCase());
          if (!progs.includes(fv)) return false;
        } else {
          if (!String(r[field] || '').toLowerCase().includes(fv)) return false;
        }
      }
      for (const [field, { cond, val }] of Object.entries(dateColF)) {
        if (!applyDateColFilter(r, field, cond, val)) return false;
      }
      return true;
    });

    const counts = {};
    PAR_STATUSES.forEach(s => { counts[s] = 0; });
    base.forEach(r => { const s = r.placementStatus || ''; if (s in counts) counts[s]++; });
    const totalPlacement = (counts['USA Onboard'] || 0) + (counts['Program Completed'] || 0);

    document.querySelectorAll('.par-tab').forEach(btn => {
      const s  = btn.dataset.status;
      const el = btn.querySelector('.par-tab-count');
      if (!el) return;
      if (s === 'All')             el.textContent = base.length;
      else if (s === 'Total Placement') el.textContent = totalPlacement;
      else                         el.textContent = counts[s] ?? 0;
    });
  }

  function readDateColFilters(rowId) {
    const out = {};
    document.querySelectorAll(`#${rowId} .req-cf-date-val`).forEach(input => {
      const val = input.value; if (!val) return;
      const field  = input.dataset.pfield;
      const condEl = document.querySelector(`#${rowId} .req-cf-date-cond[data-pfield="${field}"]`);
      const cond   = condEl?.value; if (!cond) return; // condition must be chosen
      out[field] = { cond, val };
    });
    return out;
  }

  function applyDateColFilter(r, field, cond, val) {
    const fd = new Date(val + 'T00:00:00');
    const rd = parseDateStr(String(r[field] || ''));
    if (!rd) return false;
    if (cond === 'lt')  return rd <  fd;
    if (cond === 'lte') return rd <= fd;
    if (cond === 'eq')  return rd.toISOString().slice(0,10) === val;
    if (cond === 'gte') return rd >= fd;
    if (cond === 'gt')  return rd >  fd;
    return true;
  }

  function applyFilters(base) {
    const gSt  = document.getElementById('parStatusFilter')?.value  || '';
    const gSrc = document.getElementById('parSourceFilter')?.value  || '';
    const gDpt = document.getElementById('parDeptFilter')?.value    || '';
    const gCtry= document.getElementById('parCountryFilter')?.value || '';
    const gSp  = document.getElementById('parSponsorFilter')?.value || '';
    const gsD     = document.getElementById('parStartDateFilter')?.value  || '';
    const gsDCond = document.getElementById('parStartDateCond')?.value    || '';
    const geD     = document.getElementById('parEndDateFilter')?.value    || '';
    const geDCond = document.getElementById('parEndDateCond')?.value      || '';
    const colF = {};
    document.querySelectorAll('#parColFilterRow .req-cf').forEach(el => {
      if (el.classList.contains('req-cf-date-cond') || el.classList.contains('req-cf-date-val')) return;
      const v = el.value.trim(); if (v) colF[el.dataset.pfield] = v.toLowerCase();
    });
    const dateColF = readDateColFilters('parColFilterRow');
    return base.filter(r => {
      if (gSt) {
        if (gSt === 'Total Placement') { if (!PAR_PLACEMENT_STATUSES.has(r.placementStatus)) return false; }
        else if (r.placementStatus !== gSt) return false;
      }
      if (gSrc  && r.programSource     !== gSrc)  return false;
      if (gDpt  && r.department        !== gDpt)  return false;
      if (gCtry && r.country           !== gCtry) return false;
      if (gSp   && r.processingSponsor !== gSp)   return false;
      if (gsD && gsDCond && !applyDateColFilter(r, 'programStart', gsDCond, gsD)) return false;
      if (geD && geDCond && !applyDateColFilter(r, 'programEnd',   geDCond, geD)) return false;
      for (const [field, fv] of Object.entries(colF)) {
        if (field === 'eligiblePrograms') {
          // Multi-value: check if selected program appears in comma-split list
          const progs = (r.eligiblePrograms || '').split(',').map(s => s.trim().toLowerCase());
          if (!progs.includes(fv)) return false;
        } else {
          if (!String(r[field] || '').toLowerCase().includes(fv)) return false;
        }
      }
      for (const [field, { cond, val }] of Object.entries(dateColF)) {
        if (!applyDateColFilter(r, field, cond, val)) return false;
      }
      return true;
    });
  }

  function doSort(rows) {
    if (!_parSortCol) return rows;
    return [...rows].sort((a, b) => {
      let av = a[_parSortCol] ?? '', bv = b[_parSortCol] ?? '';
      if (_parSortCol === 'age') {
        av = parseFloat(av) || 0; bv = parseFloat(bv) || 0;
      } else if (_parSortCol === 'programStart' || _parSortCol === 'programEnd') {
        const da = parseDateStr(String(av)), db = parseDateStr(String(bv));
        av = da ? da.getTime() : 0; bv = db ? db.getTime() : 0;
      }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return _parSortDir === 'asc' ? cmp : -cmp;
    });
  }

  function setActiveTab(status) {
    _parActiveTab = status || 'All';
    document.querySelectorAll('.par-tab').forEach(t => t.classList.toggle('active', t.dataset.status === _parActiveTab));
    const dd = document.getElementById('parStatusFilter');
    if (dd) dd.value = _parActiveTab === 'All' ? '' : _parActiveTab;
  }

  let _currentRows = [...allRows];

  function refresh() {
    _currentRows = doSort(applyFilters(getTabRows()));
    const tbody = document.getElementById('parTableBody');
    if (tbody) tbody.innerHTML = renderRows(_currentRows);
    refreshCount(_currentRows);
    refreshTabCounts();
  }

  refresh();

  // KPI card clicks → filter by status
  document.querySelector('.par-kpi-grid')?.addEventListener('click', e => {
    const card = e.target.closest('.par-kpi-card[data-tab]');
    if (!card) return;
    setActiveTab(card.dataset.tab);
    refresh();
  });

  // Tab clicks
  document.querySelector('.par-tab-bar')?.addEventListener('click', e => {
    const btn = e.target.closest('.par-tab'); if (!btn) return;
    setActiveTab(btn.dataset.status);
    refresh();
  });

  // Status dropdown syncs with tabs
  document.getElementById('parStatusFilter')?.addEventListener('change', e => {
    setActiveTab(e.target.value || 'All');
    refresh();
  });

  // Column sort (data-pfield attribute)
  document.getElementById('parSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-pfield]'); if (!th) return;
    const field = th.dataset.pfield;
    if (_parSortCol === field) _parSortDir = _parSortDir === 'asc' ? 'desc' : 'asc';
    else { _parSortCol = field; _parSortDir = 'asc'; }
    document.querySelectorAll('#parSortRow .req-sort-icon').forEach(el => {
      el.textContent = '⇅'; el.closest('th')?.classList.remove('req-sort-asc','req-sort-desc');
    });
    const icon = th.querySelector('.req-sort-icon');
    if (icon) { icon.textContent = _parSortDir === 'asc' ? '↑' : '↓'; th.classList.add(_parSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc'); }
    refresh();
  });

  // Other global filters
  ['parSourceFilter','parDeptFilter','parCountryFilter','parSponsorFilter',
   'parStartDateCond','parStartDateFilter','parEndDateCond','parEndDateFilter']
    .forEach(id => document.getElementById(id)?.addEventListener('change', refresh));

  // Column-level filters (text, dropdowns, date condition+value)
  document.querySelectorAll('#parColFilterRow .req-cf').forEach(el =>
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', refresh));

  // Clear all
  document.getElementById('parClearBtn')?.addEventListener('click', () => {
    ['parStatusFilter','parSourceFilter','parDeptFilter','parCountryFilter',
     'parSponsorFilter','parStartDateCond','parStartDateFilter','parEndDateCond','parEndDateFilter']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.querySelectorAll('#parColFilterRow .req-cf').forEach(el => el.value = '');
    _parSortCol = null; _parSortDir = 'asc';
    setActiveTab('All');
    document.querySelectorAll('#parSortRow .req-sort-icon').forEach(el => el.textContent = '⇅');
    document.querySelectorAll('#parSortRow th').forEach(th => th.classList.remove('req-sort-asc','req-sort-desc'));
    refresh();
  });
  // Also clear date column filters when condition resets to blank
  document.querySelectorAll('#parColFilterRow .req-cf-date-cond').forEach(sel => {
    sel.addEventListener('change', () => {
      if (!sel.value) {
        const valInput = document.querySelector(`#parColFilterRow .req-cf-date-val[data-pfield="${sel.dataset.pfield}"]`);
        if (valInput) valInput.value = '';
      }
      refresh();
    });
  });

  // Details modal
  document.getElementById('parTableBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.req-detail-btn'); if (!btn) return;
    const r = allRows[parseInt(btn.dataset.pidx)]; if (!r) return;
    const fld = (label, val, full) => (val && val !== '—') ? `
      <div style="${full?'grid-column:1/-1;':''}margin-bottom:12px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-size:11px;font-weight:500;">${escH(String(val))}</div>
      </div>` : '';
    const status = r.placementStatus || '—';
    const sColor = PAR_STATUS_COLORS[status] || '#888';
    const srcLabel = r._source === 'crm' ? 'CRM' : 'Recruit';
    document.getElementById('modalTitle').textContent = (`${r.firstName||''} ${r.lastName||''}`).trim() || r.name || '—';
    document.getElementById('modalBody').innerHTML = `
      <div style="padding:4px 0 10px;">
        <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;
          background:${sColor}0d;border-radius:10px;border:1px solid ${sColor}28;margin-bottom:14px;">
          <div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${sColor};">Status</div>
            <div style="margin-top:4px;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;background:${sColor}18;color:${sColor};border:1px solid ${sColor}40;">${escH(status)}</div>
          </div>
          <div style="border-left:1px solid ${sColor}30;padding-left:14px;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);">App Source</div>
            <div style="font-size:12px;font-weight:700;margin-top:3px;">${escH(srcLabel)}</div>
          </div>
          ${r.age && r.age !== '—' ? `<div style="border-left:1px solid ${sColor}30;padding-left:14px;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);">Age</div>
            <div style="font-size:20px;font-weight:800;margin-top:2px;color:var(--text-primary);">${escH(String(r.age))}</div>
          </div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;">
          ${fld('Email', r.email, true)}
          ${fld('First Name', r.firstName)}
          ${fld('Last Name', r.lastName)}
          ${fld('Gender', r.gender)}
          ${fld('Country', r.country)}
          ${fld('J1 Program Source', r.programSource)}
          ${fld('Processing Sponsor', r.processingSponsor)}
          ${fld('Hosting Company', r.hostCompany)}
          ${fld('Department', r.department)}
          ${fld('Eligible Programs', r.eligiblePrograms, true)}
          ${fld('Program Start', r.programStart ? fmtDate(r.programStart) : '')}
          ${fld('Program End', r.programEnd ? fmtDate(r.programEnd) : '')}
          ${fld('Program Type', r.programType)}
          ${fld('Phone', r.phone)}
        </div>
      </div>`;
    document.getElementById('modalOverlay').classList.add('active');
  });
  document.getElementById('modalClose')?.addEventListener('click', () =>
    document.getElementById('modalOverlay')?.classList.remove('active'));
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay'))
      document.getElementById('modalOverlay')?.classList.remove('active');
  });
};

// ============================
// PAGE: TALENT POOL
// ============================
pages.talentpool = async function () {
  let recruitRows = [], crmRows = [], reqRows = [], errorMsg = null;
  try {
    const [rRes, cRes, qRes] = await Promise.allSettled([
      safeJson('/api/recruit/j1-participants'),
      safeJson('/api/crm/j1-participants'),
      safeJson('/api/zoho/j1-requisition'),
    ]);
    if (rRes.status === 'fulfilled') recruitRows = rRes.value?.data || [];
    else errorMsg = rRes.reason?.message;
    if (cRes.status === 'fulfilled') crmRows = cRes.value?.data || [];
    if (qRes.status === 'fulfilled') reqRows = qRes.value?.data?.rows || [];
  } catch (e) { errorMsg = e.message; }

  // Filter to talent pool statuses only
  const tpSet = new Set(TP_STATUSES);
  const allPool = [
    ...recruitRows.filter(r => tpSet.has(r.placementStatus)),
    ...crmRows.filter(r => tpSet.has(r.placementStatus)),
  ];
  state.dataCache['tp-rows']    = allPool;
  state.dataCache['tp-req-rows']= reqRows;

  // KPI — openings from active requisitions only
  const activeReq    = reqRows.filter(r => r[REQ_CI.status] === 'Active');
  const totalOpenings= activeReq.reduce((s,r) => s + (parseInt(r[REQ_CI.slots])||0), 0);
  const totalPool    = allPool.length;
  const totalRemain  = Math.max(0, totalOpenings - totalPool);
  const totalSalesCall = allPool.filter(r => r.placementStatus === 'Sales Call').length;
  const authErr = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED')||errorMsg.includes('401'));

  // Filter dropdown options
  const sources   = [...new Set(allPool.map(r=>r.programSource).filter(v=>v&&v!=='—'))].sort();
  const depts     = [...new Set(allPool.map(r=>r.department).filter(v=>v&&v!=='—'))].sort();
  const countries = [...new Set(allPool.map(r=>r.country).filter(v=>v&&v!=='—'))].sort();
  const eligibleSet2 = new Set();
  allPool.forEach(r => {
    if (r.eligiblePrograms && r.eligiblePrograms !== '—')
      r.eligiblePrograms.split(',').forEach(p => { const t = p.trim(); if (t) eligibleSet2.add(t); });
  });
  const eligibleOpts2 = [...eligibleSet2].sort();

  // Table sort header
  const thSort = TP_TABLE_COLS.map(col =>
    col.sortable
      ? `<th data-tpfield="${escH(col.field)}" class="sortable" style="cursor:pointer;user-select:none;white-space:nowrap;">${col.label} <span class="req-sort-icon">⇅</span></th>`
      : `<th style="white-space:nowrap;">${col.label}</th>`
  ).join('') + '<th style="width:52px;"></th>';

  // Column-level filters
  const cfDropdowns = {
    'placementStatus':  [...TP_STATUSES],
    'programSource':    sources,
    'department':       depts,
    'country':          countries,
    'eligiblePrograms': eligibleOpts2,
  };
  const thFilter = TP_TABLE_COLS.map(col => {
    const opts = cfDropdowns[col.field];
    return `<th>${opts
      ? `<select class="req-cf" data-tpfield="${escH(col.field)}"><option value="">All</option>${opts.map(v=>`<option value="${escH(v)}">${escH(v)}</option>`).join('')}</select>`
      : `<input class="req-cf req-col-f" data-tpfield="${escH(col.field)}" type="text" placeholder="—">`
    }</th>`;
  }).join('') + '<th></th>';

  return `
    <div class="req-page-header">
      <h1>Talent Pool</h1>
      <span class="req-live-badge">● Live · Zoho Recruit + CRM</span>
      <span class="req-page-sub">Recruit (${recruitRows.filter(r=>tpSet.has(r.placementStatus)).length}) + CRM (${crmRows.filter(r=>tpSet.has(r.placementStatus)).length}) · Pre-placement candidates</span>
    </div>

    ${errorMsg ? `<div class="req-error-banner"><span>${authErr?'🔑':'⚠️'}</span>
      <div><strong>${authErr?'Not connected to Zoho':'Server error'}</strong>
      ${authErr?' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>':` — ${escH(errorMsg)}`}
      </div></div>` : ''}

    <!-- Filter Bar (sticky) — very top -->
    <div class="card req-filter-bar">
      <select id="tpStatusFilter" class="req-gsel">
        <option value="">All Statuses</option>
        ${TP_STATUSES.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="tpSourceFilter" class="req-gsel">
        <option value="">All J1 Sources</option>
        ${sources.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="tpDeptFilter" class="req-gsel">
        <option value="">All Departments</option>
        ${depts.map(d=>`<option value="${escH(d)}">${escH(d)}</option>`).join('')}
      </select>
      <select id="tpCountryFilter" class="req-gsel">
        <option value="">All Countries</option>
        ${countries.map(c=>`<option value="${escH(c)}">${escH(c)}</option>`).join('')}
      </select>
      <select id="tpEligibleFilter" class="req-gsel">
        <option value="">All Eligible Programs</option>
        ${eligibleOpts2.map(p=>`<option value="${escH(p)}">${escH(p)}</option>`).join('')}
      </select>
      <button id="tpClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="tpCount" class="req-count-badge">${allPool.length} candidates</span>
    </div>

    <!-- KPIs (4 widgets) -->
    <div class="req-kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total Openings</span>
        <span class="req-kpi-value" style="color:#1B3A6B;">${totalOpenings.toLocaleString()}</span>
        <span class="req-kpi-sub">active requisitions</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Talent Pool</span>
        <span class="req-kpi-value" style="color:#0891B2;" id="tpKpiPool">${totalPool.toLocaleString()}</span>
        <span class="req-kpi-sub">pre-placement candidates</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Remaining</span>
        <span class="req-kpi-value" style="color:${totalRemain > 0 ? '#D97706' : '#2D7A55'};" id="tpKpiRemain">${totalRemain.toLocaleString()}</span>
        <span class="req-kpi-sub">openings still unfilled</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Sales Call</span>
        <span class="req-kpi-value" style="color:#7C3AED;" id="tpKpiSalesCall">${totalSalesCall.toLocaleString()}</span>
        <span class="req-kpi-sub">ready for employer review</span>
      </div>
    </div>

    <!-- Charts row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card req-chart-card">
        <div class="req-chart-title">Talent Pool vs Remaining by Department <span style="font-size:10px;font-weight:400;color:var(--text-muted);margin-left:6px;">right-click for data</span></div>
        <canvas id="tpDeptChart" style="height:340px;max-height:340px;"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-chart-title">Sales Call by Department <span style="font-size:10px;font-weight:400;color:var(--text-muted);margin-left:6px;">right-click for data</span></div>
        <canvas id="tpSalesCallChart" style="height:340px;max-height:340px;"></canvas>
      </div>
    </div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="tpMainTable">
          <thead>
            <tr id="tpSortRow">${thSort}</tr>
            <tr id="tpColFilterRow">${thFilter}</tr>
          </thead>
          <tbody id="tpTableBody"></tbody>
        </table>
      </div>
    </div>`;
};

pageEvents.talentpool = function () {
  const allPool  = state.dataCache['tp-rows']     || [];
  const reqRows  = state.dataCache['tp-req-rows'] || [];
  if (!allPool.length) return;

  // ── Helpers ───────────────────────────────────────────
  function statusBadge(status) {
    const color = PAR_STATUS_COLORS[status] || '#888';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${color}18;color:${color};border:1px solid ${color}40;white-space:nowrap;">${escH(status||'—')}</span>`;
  }
  function sourceBadge(src) {
    const isRecruit = src === 'recruit';
    const bg = isRecruit ? '#1B3A6B' : '#7C3AED';
    const label = isRecruit ? 'Recruit' : 'CRM';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${bg}18;color:${bg};border:1px solid ${bg}40;white-space:nowrap;">${label}</span>`;
  }
  function cellContent(r, col) {
    const v   = r[col.field];
    const str = (v === null || v === undefined || v === '') ? '—' : String(v);
    if (col.statusbadge) return statusBadge(str);
    if (col.sourcebadge) return sourceBadge(str);
    if (col.badge) return str === '—' ? str : `<span class="req-dept-badge">${escH(str)}</span>`;
    return escH(str);
  }
  function applyFilters(base) {
    const gSt  = document.getElementById('tpStatusFilter')?.value  || '';
    const gSrc = document.getElementById('tpSourceFilter')?.value  || '';
    const gDpt = document.getElementById('tpDeptFilter')?.value    || '';
    const gCtry= document.getElementById('tpCountryFilter')?.value || '';
    const gEp  = document.getElementById('tpEligibleFilter')?.value || '';
    const colF = {};
    document.querySelectorAll('#tpColFilterRow .req-cf').forEach(el => {
      const v = el.value.trim(); if (v) colF[el.dataset.tpfield] = v.toLowerCase();
    });
    return base.filter(r => {
      if (gSt   && r.placementStatus !== gSt)   return false;
      if (gSrc  && r.programSource   !== gSrc)  return false;
      if (gDpt  && r.department      !== gDpt)  return false;
      if (gCtry && r.country         !== gCtry) return false;
      if (gEp) {
        const progs = (r.eligiblePrograms || '').split(',').map(s => s.trim());
        if (!progs.includes(gEp)) return false;
      }
      for (const [f, fv] of Object.entries(colF)) {
        if (f === 'eligiblePrograms') {
          const progs = (r.eligiblePrograms || '').split(',').map(s => s.trim().toLowerCase());
          if (!progs.includes(fv)) return false;
        } else {
          if (!String(r[f]||'').toLowerCase().includes(fv)) return false;
        }
      }
      return true;
    });
  }
  function doSort(rows) {
    if (!_tpSortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = String(a[_tpSortCol]||''), bv = String(b[_tpSortCol]||'');
      const cmp = av.localeCompare(bv);
      return _tpSortDir === 'asc' ? cmp : -cmp;
    });
  }
  function renderRows(subset) {
    if (!subset.length) return `<tr><td colspan="${TP_TABLE_COLS.length+1}" style="text-align:center;padding:32px;color:var(--text-muted);">No matching records.</td></tr>`;
    return subset.map(r => `<tr>${TP_TABLE_COLS.map(col =>
      `<td>${cellContent(r, col)}</td>`
    ).join('')}<td></td></tr>`).join('');
  }
  function refreshCount(rows) {
    const el = document.getElementById('tpCount');
    if (el) el.textContent = `${rows.length} of ${allPool.length} candidates`;
  }
  let _currentRows = [...allPool];
  function refresh() {
    _currentRows = doSort(applyFilters([...allPool]));
    const tbody = document.getElementById('tpTableBody');
    if (tbody) tbody.innerHTML = renderRows(_currentRows);
    refreshCount(_currentRows);
    updateCharts(_currentRows);
  }

  // ── Charts ────────────────────────────────────────────
  let _tpDeptChart = null;
  let _tpSalesCallChart = null;

  function buildChartData(rows) {
    // Chart 1 — Talent Pool vs Remaining stacked bar
    const deptPool = {}, deptOpen = {};
    rows.forEach(r => {
      const d = r.department || '—';
      if (d !== '—') deptPool[d] = (deptPool[d]||0) + 1;
    });
    reqRows.filter(r => r[REQ_CI.status] === 'Active').forEach(r => {
      const d = r[REQ_CI.dept] || '—';
      if (d !== '—') deptOpen[d] = (deptOpen[d]||0) + (parseInt(r[REQ_CI.slots])||0);
    });
    const allDepts   = Object.keys(deptPool).filter(d => d !== '—')
      .sort((a,b) => (deptPool[b]||0) - (deptPool[a]||0)).slice(0, 12);
    const poolData   = allDepts.map(d => deptPool[d]  || 0);
    const remainData = allDepts.map(d => Math.max(0, (deptOpen[d]||0) - (deptPool[d]||0)));

    // Chart 2 — Sales Call by Department
    const scDept = {};
    rows.filter(r => r.placementStatus === 'Sales Call').forEach(r => {
      const d = r.department || '—';
      if (d !== '—') scDept[d] = (scDept[d]||0) + 1;
    });
    const scDepts = Object.keys(scDept).sort((a,b) => scDept[b] - scDept[a]);
    const scData  = scDepts.map(d => scDept[d]);

    return { allDepts, poolData, remainData, scDepts, scData };
  }

  // Right-click popup — shows the full data table for any chart instance
  function showTpChartPopup(chart, title, e) {
    document.querySelectorAll('.req-ctx-popup').forEach(p => p.remove());
    if (!chart) return;
    const labels   = chart.data.labels   || [];
    const datasets = chart.data.datasets || [];
    const rowsHtml = labels.map((lbl, i) =>
      `<tr><td>${escH(String(lbl))}</td>${datasets.map(ds =>
        `<td style="text-align:right;font-weight:600;">${(ds.data[i] || 0).toLocaleString()}</td>`
      ).join('')}</tr>`
    ).join('');
    const popup = document.createElement('div');
    popup.className = 'req-ctx-popup';
    popup.innerHTML = `
      <div class="req-ctx-popup-hdr">
        <span>${escH(title)}</span>
        <button class="req-ctx-popup-close">✕</button>
      </div>
      <table>
        <thead><tr>
          <th>Department</th>
          ${datasets.map(ds => `<th style="text-align:right;">${escH(ds.label || '')}</th>`).join('')}
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    popup.style.left = Math.min(e.clientX, window.innerWidth  - 440) + 'px';
    popup.style.top  = Math.min(e.clientY, window.innerHeight - 380) + 'px';
    document.body.appendChild(popup);
    popup.querySelector('.req-ctx-popup-close').onclick = () => popup.remove();
    setTimeout(() => {
      const close = ev => { if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 100);
  }

  function initCharts(rows) {
    const { allDepts, poolData, remainData, scDepts, scData } = buildChartData(rows);
    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? '#888' : '#666';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const font      = { family: 'Inter, sans-serif', size: 11 };

    // Chart 1 — Talent Pool vs Remaining horizontal stacked bar
    const deptCtx = document.getElementById('tpDeptChart');
    if (deptCtx) {
      if (_tpDeptChart) _tpDeptChart.destroy();
      _tpDeptChart = new Chart(deptCtx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
          labels: allDepts,
          datasets: [
            { label: 'Talent Pool', data: poolData,   backgroundColor: '#1B3A6B',              stack: 'a' },
            { label: 'Remaining',   data: remainData, backgroundColor: 'rgba(27,58,107,0.22)', stack: 'a' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font, boxWidth: 12, padding: 14 } },
            datalabels: {
              color: ctx => ctx.datasetIndex === 0 ? '#fff' : '#1B3A6B',
              font: { size: 10, weight: '700' },
              formatter: v => v > 0 ? v : '',
              anchor: 'center', align: 'center',
            },
          },
          scales: {
            y: { stacked: true, ticks: { color: tickColor, font }, grid: { display: false } },
            x: { stacked: true, ticks: { display: false }, border: { display: false }, grid: { color: gridColor } },
          },
          datasets: { bar: { minBarLength: 4, barPercentage: 0.7, categoryPercentage: 0.8 } },
        },
      });
    }

    // Chart 2 — Sales Call by Department horizontal bar
    const scCtx = document.getElementById('tpSalesCallChart');
    if (scCtx) {
      if (_tpSalesCallChart) _tpSalesCallChart.destroy();
      _tpSalesCallChart = new Chart(scCtx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
          labels: scDepts,
          datasets: [
            { label: 'Sales Call', data: scData, backgroundColor: '#7C3AED' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: {
              color: '#fff',
              font: { size: 10, weight: '700' },
              formatter: v => v > 0 ? v : '',
              anchor: 'center', align: 'center',
            },
          },
          scales: {
            y: { ticks: { color: tickColor, font }, grid: { display: false } },
            x: { ticks: { display: false }, border: { display: false }, grid: { color: gridColor } },
          },
          datasets: { bar: { minBarLength: 4, barPercentage: 0.7, categoryPercentage: 0.8 } },
        },
      });
    }
  }

  function updateCharts(rows) {
    const { allDepts, poolData, remainData, scDepts, scData } = buildChartData(rows);
    if (_tpDeptChart) {
      _tpDeptChart.data.labels           = allDepts;
      _tpDeptChart.data.datasets[0].data = poolData;
      _tpDeptChart.data.datasets[1].data = remainData;
      _tpDeptChart.update();
    }
    if (_tpSalesCallChart) {
      _tpSalesCallChart.data.labels           = scDepts;
      _tpSalesCallChart.data.datasets[0].data = scData;
      _tpSalesCallChart.update();
    }
  }

  initCharts(allPool);
  refresh();

  // Right-click → data popup
  document.getElementById('tpDeptChart')?.addEventListener('contextmenu', e => {
    e.preventDefault(); showTpChartPopup(_tpDeptChart, 'Talent Pool vs Remaining by Department', e);
  });
  document.getElementById('tpSalesCallChart')?.addEventListener('contextmenu', e => {
    e.preventDefault(); showTpChartPopup(_tpSalesCallChart, 'Sales Call by Department', e);
  });

  // Status + all global filters trigger refresh
  ['tpStatusFilter','tpSourceFilter','tpDeptFilter','tpCountryFilter','tpEligibleFilter']
    .forEach(id => document.getElementById(id)?.addEventListener('change', refresh));

  // Column filters
  document.querySelectorAll('#tpColFilterRow .req-cf').forEach(el =>
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', refresh));

  // Sort
  document.getElementById('tpSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-tpfield]'); if (!th) return;
    const field = th.dataset.tpfield;
    if (_tpSortCol === field) _tpSortDir = _tpSortDir === 'asc' ? 'desc' : 'asc';
    else { _tpSortCol = field; _tpSortDir = 'asc'; }
    document.querySelectorAll('#tpSortRow .req-sort-icon').forEach(el => {
      el.textContent = '⇅'; el.closest('th')?.classList.remove('req-sort-asc','req-sort-desc');
    });
    const icon = th.querySelector('.req-sort-icon');
    if (icon) { icon.textContent = _tpSortDir === 'asc' ? '↑' : '↓'; th.classList.add(_tpSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc'); }
    refresh();
  });

  // Clear
  document.getElementById('tpClearBtn')?.addEventListener('click', () => {
    ['tpStatusFilter','tpSourceFilter','tpDeptFilter','tpCountryFilter','tpEligibleFilter']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.querySelectorAll('#tpColFilterRow .req-cf').forEach(el => el.value = '');
    _tpSortCol = null; _tpSortDir = 'asc';
    document.querySelectorAll('#tpSortRow .req-sort-icon').forEach(el => el.textContent = '⇅');
    document.querySelectorAll('#tpSortRow th').forEach(th => th.classList.remove('req-sort-asc','req-sort-desc'));
    refresh();
  });
};

// ── Housing page constants ─────────────────────────────
let _housingSortCol = null;
let _housingSortDir = 'asc';

const HOUSING_TABLE_COLS = [
  { label:'J1 App Status',        field:'placementStatus',     sortable:true, statusbadge:true  },
  { label:'J1 Source',            field:'programSource',       sortable:true                    },
  { label:'First Name',           field:'firstName',           sortable:true                    },
  { label:'Last Name',            field:'lastName',            sortable:true                    },
  { label:'Country',              field:'country',             sortable:true                    },
  { label:'Sponsor',              field:'processingSponsor',   sortable:true                    },
  { label:'Hosting Company',      field:'hostCompany',         sortable:true                    },
  { label:'Housing Availability', field:'housingAvailability', sortable:true, housingbadge:true },
  { label:'Housing Landlord',     field:'housingLandlord',     sortable:true                    },
];

function housingAvailBadge(val) {
  if (!val || val === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
  const c = val === 'Available Through CTI' ? '#2D7A55'
          : val === 'Provided by Host'      ? '#0369A1'
          : '#6B7280';
  return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
    background:${c}1A;color:${c};white-space:nowrap;">${escH(val)}</span>`;
}

// ============================
// PAGE: HOUSING
// ============================
pages.housing = async function () {
  _housingSortCol = null;
  _housingSortDir = 'asc';

  let rows = [], errorMsg = null;
  try {
    const json = await safeJson('/api/recruit/j1-participants');
    rows = json?.data || [];
  } catch (e) { errorMsg = e.message; }

  // Data prep: active J1 status + hosting company not blank + HC interview = Approved
  const _parActiveSet = new Set(PAR_STATUSES);
  const allRows = rows.filter(r =>
    _parActiveSet.has(r.placementStatus) &&
    r.hostCompany && r.hostCompany !== '—' &&
    r.hcInterviewStatus === 'Approved'
  );
  state.dataCache['housing-rows'] = allRows;

  const total   = allRows.length;
  const authErr = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));

  // — Widget calculations —
  const ctiHoused = allRows.filter(r =>
    (r.placementStatus === 'USA Onboard' || r.placementStatus === 'Program Completed') &&
    r.housingAvailability === 'Available Through CTI'
  ).length;

  const demand = allRows.filter(r =>
    (r.placementStatus === 'Stage 2' || r.placementStatus === 'Stage 3' || r.placementStatus === 'Stage 4') &&
    r.housingAvailability !== 'Provided by Host'
  ).length;

  // "Open Units" = available CTI housing slots — no inventory system yet, so 0
  const openUnits = 0;
  const remaining = Math.max(0, demand - openUnits);

  // — Filter options —
  const sources     = [...new Set(allRows.map(r=>r.programSource).filter(v=>v&&v!=='—'))].sort();
  const sponsors    = [...new Set(allRows.map(r=>r.processingSponsor).filter(v=>v&&v!=='—'))].sort();
  const housingOpts = [...new Set(allRows.map(r=>r.housingAvailability).filter(v=>v&&v!=='—'))].sort();
  const countries   = [...new Set(allRows.map(r=>r.country).filter(v=>v&&v!=='—'))].sort();

  // — Column filter dropdowns —
  const cfDropdowns = {
    placementStatus:     [...PAR_STATUSES],
    programSource:       sources,
    country:             countries,
    processingSponsor:   sponsors,
    housingAvailability: housingOpts,
  };

  const thRow = HOUSING_TABLE_COLS.map(c =>
    c.sortable
      ? `<th data-hfield="${c.field}" class="sortable" style="cursor:pointer;user-select:none;white-space:nowrap;">${c.label} <span class="req-sort-icon">⇅</span></th>`
      : `<th style="white-space:nowrap;">${c.label}</th>`
  ).join('') + '<th style="width:40px;"></th>';

  const cfRow = HOUSING_TABLE_COLS.map(c => {
    const opts = cfDropdowns[c.field];
    return `<th>${opts
      ? `<select class="req-cf hcf-sel" data-hfield="${escH(c.field)}"><option value="">All</option>${opts.map(o=>`<option value="${escH(o)}">${escH(o)}</option>`).join('')}</select>`
      : `<input class="req-cf hcf-inp req-col-f" data-hfield="${escH(c.field)}" type="text" placeholder="—">`
    }</th>`;
  }).join('') + '<th></th>';

  return `
    <div class="req-page-header">
      <h1>Housing</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">${total} host-company approved participants</span>
    </div>

    ${errorMsg ? `<div class="req-error-banner"><span>${authErr?'🔑':'⚠️'}</span>
      <div><strong>${authErr?'Not connected to Zoho':'Server error'}</strong>
      ${authErr?' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>':` — ${escH(errorMsg)}`}
      </div></div>` : ''}

    <!-- Global filters (sticky) -->
    <div class="card req-filter-bar">
      <select id="hsgStatusFilter" class="req-gsel">
        <option value="">All J1 Statuses</option>
        ${[...PAR_STATUSES].map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="hsgSourceFilter" class="req-gsel">
        <option value="">All Sources</option>
        ${sources.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="hsgSponsorFilter" class="req-gsel">
        <option value="">All Sponsors</option>
        ${sponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="hsgHousingFilter" class="req-gsel">
        <option value="">All Housing</option>
        ${housingOpts.map(h=>`<option value="${escH(h)}">${escH(h)}</option>`).join('')}
      </select>
      <button id="hsgClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="hsgCount" class="req-count-badge">${total} participants</span>
    </div>

    <!-- KPI Widgets -->
    <div class="req-kpi-grid" style="grid-template-columns:repeat(5,1fr);">
      <div class="req-kpi-card">
        <span class="req-kpi-label">Total</span>
        <span class="req-kpi-value" style="color:${DIVISION_COLORS.j1};" id="hsgKpiTotal">${total.toLocaleString()}</span>
        <span class="req-kpi-sub">host-approved participants</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">CTI Housing</span>
        <span class="req-kpi-value" style="color:#2D7A55;" id="hsgKpiCTI">${ctiHoused.toLocaleString()}</span>
        <span class="req-kpi-sub">on-board &amp; completed · CTI</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Housing Demand</span>
        <span class="req-kpi-value" style="color:#EA580C;" id="hsgKpiDemand">${demand.toLocaleString()}</span>
        <span class="req-kpi-sub">stage 2–4 · non-host</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Open Units</span>
        <span class="req-kpi-value" style="color:#6B7280;" id="hsgKpiOpen">${openUnits.toLocaleString()}</span>
        <span class="req-kpi-sub">no inventory tracked yet</span>
      </div>
      <div class="req-kpi-card">
        <span class="req-kpi-label">Remaining</span>
        <span class="req-kpi-value" style="color:${remaining > 0 ? '#B01A18' : '#2D7A55'};" id="hsgKpiRemaining">${remaining.toLocaleString()}</span>
        <span class="req-kpi-sub">demand − open units</span>
      </div>
    </div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="housingMainTable">
          <thead>
            <tr id="housingSortRow">${thRow}</tr>
            <tr id="housingColFilterRow">${cfRow}</tr>
          </thead>
          <tbody id="housingTableBody"></tbody>
        </table>
      </div>
    </div>
  `;
};

// ── Housing page events ────────────────────────────────────────
pageEvents.housing = function () {
  const allRows = state.dataCache['housing-rows'] || [];

  function fmtDateShort(v) {
    if (!v || v === '—') return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  function cellContent(r, col) {
    const v = r[col.field];
    if (col.statusbadge) {
      if (!v || v === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
      const color = PAR_STATUS_COLORS[v] || '#6B7280';
      return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
        background:${color}1A;color:${color};white-space:nowrap;">${escH(v)}</span>`;
    }
    if (col.housingbadge) return housingAvailBadge(v);
    if (!v || v === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
    return escH(String(v));
  }

  function doSort(rows) {
    if (!_housingSortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = String(a[_housingSortCol]||'');
      const bv = String(b[_housingSortCol]||'');
      const cmp = av.localeCompare(bv);
      return _housingSortDir === 'asc' ? cmp : -cmp;
    });
  }

  function getFiltered() {
    const gSt  = document.getElementById('hsgStatusFilter')?.value  || '';
    const gSrc = document.getElementById('hsgSourceFilter')?.value  || '';
    const gSp  = document.getElementById('hsgSponsorFilter')?.value || '';
    const gHsg = document.getElementById('hsgHousingFilter')?.value || '';
    const colF = {};
    document.querySelectorAll('#housingColFilterRow .req-cf').forEach(el => {
      const v = el.value.trim();
      if (v) colF[el.dataset.hfield] = v.toLowerCase();
    });
    return [...allRows].filter(r => {
      if (gSt  && r.placementStatus    !== gSt)  return false;
      if (gSrc && r.programSource      !== gSrc) return false;
      if (gSp  && r.processingSponsor  !== gSp)  return false;
      if (gHsg && r.housingAvailability !== gHsg) return false;
      for (const [f, fv] of Object.entries(colF)) {
        if (!String(r[f]||'').toLowerCase().includes(fv)) return false;
      }
      return true;
    });
  }

  function renderRows(rows) {
    if (!rows.length) return `<tr><td colspan="${HOUSING_TABLE_COLS.length+1}"
      style="text-align:center;padding:32px;color:var(--text-muted);">No matching records.</td></tr>`;
    return rows.map((r, i) => `
      <tr style="cursor:pointer;">
        ${HOUSING_TABLE_COLS.map(col =>
          `<td>${cellContent(r, col)}</td>`
        ).join('')}
        <td style="text-align:center;">
          <button class="hsg-detail-btn" data-hsgidx="${allRows.indexOf(r)}"
            style="font-size:11px;padding:3px 10px;border-radius:6px;
              border:1px solid var(--border,#ddd);background:var(--bg-card,#fff);
              cursor:pointer;color:var(--text,#111);">Details</button>
        </td>
      </tr>`
    ).join('');
  }

  function updateKpis(rows) {
    const ctiHoused = rows.filter(r =>
      (r.placementStatus === 'USA Onboard' || r.placementStatus === 'Program Completed') &&
      r.housingAvailability === 'Available Through CTI'
    ).length;
    const demand = rows.filter(r =>
      (r.placementStatus === 'Stage 2' || r.placementStatus === 'Stage 3' || r.placementStatus === 'Stage 4') &&
      r.housingAvailability !== 'Provided by Host'
    ).length;
    const remaining = demand; // open units = 0 until inventory system exists
    const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('hsgKpiTotal',     rows.length.toLocaleString());
    set('hsgKpiCTI',       ctiHoused.toLocaleString());
    set('hsgKpiDemand',    demand.toLocaleString());
    set('hsgKpiRemaining', remaining.toLocaleString());
    const remEl = document.getElementById('hsgKpiRemaining');
    if (remEl) remEl.style.color = remaining > 0 ? '#B01A18' : '#2D7A55';
  }

  let _currentRows = doSort(getFiltered());
  const tbody   = document.getElementById('housingTableBody');
  const countEl = document.getElementById('hsgCount');

  function refresh() {
    _currentRows = doSort(getFiltered());
    if (tbody)   tbody.innerHTML = renderRows(_currentRows);
    if (countEl) countEl.textContent = `${_currentRows.length} of ${allRows.length} participants`;
    updateKpis(_currentRows);
  }

  refresh();

  // Global filter listeners
  ['hsgStatusFilter','hsgSourceFilter','hsgSponsorFilter','hsgHousingFilter'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', refresh));

  // Column filter listeners
  document.querySelectorAll('#housingColFilterRow .req-cf').forEach(el =>
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', refresh));

  // Clear button
  document.getElementById('hsgClearBtn')?.addEventListener('click', () => {
    ['hsgStatusFilter','hsgSourceFilter','hsgSponsorFilter','hsgHousingFilter'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('#housingColFilterRow .req-cf').forEach(el => el.value = '');
    _housingSortCol = null; _housingSortDir = 'asc';
    document.querySelectorAll('#housingSortRow .req-sort-icon').forEach(a => a.textContent='⇅');
    document.querySelectorAll('#housingSortRow th').forEach(th => th.classList.remove('req-sort-asc','req-sort-desc'));
    refresh();
  });

  // Sort header clicks
  document.getElementById('housingSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-hfield]'); if (!th) return;
    const field = th.dataset.hfield;
    if (_housingSortCol === field) _housingSortDir = _housingSortDir === 'asc' ? 'desc' : 'asc';
    else { _housingSortCol = field; _housingSortDir = 'asc'; }
    document.querySelectorAll('#housingSortRow .req-sort-icon').forEach(a => a.textContent='⇅');
    document.querySelectorAll('#housingSortRow th').forEach(t => t.classList.remove('req-sort-asc','req-sort-desc'));
    const icon = th.querySelector('.req-sort-icon');
    if (icon) icon.textContent = _housingSortDir === 'asc' ? '↑' : '↓';
    th.classList.add(_housingSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc');
    refresh();
  });

  // Detail modal — open on Details button
  document.getElementById('housingTableBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.hsg-detail-btn'); if (!btn) return;
    const idx = parseInt(btn.dataset.hsgidx); if (isNaN(idx)) return;
    const r = allRows[idx]; if (!r) return;
    showHousingDetail(r);
  });

  function showHousingDetail(r) {
    const fmtMoney = v => (v != null && v !== '' && v !== '—')
      ? `$${Number(v).toLocaleString()}` : '—';
    const status = r.placementStatus || '—';
    const sColor = PAR_STATUS_COLORS[status] || '#888';
    const fld = (label, val, full) => (val && val !== '—' && val !== '$0') ? `
      <div style="${full?'grid-column:1/-1;':''}margin-bottom:12px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
          color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-size:11px;font-weight:500;">${escH(String(val))}</div>
      </div>` : '';

    document.getElementById('modalTitle').textContent =
      (`${r.firstName||''} ${r.lastName||''}`).trim() || '—';
    document.getElementById('modalBody').innerHTML = `
      <div style="padding:4px 0 10px;">
        <!-- Status header strip -->
        <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;
          background:${sColor}0d;border-radius:10px;border:1px solid ${sColor}28;margin-bottom:16px;">
          <div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;
              letter-spacing:.07em;color:${sColor};">J1 Status</div>
            <div style="margin-top:4px;padding:3px 10px;border-radius:12px;font-size:11px;
              font-weight:700;display:inline-block;background:${sColor}18;color:${sColor};
              border:1px solid ${sColor}40;">${escH(status)}</div>
          </div>
          ${r.housingAvailability && r.housingAvailability !== '—' ? `
          <div style="border-left:1px solid ${sColor}30;padding-left:14px;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;
              letter-spacing:.07em;color:var(--text-muted);">Housing</div>
            <div style="margin-top:4px;">${housingAvailBadge(r.housingAvailability)}</div>
          </div>` : ''}
        </div>

        <!-- Field grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;">
          ${fld('First Name',        r.firstName)}
          ${fld('Last Name',         r.lastName)}
          ${fld('Country',           r.country)}
          ${fld('J1 Source',         r.programSource)}
          ${fld('Sponsor',           r.processingSponsor)}
          ${fld('Hosting Company',   r.hostCompany)}
          ${fld('Department',        r.department)}
          ${fld('Housing Landlord',  r.housingLandlord)}
          ${fld('Initial Payment',   fmtMoney(r.housingPaymentInit))}
          ${fld('Monthly Payment',   fmtMoney(r.housingPaymentMo))}
          ${fld('Program Start',     fmtDateShort(r.programStart))}
          ${fld('Program End',       fmtDateShort(r.programEnd))}
          ${fld('Housing Address',   r.housingAddress, true)}
        </div>
      </div>`;
    document.getElementById('modalOverlay').classList.add('active');
  }

  document.getElementById('modalClose')?.addEventListener('click', () =>
    document.getElementById('modalOverlay')?.classList.remove('active'));
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay'))
      document.getElementById('modalOverlay')?.classList.remove('active');
  });
};

// ============================
// PAGE: RETURN HOME (coming soon)
// ============================
pages.returnhome = async function () {
  return lockedPage('returnhome');
};

// ============================
// PAGE: TASK (coming soon)
// ============================
pages.task = async function () {
  return lockedPage('task');
};

// ============================
// PAGE: MARKETING
// ============================
pages.marketing = async function () {
  const C = DIVISION_COLORS.j1;
  const videos = [
    { id:'4-6OY7-Yr_A', title:'J1 Program Introduction Short' },
    { id:'yoahucblnVQ', title:'J1 Program Introduction' },
    { id:'gOwe92yD7cc', title:'La Quinta Resort' },
    { id:'B3dP3R6rcdw', title:'Orlando World Center' },
    { id:'jQrqquyujJk', title:'Riviera Dining Group' },
    { id:'XXJ5SXZ29Q0', title:'Wintergreen Resort' },
    { id:'oW75EwDxaUY', title:'49th State Brewing' },
    { id:'OR6uW8FH2uU', title:'Beemok Hospitality' },
    { id:'_2Zxz1IivG8', title:'Elk Avenue Colorado' },
    { id:'xP4_7SKzUbo', title:'Grand Hyatt Vail' },
  ];
  let _activeIdx = 0;

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Marketing</h1>
        <p class="subtitle">CTI Group program marketing videos and media — ${videos.length} videos</p>
      </div>
    </div>

    <!-- Featured player -->
    <div class="card mb-24">
      <div style="border-radius:10px;overflow:hidden;background:#000;aspect-ratio:16/9;max-width:820px;">
        <iframe id="mktMainPlayer"
          src="https://www.youtube-nocookie.com/embed/${videos[0].id}?rel=0&modestbranding=1"
          style="width:100%;height:100%;border:none;display:block;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen title="${videos[0].title}">
        </iframe>
      </div>
      <div style="margin-top:12px;">
        <div id="mktMainTitle" style="font-size:15px;font-weight:700;color:var(--text,#1A1A1A);">${videos[0].title}</div>
        <div style="font-size:12px;color:var(--text-muted,#888);margin-top:3px;">Video 1 of ${videos.length}</div>
      </div>
    </div>

    <!-- Playlist grid -->
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">📋 All Videos</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
        ${videos.map((v,i) => `
          <div class="mkt-thumb" data-idx="${i}" data-id="${v.id}" data-title="${v.title.replace(/"/g,'&quot;')}"
            style="cursor:pointer;border-radius:10px;overflow:hidden;border:2px solid ${i===0?C:'var(--border,#E5E7EB)'};
              transition:all 0.15s;background:var(--bg-subtle,#F9FAFB);"
            onmouseover="this.style.borderColor='${C}';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.borderColor=this.dataset.idx==='${0}'?'${C}':'var(--border,#E5E7EB)';this.style.transform=''">
            <div style="position:relative;aspect-ratio:16/9;background:#111;">
              <img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" alt="${v.title}"
                style="width:100%;height:100%;object-fit:cover;display:block;opacity:0.9;">
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.65);
                  display:flex;align-items:center;justify-content:center;">
                  <span style="color:#fff;font-size:14px;margin-left:3px;">▶</span>
                </div>
              </div>
              <div style="position:absolute;top:6px;left:6px;background:${C};color:#fff;
                font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;">${i+1}</div>
            </div>
            <div style="padding:10px;font-size:12px;font-weight:600;line-height:1.4;
              color:var(--text,#1A1A1A);display:-webkit-box;-webkit-line-clamp:2;
              -webkit-box-orient:vertical;overflow:hidden;">${v.title}</div>
          </div>`).join('')}
      </div>
    </div>`;
};

// ============================
// ============================
// PAGE: TRAVEL
// ============================

// ── Travel page constants ─────────────────────────────────────
const TRAVEL_TICKET_COLORS = {
  'No Ticket': { color:'#6B7280', bg:'rgba(107,114,128,0.12)' },
  'Requested': { color:'#D97706', bg:'rgba(217,119,6,0.12)'   },
  'Booked':    { color:'#2563EB', bg:'rgba(37,99,235,0.12)'   },
  'Issued':    { color:'#059669', bg:'rgba(5,150,105,0.12)'   },
};
function normalizeFlightStatus(raw) {
  const s = (raw || '').trim();
  if (!s || s === '—') return 'No Ticket';
  if (/^requested$/i.test(s))  return 'Requested';
  if (/book/i.test(s))         return 'Booked';
  if (/issued?/i.test(s))      return 'Issued';
  return s;
}
const TRAVEL_DEP_COLS = [
  { label:'J1 App Status',   field:'placementStatus',  sortable:true,  statusbadge:true },
  { label:'J1 Source',       field:'programSource',    sortable:true  },
  { label:'First Name',      field:'firstName',        sortable:true  },
  { label:'Last Name',       field:'lastName',         sortable:true  },
  { label:'Program Start',   field:'programStart',     sortable:true,  datecol:true },
  { label:'Flight Ticket',   field:'flightBooked',     sortable:true,  flightbadge:true },
  { label:'Trip',            field:'_trip',            sortable:false },
  { label:'Departure Date',  field:'departureDate',    sortable:true,  datecol:true },
  { label:'Arrival Date',    field:'arrivalDate',      sortable:true,  datecol:true },
  { label:'Airline',         field:'airline',          sortable:true  },
  { label:'PNR Number',      field:'pnrNumber',        sortable:true  },
  { label:'Airport Pick-Up', field:'airportPickup',    sortable:true  },
];
const TRAVEL_RET_COLS = [
  { label:'J1 App Status',    field:'placementStatus',    sortable:true,  statusbadge:true },
  { label:'J1 Source',        field:'programSource',      sortable:true  },
  { label:'First Name',       field:'firstName',          sortable:true  },
  { label:'Last Name',        field:'lastName',           sortable:true  },
  { label:'Program End',      field:'programEnd',         sortable:true,  datecol:true },
  { label:'Return Ticket',    field:'returnFlightStatus', sortable:true,  flightbadge:true },
  { label:'Return Trip',      field:'_returnTrip',        sortable:false },
  { label:'Return Departure', field:'returnDeparture',    sortable:true,  datecol:true },
  { label:'Return Arrival',   field:'returnArrival',      sortable:true,  datecol:true },
  { label:'Return Airline',   field:'returnAirline',      sortable:true  },
];
let _travelActiveTab = 'departure';
let _travelSortCol   = null, _travelSortDir = 'asc';

pages.travel = async function () {
  _travelActiveTab = 'departure';
  _travelSortCol   = null;
  _travelSortDir   = 'asc';

  let rows = [], errorMsg = null;
  try {
    const json = await safeJson('/api/recruit/j1-participants');
    rows = json?.data || [];
  } catch (e) { errorMsg = e.message; }

  // Filter: active status only + hosting company not blank + HC Interview = Approved
  const _parActiveSet = new Set(PAR_STATUSES);
  const allRows = rows.filter(r =>
    _parActiveSet.has(r.placementStatus) &&
    r.hostCompany && r.hostCompany !== '—' &&
    r.hcInterviewStatus === 'Approved'
  );

  // Tab-specific row sets
  const depRows = allRows.filter(r => r.programStart && r.programStart !== '—');
  const retRows = allRows.filter(r => r.programEnd   && r.programEnd   !== '—');
  state.dataCache['travel-rows']     = allRows;
  state.dataCache['travel-dep-rows'] = depRows;
  state.dataCache['travel-ret-rows'] = retRows;

  // Initial KPI counts (unfiltered)
  function _trvTicketCounts(arr, field) {
    return {
      total:     arr.length,
      issued:    arr.filter(r => normalizeFlightStatus(r[field]) === 'Issued').length,
      requested: arr.filter(r => normalizeFlightStatus(r[field]) === 'Requested').length,
      noTicket:  arr.filter(r => normalizeFlightStatus(r[field]) === 'No Ticket').length,
    };
  }
  const depKpi = _trvTicketCounts(depRows, 'flightBooked');
  const retKpi = _trvTicketCounts(retRows, 'returnFlightStatus');

  const total   = allRows.length;
  const authErr = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));

  // Global filter options
  const trvSources  = [...new Set(allRows.map(r=>r.programSource).filter(v=>v&&v!=='—'))].sort();
  const trvSponsors = [...new Set(allRows.map(r=>r.processingSponsor).filter(v=>v&&v!=='—'))].sort();

  // Build thead HTML for both tab column sets
  function buildHeaders(cols) {
    const th = cols.map(c =>
      c.sortable
        ? `<th data-travelfield="${c.field}" class="sortable" style="cursor:pointer;user-select:none;white-space:nowrap;">${c.label} <span class="req-sort-icon">⇅</span></th>`
        : `<th style="white-space:nowrap;">${c.label}</th>`
    ).join('') + '<th style="width:40px;"></th>';

    const tf = cols.map(c => {
      if (c.field === '_trip' || c.field === '_returnTrip') return `<th></th>`;
      if (c.datecol) return `<th style="min-width:170px;padding:2px 4px;">
        <div style="display:flex;gap:2px;align-items:center;">
          <select class="req-cf req-cf-date-cond" data-travelcol="${c.field}"
            title="Before / On or Before / On / On or After / After"
            style="width:42px;flex-shrink:0;padding:1px 2px;font-size:12px;text-align:center;">
            <option value="">–</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="eq">=</option><option value="gte">≥</option><option value="gt">&gt;</option>
          </select>
          <input type="date" class="req-cf req-cf-date-val" data-travelcol="${c.field}"
            style="flex:1;padding:1px 3px;font-size:11px;min-width:0;">
        </div>
      </th>`;
      return `<th><input class="req-cf req-col-f" data-travelcol="${c.field}" type="text" placeholder="—"></th>`;
    }).join('') + '<th></th>';

    return { th, tf };
  }

  const depH = buildHeaders(TRAVEL_DEP_COLS);
  const retH = buildHeaders(TRAVEL_RET_COLS);

  return `
    <div class="req-page-header">
      <h1>Travel</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">${total} host-company approved participants</span>
    </div>

    ${errorMsg ? `<div class="req-error-banner"><span>${authErr?'🔑':'⚠️'}</span>
      <div><strong>${authErr?'Not connected to Zoho':'Server error'}</strong>
      ${authErr?' — <a href="/auth/zoho" style="color:#B01A18;font-weight:700;">Re-connect →</a>':` — ${escH(errorMsg)}`}
      </div></div>` : ''}

    <!-- Filter Bar (sticky) -->
    <div class="card req-filter-bar">
      <select id="travelStatusFilter" class="req-gsel">
        <option value="">All J1 Statuses</option>
        ${[...PAR_STATUSES].map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="travelSourceFilter" class="req-gsel">
        <option value="">All Sources</option>
        ${trvSources.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="travelSponsorFilter" class="req-gsel">
        <option value="">All Sponsors</option>
        ${trvSponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
      </select>
      <select id="travelTicketFilter" class="req-gsel">
        <option value="">All Ticket Statuses</option>
        <option value="No Ticket">No Ticket</option>
        <option value="Requested">Requested</option>
        <option value="Booked">Booked</option>
        <option value="Issued">Issued</option>
      </select>
      <button id="travelClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="travelCount" class="req-count-badge">${total} participants</span>
    </div>

    <!-- KPI Widgets -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:0;">
      <div class="card" style="padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);margin-bottom:12px;letter-spacing:0.05em;text-transform:uppercase;">✈️ Departure Ticket</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div class="req-kpi-card"><div class="req-kpi-label">Total</div><div class="req-kpi-value" id="depKpiTotal">${depKpi.total}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Issued</div><div class="req-kpi-value" id="depKpiIssued">${depKpi.issued}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Requested</div><div class="req-kpi-value" id="depKpiRequested">${depKpi.requested}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Unassigned</div><div class="req-kpi-value" id="depKpiNoTicket">${depKpi.noTicket}</div></div>
        </div>
      </div>
      <div class="card" style="padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);margin-bottom:12px;letter-spacing:0.05em;text-transform:uppercase;">🏠 Return Ticket</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div class="req-kpi-card"><div class="req-kpi-label">Total</div><div class="req-kpi-value" id="retKpiTotal">${retKpi.total}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Issued</div><div class="req-kpi-value" id="retKpiIssued">${retKpi.issued}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Requested</div><div class="req-kpi-value" id="retKpiRequested">${retKpi.requested}</div></div>
          <div class="req-kpi-card"><div class="req-kpi-label">Unassigned</div><div class="req-kpi-value" id="retKpiNoTicket">${retKpi.noTicket}</div></div>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="par-tab-bar">
      <button class="par-tab active" data-travel-tab="departure">✈️ Departure Ticket</button>
      <button class="par-tab" data-travel-tab="return">🏠 Return Ticket</button>
    </div>

    <!-- Table -->
    <div class="card req-table-card">
      <div class="req-table-outer">
        <table id="travelMainTable">
          <thead>
            <tr id="travelSortRow">${depH.th}</tr>
            <tr id="travelColFilterRow">${depH.tf}</tr>
          </thead>
          <tbody id="travelTableBody"></tbody>
        </table>
      </div>
    </div>

    <script type="application/json" id="travelDepHeaders">${JSON.stringify(depH)}<\/script>
    <script type="application/json" id="travelRetHeaders">${JSON.stringify(retH)}<\/script>
  `;
};

// ── Travel page events ────────────────────────────────────────
pageEvents.travel = function () {
  const allRows    = state.dataCache['travel-rows']     || [];
  const depAllRows = state.dataCache['travel-dep-rows'] || [];
  const retAllRows = state.dataCache['travel-ret-rows'] || [];

  function fmtDate(v) {
    if (!v || v === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
    const d = new Date(v);
    if (isNaN(d.getTime())) return escH(v);
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  function statusBadgeTravel(s) {
    if (!s || s === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
    const color = PAR_STATUS_COLORS[s] || '#6B7280';
    return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
      background:${color}1A;color:${color};white-space:nowrap;">${escH(s)}</span>`;
  }

  function flightBadge(raw) {
    const s   = normalizeFlightStatus(raw);
    const cfg = TRAVEL_TICKET_COLORS[s] || TRAVEL_TICKET_COLORS['No Ticket'];
    return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
      background:${cfg.bg};color:${cfg.color};white-space:nowrap;">${escH(s)}</span>`;
  }

  function cellContent(r, col) {
    const v = r[col.field];
    if (col.field === '_trip') {
      const from = r.tripFrom    && r.tripFrom    !== '—' ? r.tripFrom    : '—';
      const to   = r.tripTo      && r.tripTo      !== '—' ? r.tripTo      : '—';
      return `${escH(from)} → ${escH(to)}`;
    }
    if (col.field === '_returnTrip') {
      const from = r.returnTripFrom && r.returnTripFrom !== '—' ? r.returnTripFrom : '—';
      const to   = r.returnTripTo   && r.returnTripTo   !== '—' ? r.returnTripTo   : '—';
      return `${escH(from)} → ${escH(to)}`;
    }
    if (col.statusbadge)  return statusBadgeTravel(v);
    if (col.flightbadge)  return flightBadge(v);
    if (col.datecol)      return fmtDate(v);
    if (!v || v === '—')  return '<span style="color:var(--text-muted,#aaa);">—</span>';
    return escH(String(v));
  }

  function buildRow(r, cols) {
    return `<tr>${cols.map(col => `<td>${cellContent(r, col)}</td>`).join('')}</tr>`;
  }

  function getCols() {
    return _travelActiveTab === 'departure' ? TRAVEL_DEP_COLS : TRAVEL_RET_COLS;
  }
  function getTicketField() {
    return _travelActiveTab === 'departure' ? 'flightBooked' : 'returnFlightStatus';
  }

  const ticketSel = document.getElementById('travelTicketFilter');
  const countEl   = document.getElementById('travelCount');
  const clearBtn  = document.getElementById('travelClearBtn');
  const tbody     = document.getElementById('travelTableBody');
  const sortRow   = document.getElementById('travelSortRow');
  const filterRow = document.getElementById('travelColFilterRow');
  const depHeaders = JSON.parse(document.getElementById('travelDepHeaders')?.textContent || '{}');
  const retHeaders = JSON.parse(document.getElementById('travelRetHeaders')?.textContent || '{}');

  let colFilters = {};

  function updateKpis(gSt, gSrc, gSp) {
    function applyGlobal(rows) {
      let r = [...rows];
      if (gSt)  r = r.filter(x => x.placementStatus   === gSt);
      if (gSrc) r = r.filter(x => x.programSource     === gSrc);
      if (gSp)  r = r.filter(x => x.processingSponsor === gSp);
      return r;
    }
    function counts(rows, field) {
      return {
        total:     rows.length,
        issued:    rows.filter(r => normalizeFlightStatus(r[field]) === 'Issued').length,
        requested: rows.filter(r => normalizeFlightStatus(r[field]) === 'Requested').length,
        noTicket:  rows.filter(r => normalizeFlightStatus(r[field]) === 'No Ticket').length,
      };
    }
    const dc = counts(applyGlobal(depAllRows), 'flightBooked');
    const rc = counts(applyGlobal(retAllRows), 'returnFlightStatus');
    const upd = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    upd('depKpiTotal', dc.total);  upd('depKpiIssued', dc.issued);  upd('depKpiRequested', dc.requested);  upd('depKpiNoTicket', dc.noTicket);
    upd('retKpiTotal', rc.total);  upd('retKpiIssued', rc.issued);  upd('retKpiRequested', rc.requested);  upd('retKpiNoTicket', rc.noTicket);
  }

  function getTabRows() {
    return _travelActiveTab === 'departure' ? depAllRows : retAllRows;
  }

  function applyFilters() {
    const cols      = getCols();
    const gSt       = document.getElementById('travelStatusFilter')?.value  || '';
    const gSrc      = document.getElementById('travelSourceFilter')?.value  || '';
    const gSp       = document.getElementById('travelSponsorFilter')?.value || '';
    const ticketVal = ticketSel?.value || '';
    const ticketFld = getTicketField();
    let filtered    = [...getTabRows()];

    if (gSt)  filtered = filtered.filter(r => r.placementStatus   === gSt);
    if (gSrc) filtered = filtered.filter(r => r.programSource     === gSrc);
    if (gSp)  filtered = filtered.filter(r => r.processingSponsor === gSp);
    if (ticketVal) {
      filtered = filtered.filter(r => normalizeFlightStatus(r[ticketFld]) === ticketVal);
    }

    Object.entries(colFilters).forEach(([field, val]) => {
      if (!val) return;
      // Date column filter: val is {cond, val}
      if (val && typeof val === 'object' && val.cond) {
        const { cond, val: dVal } = val;
        const fd = new Date(dVal + 'T00:00:00');
        filtered = filtered.filter(r => {
          const rd = r[field] ? new Date(r[field]) : null;
          if (!rd || isNaN(rd.getTime())) return false;
          if (cond === 'lt')  return rd <  fd;
          if (cond === 'lte') return rd <= fd;
          if (cond === 'eq')  return rd.toISOString().slice(0,10) === dVal;
          if (cond === 'gte') return rd >= fd;
          if (cond === 'gt')  return rd >  fd;
          return true;
        });
        return;
      }
      const q = val.toLowerCase();
      filtered = filtered.filter(r => {
        if (field === '_trip')
          return `${r.tripFrom||''} ${r.tripTo||''}`.toLowerCase().includes(q);
        if (field === '_returnTrip')
          return `${r.returnTripFrom||''} ${r.returnTripTo||''}`.toLowerCase().includes(q);
        const fv = (field === 'flightBooked' || field === 'returnFlightStatus')
          ? normalizeFlightStatus(r[field]) : String(r[field] || '');
        return fv.toLowerCase().includes(q);
      });
    });

    if (_travelSortCol) {
      const dir  = _travelSortDir === 'asc' ? 1 : -1;
      const col  = cols.find(c => c.field === _travelSortCol);
      filtered.sort((a, b) => {
        const aV = a[_travelSortCol] || '';
        const bV = b[_travelSortCol] || '';
        if (col?.datecol) {
          const aD = aV ? new Date(aV).getTime() : 0;
          const bD = bV ? new Date(bV).getTime() : 0;
          return (aD - bD) * dir;
        }
        return String(aV).localeCompare(String(bV)) * dir;
      });
    }

    if (!tbody) return;
    tbody.innerHTML = filtered.length === 0
      ? `<tr><td colspan="${cols.length}" style="text-align:center;padding:52px;
          color:var(--text-muted,#aaa);">No participants match the current filters</td></tr>`
      : filtered.map(r => buildRow(r, cols)).join('');

    const tabBase = getTabRows();
    if (countEl) countEl.textContent = filtered.length === tabBase.length
      ? `${tabBase.length} participants`
      : `${filtered.length} of ${tabBase.length}`;

    updateKpis(gSt, gSrc, gSp);
  }

  function attachSortListeners() {
    document.querySelectorAll('#travelSortRow th[data-travelfield]').forEach(th => {
      if (!th.classList.contains('sortable')) return;
      th.addEventListener('click', () => {
        const field = th.dataset.travelfield;
        if (_travelSortCol === field) {
          _travelSortDir = _travelSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _travelSortCol = field;
          _travelSortDir = 'asc';
        }
        document.querySelectorAll('#travelSortRow .req-sort-icon').forEach(a => a.textContent = '⇅');
        document.querySelectorAll('#travelSortRow th').forEach(t => t.classList.remove('req-sort-asc','req-sort-desc'));
        const icon = th.querySelector('.req-sort-icon');
        if (icon) icon.textContent = _travelSortDir === 'asc' ? '↑' : '↓';
        th.classList.add(_travelSortDir === 'asc' ? 'req-sort-asc' : 'req-sort-desc');
        applyFilters();
      });
    });
  }

  function attachColFilterListeners() {
    // Text inputs
    document.querySelectorAll('#travelColFilterRow input[data-travelcol]:not(.req-cf-date-val)').forEach(inp => {
      inp.addEventListener('input', () => {
        colFilters[inp.dataset.travelcol] = inp.value.trim();
        applyFilters();
      });
    });
    // Date condition selects
    document.querySelectorAll('#travelColFilterRow .req-cf-date-cond').forEach(sel => {
      sel.addEventListener('change', () => {
        const field = sel.dataset.travelcol;
        const valEl = document.querySelector(`#travelColFilterRow .req-cf-date-val[data-travelcol="${field}"]`);
        if (!sel.value && valEl) { valEl.value = ''; delete colFilters[field]; }
        else if (valEl?.value) colFilters[field] = { cond: sel.value, val: valEl.value };
        applyFilters();
      });
    });
    // Date value inputs
    document.querySelectorAll('#travelColFilterRow .req-cf-date-val').forEach(inp => {
      inp.addEventListener('change', () => {
        const field = inp.dataset.travelcol;
        const condEl = document.querySelector(`#travelColFilterRow .req-cf-date-cond[data-travelcol="${field}"]`);
        if (inp.value && condEl?.value) colFilters[field] = { cond: condEl.value, val: inp.value };
        else delete colFilters[field];
        applyFilters();
      });
    });
  }

  function switchTab(tab) {
    _travelActiveTab = tab;
    _travelSortCol   = null;
    _travelSortDir   = 'asc';
    colFilters       = {};
    const headers = tab === 'departure' ? depHeaders : retHeaders;
    if (sortRow)   sortRow.innerHTML   = headers.th || '';
    if (filterRow) filterRow.innerHTML = headers.tf || '';
    document.querySelectorAll('.par-tab[data-travel-tab]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.travelTab === tab));
    attachSortListeners();
    attachColFilterListeners();
    applyFilters();
  }

  document.querySelectorAll('.par-tab[data-travel-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.travelTab)));

  ['travelStatusFilter','travelSourceFilter','travelSponsorFilter'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', applyFilters));
  ticketSel?.addEventListener('change', applyFilters);

  clearBtn?.addEventListener('click', () => {
    ['travelStatusFilter','travelSourceFilter','travelSponsorFilter'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    if (ticketSel) ticketSel.value = '';
    colFilters = {};
    document.querySelectorAll('#travelColFilterRow input[data-travelcol]').forEach(inp => inp.value = '');
    document.querySelectorAll('#travelColFilterRow select[data-travelcol]').forEach(sel => sel.value = '');
    _travelSortCol = null; _travelSortDir = 'asc';
    document.querySelectorAll('#travelSortRow .req-sort-icon').forEach(a => a.textContent = '⇅');
    document.querySelectorAll('#travelSortRow th').forEach(t => t.classList.remove('req-sort-asc','req-sort-desc'));
    applyFilters();
  });

  attachSortListeners();
  attachColFilterListeners();
  applyFilters();
};

// ── Marketing video playlist click ────────────────────────────
pageEvents.marketing = function () {
  document.querySelectorAll('.mkt-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const id    = thumb.dataset.id;
      const title = thumb.dataset.title;
      const idx   = thumb.dataset.idx;
      document.getElementById('mktMainPlayer').src =
        `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
      document.getElementById('mktMainTitle').textContent = title;
      document.querySelectorAll('.mkt-thumb').forEach(t => {
        t.style.borderColor = 'var(--border,#E5E7EB)';
      });
      thumb.style.borderColor = DIVISION_COLORS.j1;
    });
  });
};

// ============================
// THEME
// ============================
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('cti-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  applyChartDefaults();
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}

// ============================
// SIDEBAR
// ============================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}
function toggleSidebarCollapse() {
  const sb = document.getElementById('sidebar');
  const collapsed = sb.classList.toggle('collapsed');
  localStorage.setItem('cti-sidebar-collapsed', collapsed ? '1' : '0');
}

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', function () {
  console.log('CTI Group Command Center v1.0 — Ready');

  applyTheme(state.theme);
  applyChartDefaults();

  document.getElementById('topbar-date').textContent =
    new Intl.DateTimeFormat('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' }).format(new Date());

  // Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); showPage(link.dataset.page); });
  });

  // Division "View Details" links (delegated on main-content)
  document.getElementById('main-content').addEventListener('click', e => {
    const link = e.target.closest('a[data-page]');
    if (link && !link.classList.contains('nav-link')) { e.preventDefault(); showPage(link.dataset.page); }
  });

  // Theme toggle (topbar button)
  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
  });

  // Restore sidebar collapse state
  if (localStorage.getItem('cti-sidebar-collapsed') === '1') {
    document.getElementById('sidebar').classList.add('collapsed');
  }

  // Collapse toggle button
  document.getElementById('sidebarCollapseBtn')?.addEventListener('click', toggleSidebarCollapse);

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });

  // Sidebar overlay
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Side panel close
  document.getElementById('panelClose').addEventListener('click', () => {
    document.getElementById('sidePanel').classList.remove('open');
    document.getElementById('panelOverlay').classList.remove('active');
  });
  document.getElementById('panelOverlay').addEventListener('click', () => {
    document.getElementById('sidePanel').classList.remove('open');
    document.getElementById('panelOverlay').classList.remove('active');
  });

  // Client modal close
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('active');
  });
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay'))
      document.getElementById('modalOverlay').classList.remove('active');
  });

  // Check Zoho connection
  checkZohoStatus();

  // Handle redirect from Zoho callback
  if (window.location.search.includes('zoho=connected')) {
    showToast('Zoho connected!', 'success');
    history.replaceState({}, '', '/');
  }

  showPage('requisition');

  // ── Auto-refresh every 10 minutes ────────────────────────────────────────
  const AUTO_REFRESH_MS = 10 * 60 * 1000;  // 10 minutes
  let _lastRefresh      = Date.now();
  let _refreshTimer     = null;

  function _scheduleRefresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(async () => {
      _lastRefresh = Date.now();
      console.log('🔄 Auto-refreshing data from Zoho…');
      updateLastUpdated();
      await showPage(state.page);
      _scheduleRefresh();           // reschedule after page finishes loading
    }, AUTO_REFRESH_MS);
  }

  function updateLastUpdated() {
    const el = document.getElementById('lastUpdatedTime');
    if (!el) return;
    const secs = Math.round((Date.now() - _lastRefresh) / 1000);
    if (secs < 60)        el.textContent = 'Just now';
    else if (secs < 3600) el.textContent = `${Math.floor(secs/60)}m ago`;
    else                  el.textContent = `${Math.floor(secs/3600)}h ago`;
  }

  // Tick every 30 s to keep "last updated" display fresh
  setInterval(updateLastUpdated, 30_000);
  // Reset timer on any manual page navigation
  const _origShow = showPage;
  window._resetRefreshTimer = function () {
    _lastRefresh = Date.now();
    updateLastUpdated();
    _scheduleRefresh();
  };

  _scheduleRefresh();
});
