'use strict';

// ── Cruise Line Portal ────────────────────────────────────────────────────────
// All sections are currently in development (coming soon).
// This file will grow as cruise-specific Zoho integrations are wired up.

const WORKER_URL = 'https://cti-athena.cti-athena.workers.dev';

const CRUISE_PAGE_TITLES = {
  requisition:         'Requisition',
  candidate:           'Candidate',
  finalinterview:      'Final Interview',
  seafarer:            'Seafarer',
  seafarerAttachment:  'Attachment',
  visa:                'Visa',
  deployment:          'Deployment',
  reports:             'Report',
  task:                'Task',
};

const CRUISE_BRANDS = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];

// All cruise lines available in Zoho (for RTS filter and other full-list uses)
const ALL_CRUISE_LINES = [
  'Carnival Cruise Line','CUK Maritime','Cunard Line','Four Seasons Yachts',
  'Heinemann Americas','Holland America Line','Marella Cruises','Margaritaville at Sea',
  'Norwegian Cruise Line','Oceania Cruises','P&O Cruises','Regent Seven Seas',
  'Seabourn','TUI River Cruises','Viking Cruises','Virgin Voyages',
];

// ── Visa rules config (isolated — modify here only) ───────────────────────────
// Source: CTI internal policy. DO NOT modify rules without written confirmation.
const VISA_RULES = {
  // ── C1/D ──────────────────────────────────────────────────────────────────
  // Cruise lines where ALL crew require C1/D
  c1dLines:       new Set(['Cunard Line', 'CUK Maritime']),
  // Individual ships (other lines) that also require C1/D
  c1dShips:       new Set(['Arcadia', 'Ventura', 'Aurora']),
  // Ships where C1/D is NOT required
  c1dNotRequired: new Set(['Arvia', 'Azura', 'Britannia', 'Iona']),

  // ── MCV ───────────────────────────────────────────────────────────────────
  mcvLines: new Set(['Cunard Line', 'P&O Cruises', 'CUK Maritime']),

  // ── NZeTA ─────────────────────────────────────────────────────────────────
  // Ships where NZeTA is Required
  nzetaRequired:    new Set(['Queen Anne', 'Queen Mary 2', 'Queen Elizabeth', 'Arcadia']),
  // Ports where NZeTA is handled by CUK Onboarding (not a crew action)
  nzetaCukPorts:    new Set(['Auckland']),

  // ── Port-based rules ──────────────────────────────────────────────────────
  // Flags: oktb | schengen | atv | canada
  // Malta/Valletta: OKTB can substitute for Schengen per CTI policy document.
  portRules: {
    // ── OKTB required ports ────────────────────────────────────────────────
    'St. Lucia':    { oktb: true },
    'Bridgetown':   { oktb: true },
    'Montevideo':   { oktb: true },
    'Singapore':    { oktb: true },
    'Hong Kong':    { oktb: true },
    'Yokohama':     { oktb: true },
    'Kotor':        { oktb: true },
    'Montego Bay':  { oktb: true },
    'Callao':       { oktb: true },
    'Cape Town':    { oktb: true },

    // ── Malta / Valletta — OKTB + Schengen (OKTB may substitute) ──────────
    'Malta':        { oktb: true, schengen: true },
    'Valletta':     { oktb: true, schengen: true },

    // ── Schengen ports ─────────────────────────────────────────────────────
    // Portugal
    'Lisbon':       { schengen: true },
    'Porto':        { schengen: true },
    'Funchal':      { schengen: true },
    // Italy
    'Ancona':       { schengen: true },
    'Cagliari':     { schengen: true },
    'Genoa':        { schengen: true },
    'Livorno':      { schengen: true },
    'Naples':       { schengen: true },
    'Palermo':      { schengen: true },
    'Rome':         { schengen: true },
    'Civitavecchia':{ schengen: true },
    // Spain
    'Alicante':     { schengen: true },
    'Algeciras':    { schengen: true },
    'Barcelona':    { schengen: true },
    'Bilbao':       { schengen: true },
    'Cadiz':        { schengen: true },
    'Gran Canaria': { schengen: true },
    'Malaga':       { schengen: true },
    'Marbella':     { schengen: true },
    'Santa Cruz':   { schengen: true },
    'Palma de Mallorca': { schengen: true },
    'Palma':        { schengen: true },
    'Tenerife':     { schengen: true },
    'La Coruña':    { schengen: true },
    'La Coruna':    { schengen: true },
    // Norway
    'Bergen':       { schengen: true },
    'Oslo':         { schengen: true },
    'Stavanger':    { schengen: true },
    'Olden':        { schengen: true },
    // Germany
    'Bremen':       { schengen: true },
    'Bremerhaven':  { schengen: true },
    'Hamburg':      { schengen: true },
    'Rostock':      { schengen: true },
    'Kiel':         { schengen: true },
    'Wilhelmshaven':{ schengen: true },
    // Belgium
    'Antwerp':      { schengen: true },
    'Antwerpen':    { schengen: true },
    'Zeebrugge':    { schengen: true },
    'Ghent':        { schengen: true },
    // Denmark
    'Aarhus':       { schengen: true },
    'Copenhagen':   { schengen: true },
    'Esbjerg':      { schengen: true },
    'Fredericia':   { schengen: true },
    'Helsingør':    { schengen: true },
    'Helsingor':    { schengen: true },
    'Odense':       { schengen: true },
    'Randers':      { schengen: true },
    'Skagen':       { schengen: true },
    // Estonia
    'Tallinn':      { schengen: true },
    'Paldiski':     { schengen: true },
    // Finland
    'Helsinki':     { schengen: true },
    'Turku':        { schengen: true },
    'Kotka':        { schengen: true },
    'Rauma':        { schengen: true },
    // Greece
    'Athens':       { schengen: true },
    'Piraeus':      { schengen: true },
    'Thessaloniki': { schengen: true },
    'Heraklion':    { schengen: true },
    'Iraklion':     { schengen: true },
    'Patras':       { schengen: true },
    'Volos':        { schengen: true },
    // Latvia
    'Riga':         { schengen: true },
    // Lithuania
    'Klaipeda':     { schengen: true },
    // Netherlands
    'Amsterdam':    { schengen: true },
    'Rotterdam':    { schengen: true },
    'IJmuiden':     { schengen: true },
    // France
    'Ajaccio':      { schengen: true },
    'Antibes':      { schengen: true },
    'Brest':        { schengen: true },
    'Cannes':       { schengen: true },
    'Cherbourg':    { schengen: true },
    'Le Havre':     { schengen: true },
    'Marseille':    { schengen: true },
    'Nice':         { schengen: true },
    'Paris':        { schengen: true },
    'Rouen':        { schengen: true },
    // Poland
    'Gdansk':       { schengen: true },
    'Gdynia':       { schengen: true },
    // Sweden
    'Gothenburg':   { schengen: true },
    'Helsingborg':  { schengen: true },
    'Stockholm':    { schengen: true },
    'Malmo':        { schengen: true },
    'Malmö':        { schengen: true },
    // Iceland (Schengen, not in PDF but confirmed zone)
    'Reykjavik':    { schengen: true },

    // ── Canada ─────────────────────────────────────────────────────────────
    'Quebec':       { canada: true },
    'Québec':       { canada: true },
  },
};

// Returns { c1d, mcv, nzeta, oktb, atv, schengen, notes } for a seafarer row.
// Values: 'Required' | 'Not Required' | 'Review'
function getVisaReqs(r) {
  const ship = (r.joiningShip || '').trim();
  const line = (r.cruiseLine  || '').trim();
  const port = (r.signOnPort  || '').trim();
  const notes = [];
  const isNtp = s => (s||'').trim().toLowerCase() === 'need to process';

  // Case-insensitive port lookup
  const portLo  = port.toLowerCase();
  const portKey = Object.keys(VISA_RULES.portRules).find(k => k.toLowerCase() === portLo) || '';
  const pr      = VISA_RULES.portRules[portKey] || {};

  // ── C1/D ─────────────────────────────────────────────────────────────────
  // Not Required overrides everything; then line rule; then ship rule
  let c1d;
  if (ship && VISA_RULES.c1dNotRequired.has(ship)) {
    c1d = 'Not Required';
  } else if (VISA_RULES.c1dLines.has(line) || (ship && VISA_RULES.c1dShips.has(ship))) {
    c1d = 'Required';
    notes.push('C1/D required');
  } else {
    c1d = 'Review';
  }

  // ── MCV ──────────────────────────────────────────────────────────────────
  const mcv = VISA_RULES.mcvLines.has(line) ? 'Required' : 'Review';
  if (mcv === 'Required') notes.push('MCV required');

  // ── NZeTA ────────────────────────────────────────────────────────────────
  let nzeta;
  if (port && VISA_RULES.nzetaCukPorts.has(port)) {
    nzeta = 'Not Required';
    notes.push('NZeTA: handled by CUK Onboarding (Auckland) — no crew action');
  } else if (ship && VISA_RULES.nzetaRequired.has(ship)) {
    nzeta = 'Required';
    notes.push('NZeTA required');
  } else {
    nzeta = 'Review';
  }

  // ── OKTB ─────────────────────────────────────────────────────────────────
  const oktb = pr.oktb ? 'Required' : 'Review';
  if (pr.oktb) {
    notes.push('OKTB required — ' + (portKey || port));
    if (pr.schengen) notes.push('Malta: OKTB can substitute for Schengen per policy');
  }

  // ── ATV ──────────────────────────────────────────────────────────────────
  const atv = pr.atv ? 'Required' : 'Review';
  if (pr.atv) notes.push('ATV required — ' + (portKey || port));

  // ── Schengen ─────────────────────────────────────────────────────────────
  const schengen = pr.schengen ? 'Required' : 'Review';
  if (pr.schengen && !pr.oktb) notes.push('Schengen required — ' + (portKey || port));

  // ── Canada ───────────────────────────────────────────────────────────────
  if (pr.canada) notes.push('Canada Visa required — ' + (portKey || port));

  // ── Zoho "Need to Process" flags ─────────────────────────────────────────
  if (isNtp(r.c1dStatus))   notes.push('C1/D: Need to Process in Zoho');
  if (isNtp(r.mcvStatus))   notes.push('MCV: Need to Process in Zoho');
  if (isNtp(r.oktbStatus))  notes.push('OKTB: Need to Process in Zoho');
  if (isNtp(r.nzetaStatus)) notes.push('NZeTA: Need to Process in Zoho');
  if (isNtp(r.atvStatus))   notes.push('ATV: Need to Process in Zoho');

  return { c1d, mcv, nzeta, oktb, atv, schengen, notes: notes.join(' · ') || '—' };
}

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

// Requisition Setup config is shared LIVE via the Cloudflare Worker (KV) so
// every user/device sees the same demand. localStorage is kept only as an
// offline mirror. `_demandCache` is the in-memory source of truth that keeps
// the many synchronous callers of loadDemand() working; it is hydrated from
// the server by hydrateDemand() when the Report page loads.
let _demandCache = null;
let _demandHydrated = false;

function _normalizeDemand(raw) {
  raw = raw || {};
  // Old shape stored months directly under brand → wrap in {talentPool,monthly}
  Object.keys(raw).forEach(brand => {
    const node = raw[brand];
    if (node && typeof node === 'object' && !node.monthly && !node.talentPool) {
      raw[brand] = { talentPool: {}, monthly: node };
    } else if (node) {
      node.talentPool = node.talentPool || {};
      node.monthly    = node.monthly    || {};
    }
  });
  migratePositionNames(raw); // rename legacy abbreviated position keys
  return raw;
}

function loadDemand() {
  if (_demandCache) return _demandCache;
  let raw;
  try { raw = JSON.parse(localStorage.getItem('cti-cruise-demand') || '{}'); }
  catch (_) { raw = {}; }
  _demandCache = _normalizeDemand(raw);
  return _demandCache;
}

function saveDemand(d) {
  _demandCache = d;
  try { localStorage.setItem('cti-cruise-demand', JSON.stringify(d)); } catch (_) {}
  // Push to the shared store (fire-and-forget) so other users see it.
  try {
    fetch(WORKER_URL + '/api/cruise/demand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demand: d }),
    }).catch(() => {});
  } catch (_) {}
}

// Pull the shared config from the worker once per page load. If the server is
// empty but this device has a local config (the person who set it up), seed
// the server from local so it becomes live for everyone.
async function hydrateDemand() {
  try {
    const res = await fetch(WORKER_URL + '/api/cruise/demand', { cache: 'no-store' });
    if (res.ok) {
      const data   = await res.json();
      const remote = data && data.demand;
      if (remote && typeof remote === 'object' && Object.keys(remote).length) {
        _demandCache = _normalizeDemand(remote);
        try { localStorage.setItem('cti-cruise-demand', JSON.stringify(_demandCache)); } catch (_) {}
        _demandHydrated = true;
        return true;
      }
    }
    // Server empty → seed from local if we have anything configured here.
    const local = loadDemand();
    if (local && Object.keys(local).length) saveDemand(local);
  } catch (_) { /* offline — fall back to local cache */ }
  _demandHydrated = true;
  return false;
}

// ── Shared app state (live via Worker KV) ────────────────────────────────────
// These stores used to be localStorage-only (per-device). They are now mirrored
// to localStorage (offline cache) AND pushed to the worker so every user/device
// shares them. An in-memory cache keeps the existing synchronous getters/setters
// working; ensureSharedState() pulls the server copies once before the first
// page renders. Personal preferences (theme/sidebar/page) and the per-device
// download history are intentionally NOT shared.
const SHARED_STORES = {
  heatmap:           'cti_cruise_heatmap',
  rpt_notes:         'cti_cruise_rpt_notes',
  pending_overrides: 'cti_cruise_pending_overrides',
  mistral_sent:      'cti_cruise_mistral_sent',
  sa_sent:           'cti_cruise_sa_sent',
};
const _sharedCache = {};

function _sharedLocalGet(store, fallback) {
  try {
    const raw = localStorage.getItem(SHARED_STORES[store]);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function sharedGet(store, fallback) {
  if (store in _sharedCache) return _sharedCache[store];
  const v = _sharedLocalGet(store, fallback);
  _sharedCache[store] = v;
  return v;
}
function sharedSet(store, value) {
  _sharedCache[store] = value;
  try { localStorage.setItem(SHARED_STORES[store], JSON.stringify(value)); } catch {}
  try {
    fetch(WORKER_URL + '/api/cruise/state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: store, value }),
    }).catch(() => {});
  } catch {}
}

let _sharedHydratePromise = null;
function ensureSharedState() {
  if (!_sharedHydratePromise) _sharedHydratePromise = hydrateSharedState();
  return _sharedHydratePromise;
}
// One-time: fold legacy per-brand note keys (cti_cruise_rpt_notes_<brand>) into
// the consolidated cti_cruise_rpt_notes object so existing notes aren't lost.
function _migrateLegacyRptNotes() {
  try {
    if (localStorage.getItem(SHARED_STORES.rpt_notes) != null) return;
    const consolidated = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cti_cruise_rpt_notes_')) {
        const slug  = k.slice('cti_cruise_rpt_notes_'.length);
        const brand = (typeof CRUISE_BRANDS !== 'undefined' ? CRUISE_BRANDS : [])
          .find(b => b.replace(/\s+/g, '_') === slug) || slug.replace(/_/g, ' ');
        const val = localStorage.getItem(k);
        if (val) consolidated[brand] = val;
      }
    }
    if (Object.keys(consolidated).length) {
      localStorage.setItem(SHARED_STORES.rpt_notes, JSON.stringify(consolidated));
    }
  } catch {}
}

async function hydrateSharedState() {
  _migrateLegacyRptNotes();
  await Promise.all(Object.keys(SHARED_STORES).map(async store => {
    try {
      const res = await fetch(WORKER_URL + '/api/cruise/state?key=' + encodeURIComponent(store), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.value != null) {
          _sharedCache[store] = data.value;
          try { localStorage.setItem(SHARED_STORES[store], JSON.stringify(data.value)); } catch {}
          return;
        }
      }
      // Server empty → seed from local if this device has anything.
      const local = _sharedLocalGet(store, null);
      const hasData = local != null && (typeof local !== 'object' || Object.keys(local).length);
      if (hasData) { _sharedCache[store] = local; sharedSet(store, local); }
    } catch { /* offline — keep local cache */ }
  }));
  // Rebuild module-level maps that were built from local at load time.
  _saSentIds = _loadSaSentIds();
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

  // Kick off both fetches in parallel — only fetch what is not yet cached.
  const needSF = !_seafarersCache;
  const needFI = !_finalIntCache;

  if (needSF || needFI) {
    const [sfRes, fiRes] = await Promise.all([
      needSF
        ? safeJson(WORKER_URL + '/api/cruise/seafarers').catch(e => { console.error('Seafarers fetch failed:', e); return null; })
        : Promise.resolve(null),
      needFI
        ? safeJson(WORKER_URL + '/api/cruise/final-interview').catch(e => { console.error('Final Interview fetch failed:', e); return null; })
        : Promise.resolve(null),
    ]);
    // Only cache a non-empty result — an empty/failed fetch is NOT cached so
    // the next call retries instead of permanently showing "No Seafarers".
    if (needSF && sfRes?.data?.length) _seafarersCache = sfRes.data;
    if (needFI && fiRes?.data?.length) _finalIntCache  = fiRes.data;
  }

  return { seafarers: _seafarersCache || [], finalInt: _finalIntCache || [] };
}

// ── CUK Mistral Request report ───────────────────────────────────────────────
const CUK_BRANDS = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];
// Column definitions — each: { label, field, zoho (API name for save), filter? }
const MISTRAL_COLUMNS = [
  { label:'Onboarding Status',     field:'onboardingStatus',    zoho:null,                   filterMS:true, sticky:true, w:130 },
  { label:'Seafarer ID Number',    field:'seafarerIdNumber',    zoho:'Crew_ID_Number',                      sticky:true, w:120 },
  { label:'Hired Date',            field:'hiredDate',           zoho:'Hired_Date',           type:'date',   sticky:true, w:100 },
  { label:'Seafarer Name',         field:'fullName',            zoho:null,                                  sticky:true, w:160 },
  { label:'Position Hired',        field:'positionHired',       zoho:'Position_Applied' },
  { label:'Cruise Line',           field:'cruiseLine',          zoho:'Cruise_Line',          filterMS:true },
  { label:'Place of Birth',        field:'placeOfBirth',        zoho:'Place_of_Birth' },
  { label:'Date of Birth',         field:'dateOfBirth',         zoho:'Date_of_Birth',        type:'date' },
  { label:'Gender',                field:'gender',              zoho:'Gender',               filterMS:true },
  { label:'Marital Status',        field:'maritalStatus',       zoho:'Marital_Status' },
  { label:'Email',                 field:'email',               zoho:'Email' },
  { label:'Mobile',                field:'phone',               zoho:'Mobile' },
  { label:'Passport Number',       field:'passportNumber',      zoho:'Passport_Number' },
  { label:'Passport Issued Date',  field:'passportIssuedDate',  zoho:'Passport_Issued_Date', type:'date' },
  { label:'Passport Expired Date', field:'passportExpiredDate', zoho:'Passport_Expired_Date',type:'date' },
  { label:'Passport Issued Place', field:'passportIssuedPlace', zoho:'Passport_Issued_Place' },
  { label:'Passport Issued Nation',field:'passportIssuedNation',zoho:'Passport_Issued_Country' },
  { label:'Hair Color',            field:'hairColor',           zoho:'Hair_Color' },
  { label:'Height',                field:'height',              zoho:'Height',               type:'number' },
  { label:'Eye Color',             field:'eyeColor',            zoho:'Eye_Color' },
  { label:'Weight',                field:'weight',              zoho:'Weight',               type:'number' },
  { label:'Country',               field:'country',             zoho:'Country' },
  { label:'City',                  field:'city',                zoho:'City' },
  { label:'State/Province',        field:'state',               zoho:'State' },
  { label:'Street',                field:'street',              zoho:'Street' },
  { label:'Postal Code',           field:'postalCode',          zoho:'Zip_Code' },
  { label:'Gateway Airport',       field:'gatewayAirport',      zoho:'Gateway_Airport' },
  // ── Next of Kin ──
  { label:'Relationship to Seafarer',     field:'relationshipToCrew', zoho:'Relationship_to_Crew',          section:'Next of Kin' },
  { label:'Emergency Contact Full Name',  field:'emergencyName',      zoho:'Emergency_Contact_Name' },
  { label:'Emergency Contact Phone Number', field:'emergencyPhone',   zoho:'Emergency_Contact' },
  { label:'Emergency Contact City',       field:'emergencyCity',      zoho:'Emergency_Contact_City' },
  { label:'Emergency Contact Street Address', field:'emergencyStreet', zoho:'Emergency_Contact_Street_Address' },
];
// Sticky-column offsets for the Mistral table.
// Front fixed columns: Action (160px) + Last Sent (80px) = 240px before data columns.
const MISTRAL_FRONT_WIDTH = 240;
const _MISTRAL_STICKY = MISTRAL_COLUMNS.filter(c => c.sticky);
const MISTRAL_LAST_STICKY = _MISTRAL_STICKY.length ? _MISTRAL_STICKY[_MISTRAL_STICKY.length - 1].field : null;
function mistralStickyLeft(field) {
  let left = MISTRAL_FRONT_WIDTH;
  for (const c of MISTRAL_COLUMNS) {
    if (!c.sticky) break;
    if (c.field === field) return left;
    left += c.w;
  }
  return left;
}
function cleanVal(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return (s === '—') ? '' : s;
}
// Hired seafarers in CUK brands with no Seafarer ID yet. Resigned always excluded.
// opts: { from:'YYYY-MM-DD', to:'YYYY-MM-DD' }
function mistralRequestRows(seafarers, opts = {}) {
  const from = opts.from ? new Date(opts.from) : null;
  const to   = opts.to   ? new Date(opts.to)   : null;
  if (to) to.setHours(23, 59, 59, 999);
  return seafarers.filter(s => {
    if (!CUK_BRANDS.includes((s.cruiseLine || '').trim())) return false;
    if (s.seafarerIdNumber && String(s.seafarerIdNumber).trim()) return false;  // already has ID
    if (!s.hiredDate) return false;   // must be hired
    const ob = (s.onboardingStatus || '').trim().toLowerCase();
    if (ob === 'resign' || ob === 'resigned') return false;
    const d = new Date(s.hiredDate);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }).sort((a, b) => new Date(a.hiredDate) - new Date(b.hiredDate));
}

// ── Editable recruiting notes — shared live (one object: brand → text) ────────
function _loadReportNote(brand) {
  const all = sharedGet('rpt_notes', {}) || {};
  const v = all[brand];
  return (v == null || v === '') ? null : v;
}
function _saveReportNote(brand, text) {
  const all = { ...(sharedGet('rpt_notes', {}) || {}) };
  all[brand] = text;
  sharedSet('rpt_notes', all);
}

const _reportNotes = {};   // brand -> raw textarea string (runtime cache, backed by localStorage)
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
// TASK PAGE — cruise data maintenance (Duplicate Checker)
// ═════════════════════════════════════════════════════════════════════════════
pages.task = async function () {
  return `
    <div class="req-page-header">
      <h1>Task</h1>
      <span class="req-page-sub">Data maintenance &amp; utilities</span>
    </div>

    <div class="task-layout">
      <nav class="task-tabbar">
        <button class="task-sub-link active" data-section="duplicate">Duplicate Checker</button>
        <button class="task-sub-link" data-section="rts">Check Report to Ship</button>
      </nav>

      <div class="task-content">

        <!-- ═══ Check Report to Ship ═══ -->
        <section class="task-section" data-section="rts" style="display:none;">
          <div class="card" style="padding:22px 26px;">
            <div style="margin-bottom:16px;">
              <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px;">Check Report to Ship</div>
              <div style="font-size:12.5px;color:var(--text-muted,#888);">
                Seafarers whose sign-on date has passed but onboarding status is not yet Report to Ship.
              </div>
            </div>

            <!-- Filters + Export -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:600;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:0.06em;flex-shrink:0;">Sign On Date</span>
              ${buildMS('rtsMonthFilter','Month',['January','February','March','April','May','June','July','August','September','October','November','December'])}
              <select id="rtsYearFilter"
                style="height:30px;border:1px solid var(--border,#ddd);border-radius:6px;padding:0 20px 0 8px;font-size:11px;font-family:inherit;min-width:80px;
                  background:var(--card-bg,#fff) url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 6px center;
                  background-size:8px;color:var(--text);cursor:pointer;appearance:none;-webkit-appearance:none;">
                <option value="">All Years</option>
                ${[2024,2025,2026,2027].map(y=>`<option value="${y}" ${y===new Date().getFullYear()?'selected':''}>${y}</option>`).join('')}
              </select>

              <span style="width:1px;height:20px;background:var(--border,#ddd);flex-shrink:0;"></span>

              ${buildMS('rtsCruiseFilter', 'Cruise Line', ALL_CRUISE_LINES)}

              <span id="rtsCount" style="font-size:12px;color:var(--text-muted,#888);flex:1;"></span>

              <button id="rtsExportBtn"
                style="display:inline-flex;align-items:center;gap:7px;padding:7px 16px;font-size:12px;font-weight:600;
                  border:none;border-radius:7px;background:#2D7A55;color:#fff;cursor:pointer;font-family:inherit;
                  flex-shrink:0;transition:opacity 0.15s;"
                onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Excel
              </button>
              <button id="rtsEmailBtn"
                style="display:inline-flex;align-items:center;gap:7px;padding:7px 16px;font-size:12px;font-weight:600;
                  border:none;border-radius:7px;background:#1B3A6B;color:#fff;cursor:pointer;font-family:inherit;
                  flex-shrink:0;transition:opacity 0.15s;"
                onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Send Follow-up Email
              </button>
            </div>

            <!-- Table (header + body injected by rtsApply) -->
            <div style="overflow-x:auto;max-height:560px;overflow-y:auto;" id="rtsTableWrap">
              <table style="width:100%;border-collapse:collapse;min-width:1400px;" id="rtsTable">
                <thead style="position:sticky;top:0;z-index:2;" id="rtsThead"></thead>
                <tbody id="rtsBody">
                  <tr><td colspan="12" style="padding:32px;text-align:center;color:var(--text-muted,#888);font-size:13px;">
                    Loading seafarer data…
                  </td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="task-section" data-section="duplicate">
          <div class="card" id="dupCheckerCard" style="padding:28px 32px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;
              margin-bottom:24px;flex-wrap:wrap;gap:16px;padding-bottom:20px;border-bottom:1px solid var(--border,#eee);">
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px;letter-spacing:-0.01em;">
                  Duplicate Checker
                </div>
                <div style="font-size:12.5px;color:var(--text-muted,#888);">
                  Scan the Seafarer (Candidate) module for duplicate records.
                </div>
              </div>
              <button id="dupRunBtn"
                style="padding:10px 22px;font-size:13px;font-weight:600;border-radius:8px;
                  background:#B01A18;color:#fff;border:none;cursor:pointer;font-family:inherit;
                  display:inline-flex;align-items:center;gap:8px;">
                <svg id="dupRunBtnIcon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4"/>
                </svg>
                <span id="dupRunBtnLabel">Run Check</span>
              </button>
            </div>

            <div style="margin-bottom:24px;">
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;
                color:var(--text-muted,#888);margin-bottom:12px;">Match Criteria</div>
              <div style="display:flex;gap:28px;flex-wrap:wrap;">
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text);">
                  <input type="checkbox" id="dupByEmail" checked style="width:15px;height:15px;accent-color:#B01A18;cursor:pointer;">
                  Email Address
                </label>
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text);">
                  <input type="checkbox" id="dupByPhone" style="width:15px;height:15px;accent-color:#B01A18;cursor:pointer;">
                  Phone Number
                </label>
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text);">
                  <input type="checkbox" id="dupByName" style="width:15px;height:15px;accent-color:#B01A18;cursor:pointer;">
                  Full Name
                </label>
              </div>
            </div>

            <div id="dupResults">
              <div style="text-align:center;padding:40px 0;color:var(--text-muted,#aaa);font-size:13px;">
                Select criteria above and click <strong style="color:var(--text);">Run Check</strong> to scan for duplicates.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>`;
};

pageEvents.task = function () {

  // ── Tab switching ──────────────────────────────────────────────────────────
  document.querySelectorAll('.task-tabbar .task-sub-link[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.task-tabbar .task-sub-link[data-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.task-content .task-section[data-section]').forEach(sec => {
        sec.style.display = sec.dataset.section === btn.dataset.section ? '' : 'none';
      });
      if (btn.dataset.section === 'rts') rtsApply();
    });
  });

  // ── Check Report to Ship ───────────────────────────────────────────────────
  const CTI_LINE_ANALYTICS = {
    'CTI Group Bangkok':      'CTI Bangkok',
    'CTI Group Myanmar':      'CTI Myanmar',
    'CTI Group Vietnam':      'CTI Vietnam',
    'CTI Group MCSI':         'CTI MCSI',
    'CTI Partner Kendrick':   'CTI Indonesia',
    'CTI Group South Africa': 'CTI Indonesia',
  };
  function getCtiAnal(ctiOffice) {
    return CTI_LINE_ANALYTICS[ctiOffice] || (ctiOffice || '—');
  }

  // ── Account Manager email routing ─────────────────────────────────────────
  const RTS_AM_EMAIL = {
    'stri.ratna@cti-usa.com':    ['Carnival Cruise Line','Marella Cruises','Norwegian Cruise Line','Oceania Cruises','Regent Seven Seas','Viking Cruises','Virgin Voyages','TUI River Cruises','Margaritaville at Sea'],
    'cuk-onboarding@cti-usa.com':['CUK Maritime','Cunard Line','P&O Cruises'],
    'thailand@cti-usa.com':      ['Holland America Line','Four Seasons Yachts','Heinemann Americas','Seabourn'],
  };
  // Reverse map: cruise line → email
  const RTS_LINE_TO_EMAIL = {};
  Object.entries(RTS_AM_EMAIL).forEach(([email, lines]) => lines.forEach(l => RTS_LINE_TO_EMAIL[l] = email));

  async function rtsEmail() {
    const base = getRtsBaseRows();
    const rows = base.filter(r => {
      for (const [f, v] of Object.entries(rtsColFilters)) {
        if (!v) continue;
        if (!String(r[f]||'').toLowerCase().includes(v.toLowerCase())) return false;
      }
      return true;
    });
    if (!rows.length) { alert('No data to email with current filters.'); return; }

    // Group by account manager email (one email per AM, listing all their cruise lines)
    const groups = {};
    rows.forEach(r => {
      const email = RTS_LINE_TO_EMAIL[r.cruiseLine];
      if (!email) return;
      if (!groups[email]) groups[email] = { email, lineMap: {} };
      if (!groups[email].lineMap[r.cruiseLine]) groups[email].lineMap[r.cruiseLine] = 0;
      groups[email].lineMap[r.cruiseLine]++;
    });
    const unrouted = rows.filter(r => !RTS_LINE_TO_EMAIL[r.cruiseLine]);

    if (!Object.keys(groups).length) {
      alert('No account manager email found for the selected cruise lines.'); return;
    }

    // Get month/year label from filters
    const moVals = msGetVals('rtsMonthFilter');
    const yrVal  = document.getElementById('rtsYearFilter')?.value;
    const monthYear = [
      moVals.length ? moVals.join(', ') : null,
      yrVal || null,
    ].filter(Boolean).join(' ') || new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});

    // Show confirm modal
    const overlay = document.createElement('div');
    overlay.id = 'rtsEmailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99995;display:flex;align-items:center;justify-content:center;font-family:inherit;';

    const groupList = Object.values(groups).map(g => {
      const totalCount = Object.values(g.lineMap).reduce((s,n)=>s+n,0);
      const lineRows = Object.entries(g.lineMap).sort((a,b)=>b[1]-a[1])
        .map(([l,n])=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;color:var(--text,#1A1A1A);">
          <span>${escH(l)}</span><span style="font-weight:600;">${n} pending</span></div>`).join('');
      const statusKey = btoa(g.email).replace(/[^a-z0-9]/gi,'');
      return `<div style="border:1px solid var(--border,#e5e7eb);border-radius:8px;padding:12px 14px;margin-bottom:8px;background:var(--card-bg,#fff);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text,#1A1A1A);">${escH(g.email)}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">${totalCount} seafarer${totalCount!==1?'s':''} across ${Object.keys(g.lineMap).length} cruise line${Object.keys(g.lineMap).length!==1?'s':''}</div>
          </div>
          <span id="rts-status-${statusKey}" style="font-size:11px;color:var(--text-muted,#888);flex-shrink:0;">Pending</span>
        </div>
        <div style="border-top:1px solid var(--border,#f0f0f0);padding-top:8px;">${lineRows}</div>
      </div>`;
    }).join('');

    overlay.innerHTML = `
      <div style="background:var(--card-bg,#fff);border-radius:14px;padding:24px 26px;width:520px;max-height:80vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.22);">
        <div style="font-size:15px;font-weight:700;color:var(--text,#1A1A1A);margin-bottom:4px;">Send Follow-up Emails</div>
        <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:16px;">
          Period: <strong>${escH(monthYear)}</strong> · ${rows.length} seafarers · ${Object.keys(groups).length} email${Object.keys(groups).length!==1?'s':''}
        </div>
        ${groupList}
        ${unrouted.length ? `<div style="font-size:11.5px;color:#D97706;margin-bottom:12px;">⚠ ${unrouted.length} record${unrouted.length!==1?'s':''} have no mapped account manager.</div>` : ''}
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid var(--border,#eee);">
          <button id="rtsEmailClose" style="padding:7px 16px;font-size:12px;font-weight:600;border:1px solid var(--border,#ddd);border-radius:7px;background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="rtsEmailConfirm" style="padding:7px 20px;font-size:12px;font-weight:600;border:none;border-radius:7px;background:#1B3A6B;color:#fff;cursor:pointer;font-family:inherit;">Send All Emails</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('rtsEmailClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('rtsEmailConfirm').addEventListener('click', async () => {
      const confirmBtn = document.getElementById('rtsEmailConfirm');
      const cancelBtn  = document.getElementById('rtsEmailClose');
      confirmBtn.textContent = 'Sending…'; confirmBtn.disabled = true;
      cancelBtn.disabled = true;

      let sent = 0, failed = 0;
      for (const g of Object.values(groups)) {
        const statusKey = btoa(g.email).replace(/[^a-z0-9]/gi,'');
        const statusEl = document.getElementById('rts-status-' + statusKey);
        if (statusEl) { statusEl.textContent = 'Sending…'; statusEl.style.color = '#D97706'; }
        // Build cruise lines array [{name, count}]
        const cruiseLines = Object.entries(g.lineMap).sort((a,b)=>b[1]-a[1])
          .map(([name, count]) => ({ name, count }));
        const totalCount = cruiseLines.reduce((s,c)=>s+c.count, 0);
        try {
          const res = await fetch(WORKER_URL + '/api/cruise/send-rts-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: g.email, cruiseLines, monthYear, count: totalCount }),
          });
          const data = await res.json();
          if (data.ok) {
            sent++;
            if (statusEl) { statusEl.textContent = '✓ Sent'; statusEl.style.color = '#2D7A55'; }
          } else {
            failed++;
            if (statusEl) { statusEl.textContent = '✗ Failed'; statusEl.style.color = '#B01A18'; }
          }
        } catch (_) {
          failed++;
          if (statusEl) { statusEl.textContent = '✗ Error'; statusEl.style.color = '#B01A18'; }
        }
      }

      confirmBtn.textContent = `Done — ${sent} sent${failed?' · '+failed+' failed':''}`;
      confirmBtn.style.background = failed ? '#B01A18' : '#2D7A55';
      setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 3000);
    });
  }

  // Column definitions
  const RTS_COLS = [
    { label:'Employment Status',  field:'employmentStatus',  filterType:'select' },
    { label:'Onboarding Status',  field:'onboardingStatus',  filterType:'select' },
    { label:'First Name',         field:'firstName',         filterType:'text'   },
    { label:'Last Name',          field:'lastName',          filterType:'text'   },
    { label:'Crew ID',            field:'seafarerIdNumber',  filterType:'text'   },
    { label:'Position Hired',     field:'positionHired',     filterType:'select' },
    { label:'Joining Ship',       field:'joiningShip',       filterType:'select' },
    { label:'Sign On Date',       field:'signOnDate',        filterType:'none'   },
    { label:'Sign On Port',       field:'signOnPort',        filterType:'select' },
    { label:'Cruise Line',        field:'cruiseLine',        filterType:'select' },
    { label:'CTI Office',         field:'ctiOffice',         filterType:'select' },
    { label:'CTI Line Analytics', field:'_analytics',        filterType:'select' },
  ];

  let rtsSortF = null, rtsSortD = 1;
  let rtsColFilters = {}; // field → value

  const TH_BASE = 'padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;' +
    'text-transform:uppercase;color:var(--text-muted,#888);background:var(--bg-page,#fafafa);' +
    'border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;';
  const TF_BASE = 'padding:3px 6px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);';
  const SEL_STYLE = 'width:100%;height:24px;font-size:10px;padding:0 4px;border:1px solid var(--border,#ddd);' +
    'border-radius:4px;background:var(--card-bg,#fff);color:var(--text);font-family:inherit;';
  const TXT_STYLE = 'width:100%;height:24px;font-size:10px;padding:0 6px;border:1px solid var(--border,#ddd);' +
    'border-radius:4px;background:var(--card-bg,#fff);color:var(--text);font-family:inherit;box-sizing:border-box;outline:none;';

  const RTS_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function getRtsBaseRows() {
    const today   = new Date(); today.setHours(0,0,0,0);
    const moVals  = msGetVals('rtsMonthFilter').map(m => RTS_MONTH_NAMES.indexOf(m)).filter(i => i !== -1);
    const yrVal   = document.getElementById('rtsYearFilter')?.value;
    const clVals  = msGetVals('rtsCruiseFilter');
    const EXCL    = new Set(['report to ship','resign','resigned']);
    return _sfRows.filter(r => {
      if (!r.signOnDate || r.signOnDate === '—') return false;
      const d = new Date(r.signOnDate);
      if (isNaN(d.getTime()) || d >= today) return false;
      if (EXCL.has((r.onboardingStatus||'').trim().toLowerCase())) return false;
      if (moVals.length && !moVals.includes(d.getMonth())) return false;
      if (yrVal && d.getFullYear() !== +yrVal) return false;
      if (clVals.length && !clVals.includes(r.cruiseLine)) return false;
      return true;
    }).map(r => ({ ...r, _analytics: getCtiAnal(r.ctiOffice) }));
  }

  function rtsExport() {
    if (typeof XLSX === 'undefined') { alert('Excel library not loaded. Please refresh the page.'); return; }
    const base = getRtsBaseRows();
    // Apply column filters too
    const rows = base.filter(r => {
      for (const [f, v] of Object.entries(rtsColFilters)) {
        if (!v) continue;
        if (!String(r[f]||'').toLowerCase().includes(v.toLowerCase())) return false;
      }
      return true;
    });
    if (!rows.length) { alert('No data to export with the current filters.'); return; }

    const moVal  = document.getElementById('rtsMonthFilter')?.value;
    const yrVal  = document.getElementById('rtsYearFilter')?.value;
    const clVals = msGetVals('rtsCruiseFilter');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const clPart = clVals.length ? clVals.map(c=>c.replace(/\s+/g,'_')).join('+') : 'All';
    const suffix = [clPart, moVal !== '' && moVal != null ? MONTHS[+moVal] : 'All', yrVal || 'All'].join('_');

    const headers = ['Employment Status','Onboarding Status','First Name','Last Name',
      'Crew ID','Position Hired','Joining Ship','Sign On Date','Sign On Port',
      'Cruise Line','CTI Office','CTI Line Analytics'];

    const data = [headers, ...rows.map(r => [
      r.employmentStatus||'', r.onboardingStatus||'',
      r.firstName||'', r.lastName||'', r.seafarerIdNumber||'',
      r.positionHired||'', r.joiningShip||'', r.signOnDate||'',
      r.signOnPort||'', r.cruiseLine||'', r.ctiOffice||'', r._analytics||'',
    ])];

    const ws = XLSX.utils.aoa_to_sheet(data);
    // Column widths
    ws['!cols'] = [18,18,14,14,12,20,18,12,14,16,20,18].map(w=>({wch:w}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Check RTS');
    XLSX.writeFile(wb, `Check_RTS_${suffix}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function getUniq(rows, field) {
    return [...new Set(rows.map(r => r[field]||'').filter(Boolean))].sort();
  }

  function rtsApply() {
    const thead  = document.getElementById('rtsThead');
    const tbody  = document.getElementById('rtsBody');
    const countEl= document.getElementById('rtsCount');
    if (!thead || !tbody) return;

    const base = getRtsBaseRows();

    // Build select options once (from base rows before column filters)
    const opts = {};
    RTS_COLS.forEach(c => { if (c.filterType === 'select') opts[c.field] = getUniq(base, c.field); });

    // Apply column filters
    let rows = base.filter(r => {
      for (const [f, v] of Object.entries(rtsColFilters)) {
        if (!v) continue;
        const rv = String(r[f]||'').toLowerCase();
        if (!rv.includes(v.toLowerCase())) return false;
      }
      return true;
    });

    // Sort
    if (rtsSortF) {
      rows = rows.slice().sort((a, b) => {
        const av = String(a[rtsSortF]||''), bv = String(b[rtsSortF]||'');
        return av.localeCompare(bv, undefined, {numeric:true}) * rtsSortD;
      });
    }

    if (countEl) countEl.textContent = `${rows.length} record${rows.length!==1?'s':''}`;

    // ── Build sort header row ──────────────────────────────────────────────
    thead.innerHTML = `
      <tr id="rtsSortRow">
        ${RTS_COLS.map(c => {
          const isActive = rtsSortF === c.field;
          const icon = !isActive ? '⇅' : rtsSortD > 0 ? '↑' : '↓';
          return `<th data-rtsfield="${c.field}"
            style="${TH_BASE}cursor:pointer;user-select:none;${isActive?'color:var(--text);':''}"
          >${c.label} <span class="rts-sort-icon" style="font-size:9px;">${icon}</span></th>`;
        }).join('')}
      </tr>
      <tr id="rtsFilterRow">
        ${RTS_COLS.map(c => {
          const curVal = rtsColFilters[c.field] || '';
          if (c.filterType === 'none') return `<th style="${TF_BASE}"></th>`;
          if (c.filterType === 'text') return `<th style="${TF_BASE}">
            <input class="rts-col-f" data-rtsfield="${c.field}" type="text" placeholder="—"
              value="${escH(curVal)}" style="${TXT_STYLE}">
          </th>`;
          // select
          return `<th style="${TF_BASE}">
            <select class="rts-col-f" data-rtsfield="${c.field}" style="${SEL_STYLE}">
              <option value="">All</option>
              ${(opts[c.field]||[]).map(v => `<option value="${escH(v)}"${v===curVal?'selected':''}>${escH(v)}</option>`).join('')}
            </select>
          </th>`;
        }).join('')}
      </tr>`;

    // Wire sort
    document.querySelectorAll('#rtsSortRow th[data-rtsfield]').forEach(th => {
      th.addEventListener('click', () => {
        const f = th.dataset.rtsfield;
        if (rtsSortF === f) rtsSortD *= -1; else { rtsSortF = f; rtsSortD = 1; }
        rtsApply();
      });
    });
    // Wire column filters
    document.querySelectorAll('.rts-col-f').forEach(el => {
      el.addEventListener(el.tagName==='INPUT'?'input':'change', () => {
        rtsColFilters[el.dataset.rtsfield] = el.value;
        rtsApply();
      });
    });

    // ── Build body ─────────────────────────────────────────────────────────
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${RTS_COLS.length}" style="padding:32px;text-align:center;
        color:var(--text-muted,#888);font-size:13px;">No overdue records found.</td></tr>`;
      return;
    }

    const td = (v, extra='') =>
      `<td style="padding:6px 10px;border-bottom:1px solid var(--border,#f0f0f0);font-size:12px;white-space:nowrap;${extra}">${v||'—'}</td>`;

    tbody.innerHTML = rows.map(r => {
      const onbColor = {'completing documents':'#D97706','rescheduled':'#B87A14'}[
        (r.onboardingStatus||'').toLowerCase()] || '#6B7280';
      return `<tr>
        ${td(escH(r.employmentStatus||'—'))}
        ${td(`<span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;
          background:${onbColor}20;color:${onbColor};border:1px solid ${onbColor}40;">
          ${escH(r.onboardingStatus||'—')}</span>`)}
        ${td(escH(r.firstName||'—'))}
        ${td(escH(r.lastName||'—'))}
        ${td(escH(r.seafarerIdNumber||'—'))}
        ${td(escH(r.positionHired||'—'))}
        ${td(escH(r.joiningShip||'—'))}
        ${td(`<span style="color:#B01A18;font-weight:600;">${escH(r.signOnDate||'—')}</span>`)}
        ${td(escH(r.signOnPort||'—'))}
        ${td(sfCruiseBadge(r.cruiseLine))}
        ${td(escH(r.ctiOffice||'—'))}
        ${td(escH(r._analytics||'—'))}
      </tr>`;
    }).join('');
  }

  initMS(); // initialize multiselects in Task page
  msOnChange('rtsCruiseFilter', rtsApply);
  msOnChange('rtsMonthFilter', rtsApply);
  document.getElementById('rtsYearFilter')?.addEventListener('change', rtsApply);
  document.getElementById('rtsExportBtn')?.addEventListener('click', rtsExport);
  document.getElementById('rtsEmailBtn')?.addEventListener('click', rtsEmail);
  rtsApply();

  // ── Duplicate Checker ──────────────────────────────────────────────────────
  const btn       = document.getElementById('dupRunBtn');
  const btnIcon   = document.getElementById('dupRunBtnIcon');
  const btnLabel  = document.getElementById('dupRunBtnLabel');
  const resultsEl = document.getElementById('dupResults');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const byEmail = document.getElementById('dupByEmail')?.checked;
    const byPhone = document.getElementById('dupByPhone')?.checked;
    const byName  = document.getElementById('dupByName')?.checked;

    if (!byEmail && !byPhone && !byName) {
      resultsEl.innerHTML = `<div style="padding:12px 14px;background:rgba(176,26,24,0.07);
        border:1px solid rgba(176,26,24,0.2);border-radius:8px;color:#B01A18;font-size:13px;">
        ⚠ Please select at least one match criterion.
      </div>`;
      return;
    }

    btn.disabled = true;
    btn.style.opacity = '0.75';
    btnIcon.outerHTML = `<span id="dupRunBtnIcon" style="width:13px;height:13px;
      border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;
      display:inline-block;animation:spin 0.65s linear infinite;"></span>`;
    btnLabel.textContent = 'Scanning…';
    resultsEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:24px 0;color:var(--text-muted,#888);font-size:13px;">
        <div style="width:18px;height:18px;border:2.5px solid var(--border,#ddd);border-top-color:#B01A18;border-radius:50%;animation:spin 0.65s linear infinite;flex-shrink:0;"></div>
        Fetching Seafarer records…
      </div>`;

    try {
      const { seafarers } = await fetchCruiseData(false);
      const allRows = seafarers || [];
      if (!allRows.length) {
        resultsEl.innerHTML = `<div style="text-align:center;padding:28px 0;color:var(--text-muted,#aaa);font-size:13px;">No records returned.</div>`;
        return;
      }

      const normEmail = v => (v || '').toLowerCase().trim().replace(/\s+/g,'');
      const normPhone = v => (v || '').replace(/\D/g,'');
      const normName  = r => (`${r.firstName||''} ${r.lastName||''}`).toLowerCase().trim().replace(/\s+/g,' ');

      function findGroups(rows, keyFn, label) {
        const map = new Map();
        rows.forEach(r => {
          const k = keyFn(r);
          if (!k || k === '—') return;
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(r);
        });
        const out = [];
        map.forEach((members, key) => { if (members.length >= 2) out.push({ key, label, members }); });
        return out;
      }

      const allGroups = [];
      const seenKeys  = new Set();
      const addGroups = gs => gs.forEach(g => {
        const sig = g.label + '|' + g.members.map(r => r.id).sort().join(',');
        if (!seenKeys.has(sig)) { seenKeys.add(sig); allGroups.push(g); }
      });
      if (byEmail) addGroups(findGroups(allRows, r => normEmail(r.email), 'Email'));
      if (byPhone) addGroups(findGroups(allRows, r => normPhone(r.phone), 'Phone'));
      if (byName)  addGroups(findGroups(allRows, r => normName(r),         'Name'));

      const totalDups = allGroups.reduce((s, g) => s + g.members.length, 0);
      if (!allGroups.length) {
        resultsEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;padding:20px 18px;
            background:rgba(45,122,85,0.07);border:1px solid rgba(45,122,85,0.22);border-radius:10px;">
            <span style="font-size:28px;">✅</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:#2D7A55;margin-bottom:4px;">No duplicates found</div>
              <div style="font-size:12px;color:var(--text-muted,#888);">
                Scanned ${allRows.length.toLocaleString()} seafarer records.
              </div>
            </div>
          </div>`;
        return;
      }

      // ── Helpers ──
      const filled = v => v && v !== '—' && v !== '' && v !== null;
      function dupScore(r) {
        let s = 0;
        ['firstName','lastName','email','phone','country','dateOfBirth','gender','passportNumber']
          .forEach(f => { if (filled(r[f])) s += 1; });
        if (filled(r.positionHired))    s += 2;
        if (filled(r.cruiseLine))       s += 2;
        if (filled(r.hiredDate))        s += 2;
        if (filled(r.seafarerIdNumber)) s += 3;          // having a Mistral ID = more established
        if (filled(r.onboardingStatus) && r.onboardingStatus !== 'Applicant') s += 2;
        if (r.createdTime) {
          const ageDays = (Date.now() - new Date(r.createdTime).getTime()) / 86400000;
          if (ageDays > 0) s += Math.min(Math.floor(ageDays / 60), 6);
        }
        return s;
      }
      const recBadge = rec => {
        const m = {
          KEEP:   { c:'#2D7A55', l:'KEEP' },
          DELETE: { c:'#B01A18', l:'DELETE' },
          REVIEW: { c:'#B87A14', l:'REVIEW' },
        }[rec];
        return `<span style="font-size:10px;font-weight:800;padding:3px 9px;border-radius:10px;
          background:${m.c}18;color:${m.c};border:1px solid ${m.c}40;letter-spacing:0.06em;white-space:nowrap;">${m.l}</span>`;
      };
      const cruiseBadge = c => {
        if (!c || c === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
        const map = { 'Cunard Line':'#1B3A6B','P&O Cruises':'#2D7A55','CUK Maritime':'#B87A14' };
        const col = map[c] || '#6B7280';
        return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
          background:${col}18;color:${col};border:1px solid ${col}30;white-space:nowrap;">${escH(c)}</span>`;
      };
      const onbBadge = s => {
        if (!s) return '<span style="color:var(--text-muted,#aaa);">—</span>';
        const map = {
          'Completing Documents':'#B87A14',
          'Ready to Go':'#2D7A55',
          'Rescheduled':'#7C3AED',
          'Resign':'#6B7280','Resigned':'#6B7280',
          'Applicant':'#1B3A6B',
        };
        const col = map[s] || '#6B7280';
        return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
          background:${col}18;color:${col};border:1px solid ${col}30;white-space:nowrap;">${escH(s)}</span>`;
      };
      const processAge = r => {
        if (!r.createdTime) return '—';
        const created  = new Date(r.createdTime);
        const modified = r.modifiedTime ? new Date(r.modifiedTime) : new Date();
        const days     = Math.max(1, Math.round((modified - created) / 86400000));
        if (days < 31)  return `${days}d`;
        if (days < 365) return `${Math.round(days/30)}mo`;
        return `${(days/365).toFixed(1)}y`;
      };
      const fmtCreated = t => {
        if (!t) return '—';
        const d = new Date(t); if (isNaN(d)) return '—';
        return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
      };
      const fmtDOB = v => {
        if (!v) return '—';
        const d = new Date(v); if (isNaN(d)) return escH(v);
        return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      };
      const dupEmail = e => e
        ? `<a href="mailto:${escH(e)}" style="color:#B01A18;text-decoration:none;">${escH(e)}</a>`
        : `<span style="color:var(--text-muted,#aaa);">—</span>`;
      const dupPhone = p => p
        ? `<a href="tel:${escH(String(p).replace(/\s+/g,''))}" style="color:var(--text);text-decoration:none;white-space:nowrap;font-variant-numeric:tabular-nums;">${escH(p)}</a>`
        : `<span style="color:var(--text-muted,#aaa);">—</span>`;

      // Annotate each group
      allGroups.forEach(g => {
        g.members.forEach(r => { r._dupScore = dupScore(r); });
        g.members.sort((a, b) => b._dupScore - a._dupScore);
        const top = g.members[0]._dupScore;
        g.members.forEach((r, i) => {
          if (i === 0) r._dupRec = 'KEEP';
          else if (i === g.members.length - 1 && (top - r._dupScore) >= 3) r._dupRec = 'DELETE';
          else r._dupRec = 'REVIEW';
        });
      });
      let recDelete = 0, recReview = 0;
      allGroups.forEach(g => g.members.forEach(r => {
        if (r._dupRec === 'DELETE') recDelete++;
        else if (r._dupRec === 'REVIEW') recReview++;
      }));

      // ── Build HTML ──
      const COLS = ['Recommend','Score','Crew ID','Name','Cruise Line','Position Hired','Onboarding','Created','Process Age','Email','Phone','DOB'];
      let html = `
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px;">
          <div style="padding:12px 18px;background:rgba(176,26,24,0.07);border:1px solid rgba(176,26,24,0.18);border-radius:10px;text-align:center;min-width:100px;">
            <div style="font-size:22px;font-weight:800;color:#B01A18;">${allGroups.length}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Duplicate Groups</div>
          </div>
          <div style="padding:12px 18px;background:rgba(176,26,24,0.05);border:1px solid var(--border,#eee);border-radius:10px;text-align:center;min-width:100px;">
            <div style="font-size:22px;font-weight:800;color:var(--text);">${totalDups}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Affected Records</div>
          </div>
          <div style="padding:12px 18px;background:rgba(176,26,24,0.06);border:1px solid rgba(176,26,24,0.22);border-radius:10px;text-align:center;min-width:120px;">
            <div style="font-size:22px;font-weight:800;color:#B01A18;">${recDelete}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Recommend Delete</div>
          </div>
          <div style="padding:12px 18px;background:rgba(184,122,20,0.06);border:1px solid rgba(184,122,20,0.22);border-radius:10px;text-align:center;min-width:100px;">
            <div style="font-size:22px;font-weight:800;color:#B87A14;">${recReview}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Manual Review</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted,#999);margin-bottom:14px;">
          Scanned ${allRows.length.toLocaleString()} Seafarer record${allRows.length!==1?'s':''} · ${allGroups.length} duplicate group${allGroups.length!==1?'s':''} found
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;font-size:11px;color:var(--text-muted,#888);">
          <span>Recommendation based on:</span>
          <span><strong style="color:var(--text);">Completeness</strong> · fields filled</span>
          <span><strong style="color:var(--text);">Progress</strong> · Mistral ID + onboarding</span>
          <span><strong style="color:var(--text);">Age</strong> · created time</span>
        </div>
        <div style="overflow-x:auto;border:1px solid var(--border,#e5e7eb);border-radius:10px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:var(--bg-page,#fafafa);">
            ${COLS.map(h => `<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;">${h}</th>`).join('')}
          </tr></thead>
          <tbody>`;

      allGroups.forEach((g, gi) => {
        g.members.forEach(r => {
          const fullName = (`${r.firstName||''} ${r.lastName||''}`).trim() || (r.fullName || '—');
          const rowAccent = r._dupRec === 'DELETE' ? 'opacity:0.85;' : '';
          html += `<tr style="border-bottom:1px solid var(--border,#f0f0f0);${rowAccent}">
            <td style="padding:11px 14px;">${recBadge(r._dupRec)}</td>
            <td style="padding:11px 14px;font-size:11.5px;color:var(--text-muted,#888);font-variant-numeric:tabular-nums;">${r._dupScore}</td>
            <td style="padding:11px 14px;font-size:11.5px;color:var(--text-muted,#777);white-space:nowrap;">${escH(r.candidateId || '—')}</td>
            <td style="padding:11px 14px;font-weight:600;white-space:nowrap;color:var(--text);">${escH(fullName)}</td>
            <td style="padding:11px 14px;">${cruiseBadge(r.cruiseLine)}</td>
            <td style="padding:11px 14px;color:var(--text-muted,#777);font-size:11.5px;">${escH(r.positionHired || '—')}</td>
            <td style="padding:11px 14px;">${onbBadge(r.onboardingStatus)}</td>
            <td style="padding:11px 14px;color:var(--text-muted,#777);font-size:11.5px;white-space:nowrap;">${fmtCreated(r.createdTime)}</td>
            <td style="padding:11px 14px;color:var(--text-muted,#777);font-size:11.5px;white-space:nowrap;font-variant-numeric:tabular-nums;">${processAge(r)}</td>
            <td style="padding:11px 14px;font-size:11.5px;">${dupEmail(r.email)}</td>
            <td style="padding:11px 14px;font-size:11.5px;">${dupPhone(r.phone)}</td>
            <td style="padding:11px 14px;color:var(--text-muted,#777);font-size:11.5px;white-space:nowrap;">${fmtDOB(r.dateOfBirth)}</td>
          </tr>`;
        });
        if (gi < allGroups.length - 1) {
          html += `<tr><td colspan="${COLS.length}" style="padding:0;height:6px;background:var(--bg-page,#f5f5f5);border:none;"></td></tr>`;
        }
      });

      html += `</tbody></table></div>`;
      resultsEl.innerHTML = html;

    } catch (err) {
      resultsEl.innerHTML = `<div style="padding:12px 14px;background:rgba(176,26,24,0.07);
        border:1px solid rgba(176,26,24,0.2);border-radius:8px;color:#B01A18;font-size:13px;">
        ⚠ Error: ${escH(err.message || 'Failed to fetch data. Please try again.')}
      </div>`;
    } finally {
      btn.disabled = false;
      btn.style.opacity = '';
      const spinnerEl = document.getElementById('dupRunBtnIcon');
      if (spinnerEl) {
        spinnerEl.outerHTML = `<svg id="dupRunBtnIcon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
      }
      btnLabel.textContent = 'Run Check';
    }
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// SEAFARER PAGE — active seafarers dashboard
// ═════════════════════════════════════════════════════════════════════════════
let _sfRows = [];   // all seafarers (resigned excluded), cached for filter re-use
let _saRows = [];   // Attachment page subset: CTI Indonesia only (resigned excluded)
let _vRows  = [];   // Visa page subset: CTI Indonesia, Report to Ship only
let _depRows = [];  // Deployment page: raw rows from Zoho Sheet "Deployment" tab
// seafarerId → ISO timestamp of last successful Send Form (shared live)
function _loadSaSentIds() {
  const obj = sharedGet('sa_sent', {}) || {};
  try { return new Map(Object.entries(obj)); } catch { return new Map(); }
}
function _saveSaSentIds() {
  sharedSet('sa_sent', Object.fromEntries(_saSentIds));
}
let _saSentIds = _loadSaSentIds();

// ── Module-level badge helpers shared by seafarer page ───────────────────────
function sfCruiseBadge(c) {
  if (!c || c === '—') return '<span style="color:var(--text-muted,#aaa);">—</span>';
  const map = { 'Cunard Line':'#1B3A6B','P&O Cruises':'#2D7A55','CUK Maritime':'#B87A14' };
  const col = map[c] || '#6B7280';
  return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
    background:${col}18;color:${col};border:1px solid ${col}30;white-space:nowrap;">${escH(c)}</span>`;
}
function sfOnbBadge(s) {
  if (!s) return '<span style="color:var(--text-muted,#aaa);">—</span>';
  const map = { 'Completing Documents':'#B87A14','Ready to Go':'#2D7A55',
    'Rescheduled':'#7C3AED','Resign':'#6B7280','Resigned':'#6B7280','Applicant':'#1B3A6B' };
  const col = map[s] || '#6B7280';
  return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
    background:${col}18;color:${col};border:1px solid ${col}30;white-space:nowrap;">${escH(s)}</span>`;
}
function sfEmpBadge(s) {
  if (!s) return '<span style="color:var(--text-muted,#aaa);">—</span>';
  const map = { 'New Hire':'#1B3A6B','Active':'#2D7A55','On Board':'#2D7A55','Inactive':'#6B7280' };
  const col = map[s] || '#6B7280';
  return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
    background:${col}18;color:${col};border:1px solid ${col}30;white-space:nowrap;">${escH(s)}</span>`;
}
function sfIsReadyToGo(r) {
  return (r.onboardingStatus || '').trim().toLowerCase() === 'ready to go';
}
function sfCountdownSort(r) {
  if (!r.signOnDate) return Infinity;
  const today = new Date(); today.setHours(0,0,0,0);
  const sign  = new Date(r.signOnDate); sign.setHours(0,0,0,0);
  return Math.round((sign - today) / 86400000);
}
function sfCountdownBadge(r) {
  if (!r.signOnDate)
    return '<span style="font-size:11px;color:var(--text-muted,#aaa);font-style:italic;">No Assignment</span>';
  const today = new Date(); today.setHours(0,0,0,0);
  const sign  = new Date(r.signOnDate); sign.setHours(0,0,0,0);
  const diff  = Math.round((sign - today) / 86400000);
  if (diff === 0)
    return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
      background:#B01A1818;color:#B01A18;border:1px solid #B01A1830;">Today</span>`;
  if (diff > 0)
    return `<span style="font-weight:700;color:#1B3A6B;">${diff}d</span>`;
  return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;
    background:#6B728018;color:#6B7280;border:1px solid #6B728030;">Started</span>`;
}
const _dash = '<span style="color:var(--text-muted,#aaa);">—</span>';

// Column definitions for the seafarer table
// Fields not yet in the worker mapping render "—" (noFilter skips the column filter cell)
const SF_TABLE_COLS = [
  { label:'Countdown',          field:'_countdown',       sortFn:sfCountdownSort, render:r => sfCountdownBadge(r) },
  { label:'Onboarding Status',  field:'onboardingStatus', filterMS:true,          render:r => sfOnbBadge(r.onboardingStatus) },
  { label:'Employment Status',  field:'employmentStatus', filterMS:true,          render:r => sfEmpBadge(r.employmentStatus) },
  { label:'Seafarer Status',    field:'_seafarerStatus',  noFilter:true,          render:() => _dash },
  { label:'CTI Office',         field:'_ctiOffice',       noFilter:true,          render:() => _dash },
  { label:'Seafarer Name',      field:'fullName',                                 render:r => `<span style="font-weight:600;color:var(--text);">${escH(r.fullName||'—')}</span>` },
  { label:'Email',              field:'email',                                    render:r => r.email&&r.email!=='—'?`<a href="mailto:${escH(r.email)}" style="color:var(--text-muted,#888);font-size:11px;">${escH(r.email)}</a>`:_dash },
  { label:'Seafarer ID',        field:'seafarerIdNumber',                         render:r => r.seafarerIdNumber?`<code style="font-size:11px;">${escH(String(r.seafarerIdNumber))}</code>`:_dash },
  { label:'Position Hired',     field:'positionHired',    filterMS:true,          render:r => `<span style="font-weight:600;">${escH(r.positionHired||'—')}</span>` },
  { label:'Cruise Line',        field:'cruiseLine',       filterMS:true,          render:r => sfCruiseBadge(r.cruiseLine) },
  { label:'Joining Ship',       field:'_joiningShip',     noFilter:true,          render:() => _dash },
  { label:'Sign On Date',       field:'signOnDate',                               render:r => r.signOnDate?`<span style="font-size:11.5px;">${escH(r.signOnDate)}</span>`:_dash },
  { label:'Sign Off Date',      field:'_signOffDate',     noFilter:true,          render:() => _dash },
  { label:'Sign On Port',       field:'_signOnPort',      noFilter:true,          render:() => _dash },
];

// Applies a date operator comparison. recordDate and filterDate are ISO strings (YYYY-MM-DD).
// Returns true (pass) when filterDate is empty or the comparison holds; false to exclude the row.
function sfDateOp(recordDate, op, filterDate) {
  if (!filterDate) return true;
  if (!recordDate) return false;   // record has no date → never matches a date filter
  const r = String(recordDate).slice(0, 10);
  const f = String(filterDate).slice(0, 10);
  switch (op) {
    case '>':  return r >  f;
    case '>=': return r >= f;
    case '<':  return r <  f;
    case '<=': return r <= f;
    default:   return r === f;     // '=' is default
  }
}

pages.seafarer = async function () {
  let allRows = [], errorMsg = null;
  try {
    const { seafarers } = await fetchCruiseData(false);
    allRows = seafarers || [];
  } catch (e) { errorMsg = e.message; }

  const RESIGNED = new Set(['resign','resigned']);
  _sfRows = allRows.filter(s => !RESIGNED.has((s.onboardingStatus||'').trim().toLowerCase()));
  setTimeout(buildFullPortalContext, 0); // update AI context after data loads

  if (errorMsg) return `
    <div class="req-page-header"><h1>Seafarer</h1></div>
    <div class="req-error-banner"><span>⚠️</span><div><strong>Server error</strong> — ${escH(errorMsg)}</div></div>`;

  const cruiseLines = [...new Set(_sfRows.map(r => r.cruiseLine).filter(v => v&&v!=='—'))].sort();
  const onbSts      = [...new Set(_sfRows.map(r => r.onboardingStatus).filter(v => v&&v!=='—'))].sort();
  const empSts      = [...new Set(_sfRows.map(r => r.employmentStatus).filter(v => v&&v!=='—'))].sort();
  const positions   = [...new Set(_sfRows.map(r => r.positionHired).filter(v => v&&v!=='—'))].sort();

  const today = new Date(); today.setHours(0,0,0,0);
  const total          = _sfRows.length;
  const readyNoAsgn    = _sfRows.filter(r => !r.signOnDate && sfIsReadyToGo(r)).length;
  const hasAsgnNotRdy  = _sfRows.filter(r => r.signOnDate && new Date(r.signOnDate)>today &&
    ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase())).length;
  const noAsgnNotReady = _sfRows.filter(r => !r.signOnDate && !sfIsReadyToGo(r)).length;


  return `
    <div class="req-page-header">
      <h1>Seafarer</h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Active seafarers — resigned excluded</span>
    </div>

    <div class="card req-filter-bar">
      ${buildMS('sfCruiseFilter','Cruise Line',cruiseLines)}
      ${buildMS('sfOnbFilter','Onboarding Status',onbSts)}
      ${buildMS('sfEmpFilter','Employment Status',empSts)}
      <!-- Sign On Date operator + date -->
      <span style="display:inline-flex;align-items:center;border:1px solid var(--border,#ddd);border-radius:8px;overflow:hidden;height:32px;background:var(--card-bg,#fff);" title="Sign On Date filter">
        <span style="padding:0 8px;font-size:11px;color:var(--text-muted,#888);white-space:nowrap;border-right:1px solid var(--border,#ddd);height:100%;display:flex;align-items:center;">Sign On</span>
        <select id="sfSignOnOp" style="height:32px;border:none;background:transparent url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 4px center;background-size:8px;color:var(--text);font-size:11px;font-family:inherit;padding:0 18px 0 6px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;width:50px;">
          <option value="=">=</option>
          <option value=">=">&gt;=</option>
          <option value=">">&gt;</option>
          <option value="<=">&lt;=</option>
          <option value="<">&lt;</option>
        </select>
        <input id="sfSignOnDate" type="date" title="Sign On Date"
          style="height:32px;font-size:12px;padding:0 8px;border:none;border-left:1px solid var(--border,#ddd);background:transparent;color:var(--text);font-family:inherit;outline:none;">
      </span>
      <!-- Sign Off Date operator + date -->
      <span style="display:inline-flex;align-items:center;border:1px solid var(--border,#ddd);border-radius:8px;overflow:hidden;height:32px;background:var(--card-bg,#fff);" title="Sign Off Date filter">
        <span style="padding:0 8px;font-size:11px;color:var(--text-muted,#888);white-space:nowrap;border-right:1px solid var(--border,#ddd);height:100%;display:flex;align-items:center;">Sign Off</span>
        <select id="sfSignOffOp" style="height:32px;border:none;background:transparent url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 4px center;background-size:8px;color:var(--text);font-size:11px;font-family:inherit;padding:0 18px 0 6px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;width:50px;">
          <option value="=">=</option>
          <option value=">=">&gt;=</option>
          <option value=">">&gt;</option>
          <option value="<=">&lt;=</option>
          <option value="<">&lt;</option>
        </select>
        <input id="sfSignOffDate" type="date" title="Sign Off Date"
          style="height:32px;font-size:12px;padding:0 8px;border:none;border-left:1px solid var(--border,#ddd);background:transparent;color:var(--text);font-family:inherit;outline:none;">
      </span>
      <input id="sfGlobalSearch" type="text" placeholder="🔍 Search…"
        style="flex:1;min-width:160px;height:32px;font-size:12px;padding:0 10px;
          border:1px solid var(--border,#ddd);border-radius:8px;
          background:var(--card-bg,#fff);color:var(--text);font-family:inherit;">
      <button id="sfClearBtn" class="req-clear-btn">✕ Clear</button>
      <span id="sfCount" class="req-count-badge">${_sfRows.length} seafarers</span>
    </div>

    <div class="req-kpi-grid" id="sfKpiGrid">
      <div class="req-kpi-card" data-kpi="all" data-color="#1B3A6B"
        style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
        <span class="req-kpi-label">Total Seafarer</span>
        <span class="req-kpi-value" style="color:#1B3A6B;" id="sfKpiTotal">${total}</span>
        <span class="req-kpi-sub">resigned excluded · click to reset</span>
      </div>
      <div class="req-kpi-card" data-kpi="ready" data-color="#2D7A55"
        style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
        <span class="req-kpi-label">Ready To Go · No Assignment</span>
        <span class="req-kpi-value" style="color:#2D7A55;" id="sfKpiReady">${readyNoAsgn}</span>
        <span class="req-kpi-sub">no sign-on date set</span>
      </div>
      <div class="req-kpi-card" data-kpi="hasAsgn" data-color="#B87A14"
        style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
        <span class="req-kpi-label">Have Assignment · Not Ready</span>
        <span class="req-kpi-value" style="color:#B87A14;" id="sfKpiHasAsgn">${hasAsgnNotRdy}</span>
        <span class="req-kpi-sub">future sign-on, docs incomplete</span>
      </div>
      <div class="req-kpi-card" data-kpi="noAsgnNotReady" data-color="#B01A18"
        style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
        <span class="req-kpi-label">No Assignment · Not Ready</span>
        <span class="req-kpi-value" style="color:#B01A18;" id="sfKpiNoAsgnNotReady">${noAsgnNotReady}</span>
        <span class="req-kpi-sub">no sign-on, not ready to go</span>
      </div>
    </div>

    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Active Seafarers by Cruise Line
</div>
        <div class="req-card-sub">Count per cruise line</div>
        <canvas id="sfLineChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">Ready To Go · No Assignment by Cruise Line
</div>
        <div class="req-card-sub">Ready seafarers awaiting deployment</div>
        <canvas id="sfReadyChart"></canvas>
      </div>
    </div>

    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Have Assignment · Not Ready by Cruise Line
</div>
        <div class="req-card-sub">Rescheduled or Completing Documents · with sign-on date</div>
        <canvas id="sfHasAsgnChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">No Assignment · Not Ready by Cruise Line
</div>
        <div class="req-card-sub">Rescheduled or Completing Documents · no sign-on date</div>
        <canvas id="sfNoAsgnNotRdyChart"></canvas>
      </div>
    </div>

`;
};

function renderSFTableBody(rows) {
  const tb = document.getElementById('sfTableBody');
  if (!tb) return;
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="${SF_TABLE_COLS.length}"
      style="padding:24px;text-align:center;color:var(--text-muted,#aaa);font-size:12px;">
      No seafarers match the filters.</td></tr>`;
    return;
  }
  tb.innerHTML = rows.map(r => `<tr>${SF_TABLE_COLS.map(c =>
    `<td style="padding:9px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:12px;white-space:nowrap;">${c.render(r)}</td>`
  ).join('')}</tr>`).join('');
}

pageEvents.seafarer = function () {
  if (typeof Chart === 'undefined') return;
  if (Chart && window.ChartDataLabels && !Chart._cruiseDLRegistered) {
    Chart.register(window.ChartDataLabels);
    Chart._cruiseDLRegistered = true;
  }

  window._sfCharts = window._sfCharts || {};
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const sfBaseOpts = {
    responsive:true, maintainAspectRatio:false,
    layout: { padding: { top: 18 } },
    plugins: {
      legend: { display:false },
      tooltip: { callbacks: { label: c => ` ${c.parsed.y}` } },
      datalabels: { anchor:'end',align:'end',offset:2,
        color:dark?'#eee':'#1A1A1A', font:{size:10,weight:700}, formatter:v=>v },
    },
    scales: {
      x: { grid:{display:false}, ticks:{color:dark?'#aaa':'#555',font:{size:10}} },
      y: { display:false, beginAtZero:true },
    },
  };
  const NOT_RDY_STS = new Set(['completing documents','rescheduled']);
  const isNotRdy = r => NOT_RDY_STS.has((r.onboardingStatus||'').trim().toLowerCase());

  const mkSFBar = (id, entries, color, onContext) => {
    const el = document.getElementById(id); if (!el) return;
    if (window._sfCharts[id]) window._sfCharts[id].destroy();
    const chart = new Chart(el, {
      type:'bar',
      data:{ labels:entries.map(e=>e[0]),
        datasets:[{data:entries.map(e=>e[1]),backgroundColor:color,borderRadius:0,maxBarThickness:46}] },
      options:sfBaseOpts,
    });
    if (onContext) {
      // Track last mouse position — contextmenu event coords are unreliable in Chart.js
      let mx = 0, my = 0;
      el.addEventListener('mousemove', e => { mx = e.offsetX; my = e.offsetY; });
      el.addEventListener('contextmenu', ev => {
        ev.preventDefault(); // always suppress browser menu
        const pts = chart.getElementsAtEventForMode(
          { x: mx, y: my }, 'nearest', { intersect: false }, true
        );
        if (pts.length) {
          onContext(chart.data.labels[pts[0].index], { x: ev.clientX, y: ev.clientY });
        }
      });
    }
    window._sfCharts[id] = chart;
  };

  // ── Drill-down helpers ────────────────────────────────────────────────────
  const sfDrillTable = (title, drillRows, at) => {
    const body = drillRows.length ? `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${DRILL_TH}">Name</th>
            <th style="${DRILL_TH}">Status</th>
            <th style="${DRILL_TH}">Sign On Date</th>
            <th style="${DRILL_TH}">Position</th>
          </tr>
        </thead>
        <tbody>
          ${drillRows.map(r=>`<tr>
            <td style="${DRILL_TD}font-weight:600;">${escH(r.fullName||'—')}</td>
            <td style="${DRILL_TD}">${sfOnbBadge(r.onboardingStatus)}</td>
            <td style="${DRILL_TD}">${r.signOnDate?`<span style="font-size:10.5px;">${escH(r.signOnDate)}</span>`:_dash}</td>
            <td style="${DRILL_TD}font-size:10px;">${escH(r.positionHired||'—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
      : `<div style="padding:20px;text-align:center;color:var(--text-muted,#888);font-size:11px;">No records found.</div>`;
    openReqModal(title, body, at);
  };

  const renderSFCharts = rows => {
    const today = new Date(); today.setHours(0,0,0,0);
    const byLine={}, byReady={}, byHasAsgn={}, byNoAsgnNotRdy={};
    rows.forEach(r => {
      const k = r.cruiseLine||'—'; if (k==='—') return;
      byLine[k] = (byLine[k]||0)+1;
      if (!r.signOnDate && sfIsReadyToGo(r))                byReady[k]       = (byReady[k]||0)+1;
      if (r.signOnDate && new Date(r.signOnDate)>today && isNotRdy(r))
                                                             byHasAsgn[k]     = (byHasAsgn[k]||0)+1;
      if (!r.signOnDate && isNotRdy(r))                     byNoAsgnNotRdy[k] = (byNoAsgnNotRdy[k]||0)+1;
    });

    mkSFBar('sfLineChart',  Object.entries(byLine).sort((a,b)=>b[1]-a[1]),  '#1B3A6B',
      (line, at) => sfDrillTable(`${escH(line)} — All Active`, rows.filter(r=>r.cruiseLine===line), at));

    mkSFBar('sfReadyChart', Object.entries(byReady).sort((a,b)=>b[1]-a[1]), '#2D7A55',
      (line, at) => sfDrillTable(`${escH(line)} — Ready · No Assignment`,
        rows.filter(r=>r.cruiseLine===line && !r.signOnDate && sfIsReadyToGo(r)), at));

    mkSFBar('sfHasAsgnChart', Object.entries(byHasAsgn).sort((a,b)=>b[1]-a[1]), '#B87A14',
      (line, at) => sfDrillTable(`${escH(line)} — Have Assignment · Not Ready`,
        rows.filter(r=>r.cruiseLine===line && r.signOnDate && new Date(r.signOnDate)>today && isNotRdy(r)), at));

    mkSFBar('sfNoAsgnNotRdyChart', Object.entries(byNoAsgnNotRdy).sort((a,b)=>b[1]-a[1]), '#B01A18',
      (line, at) => sfDrillTable(`${escH(line)} — No Assignment · Not Ready`,
        rows.filter(r=>r.cruiseLine===line && !r.signOnDate && isNotRdy(r)), at));
  };

  let sfSortF = null, sfSortD = 1;
  let sfActiveKpi = null;   // 'all' | 'ready' | 'hasAsgn' | 'noAsgnNotReady' | null

  function sfFiltered() {
    const gCruise = msGetVals('sfCruiseFilter');
    const gOnb    = msGetVals('sfOnbFilter');
    const gEmp    = msGetVals('sfEmpFilter');
    const soDate  = document.getElementById('sfSignOnDate')?.value  || '';
    const soOp    = document.getElementById('sfSignOnOp')?.value   || '=';
    const soffDate= document.getElementById('sfSignOffDate')?.value || '';
    const soffOp  = document.getElementById('sfSignOffOp')?.value  || '=';
    const search  = (document.getElementById('sfGlobalSearch')?.value||'').trim().toLowerCase();
    const colMS   = {}, colText = {};
    document.querySelectorAll('[id^="sfCF_"]').forEach(el => {
      const v = msGetVals(el.id); if (v.length) colMS[el.id.replace('sfCF_','')] = v;
    });
    document.querySelectorAll('.sf-col-f').forEach(inp => {
      const v = inp.value.trim().toLowerCase(); if (v) colText[inp.dataset.field] = v;
    });
    let out = _sfRows.filter(r => {
      if (gCruise.length && !gCruise.includes(r.cruiseLine)) return false;
      if (gOnb.length    && !gOnb.includes(r.onboardingStatus)) return false;
      if (gEmp.length    && !gEmp.includes(r.employmentStatus)) return false;
      if (soDate   && !sfDateOp(r.signOnDate,   soOp,   soDate))   return false;
      if (soffDate && !sfDateOp(r.signOffDate,  soffOp, soffDate)) return false;
      for (const f in colMS)   if (!colMS[f].includes(r[f])) return false;
      for (const f in colText) if (!String(r[f]??'').toLowerCase().includes(colText[f])) return false;
      if (search) {
        const hay = [r.fullName,r.email,r.positionHired,r.cruiseLine,
          r.onboardingStatus,r.employmentStatus,r.seafarerIdNumber,r.signOnDate]
          .map(v=>String(v??'').toLowerCase()).join(' ');
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    // Apply active KPI filter on top of other filters
    if (sfActiveKpi && sfActiveKpi !== 'all') {
      const _td = new Date(); _td.setHours(0,0,0,0);
      if (sfActiveKpi === 'ready') {
        out = out.filter(r => !r.signOnDate && sfIsReadyToGo(r));
      } else if (sfActiveKpi === 'hasAsgn') {
        out = out.filter(r => r.signOnDate && new Date(r.signOnDate) > _td &&
          ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase()));
      } else if (sfActiveKpi === 'noAsgnNotReady') {
        out = out.filter(r => !r.signOnDate && !sfIsReadyToGo(r));
      }
    }

    if (sfSortF) {
      out = out.slice().sort((a,b) => {
        if (sfSortF === '_countdown') return (sfCountdownSort(a)-sfCountdownSort(b))*sfSortD;
        return String(a[sfSortF]??'').localeCompare(String(b[sfSortF]??''),undefined,{numeric:true})*sfSortD;
      });
    }
    return out;
  }

  function sfApply() {
    const rows = sfFiltered();
    renderSFTableBody(rows);
    const today = new Date(); today.setHours(0,0,0,0);
    const setT  = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setT('sfKpiTotal', rows.length);
    setT('sfKpiReady', rows.filter(r=>!r.signOnDate&&sfIsReadyToGo(r)).length);
    setT('sfKpiHasAsgn', rows.filter(r=>r.signOnDate&&new Date(r.signOnDate)>today&&
      ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase())).length);
    setT('sfKpiNoAsgnNotReady', rows.filter(r=>!r.signOnDate&&!sfIsReadyToGo(r)).length);
    setT('sfCount', `${rows.length} seafarer${rows.length!==1?'s':''}`);
    renderSFCharts(rows);
    // Reflect active KPI with an outline on the card
    document.querySelectorAll('#sfKpiGrid [data-kpi]').forEach(card => {
      const isActive = card.dataset.kpi === (sfActiveKpi || 'all');
      const col = card.dataset.color || '#1B3A6B';
      card.style.outline    = isActive ? `2px solid ${col}` : '';
      card.style.boxShadow  = isActive ? `0 2px 12px ${col}33` : '';
      card.style.transform  = isActive ? 'translateY(-1px)' : '';
    });

    // ── Update AI context ─────────────────────────────────────────────────
    window.CTI_PAGE_CONTEXT = {
      page: 'Seafarer',
      summary: (() => {
        const today2 = new Date(); today2.setHours(0,0,0,0);
        const readyN = rows.filter(r=>!r.signOnDate&&sfIsReadyToGo(r)).length;
        const hasAsN = rows.filter(r=>r.signOnDate&&new Date(r.signOnDate)>today2&&['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase())).length;
        const noAsN  = rows.filter(r=>!r.signOnDate&&!sfIsReadyToGo(r)).length;
        const byCL   = {}; rows.forEach(r=>{const k=r.cruiseLine||'—';if(k!=='—')byCL[k]=(byCL[k]||0)+1;});
        const byOnb  = {}; rows.forEach(r=>{const k=r.onboardingStatus||'—';if(k!=='—')byOnb[k]=(byOnb[k]||0)+1;});
        const top2   = (obj,n)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,val])=>`${k} (${val})`).join(', ');
        return [
          `Page: Seafarer (active seafarers, resigned excluded)`,
          `Total showing: ${rows.length}`,
          `  Ready to Go / No Assignment: ${readyN}`,
          `  Have Assignment / Not Ready: ${hasAsN}`,
          `  No Assignment / Not Ready: ${noAsN}`,
          `Top Cruise Lines: ${top2(byCL,5)||'—'}`,
          `Onboarding Status breakdown: ${top2(byOnb,6)||'—'}`,
        ].join('\n');
      })(),
    };
  }

  initMS();
  // KPI card clicks — toggle filter; clicking same card or "all" resets
  document.querySelectorAll('#sfKpiGrid [data-kpi]').forEach(card => {
    card.addEventListener('click', () => {
      const kpi = card.dataset.kpi;
      sfActiveKpi = (sfActiveKpi === kpi || kpi === 'all') ? null : kpi;
      sfApply();
    });
  });
  ['sfCruiseFilter','sfOnbFilter','sfEmpFilter'].forEach(id => msOnChange(id, sfApply));
  document.getElementById('sfSignOnDate')?.addEventListener('change', sfApply);
  document.getElementById('sfSignOnOp')?.addEventListener('change', sfApply);
  document.getElementById('sfSignOffDate')?.addEventListener('change', sfApply);
  document.getElementById('sfSignOffOp')?.addEventListener('change', sfApply);
  document.getElementById('sfGlobalSearch')?.addEventListener('input', sfApply);
  document.getElementById('sfClearBtn')?.addEventListener('click', () => {
    ['sfCruiseFilter','sfOnbFilter','sfEmpFilter'].forEach(msClear);
    ['sfGlobalSearch','sfSignOnDate','sfSignOffDate'].forEach(id => {
      const el=document.getElementById(id); if(el) el.value='';
    });
    ['sfSignOnOp','sfSignOffOp'].forEach(id => {
      const el=document.getElementById(id); if(el) el.value='=';
    });
    sfActiveKpi=null;
    sfApply();
  });

  renderSFCharts(_sfRows);      // initial charts
};

// ═════════════════════════════════════════════════════════════════════════════
// SEAFARER ATTACHMENT PAGE — document collection & tracking
// ═════════════════════════════════════════════════════════════════════════════

// Document status colour map
const DOC_STATUS_COLORS = {
  'Valid':           '#15803D',  // green
  'In Process':      '#D97706',  // amber
  'Need To Process': '#DC2626',  // red
  'Not Required':    '#6B7280',  // gray
  'Unfit':           '#7C3AED',  // purple (Medical only)
};
// Standard opts — Unfit excluded; medical column uses DOC_STATUS_OPTS_MEDICAL
const DOC_STATUS_OPTS         = ['Valid','In Process','Need To Process','Not Required'];
const DOC_STATUS_OPTS_MEDICAL = ['Valid','In Process','Need To Process','Not Required','Unfit'];
const VACC_OPTS = ['MMR 1','MMR 2','Yellow Fever','Hepatitis A','Tetanus','No Vaccine is Required'];
function docStatusBadge(s) {
  if (!s) return _dash;
  // Case-insensitive lookup so Zoho casing variants ('Need to Process' vs 'Need To Process') all match
  const key = Object.keys(DOC_STATUS_COLORS).find(k => k.toLowerCase() === s.toLowerCase()) || s;
  const col = DOC_STATUS_COLORS[key] || '#6B7280';
  return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;
    background:${col}30;color:${col};border:1.5px solid ${col}80;white-space:nowrap;">${escH(s)}</span>`;
}

// Field definitions for the Detail modal — data-driven to keep code compact
// zoho: Zoho Recruit API field name — verify unknown ones via /api/cruise/debug/fields?module=Candidates
const SA_DOC_FIELDS = [
  // Passport
  { group:'Passport',    label:'Passport Status',          field:'passportStatus',      zoho:'Passport_Status',             type:'select', opts:DOC_STATUS_OPTS },
  { group:'Passport',    label:'Passport Number',           field:'passportNumber',       zoho:'Passport_Number'              },
  { group:'Passport',    label:'Passport Issued Date',      field:'passportIssuedDate',   zoho:'Passport_Issued_Date',        type:'date'  },
  { group:'Passport',    label:'Passport Expired Date',     field:'passportExpiredDate',  zoho:'Passport_Expired_Date',       type:'date'  },
  { group:'Passport',    label:'Passport Issued Place',     field:'passportIssuedPlace',  zoho:'Passport_Issued_Place'        },  // TODO: verify
  { group:'Passport',    label:'Passport Issued Nation',    field:'passportIssuedNation', zoho:'Passport_Issued_Country'      },
  // STCW
  { group:'STCW',        label:'BST Status',                field:'bstStatus',            zoho:'BST_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'STCW',        label:'BST Number',                field:'bstNumber',            zoho:'BST_Number'                   }, // TODO
  { group:'STCW',        label:'BST Expiration Date',       field:'bstExpiry',            zoho:'BST_Expiry_Date',             type:'date'  }, // TODO
  { group:'STCW',        label:'SAT Status',                field:'satStatus',            zoho:'SAT_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'STCW',        label:'SAT Number',                field:'satNumber',            zoho:'SAT_Number'                   }, // TODO
  { group:'STCW',        label:'SAT Expiration Date',       field:'satExpiry',            zoho:'SAT_Expiry_Date',             type:'date'  }, // TODO
  { group:'STCW',        label:'Crowd Mgt. Status',         field:'crowdMgtStatus',       zoho:'Crowd_Management_Status',     type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'STCW',        label:'Crowd Mgt. Number',         field:'crowdMgtNumber',       zoho:'Crowd_Management_Number'      }, // TODO
  { group:'STCW',        label:'Crowd Mgt. Expiration',     field:'crowdMgtExpiry',       zoho:'Crowd_Management_Expiry_Date',type:'date'  }, // TODO
  { group:'STCW',        label:'Crisis Mgt. Status',        field:'crisisMgtStatus',      zoho:'Crisis_Management_Status',    type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'STCW',        label:'Crisis Mgt. Number',        field:'crisisMgtNumber',      zoho:'Crisis_Management_Number'     }, // TODO
  { group:'STCW',        label:'Crisis Mgt. Expiration',    field:'crisisMgtExpiry',      zoho:'Crisis_Management_Expiry_Date',type:'date' }, // TODO
  { group:'STCW',        label:'PSCRB Status',              field:'pscrbStatus',          zoho:'PSCRB_Status',                type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'STCW',        label:'PSCRB Number',              field:'pscrbNumber',          zoho:'PSCRB_Number'                 }, // TODO
  { group:'STCW',        label:'PSCRB Expiration Date',     field:'pscrbExpiry',          zoho:'PSCRB_Expiry_Date',           type:'date'  }, // TODO
  // Seaman Book
  { group:'Seaman Book', label:'Seaman Book Status',        field:'seamanBookStatus',     zoho:'Seaman_Book_Status',          type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Seaman Book', label:'Seaman Book Number',        field:'seamanBookNumber',     zoho:'Seaman_Book_Number'           }, // TODO
  { group:'Seaman Book', label:'Seaman Book Expiration',    field:'seamanBookExpiry',     zoho:'Seaman_Book_Expiry_Date',     type:'date'  }, // TODO
  { group:'Seaman Book', label:'SDB Status',                field:'sdbStatus',            zoho:'SDB_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Seaman Book', label:'SDB Expiration Date',       field:'sdbExpiry',            zoho:'SDB_Expiry_Date',             type:'date'  }, // TODO
  { group:'Seaman Book', label:'BID Status',                field:'bidStatus',            zoho:'BID_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Seaman Book', label:'BID Expiration Date',       field:'bidExpiry',            zoho:'BID_Expiry_Date',             type:'date'  }, // TODO
  // Visa
  { group:'Visa',        label:'C1/D Visa Status',          field:'c1dStatus',            zoho:'C1D_Visa_Status',             type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Visa',        label:'C1/D Visa Number',          field:'c1dNumber',            zoho:'C1D_Visa_Number'              }, // TODO
  { group:'Visa',        label:'C1/D Appointment Date',     field:'c1dAppointment',       zoho:'C1D_Appointment_Date',        type:'date'  }, // TODO
  { group:'Visa',        label:'C1/D Visa Expiration',      field:'c1dExpiry',            zoho:'C1D_Visa_Expiry_Date',        type:'date'  }, // TODO
  { group:'Visa',        label:'MCV Status',                field:'mcvStatus',            zoho:'MCV_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Visa',        label:'MCV Number',                field:'mcvNumber',            zoho:'MCV_Number'                   }, // TODO
  { group:'Visa',        label:"MCV's Passport Number",     field:'mcvPassportNumber',    zoho:'MCV_Passport_Number'          }, // TODO
  { group:'Visa',        label:'MCV Expiration Date',       field:'mcvExpiry',            zoho:'MCV_Expiry_Date',             type:'date'  }, // TODO
  { group:'Visa',        label:'OKTB Status',               field:'oktbStatus',           zoho:'OKTB_Status',                 type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Visa',        label:'NZeTA Status',              field:'nzetaStatus',          zoho:'NZeTA_Status',                type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Visa',        label:'NZeTA Number',              field:'nzetaNumber',          zoho:'NZeTA_Number'                 }, // TODO
  { group:'Visa',        label:'NZeTA Expiration Date',     field:'nzetaExpiry',          zoho:'NZeTA_Expiry_Date',           type:'date'  }, // TODO
  { group:'Visa',        label:'ATV Status',                field:'atvStatus',            zoho:'ATV_Status',                  type:'select', opts:DOC_STATUS_OPTS }, // TODO
  { group:'Visa',        label:'ATV Appointment Date',      field:'atvAppointment',       zoho:'ATV_Appointment_Date',        type:'date'  }, // TODO
  { group:'Visa',        label:'ATV Number',                field:'atvNumber',            zoho:'ATV_Number'                   }, // TODO
  { group:'Visa',        label:'ATV Expiration Date',       field:'atvExpiry',            zoho:'ATV_Expiry_Date',             type:'date'  }, // TODO
  { group:'Visa',        label:'Other Visa Name',           field:'otherVisaName',        zoho:'Other_Visa_Name'              }, // TODO
  { group:'Visa',        label:'Other Visa Status',         field:'otherVisaStatus',      zoho:'Other_Visa_Status',           type:'select', opts:DOC_STATUS_OPTS }, // TODO
  // Medical
  { group:'Medical',     label:'Medical Status',            field:'medicalStatus',        zoho:'Medical_Status',              type:'select', opts:['Valid','In Process','Need To Process','Not Required','Unfit'] }, // TODO
  { group:'Medical',     label:'Medical Examination Date',  field:'medicalExamDate',      zoho:'Medical_Examination_Date',    type:'date'  }, // TODO
  { group:'Medical',     label:'Medical Issuance Date',     field:'medicalIssuanceDate',  zoho:'Medical_Issuance_Date',       type:'date'  }, // TODO
  { group:'Medical',     label:'Medical Expiration Date',   field:'medicalExpiry',        zoho:'Medical_Expiry_Date',         type:'date'  }, // TODO
  { group:'Medical',     label:'Completed Vaccination',     field:'completedVaccination', zoho:'Vaccines_Status', type:'multicheck', opts:VACC_OPTS },
  { group:'Medical',     label:'Date MMR 1 Completed',      field:'dateMmr1',             zoho:'Date_MMR_1_Completed',        type:'date'  }, // TODO
];

// Status columns shown in the attachment table
const SA_STATUS_COLS = [
  { label:'Passport',  field:'passportStatus'  },
  { label:'BST',       field:'bstStatus'       },
  { label:'SAT',       field:'satStatus'       },
  { label:'Crowd Mgt.',field:'crowdMgtStatus'  },
  { label:'Crisis Mgt.',field:'crisisMgtStatus'},
  { label:'PSCRB',     field:'pscrbStatus'     },
  { label:'Seaman Book',field:'seamanBookStatus'},
  { label:'SDB',       field:'sdbStatus'       },
  { label:'BID',       field:'bidStatus'       },
  { label:'C1/D Visa', field:'c1dStatus'       },
  { label:'MCV',       field:'mcvStatus'       },
  { label:'NZeTA',     field:'nzetaStatus'     },
  { label:'ATV',       field:'atvStatus'       },
  { label:'Medical',   field:'medicalStatus'   },
  { label:'Vaccination',field:'completedVaccination'},
];

pages.seafarerAttachment = async function () {
  // Reuse cached seafarer data; fetch fresh if page loaded directly
  if (!_sfRows.length) {
    try {
      const { seafarers } = await fetchCruiseData(false);
      const RESIGNED = new Set(['resign','resigned']);
      _sfRows = (seafarers||[]).filter(s => !RESIGNED.has((s.onboardingStatus||'').trim().toLowerCase()));
    } catch (_) {}
  }
  // Narrow to CTI Indonesia only; also exclude "Report to Ship".
  // Graceful fallback: if ctiOffice isn't mapped yet (all empty), show all eligible rows.
  const SA_EXCLUDE_ONB = new Set(['resign','resigned','report to ship']);
  const hasCtiData = _sfRows.some(r => !!r.ctiOffice);
  _saRows = (hasCtiData ? _sfRows.filter(r => (r.ctiOffice||'').toLowerCase().includes('indonesia')) : _sfRows)
    .filter(r => !SA_EXCLUDE_ONB.has((r.onboardingStatus||'').trim().toLowerCase()));
  const rows = _saRows;
  const cruiseLines    = [...new Set(rows.map(r=>r.cruiseLine).filter(v=>v&&v!=='—'))].sort();
  const onbSts         = [...new Set(rows.map(r=>r.onboardingStatus).filter(v=>v&&v!=='—'))].sort();
  const ctiOfficeOpts  = [...new Set(rows.map(r=>r.ctiOffice).filter(Boolean))].sort();
  const signOnYears    = (() => {
    const yrs = [...new Set(rows.filter(r=>r.signOnDate).map(r=>r.signOnDate.slice(0,4)))];
    ['2025','2026','2027','2028'].forEach(y=>{ if(!yrs.includes(y)) yrs.push(y); });
    return yrs.sort();
  })();
  const SA_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today = new Date(); today.setHours(0,0,0,0);
  const total          = rows.length;
  const readyNoAsgn    = rows.filter(r=>!r.signOnDate&&sfIsReadyToGo(r)).length;
  const hasAsgnNotRdy  = rows.filter(r=>r.signOnDate&&new Date(r.signOnDate)>today&&
    ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase())).length;
  const noAsgnNotReady = rows.filter(r=>!r.signOnDate&&!sfIsReadyToGo(r)).length;

  // Build table header
  // NOTE: thSort intentionally starts with 'Last Sent' (not 'Actions') so its column count
  // aligns with thFilter (which prepends an Actions cell) and with each data row.
  const fixedCols = ['Last Sent','Countdown','Onboarding Status','CTI Office','Name','Email','Seafarer ID','Cruise Line','Sign On Date'];
  const allCols   = [...fixedCols, ...SA_STATUS_COLS.map(c=>c.label)];
  // i===0 = Last Sent (no sort), i===3 = CTI Office (no sort), rest sortable
  const noSortIdx = new Set([0,3]);
  const thSort = allCols.map((lbl,i) => {
    const field = i<9 ? ['_lastSent','_countdown','onboardingStatus','_ctiOffice','fullName','email','seafarerIdNumber','cruiseLine','signOnDate'][i]
                      : SA_STATUS_COLS[i-9].field;
    const ns = noSortIdx.has(i);
    return `<th data-field="${field}" class="${ns?'':'sa-sortable'}"
      style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;
        text-transform:uppercase;color:var(--text-muted,#888);background:var(--bg-page,#fafafa);
        border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;
        ${ns?'':'cursor:pointer;user-select:none;'}">
      ${escH(lbl)}${ns?'':' <span class="sa-sort-icon">⇅</span>'}
    </th>`;
  }).join('');

  const onbOpts = onbSts;
  const cruiseOpts = cruiseLines;

  // ── Filter row: text inputs for Name/Email/SeafarerID; MS for each status col ──
  const thfCell = (content='') =>
    `<th style="padding:4px 6px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);">${content}</th>`;
  const textInput = f =>
    `<input id="saCF_${f}" class="sa-col-f" data-field="${f}" type="text" placeholder="—"
      style="width:100%;height:24px;font-size:10px;padding:0 6px;border:1px solid var(--border,#ddd);
        border-radius:5px;background:var(--card-bg,#fff);color:var(--text);">`;
  const signOnDateCell = `<span style="display:inline-flex;align-items:center;width:100%;gap:2px;">
    <select id="saSignOnOp" style="height:24px;border:1px solid var(--border,#ddd);border-radius:4px;
      padding:0 2px;font-size:10px;background:var(--card-bg,#fff);color:var(--text);flex-shrink:0;cursor:pointer;">
      <option value="=">=</option><option value=">=">&gt;=</option><option value=">">&gt;</option>
      <option value="<=">&lt;=</option><option value="<">&lt;</option>
    </select>
    <input id="saSignOnDate" type="date"
      style="height:24px;border:1px solid var(--border,#ddd);border-radius:4px;
        padding:0 4px;font-size:10px;background:var(--card-bg,#fff);color:var(--text);flex:1;min-width:0;">
  </span>`;
  const colOpts = c => c.field==='medicalStatus' ? DOC_STATUS_OPTS_MEDICAL
                     : c.field==='completedVaccination' ? VACC_OPTS
                     : DOC_STATUS_OPTS;
  const thFilter = [
    thfCell(),                                                     // Actions
    thfCell(),                                                     // Last Sent
    thfCell(),                                                     // Countdown
    thfCell(buildColMS('saCF_onboardingStatus', onbSts)),          // Onboarding Status
    thfCell(buildColMS('saCF_ctiOffice', ctiOfficeOpts)),          // CTI Office
    thfCell(textInput('fullName')),                                // Name
    thfCell(textInput('email')),                                   // Email
    thfCell(textInput('seafarerIdNumber')),                        // Seafarer ID
    thfCell(buildColMS('saCF_cruiseLine', cruiseLines)),           // Cruise Line
    thfCell(signOnDateCell),                                       // Sign On Date
    ...SA_STATUS_COLS.map(c => thfCell(buildColMS('saCF_'+c.field, colOpts(c)))),
  ].join('');

  return `
    <div class="req-page-header">
      <h1>Attachment <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#FFF3CD;color:#856404;vertical-align:middle;margin-left:6px;">Beta</span></h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Document collection &amp; tracking · CTI Indonesia seafarers only</span>
    </div>

    <nav class="task-tabbar" id="saTabbar">
      <button class="task-sub-link active" data-tab="report">Report</button>
      <button class="task-sub-link" data-tab="form">Form</button>
    </nav>

    <!-- REPORT TAB -->
    <div id="saTabReport">
      <div class="card req-filter-bar">
        ${buildMS('saSignOnMonth','Sign On Month',SA_MONTHS)}
        ${buildMS('saSignOnYear','Sign On Year',signOnYears)}
        ${buildMS('saDocFilter','Document Name',SA_STATUS_COLS.map(c=>c.label))}
        ${buildMS('saDocStatusFilter','Document Status',DOC_STATUS_OPTS)}
        <input id="saGlobalSearch" type="text" placeholder="🔍 Search…"
          style="flex:1;min-width:160px;height:32px;font-size:12px;padding:0 10px;
            border:1px solid var(--border,#ddd);border-radius:8px;
            background:var(--card-bg,#fff);color:var(--text);font-family:inherit;">
        <button id="saClearBtn" class="req-clear-btn">✕ Clear</button>
        <span id="saCount" class="req-count-badge">${rows.length} seafarers</span>
      </div>

      <div class="req-kpi-grid" id="saKpiGrid">
        <div class="req-kpi-card" data-kpi="all" data-color="#1B3A6B" style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
          <span class="req-kpi-label">Total Seafarer</span>
          <span class="req-kpi-value" style="color:#1B3A6B;" id="saKpiTotal">${total}</span>
          <span class="req-kpi-sub">resigned excluded · click to reset</span>
        </div>
        <div class="req-kpi-card" data-kpi="ready" data-color="#2D7A55" style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
          <span class="req-kpi-label">Ready To Go · No Assignment</span>
          <span class="req-kpi-value" style="color:#2D7A55;" id="saKpiReady">${readyNoAsgn}</span>
          <span class="req-kpi-sub">no sign-on date set</span>
        </div>
        <div class="req-kpi-card" data-kpi="hasAsgn" data-color="#B87A14" style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
          <span class="req-kpi-label">Have Assignment · Not Ready</span>
          <span class="req-kpi-value" style="color:#B87A14;" id="saKpiHasAsgn">${hasAsgnNotRdy}</span>
          <span class="req-kpi-sub">future sign-on, docs incomplete</span>
        </div>
        <div class="req-kpi-card" data-kpi="noAsgnNotReady" data-color="#B01A18" style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
          <span class="req-kpi-label">No Assignment · Not Ready</span>
          <span class="req-kpi-value" style="color:#B01A18;" id="saKpiNoAsgnNotReady">${noAsgnNotReady}</span>
          <span class="req-kpi-sub">no sign-on, not ready to go</span>
        </div>
      </div>

      <div class="card req-table-card">
        <div class="req-table-outer">
          <table id="saMainTable">
            <thead>
              <tr id="saSortRow">
                <th style="padding:8px 10px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted,#888);">Actions</th>
                ${thSort}
              </tr>
              <tr id="saFilterRow">${thFilter}</tr>
            </thead>
            <tbody id="saTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FORM TAB -->
    <div id="saTabForm" style="display:none;">
      <div class="card" style="padding:20px 24px;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">Document Collection Form</div>
        <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:14px;">
          Open the Zoho form to collect documents from a seafarer, or select a seafarer from the table in Report tab and use the "Send Form" button to open a prefilled link.
        </div>
        <a href="https://zfrmz.com/bhzD0iB9g82fARBm1ybA"
          target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:8px;
            background:#1B3A6B;color:#fff;font-size:12px;font-weight:600;text-decoration:none;
            transition:background 0.15s;"
          onmouseover="this.style.background='#142c52'" onmouseout="this.style.background='#1B3A6B'">
          🔗 Open Document Collection Form
        </a>
        <div style="margin-top:20px;border-radius:10px;overflow:hidden;border:1px solid var(--border,#e5e7eb);">
          <iframe src="https://zfrmz.com/bhzD0iB9g82fARBm1ybA"
            style="width:100%;height:680px;border:none;display:block;"
            title="Document Collection Form"></iframe>
        </div>
      </div>
    </div>`;
};

function renderSATableBody(rows) {
  const tb = document.getElementById('saTableBody');
  if (!tb) return;
  if (!rows.length) {
    const span = 1 + 8 + SA_STATUS_COLS.length;
    tb.innerHTML = `<tr><td colspan="${span}" style="padding:24px;text-align:center;color:var(--text-muted,#aaa);font-size:12px;">No seafarers match the filters.</td></tr>`;
    return;
  }
  const fmtField = (r, field) => {
    switch (field) {
      case '_countdown': return sfCountdownBadge(r);
      case 'onboardingStatus': return sfOnbBadge(r.onboardingStatus);
      case '_ctiOffice': return r.ctiOffice ? `<span style="font-size:11px;color:var(--text-muted,#888);">${escH(r.ctiOffice)}</span>` : _dash;
      case 'fullName': return `<span style="font-weight:600;">${escH(r.fullName||'—')}</span>`;
      case 'email': return r.email&&r.email!=='—'?`<a href="mailto:${escH(r.email)}" style="color:var(--text-muted,#888);font-size:11px;">${escH(r.email)}</a>`:_dash;
      case 'seafarerIdNumber': return r.seafarerIdNumber?`<code style="font-size:11px;">${escH(String(r.seafarerIdNumber))}</code>`:_dash;
      case 'cruiseLine': return sfCruiseBadge(r.cruiseLine);
      case 'signOnDate': return r.signOnDate?`<span style="font-size:11.5px;">${escH(r.signOnDate)}</span>`:_dash;
      case 'completedVaccination': {
        if (!r.completedVaccination) return _dash;
        return r.completedVaccination.split(/[;,]+/).map(v=>v.trim()).filter(Boolean)
          .map(v=>`<span style="font-size:10px;padding:1px 5px;border-radius:8px;white-space:nowrap;
            background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;">${escH(v)}</span>`)
          .join(' ');
      }
      default: return docStatusBadge(r[field]);
    }
  };
  const fixedFields = ['_countdown','onboardingStatus','_ctiOffice','fullName','email','seafarerIdNumber','cruiseLine','signOnDate'];
  const allFields = [...fixedFields, ...SA_STATUS_COLS.map(c=>c.field)];
  const fmtLastSent = id => {
    const entry = _saSentIds.get(id);
    if (!entry) return _dash;
    const { ok, ts } = (typeof entry === 'object') ? entry : { ok: true, ts: entry };
    if (!ok) return `<span style="font-size:10.5px;font-weight:600;color:#DC2626;">Failed</span>`;
    const d = new Date(ts);
    return `<span style="font-size:10.5px;color:#15803D;white-space:nowrap;">
      ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}<br>
      <span style="font-size:10px;color:var(--text-muted,#888);">${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
    </span>`;
  };
  tb.innerHTML = rows.map(r => {
    const hasEmail = r.email && r.email !== '—';
    const cells = allFields.map(f =>
      `<td style="padding:9px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:12px;white-space:nowrap;">${fmtField(r,f)}</td>`
    ).join('');
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border,#f0f0f0);white-space:nowrap;">
        <button class="sa-detail-btn" data-id="${escH(r.id)}"
          style="font-size:10.5px;font-weight:600;border:1px solid var(--border,#ddd);background:transparent;
            color:var(--text);border-radius:5px;padding:3px 9px;cursor:pointer;font-family:inherit;margin-right:4px;">Detail</button>
        ${(() => {
          const active = hasEmail;
          const col    = hasEmail ? '#B01A18' : '#ccc';
          const txtCol = hasEmail ? '#B01A18' : '#aaa';
          const tip    = hasEmail ? '' : 'No email address on record';
          return `<button class="sa-send-btn"
            data-id="${escH(r.id)}"
            data-email="${escH(hasEmail ? r.email : '')}"
            data-name="${escH(r.fullName || '')}"
            ${!active ? 'disabled' : ''} ${tip ? `title="${escH(tip)}"` : ''}
            style="font-size:10.5px;font-weight:600;border:1px solid ${col};background:transparent;
              color:${txtCol};border-radius:5px;padding:3px 9px;
              cursor:${active?'pointer':'not-allowed'};font-family:inherit;">Send Form</button>`;
        })()}
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border,#f0f0f0);text-align:center;min-width:70px;">${fmtLastSent(r.id)}</td>
      ${cells}
    </tr>`;
  }).join('');
}

function openSADetail(zohoId) {
  const row = _sfRows.find(r => r.id === zohoId);
  if (!row) return;
  const m = ensureReqModal();
  m.style.width = '520px';

  // Group fields
  const groups = [...new Set(SA_DOC_FIELDS.map(f=>f.group))];
  const formHtml = groups.map(g => {
    const gFields = SA_DOC_FIELDS.filter(f=>f.group===g);
    const rows = gFields.map(c => {
      const val = row[c.field] != null ? String(row[c.field]).replace(/^—$/,'') : '';
      let input;
      if (c.type === 'select') {
        const opts = ['', ...(c.opts||[])].map(o =>
          `<option value="${escH(o)}" ${o===val?'selected':''}>${o||'—'}</option>`).join('');
        input = `<select data-zoho="${escH(c.zoho)}" data-field="${escH(c.field)}"
          style="flex:1;min-width:0;padding:4px 6px;border-radius:5px;font-size:11.5px;font-family:inherit;
            border:1px solid var(--border,#ddd);background:var(--card-bg,#fff);color:var(--text);">${opts}</select>`;
      } else if (c.type === 'multicheck') {
        const currentVals = val.split(/[;,]+/).map(s=>s.trim()).filter(Boolean);
        const checks = (c.opts||[]).map(opt => `
          <label style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;">
            <input type="checkbox" class="sa-vacc-cb" data-vacc-field="${escH(c.field)}" value="${escH(opt)}"
              ${currentVals.includes(opt)?'checked':''}
              style="width:13px;height:13px;cursor:pointer;accent-color:#B01A18;">
            <span style="font-size:11.5px;color:var(--text);">${escH(opt)}</span>
          </label>`).join('');
        // Hidden input carries the joined value so the generic save handler picks it up
        input = `<div style="flex:1;">
          <input type="hidden" id="saVacc_${escH(c.field)}"
            data-zoho="${escH(c.zoho)}" data-field="${escH(c.field)}" value="${escH(val)}">
          <div style="padding:2px 0;">${checks}</div>
        </div>`;
      } else {
        input = `<input data-zoho="${escH(c.zoho)}" data-field="${escH(c.field)}"
          type="${c.type==='date'?'date':'text'}" value="${escH(val)}"
          style="flex:1;min-width:0;padding:4px 8px;border-radius:5px;font-size:11.5px;font-family:inherit;
            border:1px solid var(--border,#ddd);background:var(--card-bg,#fff);color:var(--text);">`;
      }
      return `<label style="display:flex;align-items:${c.type==='multicheck'?'flex-start':'center'};gap:8px;padding:5px 12px;border-bottom:1px solid var(--border,#f3f3f3);">
        <span style="flex:0 0 160px;font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:var(--text-muted,#888);padding-top:${c.type==='multicheck'?'4px':'0'};">${escH(c.label)}</span>
        ${input}
      </label>`;
    }).join('');
    return `<div style="padding:6px 0 0;">
      <div style="padding:4px 12px;font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;
        color:var(--text-muted,#888);background:var(--bg-page,#f7f7f7);border-bottom:1px solid var(--border,#eee);">${escH(g)}</div>
      ${rows}
    </div>`;
  }).join('');

  const body = `
    <div style="padding:8px 12px;background:var(--bg-page,#fafafa);font-size:10.5px;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);">
      <strong style="color:var(--text);">${escH(row.fullName||'—')}</strong>
      ${row.seafarerIdNumber?` · <code style="font-size:10px;">${escH(String(row.seafarerIdNumber))}</code>`:''}
      · ${sfCruiseBadge(row.cruiseLine)}
    </div>
    <div style="overflow-y:auto;max-height:60vh;"><form id="saDetailForm">${formHtml}</form></div>
    <div style="padding:10px 12px;display:flex;gap:8px;align-items:center;background:var(--bg-page,#fafafa);border-top:1px solid var(--border,#eee);">
      <span id="saDetailStatus" style="margin-right:auto;font-size:11px;color:var(--text-muted,#888);"></span>
      <button id="saDetailCancel" style="padding:6px 14px;font-size:11.5px;font-weight:600;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);border-radius:5px;cursor:pointer;font-family:inherit;">Close</button>
      <button id="saDetailSave" style="padding:6px 16px;font-size:11.5px;font-weight:600;border:none;background:#1B3A6B;color:#fff;border-radius:5px;cursor:pointer;font-family:inherit;">Save to Zoho</button>
    </div>`;
  openReqModal(`Document Detail`, body, { x: window.innerWidth/2 - 260, y: 60 });

  // Vaccination checkboxes — update hidden input whenever a checkbox changes
  document.querySelectorAll('#saDetailForm .sa-vacc-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const fk = cb.dataset.vaccField;
      const checked = [...document.querySelectorAll(`#saDetailForm .sa-vacc-cb[data-vacc-field="${fk}"]:checked`)]
        .map(c => c.value);
      const hidden = document.getElementById(`saVacc_${fk}`);
      if (hidden) hidden.value = checked.join('; ');
    });
  });

  document.getElementById('saDetailCancel')?.addEventListener('click', () => {
    document.getElementById('reqDrillModal').style.display = 'none';
  });
  document.getElementById('saDetailSave')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('saDetailStatus');
    const inputs = document.querySelectorAll('#saDetailForm [data-zoho]');
    const changes = {};
    inputs.forEach(inp => {
      const zk = inp.dataset.zoho;
      const fk = inp.dataset.field;
      const oldVal = row[fk] != null ? String(row[fk]).replace(/^—$/,'') : '';
      if (inp.value !== oldVal) changes[zk] = inp.value || null;
    });
    // Zoho multiselect fields require an array — convert vaccination if changed
    if ('Vaccines_Status' in changes) {
      const v = changes['Vaccines_Status'];
      changes['Vaccines_Status'] = v ? v.split(/[;,]+/).map(s=>s.trim()).filter(Boolean) : [];
    }
    if (!Object.keys(changes).length) { if(statusEl) statusEl.textContent='No changes.'; return; }
    if(statusEl) { statusEl.textContent='Saving…'; statusEl.style.color='var(--text-muted,#888)'; }
    try {
      const res = await fetch(`${WORKER_URL}/api/recruit/Candidates/${zohoId}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(changes),
      });
      const data = await res.json();
      const code = data?.data?.[0]?.code;
      if (code && code !== 'SUCCESS') throw new Error(data.data[0].message || code);
      inputs.forEach(inp => { row[inp.dataset.field] = inp.value; });
      if(statusEl) { statusEl.textContent='✓ Saved'; statusEl.style.color='#2D7A55'; }
      renderSATableBody(_saRows);
    } catch(e) {
      if(statusEl) { statusEl.textContent='✗ '+e.message; statusEl.style.color='#B01A18'; }
    }
  });
}

pageEvents.seafarerAttachment = function () {
  let saActiveKpi = null, saSortF = null, saSortD = 1;

  function saFiltered() {
    const gCruise       = msGetVals('saCF_cruiseLine');
    const gOnb          = msGetVals('saCF_onboardingStatus');
    const gCtiOffice    = msGetVals('saCF_ctiOffice');
    const gSignOnMonth  = msGetVals('saSignOnMonth');
    const gSignOnYear   = msGetVals('saSignOnYear');
    const gDoc          = msGetVals('saDocFilter');
    const gDocStatus    = msGetVals('saDocStatusFilter');
    const SA_MONTHS_ARR = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const search     = (document.getElementById('saGlobalSearch')?.value||'').trim().toLowerCase();
    const soOp       = document.getElementById('saSignOnOp')?.value  || '=';
    const soDate     = document.getElementById('saSignOnDate')?.value || '';
    // Column text filters
    const colText = {};
    ['fullName','email','seafarerIdNumber'].forEach(f => {
      const v = (document.getElementById('saCF_'+f)?.value||'').trim().toLowerCase();
      if (v) colText[f] = v;
    });
    // Column status MS filters
    const colMS = {};
    SA_STATUS_COLS.forEach(c => {
      const v = msGetVals('saCF_'+c.field);
      if (v.length) colMS[c.field] = v;
    });
    const today      = new Date(); today.setHours(0,0,0,0);
    let out = _saRows.filter(r => {
      if (gCruise.length    && !gCruise.includes(r.cruiseLine)) return false;
      if (gOnb.length       && !gOnb.includes(r.onboardingStatus)) return false;
      if (gCtiOffice.length && !gCtiOffice.includes(r.ctiOffice)) return false;
      if (gSignOnMonth.length) {
        if (!r.signOnDate) return false;
        const m = SA_MONTHS_ARR[new Date(r.signOnDate+'T00:00:00').getMonth()];
        if (!gSignOnMonth.includes(m)) return false;
      }
      if (gSignOnYear.length) {
        if (!r.signOnDate) return false;
        if (!gSignOnYear.includes(r.signOnDate.slice(0,4))) return false;
      }
      // Document + Document Status global filters
      // gDoc scopes which columns to check; gDocStatus filters by status value
      if (gDocStatus.length) {
        const docCols = gDoc.length
          ? SA_STATUS_COLS.filter(c => gDoc.includes(c.label))
          : SA_STATUS_COLS;
        const hasMatch = docCols.some(c => gDocStatus.includes(r[c.field]));
        if (!hasMatch) return false;
      }
      if (soDate && !sfDateOp(r.signOnDate, soOp, soDate)) return false;
      // Column text filters (Name, Email, Seafarer ID)
      for (const [f,v] of Object.entries(colText)) {
        if (!String(r[f]??'').toLowerCase().includes(v)) return false;
      }
      // Column status MS filters (per-status-column)
      for (const [f,v] of Object.entries(colMS)) {
        if (f === 'completedVaccination') {
          // Multi-value: row passes if it contains any of the selected vaccines
          const rowVacc = (r[f]||'').split(/[;,]+/).map(s=>s.trim()).filter(Boolean);
          if (!v.some(sel => rowVacc.includes(sel))) return false;
        } else {
          if (!v.includes(r[f])) return false;
        }
      }
      if (search) {
        const hay = [r.fullName,r.email,r.cruiseLine,r.onboardingStatus,r.seafarerIdNumber,
          ...SA_STATUS_COLS.map(c=>r[c.field])].map(v=>String(v??'').toLowerCase()).join(' ');
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    // KPI filter
    if (saActiveKpi && saActiveKpi !== 'all') {
      if (saActiveKpi==='ready') {
        out = out.filter(r=>!r.signOnDate&&sfIsReadyToGo(r));
      } else if (saActiveKpi==='hasAsgn') {
        out = out.filter(r=>r.signOnDate&&new Date(r.signOnDate)>today&&
          ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase()));
      } else if (saActiveKpi==='noAsgnNotReady') {
        out = out.filter(r=>!r.signOnDate&&!sfIsReadyToGo(r));
      }
    }
    if (saSortF) {
      out = out.slice().sort((a,b) => {
        if (saSortF==='_countdown') return (sfCountdownSort(a)-sfCountdownSort(b))*saSortD;
        return String(a[saSortF]??'').localeCompare(String(b[saSortF]??''),undefined,{numeric:true})*saSortD;
      });
    }
    return out;
  }

  function saApply() {
    const rows = saFiltered();
    renderSATableBody(rows);
    const today = new Date(); today.setHours(0,0,0,0);
    const setT = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setT('saKpiTotal', rows.length);
    setT('saKpiReady', rows.filter(r=>!r.signOnDate&&sfIsReadyToGo(r)).length);
    setT('saKpiHasAsgn', rows.filter(r=>r.signOnDate&&new Date(r.signOnDate)>today&&
      ['completing documents','rescheduled'].includes((r.onboardingStatus||'').trim().toLowerCase())).length);
    setT('saKpiNoAsgnNotReady', rows.filter(r=>!r.signOnDate&&!sfIsReadyToGo(r)).length);
    setT('saCount', `${rows.length} seafarer${rows.length!==1?'s':''}`);
    document.querySelectorAll('#saKpiGrid [data-kpi]').forEach(card => {
      const isActive = card.dataset.kpi===(saActiveKpi||'all');
      const col = card.dataset.color||'#1B3A6B';
      card.style.outline   = isActive ? `2px solid ${col}` : '';
      card.style.boxShadow = isActive ? `0 2px 12px ${col}33` : '';
      card.style.transform = isActive ? 'translateY(-1px)' : '';
    });
  }

  // Tabs
  document.querySelectorAll('#saTabbar .task-sub-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#saTabbar .task-sub-link').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('saTabReport').style.display = btn.dataset.tab==='report'?'':'none';
      document.getElementById('saTabForm').style.display   = btn.dataset.tab==='form'?'':'none';
    });
  });

  initMS();
  ['saDocFilter','saDocStatusFilter','saSignOnMonth','saSignOnYear',
   'saCF_cruiseLine','saCF_onboardingStatus','saCF_ctiOffice'].forEach(id=>msOnChange(id,saApply));
  document.getElementById('saGlobalSearch')?.addEventListener('input',saApply);
  document.getElementById('saSignOnOp')?.addEventListener('change',saApply);
  document.getElementById('saSignOnDate')?.addEventListener('change',saApply);
  // Column text filters
  document.querySelectorAll('.sa-col-f').forEach(inp=>inp.addEventListener('input',saApply));
  // Column status MS filters
  SA_STATUS_COLS.forEach(c=>msOnChange('saCF_'+c.field,saApply));
  document.getElementById('saClearBtn')?.addEventListener('click',()=>{
    ['saDocFilter','saDocStatusFilter','saSignOnMonth','saSignOnYear',
     'saCF_cruiseLine','saCF_onboardingStatus','saCF_ctiOffice'].forEach(msClear);
    const gs=document.getElementById('saGlobalSearch'); if(gs) gs.value='';
    const soOp=document.getElementById('saSignOnOp'); if(soOp) soOp.value='=';
    const soD=document.getElementById('saSignOnDate'); if(soD) soD.value='';
    document.querySelectorAll('.sa-col-f').forEach(inp=>inp.value='');
    SA_STATUS_COLS.forEach(c=>msClear('saCF_'+c.field));
    saActiveKpi=null; saSortF=null; saSortD=1;
    document.querySelectorAll('#saSortRow .sa-sort-icon').forEach(s=>s.textContent='⇅');
    saApply();
  });
  document.querySelectorAll('#saKpiGrid [data-kpi]').forEach(card=>{
    card.addEventListener('click',()=>{
      const kpi=card.dataset.kpi;
      saActiveKpi=(saActiveKpi===kpi||kpi==='all')?null:kpi;
      saApply();
    });
  });
  document.querySelectorAll('#saSortRow th.sa-sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const f=th.dataset.field;
      if(saSortF===f) saSortD*=-1; else{saSortF=f;saSortD=1;}
      document.querySelectorAll('#saSortRow .sa-sort-icon').forEach(s=>s.textContent='⇅');
      th.querySelector('.sa-sort-icon').textContent=saSortD>0?'↑':'↓';
      saApply();
    });
  });
  // Detail button delegation
  document.getElementById('saTableBody')?.addEventListener('click', e=>{
    const btn=e.target.closest('.sa-detail-btn');
    if(btn) openSADetail(btn.dataset.id);
  });

  // Send Form button delegation — POST to worker, sends via Microsoft Graph
  const SA_FORM_URL = 'https://zfrmz.com/bhzD0iB9g82fARBm1ybA';
  document.getElementById('saTableBody')?.addEventListener('click', async e=>{
    const btn = e.target.closest('.sa-send-btn');
    if (!btn || btn.disabled) return;
    const { id, email, name } = btn.dataset;
    if (!email) return;
    // Sending state
    btn.disabled = true;
    btn.textContent = 'Sending…';
    btn.style.color = '#888';
    btn.style.borderColor = '#ccc';
    try {
      const formLink = `${SA_FORM_URL}?Name=${encodeURIComponent(name)}&Email=${encodeURIComponent(email)}`;
      const res = await fetch(`${WORKER_URL}/api/cruise/send-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, name, formLink }),
      });
      const data = await res.json();
      if (data.ok) {
        // Record success — persist date/time to Last Sent column
        _saSentIds.set(id, { ok: true, ts: new Date().toISOString() });
      } else {
        // Record failure — show "Failed" in Last Sent column
        _saSentIds.set(id, { ok: false, ts: new Date().toISOString() });
        console.error('Send Form error:', data.error);
      }
      _saveSaSentIds();
      saApply();   // re-render table with updated Last Sent; button stays "Send Form"
    } catch (err) {
      // Network/parse error — record failed
      _saSentIds.set(id, { ok: false, ts: new Date().toISOString() });
      _saveSaSentIds();
      console.error('Send Form network error:', err);
      saApply();
    }
  });

  saApply();
};

// ═════════════════════════════════════════════════════════════════════════════
// VISA PAGE — visa requirement tracking (CTI Indonesia · Report to Ship only)
// ═════════════════════════════════════════════════════════════════════════════

pages.visa = async function () {
  // ── Data prep ──────────────────────────────────────────────────────────────
  if (!_sfRows.length) {
    try {
      const { seafarers } = await fetchCruiseData(false);
      const RESIGNED = new Set(['resign','resigned']);
      _sfRows = (seafarers||[]).filter(s => !RESIGNED.has((s.onboardingStatus||'').trim().toLowerCase()));
    } catch (_) {}
  }
  // Include ONLY: CTI Indonesia · exclude resigned + report to ship
  const hasCtiData = _sfRows.some(r => !!r.ctiOffice);
  const VI_EXCLUDE = new Set(['resign','resigned','report to ship']);
  _vRows = _sfRows.filter(r => {
    const onb = (r.onboardingStatus||'').trim().toLowerCase();
    const cti = (r.ctiOffice||'').toLowerCase();
    return (hasCtiData ? cti.includes('indonesia') : true) && !VI_EXCLUDE.has(onb);
  });

  const rows        = _vRows;
  const cruiseLines = [...new Set(rows.map(r=>r.cruiseLine).filter(v=>v&&v!=='—'))].sort();
  const onbSts      = [...new Set(rows.map(r=>r.onboardingStatus).filter(v=>v&&v!=='—'))].sort();
  const isNtp       = s => (s||'').trim().toLowerCase() === 'need to process';

  // ── KPI counts ─────────────────────────────────────────────────────────────
  const kpiC1d      = rows.filter(r=>{const q=getVisaReqs(r);return q.c1d==='Required'||isNtp(r.c1dStatus);}).length;
  const kpiMcv      = rows.filter(r=>{const q=getVisaReqs(r);return q.mcv==='Required'||isNtp(r.mcvStatus);}).length;
  const kpiOktb     = rows.filter(r=>{const q=getVisaReqs(r);return q.oktb==='Required'||isNtp(r.oktbStatus);}).length;
  const kpiNzeta    = rows.filter(r=>{const q=getVisaReqs(r);return q.nzeta==='Required'||isNtp(r.nzetaStatus);}).length;
  const kpiAtv      = rows.filter(r=>{const q=getVisaReqs(r);return q.atv==='Required'||isNtp(r.atvStatus);}).length;
  const isSchengenNtp = r => (r.otherVisaName||'').toLowerCase().includes('schengen') && isNtp(r.otherVisaStatus);
  const kpiSchengen = rows.filter(r=>getVisaReqs(r).schengen==='Required'||isSchengenNtp(r)).length;
  const kpiAssigned = rows.filter(r => !!(r.signOnDate||'').trim()).length;

  // ── Column definitions ─────────────────────────────────────────────────────
  const VI_COLS = [
    { label:'Visa Required',     field:'_visaReq',         sort:false },
    { label:'Onboarding Status', field:'onboardingStatus', sort:true  },
    { label:'Countdown',         field:'_countdown',       sort:true  },
    { label:'Sign On Date',      field:'signOnDate',       sort:true  },
    { label:'Sign On Port',      field:'signOnPort',       sort:true  },
    { label:'Joining Ship',      field:'joiningShip',      sort:true  },
    { label:'Cruise Line',       field:'cruiseLine',       sort:true  },
    { label:'Seafarer ID',       field:'seafarerIdNumber', sort:true  },
    { label:'Name',              field:'fullName',         sort:true  },
    { label:'Email',             field:'email',            sort:true  },
  ];

  const thFCell = (c='') =>
    `<th style="padding:4px 6px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);">${c}</th>`;
  const colTxt = f =>
    `<input class="vi-col-f" data-field="${f}" type="text" placeholder="—"
       style="width:100%;height:24px;font-size:10px;padding:0 6px;border:1px solid var(--border,#ddd);
         border-radius:5px;background:var(--card-bg,#fff);color:var(--text);">`;

  const thSortLeader = `<th style="padding:8px 10px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);width:44px;"></th>`;
  const thSort = thSortLeader + VI_COLS.map(c =>
    `<th data-field="${escH(c.field)}" class="${c.sort?'vi-sortable':''}"
       style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;
         text-transform:uppercase;color:var(--text-muted,#888);background:var(--bg-page,#fafafa);
         border-bottom:1px solid var(--border,#e5e7eb);white-space:nowrap;
         ${c.sort?'cursor:pointer;user-select:none;':''}">
       ${escH(c.label)}${c.sort?' <span class="vi-sort-icon">⇅</span>':''}
     </th>`
  ).join('');

  const thFilter = thFCell() + VI_COLS.map(c => {
    const f = c.field;
    if (f==='onboardingStatus') return thFCell(buildColMS('viCF_onboardingStatus', onbSts));
    if (f==='cruiseLine')       return thFCell(buildColMS('viCF_cruiseLine', cruiseLines));
    if (f==='fullName'||f==='email'||f==='seafarerIdNumber'||f==='signOnPort'||f==='joiningShip') return thFCell(colTxt(f));
    return thFCell();
  }).join('');

  const kpiCard = (id,label,val,color,sub) =>
    `<div class="req-kpi-card" data-kpi="${id}" data-color="${color}"
       style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
       <span class="req-kpi-label">${escH(label)}</span>
       <span class="req-kpi-value" style="color:${color};" id="viKpi_${id}">${val}</span>
       <span class="req-kpi-sub">${escH(sub)}</span>
     </div>`;

  return `
    <div class="req-page-header">
      <h1>Visa <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;
        background:#FFF3CD;color:#856404;vertical-align:middle;margin-left:6px;">Beta</span></h1>
      <span class="req-live-badge">● Live · Zoho Recruit</span>
      <span class="req-page-sub">Visa requirement tracking · CTI Indonesia · excludes Resigned &amp; Report to Ship</span>
    </div>

    <div class="card req-filter-bar">
      ${buildMS('viCF_cruiseLine','Cruise Line',cruiseLines)}
      ${buildMS('viCF_onboardingStatus','Onboarding Status',onbSts)}
      <span style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">
        <label style="font-size:11px;color:var(--text-muted,#888);white-space:nowrap;">Sign On</label>
        <select id="viSignOnOp" style="height:30px;border:1px solid var(--border,#ddd);border-radius:5px;
          padding:0 18px 0 6px;font-size:11px;background:var(--card-bg,#fff) url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 5px center;background-size:8px;color:var(--text);cursor:pointer;appearance:none;-webkit-appearance:none;width:54px;">
          <option value="=">=</option><option value=">=">&gt;=</option><option value=">">&gt;</option>
          <option value="<=">&lt;=</option><option value="<">&lt;</option>
        </select>
        <input id="viSignOnDate" type="date" style="height:30px;border:1px solid var(--border,#ddd);
          border-radius:5px;padding:0 6px;font-size:11px;background:var(--card-bg,#fff);color:var(--text);">
      </span>
      <span style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">
        <label style="font-size:11px;color:var(--text-muted,#888);white-space:nowrap;">Sign Off</label>
        <select id="viSignOffOp" style="height:30px;border:1px solid var(--border,#ddd);border-radius:5px;
          padding:0 18px 0 6px;font-size:11px;background:var(--card-bg,#fff) url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 5px center;background-size:8px;color:var(--text);cursor:pointer;appearance:none;-webkit-appearance:none;width:54px;">
          <option value="=">=</option><option value=">=">&gt;=</option><option value=">">&gt;</option>
          <option value="<=">&lt;=</option><option value="<">&lt;</option>
        </select>
        <input id="viSignOffDate" type="date" style="height:30px;border:1px solid var(--border,#ddd);
          border-radius:5px;padding:0 6px;font-size:11px;background:var(--card-bg,#fff);color:var(--text);">
      </span>
      <button id="viClearBtn" class="req-clear-btn">Clear</button>
    </div>

    <div class="req-kpi-grid" id="viKpiGrid">
      ${kpiCard('all',      'Total Visa Required',   rows.length,  '#1B3A6B','CTI Indonesia · click to reset')}
      ${kpiCard('assigned', 'Total Have Assignment', kpiAssigned,  '#374151','sign-on date assigned')}
      ${kpiCard('c1d',      'C1/D Required',         kpiC1d,       '#B01A18','rule required or Need to Process')}
      ${kpiCard('mcv',      'MCV Required',          kpiMcv,       '#7C3AED','rule required or Need to Process')}
      ${kpiCard('oktb',     'OKTB Required',         kpiOktb,      '#D97706','Need to Process in Zoho')}
      ${kpiCard('nzeta',    'NZeTA Required',        kpiNzeta,     '#0891B2','Need to Process in Zoho')}
      ${kpiCard('atv',      'ATV Required',          kpiAtv,       '#DC2626','rule required or Need to Process')}
      ${kpiCard('schengen', 'Schengen Required',     kpiSchengen,  '#1D4ED8','port rule or Other Visa NTP')}
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;
        border-bottom:1px solid var(--border,#e5e7eb);flex-wrap:wrap;gap:8px;">
        <span style="font-size:12px;font-weight:600;color:var(--text);" id="viCount">—</span>
        <input id="viSearch" type="text" placeholder="🔍 Search name / email / ID / port…"
          style="height:28px;border:1px solid var(--border,#ddd);border-radius:6px;padding:0 10px;
            font-size:11px;background:var(--card-bg,#fff);color:var(--text);min-width:220px;">
      </div>
      <div style="overflow-x:auto;max-height:520px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:900px;">
          <thead style="position:sticky;top:0;z-index:2;">
            <tr id="viSortRow">${thSort}</tr>
            <tr id="viFilterRow">${thFilter}</tr>
          </thead>
          <tbody id="viTableBody"></tbody>
        </table>
      </div>
    </div>`;
};

pageEvents.visa = function () {
  let viActiveKpi = null, viSortF = null, viSortD = 1;
  const setT = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };


  // Compact badges for the combined Visa Required column
  const visaReqCell = r => {
    const vr  = getVisaReqs(r);
    const ntp = s => (s||'').trim().toLowerCase() === 'need to process';
    const seen = new Set();
    const items = [];
    const badge = (label, ruleRequired, zohoStatus) => {
      if (seen.has(label)) return;
      if (ruleRequired || ntp(zohoStatus)) {
        seen.add(label);
        items.push(`<span style="display:inline-block;font-size:9.5px;font-weight:700;padding:1px 6px;
          border-radius:8px;background:#DC262620;color:#DC2626;border:1px solid #DC262660;
          white-space:nowrap;margin:1px;">${label}</span>`);
      }
    };
    badge('C1/D',  vr.c1d  === 'Required', r.c1dStatus);
    badge('MCV',   vr.mcv  === 'Required', r.mcvStatus);
    badge('OKTB',  vr.oktb === 'Required',  r.oktbStatus);
    badge('NZeTA', vr.nzeta === 'Required', r.nzetaStatus);
    badge('ATV',   vr.atv  === 'Required', r.atvStatus);
    badge('Sch',   vr.schengen==='Required',
                   (r.otherVisaName||'').toLowerCase().includes('schengen') ? r.otherVisaStatus : null);
    return items.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:3px;min-width:160px;">${items.join('')}</div>`
      : _dash;
  };

  function renderVisaTableBody(rows) {
    const tbody = document.getElementById('viTableBody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="11"
        style="padding:28px;text-align:center;color:var(--text-muted,#888);font-size:13px;">
        No records found</td></tr>`;
      return;
    }
    const td = (content,extra='') =>
      `<td style="padding:6px 10px;border-bottom:1px solid var(--border,#f0f0f0);white-space:nowrap;${extra}">${content}</td>`;
    tbody.innerHTML = rows.map(r => {
      const vr = getVisaReqs(r);
      const detailBtn = `<button class="vi-detail-btn"
        data-id="${escH(r.id)}"
        title="View detail"
        style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;
          border-radius:6px;border:1px solid var(--border,#ddd);background:transparent;
          color:var(--text-muted,#888);cursor:pointer;font-family:inherit;
          transition:background 0.15s,color 0.15s;"
        onmouseover="this.style.background='var(--bg-hover,rgba(0,0,0,0.06))';this.style.color='var(--text,#1A1A1A)'"
        onmouseout="this.style.background='transparent';this.style.color='var(--text-muted,#888)'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>`;
      return `<tr>
        ${td(detailBtn)}
        <td style="padding:6px 10px;border-bottom:1px solid var(--border,#f0f0f0);min-width:180px;">${visaReqCell(r)}</td>
        ${td(sfOnbBadge(r.onboardingStatus))}
        ${td(sfCountdownBadge(r))}
        ${td(r.signOnDate?`<span style="font-size:11.5px;">${escH(r.signOnDate)}</span>`:_dash)}
        ${td(`<span style="font-size:11.5px;">${escH(r.signOnPort||'—')}</span>`)}
        ${td(`<span style="font-size:11.5px;">${escH(r.joiningShip||'—')}</span>`)}
        ${td(sfCruiseBadge(r.cruiseLine))}
        ${td(`<span style="font-size:11.5px;">${escH(r.seafarerIdNumber||'—')}</span>`)}
        ${td(`<span style="font-size:11.5px;">${escH(r.fullName||'—')}</span>`)}
        ${td(`<span style="font-size:11.5px;">${escH(r.email||'—')}</span>`)}
      </tr>`;
    }).join('');
  }

  function viFiltered() {
    const gCruise = msGetVals('viCF_cruiseLine');
    const gOnb    = msGetVals('viCF_onboardingStatus');
    const soOp    = document.getElementById('viSignOnOp')?.value   || '=';
    const soDate  = document.getElementById('viSignOnDate')?.value  || '';
    const sfOp    = document.getElementById('viSignOffOp')?.value   || '=';
    const sfDate  = document.getElementById('viSignOffDate')?.value || '';
    const search  = (document.getElementById('viSearch')?.value||'').trim().toLowerCase();
    const colText = {};
    document.querySelectorAll('.vi-col-f').forEach(inp => {
      if (inp.value.trim()) colText[inp.dataset.field]=inp.value.trim().toLowerCase();
    });

    const isNtp = s => (s||'').trim().toLowerCase() === 'need to process';

    let out = _vRows.filter(r => {
      if (gCruise.length && !gCruise.includes(r.cruiseLine))    return false;
      if (gOnb.length    && !gOnb.includes(r.onboardingStatus)) return false;
      if (!sfDateOp(r.signOnDate,  soOp, soDate))               return false;
      if (!sfDateOp(r.signOffDate, sfOp, sfDate))               return false;
      for (const [f,v] of Object.entries(colText))  { if (!String(r[f]??'').toLowerCase().includes(v)) return false; }
      if (search) {
        const hay=[r.fullName,r.email,r.seafarerIdNumber,r.signOnPort,r.cruiseLine,r.joiningShip].join(' ').toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    // KPI filter
    if (viActiveKpi && viActiveKpi !== 'all') {
      const isNtp2 = s => (s||'').trim().toLowerCase() === 'need to process';
      if      (viActiveKpi==='assigned') out=out.filter(r=>!!(r.signOnDate||'').trim());
      else if (viActiveKpi==='c1d')      out=out.filter(r=>{const q=getVisaReqs(r);return q.c1d==='Required'||isNtp2(r.c1dStatus);});
      else if (viActiveKpi==='mcv')      out=out.filter(r=>{const q=getVisaReqs(r);return q.mcv==='Required'||isNtp2(r.mcvStatus);});
      else if (viActiveKpi==='oktb')     out=out.filter(r=>{const q=getVisaReqs(r);return q.oktb==='Required'||isNtp2(r.oktbStatus);});
      else if (viActiveKpi==='nzeta')    out=out.filter(r=>{const q=getVisaReqs(r);return q.nzeta==='Required'||isNtp2(r.nzetaStatus);});
      else if (viActiveKpi==='atv')      out=out.filter(r=>{const q=getVisaReqs(r);return q.atv==='Required'||isNtp2(r.atvStatus);});
      else if (viActiveKpi==='schengen') out=out.filter(r=>getVisaReqs(r).schengen==='Required'||((r.otherVisaName||'').toLowerCase().includes('schengen')&&isNtp2(r.otherVisaStatus)));
    }

    // Sort
    if (viSortF) {
      out=out.slice().sort((a,b)=>{
        if (viSortF==='_countdown') return (sfCountdownSort(a)-sfCountdownSort(b))*viSortD;
        return String(a[viSortF]??'').localeCompare(String(b[viSortF]??''),undefined,{numeric:true})*viSortD;
      });
    }
    return out;
  }

  function viApply() {
    const rows = viFiltered();
    renderVisaTableBody(rows);
    setT('viCount', `${rows.length} seafarer${rows.length!==1?'s':''}`);
    document.querySelectorAll('#viKpiGrid [data-kpi]').forEach(card => {
      const isActive = card.dataset.kpi===(viActiveKpi||'all');
      const col = card.dataset.color||'#1B3A6B';
      card.style.outline   = isActive?`2px solid ${col}`:'';
      card.style.boxShadow = isActive?`0 2px 12px ${col}30`:'';
      card.style.transform = isActive?'translateY(-1px)':'';
    });

    // ── Update AI context ─────────────────────────────────────────────────
    window.CTI_PAGE_CONTEXT = {
      page: 'Visa',
      summary: (() => {
        const ntp2 = s=>(s||'').trim().toLowerCase()==='need to process';
        const c1dN = rows.filter(r=>{const q=getVisaReqs(r);return q.c1d==='Required'||ntp2(r.c1dStatus);}).length;
        const mcvN = rows.filter(r=>{const q=getVisaReqs(r);return q.mcv==='Required'||ntp2(r.mcvStatus);}).length;
        const oktbN= rows.filter(r=>{const q=getVisaReqs(r);return q.oktb==='Required'||ntp2(r.oktbStatus);}).length;
        const nzetaN=rows.filter(r=>{const q=getVisaReqs(r);return q.nzeta==='Required'||ntp2(r.nzetaStatus);}).length;
        const atvN = rows.filter(r=>{const q=getVisaReqs(r);return q.atv==='Required'||ntp2(r.atvStatus);}).length;
        const schN = rows.filter(r=>getVisaReqs(r).schengen==='Required'||((r.otherVisaName||'').toLowerCase().includes('schengen')&&ntp2(r.otherVisaStatus))).length;
        const byCL ={};rows.forEach(r=>{const k=r.cruiseLine||'—';if(k!=='—')byCL[k]=(byCL[k]||0)+1;});
        const top2 =(obj,n)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,val])=>`${k} (${val})`).join(', ');
        return [
          `Page: Visa (CTI Indonesia, non-resigned, non-report-to-ship seafarers)`,
          `Total showing: ${rows.length}`,
          `Visa action required:`,
          `  C1/D: ${c1dN} | MCV: ${mcvN} | OKTB: ${oktbN} | NZeTA: ${nzetaN} | ATV: ${atvN} | Schengen: ${schN}`,
          `Top Cruise Lines: ${top2(byCL,5)||'—'}`,
        ].join('\n');
      })(),
    };
  }

  initMS();
  ['viCF_cruiseLine','viCF_onboardingStatus'].forEach(id=>msOnChange(id,viApply));
  ['viSignOnOp','viSignOnDate','viSignOffOp','viSignOffDate'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change',viApply);
  });
  document.getElementById('viSearch')?.addEventListener('input',viApply);
  document.querySelectorAll('.vi-col-f').forEach(inp=>inp.addEventListener('input',viApply));
  document.getElementById('viClearBtn')?.addEventListener('click',()=>{
    ['viCF_cruiseLine','viCF_onboardingStatus'].forEach(msClear);
    ['viSignOnOp','viSignOffOp'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='=';});
    ['viSignOnDate','viSignOffDate'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    const gs=document.getElementById('viSearch'); if(gs) gs.value='';
    document.querySelectorAll('.vi-col-f').forEach(inp=>inp.value='');
    viActiveKpi=null; viSortF=null; viSortD=1;
    document.querySelectorAll('#viSortRow .vi-sort-icon').forEach(s=>s.textContent='⇅');
    viApply();
  });
  document.querySelectorAll('#viKpiGrid [data-kpi]').forEach(card=>{
    card.addEventListener('click',()=>{
      const kpi=card.dataset.kpi;
      viActiveKpi=(viActiveKpi===kpi||kpi==='all')?null:kpi;
      viApply();
    });
  });
  document.querySelectorAll('#viSortRow th.vi-sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const f=th.dataset.field;
      if(viSortF===f) viSortD*=-1; else{viSortF=f;viSortD=1;}
      document.querySelectorAll('#viSortRow .vi-sort-icon').forEach(s=>s.textContent='⇅');
      th.querySelector('.vi-sort-icon').textContent=viSortD>0?'↑':'↓';
      viApply();
    });
  });

  // ── Detail panel ───────────────────────────────────────────────────────────
  function openViDetail(zohoId) {
    const r = _vRows.find(x => x.id === zohoId) || _sfRows.find(x => x.id === zohoId);
    if (!r) return;
    const m = ensureReqModal();
    m.style.width = '500px';
    const vr = getVisaReqs(r);
    const row = (label, val) =>
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;
         padding:5px 0;border-bottom:1px solid var(--border,#f0f0f0);gap:12px;">
         <span style="font-size:11px;color:var(--text-muted,#888);white-space:nowrap;flex-shrink:0;">${label}</span>
         <span style="font-size:11.5px;font-weight:500;text-align:right;">${val||_dash}</span>
       </div>`;
    const sec = title =>
      `<div style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
         color:var(--text-muted,#888);margin:14px 0 6px;">${title}</div>`;
    const reqBadge = v => {
      const c = {'Required':'#DC2626','Not Required':'#6B7280','Review':'#D97706',
                 'Review Port Requirement':'#1D4ED8'}[v]||'#6B7280';
      return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;
        background:${c}20;color:${c};border:1.5px solid ${c}60;">${escH(v||'—')}</span>`;
    };
    const body = `
      <div style="padding:14px 16px 6px;">
        ${sec('Seafarer')}
        ${row('Name',          `<span style="font-weight:700;">${escH(r.fullName||'—')}</span>`)}
        ${row('Email',         escH(r.email||'—'))}
        ${row('Seafarer ID',   escH(r.seafarerIdNumber||'—'))}
        ${row('Onboarding',    sfOnbBadge(r.onboardingStatus))}
        ${row('CTI Office',    escH(r.ctiOffice||'—'))}
        ${sec('Deployment')}
        ${row('Cruise Line',   sfCruiseBadge(r.cruiseLine))}
        ${row('Joining Ship',  escH(r.joiningShip||'—'))}
        ${row('Sign On Port',  escH(r.signOnPort||'—'))}
        ${row('Sign On Date',  escH(r.signOnDate||'—'))}
        ${row('Sign Off Date', escH(r.signOffDate||'—'))}
        ${sec('Visa Requirements (System)')}
        ${row('C1/D Required',      reqBadge(vr.c1d))}
        ${row('MCV Required',       reqBadge(vr.mcv))}
        ${row('NZeTA Required',     reqBadge(vr.nzeta))}
        ${row('ATV Required',       reqBadge(vr.atv))}
        ${row('Schengen Required',  reqBadge(vr.schengen))}
        ${sec('Visa Status (Zoho)')}
        ${row('C1/D Status',        docStatusBadge(r.c1dStatus))}
        ${row('MCV Status',         docStatusBadge(r.mcvStatus))}
        ${row('OKTB Status',        docStatusBadge(r.oktbStatus))}
        ${row('NZeTA Status',       docStatusBadge(r.nzetaStatus))}
        ${row('ATV Status',         docStatusBadge(r.atvStatus))}
        ${r.otherVisaName ? row('Other Visa Name',   escH(r.otherVisaName)) : ''}
        ${r.otherVisaName ? row('Other Visa Status', docStatusBadge(r.otherVisaStatus)) : ''}
        ${sec('Notes')}
        <div style="font-size:11px;color:var(--text-muted,#888);line-height:1.6;padding:4px 0;">
          ${escH(vr.notes)}
        </div>
      </div>
      <div style="padding:10px 16px;border-top:1px solid var(--border,#e5e7eb);display:flex;justify-content:flex-end;">
        <button id="viDetailClose"
          style="padding:6px 16px;font-size:11.5px;font-weight:600;border:1px solid var(--border,#ddd);
            background:transparent;color:var(--text);border-radius:5px;cursor:pointer;font-family:inherit;">
          Close
        </button>
      </div>`;
    openReqModal(`${escH(r.fullName||'Seafarer')} — Visa Detail`, body,
      { x: Math.max(20, window.innerWidth/2 - 250), y: 60 });
    document.getElementById('viDetailClose')?.addEventListener('click', () => {
      document.getElementById('reqDrillModal').style.display = 'none';
    });
  }

  // Detail button click — delegate from tbody
  document.getElementById('viTableBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.vi-detail-btn');
    if (!btn) return;
    openViDetail(btn.dataset.id);
  });

  viApply();
};

// ═════════════════════════════════════════════════════════════════════════════
// REQUISITION PAGE — cruise job openings (Sea Based + River)
// ═════════════════════════════════════════════════════════════════════════════
const CRUISE_REQ_CATEGORIES = ['Sea Based', 'River'];
let _reqRows = [];   // cached for chart init in pageEvents

async function fetchCruiseRequisitions() {
  const r = await safeJson(WORKER_URL + '/api/recruit/job-openings');
  const all = r.data || [];
  return all.filter(j =>
    CRUISE_REQ_CATEGORIES.includes((j.placementCategory || '').trim())
    && (j.status || '').trim().toLowerCase() !== 'closed'    // exclude Closed
  );
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
        <div class="req-card-title">
          Headcount by Cruise Line
          <span class="req-drill-hint">↘ right-click a bar for talent pool &amp; demand</span>
        </div>
        <div class="req-card-sub">Open positions per cruise line</div>
        <canvas id="reqLineChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">
          Headcount by Department
          <span class="req-drill-hint">↘ right-click a bar for positions by cruise line</span>
        </div>
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
  { label:'Headcount',          field:'numPositions',     render:r => `<span style="font-weight:700;color:var(--text);">${parseInt(r.numPositions)||0}</span>` },
  { label:'Department',         field:'department',       render:r => escH(r.department) },
  { label:'Rank',               field:'positionName',     render:r => `<span style="font-weight:600;color:var(--text);">${escH(r.positionName)}</span>` },
  { label:'Salary',             field:'salary',           render:r => escH(r.salary) },
  { label:'Payment Frequency',  field:'paymentFrequency', render:r => escH(r.paymentFrequency) },
  { label:'Contract Length',    field:'contractLength',   render:r => escH(r.contractLength) },
  { label:'Flight Ticket',      field:'flightTicket',     render:r => escH(r.flightTicket) },
  { label:'Marlins (%)',        field:'marlins',          render:r => escH(r.marlins) },
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

  // Register the datalabels plugin once so it draws values on top of bars
  if (Chart && window.ChartDataLabels && !Chart._cruiseDLRegistered) {
    Chart.register(window.ChartDataLabels);
    Chart._cruiseDLRegistered = true;
  }

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tick = dark ? '#aaa' : '#555';
  // Compact display labels for the x-axis only. The underlying chart.data
  // labels keep the full name so right-click drill-down still matches.
  const LABEL_ABBR = {
    'Food & Beverage':        'F&B',
    'Deck & Engine':          'D&E',
    'Information Technology': 'IT',
    'Provisions & Inventory': 'P&I',
  };
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 18 } },        // room for the data labels above each bar
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ` ${c.parsed.y} positions` } },
      datalabels: {
        anchor: 'end', align: 'end', offset: 2,
        color: dark ? '#eee' : '#1A1A1A',
        font: { size: 10, weight: 700 },
        formatter: v => v,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: tick, font: { size: 10 },
          callback(value) {
            const lbl = this.getLabelForValue(value);
            return LABEL_ABBR[lbl] || lbl;
          },
        },
      },
      y: { display: false, beginAtZero: true },
    },
  };

  window._cruiseReqCharts = window._cruiseReqCharts || {};
  const mkBar = (id, entries, color, onContext) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window._cruiseReqCharts[id]) window._cruiseReqCharts[id].destroy();
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ data: entries.map(e => e[1]), backgroundColor: color, borderRadius: 0, maxBarThickness: 46 }],
      },
      options: baseOpts,
    });
    // Right-click on a bar → callback with the label + cursor coords
    el.oncontextmenu = (ev) => {
      const pts = chart.getElementsAtEventForMode(ev, 'nearest', { intersect: true }, true);
      if (pts.length) {
        ev.preventDefault();
        const label = chart.data.labels[pts[0].index];
        const value = chart.data.datasets[0].data[pts[0].index];
        onContext(label, value, { x: ev.clientX, y: ev.clientY });
      }
    };
    window._cruiseReqCharts[id] = chart;
  };

  window._cruiseReqRenderCharts = (rows) => {
    const by = (key) => {
      const m = {};
      rows.forEach(r => { const k = r[key] || '—'; if (k === '—') return; m[k] = (m[k] || 0) + (parseInt(r.numPositions) || 0); });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    mkBar('reqLineChart', by('clientName'),  '#B01A18', showCruiseLineDetail);
    mkBar('reqDeptChart', by('department'),  '#1B3A6B', showDepartmentDetail);
  };
  window._cruiseReqRenderCharts(_reqRows);
};

// ── Right-click drill-down: small floating draggable panel ────────────────
function ensureReqModal() {
  let m = document.getElementById('reqDrillModal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'reqDrillModal';
  m.style.cssText = `position:fixed;top:120px;left:62%;width:360px;max-height:72vh;
    background:var(--card-bg,#fff);color:var(--text);
    border:1px solid var(--border,#e5e7eb);border-radius:10px;
    box-shadow:0 10px 32px rgba(0,0,0,0.22);
    display:none;flex-direction:column;z-index:9999;overflow:hidden;`;
  m.innerHTML = `
    <div id="reqDrillHead"
      style="padding:11px 14px;border-bottom:1px solid var(--border,#eee);background:var(--bg-page,#fafafa);
        display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:move;user-select:none;"></div>
    <div id="reqDrillBody" style="padding:0;overflow:auto;flex:1;font-size:12px;"></div>`;
  document.body.appendChild(m);

  // Drag by header
  const head = m.querySelector('#reqDrillHead');
  let drag = null;
  head.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX - m.offsetLeft, y: e.clientY - m.offsetTop };
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    const x = Math.max(0, Math.min(window.innerWidth  - 60, e.clientX - drag.x));
    const y = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - drag.y));
    m.style.left = x + 'px';
    m.style.top  = y + 'px';
    m.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => { drag = null; document.body.style.userSelect = ''; });

  return m;
}
function openReqModal(title, bodyHtml, at) {
  const m = ensureReqModal();
  document.getElementById('reqDrillHead').innerHTML = `
    <div style="min-width:0;flex:1;">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);">Drill-down</div>
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
    </div>
    <button onclick="document.getElementById('reqDrillModal').style.display='none'"
      style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted,#888);line-height:1;padding:2px 6px;border-radius:4px;flex-shrink:0;">×</button>`;
  document.getElementById('reqDrillBody').innerHTML = bodyHtml;
  m.style.display = 'flex';

  // Position the panel at the cursor (offset slightly so the click point is
  // visible), clamped inside the viewport.
  if (at && typeof at.x === 'number') {
    const w  = m.offsetWidth  || 360;
    const h  = Math.min(m.offsetHeight || 400, window.innerHeight * 0.72);
    const x  = Math.max(8, Math.min(window.innerWidth  - w - 8, at.x + 12));
    const y  = Math.max(8, Math.min(window.innerHeight - h - 8, at.y + 12));
    m.style.left  = x + 'px';
    m.style.top   = y + 'px';
    m.style.right = 'auto';
  }
}

// Shared compact-drill styles
const DRILL_TH = `padding:5px 10px;text-align:left;font-size:9px;font-weight:700;
  letter-spacing:0.05em;text-transform:uppercase;color:#fff;background:#1A1A1A;`;
const DRILL_TD = `padding:5px 10px;font-size:10.5px;border-bottom:1px solid var(--border,#f0f0f0);
  white-space:nowrap;`;
const DRILL_SECTION = `padding:8px 12px 4px;font-size:9.5px;font-weight:800;
  letter-spacing:0.1em;text-transform:uppercase;color:#B01A18;
  background:var(--bg-page,#fafafa);border-top:1px solid var(--border,#eee);`;

// Department drill — positions in this department, grouped by cruise line
function showDepartmentDetail(dept, _value, at) {
  const rows = _reqRows.filter(r => r.department === dept);
  const tree = {};
  rows.forEach(r => {
    const cl = r.clientName || '—';
    const pos = r.positionName || '—';
    tree[cl] = tree[cl] || {};
    tree[cl][pos] = (tree[cl][pos] || 0) + (parseInt(r.numPositions) || 0);
  });
  const lines = Object.keys(tree).sort();
  const total = rows.reduce((s, r) => s + (parseInt(r.numPositions) || 0), 0);

  const body = lines.length ? `
    <div style="${DRILL_SECTION}border-top:none;">Positions by Cruise Line · ${total} total</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${DRILL_TH}">Cruise Line</th>
        <th style="${DRILL_TH}">Rank</th>
        <th style="${DRILL_TH}text-align:right;width:60px;">HC</th>
      </tr></thead>
      <tbody>
        ${lines.flatMap(cl => {
          const positions = Object.entries(tree[cl]).sort((a, b) => b[1] - a[1]);
          const subtotal  = positions.reduce((s, p) => s + p[1], 0);
          return [
            `<tr style="background:rgba(176,26,24,0.04);">
              <td style="${DRILL_TD}font-weight:700;color:#B01A18;">${escH(cl)}</td>
              <td style="${DRILL_TD}color:var(--text-muted,#888);font-style:italic;">${positions.length} position${positions.length!==1?'s':''}</td>
              <td style="${DRILL_TD}text-align:right;font-weight:700;color:#B01A18;">${subtotal}</td>
            </tr>`,
            ...positions.map(([p, q]) => `<tr>
              <td style="${DRILL_TD}color:transparent;">·</td>
              <td style="${DRILL_TD}padding-left:22px;">${escH(p)}</td>
              <td style="${DRILL_TD}text-align:right;font-weight:600;">${q}</td>
            </tr>`),
          ];
        }).join('')}
      </tbody>
    </table>` : `<div style="padding:24px;text-align:center;color:var(--text-muted,#aaa);font-size:11px;">No positions found.</div>`;
  openReqModal(`${escH(dept)}`, body, at);
}

// Cruise line drill — talent pool quotas and monthly demand
function showCruiseLineDetail(line, _value, at) {
  const node = brandNode(loadDemand(), line);
  const tp = node.talentPool || {};
  const monthly = node.monthly || {};
  const tpPositions = Object.keys(tp).sort();
  const monthList = Object.keys(monthly).sort();
  const tpTotal = tpPositions.reduce((s, p) => s + Number(tp[p] || 0), 0);

  const tpBlock = tpPositions.length ? `
    <div style="${DRILL_SECTION}border-top:none;">Talent Pool (running) · ${tpTotal}</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${DRILL_TH}">Position</th>
        <th style="${DRILL_TH}text-align:right;width:60px;">Qty</th>
      </tr></thead>
      <tbody>
        ${tpPositions.map(p => `<tr>
          <td style="${DRILL_TD}">${escH(p)}</td>
          <td style="${DRILL_TD}text-align:right;font-weight:600;">${tp[p]}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<div style="${DRILL_SECTION}border-top:none;">Talent Pool</div>
    <div style="padding:10px 14px;color:var(--text-muted,#aaa);font-size:10.5px;font-style:italic;">No talent pool configured.</div>`;

  const demandBlocks = monthList.length ? monthList.map(mk => {
    const month = monthly[mk] || {};
    const positions = Object.entries(month).sort((a, b) => b[1] - a[1]);
    if (!positions.length) return '';
    const sub = positions.reduce((s, p) => s + p[1], 0);
    return `
      <div style="${DRILL_SECTION}">${escH(monthLabel(mk))} · ${sub}</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="${DRILL_TH}">Position</th>
          <th style="${DRILL_TH}text-align:right;width:60px;">Qty</th>
        </tr></thead>
        <tbody>
          ${positions.map(([p, q]) => `<tr>
            <td style="${DRILL_TD}">${escH(p)}</td>
            <td style="${DRILL_TD}text-align:right;font-weight:600;">${q}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }).join('') : `<div style="${DRILL_SECTION}">Monthly Demand</div>
    <div style="padding:10px 14px;color:var(--text-muted,#aaa);font-size:10.5px;font-style:italic;">No monthly demand configured.</div>`;

  openReqModal(`${escH(line)}`, tpBlock + demandBlocks, at);
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPLOYMENT PAGE — Zoho Sheet "Cruise Line Deployment Report"
// ═════════════════════════════════════════════════════════════════════════════

// Flexible column name detection — tries each candidate, returns first found in row
function depTryCol(row, ...opts) {
  return opts.find(k => k in row) || opts[0];
}

// Parse a date string → { year, month(0-11), label:"Jan 2026", sortKey:"202601" }
// Accepts: "DD/MM/YYYY", "YYYY-MM-DD", "Jan 2026", "January 2026"
function depParseDate(str) {
  if (!str) return null;
  const ABBR  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const FULL  = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const s = str.toLowerCase().trim();
  // "Jan 2026" / "January 2026"
  for (let m = 0; m < 12; m++) {
    if (s.startsWith(ABBR[m]) || s.startsWith(FULL[m])) {
      const y = str.match(/\d{4}/);
      if (y) {
        const year = +y[0], mo = m;
        const lbl  = ABBR[m][0].toUpperCase()+ABBR[m].slice(1)+' '+year;
        return { year, month:mo, label:lbl, sortKey:`${year}${String(mo+1).padStart(2,'0')}` };
      }
    }
  }
  // DD/MM/YYYY or MM/DD/YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const mo = +dmy[2]-1, year = +dmy[3];
    const lbl = ABBR[mo]?.[0].toUpperCase()+(ABBR[mo]?.slice(1)||'')+' '+year;
    return { year, month:mo, label:lbl, sortKey:`${year}${String(mo+1).padStart(2,'0')}` };
  }
  // YYYY-MM-DD
  const iso = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (iso) {
    const year = +iso[1], mo = +iso[2]-1;
    const lbl = ABBR[mo]?.[0].toUpperCase()+(ABBR[mo]?.slice(1)||'')+' '+year;
    return { year, month:mo, label:lbl, sortKey:`${year}${String(mo+1).padStart(2,'0')}` };
  }
  return null;
}

const DEP_MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
const DEP_SEL = `height:30px;border:1px solid var(--border,#ddd);border-radius:6px;
  padding:0 20px 0 8px;font-size:11px;font-family:inherit;min-width:110px;
  background:var(--card-bg,#fff) url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6%22 fill=%22%23888%22/></svg>') no-repeat right 6px center;
  background-size:8px;color:var(--text);cursor:pointer;appearance:none;-webkit-appearance:none;`;

pages.deployment = async function () {
  // ── Fetch from Zoho Sheet ──────────────────────────────────────────────────
  try {
    const r = await safeJson(WORKER_URL + '/api/cruise/deployment?_v=2');
    _depRows = r.data || [];
  } catch (_) { _depRows = []; }
  setTimeout(buildFullPortalContext, 0); // update AI context after deployment data loads

  const raw  = _depRows;
  const first = raw[0] || {};

  // ── Column mapping ─────────────────────────────────────────────────────────
  const COL = {
    cruiseLine:         depTryCol(first,'Cruise Line','Cruise_Line','Brand'),
    empStatus:          depTryCol(first,'Employment Status','Employment_Status','Employment Type'),
    ctiOffice:          depTryCol(first,'CTI Office','CTI_Office','Office'),
    ctiOfficeAnalytics: depTryCol(first,'CTI Office Analytics','CTI_Office_Analytics','CTI Office'),
    empReport:          depTryCol(first,'Employment Report','Employment_Report','Employment Status'),
    date:               depTryCol(first,'Sign On Date','Sign-On Date','Sign_On_Date',
                                  'Deployment Date','Date','Month Year','Month'),
  };

  const v = (r, col) => (r[col]||'').toString().trim();

  // ── Filter options ─────────────────────────────────────────────────────────
  const cruiseLines = [...new Set(raw.map(r=>v(r,COL.cruiseLine)).filter(Boolean))].sort();
  const empStatuses = [...new Set(raw.map(r=>v(r,COL.empStatus)).filter(Boolean))].sort();
  const ctiOffices  = [...new Set(raw.map(r=>v(r,COL.ctiOfficeAnalytics)).filter(Boolean))].sort();
  const years       = [...new Set(raw.map(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year; }).filter(Boolean))].sort((a,b)=>b-a);

  // ── KPI counts (full data) ─────────────────────────────────────────────────
  const now      = new Date();
  const curYear  = now.getFullYear(), curMonth = now.getMonth();
  const prevMonth     = curMonth === 0 ? 11 : curMonth - 1;
  const prevMonthYear = curMonth === 0 ? curYear - 1 : curYear;

  const kpiTotal     = raw.length;
  const kpiThisYear  = raw.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear && d?.month<=curMonth; }).length;
  const kpiLastYear  = raw.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear-1 && d?.month<=curMonth; }).length;
  const kpiThisMonth = raw.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear&&d?.month===curMonth; }).length;
  const kpiLastMonth = raw.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===prevMonthYear&&d?.month===prevMonth; }).length;
  const kpiRepeater  = raw.filter(r=>(v(r,COL.empStatus)||'').toLowerCase()==='repeater').length;
  const kpiNewHire   = raw.filter(r=>{ const s=(v(r,COL.empStatus)||'').toLowerCase(); return s==='new hire'||s==='re hire'; }).length;

  const yoyPct  = kpiLastYear  === 0 ? null : (kpiThisYear  - kpiLastYear)  / kpiLastYear  * 100;
  const momPct  = kpiLastMonth === 0 ? null : (kpiThisMonth - kpiLastMonth) / kpiLastMonth * 100;

  const pctBadge = (pct) => {
    if (pct === null) return `<span style="font-size:11px;color:var(--text-muted,#888);">—</span>`;
    const up = pct >= 0;
    const col = up ? '#15803D' : '#DC2626';
    const icon = up ? '▲' : '▼';
    return `<span style="font-size:12px;font-weight:700;color:${col};margin-left:5px;">${icon} ${Math.abs(pct).toFixed(1)}%</span>`;
  };

  const kpiCard = (id, label, valHtml, color, sub) =>
    `<div class="req-kpi-card" data-kpi="${id}" data-color="${color}"
       style="cursor:pointer;transition:outline 0.15s,box-shadow 0.15s,transform 0.15s;">
       <span class="req-kpi-label">${escH(label)}</span>
       <span class="req-kpi-value" style="color:${color};display:flex;align-items:center;flex-wrap:wrap;gap:2px;" id="depKpi_${id}">${valHtml}</span>
       <span class="req-kpi-sub">${escH(sub)}</span>
     </div>`;

  return `
    <div class="req-page-header">
      <h1>Deployment</h1>
      <span class="req-live-badge">● Live · Zoho Sheet</span>
      <span class="req-page-sub">Cruise Line Deployment Report</span>
    </div>

    <div class="card req-filter-bar">
      ${buildMS('depCF_cruiseLine','Cruise Line',cruiseLines)}
      ${buildMS('depCF_empStatus','Employment Status',empStatuses)}
      ${buildMS('depCF_ctiOffice','CTI Office',ctiOffices)}
      <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;">
        <label style="font-size:11px;color:var(--text-muted,#888);white-space:nowrap;">Month</label>
        <select id="depMonthFilter" style="${DEP_SEL}">
          <option value="">All Months</option>
          ${DEP_MONTH_NAMES.map((m,i)=>`<option value="${i}">${m}</option>`).join('')}
        </select>
      </span>
      <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;">
        <label style="font-size:11px;color:var(--text-muted,#888);white-space:nowrap;">Year</label>
        <select id="depYearFilter" style="${DEP_SEL}min-width:80px;">
          <option value="">All Years</option>
          ${years.map(y=>`<option value="${y}">${y}</option>`).join('')}
        </select>
      </span>
      <button id="depClearBtn" class="req-clear-btn">Clear</button>
    </div>

    <div class="req-kpi-grid" id="depKpiGrid">
      ${kpiCard('all',      'Total Deployment',                    `${kpiTotal}`,                            '#1B3A6B', 'all records · click to reset')}
      ${kpiCard('yoy',      `vs ${curYear-1}`,                     `${kpiThisYear}${pctBadge(yoyPct)}`,     '#2D7A55', `Jan–${DEP_MONTH_NAMES[curMonth].slice(0,3)} ${curYear-1}: ${kpiLastYear}`)}
      ${kpiCard('mom',      `vs ${DEP_MONTH_NAMES[prevMonth]}`,    `${kpiThisMonth}${pctBadge(momPct)}`,    '#0891B2', `last month: ${kpiLastMonth} · month-over-month`)}
      ${kpiCard('emptype',  'Repeater / New Hire',
        `${kpiRepeater}<span style="font-size:14px;color:var(--text-muted,#888);margin:0 5px;">/</span><span style="color:#7C3AED;">${kpiNewHire}</span>`,
        '#D97706', 'repeater · new hire + re hire')}
    </div>

    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Deployment by Cruise Line</div>
        <div class="req-card-sub">Total deployments per cruise line</div>
        <canvas id="depLineChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">Deployment by Month</div>
        <div class="req-card-sub">Monthly deployment trend (chronological)</div>
        <canvas id="depMonthChart"></canvas>
      </div>
    </div>
    <div class="req-chart-row">
      <div class="card req-chart-card">
        <div class="req-card-title">Deployment by CTI Office</div>
        <div class="req-card-sub">Based on CTI Office Analytics column</div>
        <canvas id="depOfficeChart"></canvas>
      </div>
      <div class="card req-chart-card">
        <div class="req-card-title">Deployment by Employment Type</div>
        <div class="req-card-sub">Based on Employment Report column</div>
        <canvas id="depEmpChart"></canvas>
      </div>
    </div>`;
};

pageEvents.deployment = function () {
  if (typeof Chart === 'undefined') return;
  if (Chart && window.ChartDataLabels && !Chart._cruiseDLRegistered) {
    Chart.register(window.ChartDataLabels);
    Chart._cruiseDLRegistered = true;
  }

  const raw   = _depRows;
  const first = raw[0] || {};
  const COL = {
    cruiseLine:         depTryCol(first,'Cruise Line','Cruise_Line','Brand'),
    empStatus:          depTryCol(first,'Employment Status','Employment_Status','Employment Type'),
    ctiOffice:          depTryCol(first,'CTI Office','CTI_Office','Office'),
    ctiOfficeAnalytics: depTryCol(first,'CTI Office Analytics','CTI_Office_Analytics','CTI Office'),
    empReport:          depTryCol(first,'Employment Report','Employment_Report','Employment Status'),
    date:               depTryCol(first,'Sign On Date','Sign-On Date','Sign_On_Date',
                                  'Deployment Date','Date','Month Year','Month'),
  };
  const v = (r, col) => (r[col]||'').toString().trim();

  window._depCharts = window._depCharts || {};
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const depBaseOpts = {
    responsive:true, maintainAspectRatio:false,
    layout:{ padding:{ top:18 } },
    plugins:{
      legend:{ display:false },
      tooltip:{ callbacks:{ label: c=>` ${c.parsed.y}` } },
      datalabels:{ anchor:'end',align:'end',offset:2,
        color:dark?'#eee':'#1A1A1A', font:{size:10,weight:700}, formatter:v=>v },
    },
    scales:{
      x:{ grid:{display:false}, ticks:{color:dark?'#aaa':'#555',font:{size:10}} },
      y:{ display:false, beginAtZero:true },
    },
  };

  const mkDepBar = (id, entries, color) => {
    const el = document.getElementById(id); if (!el) return;
    if (window._depCharts[id]) window._depCharts[id].destroy();
    window._depCharts[id] = new Chart(el, {
      type:'bar',
      data:{ labels:entries.map(e=>e[0]),
             datasets:[{data:entries.map(e=>e[1]),backgroundColor:color,borderRadius:0,maxBarThickness:46}] },
      options:depBaseOpts,
    });
  };

  let depActiveKpi = null;
  const setT = (id,val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  const now = new Date();
  const curYear  = now.getFullYear(), curMonth = now.getMonth();
  const prevMonth     = curMonth === 0 ? 11 : curMonth - 1;
  const prevMonthYear = curMonth === 0 ? curYear - 1 : curYear;

  const pctBadgeLive = (pct) => {
    if (pct === null) return `<span style="font-size:11px;color:var(--text-muted,#888);">—</span>`;
    const up = pct >= 0, col = up ? '#15803D' : '#DC2626';
    return `<span style="font-size:12px;font-weight:700;color:${col};margin-left:5px;">${up?'▲':'▼'} ${Math.abs(pct).toFixed(1)}%</span>`;
  };

  function depFiltered() {
    const gLine  = msGetVals('depCF_cruiseLine');
    const gEmp   = msGetVals('depCF_empStatus');
    const gOff   = msGetVals('depCF_ctiOffice');
    const mo     = document.getElementById('depMonthFilter')?.value;
    const yr     = document.getElementById('depYearFilter')?.value;

    let out = raw.filter(r => {
      if (gLine.length && !gLine.includes(v(r,COL.cruiseLine)))  return false;
      if (gEmp.length  && !gEmp.includes(v(r,COL.empStatus)))    return false;
      if (gOff.length  && !gOff.includes(v(r,COL.ctiOfficeAnalytics))) return false;
      if (mo !== '' && mo !== undefined && mo !== null) {
        const d = depParseDate(v(r,COL.date));
        if (!d || d.month !== +mo) return false;
      }
      if (yr) {
        const d = depParseDate(v(r,COL.date));
        if (!d || d.year !== +yr) return false;
      }
      return true;
    });

    // KPI sub-filter
    if (depActiveKpi && depActiveKpi !== 'all') {
      if (depActiveKpi==='yoy') out=out.filter(r=>{
        const d=depParseDate(v(r,COL.date)); if(!d) return false;
        return (d.year===curYear && d.month<=curMonth) || (d.year===curYear-1 && d.month<=curMonth);
      });
      else if (depActiveKpi==='mom') out=out.filter(r=>{
        const d=depParseDate(v(r,COL.date)); if(!d) return false;
        return (d.year===curYear && d.month===curMonth) || (d.year===prevMonthYear && d.month===prevMonth);
      });
      else if (depActiveKpi==='emptype')  out=out.filter(r=>{ const s=(v(r,COL.empStatus)||'').toLowerCase(); return s==='repeater'||s==='new hire'||s==='re hire'; });
    }
    return out;
  }

  function depApply() {
    const rows = depFiltered();

    // ── KPI value updates ───────────────────────────────────────────────────
    const setH = (id, html) => { const e=document.getElementById(id); if(e) e.innerHTML=html; };
    const thisYr  = rows.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear && d?.month<=curMonth; }).length;
    const lastYr  = rows.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear-1 && d?.month<=curMonth; }).length;
    const thisMo  = rows.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===curYear&&d?.month===curMonth; }).length;
    const lastMo  = rows.filter(r=>{ const d=depParseDate(v(r,COL.date)); return d?.year===prevMonthYear&&d?.month===prevMonth; }).length;
    const yoy = lastYr  === 0 ? null : (thisYr - lastYr) / lastYr * 100;
    const mom = lastMo  === 0 ? null : (thisMo - lastMo) / lastMo * 100;

    setH('depKpi_all',      `${rows.length}`);
    setH('depKpi_yoy',      `${thisYr}${pctBadgeLive(yoy)}`);
    setH('depKpi_mom',      `${thisMo}${pctBadgeLive(mom)}`);
    const rCount = rows.filter(r=>(v(r,COL.empStatus)||'').toLowerCase()==='repeater').length;
    const nCount = rows.filter(r=>{ const s=(v(r,COL.empStatus)||'').toLowerCase(); return s==='new hire'||s==='re hire'; }).length;
    setH('depKpi_emptype', `${rCount}<span style="font-size:14px;color:var(--text-muted,#888);margin:0 5px;">/</span><span style="color:#7C3AED;">${nCount}</span>`);

    // KPI card highlight
    document.querySelectorAll('#depKpiGrid [data-kpi]').forEach(card => {
      const isActive = card.dataset.kpi===(depActiveKpi||'all');
      const col = card.dataset.color||'#1B3A6B';
      card.style.outline   = isActive?`2px solid ${col}`:'';
      card.style.boxShadow = isActive?`0 2px 12px ${col}30`:'';
      card.style.transform = isActive?'translateY(-1px)':'';
    });

    // ── Chart 1: by Cruise Line ──────────────────────────────────────────
    const byLine = {};
    rows.forEach(r=>{ const k=v(r,COL.cruiseLine)||'—'; if(k!=='—') byLine[k]=(byLine[k]||0)+1; });
    mkDepBar('depLineChart', Object.entries(byLine).sort((a,b)=>b[1]-a[1]), '#1B3A6B');

    // ── Chart 2: by Month-Year (chronological) ───────────────────────────
    const byMonth = {};
    rows.forEach(r=>{
      const d = depParseDate(v(r,COL.date));
      if (d) byMonth[d.sortKey] = byMonth[d.sortKey] || { label:d.label, count:0 };
      if (d) byMonth[d.sortKey].count++;
    });
    const monthEntries = Object.entries(byMonth)
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([,o])=>[o.label, o.count]);
    mkDepBar('depMonthChart', monthEntries, '#2D7A55');

    // ── Chart 3: by CTI Office Analytics ────────────────────────────────
    const byOffice = {};
    rows.forEach(r=>{ const k=v(r,COL.ctiOfficeAnalytics)||'—'; if(k!=='—') byOffice[k]=(byOffice[k]||0)+1; });
    mkDepBar('depOfficeChart', Object.entries(byOffice).sort((a,b)=>b[1]-a[1]), '#B01A18');

    // ── Chart 4: by Employment Report ───────────────────────────────────
    const byEmp = {};
    rows.forEach(r=>{ const k=v(r,COL.empReport)||'—'; if(k!=='—') byEmp[k]=(byEmp[k]||0)+1; });
    mkDepBar('depEmpChart', Object.entries(byEmp).sort((a,b)=>b[1]-a[1]), '#7C3AED');

    // ── Update AI context ─────────────────────────────────────────────────
    window.CTI_PAGE_CONTEXT = {
      page: 'Deployment',
      summary: (() => {
        const top = (obj, n) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,val])=>`${k} (${val})`).join(', ');
        const byLine2={}, byOff2={}, byEmp2={};
        rows.forEach(r=>{
          const k1=v(r,COL.cruiseLine)||'—'; if(k1!=='—') byLine2[k1]=(byLine2[k1]||0)+1;
          const k2=v(r,COL.ctiOfficeAnalytics)||'—'; if(k2!=='—') byOff2[k2]=(byOff2[k2]||0)+1;
          const k3=v(r,COL.empStatus)||'—'; if(k3!=='—') byEmp2[k3]=(byEmp2[k3]||0)+1;
        });
        return [
          `Page: Deployment — Cruise Line Deployment Report`,
          `Total records (all data): ${raw.length.toLocaleString()}`,
          `Currently showing: ${rows.length.toLocaleString()} records`,
          ``,
          `KPIs (filtered view):`,
          `  This year (Jan–${DEP_MONTH_NAMES[curMonth]} ${curYear}): ${thisYr}`,
          `  Last year (Jan–${DEP_MONTH_NAMES[curMonth]} ${curYear-1}): ${lastYr} (${yoy===null?'N/A':(yoy>=0?'+':'')+yoy.toFixed(1)+'%'})`,
          `  This month (${DEP_MONTH_NAMES[curMonth]} ${curYear}): ${thisMo}`,
          `  Last month (${DEP_MONTH_NAMES[prevMonth]}): ${lastMo} (${mom===null?'N/A':(mom>=0?'+':'')+mom.toFixed(1)+'%'})`,
          `  Repeater: ${rCount} | New Hire + Re Hire: ${nCount}`,
          ``,
          `Top Cruise Lines: ${top(byLine2,5)||'—'}`,
          `Top CTI Offices: ${top(byOff2,5)||'—'}`,
          `Employment: ${top(byEmp2,5)||'—'}`,
        ].join('\n');
      })(),
    };
  }

  initMS();
  ['depCF_cruiseLine','depCF_empStatus','depCF_ctiOffice'].forEach(id=>msOnChange(id,depApply));
  ['depMonthFilter','depYearFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',depApply));
  document.getElementById('depClearBtn')?.addEventListener('click',()=>{
    ['depCF_cruiseLine','depCF_empStatus','depCF_ctiOffice'].forEach(msClear);
    ['depMonthFilter','depYearFilter'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
    depActiveKpi=null;
    depApply();
  });
  document.querySelectorAll('#depKpiGrid [data-kpi]').forEach(card=>{
    card.addEventListener('click',()=>{
      const kpi=card.dataset.kpi;
      depActiveKpi=(depActiveKpi===kpi||kpi==='all')?null:kpi;
      depApply();
    });
  });

  depApply();
};

// ═════════════════════════════════════════════════════════════════════════════
// REPORT PAGE — Weekly cruise hiring report generator
// ═════════════════════════════════════════════════════════════════════════════
pages.reports = async function () {
  return `
    <div class="req-page-header">
      <h1>Report</h1>
      <span class="req-page-sub">Cruise line reports</span>
    </div>

    <div class="task-layout">
      <nav class="task-tabbar">
        <button class="task-sub-link active" data-section="generate">CUK Weekly Report</button>
        <button class="task-sub-link" data-section="mistral">CUK Mistral ID Request</button>
        <button class="task-sub-link" data-section="heatmap">CUK Heat Map Report</button>
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
            <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
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
              <div style="font-size:16px;font-weight:700;color:var(--text);">CUK Mistral ID Request</div>
              <div style="font-size:12px;color:var(--text-muted,#888);margin-top:3px;">
                Hired seafarers across Cunard, P&amp;O and CUK Maritime with no Seafarer ID yet — Mistral registration needed. Resigned excluded.
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button id="mistralDownload" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Download Excel</button>
            </div>
          </div>

          <!-- Date range filter -->
          <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border,#eee);">
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Hired From</div>
              <input type="date" id="mistralFrom" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <div>
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Hired To</div>
              <input type="date" id="mistralTo" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
            </div>
            <button id="mistralApply" style="padding:8px 18px;font-size:12.5px;font-weight:600;border-radius:7px;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Apply</button>
          </div>
        </div>

        <!-- KPIs (one row) -->
        <div class="req-kpi-grid" id="mistralKpis" style="grid-template-columns:repeat(5,minmax(0,1fr));"></div>

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
      <!-- ═══ CUK Heat Map Report ═══ -->
      <section class="task-section" data-section="heatmap" style="display:none;">
        <div class="card" style="padding:22px 26px;margin-bottom:18px;">
          <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text);">CTI Group Heat Map Report</div>
              <div style="font-size:12px;color:var(--text-muted,#888);margin-top:3px;">
                Quarterly RAG performance scorecard for Carnival UK.
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
              <div>
                <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Quarter</div>
                <select id="hmQuarter" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);min-width:240px;"></select>
              </div>
              <div>
                <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--text-muted,#888);margin-bottom:6px;">Report Date</div>
                <input type="date" id="hmReportDate" style="padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:7px;font-size:13px;font-family:inherit;background:var(--card-bg,#fff);color:var(--text);">
              </div>
              <button id="hmDownloadBtn" style="padding:9px 22px;font-size:13px;font-weight:600;border-radius:7px;border:none;background:#B01A18;color:#fff;cursor:pointer;font-family:inherit;">Download PDF</button>
            </div>
          </div>

          <!-- Inner sub-nav: the three pages -->
          <div class="rpt-subnav" style="margin-top:18px;margin-bottom:0;">
            <button class="hm-subnav-btn active" data-hm="explain">1 · Parameter</button>
            <button class="hm-subnav-btn" data-hm="scorecard">2 · Scorecard</button>
            <button class="hm-subnav-btn" data-hm="detail">3 · Performance Detail</button>
            <button class="hm-subnav-btn" data-hm="summary">4 · Executive Summary</button>
          </div>
        </div>

        <div id="hmPreview" class="card" style="padding:0;overflow:auto;"></div>
      </section>

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

// ═══════════════════════════════════════════════════════════════════════════
// CUK HEAT MAP REPORT
// Three pages: 1) Parameter Explanation (static reference), 2) Performance
// Report (editable — type numbers + explanations, cells auto-colour by RAG),
// 3) Executive Summary (read-only, derived from the Performance data).
// Entered values persist per-quarter in localStorage.
// ═══════════════════════════════════════════════════════════════════════════
const HEATMAP_QUARTERS = [
  { key: 'q1-2026', label: 'Quarter 1 (Dec 2025 – Feb 2026)' },
  { key: 'q2-2026', label: 'Quarter 2 (Mar 2026 – May 2026)' },
  { key: 'q3-2026', label: 'Quarter 3 (Jun 2026 – Aug 2026)' },
  { key: 'q4-2026', label: 'Quarter 4 (Sep 2026 – Nov 2026)' },
];

// The 9 RAG parameters — definitions are fixed (from the CUK Heat Map spec).
// `numeric`  → the Performance page shows a number field that auto-colours.
// `rule(n)`  → maps the entered number to 'red' | 'amber' | 'green'.
// `unit`     → hint shown next to the number field.
const HEATMAP_PARAMS = [
  { key:'supplier',  name:'Supplier Relationship Management', pic:'Robert Upchurch',
    explain:'Measured from FPO team feedback on the working relationship.',
    red:'Lack of engagement / unwillingness to partner on issues.',
    amber:'Repeat feedback on the same subject, or not rectified in a timely manner.',
    green:'Strong working relationship across all teams.',
    numeric:false },
  { key:'monthlyAudit', name:'Monthly Audit', pic:'Robert Upchurch, Marcos Xavier, Jasmine Debora',
    explain:'Meetings to discuss areas requiring focused support.',
    red:'Met', amber:'N/A', green:'Not Met',
    numeric:false },
  { key:'annualAudit', name:'Annual Audit', pic:'Galang Surya',
    explain:'Compliance Department annual MLC audit.',
    red:'MLC audit failure — non-conformity not rectified within the agreed 30-day timeframe.',
    amber:'MLC nonconformity currently being rectified.',
    green:'No nonconformities, or all addressed with no outstanding actions.',
    numeric:false },
  { key:'invoice', name:'Monthly Invoice', pic:'Harold Danier',
    explain:'Accuracy of monthly invoices submitted to CUK.',
    red:'More than 2 months submitting erroneous invoices.',
    amber:'A month of submitting erroneous invoices.',
    green:'No errors on monthly invoices.',
    numeric:true, unit:'months with errors',
    rule:n => n<=0 ? 'green' : (n<=1 ? 'amber' : 'red') },
  { key:'demand', name:'Demand Delivery', pic:'Herry Wahyudi',
    explain:'Monthly demand vs monthly hired.',
    red:'Below 90% met.', amber:'90–95%, or more than 110% of demand issued (over-supply).',
    green:'95–100%.',
    numeric:true, unit:'% fulfilled',
    rule:n => n<90 ? 'red' : (n<95 ? 'amber' : (n<=110 ? 'green' : 'amber')) },
  { key:'attrition', name:'Attrition — 11.2 Rolling Turnover', pic:'Marcos Xavier, Jasmine Debora',
    explain:'% rolling turnover (quarterly) and % attrition vs overall establishment.',
    red:'Over 5% attrition against overall establishment.',
    amber:'3–5% of establishment, or rolling-turnover increase of more than 1.5% over the quarter.',
    green:'Less than 3% of overall establishment.',
    numeric:true, unit:'% attrition',
    rule:n => n<3 ? 'green' : (n<=5 ? 'amber' : 'red') },
  { key:'rejoiners', name:'New Hires vs Re-Joiners', pic:'Marcos Xavier, Jasmine Debora',
    explain:'% of seafarers on their second-plus contract (re-joiners).',
    red:'Below 85%.', amber:'85–90%.', green:'Above 90%.',
    numeric:true, unit:'% re-joiners',
    rule:n => n>90 ? 'green' : (n>=85 ? 'amber' : 'red') },
  { key:'absconders', name:'Absconders', pic:'Galang Surya',
    explain:'Number of seafarers who absconded in the period.',
    red:'Absconders recorded.', amber:'N/A', green:'No absconders.',
    numeric:true, unit:'count',
    rule:n => n<=0 ? 'green' : 'red' },
  { key:'waiting', name:'Waiting for Assignment', pic:'Carnival UK',
    explain:'New-hire seafarers pending their first assignment — compliance vs non-compliance.',
    red:'—', amber:'—', green:'—',
    numeric:false },
];

const HM_WFA_BRANDS = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];

// ── RAG colour helpers ──
const HM_RAG_HEX = { red:'#D64545', amber:'#E8A33D', green:'#2E9E5B' };
const HM_RAG_BG  = { red:'rgba(214,69,69,0.16)', amber:'rgba(232,163,61,0.20)', green:'rgba(46,158,91,0.16)', '':'transparent' };

function hmRagDot(rag) {
  const c = HM_RAG_HEX[rag] || 'transparent';
  const border = rag ? c : 'var(--border,#ccc)';
  return `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};border:1px solid ${border};vertical-align:middle;"></span>`;
}

// ── Persistence: { [qKey]: { params:{[pk]:{rate,remarks,rag}}, wfa:{[brand]:{comp,noncomp}} } } ──
// Stored live via the shared 'heatmap' store (Worker KV).
function _hmLoadAll() { return sharedGet('heatmap', {}) || {}; }
function _hmSaveAll(o) { sharedSet('heatmap', o); }
function _hmQuarter(qKey) { const all=_hmLoadAll(); return all[qKey] || { params:{}, wfa:{} }; }
function _hmGetParam(qKey, pk) { return (_hmQuarter(qKey).params || {})[pk] || {}; }
function _hmSetParam(qKey, pk, field, val) {
  const all = _hmLoadAll();
  all[qKey] = all[qKey] || { params:{}, wfa:{} };
  all[qKey].params = all[qKey].params || {};
  all[qKey].params[pk] = all[qKey].params[pk] || {};
  all[qKey].params[pk][field] = val;
  _hmSaveAll(all);
}
function _hmGetWfa(qKey, brand) { return (_hmQuarter(qKey).wfa || {})[brand] || {}; }
function _hmSetWfa(qKey, brand, field, val) {
  const all = _hmLoadAll();
  all[qKey] = all[qKey] || { params:{}, wfa:{} };
  all[qKey].wfa = all[qKey].wfa || {};
  all[qKey].wfa[brand] = all[qKey].wfa[brand] || {};
  all[qKey].wfa[brand][field] = val;
  _hmSaveAll(all);
}

// Resolve the RAG for a parameter: auto from the rule when numeric & filled,
// otherwise the manually-selected rag.
function hmResolveRag(p, rec) {
  if (p.numeric && rec.rate !== undefined && rec.rate !== '' && p.rule) {
    const n = parseFloat(String(rec.rate).replace(/[^0-9.\-]/g, ''));
    if (!isNaN(n)) return p.rule(n);
  }
  return rec.rag || '';
}

// Per-quarter meta (editable overall commentary for the executive summary).
function _hmGetMeta(qKey, field) { return (_hmQuarter(qKey).meta || {})[field]; }
function _hmSetMeta(qKey, field, val) {
  const all = _hmLoadAll();
  all[qKey] = all[qKey] || { params:{}, wfa:{} };
  all[qKey].meta = all[qKey].meta || {};
  all[qKey].meta[field] = val;
  _hmSaveAll(all);
}

// Branded header in the CUK Weekly Report style (real logo + company + doc type).
function hmHeader(qLabel, pageTitle) {
  return `
    <div class="rpt-brandhead">
      <div class="rpt-brandhead-left">
        <img src="../logo.jpg" class="rpt-logo" alt="CTI Group" onerror="this.style.display='none'">
        <div class="rpt-brandhead-text">
          <div class="rpt-company">CTI GROUP WORLDWIDE SERVICES, INC.</div>
          <div class="rpt-division">Carnival UK Account</div>
        </div>
      </div>
      <div class="rpt-brandhead-right">
        <div class="rpt-doc-type">HEAT MAP REPORT</div>
        <div class="hm-quarter">${escH(qLabel)}</div>
      </div>
    </div>
    <div class="rpt-brandbar"></div>
    <div class="rpt-report-title">
      <span class="hm-section-name">${escH(pageTitle)}</span>
    </div>`;
}

function hmFooter() {
  const today = fmtReportDate(new Date());
  return `
    <div class="rpt-footer">
      <span>DATE: ${today}</span>
      <span>CTI GROUP WORLDWIDE SERVICES, INC.</span>
    </div>`;
}

function hmLegend() {
  const chip = c => `<span class="hm-legend-chip" style="background:${c};"></span>`;
  return `
    <div class="hm-legend hm-legend-bottom">
      <span>${chip(HM_RAG_HEX.red)} Red — below target / action required</span>
      <span>${chip(HM_RAG_HEX.amber)} Amber — borderline / monitor</span>
      <span>${chip(HM_RAG_HEX.green)} Green — meeting / exceeding target</span>
    </div>`;
}

// ── PAGE 1: Parameter Explanation (static reference) ──
function hmBuildExplain(qKey) {
  const q = HEATMAP_QUARTERS.find(x => x.key === qKey) || HEATMAP_QUARTERS[0];
  const rows = HEATMAP_PARAMS.map(p => `
    <tr>
      <td class="rpt-td" style="font-weight:700;width:170px;">${escH(p.name)}</td>
      <td class="rpt-td" style="width:150px;color:#666;">${escH(p.pic)}</td>
      <td class="rpt-td">${escH(p.explain)}</td>
      <td class="rpt-td" style="background:rgba(214,69,69,0.08);">${escH(p.red)}</td>
      <td class="rpt-td" style="background:rgba(232,163,61,0.10);">${escH(p.amber)}</td>
      <td class="rpt-td" style="background:rgba(46,158,91,0.08);">${escH(p.green)}</td>
    </tr>`).join('');
  return `
    <div class="rpt-doc hm-doc">
      ${hmHeader(q.label, 'Parameter Definitions')}
      <table class="rpt-table hm-table">
        <thead><tr>
          <th class="rpt-th">Parameter</th>
          <th class="rpt-th">Person in Charge</th>
          <th class="rpt-th">Explanation</th>
          <th class="rpt-th">Red</th>
          <th class="rpt-th">Amber</th>
          <th class="rpt-th">Green</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${hmLegend()}
    </div>
    ${REPORT_STYLES}${HEATMAP_STYLES}`;
}

// ── SECTION 2: Executive Scorecard (matches the client PDF page 2) ──
function hmBuildScorecard(qKey, editable) {
  const qIdx  = HEATMAP_QUARTERS.findIndex(x => x.key === qKey);
  const q     = HEATMAP_QUARTERS[qIdx] || HEATMAP_QUARTERS[0];
  const prevQ = qIdx > 0 ? HEATMAP_QUARTERS[qIdx - 1] : null;
  const prevShort = prevQ ? prevQ.label.replace(/\s*\(.*/, '') : '';
  const ib = 'box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:5px;font-size:11px;font-family:inherit;background:#fff;color:#1A1A1A;';

  const rows = HEATMAP_PARAMS.map(p => {
    const rec  = _hmGetParam(qKey, p.key);
    const rag  = hmResolveRag(p, rec);
    const bg   = HM_RAG_BG[rag] || 'transparent';
    const rate = rec.rate != null ? rec.rate : '';
    const remarks = rec.remarks != null ? rec.remarks : '';
    const qoq  = rec.qoq != null ? rec.qoq : '';
    const prev = rec.prevScore != null ? rec.prevScore : '';

    let rateCell;
    if (p.numeric) {
      rateCell = editable
        ? `<input type="text" class="hm-rate" data-pk="${p.key}" value="${escH(String(rate))}" placeholder="0" style="${ib}width:78px;text-align:center;font-weight:700;"><div style="font-size:8px;color:#999;margin-top:2px;">${escH(p.unit||'')}</div>`
        : `<span style="font-weight:700;font-size:13px;">${rate===''?'—':escH(String(rate))}</span>`;
    } else {
      // In the PDF (non-editable) the RAG word is hidden — the colour + dot
      // column already convey the status. The dropdown only shows on screen.
      rateCell = editable
        ? `<select class="hm-rag" data-pk="${p.key}" style="${ib}width:104px;"><option value="">— status —</option><option value="green"${rag==='green'?' selected':''}>Green</option><option value="amber"${rag==='amber'?' selected':''}>Amber</option><option value="red"${rag==='red'?' selected':''}>Red</option></select>`
        : '';
    }
    const remarksCell = editable
      ? `<textarea class="hm-remarks" data-pk="${p.key}" rows="2" placeholder="CTI remarks…" style="${ib}width:100%;resize:vertical;min-height:34px;">${escH(remarks)}</textarea>`
      : `<span>${remarks?escH(remarks):'—'}</span>`;
    const qoqCell = editable
      ? `<input type="text" class="hm-qoq" data-pk="${p.key}" value="${escH(String(qoq))}" placeholder="—" style="${ib}width:78px;text-align:center;">`
      : `<span>${qoq===''?'—':escH(String(qoq))}</span>`;
    const prevCell = editable
      ? `<input type="text" class="hm-prev" data-pk="${p.key}" value="${escH(String(prev))}" placeholder="—" style="${ib}width:78px;text-align:center;">`
      : `<span>${prev===''?'—':escH(String(prev))}</span>`;

    return `
      <tr>
        <td class="rpt-td" style="font-weight:700;width:150px;">${escH(p.name)}</td>
        <td class="rpt-td hm-cell-rate" data-pk="${p.key}" style="width:92px;text-align:center;background:${bg};">${rateCell}</td>
        <td class="rpt-td" style="text-align:center;width:44px;background:${bg};"><span class="hm-cell-dot" data-pk="${p.key}">${hmRagDot(rag)}</span></td>
        <td class="rpt-td">${remarksCell}</td>
        <td class="rpt-td" style="text-align:center;width:96px;">${qoqCell}</td>
        <td class="rpt-td" style="text-align:center;width:96px;">${prevCell}</td>
      </tr>`;
  }).join('');

  return `
    <div class="rpt-doc hm-doc">
      ${hmHeader(q.label, 'Executive Scorecard')}
      ${editable ? '<p class="hm-hint">Enter the success rate (numeric cells auto-colour by RAG threshold), CTI remarks, QoQ change and previous-quarter score. Saves automatically.</p>' : ''}
      <table class="rpt-table hm-table">
        <thead><tr>
          <th class="rpt-th">Parameter</th>
          <th class="rpt-th" style="text-align:center;">Success Rate</th>
          <th class="rpt-th" style="text-align:center;">RAG</th>
          <th class="rpt-th">CTI Remarks</th>
          <th class="rpt-th" style="text-align:center;">QoQ Change%</th>
          <th class="rpt-th" style="text-align:center;">Prev. Score${prevShort?`<br><span style="font-weight:400;">(${escH(prevShort)})</span>`:''}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${hmLegend()}
    </div>
    ${REPORT_STYLES}${HEATMAP_STYLES}`;
}

// Nested-meta cell accessor for the detail tables.
function _hmMetaCell(qKey, sec, row, field) {
  if (sec === 'wfa') { const r = _hmGetWfa(qKey, row); return r ? r[field] : undefined; }
  const o = _hmGetMeta(qKey, sec) || {};
  return row ? (o[row] || {})[field] : o[field];
}

// Cruise lines are the COLUMNS in every detail matrix, so all tables share the
// same width. The row dimension varies per metric (department / reason / etc.).
const HM_CRUISE_LINES = ['Cunard Line', 'P&O Cruises', 'CUK Maritime'];
const HM_DEPARTMENTS  = ['Bar', 'Housekeeping', 'Galley', 'Restaurant', 'General Admin', 'Provision', 'Entertainment', 'Purser', 'Laundry', 'Maritime'];
const HM_ATTR_REASONS = ['Resignation', 'Disciplinary', 'Compassionate', 'Medical', 'Not Re-Joining', 'Other'];
const HM_REJOIN_ROWS  = ['Embarked', 'New Hire', 'Re-Joiner'];
const HM_WAIT_ROWS    = ['Compliance', 'Non-Compliance'];
const HM_DETAIL_DEFAULTS = {
  demand:    HM_DEPARTMENTS,
  talent:    HM_DEPARTMENTS,
  attrition: HM_ATTR_REASONS,
  rejoin:    HM_REJOIN_ROWS,
  waiting:   HM_WAIT_ROWS,
};

// Editable row config (label list) per section, persisted. Cells are keyed by a
// stable row id so renaming a label never loses its data.
function _hmGetRows(qKey, sec, defaults) {
  const r = _hmGetMeta(qKey, sec + '__rows');
  if (Array.isArray(r) && r.length) return r;
  return defaults.map(d => ({ id: d, label: d }));
}
function _hmSetRows(qKey, sec, rows) { _hmSetMeta(qKey, sec + '__rows', rows); }

// ── Composable matrix pieces (cruise lines = equal-width columns) ──
function hmColCount(editable) { return 1 + HM_CRUISE_LINES.length + (editable ? 1 : 0); }

function hmHeadHtml(rowHeader, editable) {
  return `<tr>
      <th class="rpt-th">${escH(rowHeader)}</th>${
    HM_CRUISE_LINES.map(c => `<th class="rpt-th" style="text-align:center;">${escH(c)}</th>`).join('')}${
    editable ? '<th class="rpt-th hm-actcol"></th>' : ''}
    </tr>`;
}

function hmDividerRow(label, editable) {
  return `<tr class="hm-divider"><td colspan="${hmColCount(editable)}">${escH(label)}</td></tr>`;
}

// Data rows for one section + (in edit mode) an inline "+ Add row" row.
function hmRowsHtml(qKey, editable, sec, defaults) {
  const rows = _hmGetRows(qKey, sec, defaults);
  const ib = 'box-sizing:border-box;padding:5px 6px;border:1px solid #ccc;border-radius:5px;font-size:10.5px;font-family:inherit;background:#fff;color:#1A1A1A;text-align:center;width:100%;';
  const lb = 'box-sizing:border-box;padding:5px 6px;border:1px solid #ccc;border-radius:5px;font-size:10.5px;font-weight:700;font-family:inherit;background:#fff;color:#1A1A1A;width:100%;';

  const body = rows.map(r => `<tr>
      <td class="rpt-td">${editable
        ? `<input type="text" class="hm-dlabel" data-sec="${sec}" data-id="${escH(r.id)}" value="${escH(r.label)}" placeholder="Row name" style="${lb}">`
        : `<span style="font-weight:700;">${escH(r.label)||'—'}</span>`}</td>${
    HM_CRUISE_LINES.map(c => {
      const v = _hmMetaCell(qKey, sec, r.id, c);
      const val = v == null ? '' : v;
      return `<td class="rpt-td" style="text-align:center;">${editable
        ? `<input type="text" class="hm-dcell" data-sec="${sec}" data-row="${escH(r.id)}" data-field="${escH(c)}" value="${escH(String(val))}" placeholder="—" style="${ib}">`
        : `<span>${val===''?'—':escH(String(val))}</span>`}</td>`;
    }).join('')}${
    editable ? `<td class="rpt-td hm-actcol"><button type="button" class="hm-row-del" data-sec="${sec}" data-id="${escH(r.id)}" title="Remove row">×</button></td>` : ''}
    </tr>`).join('');

  const add = editable
    ? `<tr class="hm-addrow"><td colspan="${hmColCount(editable)}"><button type="button" class="hm-row-add" data-sec="${sec}">+ Add row</button></td></tr>`
    : '';
  return body + add;
}

function hmTable(rowHeader, editable, bodyHtml) {
  return `<table class="rpt-table hm-table hm-matrix"><thead>${hmHeadHtml(rowHeader, editable)}</thead><tbody>${bodyHtml}</tbody></table>`;
}

// ── SECTION 3: Performance Detail — 2-column (matrix table | explanation) ──
function hmBuildDetail(qKey, editable) {
  const q = HEATMAP_QUARTERS.find(x => x.key === qKey) || HEATMAP_QUARTERS[0];

  const narr = (field, ph) => {
    const v = _hmGetMeta(qKey, field) || '';
    return editable
      ? `<textarea class="hm-commentary hm-dnarr" data-field="${field}" rows="4" placeholder="${escH(ph)}">${escH(v)}</textarea>`
      : (v ? `<p class="hm-para">${escH(v).replace(/\n/g,'<br>')}</p>` : '<p class="hm-para" style="color:#999;font-style:italic;">No commentary recorded.</p>');
  };

  // One metric block: title, then table (left) + explanation (right).
  const block = (title, table, field, ph) => `
    <div class="hm-section-title">${escH(title)}</div>
    <div class="hm-detail-row">
      <div class="hm-detail-table">${table}</div>
      <div class="hm-detail-explain">${narr(field, ph)}</div>
    </div>`;

  // Demand Delivery + Talent Pool combined into one table, split by a divider.
  const demandTalentTable = hmTable('Department', editable,
    hmRowsHtml(qKey, editable, 'demand', HM_DEPARTMENTS) +
    hmDividerRow('Talent Pool', editable) +
    hmRowsHtml(qKey, editable, 'talent', HM_DEPARTMENTS));

  return `
    <div class="rpt-doc hm-doc">
      ${hmHeader(q.label, 'Performance Detail')}

      ${block('Demand Delivery',
        demandTalentTable,
        'demandNarr', 'Demand & talent-pool commentary…')}

      ${block('Attrition',
        hmTable('Reason', editable, hmRowsHtml(qKey, editable, 'attrition', HM_ATTR_REASONS)),
        'attritionNarr', 'How attrition is counted and the quarter trend…')}

      ${block('New Hires vs Re-Joiners',
        hmTable('Metric', editable, hmRowsHtml(qKey, editable, 'rejoin', HM_REJOIN_ROWS)),
        'rejoinNarr', 'New-hire vs re-joiner split commentary…')}

      ${block('Waiting for Assignment (New Hire)',
        hmTable('Status', editable, hmRowsHtml(qKey, editable, 'waiting', HM_WAIT_ROWS)),
        'waitingNarr', 'Waiting-for-assignment commentary…')}
    </div>
    ${REPORT_STYLES}${HEATMAP_STYLES}`;
}

// Build one narrative sentence describing a parameter's result.
function hmNarrative(p, qKey, prevQ) {
  const rec = _hmGetParam(qKey, p.key);
  const rag = hmResolveRag(p, rec);
  const hasNum = p.numeric && rec.rate !== undefined && rec.rate !== '' && rec.rate !== null;
  if (!rag && !hasNum) return null; // nothing entered
  const ragWord = rag ? rag.toUpperCase() : 'UNRATED';
  const ragCol  = HM_RAG_HEX[rag] || '#666';

  let s = `<strong>${escH(p.name)}</strong> `;
  if (hasNum) s += `was recorded at <strong>${escH(String(rec.rate))} ${escH(p.unit||'')}</strong> for the quarter`;
  else        s += `was assessed for the quarter`;
  s += `, rated <span class="hm-tag" style="color:${ragCol};border-color:${ragCol};">${ragWord}</span>`;

  const ctx = { green:p.green, amber:p.amber, red:p.red }[rag];
  if (ctx && ctx !== '—') s += ` — ${escH(ctx.replace(/\.$/,'').toLowerCase())}`;
  s += `.`;

  if (p.numeric && prevQ) {
    const cur  = parseFloat(String(rec.rate).replace(/[^0-9.\-]/g,''));
    const prev = parseFloat(String(_hmGetParam(prevQ.key, p.key).rate).replace(/[^0-9.\-]/g,''));
    if (!isNaN(cur) && !isNaN(prev) && prev !== 0) {
      const pct = ((cur - prev) / Math.abs(prev)) * 100;
      const dir = pct > 0 ? 'up' : (pct < 0 ? 'down' : 'unchanged');
      s += pct === 0
        ? ` This is unchanged versus the previous quarter.`
        : ` This is <strong>${dir} ${Math.abs(pct).toFixed(1)}%</strong> versus the previous quarter (${escH(prevQ.label)}).`;
    }
  }
  if (rec.remarks) s += ` ${escH(rec.remarks)}`;
  return s;
}

// Build the explanation paragraph for one parameter (threshold context, QoQ, remarks).
function hmExplainText(p, qKey, prevQ) {
  const rec = _hmGetParam(qKey, p.key);
  const rag = hmResolveRag(p, rec);
  const hasNum = p.numeric && rec.rate !== undefined && rec.rate !== '' && rec.rate !== null;
  let parts = [];

  const ctx = { green:p.green, amber:p.amber, red:p.red }[rag];
  if (hasNum) {
    let s = `Recorded at <strong>${escH(String(rec.rate))} ${escH(p.unit||'')}</strong> for the quarter`;
    if (ctx && ctx !== '—') s += `, which falls in the <strong>${rag}</strong> band (${escH(ctx.replace(/\.$/,'').toLowerCase())})`;
    s += '.';
    parts.push(s);
  } else if (rag) {
    let s = `Assessed as <strong>${rag.toUpperCase()}</strong> this quarter`;
    if (ctx && ctx !== '—') s += ` — ${escH(ctx.replace(/\.$/,'').toLowerCase())}`;
    s += '.';
    parts.push(s);
  }

  if (p.numeric && prevQ) {
    const cur  = parseFloat(String(rec.rate).replace(/[^0-9.\-]/g,''));
    const prev = parseFloat(String(_hmGetParam(prevQ.key, p.key).rate).replace(/[^0-9.\-]/g,''));
    if (!isNaN(cur) && !isNaN(prev) && prev !== 0) {
      const pct = ((cur - prev) / Math.abs(prev)) * 100;
      const dir = pct > 0 ? 'up' : (pct < 0 ? 'down' : 'unchanged');
      parts.push(pct === 0
        ? `Quarter-on-quarter this is unchanged versus ${escH(prevQ.label)}.`
        : `Quarter-on-quarter this is <strong>${dir} ${Math.abs(pct).toFixed(1)}%</strong> versus ${escH(prevQ.label)}.`);
    }
  }
  if (rec.remarks) parts.push(escH(rec.remarks));
  return parts.join(' ');
}

// ── PAGE 3: Executive Summary — per parameter: title, heat-map status, explanation ──
function hmBuildSummary(qKey, editable) {
  const qIdx = HEATMAP_QUARTERS.findIndex(x => x.key === qKey);
  const q = HEATMAP_QUARTERS[qIdx] || HEATMAP_QUARTERS[0];
  const prevQ = qIdx > 0 ? HEATMAP_QUARTERS[qIdx-1] : null;

  // RAG roll-up
  const tally = { red:0, amber:0, green:0 };
  HEATMAP_PARAMS.filter(p => p.key !== 'waiting').forEach(p => {
    const r = hmResolveRag(p, _hmGetParam(qKey, p.key));
    if (tally[r] !== undefined) tally[r]++;
  });
  const overview = `
    <div class="hm-rollup">
      <span><span class="hm-pill" style="background:${HM_RAG_HEX.green}">${tally.green}</span> Green</span>
      <span><span class="hm-pill" style="background:${HM_RAG_HEX.amber}">${tally.amber}</span> Amber</span>
      <span><span class="hm-pill" style="background:${HM_RAG_HEX.red}">${tally.red}</span> Red</span>
    </div>`;

  const overviewTxt = _hmGetMeta(qKey, 'overviewText') || '';
  const overviewBlock = editable
    ? `<div class="hm-section-title">Overview</div>
       <textarea id="hmOverviewText" rows="4" class="hm-commentary"
         placeholder="Opening overview — overall operational performance for the quarter…">${escH(overviewTxt)}</textarea>`
    : (overviewTxt
        ? `<div class="hm-section-title">Overview</div><p class="hm-para">${escH(overviewTxt).replace(/\n/g,'<br>')}</p>`
        : '');

  const conclusionTxt = _hmGetMeta(qKey, 'conclusionText') || '';
  const conclusionBlock = editable
    ? `<div class="hm-section-title">Conclusion</div>
       <textarea id="hmConclusionText" rows="4" class="hm-commentary"
         placeholder="Closing conclusion — overall progress and outlook for next quarter…">${escH(conclusionTxt)}</textarea>`
    : (conclusionTxt
        ? `<div class="hm-section-title">Conclusion</div><p class="hm-para">${escH(conclusionTxt).replace(/\n/g,'<br>')}</p>`
        : '');

  // One block per parameter: title → heat-map status → editable explanation text area
  const items = HEATMAP_PARAMS.filter(p => p.key !== 'waiting').map(p => {
    const rec = _hmGetParam(qKey, p.key);
    const rag = hmResolveRag(p, rec);
    const hasNum = p.numeric && rec.rate !== undefined && rec.rate !== '' && rec.rate !== null;
    const ragCol = HM_RAG_HEX[rag] || '#888';
    const ragWord = rag ? rag.toUpperCase() : 'NOT SET';
    const resultStr = hasNum ? `${escH(String(rec.rate))} ${escH(p.unit||'')}` : '';

    // Saved explanation text persists in localStorage. If empty, offer the
    // auto-generated draft (plain text) as a starting point.
    const saved = rec.summaryText;
    const autoDraft = (hmExplainText(p, qKey, prevQ) || '').replace(/<[^>]+>/g, '');
    const textVal = (saved != null && saved !== '') ? saved : autoDraft;

    const explainBlock = editable
      ? `<textarea class="hm-sum-text" data-pk="${p.key}" rows="3"
           placeholder="Type the explanation for ${escH(p.name)}…">${escH(textVal)}</textarea>`
      : `<p class="hm-para">${textVal ? escH(textVal).replace(/\n/g,'<br>') : '<span style="color:#999;font-style:italic;">No explanation recorded.</span>'}</p>`;

    return `
      <div class="hm-sum-item">
        <div class="hm-sum-title">${escH(p.name)}</div>
        <div class="hm-sum-status">
          <span class="hm-tag" style="color:${ragCol};border-color:${ragCol};background:${HM_RAG_BG[rag]||'transparent'};">${ragWord}</span>
          ${resultStr ? `<span class="hm-sum-result">${resultStr}</span>` : ''}
        </div>
        ${explainBlock}
      </div>`;
  }).join('');

  const body = items;

  return `
    <div class="rpt-doc hm-doc">
      ${hmHeader(q.label, 'Executive Summary')}
      ${overview}
      ${overviewBlock}
      <div class="hm-section-title">Performance Narrative</div>
      ${body}
      ${conclusionBlock}
    </div>
    ${REPORT_STYLES}${HEATMAP_STYLES}`;
}

// Heat-map specific styles (layered on top of REPORT_STYLES).
const HEATMAP_STYLES = `
<style>
.hm-doc { background:#fff; }
.hm-quarter { font-size:13px; font-weight:800; color:#B01A18; letter-spacing:0.03em; margin-top:4px; text-transform:uppercase; }
.hm-section-name { font-size:18px; font-weight:800; color:#1A1A1A; letter-spacing:-0.01em; }
.hm-legend { display:flex; gap:26px; align-items:center; font-size:10.5px; color:#444; flex-wrap:wrap; }
.hm-legend span { display:flex; align-items:center; gap:8px; }
.hm-legend-chip { display:inline-block; width:18px; height:12px; border-radius:2px; vertical-align:middle; }
.hm-legend-bottom { margin-top:22px; padding-top:12px; border-top:1px solid #e3e3e3; justify-content:flex-start; }
.hm-table { font-size:10.5px; margin-bottom:6px; }
.hm-table .rpt-td { font-size:10.5px; line-height:1.45; }
.hm-hint { font-size:10.5px; color:#777; margin:0 0 12px; }
.hm-section-title { font-size:12px; font-weight:800; letter-spacing:0.04em; color:#1A1A1A; text-transform:uppercase; margin:20px 0 8px; padding-bottom:4px; border-bottom:2px solid #B01A18; }
.hm-subhead { font-size:11px; font-weight:700; color:#444; margin:10px 0 5px; }
.hm-dnarr { margin-bottom:6px; }
/* Performance Detail: table (left) + explanation (right) */
.hm-detail-row { display:flex; gap:18px; align-items:flex-start; margin-bottom:8px; }
.hm-detail-table { flex:1 1 58%; min-width:0; }
.hm-detail-explain { flex:1 1 42%; min-width:0; }
.hm-detail-explain .hm-commentary { margin-bottom:0; }
.hm-matrix { width:100%; table-layout:fixed; }
.hm-matrix td, .hm-matrix th { vertical-align:middle; }
.hm-matrix .rpt-td input { box-sizing:border-box; }
.hm-matrix .hm-actcol { width:30px; text-align:center; padding:4px 2px; }
.hm-divider td { background:#1A1A1A; color:#fff; font-weight:800; text-align:center;
  letter-spacing:0.10em; text-transform:uppercase; font-size:10px; padding:6px; }
.hm-addrow td { padding:4px 6px; background:#fafafa; }
.hm-row-del { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px;
  border:1px solid #e0b4b4; background:#fff5f5; color:#B01A18; border-radius:5px; cursor:pointer;
  font-size:13px; font-weight:700; padding:0; }
.hm-row-del:hover { background:#B01A18; color:#fff; border-color:#B01A18; }
.hm-row-add { font-size:10.5px; font-weight:700; color:#B01A18; background:#fff;
  border:1px dashed #B01A18; border-radius:6px; padding:4px 12px; cursor:pointer; font-family:inherit; }
.hm-row-add:hover { background:#B01A18; color:#fff; }
.hm-rollup { display:flex; gap:24px; align-items:center; margin:4px 0 6px; font-size:12px; font-weight:600; color:#444; }
.hm-rollup .hm-pill { display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px; border-radius:11px; color:#fff; font-weight:800; font-size:11px; padding:0 7px; margin-right:5px; }
.hm-para { font-size:12px; line-height:1.65; color:#222; margin:0 0 11px; }
.hm-tag { display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:0.05em; border:1.5px solid; border-radius:4px; padding:2px 8px; vertical-align:middle; }
/* Executive summary per-parameter blocks */
.hm-sum-item { margin:0 0 16px; padding:0 0 14px; border-bottom:1px solid #eee; }
.hm-sum-title { font-size:14px; font-weight:800; color:#1A1A1A; margin-bottom:6px; }
.hm-sum-status { display:flex; align-items:center; gap:10px; margin-bottom:7px; }
.hm-sum-result { font-size:13px; font-weight:700; color:#1A1A1A; }
.hm-sum-text { width:100%; box-sizing:border-box; padding:9px 11px; border:1px dashed #B01A18; border-radius:6px;
  font-size:12px; line-height:1.6; font-family:inherit; color:#1A1A1A; background:#fffdfd; resize:vertical; min-height:54px; }
.hm-sum-text:focus { outline:none; border-style:solid; box-shadow:0 0 0 2px rgba(176,26,24,0.12); }
.hm-commentary { width:100%; box-sizing:border-box; padding:10px 12px; border:1px dashed #B01A18; border-radius:6px;
  font-size:12px; line-height:1.6; font-family:inherit; color:#1A1A1A; background:#fffdfd; resize:vertical; margin-bottom:6px; }
.hm-commentary:focus { outline:none; border-style:solid; box-shadow:0 0 0 2px rgba(176,26,24,0.12); }
</style>
`;

// PDF-only sizing. Tuned so the Parameter and Performance tables comfortably
// FILL one A4-landscape page (readable type, minimal white space) without
// spilling to a second page.
const HEATMAP_PDF_STYLES = `
<style>
#hmPdfRoot .hm-doc { padding:24px 30px 16px; }
#hmPdfRoot .rpt-logo { height:84px; }
#hmPdfRoot .rpt-company { font-size:14px; }
#hmPdfRoot .rpt-division { font-size:9.5px; }
#hmPdfRoot .rpt-doc-type { font-size:10px; }
#hmPdfRoot .hm-quarter { font-size:14px; }
#hmPdfRoot .rpt-brandbar { margin-top:10px; }
#hmPdfRoot .rpt-report-title { margin:16px 0 16px; }
#hmPdfRoot .hm-section-name { font-size:20px; }
#hmPdfRoot .hm-legend { font-size:11px; gap:28px; }
#hmPdfRoot .hm-legend-bottom { margin-top:26px; }
#hmPdfRoot .hm-table .rpt-th { padding:10px 10px; font-size:10px; }
#hmPdfRoot .hm-table .rpt-td { padding:13px 10px; font-size:11px; line-height:1.45; }
/* Executive summary — denser, no forced single-item page breaks */
#hmPdfRoot .hm-sum-item { margin:0 0 14px; padding:0 0 12px; }
#hmPdfRoot .hm-sum-title { font-size:15px; }
#hmPdfRoot .hm-para { font-size:12px; line-height:1.6; }
#hmPdfRoot .rpt-footer { margin-top:18px; padding-top:10px; font-size:9.5px; }
</style>
`;

// Dispatcher: render the requested heat-map section.
function buildHeatMapHTML(view, qKey, editable) {
  if (view === 'scorecard') return hmBuildScorecard(qKey, editable !== false);
  if (view === 'detail')    return hmBuildDetail(qKey, editable !== false);
  if (view === 'summary')   return hmBuildSummary(qKey, editable !== false);
  return hmBuildExplain(qKey);
}

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

  // ── CUK Heat Map Report wiring ─────────────────────────────────────────────
  (function initHeatMap() {
    const sel  = document.getElementById('hmQuarter');
    const prev = document.getElementById('hmPreview');
    if (!sel || !prev) return;
    sel.innerHTML = HEATMAP_QUARTERS.map(q =>
      `<option value="${escH(q.key)}">${escH(q.label)}</option>`).join('');

    let view = 'explain';

    // Report date (chosen by the user, saved per quarter) — used in the footer.
    const dateInp = document.getElementById('hmReportDate');
    if (dateInp) dateInp.addEventListener('change', () => _hmSetMeta(sel.value, 'reportDate', dateInp.value));
    function syncDate() { if (dateInp) dateInp.value = _hmGetMeta(sel.value, 'reportDate') || ''; }
    function hmFmtDate(iso) {
      if (!iso) return '';
      const d = new Date(iso + 'T00:00:00');
      return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    }

    // Recolour a parameter cell live from its current value (no full re-render).
    function recolorParam(pk) {
      const p = HEATMAP_PARAMS.find(x => x.key === pk);
      if (!p) return;
      const rag = hmResolveRag(p, _hmGetParam(sel.value, pk));
      const bg  = HM_RAG_BG[rag] || 'transparent';
      const rateCell = prev.querySelector(`.hm-cell-rate[data-pk="${pk}"]`);
      if (rateCell) rateCell.style.background = bg;
      if (rateCell && rateCell.nextElementSibling) rateCell.nextElementSibling.style.background = bg;
      const dot = prev.querySelector(`.hm-cell-dot[data-pk="${pk}"]`);
      if (dot) dot.innerHTML = hmRagDot(rag);
    }

    function attachScorecardHandlers() {
      // Numeric success-rate fields → auto-recolour
      prev.querySelectorAll('.hm-rate').forEach(inp => {
        inp.addEventListener('input', () => {
          _hmSetParam(sel.value, inp.dataset.pk, 'rate', inp.value.trim());
          recolorParam(inp.dataset.pk);
        });
      });
      // Manual RAG selects (non-numeric params)
      prev.querySelectorAll('.hm-rag').forEach(seln => {
        seln.addEventListener('change', () => {
          _hmSetParam(sel.value, seln.dataset.pk, 'rag', seln.value);
          recolorParam(seln.dataset.pk);
        });
      });
      prev.querySelectorAll('.hm-remarks').forEach(ta =>
        ta.addEventListener('input', () => _hmSetParam(sel.value, ta.dataset.pk, 'remarks', ta.value)));
      prev.querySelectorAll('.hm-qoq').forEach(inp =>
        inp.addEventListener('input', () => _hmSetParam(sel.value, inp.dataset.pk, 'qoq', inp.value.trim())));
      prev.querySelectorAll('.hm-prev').forEach(inp =>
        inp.addEventListener('input', () => _hmSetParam(sel.value, inp.dataset.pk, 'prevScore', inp.value.trim())));
    }

    function attachDetailHandlers() {
      // Matrix value cells (keyed by row id + cruise line)
      prev.querySelectorAll('.hm-dcell').forEach(inp => {
        inp.addEventListener('input', () => {
          const sec = inp.dataset.sec, row = inp.dataset.row, field = inp.dataset.field;
          const obj = { ...(_hmGetMeta(sel.value, sec) || {}) };
          obj[row] = { ...(obj[row] || {}) };
          obj[row][field] = inp.value.trim();
          _hmSetMeta(sel.value, sec, obj);
        });
      });
      // Editable row labels (first column)
      prev.querySelectorAll('.hm-dlabel').forEach(inp => {
        inp.addEventListener('input', () => {
          const sec = inp.dataset.sec, id = inp.dataset.id;
          const rows = _hmGetRows(sel.value, sec, HM_DETAIL_DEFAULTS[sec] || [])
            .map(r => r.id === id ? { ...r, label: inp.value } : r);
          _hmSetRows(sel.value, sec, rows);
        });
      });
      // Add row
      prev.querySelectorAll('.hm-row-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const sec = btn.dataset.sec;
          const rows = _hmGetRows(sel.value, sec, HM_DETAIL_DEFAULTS[sec] || []).slice();
          rows.push({ id: 'r' + Math.random().toString(36).slice(2, 8), label: '' });
          _hmSetRows(sel.value, sec, rows);
          renderHM();
        });
      });
      // Remove row (also drop its cell data)
      prev.querySelectorAll('.hm-row-del').forEach(btn => {
        btn.addEventListener('click', () => {
          const sec = btn.dataset.sec, id = btn.dataset.id;
          const rows = _hmGetRows(sel.value, sec, HM_DETAIL_DEFAULTS[sec] || []).filter(r => r.id !== id);
          _hmSetRows(sel.value, sec, rows);
          const obj = { ...(_hmGetMeta(sel.value, sec) || {}) };
          delete obj[id];
          _hmSetMeta(sel.value, sec, obj);
          renderHM();
        });
      });
      // Detail narrative textareas
      prev.querySelectorAll('.hm-dnarr').forEach(ta =>
        ta.addEventListener('input', () => _hmSetMeta(sel.value, ta.dataset.field, ta.value)));
    }

    function attachSummaryHandlers() {
      const bind = (id, field) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => _hmSetMeta(sel.value, field, el.value));
      };
      bind('hmOverviewText', 'overviewText');
      bind('hmConclusionText', 'conclusionText');
      prev.querySelectorAll('.hm-sum-text').forEach(area =>
        area.addEventListener('input', () => _hmSetParam(sel.value, area.dataset.pk, 'summaryText', area.value)));
    }

    // Auto-grow textareas so long text stays fully visible.
    function autoGrow(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }

    function renderHM() {
      syncDate();
      prev.innerHTML = buildHeatMapHTML(view, sel.value, true);
      if (view === 'scorecard') attachScorecardHandlers();
      if (view === 'detail')    attachDetailHandlers();
      if (view === 'summary')   attachSummaryHandlers();
      // Make every textarea grow with its content (size to fit existing text now,
      // and keep resizing as the user types).
      prev.querySelectorAll('textarea').forEach(t => {
        t.style.overflow = 'hidden';
        autoGrow(t);
        t.addEventListener('input', () => autoGrow(t));
      });
    }

    // Sub-nav (Parameter Explanation / Performance / Executive Summary)
    document.querySelectorAll('.hm-subnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        view = btn.dataset.hm;
        document.querySelectorAll('.hm-subnav-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderHM();
      });
    });

    sel.addEventListener('change', renderHM);

    // PDF — A4 landscape, all three pages, CUK Weekly Report styling.
    const dlBtn = document.getElementById('hmDownloadBtn');
    if (dlBtn) dlBtn.addEventListener('click', async () => {
      const q = HEATMAP_QUARTERS.find(x => x.key === sel.value) || HEATMAP_QUARTERS[0];
      const orig = dlBtn.textContent;
      dlBtn.textContent = 'Generating…'; dlBtn.disabled = true;
      try {
        await ensureHtml2Pdf();
        const html =
          `<div id="hmPdfRoot">` +
          buildHeatMapHTML('explain', sel.value, false) +
          buildHeatMapHTML('scorecard', sel.value, false) +
          buildHeatMapHTML('detail', sel.value, false) +
          buildHeatMapHTML('summary', sel.value, false) +
          `</div>` +
          HEATMAP_PDF_STYLES +
          `<style>#hmPdfRoot .hm-doc{page-break-after:always;} #hmPdfRoot .hm-doc:last-child{page-break-after:auto;}</style>`;
        const hidden = document.createElement('div');
        hidden.style.cssText = 'position:fixed;left:-99999px;top:0;width:1047px;background:#fff;';
        hidden.innerHTML = html;
        document.body.appendChild(hidden);
        try {
          await Promise.all([...hidden.querySelectorAll('img')].map(img =>
            img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
          const fname = `CARNIVAL_UK_HEAT_MAP_${q.key.toUpperCase()}.pdf`;
          await window.html2pdf().set({
            margin:      [8, 8, 12, 8],
            filename:    fname,
            image:       { type:'jpeg', quality:0.98 },
            html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff' },
            jsPDF:       { unit:'mm', format:'a4', orientation:'landscape' },
            // Keep rows and narrative blocks intact so page breaks never slice
            // through the middle of text; tables break cleanly between rows.
            pagebreak:   { mode:['css','legacy'], avoid:['tr', '.hm-sum-item', '.hm-para', '.hm-section-title', '.hm-subhead', '.hm-legend', '.hm-detail-row'] },
          }).from(hidden.querySelector('#hmPdfRoot')).toPdf().get('pdf').then(pdf => {
            // Stamp the footer (rule line + date + page number + company) at the
            // bottom of EVERY physical page, using the chosen report date.
            const dateStr = hmFmtDate(dateInp ? dateInp.value : '');
            const total = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= total; i++) {
              pdf.setPage(i);
              const pw = pdf.internal.pageSize.getWidth();
              const ph = pdf.internal.pageSize.getHeight();
              const ly = ph - 8;        // rule line position
              const ty = ph - 4;        // text baseline
              pdf.setDrawColor(176, 26, 24); pdf.setLineWidth(0.4);
              pdf.line(8, ly, pw - 8, ly);
              pdf.setFontSize(8); pdf.setTextColor(90);
              if (dateStr) pdf.text(`DATE: ${dateStr}`, 8, ty);
              pdf.text(`Page ${i} of ${total}`, pw / 2, ty, { align: 'center' });
              pdf.text('CTI GROUP WORLDWIDE SERVICES, INC.', pw - 8, ty, { align: 'right' });
            }
          }).save();
        } finally {
          document.body.removeChild(hidden);
        }
      } catch (e) {
        console.error('Heat Map PDF failed', e);
        alert('PDF generation failed — please try again.');
      } finally {
        dlBtn.textContent = orig; dlBtn.disabled = false;
      }
    });

    renderHM();
  })();

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
      // Pull the shared Requisition Setup config from the server once per load
      // so the report reflects the live demand for everyone.
      if (!_demandHydrated) { await hydrateDemand(); if (typeof renderDemandTable === 'function') renderDemandTable(); }
      const { seafarers, finalInt } = await fetchCruiseData(false);
      // Load saved notes from localStorage; fall back to auto-generated.
      if (_reportNotes[brand] == null) {
        const saved = _loadReportNote(brand);
        _reportNotes[brand] = saved ?? '';   // empty string = not yet auto-filled
      }
      const notes = notesLines(_reportNotes[brand]);
      preview.innerHTML = buildReportHTML(brand, date, seafarers, finalInt, notes, true) +
        buildDataStatusBadge(brand, seafarers, finalInt);

      // Wire the inline editable notes textarea (lives inside the report)
      const inline = document.getElementById('rptNotesInline');
      if (inline) {
        inline.addEventListener('input', () => {
          _reportNotes[brand] = inline.value;
          // Mark unsaved
          const saveBtn = document.getElementById('rptNotesSaveBtn');
          if (saveBtn) { saveBtn.style.background = '#B01A18'; saveBtn.textContent = 'Save Notes'; }
        });
      }

      // Wire editable Pending Mistral ID cells (P&O monthly demand)
      document.querySelectorAll('.rpt-pending-edit').forEach(input => {
        const commit = () => {
          const key = input.dataset.ovrkey;
          const v   = input.value.trim();
          _savePendingOverride(key, v === '' ? null : v);
          regenerate(); // re-render so subtotals/grand total update + override styling refreshes
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
      });

      // Save Notes button
      const saveBtn = document.getElementById('rptNotesSaveBtn');
      if (saveBtn) {
        // Reflect current state (green if already saved, red if unsaved)
        const saved = _loadReportNote(brand);
        saveBtn.style.background = saved === _reportNotes[brand] ? '#2D7A55' : '#B01A18';
        saveBtn.textContent = saved === _reportNotes[brand] ? 'Notes Saved ✓' : 'Save Notes';

        saveBtn.addEventListener('click', () => {
          const latest = document.getElementById('rptNotesInline')?.value ?? _reportNotes[brand];
          _reportNotes[brand] = latest;
          _saveReportNote(brand, latest);
          saveBtn.textContent = 'Notes Saved ✓';
          saveBtn.style.background = '#2D7A55';
        });
      }

      document.getElementById('rptNotesAuto')?.addEventListener('click', async () => {
        const fresh = await fetchCruiseData(false);
        _reportNotes[brand] = computeAutoNotes(brand, fresh.seafarers, fresh.finalInt, date).join('\n');
        // Mark unsaved after auto-fill
        const sb = document.getElementById('rptNotesSaveBtn');
        if (sb) { sb.style.background = '#B01A18'; sb.textContent = 'Save Notes'; }
        regenerate();
      });
    } catch (e) {
      preview.innerHTML = `<div style="padding:32px;color:#B01A18;font-size:13px;">Failed to load: ${escH(e.message)}</div>`;
    }
  }
  document.getElementById('rptBrand').addEventListener('change', regenerate);
  document.getElementById('rptDate').addEventListener('change', regenerate);
  // rptRegenBtn removed from UI — no-op if absent
  // ── Report password gate (SHA-256, never stored plain) ───────────────────
  const RPT_HASH = 'ef8e5b8012a7598cfa0f65069b44765ea6d3f10359b104c4e69504b93df5c40f';

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function rptPasswordPrompt(onSuccess) {
    // Build modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99995;
      display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:var(--card-bg,#fff);border-radius:12px;padding:28px 28px 22px;
        width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.22);font-family:inherit;">
        <div style="font-size:14px;font-weight:700;color:var(--text,#1A1A1A);margin-bottom:4px;">
          🔒 Report Password Required
        </div>
        <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:16px;">
          Enter the password to download this report.
        </div>
        <input id="rptPwInput" type="password" placeholder="Password"
          style="width:100%;height:36px;border:1px solid var(--border,#ddd);border-radius:7px;
            padding:0 12px;font-size:13px;font-family:inherit;background:var(--bg-page,#fafafa);
            color:var(--text,#1A1A1A);outline:none;box-sizing:border-box;">
        <div id="rptPwError" style="color:#DC2626;font-size:11px;margin-top:6px;min-height:16px;"></div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
          <button id="rptPwCancel"
            style="padding:7px 16px;font-size:12px;font-weight:600;border:1px solid var(--border,#ddd);
              background:transparent;color:var(--text);border-radius:7px;cursor:pointer;font-family:inherit;">
            Cancel
          </button>
          <button id="rptPwOk"
            style="padding:7px 18px;font-size:12px;font-weight:600;border:none;
              background:#B01A18;color:#fff;border-radius:7px;cursor:pointer;font-family:inherit;">
            Unlock
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#rptPwInput');
    const errEl = overlay.querySelector('#rptPwError');
    input.focus();

    const close = () => overlay.remove();

    overlay.querySelector('#rptPwCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const tryUnlock = async () => {
      const hash = await sha256(input.value);
      if (hash === RPT_HASH) {
        close();
        onSuccess();
      } else {
        errEl.textContent = 'Incorrect password. Please try again.';
        input.value = '';
        input.focus();
      }
    };

    overlay.querySelector('#rptPwOk').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  }

  document.getElementById('rptDownloadBtn').addEventListener('click', () => {
    rptPasswordPrompt(() => {
      const brand = document.getElementById('rptBrand').value;
      downloadReportPDF(
        brand,
        new Date(document.getElementById('rptDate').value),
        notesLines(_reportNotes[brand])
      );
    });
  });
  document.getElementById('rptDownloadAllBtn').addEventListener('click', () => {
    rptPasswordPrompt(async () => {
      const btn = document.getElementById('rptDownloadAllBtn');
      const reportDate = new Date(document.getElementById('rptDate').value);
      const originalLabel = btn.textContent;
      btn.disabled = true;
      try {
        const { seafarers, finalInt } = await fetchCruiseData(false);
        for (let i = 0; i < CRUISE_BRANDS.length; i++) {
          const brand = CRUISE_BRANDS[i];
          btn.textContent = `Downloading ${i+1}/${CRUISE_BRANDS.length}…`;
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
  });
  regenerate();

  // ── Mistral Request wiring ─────────────────────────────────────────────────
  let _mistralBase   = [];    // base rows (date-filtered)
  let _mistralSortF  = null;
  let _mistralSortD  = 1;

  // ── Mistral email sent tracking (shared live) ──────────────────────────────
  function _loadMistralSent() {
    const obj = sharedGet('mistral_sent', {}) || {};
    try { return new Map(Object.entries(obj)); } catch { return new Map(); }
  }
  function _saveMistralSent(map) {
    sharedSet('mistral_sent', Object.fromEntries(map));
  }
  let _mistralSentIds = _loadMistralSent(); // id → { ok, ts }

  const fmtMistralSent = id => {
    const entry = _mistralSentIds.get(id);
    if (!entry) return '<span style="color:var(--text-muted,#bbb);font-size:10.5px;">—</span>';
    const { ok, ts } = (typeof entry === 'object') ? entry : { ok: true, ts: entry };
    if (!ok) return `<span style="font-size:10.5px;font-weight:600;color:#DC2626;">Failed</span>`;
    const d = new Date(ts);
    return `<span style="font-size:10.5px;color:#15803D;white-space:nowrap;">
      ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}<br>
      <span style="font-size:10px;color:var(--text-muted,#888);">${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
    </span>`;
  };

  function mistralOpts() {
    return {
      from: document.getElementById('mistralFrom')?.value || null,
      to:   document.getElementById('mistralTo')?.value   || null,
    };
  }

  function mistralCurrent() {
    // apply per-column filters + sort on top of the date-filtered base
    const colMS = {};
    document.querySelectorAll('[id^="mistralCF_"]').forEach(el => {
      const field = el.id.replace('mistralCF_', '');
      const vals  = msGetVals(el.id);
      if (vals.length) colMS[field] = vals;
    });
    const colText = {};
    document.querySelectorAll('.mistral-col-f').forEach(inp => {
      const v = inp.value.trim().toLowerCase();
      if (v) colText[inp.dataset.field] = v;
    });
    let out = _mistralBase.filter(r => {
      for (const f in colMS)   if (!colMS[f].includes(r[f]))                  return false;
      for (const f in colText) if (!String(r[f] ?? '').toLowerCase().includes(colText[f])) return false;
      return true;
    });
    if (_mistralSortF) {
      out = out.slice().sort((a, b) => {
        const av = a[_mistralSortF], bv = b[_mistralSortF];
        return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric:true }) * _mistralSortD;
      });
    }
    return out;
  }

  function renderMistralKpis(rows) {
    const wrap = document.getElementById('mistralKpis');
    if (!wrap) return;
    const total   = rows.length;
    const cunard  = rows.filter(r => r.cruiseLine === 'Cunard Line').length;
    const po      = rows.filter(r => r.cruiseLine === 'P&O Cruises').length;
    const cuk     = rows.filter(r => r.cruiseLine === 'CUK Maritime').length;
    const noPass  = rows.filter(r => !cleanVal(r.passportNumber)).length;
    const card = (label, val, color, sub) => `
      <div class="req-kpi-card">
        <span class="req-kpi-label">${escH(label)}</span>
        <span class="req-kpi-value" style="color:${color};">${val}</span>
        <span class="req-kpi-sub">${escH(sub)}</span>
      </div>`;
    wrap.innerHTML =
      card('Total Need to Request', total,  '#B01A18', 'seafarers pending ID') +
      card('Cunard Line',           cunard, '#1B3A6B', 'pending') +
      card('P&O Cruises',           po,     '#2D7A55', 'pending') +
      card('CUK Maritime',          cuk,    '#B87A14', 'pending') +
      card('Total No Passport',     noPass, '#7C3AED', 'passport missing');
  }

  function buildMistralHeaderRows() {
    const TH  = `padding:8px 10px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);`;
    const TF  = `padding:4px 6px;background:var(--bg-page,#fafafa);border-bottom:1px solid var(--border,#e5e7eb);`;
    const STH = `position:sticky;z-index:4;`; // sticky header z-index
    // Front columns sticky
    const frontTh = `
      <th style="${TH}${STH}left:0;min-width:160px;"></th>
      <th style="${TH}${STH}left:160px;min-width:80px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted,#888);white-space:nowrap;">Last Sent</th>`;
    const frontFilter = `<th style="${TF}${STH}left:0;"></th><th style="${TF}${STH}left:160px;"></th>`;

    const thSort = MISTRAL_COLUMNS.map(c => {
      const off = mistralStickyLeft(c.field);
      const s = c.sticky
        ? `${STH}left:${off}px;min-width:${c.w}px;` +
          (c.field === MISTRAL_LAST_STICKY ? 'box-shadow:2px 0 4px rgba(0,0,0,0.06);' : '')
        : '';
      return `<th data-field="${c.field}" class="sortable"
        style="${TH}${s}text-align:left;font-size:10px;font-weight:700;letter-spacing:0.05em;
          text-transform:uppercase;color:var(--text-muted,#888);white-space:nowrap;
          cursor:pointer;user-select:none;">
        ${escH(c.label)} <span class="mistral-sort-icon">⇅</span>
      </th>`;
    }).join('');

    const thFilter = MISTRAL_COLUMNS.map(c => {
      let cell;
      if (c.filterMS) {
        const opts = [...new Set(_mistralBase.map(r => r[c.field]).filter(v => v && v !== '—' && v !== ''))].sort();
        cell = buildColMS(`mistralCF_${c.field}`, opts);
      } else {
        cell = `<input class="mistral-col-f" data-field="${c.field}" type="text" placeholder="—"
          style="width:100%;height:24px;font-size:10px;padding:0 6px;border:1px solid var(--border,#ddd);border-radius:5px;background:var(--card-bg,#fff);color:var(--text);">`;
      }
      const off = mistralStickyLeft(c.field);
      const s = c.sticky ? `${STH}left:${off}px;` : '';
      return `<th style="${TF}${s}">${cell}</th>`;
    }).join('');

    return `<tr>${frontTh}${thSort}</tr><tr>${frontFilter}${thFilter}</tr>`;
  }

  function renderMistralTable() {
    // Snapshot text-filter values before DOM is wiped
    const _savedText = {};
    document.querySelectorAll('.mistral-col-f').forEach(inp => { _savedText[inp.dataset.field] = inp.value; });

    const rows = mistralCurrent();
    renderMistralKpis(rows);
    const wrap = document.getElementById('mistralPreview');
    if (!wrap) return;
    const header = buildMistralHeaderRows();
    const bodyHtml = rows.length
      ? rows.map(r => `<tr data-id="${escH(r.id)}">
          <td style="padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);text-align:center;white-space:nowrap;position:sticky;left:0;z-index:2;background:var(--card-bg,#fff);min-width:160px;">
            <button class="mistral-detail-btn" data-id="${escH(r.id)}"
              style="font-size:10.5px;font-weight:600;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);border-radius:5px;padding:3px 9px;cursor:pointer;font-family:inherit;margin-right:4px;">Detail</button>
            <button class="mistral-send-btn" data-id="${escH(r.id)}" data-email="${escH(r.email||'')}" data-name="${escH(r.fullName||'')}"
              title="Send form email to seafarer"
              style="font-size:10.5px;font-weight:600;border:none;background:${r.email?'#1B3A6B':'#ccc'};color:#fff;border-radius:5px;padding:3px 9px;cursor:${r.email?'pointer':'not-allowed'};font-family:inherit;">
              Send Form</button>
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid var(--border,#f0f0f0);font-size:11px;position:sticky;left:160px;z-index:2;background:var(--card-bg,#fff);min-width:80px;">
            ${fmtMistralSent(r.id)}
          </td>
          ${MISTRAL_COLUMNS.map(c => {
            const off = mistralStickyLeft(c.field);
            const sticky = c.sticky
              ? `position:sticky;left:${off}px;z-index:2;background:var(--card-bg,#fff);min-width:${c.w}px;` +
                (c.field === MISTRAL_LAST_STICKY ? 'box-shadow:2px 0 4px rgba(0,0,0,0.06);' : '')
              : '';
            return `<td style="padding:8px 10px;border-bottom:1px solid var(--border,#f0f0f0);font-size:11.5px;white-space:nowrap;${sticky}">${escH(cleanVal(r[c.field]))}</td>`;
          }).join('')}
        </tr>`).join('')
      : `<tr><td colspan="${MISTRAL_COLUMNS.length+3}" style="padding:32px;text-align:center;color:var(--text-muted,#aaa);font-size:12px;">No matching seafarers.</td></tr>`;
    wrap.innerHTML = `
      <div style="padding:10px 16px;font-size:12px;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);">
        <strong style="color:var(--text);">${rows.length}</strong> seafarer${rows.length!==1?'s':''} pending Mistral ID
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:1200px;">
          <thead style="position:sticky;top:0;z-index:5;">${header}</thead>
          <tbody id="mistralBody">${bodyHtml}</tbody>
        </table>
      </div>`;

    initMS(wrap);
    // Restore text-filter values so typing doesn't reset on each keypress
    document.querySelectorAll('.mistral-col-f').forEach(inp => { if (_savedText[inp.dataset.field]) inp.value = _savedText[inp.dataset.field]; });
    // re-attach filter / sort / detail handlers
    document.querySelectorAll('.mistral-col-f').forEach(inp => inp.addEventListener('input', renderMistralTable));
    document.querySelectorAll('[id^="mistralCF_"]').forEach(el =>
      msOnChange(el.id, renderMistralTable));
    document.querySelectorAll('#mistralPreview th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const f = th.dataset.field;
        if (_mistralSortF === f) _mistralSortD *= -1; else { _mistralSortF = f; _mistralSortD = 1; }
        renderMistralTable();
      });
    });
    // Restore the active sort icon
    document.querySelectorAll('#mistralPreview .mistral-sort-icon').forEach(s => s.textContent = '⇅');
    if (_mistralSortF) {
      const cur = document.querySelector(`#mistralPreview th.sortable[data-field="${_mistralSortF}"] .mistral-sort-icon`);
      if (cur) cur.textContent = _mistralSortD > 0 ? '↑' : '↓';
    }
    document.querySelectorAll('.mistral-detail-btn').forEach(b => {
      b.addEventListener('click', () => openMistralDetail(b.dataset.id));
    });

    // Toast helper for Mistral section (cruise portal has no global toast)
    const mistralToast = (msg, ok) => {
      const t = document.createElement('div');
      t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99998;padding:10px 18px;
        border-radius:8px;font-size:13px;font-weight:500;color:#fff;
        background:${ok ? '#2D7A55' : '#B01A18'};box-shadow:0 4px 16px rgba(0,0,0,0.2);
        opacity:0;transition:opacity 0.2s;font-family:inherit;`;
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; });
      setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 3500);
    };

    // Send Form buttons
    document.querySelectorAll('.mistral-send-btn').forEach(btn => {
      if (!btn.dataset.email) return;
      btn.addEventListener('click', async () => {
        const id    = btn.dataset.id;
        const email = btn.dataset.email;
        const name  = btn.dataset.name;
        if (!email) { mistralToast('No email address for this seafarer.', false); return; }
        const orig = btn.textContent;
        btn.textContent = 'Sending…'; btn.disabled = true;
        let success = false;
        try {
          const res  = await fetch(WORKER_URL + '/api/cruise/send-mistral-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: email, name }),
          });
          const data = await res.json();
          success = !!data.ok;
          _mistralSentIds.set(id, { ok: success, ts: new Date().toISOString() });
          _saveMistralSent(_mistralSentIds);
          mistralToast(success ? `Email sent to ${name}` : `Failed: ${data.error || 'Unknown error'}`, success);
        } catch (err) {
          _mistralSentIds.set(id, { ok: false, ts: new Date().toISOString() });
          _saveMistralSent(_mistralSentIds);
          mistralToast('Network error. Please try again.', false);
        }
        renderMistralTable();
      });
    });
  }

  async function reloadMistral() {
    const wrap = document.getElementById('mistralPreview');
    if (wrap) wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted,#aaa);font-size:13px;">Loading…</div>`;
    try {
      const { seafarers } = await fetchCruiseData(false);
      _mistralBase = mistralRequestRows(seafarers, mistralOpts());
      renderMistralTable();
    } catch (e) {
      if (wrap) wrap.innerHTML = `<div style="padding:32px;color:#B01A18;font-size:13px;">Failed to load: ${escH(e.message)}</div>`;
    }
  }

  function downloadMistralExcel(rows) {
    const filename = `CUK_MISTRAL_REQUEST_${new Date().toISOString().slice(0,10)}`;
    // Build [header, ...rows] AOA for SheetJS
    const header = MISTRAL_COLUMNS.map(c => c.label);
    const body   = rows.map(r => MISTRAL_COLUMNS.map(c => cleanVal(r[c.field])));
    const aoa    = [header, ...body];

    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      // auto-ish column widths
      ws['!cols'] = header.map((h, i) => ({
        wch: Math.max(h.length, ...body.map(r => String(r[i] || '').length)) + 1
      }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Mistral Request');
      window.XLSX.writeFile(wb, filename + '.xlsx');
      return;
    }
    // CSV fallback if XLSX library failed to load
    const esc = v => /[",\n]/.test(v) ? `"${String(v).replace(/"/g,'""')}"` : v;
    const csv = '﻿' + aoa.map(row => row.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Detail / edit panel for a single Mistral row
  function openMistralDetail(zohoId) {
    const row = _mistralBase.find(r => r.id === zohoId);
    if (!row) return;
    const m = ensureReqModal();
    m.style.width = '500px';

    // Editable fields = anything with a zoho api name PLUS Seafarer ID Number
    // (the whole point of this panel — entering the new Mistral ID).
    const fields = [
      { label:'Seafarer ID Number', field:'seafarerIdNumber', zoho:'Crew_ID_Number', highlight:true },
      ...MISTRAL_COLUMNS.filter(c => c.zoho),
    ];

    const formHtml = fields.map(c => {
      const val = row[c.field] == null ? '' : String(row[c.field]).replace(/^—$/, '');
      const inputType = c.type === 'date' ? 'date' : c.type === 'number' ? 'number' : 'text';
      const inputId   = c.highlight ? 'mistralEditIdInput' : '';
      const labelBg   = c.highlight ? 'background:rgba(176,26,24,0.06);' : '';
      const inputCss  = c.highlight
        ? 'border:1.5px solid #B01A18;background:#fffdfd;font-weight:700;color:#B01A18;'
        : 'border:1px solid var(--border,#ddd);background:var(--card-bg,#fff);color:var(--text);';
      // Optional section header (e.g. "Next of Kin") before this field
      const sectionHdr = c.section
        ? `<div style="padding:8px 12px;background:var(--bg-page,#f5f5f5);font-size:10px;font-weight:800;
             letter-spacing:0.08em;text-transform:uppercase;color:#B01A18;border-top:1px solid var(--border,#eee);
             border-bottom:1px solid var(--border,#eee);">${escH(c.section)}</div>`
        : '';
      return `${sectionHdr}
        <label style="display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid var(--border,#f3f3f3);${labelBg}">
          <span style="flex:0 0 150px;font-size:10.5px;font-weight:${c.highlight?'800':'600'};color:${c.highlight?'#B01A18':'var(--text-muted,#888)'};text-transform:uppercase;letter-spacing:0.04em;">${escH(c.label)}${c.highlight?' ★':''}</span>
          <input ${inputId ? `id="${inputId}" ` : ''}data-zoho="${escH(c.zoho)}" data-field="${escH(c.field)}" type="${inputType}" value="${escH(val)}"
            style="flex:1;min-width:0;padding:5px 8px;border-radius:5px;font-size:11.5px;font-family:inherit;${inputCss}">
        </label>`;
    }).join('');

    const body = `
      <div style="padding:8px 12px;background:var(--bg-page,#fafafa);font-size:10.5px;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#eee);">
        <strong style="color:var(--text);">${escH(row.fullName || '—')}</strong>
        ${row.candidateId ? ` · ${escH(row.candidateId)}` : ''}
      </div>
      <form id="mistralEditForm">${formHtml}</form>
<div style="padding:10px 12px;display:flex;gap:8px;align-items:center;background:var(--bg-page,#fafafa);border-top:1px solid var(--border,#eee);">
        <button id="mistralEditFocusId" type="button"
          style="padding:6px 12px;font-size:11.5px;font-weight:700;border:1px solid #B01A18;background:#fff;color:#B01A18;border-radius:5px;cursor:pointer;font-family:inherit;">
          ★ Edit ID
        </button>
        <span id="mistralEditStatus" style="margin-left:auto;margin-right:6px;font-size:11px;color:var(--text-muted,#888);"></span>
        <button id="mistralEditCancel" style="padding:6px 14px;font-size:11.5px;font-weight:600;border:1px solid var(--border,#ddd);background:transparent;color:var(--text);border-radius:5px;cursor:pointer;font-family:inherit;">Close</button>
        <button id="mistralEditSave" style="padding:6px 16px;font-size:11.5px;font-weight:600;border:none;background:#B01A18;color:#fff;border-radius:5px;cursor:pointer;font-family:inherit;">Save to Zoho</button>
      </div>`;
    openReqModal(`Seafarer Detail`, body, { x: window.innerWidth/2 - 250, y: 80 });

// Edit ID button: scroll the Seafarer ID Number field into view and focus
    document.getElementById('mistralEditFocusId')?.addEventListener('click', () => {
      const input = document.getElementById('mistralEditIdInput');
      if (!input) return;
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.focus();
      input.select();
      // Pulse the field briefly
      const orig = input.style.boxShadow;
      input.style.boxShadow = '0 0 0 3px rgba(176,26,24,0.3)';
      setTimeout(() => { input.style.boxShadow = orig; }, 900);
    });

    document.getElementById('mistralEditCancel').addEventListener('click', () => {
      m.style.display = 'none';
    });
    document.getElementById('mistralEditSave').addEventListener('click', async () => {
      const status = document.getElementById('mistralEditStatus');
      const inputs = document.querySelectorAll('#mistralEditForm input[data-zoho]');
      const changes = {};
      inputs.forEach(inp => {
        const zk = inp.dataset.zoho;
        const fk = inp.dataset.field;
        const oldVal = row[fk] == null ? '' : String(row[fk]).replace(/^—$/, '');
        if (inp.value !== oldVal) changes[zk] = inp.value || null;
      });
      if (!Object.keys(changes).length) {
        status.textContent = 'No changes to save.';
        return;
      }
      status.textContent = 'Saving…';
      try {
        const res = await fetch(`${WORKER_URL}/api/recruit/Candidates/${zohoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        const data = await res.json();
        const code = data?.data?.[0]?.code;
        if (code && code !== 'SUCCESS') throw new Error(data.data[0].message || code);
        status.textContent = '✓ Saved';
        status.style.color = '#2D7A55';
        // Update local row + UI
        inputs.forEach(inp => { row[inp.dataset.field] = inp.value; });
        renderMistralTable();
        setTimeout(() => { m.style.display = 'none'; }, 900);
      } catch (e) {
        status.textContent = '✗ ' + e.message;
        status.style.color = '#B01A18';
      }
    });
  }

  // mistralRefresh removed from UI — no-op if absent
  document.getElementById('mistralApply')?.addEventListener('click', reloadMistral);
  document.getElementById('mistralDownload')?.addEventListener('click', () => {
    downloadMistralExcel(mistralCurrent());
  });

  // Render the Mistral table the first time its tab is opened
  let _mistralLoaded = false;
  document.querySelectorAll('.task-sub-link').forEach(link => {
    if (link.dataset.section === 'mistral') {
      link.addEventListener('click', () => {
        if (!_mistralLoaded) { _mistralLoaded = true; reloadMistral(); }
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
  // Keys are stored lowercase so Zoho casing differences don't create mismatches.
  const byPosition = {};   // pos_lowercase -> [ { hasId, gender, hiredDate, pos } ]
  function pushRec(pos, rec) {
    if (!pos || pos === '—') return;
    const key = pos.toLowerCase();
    (byPosition[key] = byPosition[key] || []).push(rec);
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
      <div class="rpt-notes-h" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span>RECRUITING NOTES</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button type="button" id="rptNotesAuto" class="rpt-notes-auto">Auto-fill</button>
          <button type="button" id="rptNotesSaveBtn"
            style="padding:4px 12px;font-size:11px;font-weight:700;border:none;border-radius:5px;
              background:#2D7A55;color:#fff;cursor:pointer;font-family:inherit;transition:background 0.15s;
              white-space:nowrap;">Notes Saved ✓</button>
        </div>
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
    const recs   = agg.byPosition[pos.toLowerCase()] || [];
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
// ── Manual pending-Mistral-ID overrides for monthly demand (shared live) ──────
function _loadPendingOverrides() {
  return sharedGet('pending_overrides', {}) || {};
}
function _savePendingOverride(key, val) {
  const all = { ...(_loadPendingOverrides()) };
  if (val === null || val === undefined || val === '') delete all[key];
  else all[key] = Number(val);
  sharedSet('pending_overrides', all);
}
function _pendingOvrKey(brand, mk, pos) { return `${brand}||${mk}||${pos}`; }

function buildMonthlyDemandReport(brand, reportDate, agg, notesOverride, editable) {
  const year      = reportDate.getFullYear();
  const node      = brandNode(loadDemand(), brand);
  const monthly   = node.monthly    || {};
  const talentPool= node.talentPool || {};
  const pendingOvr= _loadPendingOverrides();

  // Allocation uses chronological order (Jan → Dec) so waterfall fills correctly
  const allocMonthList = Object.keys(monthly)
    .filter(mk => mk.startsWith(String(year)))
    .sort();
  // Display uses latest-first (Dec → Jan) per user preference
  const monthList = [...allocMonthList].reverse();

  let rangeLabel = String(year);
  if (allocMonthList.length) {
    const first = monthLabel(allocMonthList[0]).split(' ')[0];
    const last  = monthLabel(allocMonthList[allocMonthList.length-1]).split(' ')[0];
    rangeLabel  = first === last ? `${first} ${year}` : `${first} - ${last} ${year}`;
  }

  // ── Talent Pool block (running, no date filter) ──
  const tpPositions = Object.keys(talentPool);
  let talentPoolBlock = '';
  if (tpPositions.length) {
    const tpRows = tpPositions.sort().map(pos => {
      const req    = Number(talentPool[pos] || 0);
      const recs   = agg.byPosition[pos.toLowerCase()] || [];
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
  allocMonthList.forEach(mk => Object.keys(monthly[mk] || {}).forEach(p => demandPositions.add(p)));
  tpPositions.forEach(p => demandPositions.delete(p));   // avoid double-count with TP block

  // alloc[pos][mk] = { dem, hired, pending, male, female, remaining }
  // Sort helper: IDs first, then hire date ascending
  const idFirst = (a, b) => {
    const d = (b.hasId ? 1 : 0) - (a.hasId ? 1 : 0);
    if (d !== 0) return d;
    const da = String(a.hiredDate || ''), db = String(b.hiredDate || '');
    return da < db ? -1 : da > db ? 1 : 0;
  };

  const alloc = {};
  demandPositions.forEach(pos => {
    alloc[pos] = {};
    const recs = (agg.byPosition[pos.toLowerCase()] || []).slice();

    if (DEMAND_BY_HIRE_MONTH.has(pos)) {
      // Hotel Asst F&B: bucket by actual hire month; within each bucket IDs first
      const monthRecs = {};
      allocMonthList.forEach(mk => {
        monthRecs[mk] = recs
          .filter(r => r.hiredDate && monthKey(r.hiredDate) === mk)
          .sort(idFirst);
      });
      (DEMAND_REALLOCATIONS[pos] || []).forEach(({ from, to, count }) => {
        if (!monthRecs[from] || !monthRecs[to]) return;
        monthRecs[to] = monthRecs[to].concat(monthRecs[from].splice(0, count));
      });
      allocMonthList.forEach(mk => {
        const dem     = Number(monthly[mk]?.[pos] || 0);
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

    // All other positions: waterfall oldest-month-first, IDs prioritised
    recs.sort(idFirst);
    let idx = 0;
    allocMonthList.forEach(mk => {
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
      // Apply manual pending override if set
      const ovrKey = _pendingOvrKey(brand, mk, p);
      const hasOvr = Object.prototype.hasOwnProperty.call(pendingOvr, ovrKey);
      const pendingVal = hasOvr ? pendingOvr[ovrKey] : a.pending;
      // Demand Remaining recalculates with the (possibly overridden) pending so
      // the row always reconciles: Demand = Hired + Pending + Remaining.
      const remainingVal = Math.max(0, a.dem - a.hired - pendingVal);
      sub.dem+=a.dem; sub.remaining+=remainingVal; sub.hired+=a.hired;
      sub.male+=a.male; sub.female+=a.female; sub.pending+=pendingVal;
      const pendingCell = editable
        ? `<td class="rpt-td rpt-num">
             <input class="rpt-pending-edit" data-ovrkey="${escH(ovrKey)}"
               value="${pendingVal}"
               style="width:46px;text-align:center;font-size:11px;padding:2px 4px;
                 border:1px solid ${hasOvr ? '#B01A18' : 'var(--border,#ddd)'};border-radius:4px;
                 background:${hasOvr ? 'rgba(176,26,24,0.05)' : 'var(--card-bg,#fff)'};
                 color:${hasOvr ? '#B01A18' : 'var(--text)'};font-family:inherit;font-weight:${hasOvr?'700':'400'};">
           </td>`
        : (hasOvr
            ? `<td class="rpt-td rpt-num">
                 <span style="display:inline-block;min-width:30px;padding:2px 8px;border:1px solid #B01A18;
                   border-radius:4px;color:#B01A18;font-weight:700;background:rgba(176,26,24,0.05);">${pendingVal}</span>
               </td>`
            : `<td class="rpt-td rpt-num">${pendingVal}</td>`);
      return `
        <tr>
          <td class="rpt-td">${escH(p)}</td>
          <td class="rpt-td rpt-num">${a.dem}</td>
          <td class="rpt-td rpt-num">${remainingVal}</td>
          <td class="rpt-td rpt-num">${a.hired}</td>
          <td class="rpt-td rpt-num">${a.male}</td>
          <td class="rpt-td rpt-num">${a.female}</td>
          ${pendingCell}
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
            <th class="rpt-th rpt-num">DEMAND</th>
            <th class="rpt-th rpt-num">DEMAND<br>REMAINING</th>
            <th class="rpt-th rpt-num">HIRED</th>
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

// ── AI: full portal context builder ──────────────────────────────────────────
// Called after any major data load so CTI AI knows everything in the portal.
function buildFullPortalContext() {
  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth();
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const top = (obj, n) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}(${v})`).join(', ');
  const sections = [];

  // ── Seafarers ────────────────────────────────────────────────────────────
  if (_sfRows.length) {
    const byCL={}, byOnb={};
    _sfRows.forEach(r=>{
      const cl=r.cruiseLine||'—'; if(cl!=='—') byCL[cl]=(byCL[cl]||0)+1;
      const ob=r.onboardingStatus||'—'; if(ob!=='—') byOnb[ob]=(byOnb[ob]||0)+1;
    });
    const ready = _sfRows.filter(r=>sfIsReadyToGo(r)&&!r.signOnDate).length;
    sections.push([
      `SEAFARERS (all active, resigned excluded):`,
      `  Total: ${_sfRows.length} | Ready/No Assignment: ${ready}`,
      `  Cruise Lines: ${top(byCL,5)}`,
      `  Onboarding Status: ${top(byOnb,6)}`,
    ].join('\n'));
  }

  // ── Visa ──────────────────────────────────────────────────────────────────
  if (_vRows.length) {
    const isNtp = s=>(s||'').trim().toLowerCase()==='need to process';
    const c1d = _vRows.filter(r=>{const q=getVisaReqs(r);return q.c1d==='Required'||isNtp(r.c1dStatus);}).length;
    const mcv = _vRows.filter(r=>{const q=getVisaReqs(r);return q.mcv==='Required'||isNtp(r.mcvStatus);}).length;
    const oktb= _vRows.filter(r=>{const q=getVisaReqs(r);return q.oktb==='Required'||isNtp(r.oktbStatus);}).length;
    sections.push([
      `VISA TRACKING (CTI Indonesia, non-resigned):`,
      `  Total: ${_vRows.length} | C1/D needed: ${c1d} | MCV needed: ${mcv} | OKTB needed: ${oktb}`,
    ].join('\n'));
  }

  // ── Deployment ────────────────────────────────────────────────────────────
  if (_depRows.length) {
    const first = _depRows[0]||{};
    const tryCol = (...opts) => opts.find(k=>k in first)||opts[0];
    const COL = {
      cruiseLine: tryCol('Cruise Line','Brand'),
      empStatus:  tryCol('Employment Status'),
      ctiOff:     tryCol('CTI Office Analytics','CTI Office'),
      date:       tryCol('Sign On Date','Date','Deployment Date'),
    };
    const vv = (r,c) => (r[c]||'').toString().trim();
    const byCL={}, byEmp={}, byOff={};
    let thisYr=0, lastYr=0, thisMo=0;
    _depRows.forEach(r=>{
      const cl=vv(r,COL.cruiseLine); if(cl) byCL[cl]=(byCL[cl]||0)+1;
      const es=vv(r,COL.empStatus);  if(es) byEmp[es]=(byEmp[es]||0)+1;
      const co=vv(r,COL.ctiOff);     if(co) byOff[co]=(byOff[co]||0)+1;
      const d=depParseDate(vv(r,COL.date));
      if(d){
        if(d.year===curYear&&d.month<=curMonth) thisYr++;
        if(d.year===curYear-1&&d.month<=curMonth) lastYr++;
        if(d.year===curYear&&d.month===curMonth) thisMo++;
      }
    });
    const rep=_depRows.filter(r=>(vv(r,COL.empStatus)||'').toLowerCase()==='repeater').length;
    const nh =_depRows.filter(r=>{const s=(vv(r,COL.empStatus)||'').toLowerCase();return s==='new hire'||s==='re hire';}).length;
    sections.push([
      `DEPLOYMENT (Zoho Sheet, all history):`,
      `  Total records: ${_depRows.length.toLocaleString()}`,
      `  ${curYear} YTD (Jan-${MONTH_NAMES[curMonth]}): ${thisYr} | ${curYear-1} same period: ${lastYr}`,
      `  This month (${MONTH_NAMES[curMonth]} ${curYear}): ${thisMo}`,
      `  Repeater: ${rep} | New/Re Hire: ${nh}`,
      `  Top Cruise Lines: ${top(byCL,5)}`,
      `  Top CTI Offices: ${top(byOff,4)}`,
      `  Employment: ${top(byEmp,4)}`,
    ].join('\n'));
  }

  if (!sections.length) return '';
  window.CTI_FULL_CONTEXT = `Portal: Cruise Line Portal\nCurrent page: ${window.CTI_PAGE_CONTEXT?.page||'—'}\n\n` + sections.join('\n\n');
  return window.CTI_FULL_CONTEXT;
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
    // Pull shared live state (heat map, notes, overrides, sent-flags) once
    // before the first render so every device shows the same data.
    await ensureSharedState();
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

  // ── Silent background preload — gives AI full knowledge from any page ─────
  (async () => {
    try {
      // 1. Seafarers (same logic as pages.seafarer, but silent)
      if (!_sfRows.length) {
        const res = await safeJson(WORKER_URL + '/api/cruise/seafarers').catch(() => ({}));
        const allRows = res.data || [];
        const RESIGNED = new Set(['resign','resigned']);
        _sfRows = allRows.filter(s => !RESIGNED.has((s.onboardingStatus||'').trim().toLowerCase()));
      }
      // 2. Deployment sheet (same as pages.deployment, but silent)
      if (!_depRows.length) {
        const res = await safeJson(WORKER_URL + '/api/cruise/deployment?_v=2').catch(() => ({}));
        _depRows = res.data || [];
      }
      // 3. Build full AI context
      buildFullPortalContext();
    } catch (_) {}
  })();

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
