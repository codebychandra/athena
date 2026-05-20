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
  reports:      'Reports',
  settings:     'Settings',
  interntainee: 'Intern v Trainee',
  socialmedia:  'Social Media Disclosure',
  compliance:   'Compliance',
  marketing:    'Marketing',
  j1visa:       'Visa Status',
  requisition:  'Requisition',
  travel:       'Travel'
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

// ── Client data (real) ────────────────────────────────────────
const CLIENTS_DATA = [
  { id:1,  category:'Cruise Line', name:'TUI River Cruises',
    about:'',
    phone:'', email:'beatrice@theapollogroup.com',
    website:'https://careers.tuigroup.com/en/river-cruises-brand' },
  { id:2,  category:'Cruise Line', name:'Viking Cruises',
    about:'Viking was founded in 1997 with the vision that travel could be more destination focused and culturally immersive. The company expanded into the American market in 2000, establishing a sales and marketing office in Los Angeles, California. Since then, Viking has grown to a fleet of more than 90 vessels, offering river, ocean and expedition voyages on all seven continents.',
    phone:'+41616386077', email:'dominik.hofstetter@viking.com',
    website:'https://www.viking.com' },
  { id:3,  category:'Cruise Line', name:'Four Seasons Yacht',
    about:'', phone:'', email:'', website:'' },
  { id:4,  category:'Cruise Line', name:'Margaritaville At Sea',
    about:'Margaritaville is a warm and inviting place where people from all walks of life come together to create paradise. We offer an exciting employment experience where creating and delivering fun and escapism for our guests is the goal we seek to exceed everyday.',
    phone:'', email:'development@margaritaville.com',
    website:'https://www.margaritaville.com' },
  { id:5,  category:'Cruise Line', name:'Apollo Group',
    about:'The Apollo Group is proud to employ more than 16,000 crewmembers around the world. Positions are available in a wide range of services. Find your next career opportunity with us.',
    phone:'+1 (305) 592-8790', email:'info@theapollogroup.com',
    website:'https://www.theapollogroup.com' },
  { id:6,  category:'Cruise Line', name:'Holland America Line',
    about:'With over 150 years of legacy, our renowned brand offers exceptional service and extensive professional development. Enjoy company-paid travel, cruise perks, a buddy program to help you feel at home, and a diverse, inclusive environment.',
    phone:'', email:'', website:'https://www.hollandamerica.com' },
  { id:7,  category:'Cruise Line', name:'CUK Maritime',
    about:'Carnival UK is part of Carnival Corporation, the biggest travel and leisure company in the world. You might know us better by our brands – Cunard and P&O Cruises.',
    phone:'+119545685888', email:'marcos@carnivaluk.com',
    website:'https://www.carnivalukcareers.co.uk' },
  { id:8,  category:'Cruise Line', name:'Carnival Cruise Line',
    about:'At Carnival we understand the significance of building lasting memories. But what if you could also build a career that\'s just as unforgettable? Embrace the opportunity to create memories for others and to embark on a journey of your own.',
    phone:'', email:'', website:'https://www.jobs.carnival.com' },
  { id:9,  category:'Cruise Line', name:'P&O Cruises',
    about:'P&O Cruises is Britain\'s favourite cruise line. We are part of Carnival Corporation & PLC and we have been for 20 years. With amazing career opportunities across the fleet, we\'ll help you settle into an exciting life at sea as part of our P&O Cruises family.',
    phone:'+19545685888', email:'marcos@carnivaluk.com',
    website:'https://www.pocruisescareers.co.uk' },
  { id:10, category:'Cruise Line', name:'Cunard Line',
    about:'Cunard provides the definitive ocean travel experience perfected by over 180 years at sea and is continuously redefining the voyage experience for future generations. We\'ll help you find the perfect role and build a career to be proud of.',
    phone:'+19545685888', email:'marcos@carnivaluk.com',
    website:'https://www.cunardcareers.co.uk' },
  { id:11, category:'J1 Program', name:'Alliance Abroad Group',
    about:'Alliance Abroad is a U.S. Department of State Visa Sponsor. Celebrating over 30 years, we\'re still channeling a start-up spirit. Our purpose? To allow humanity to nurture real changes through the connections we create.',
    phone:'+18666227623', email:'support@allianceabroad.com',
    website:'https://allianceabroad.com' },
  { id:12, category:'J1 Program', name:'Green Heart',
    about:'', phone:'', email:'', website:'' },
  { id:13, category:'J1 Program', name:'CIEE',
    about:'', phone:'', email:'', website:'' },
  { id:14, category:'Other', name:'Heinemann Americas',
    about:'Heinemann Americas is a wholly owned subsidiary of Gebr. Heinemann, one of the world\'s foremost wholesalers and retailers for the international travel market based in Hamburg, Germany. Our globally positioned group of companies operates and supplies shops in travel retail that sell branded goods to travelers.',
    phone:'', email:'S.Ambrosino@heinemann-americas.com',
    website:'https://www.heinemann-americas.com/hai/en' }
];

// ── Client category helpers ───────────────────────────────────
function catColor(cat) {
  if (cat === 'Cruise Line') return '#B01A18';
  if (cat === 'J1 Program')  return '#1B3A6B';
  return '#2D7A55';
}
function catCls(cat) {
  if (cat === 'Cruise Line') return 'cruise';
  if (cat === 'J1 Program')  return 'j1';
  return 'other';
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
  zoho:      { connected: false, checked: false },
  clients:   null,   // initialized from CLIENTS_DATA on first visit
  clientFilter: ''   // active category filter on Clients page
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
// DATA
// ============================
async function loadJSON(file) {
  if (state.dataCache[file]) return state.dataCache[file];
  const data = window.MOCK_DATA && window.MOCK_DATA[file];
  if (!data) throw new Error(`No data found for ${file}`);
  state.dataCache[file] = data;
  return data;
}

// ============================
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

async function fetchZohoJ1Data() {
  try {
    const res  = await fetch('/api/zoho/j1-placements');
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json();
    return json?.data || json;
  } catch {
    return null;
  }
}

function zohoRowsToTable(zohoData) {
  if (!zohoData || !zohoData.columns || !zohoData.rows) return null;
  return zohoData.rows.map(row => {
    const obj = {};
    zohoData.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
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
// PAGE: DASHBOARD
// ============================
pages.dashboard = async function () {
  const d = await loadJSON('data/overview.json');
  return `
    <div class="page-header">
      <h1>Company Overview</h1>
      <p class="subtitle">All divisions · ${d.period}</p>
    </div>
    <div class="period-filter" id="periodFilter">
      ${['week','month','q2','ytd'].map(p =>
        `<button class="period-btn ${state.period===p?'active':''}" data-period="${p}">${
          {week:'This Week',month:'This Month',q2:'Q2 2026',ytd:'Year to Date'}[p]
        }</button>`).join('')}
    </div>
    <div class="kpi-grid">
      ${kpiCard('Total Placements',   fmt(d.kpis.totalPlacements),   d.kpiChanges.totalPlacements,   'all divisions combined')}
      ${kpiCard('Total Revenue',      fmtCurrency(d.kpis.totalRevenue), d.kpiChanges.totalRevenue,   'estimated earnings')}
      ${kpiCard('Active Candidates',  fmt(d.kpis.activeCandidates),  d.kpiChanges.activeCandidates,  'in pipeline')}
      ${kpiCard('Visa Approval Rate', d.kpis.visaApprovalRate + '%', d.kpiChanges.visaApprovalRate,  'all visa types')}
    </div>
    <div class="division-grid">
      ${divCard('cruise','Cruise Line',[
        {label:'Placed',  val:d.divisionSummary.cruise.placed,       max:800},
        {label:'Pending', val:d.divisionSummary.cruise.pending,      max:200},
        {label:'Clients', val:d.divisionSummary.cruise.activeClients,max:40}
      ])}
      ${divCard('j1','J1 Cultural Exchange',[
        {label:'Placed',   val:d.divisionSummary.j1.placed,          max:500},
        {label:'Pending',  val:d.divisionSummary.j1.pending,         max:200},
        {label:'Programs', val:d.divisionSummary.j1.activePrograms,  max:20}
      ])}
      ${divCard('marine','Marine Travel',[
        {label:'Placed',    val:d.divisionSummary.marine.placed,     max:400},
        {label:'In Transit',val:d.divisionSummary.marine.inTransit,  max:100},
        {label:'Routes',    val:d.divisionSummary.marine.activeRoutes,max:20}
      ])}
      ${divCard('visa','Visa Services',[
        {label:'Approved',   val:d.divisionSummary.visa.approved,    max:300},
        {label:'Processing', val:d.divisionSummary.visa.processing,  max:100},
        {label:'Visa Types', val:d.divisionSummary.visa.visaTypes,   max:10}
      ])}
    </div>
    <div class="chart-grid">
      <div class="card">
        <div class="card-title">Placement Trends</div>
        <div class="card-subtitle">Last 12 months by division</div>
        <div class="chart-wrap"><canvas id="chartTrend"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Division Revenue Share</div>
        <div class="card-subtitle">% of total estimated revenue</div>
        <div class="chart-wrap"><canvas id="chartRevenue"></canvas></div>
      </div>
    </div>`;
};

chartInits.dashboard = async function () {
  const d = await loadJSON('data/overview.json');
  createChart('chartTrend', {
    type: 'line',
    data: {
      labels: d.monthlyTrend.labels,
      datasets: [
        lineDataset('Cruise Line', d.monthlyTrend.cruise, DIVISION_COLORS.cruise),
        lineDataset('J1 Exchange', d.monthlyTrend.j1,     DIVISION_COLORS.j1),
        lineDataset('Marine',      d.monthlyTrend.marine, DIVISION_COLORS.marine),
        lineDataset('Visa',        d.monthlyTrend.visa,   DIVISION_COLORS.visa)
      ]
    },
    options: { responsive: true, maintainAspectRatio: true,
      scales: { y: { beginAtZero: true, grid: { color: gridColor() } }, x: { grid: { color: gridColor() } } } }
  });
  createChart('chartRevenue', {
    type: 'doughnut',
    data: {
      labels: ['Cruise Line','J1 Cultural Exchange','Marine Travel','Visa Services'],
      datasets: [{ data: Object.values(d.revenueShare),
        backgroundColor: Object.values(DIVISION_COLORS),
        borderWidth: 2, borderColor: darkBorder() }]
    },
    options: { responsive: true, cutout: '60%',
      plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}%` } } } }
  });
};

pageEvents.dashboard = function () {
  document.getElementById('periodFilter')?.addEventListener('click', e => {
    const btn = e.target.closest('.period-btn');
    if (!btn) return;
    state.period = btn.dataset.period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b === btn));
    showToast(`Filtered to: ${btn.textContent}`, 'info');
  });
};

function divCard(key, name, metrics) {
  const color = DIVISION_COLORS[key];
  const bars = metrics.map(m => `
    <div class="mini-bar-item">
      <div class="mini-bar-label"><span>${m.label}</span><strong>${fmt(m.val)}</strong></div>
      <div class="mini-bar-track">
        <div class="mini-bar-fill" style="width:${Math.min(100,Math.round(m.val/m.max*100))}%;background:${color};"></div>
      </div>
    </div>`).join('');
  return `
    <div class="division-card">
      <div class="division-card-header">
        <div class="division-name"><span class="division-dot" style="background:${color};"></span>${name}</div>
        <a href="#" class="division-detail-link" data-page="${key}">View Details →</a>
      </div>
      <div class="mini-bar-group">${bars}</div>
    </div>`;
}

// ============================
// PAGE: ANALYTICS
// ============================
pages.analytics = async function () {
  const d = await loadJSON('data/overview.json');
  return `
    <div class="page-header"><h1>Analytics</h1><p class="subtitle">Performance metrics across all divisions</p></div>
    <div class="kpi-grid mb-24">
      ${kpiCard('Cruise Placements','580',12,'YTD cruise division')}
      ${kpiCard('J1 Placements','320',18,'YTD cultural exchange')}
      ${kpiCard('Marine Placements','218',5,'YTD marine travel')}
      ${kpiCard('Visa Approved','166',2,'YTD visa services')}
    </div>
    <div class="chart-grid mb-24">
      <div class="card"><div class="card-title">Division Placement Comparison</div>
        <div class="chart-wrap"><canvas id="chartCompare"></canvas></div></div>
      <div class="card"><div class="card-title">Monthly Total Volume</div>
        <div class="chart-wrap"><canvas id="chartVolume"></canvas></div></div>
    </div>
    <div class="chart-grid">
      <div class="card"><div class="card-title">Revenue Distribution</div>
        <div class="chart-wrap"><canvas id="chartRevDist"></canvas></div></div>
      <div class="card"><div class="card-title">Growth Rate by Division (%)</div>
        <div class="chart-wrap"><canvas id="chartGrowth"></canvas></div></div>
    </div>`;
};

chartInits.analytics = async function () {
  const d = await loadJSON('data/overview.json');
  const divLabels = ['Cruise Line','J1 Exchange','Marine Travel','Visa Services'];
  createChart('chartCompare', {
    type: 'bar',
    data: { labels: divLabels, datasets: [{ label:'Placements', data:[580,320,218,166],
      backgroundColor: Object.values(DIVISION_COLORS), borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend:{ display:false } },
      scales: { y:{ beginAtZero:true, grid:{ color:gridColor() } }, x:{ grid:{ color:'transparent' } } } }
  });
  const total = d.monthlyTrend.labels.map((_,i) =>
    d.monthlyTrend.cruise[i]+d.monthlyTrend.j1[i]+d.monthlyTrend.marine[i]+d.monthlyTrend.visa[i]);
  createChart('chartVolume', {
    type: 'line',
    data: { labels: d.monthlyTrend.labels, datasets: [lineDataset('Total', total, DIVISION_COLORS.cruise)] },
    options: { responsive: true, plugins:{ legend:{ display:false } },
      scales: { y:{ beginAtZero:true, grid:{ color:gridColor() } }, x:{ grid:{ color:gridColor() } } } }
  });
  createChart('chartRevDist', {
    type: 'pie',
    data: { labels: divLabels,
      datasets: [{ data: Object.values(d.revenueShare),
        backgroundColor: Object.values(DIVISION_COLORS), borderWidth: 2, borderColor: darkBorder() }] },
    options: { responsive: true }
  });
  createChart('chartGrowth', {
    type: 'bar',
    data: { labels: divLabels,
      datasets: [{ label:'Growth %', data:[12,18,5,2],
        backgroundColor: Object.values(DIVISION_COLORS), borderRadius: 4 }] },
    options: { responsive: true, plugins:{ legend:{ display:false } },
      scales: { y:{ grid:{ color:gridColor() } }, x:{ grid:{ color:'transparent' } } } }
  });
};

// ============================
// PAGE: CRUISE LINE
// ============================
pages.cruise = async function () {
  const d = await loadJSON('data/cruise.json');
  const rows = d.clients.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${fmt(c.placements)}</td>
      <td>${fmt(c.openRoles)}</td>
      <td>${badge(c.status)}</td>
      <td class="td-muted">${fmtDate(c.lastActivity)}</td>
      <td><button class="btn-sm" onclick="showToast('Opening ${c.name}...','info')">View</button></td>
    </tr>`).join('');
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${DIVISION_COLORS.cruise}">
        <h1>Cruise Line Recruitment</h1><p class="subtitle">Placement tracking & client management</p>
      </div>
    </div>
    <div class="kpi-grid mb-24">
      ${simpleKpi('Total Placed (YTD)',  fmt(d.kpis.totalPlaced))}
      ${simpleKpi('Active Openings',     fmt(d.kpis.activeOpenings))}
      ${simpleKpi('Partner Cruise Lines',fmt(d.kpis.partnerLines))}
      ${simpleKpi('Avg. Days to Place',  d.kpis.avgDaysToPlace+' days')}
      ${simpleKpi('Renewal Rate',        d.kpis.renewalRate+'%')}
    </div>
    <div class="two-col mb-24">
      <div class="card"><div class="card-title">Placements by Position</div>
        <div class="chart-wrap"><canvas id="chartCruisePos"></canvas></div></div>
      <div class="card"><div class="card-title">Candidate Pipeline</div>
        <div class="chart-wrap"><canvas id="chartCruisePipeline"></canvas></div></div>
    </div>
    <div class="card mb-24"><div class="card-title">Monthly Placement Trend</div>
      <div class="chart-wrap"><canvas id="chartCruiseTrend"></canvas></div></div>
    <div class="section-title">Partner Cruise Lines</div>
    <div class="table-wrap">
      <table><thead><tr>
        <th>Client Name</th><th>Placements (YTD)</th><th>Open Roles</th>
        <th>Status</th><th>Last Activity</th><th>Actions</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div>`;
};

chartInits.cruise = async function () {
  const d = await loadJSON('data/cruise.json');
  createChart('chartCruisePos', {
    type:'bar', data:{ labels:d.positionPlacements.labels,
      datasets:[barDataset('Placements',d.positionPlacements.data,DIVISION_COLORS.cruise)] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartCruisePipeline', {
    type:'bar', data:{ labels:d.pipeline.labels,
      datasets:[barDataset('Candidates',d.pipeline.data,DIVISION_COLORS.cruise)] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartCruiseTrend', {
    type:'line', data:{ labels:d.monthlyTrend.labels,
      datasets:[lineDataset('Placements',d.monthlyTrend.data,DIVISION_COLORS.cruise)] },
    options:{ responsive:true, plugins:{legend:{display:false}},
      scales:{ y:{beginAtZero:true,grid:{color:gridColor()}}, x:{grid:{color:gridColor()}} } }
  });
};

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

pages.j1 = async function () {
  const COLOR   = DIVISION_COLORS.j1;
  const today   = new Date();

  // ── Try live Zoho data ──────────────────────────────────────
  let rows = null;
  if (state.zoho.connected) {
    const zohoRaw = await fetchZohoJ1Data();
    if (zohoRaw?.data?.columns?.length) {
      rows = zohoRowsToTable(zohoRaw.data);
      if (rows?.length) state.dataCache['j1-zoho-rows'] = rows;
      else rows = null;
    }
  }

  // ── LIVE DATA PATH ───────────────────────────────────────────
  if (rows) {
    const total       = rows.length;
    const maleCount   = rows.filter(r => r['Gender'] === 'Male').length;
    const femaleCount = rows.filter(r => r['Gender'] === 'Female').length;
    const uniqueHosts = new Set(rows.map(r => r['Hosting Company']).filter(Boolean)).size;
    const activeCount = rows.filter(r => {
      const s = parseZohoDate(r['Program Start Date']);
      const e = parseZohoDate(r['Program End Date']);
      return s && e && s <= today && e >= today;
    }).length;

    // Avg program duration in months
    const durations = rows.map(r => {
      const s = parseZohoDate(r['Program Start Date']);
      const e = parseZohoDate(r['Program End Date']);
      return (s && e) ? (e - s) / (1000 * 60 * 60 * 24 * 30.44) : null;
    }).filter(Boolean);
    const avgDurMonths = durations.length
      ? (durations.reduce((a,b) => a+b, 0) / durations.length).toFixed(1)
      : '—';

    // Executive summary text (for HTML + audio)
    const summaryText = generateJ1Summary(rows);

    // Display-name overrides for column headers (keeps actual Zoho field keys intact)
    const COL_DISPLAY = { 'Selected Job': 'Role' };

    // Table header: sortable columns + Action column
    const tblHead = J1_SHOW_COLS.map(c =>
      `<th data-col="${c}" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">
        ${COL_DISPLAY[c] || c}<span class="sort-icon" style="opacity:0.5;font-size:10px;"> ⇅</span></th>`
    ).join('') + '<th style="width:60px;">Action</th>';

    // Column filter row — multi-select dropdowns for enum cols, date btn for dates, text for names
    const MULTI_FILTER_COLS = new Set(['Hosting Company','Gender','Selected Job','Processing Sponsor','J1 Application Status']);
    const DATE_FILTER_COLS  = new Set(['Program Start Date','Program End Date']);
    const btnSty = `width:100%;font-size:11px;padding:2px 5px;height:24px;
      border:1px solid var(--border,#ddd);border-radius:3px;
      background:var(--surface,#fff);color:var(--text-muted,#888);
      cursor:pointer;display:flex;align-items:center;justify-content:space-between;
      gap:2px;white-space:nowrap;overflow:hidden;`;
    const colFilterRow = J1_SHOW_COLS.map(c => {
      if (MULTI_FILTER_COLS.has(c)) {
        return `<th style="padding:3px 4px;">
          <button class="j1-col-ms-btn" data-col="${escH(c)}" type="button" style="${btnSty}">
            <span class="j1-cm-lbl">All</span><span class="j1-cm-badge" style="font-size:10px;font-weight:700;"></span><span style="opacity:0.5;font-size:9px;">▾</span>
          </button></th>`;
      }
      if (DATE_FILTER_COLS.has(c)) {
        return `<th style="padding:3px 4px;">
          <button class="j1-col-date-btn" data-col="${escH(c)}" type="button" style="${btnSty}">
            <span class="j1-cm-lbl">📅 Any</span><span class="j1-cm-badge" style="font-size:10px;font-weight:700;color:${COLOR};"></span>
          </button></th>`;
      }
      return `<th style="padding:3px 4px;"><input type="text" class="j1-col-filter" data-col="${escH(c)}"
        placeholder="Search…" style="width:100%;font-size:11px;padding:2px 5px;height:24px;
        border:1px solid var(--border,#ddd);border-radius:3px;box-sizing:border-box;
        background:var(--surface,#fff);color:var(--text,#333);"></th>`;
    }).join('') + '<th></th>';

    return `
      <div class="page-header">
        <div class="division-header" style="border-left-color:${COLOR}">
          <h1>Placement Report</h1>
          <p class="subtitle">J1 Cultural Exchange · participant placement tracking
            <span style="font-size:11px;font-weight:600;background:rgba(45,122,85,0.15);color:#2D7A55;
              padding:2px 10px;border-radius:20px;margin-left:10px;vertical-align:middle;">
              ● Live · Zoho Analytics</span>
          </p>
        </div>
      </div>

      ${j1BuildFilterBar(rows)}

      <div class="kpi-grid mb-24" id="j1KpiGrid">
        <div class="kpi-card"><span class="kpi-label">Total Participants</span><span class="kpi-value" id="j1KpiTotal">${fmt(total)}</span></div>
        <div class="kpi-card"><span class="kpi-label">Active Now</span><span class="kpi-value" id="j1KpiActive">${fmt(activeCount)}</span></div>
        <div class="kpi-card j1-gpill" data-g="Male"
          style="cursor:pointer;border-top:3px solid #1B3A6B;transition:all 0.15s;user-select:none;"
          title="Click to filter table by Male">
          <span class="kpi-label">Male</span>
          <span class="kpi-value" id="j1KpiMale" style="color:#1B3A6B;">${fmt(maleCount)}</span>
          <span style="font-size:10px;color:var(--text-muted,#999);margin-top:2px;">click to filter ↓</span>
        </div>
        <div class="kpi-card j1-gpill" data-g="Female"
          style="cursor:pointer;border-top:3px solid #B01A18;transition:all 0.15s;user-select:none;"
          title="Click to filter table by Female">
          <span class="kpi-label">Female</span>
          <span class="kpi-value" id="j1KpiFemale" style="color:#B01A18;">${fmt(femaleCount)}</span>
          <span style="font-size:10px;color:var(--text-muted,#999);margin-top:2px;">click to filter ↓</span>
        </div>
        <div class="kpi-card"><span class="kpi-label">Hosting Companies</span><span class="kpi-value" id="j1KpiHosts">${fmt(uniqueHosts)}</span></div>
        <div class="kpi-card"><span class="kpi-label">Avg. Duration</span><span class="kpi-value" id="j1KpiDur">${avgDurMonths} mo</span></div>
      </div>

      <div class="two-col mb-24">
        <div class="card">
          <div class="card-title">By Hosting Company</div>
          <div class="card-subtitle">Top 10 · count shown on bar</div>
          <div class="chart-wrap"><canvas id="chartJ1Hosting"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">By Gender</div>
          <div class="chart-wrap"><canvas id="chartJ1Gender"></canvas></div>
        </div>
      </div>

      <div class="two-col mb-24">
        <div class="card">
          <div class="card-title">By Role</div>
          <div class="card-subtitle">Count shown on bar</div>
          <div class="chart-wrap"><canvas id="chartJ1Job"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">By Processing Sponsor</div>
          <div class="chart-wrap"><canvas id="chartJ1Sponsor"></canvas></div>
        </div>
      </div>

      <div class="card mb-24" style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div class="card-title" style="margin-bottom:8px;">Executive Summary</div>
          <p id="j1SummaryText" style="font-size:13px;line-height:1.65;color:var(--text-secondary,#555);margin:0;">
            ${summaryText}
          </p>
        </div>
        <button id="j1AudioBtn"
          style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:8px;
            border:1.5px solid ${COLOR};background:transparent;color:${COLOR};
            font-size:13px;font-weight:600;cursor:pointer;max-width:220px;justify-content:center;
            transition:all 0.15s;">
          <span id="j1AudioIcon">▶</span>
          <span id="j1AudioLabel">Listen to Summary</span>
        </button>
        <div id="j1AudioProgress" style="display:none;font-size:11px;color:#2D7A55;">
          🔊 Playing audio summary…
        </div>
      </div>

      <div class="section-title" style="margin-bottom:12px;">J1 Placement Report
        <span style="font-size:11px;font-weight:600;background:rgba(45,122,85,0.15);color:#2D7A55;
          padding:2px 8px;border-radius:20px;margin-left:8px;" id="j1TableCount">${total} records · Live</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr id="j1TableHead">${tblHead}</tr>
            <tr id="j1ColFilterRow">${colFilterRow}</tr>
          </thead>
          <tbody id="j1TableBody"></tbody>
        </table>
      </div>`;
  }

  // ── FALLBACK: mock data path ─────────────────────────────────
  state.dataCache['j1-zoho-rows'] = null;
  const d = await loadJSON('data/j1.json');
  const countryRows = d.countryOrigin.map((c,i) => `
    <tr>
      <td>${i+1}</td><td><strong>${c.country}</strong></td><td>${fmt(c.count)}</td>
      <td><div class="mini-bar-track" style="width:100px;">
        <div class="mini-bar-fill" style="width:${Math.round(c.count/d.countryOrigin[0].count*100)}%;background:${COLOR};"></div>
      </div></td>
    </tr>`).join('');
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${COLOR}">
        <h1>J1 Cultural Exchange</h1><p class="subtitle">Exchange visitor program management</p>
      </div>
    </div>
    <div class="kpi-grid mb-24">
      ${simpleKpi('Exchanges Placed',      fmt(d.kpis.exchangesPlaced))}
      ${simpleKpi('Active Programs',       fmt(d.kpis.activePrograms))}
      ${simpleKpi('Partner Universities',  fmt(d.kpis.partnerUniversities))}
      ${simpleKpi('Countries Represented', fmt(d.kpis.countriesRepresented))}
      ${simpleKpi('Completion Rate',       d.kpis.completionRate+'%')}
    </div>
    <div class="two-col mb-24">
      <div class="card"><div class="card-title">Placements by Program Type</div>
        <div class="chart-wrap"><canvas id="chartJ1Program"></canvas></div></div>
      <div class="card"><div class="card-title">Compliance Status</div>
        <div class="chart-wrap"><canvas id="chartJ1Compliance"></canvas></div></div>
    </div>
    <div class="two-col mb-24">
      <div class="card"><div class="card-title">Seasonal Placement Trend</div>
        <div class="card-subtitle">Peak season: June – August</div>
        <div class="chart-wrap"><canvas id="chartJ1Seasonal"></canvas></div></div>
      <div class="card"><div class="card-title">Top Countries of Origin</div>
        <div class="table-wrap" style="border:none;box-shadow:none;">
          <table><thead><tr><th>#</th><th>Country</th><th>Participants</th><th>Share</th></tr></thead>
          <tbody>${countryRows}</tbody></table>
        </div>
      </div>
    </div>`;
};

chartInits.j1 = async function () {
  const rows  = state.dataCache['j1-zoho-rows'];
  const COLOR = DIVISION_COLORS.j1;
  // datalabels plugin (loaded from CDN as global ChartDataLabels)
  const DL    = window.ChartDataLabels;
  const dlColor = () => state.theme === 'dark' ? '#cccccc' : '#333333';

  // ── LIVE DATA CHARTS ─────────────────────────────────────────
  if (rows && rows.length) {

    // 1 · By Hosting Company (horizontal bar, top 10, count on bar)
    const hostMap = {};
    rows.forEach(r => { const h = r['Hosting Company']||'Unknown'; hostMap[h]=(hostMap[h]||0)+1; });
    const hostTop = Object.entries(hostMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    createChart('chartJ1Hosting', {
      type: 'bar',
      plugins: DL ? [DL] : [],
      data: {
        labels: hostTop.map(e => e[0]),
        datasets: [barDataset('Participants', hostTop.map(e => e[1]), COLOR)]
      },
      options: {
        responsive: true, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: DL ? {
            anchor: 'end', align: 'right',
            formatter: v => v,
            font: { size: 11, weight: '600' },
            color: dlColor(),
            padding: { right: 4 }
          } : false
        },
        layout: { padding: { right: 28 } },
        scales: {
          x: { beginAtZero: true, grid: { color: gridColor() } },
          y: { grid: { color: 'transparent' }, ticks: { font: { size: 11 } } }
        }
      }
    });

    // 2 · By Gender (donut, counts + % in segments)
    const gMap = {};
    rows.forEach(r => { const g = r['Gender']||'Other'; gMap[g]=(gMap[g]||0)+1; });
    const GCOLS = { Male: COLOR, Female: '#B01A18', Other: '#888888' };
    const total = rows.length;
    createChart('chartJ1Gender', {
      type: 'doughnut',
      plugins: DL ? [DL] : [],
      data: {
        labels: Object.keys(gMap),
        datasets: [{
          data: Object.values(gMap),
          backgroundColor: Object.keys(gMap).map(g => GCOLS[g]||'#888'),
          borderWidth: 2, borderColor: darkBorder()
        }]
      },
      options: {
        responsive: true, cutout: '55%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/total*100)}%)` } },
          datalabels: DL ? {
            formatter: (v, ctx) => {
              const pct = Math.round(v / ctx.dataset.data.reduce((a,b)=>a+b,0) * 100);
              return `${v}\n${pct}%`;
            },
            color: '#fff', font: { size: 12, weight: 'bold' }, textAlign: 'center'
          } : false
        }
      }
    });

    // 3 · By Selected Job (vertical bar, count on top)
    const jobMap = {};
    rows.forEach(r => { const j = r['Selected Job']||'Unknown'; jobMap[j]=(jobMap[j]||0)+1; });
    const jobSorted = Object.entries(jobMap).sort((a,b)=>b[1]-a[1]);
    const JOB_COLORS = [COLOR,'#2D7A55','#B87A14','#B01A18','#888888'];
    createChart('chartJ1Job', {
      type: 'bar',
      plugins: DL ? [DL] : [],
      data: {
        labels: jobSorted.map(e => e[0]),
        datasets: [{
          data: jobSorted.map(e => e[1]),
          backgroundColor: jobSorted.map((_,i) => hexToRgba(JOB_COLORS[i%JOB_COLORS.length], 0.85)),
          borderColor:     jobSorted.map((_,i) => JOB_COLORS[i%JOB_COLORS.length]),
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          datalabels: DL ? {
            anchor: 'end', align: 'top',
            formatter: v => v,
            font: { size: 13, weight: '700' },
            color: dlColor()
          } : false
        },
        layout: { padding: { top: 20 } },
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor() } },
          x: { grid: { color: 'transparent' } }
        }
      }
    });

    // 4 · By Processing Sponsor (donut, counts + % in segments)
    const spMap = {};
    rows.forEach(r => { const s = r['Processing Sponsor']||'Unknown'; spMap[s]=(spMap[s]||0)+1; });
    const spSorted = Object.entries(spMap).sort((a,b)=>b[1]-a[1]);
    const SP_COLORS = [COLOR,'#B01A18','#2D7A55','#B87A14','#6B47DC','#888888'];
    createChart('chartJ1Sponsor', {
      type: 'doughnut',
      plugins: DL ? [DL] : [],
      data: {
        labels: spSorted.map(e => e[0]),
        datasets: [{
          data: spSorted.map(e => e[1]),
          backgroundColor: spSorted.map((_,i) => SP_COLORS[i%SP_COLORS.length]),
          borderWidth: 2, borderColor: darkBorder()
        }]
      },
      options: {
        responsive: true, cutout: '52%',
        plugins: {
          legend: { position: 'bottom' },
          datalabels: DL ? {
            formatter: (v, ctx) => {
              const pct = Math.round(v / ctx.dataset.data.reduce((a,b)=>a+b,0) * 100);
              return `${ctx.chart.data.labels[ctx.dataIndex]}\n${v} (${pct}%)`;
            },
            color: '#fff', font: { size: 11, weight: 'bold' }, textAlign: 'center'
          } : false
        }
      }
    });

    return; // live path done
  }

  // ── FALLBACK: mock data charts ───────────────────────────────
  const d = await loadJSON('data/j1.json');
  createChart('chartJ1Program', {
    type:'bar', data:{ labels:d.programPlacements.labels,
      datasets:[barDataset('Placed',d.programPlacements.data,DIVISION_COLORS.j1)] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartJ1Compliance', {
    type:'doughnut',
    data:{ labels:d.complianceStatus.labels,
      datasets:[{ data:d.complianceStatus.data,
        backgroundColor:[DIVISION_COLORS.j1,'#B87A14','#C0181E','#888888'],
        borderWidth:2, borderColor:darkBorder() }] },
    options:{ responsive:true, cutout:'55%' }
  });
  createChart('chartJ1Seasonal', {
    type:'bar', data:{ labels:d.seasonalTrend.labels,
      datasets:[barDataset('Placements',d.seasonalTrend.data,DIVISION_COLORS.j1)] },
    options:{ responsive:true, plugins:{legend:{display:false}},
      scales:{ y:{beginAtZero:true,grid:{color:gridColor()}}, x:{grid:{color:'transparent'}} } }
  });
};

pageEvents.j1 = function () {
  const allRows = state.dataCache['j1-zoho-rows'] || null;

  // ── Audio button ─────────────────────────────────────────────
  const btn      = document.getElementById('j1AudioBtn');
  const progress = document.getElementById('j1AudioProgress');
  const icon     = document.getElementById('j1AudioIcon');
  const label    = document.getElementById('j1AudioLabel');

  if (btn && window.speechSynthesis) {
    function stopAudio() {
      window.speechSynthesis.cancel();
      icon.textContent  = '▶';
      label.textContent = 'Listen to Summary';
      if (progress) progress.style.display = 'none';
    }
    btn.addEventListener('click', () => {
      if (window.speechSynthesis.speaking) { stopAudio(); return; }
      const text = document.getElementById('j1SummaryText')?.textContent?.trim();
      if (!text) return;
      const utterance   = new SpeechSynthesisUtterance(text);
      utterance.rate    = 0.92;
      utterance.pitch   = 1;
      utterance.lang    = 'en-US';
      utterance.onend   = stopAudio;
      utterance.onerror = stopAudio;
      window.speechSynthesis.speak(utterance);
      icon.textContent  = '⏹';
      label.textContent = 'Stop';
      if (progress) progress.style.display = 'block';
    });
  }

  if (!allRows) return;  // no live data — audio-only mode

  _j1GlobalRows = allRows;

  // ── TABLE filter — applies column multi/date/text filters on _j1GlobalRows ──
  function applyTableFilter() {
    const source = _j1GlobalRows || allRows;
    let filtered = source;

    // Multi-select column filters
    Object.entries(_j1ColMultiFilters).forEach(([col, vals]) => {
      if (vals && vals.length)
        filtered = filtered.filter(r => vals.includes(r[col] || ''));
    });
    // Date column filters
    Object.entries(_j1ColDateFilters).forEach(([col, df]) => {
      if (!df || !df.cond || !df.val) return;
      const ref  = new Date(df.val + 'T00:00:00');
      const ref2 = df.val2 ? new Date(df.val2 + 'T00:00:00') : null;
      filtered = filtered.filter(r => {
        const d = parseZohoDate(r[col]);
        if (!d) return false;
        if (df.cond === 'before')  return d < ref;
        if (df.cond === 'after')   return d > ref;
        if (df.cond === 'on')      return d.toDateString() === ref.toDateString();
        if (df.cond === 'between') return ref2 ? d >= ref && d <= ref2 : d >= ref;
        return true;
      });
    });
    // Text column filters (First Name, Last Name)
    Object.entries(_j1ColTextFilters).forEach(([col, val]) => {
      if (val) filtered = filtered.filter(r =>
        (r[col] || '').toLowerCase().includes(val.toLowerCase()));
    });

    const tc = document.getElementById('j1TableCount');
    if (tc) tc.textContent = `${filtered.length} records · Live`;
    j1RenderTable(filtered);
  }

  // ── GLOBAL filter — drives charts, then cascades to table filter ──
  function applyGlobalFilter() {
    const search  = (document.getElementById('j1FSearch')?.value  || '').toLowerCase();
    const host    =  document.getElementById('j1FHost')?.value    || '';
    const gender  =  document.getElementById('j1FGender')?.value  || '';
    const job     =  document.getElementById('j1FJob')?.value     || '';
    const sponsor =  document.getElementById('j1FSponsor')?.value || '';

    let filtered = allRows;
    if (search)  filtered = filtered.filter(r =>
      Object.values(r).some(v => (v || '').toLowerCase().includes(search)));
    if (host)    filtered = filtered.filter(r => r['Hosting Company']    === host);
    if (gender)  filtered = filtered.filter(r => r['Gender']             === gender);
    if (job)     filtered = filtered.filter(r => r['Selected Job']       === job);
    if (sponsor) filtered = filtered.filter(r => r['Processing Sponsor'] === sponsor);

    _j1GlobalRows = filtered;
    const cnt = document.getElementById('j1FCount');
    if (cnt) cnt.textContent = `${filtered.length} of ${allRows.length} participants`;
    j1UpdateCharts(filtered);
    applyTableFilter();
  }

  // Wire global filter controls
  ['j1FSearch','j1FHost','j1FGender','j1FJob','j1FSponsor'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  applyGlobalFilter);
    el.addEventListener('change', applyGlobalFilter);
  });

  // Global clear — resets everything
  document.getElementById('j1FClear')?.addEventListener('click', () => {
    ['j1FSearch','j1FHost','j1FGender','j1FJob','j1FSponsor'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    _j1GlobalRows      = allRows;
    _j1ColMultiFilters = {};
    _j1ColDateFilters  = {};
    _j1ColTextFilters  = {};
    _j1SortCol = null; _j1SortDir = 'asc';
    // Reset column button labels
    document.querySelectorAll('.j1-col-ms-btn, .j1-col-date-btn').forEach(btn => {
      const lbl = btn.querySelector('.j1-cm-lbl');
      if (lbl) lbl.textContent = btn.classList.contains('j1-col-date-btn') ? '📅 Any' : 'All';
      const badge = btn.querySelector('.j1-cm-badge');
      if (badge) badge.textContent = '';
    });
    document.querySelectorAll('.j1-col-filter').forEach(inp => { inp.value = ''; });
    // Reset gender widget
    document.querySelectorAll('.j1-gpill').forEach(p => p.classList.remove('j1-gpill--active'));
    document.querySelector('.j1-gpill[data-g=""]')?.classList.add('j1-gpill--active');
    applyGlobalFilter();
  });

  // ── Floating panel for column multi/date dropdowns ─────────────
  let _fpCol = null, _fpType = null;
  const fp = document.createElement('div');
  fp.id = 'j1ColFloatPanel';
  fp.style.cssText = `position:fixed;z-index:9999;display:none;min-width:200px;max-width:290px;
    background:var(--bg-card,#fff);border:1px solid var(--border,#ddd);border-radius:8px;
    box-shadow:0 8px 28px rgba(0,0,0,0.15);overflow:hidden;`;
  fp.innerHTML = `
    <div id="j1FPContent"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:7px 12px;border-top:1px solid var(--border,#eee);background:var(--bg-page,#f9f9f9);">
      <button id="j1FPClear" type="button"
        style="font-size:11px;color:#B01A18;background:none;border:none;
          cursor:pointer;font-weight:600;padding:0;">Clear</button>
      <span id="j1FPCount" style="font-size:11px;color:#888;"></span>
    </div>`;
  document.body.appendChild(fp);

  function closeFP() { fp.style.display='none'; _fpCol=null; _fpType=null; }

  function openFP(triggerBtn, col, type) {
    _fpCol=col; _fpType=type;
    const content = document.getElementById('j1FPContent');
    const fpc     = document.getElementById('j1FPCount');

    if (type === 'multi') {
      const opts   = [...new Set(allRows.map(r => r[col]).filter(Boolean))].sort();
      const active = _j1ColMultiFilters[col] || [];
      content.style.cssText = 'max-height:220px;overflow-y:auto;padding:6px 0;';
      content.innerHTML = opts.map(v => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 14px;
          cursor:pointer;font-size:12px;">
          <input type="checkbox" class="j1-fp-cb" value="${escH(v)}"
            ${active.includes(v) ? 'checked' : ''}
            style="width:14px;height:14px;accent-color:#1B3A6B;cursor:pointer;flex-shrink:0;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escH(v)}</span>
        </label>`).join('');
      fpc.textContent = active.length ? `${active.length} selected` : '';

      content.querySelectorAll('.j1-fp-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          const checked = [...content.querySelectorAll('.j1-fp-cb:checked')].map(c=>c.value);
          _j1ColMultiFilters[col] = checked;
          updateColBtn(col, type, checked.length);
          fpc.textContent = checked.length ? `${checked.length} selected` : '';
          applyTableFilter();
        });
      });
    } else { // date
      const df = _j1ColDateFilters[col] || {};
      content.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:8px;';
      content.innerHTML = `
        <select id="j1FPCond" style="font-size:12px;padding:4px 8px;height:30px;width:100%;
          border:1px solid var(--border,#ddd);border-radius:6px;box-sizing:border-box;
          background:var(--surface,#fff);">
          <option value="">Any date</option>
          <option value="before"  ${df.cond==='before' ?'selected':''}>Before</option>
          <option value="after"   ${df.cond==='after'  ?'selected':''}>After</option>
          <option value="on"      ${df.cond==='on'     ?'selected':''}>On</option>
          <option value="between" ${df.cond==='between'?'selected':''}>Between</option>
        </select>
        <input type="date" id="j1FPVal" value="${df.val||''}"
          style="font-size:12px;padding:4px 8px;height:30px;width:100%;box-sizing:border-box;
            border:1px solid var(--border,#ddd);border-radius:6px;background:var(--surface,#fff);">
        <input type="date" id="j1FPVal2" value="${df.val2||''}"
          style="font-size:12px;padding:4px 8px;height:30px;width:100%;box-sizing:border-box;
            border:1px solid var(--border,#ddd);border-radius:6px;background:var(--surface,#fff);
            display:${df.cond==='between'?'':'none'};">`;
      fpc.textContent = df.cond || '';

      function saveDate() {
        const c=document.getElementById('j1FPCond').value;
        const v=document.getElementById('j1FPVal').value;
        const v2=document.getElementById('j1FPVal2').value;
        if (c && v) { _j1ColDateFilters[col]={cond:c,val:v,val2:v2}; fpc.textContent=c; }
        else { delete _j1ColDateFilters[col]; fpc.textContent=''; }
        updateColBtn(col, type, _j1ColDateFilters[col] ? 1 : 0);
        applyTableFilter();
      }
      document.getElementById('j1FPCond').addEventListener('change', () => {
        const isBetween = document.getElementById('j1FPCond').value === 'between';
        document.getElementById('j1FPVal2').style.display = isBetween ? '' : 'none';
        saveDate();
      });
      document.getElementById('j1FPVal').addEventListener('change',  saveDate);
      document.getElementById('j1FPVal2').addEventListener('change', saveDate);
    }

    // Position below trigger button
    const rect = triggerBtn.getBoundingClientRect();
    fp.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
    fp.style.top  = `${rect.bottom + 4}px`;
    fp.style.display = 'block';
  }

  function updateColBtn(col, type, count) {
    const btn = document.querySelector(
      `#j1ColFilterRow .j1-col-ms-btn[data-col="${col}"], #j1ColFilterRow .j1-col-date-btn[data-col="${col}"]`);
    if (!btn) return;
    const lbl   = btn.querySelector('.j1-cm-lbl');
    const badge = btn.querySelector('.j1-cm-badge');
    const C = DIVISION_COLORS.j1;
    if (lbl)   lbl.textContent   = count ? (type==='date' ? '📅' : '') : (type==='date' ? '📅 Any' : 'All');
    if (badge) { badge.textContent = count ? ` (${count})` : ''; badge.style.color = count ? C : ''; }
  }

  // Wire column filter row clicks
  document.getElementById('j1ColFilterRow')?.addEventListener('click', e => {
    const msBtn   = e.target.closest('.j1-col-ms-btn');
    const dateBtn = e.target.closest('.j1-col-date-btn');
    const btn     = msBtn || dateBtn;
    if (!btn) return;
    e.stopPropagation();
    const col  = btn.dataset.col;
    const type = msBtn ? 'multi' : 'date';
    if (_fpCol === col && fp.style.display !== 'none') { closeFP(); return; }
    openFP(btn, col, type);
  });

  // Text filter (First Name / Last Name)
  document.getElementById('j1ColFilterRow')?.addEventListener('input', e => {
    const inp = e.target.closest('.j1-col-filter');
    if (!inp) return;
    _j1ColTextFilters[inp.dataset.col] = inp.value;
    applyTableFilter();
  });

  // Float panel clear
  document.getElementById('j1FPClear')?.addEventListener('click', () => {
    if (!_fpCol) return;
    if (_fpType==='multi') {
      _j1ColMultiFilters[_fpCol] = [];
      document.querySelectorAll('#j1FPContent .j1-fp-cb').forEach(cb=>cb.checked=false);
      document.getElementById('j1FPCount').textContent = '';
    } else {
      delete _j1ColDateFilters[_fpCol];
      const cond=document.getElementById('j1FPCond'); if(cond) cond.value='';
      const val=document.getElementById('j1FPVal');   if(val)  val.value='';
      const val2=document.getElementById('j1FPVal2'); if(val2) {val2.value='';val2.style.display='none';}
      document.getElementById('j1FPCount').textContent = '';
    }
    updateColBtn(_fpCol, _fpType, 0);
    applyTableFilter();
  });

  // Close float panel on outside click
  document.addEventListener('click', e => {
    if (!fp.contains(e.target) && !e.target.closest('.j1-col-ms-btn,.j1-col-date-btn')) closeFP();
  });

  // ── Gender KPI cards (Male / Female) — click to filter table ──
  document.getElementById('j1KpiGrid')?.addEventListener('click', e => {
    const pill = e.target.closest('.j1-gpill[data-g]');
    if (!pill) return;
    const g        = pill.dataset.g;
    const isActive = pill.classList.contains('j1-gpill--active');

    // Deactivate all gender cards
    document.querySelectorAll('#j1KpiGrid .j1-gpill').forEach(p => {
      p.classList.remove('j1-gpill--active');
      p.style.removeProperty('background');
      p.style.removeProperty('color');
    });

    if (isActive) {
      // Toggle off — show all
      _j1ColMultiFilters['Gender'] = [];
    } else {
      // Activate this card
      pill.classList.add('j1-gpill--active');
      const activeColor = g === 'Male' ? '#1B3A6B' : '#B01A18';
      pill.style.background = activeColor;
      pill.style.color      = '#fff';
      _j1ColMultiFilters['Gender'] = [g];
    }
    updateColBtn('Gender', 'multi', (_j1ColMultiFilters['Gender']||[]).length);
    applyTableFilter();
  });

  // ── Sort headers ──────────────────────────────────────────────
  document.getElementById('j1TableHead')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-col]');
    if (!th) return;
    const col = th.dataset.col;
    _j1SortDir = _j1SortCol===col && _j1SortDir==='asc' ? 'desc' : 'asc';
    _j1SortCol = col;
    applyTableFilter();
  });

  // ── Initial table render ──────────────────────────────────────
  j1RenderTable(allRows);
};

// ============================
// PAGE: J1 PARTICIPANTS
// ============================
pages.j1participants = async function () {
  const COLOR = DIVISION_COLORS.j1;

  // Reuse cached data or fetch fresh
  let rows = state.dataCache['j1-zoho-rows'];
  if (!rows && state.zoho.connected) {
    const zohoRaw = await fetchZohoJ1Data();
    if (zohoRaw?.data?.columns?.length) {
      rows = zohoRowsToTable(zohoRaw.data);
      if (rows?.length) state.dataCache['j1-zoho-rows'] = rows;
      else rows = null;
    }
  }

  if (!rows || !rows.length) {
    return `
      <div class="page-header">
        <div class="division-header" style="border-left-color:${COLOR}">
          <h1>J1 Participants</h1>
          <p class="subtitle">Participant profile directory</p>
        </div>
      </div>
      <div class="error-banner">No live data available.
        <a href="/auth/zoho" style="color:${COLOR};font-weight:600;margin-left:8px;">Connect Server →</a>
        or visit the <a href="#" data-page="j1" style="color:${COLOR};font-weight:600;">J1 Cultural Exchange</a> page first.
      </div>`;
  }

  const today = new Date();

  function buildCard(row, origIdx) {
    const first  = (row['First Name'] || '').trim();
    const last   = (row['Last Name']  || '').trim();
    const name   = `${first} ${last}`.trim();
    const host   = row['Hosting Company']     || '—';
    const job    = row['Selected Job']        || '—';
    const status = row['J1 Application Status'] || '';
    const startD = parseZohoDate(row['Program Start Date']);
    const endD   = parseZohoDate(row['Program End Date']);
    const active = startD && endD && startD <= today && endD >= today;
    const ini    = initials(name) || '?';
    return `
      <div class="j1-participant-card" data-idx="${origIdx}"
        style="cursor:pointer;background:var(--surface,#fff);
          border:1.5px solid var(--border,#eee);border-radius:12px;
          padding:18px 16px;display:flex;flex-direction:column;gap:10px;
          transition:box-shadow 0.18s,transform 0.18s;
          box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:46px;height:46px;border-radius:50%;background:${COLOR};
            flex-shrink:0;display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:16px;font-weight:700;">${ini}</div>
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:14px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
            <div style="font-size:11px;color:var(--text-secondary,#888);
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${host}</div>
          </div>
          ${active
            ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;
                background:rgba(45,122,85,0.15);color:#2D7A55;
                padding:2px 8px;border-radius:12px;">Active</span>`
            : ''}
        </div>
        <div style="font-size:12px;color:var(--text-secondary,#666);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${job}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="font-size:11px;color:#999;white-space:nowrap;">
            ${startD ? fmtMonthYear(startD) : '—'} → ${endD ? fmtMonthYear(endD) : '—'}
          </div>
          ${status
            ? `<span style="flex-shrink:0;font-size:10px;font-weight:600;
                background:${COLOR}18;color:${COLOR};
                padding:2px 7px;border-radius:10px;white-space:nowrap;">${status}</span>`
            : ''}
        </div>
      </div>`;
  }

  const cards = rows.map((row, i) => buildCard(row, i)).join('');

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${COLOR}">
        <h1>J1 Participants</h1>
        <p class="subtitle">Participant profile directory — ${rows.length} enrolled
          <span style="font-size:11px;font-weight:600;background:rgba(45,122,85,0.15);color:#2D7A55;
            padding:2px 10px;border-radius:20px;margin-left:10px;vertical-align:middle;">
            ● Live · Zoho Analytics</span>
        </p>
      </div>
    </div>

    ${j1BuildFilterBar(rows)}

    <div id="j1ParticipantGrid"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;">
      ${cards}
    </div>`;
};

pageEvents.j1participants = function () {
  const allRows = state.dataCache['j1-zoho-rows'] || [];
  const COLOR   = DIVISION_COLORS.j1;
  const grid    = document.getElementById('j1ParticipantGrid');
  if (!grid) return;

  // Card click → profile side panel
  grid.addEventListener('click', e => {
    const card = e.target.closest('.j1-participant-card');
    if (!card) return;
    const idx = +card.dataset.idx;
    if (allRows[idx]) openJ1ParticipantPanel(allRows[idx]);
  });

  // Hover effects via event delegation
  grid.addEventListener('mouseover', e => {
    const card = e.target.closest('.j1-participant-card');
    if (card) {
      card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.13)';
      card.style.transform = 'translateY(-2px)';
    }
  });
  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.j1-participant-card');
    if (card) {
      card.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
      card.style.transform = '';
    }
  });

  // Also bind "error page" nav links
  document.querySelectorAll('a[data-page]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showPage(a.dataset.page); });
  });

  // ── Participant-page filter ───────────────────────────────────
  const today = new Date();

  function buildCard(row, origIdx) {
    const first  = (row['First Name'] || '').trim();
    const last   = (row['Last Name']  || '').trim();
    const name   = `${first} ${last}`.trim();
    const host   = row['Hosting Company']       || '—';
    const job    = row['Selected Job']          || '—';
    const status = row['J1 Application Status'] || '';
    const startD = parseZohoDate(row['Program Start Date']);
    const endD   = parseZohoDate(row['Program End Date']);
    const active = startD && endD && startD <= today && endD >= today;
    const ini    = initials(name) || '?';
    return `
      <div class="j1-participant-card" data-idx="${origIdx}"
        style="cursor:pointer;background:var(--surface,#fff);
          border:1.5px solid var(--border,#eee);border-radius:12px;
          padding:18px 16px;display:flex;flex-direction:column;gap:10px;
          transition:box-shadow 0.18s,transform 0.18s;
          box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:46px;height:46px;border-radius:50%;background:${COLOR};
            flex-shrink:0;display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:16px;font-weight:700;">${ini}</div>
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:14px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
            <div style="font-size:11px;color:var(--text-secondary,#888);
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${host}</div>
          </div>
          ${active
            ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;
                background:rgba(45,122,85,0.15);color:#2D7A55;
                padding:2px 8px;border-radius:12px;">Active</span>`
            : ''}
        </div>
        <div style="font-size:12px;color:var(--text-secondary,#666);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${job}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="font-size:11px;color:#999;white-space:nowrap;">
            ${startD ? fmtMonthYear(startD) : '—'} → ${endD ? fmtMonthYear(endD) : '—'}
          </div>
          ${status
            ? `<span style="flex-shrink:0;font-size:10px;font-weight:600;
                background:${COLOR}18;color:${COLOR};
                padding:2px 7px;border-radius:10px;white-space:nowrap;">${status}</span>`
            : ''}
        </div>
      </div>`;
  }

  function applyParticipantFilter() {
    const search  = (document.getElementById('j1FSearch')?.value  || '').toLowerCase();
    const host    =  document.getElementById('j1FHost')?.value    || '';
    const gender  =  document.getElementById('j1FGender')?.value  || '';
    const job     =  document.getElementById('j1FJob')?.value     || '';
    const sponsor =  document.getElementById('j1FSponsor')?.value || '';

    let filtered = allRows;
    if (search)  filtered = filtered.filter(r =>
      Object.values(r).some(v => (v || '').toLowerCase().includes(search)));
    if (host)    filtered = filtered.filter(r => r['Hosting Company']    === host);
    if (gender)  filtered = filtered.filter(r => r['Gender']             === gender);
    if (job)     filtered = filtered.filter(r => r['Selected Job']       === job);
    if (sponsor) filtered = filtered.filter(r => r['Processing Sponsor'] === sponsor);

    const cnt = document.getElementById('j1FCount');
    if (cnt) cnt.textContent = `${filtered.length} of ${allRows.length} participants`;

    grid.innerHTML = filtered
      .map(row => buildCard(row, allRows.indexOf(row)))
      .join('');
  }

  ['j1FSearch','j1FHost','j1FGender','j1FJob','j1FSponsor'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  applyParticipantFilter);
    el.addEventListener('change', applyParticipantFilter);
  });

  document.getElementById('j1FClear')?.addEventListener('click', () => {
    ['j1FSearch','j1FHost','j1FGender','j1FJob','j1FSponsor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    applyParticipantFilter();
  });
};

// ============================
// PAGE: MARINE TRAVEL
// ============================
pages.marine = async function () {
  const d = await loadJSON('data/marine.json');
  const routeRows = d.routes.map(r => `
    <tr>
      <td><strong>${r.route}</strong></td><td>${r.vessel}</td>
      <td>${fmt(r.crewPlaced)}</td><td>${r.departurePort}</td>
      <td class="td-muted">${fmtDate(r.nextRotation)}</td>
    </tr>`).join('');
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${DIVISION_COLORS.marine}">
        <h1>Marine Travel</h1><p class="subtitle">Seafarer placement & vessel management</p>
      </div>
    </div>
    <div class="kpi-grid mb-24">
      ${simpleKpi('Total Placed',    fmt(d.kpis.totalPlaced))}
      ${simpleKpi('Active Routes',   fmt(d.kpis.activeRoutes))}
      ${simpleKpi('Partner Vessels', fmt(d.kpis.partnerVessels))}
      ${simpleKpi('Countries Covered',fmt(d.kpis.countriesCovered))}
      ${simpleKpi('Avg. Contract',   d.kpis.avgContractMonths+' months')}
    </div>
    <div class="two-col mb-24">
      <div class="card"><div class="card-title">Placements by Role</div>
        <div class="chart-wrap"><canvas id="chartMarineRole"></canvas></div></div>
      <div class="card"><div class="card-title">Crew Nationality Distribution</div>
        <div class="chart-wrap"><canvas id="chartMarineNat"></canvas></div></div>
    </div>
    <div class="card mb-24"><div class="card-title">Monthly Placement Trend</div>
      <div class="chart-wrap"><canvas id="chartMarineTrend"></canvas></div></div>
    <div class="section-title">Active Routes</div>
    <div class="table-wrap">
      <table><thead><tr>
        <th>Route</th><th>Vessel</th><th>Crew Placed</th><th>Departure Port</th><th>Next Rotation</th>
      </tr></thead><tbody>${routeRows}</tbody></table>
    </div>`;
};

chartInits.marine = async function () {
  const d = await loadJSON('data/marine.json');
  createChart('chartMarineRole', {
    type:'bar', data:{ labels:d.rolePlacements.labels,
      datasets:[barDataset('Placements',d.rolePlacements.data,DIVISION_COLORS.marine)] },
    options:{ responsive:true, plugins:{legend:{display:false}},
      scales:{ y:{beginAtZero:true,grid:{color:gridColor()}}, x:{grid:{color:'transparent'}} } }
  });
  createChart('chartMarineNat', {
    type:'bar', data:{ labels:d.nationalities.labels,
      datasets:[barDataset('Crew',d.nationalities.data,DIVISION_COLORS.marine)] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartMarineTrend', {
    type:'line', data:{ labels:d.monthlyTrend.labels,
      datasets:[lineDataset('Placements',d.monthlyTrend.data,DIVISION_COLORS.marine)] },
    options:{ responsive:true, plugins:{legend:{display:false}},
      scales:{ y:{beginAtZero:true,grid:{color:gridColor()}}, x:{grid:{color:gridColor()}} } }
  });
};

// ============================
// PAGE: VISA SERVICES
// ============================
pages.visa = async function () {
  const d = await loadJSON('data/visa.json');
  const appRows = d.applications.map(a => `
    <tr>
      <td><strong>${a.applicant}</strong></td><td>${a.type}</td>
      <td>${divisionBadge(a.division.toLowerCase())}</td>
      <td class="td-muted">${fmtDate(a.submitted)}</td>
      <td>${badge(a.status)}</td>
      <td class="td-muted">${fmtDate(a.due)}</td>
      <td>${a.officer}</td>
    </tr>`).join('');
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${DIVISION_COLORS.visa}">
        <h1>Visa Services</h1><p class="subtitle">Application tracking & processing management</p>
      </div>
    </div>
    <div class="kpi-grid mb-24">
      ${simpleKpi('Total Applications', fmt(d.kpis.totalApplications))}
      ${simpleKpi('Approved',           fmt(d.kpis.approved))}
      ${simpleKpi('Processing',         fmt(d.kpis.processing))}
      ${simpleKpi('Avg. Processing',    d.kpis.avgProcessingDays+' days')}
      ${simpleKpi('Success Rate',       d.kpis.successRate+'%')}
    </div>
    <div class="two-col mb-24">
      <div class="card"><div class="card-title">Applications by Visa Type</div>
        <div class="chart-wrap"><canvas id="chartVisaType"></canvas></div></div>
      <div class="card"><div class="card-title">Processing Time by Type (avg days)</div>
        <div class="chart-wrap"><canvas id="chartVisaTime"></canvas></div></div>
    </div>
    <div class="card mb-24"><div class="card-title">Approval Rate Trend (%)</div>
      <div class="chart-wrap"><canvas id="chartVisaTrend"></canvas></div></div>
    <div class="section-title">Recent Applications</div>
    <div class="table-wrap">
      <table><thead><tr>
        <th>Applicant</th><th>Visa Type</th><th>Division</th>
        <th>Submitted</th><th>Status</th><th>Due Date</th><th>Officer</th>
      </tr></thead><tbody>${appRows}</tbody></table>
    </div>`;
};

chartInits.visa = async function () {
  const d = await loadJSON('data/visa.json');
  createChart('chartVisaType', {
    type:'bar', data:{ labels:d.byType.labels,
      datasets:[barDataset('Applications',d.byType.data,DIVISION_COLORS.visa)] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartVisaTime', {
    type:'bar', data:{ labels:d.processingTime.labels,
      datasets:[barDataset('Days',d.processingTime.data,'#B87A14')] },
    options:{ responsive:true, indexAxis:'y', plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,grid:{color:gridColor()}}, y:{grid:{color:'transparent'}} } }
  });
  createChart('chartVisaTrend', {
    type:'line', data:{ labels:d.approvalTrend.labels,
      datasets:[lineDataset('Approval Rate %',d.approvalTrend.data,DIVISION_COLORS.visa)] },
    options:{ responsive:true, plugins:{legend:{display:false}},
      scales:{ y:{min:80,max:100,grid:{color:gridColor()}}, x:{grid:{color:gridColor()}} } }
  });
};

// ============================
// PAGE: CANDIDATES
// ============================
pages.candidates = async function () {
  const all = await loadJSON('data/candidates.json');
  state.candidates.all      = all;
  state.candidates.filtered = [...all];
  state.candidates.currentPage = 1;

  const divOpts = ['','cruise','j1','marine'].map(v =>
    `<option value="${v}" ${state.candidates.division===v?'selected':''}>${v ? DIVISION_NAMES[v] : 'All Divisions'}</option>`).join('');
  const statuses = ['','Applied','Screening','Interviewing','Offered','Placed','Rejected','On Hold','Processing'];
  const statOpts = statuses.map(v =>
    `<option value="${v}" ${state.candidates.status===v?'selected':''}>${v||'All Statuses'}</option>`).join('');
  const nats = ['','Philippines','Indonesia','Colombia','Mexico','Ukraine','Brazil','Romania','Thailand'];
  const natOpts = nats.map(v =>
    `<option value="${v}" ${state.candidates.nationality===v?'selected':''}>${v||'All Nationalities'}</option>`).join('');

  return `
    <div class="page-header"><h1>Candidate Management</h1>
      <p class="subtitle">Search, filter, and track all candidates across divisions</p></div>
    <div class="filter-bar">
      <input type="text" class="filter-search" id="candidateSearch" placeholder="Search name, position, nationality…" value="${state.candidates.search}">
      <select class="filter-select" id="candidateDivision">${divOpts}</select>
      <select class="filter-select" id="candidateStatus">${statOpts}</select>
      <select class="filter-select" id="candidateNationality">${natOpts}</select>
    </div>
    <div id="candidateTableWrap">${renderCandidateTable()}</div>`;
};

function renderCandidateTable() {
  let data = state.candidates.filtered;
  if (state.candidates.sortCol) {
    const col = state.candidates.sortCol;
    const dir = state.candidates.sortDir === 'asc' ? 1 : -1;
    data = [...data].sort((a,b) => {
      const av = (a[col]||'').toLowerCase();
      const bv = (b[col]||'').toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }
  const total = data.length;
  const perPage = state.candidates.perPage;
  const cur   = state.candidates.currentPage;
  const pages_ = Math.max(1, Math.ceil(total / perPage));
  const start = (cur - 1) * perPage;
  const slice = data.slice(start, start + perPage);

  if (total === 0) {
    return `<div class="table-wrap"><div class="empty-state">
      <div class="empty-state-icon">—</div>
      <h3>No results found</h3><p>Try adjusting your search or filters.</p>
    </div></div>`;
  }

  const cols = [
    {key:'name',label:'Name'},{key:'division',label:'Division'},{key:'position',label:'Position'},
    {key:'nationality',label:'Nationality'},{key:'status',label:'Status'},
    {key:'applied',label:'Applied'},{key:'lastActivity',label:'Last Activity'}
  ];
  const headers = cols.map(c => {
    const cls = state.candidates.sortCol===c.key ? `sort-${state.candidates.sortDir}` : '';
    return `<th class="${cls}" data-sort="${c.key}">${c.label}</th>`;
  }).join('') + '<th>Actions</th>';

  const rows = slice.map(c => `
    <tr class="candidate-row" data-id="${c.id}" style="cursor:pointer;">
      <td><strong>${c.name}</strong></td>
      <td>${divisionBadge(c.division)}</td>
      <td>${c.position}</td>
      <td>${c.nationality}</td>
      <td>${badge(c.status)}</td>
      <td class="td-muted">${fmtDate(c.applied)}</td>
      <td class="td-muted">${fmtDate(c.lastActivity)}</td>
      <td><div class="table-actions">
        <button class="btn-sm candidate-view" data-id="${c.id}">View</button>
        <button class="btn-sm">Edit</button>
      </div></td>
    </tr>`).join('');

  let pageNums = '';
  const rs = Math.max(1, cur-2), re = Math.min(pages_, rs+4);
  for (let i = rs; i <= re; i++) {
    pageNums += `<button class="page-btn ${i===cur?'active':''}" data-page="${i}">${i}</button>`;
  }

  return `
    <div class="table-wrap">
      <table id="candidatesTable">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="pagination">
        <span class="pagination-info">Showing ${start+1}–${Math.min(start+perPage,total)} of ${total} candidates</span>
        <div class="pagination-controls">
          <button class="page-btn" id="pagePrev" ${cur===1?'disabled':''}>‹ Prev</button>
          ${pageNums}
          <button class="page-btn" id="pageNext" ${cur===pages_?'disabled':''}>Next ›</button>
        </div>
      </div>
    </div>`;
}

function filterCandidates() {
  const {search,division,status,nationality} = state.candidates;
  const q = search.toLowerCase();
  state.candidates.filtered = state.candidates.all.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.position.toLowerCase().includes(q) && !c.nationality.toLowerCase().includes(q)) return false;
    if (division && c.division !== division) return false;
    if (status && c.status !== status) return false;
    if (nationality && c.nationality !== nationality) return false;
    return true;
  });
  state.candidates.currentPage = 1;
}

function refreshCandidateTable() {
  const wrap = document.getElementById('candidateTableWrap');
  if (wrap) { wrap.innerHTML = renderCandidateTable(); attachCandidateTableEvents(); }
}

function attachCandidateTableEvents() {
  document.querySelectorAll('#candidatesTable thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      state.candidates.sortDir = (state.candidates.sortCol === col && state.candidates.sortDir === 'asc') ? 'desc' : 'asc';
      state.candidates.sortCol = col;
      refreshCandidateTable();
    });
  });
  document.querySelectorAll('.candidate-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.table-actions')) return;
      openCandidatePanel(parseInt(row.dataset.id));
    });
  });
  document.querySelectorAll('.candidate-view').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openCandidatePanel(parseInt(btn.dataset.id)); });
  });
  document.getElementById('pagePrev')?.addEventListener('click', () => {
    if (state.candidates.currentPage > 1) { state.candidates.currentPage--; refreshCandidateTable(); }
  });
  document.getElementById('pageNext')?.addEventListener('click', () => {
    const pages_ = Math.ceil(state.candidates.filtered.length / state.candidates.perPage);
    if (state.candidates.currentPage < pages_) { state.candidates.currentPage++; refreshCandidateTable(); }
  });
  document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.candidates.currentPage = parseInt(btn.dataset.page); refreshCandidateTable(); });
  });
}

pageEvents.candidates = function () {
  document.getElementById('candidateSearch')?.addEventListener('input', e => {
    state.candidates.search = e.target.value; filterCandidates(); refreshCandidateTable();
  });
  document.getElementById('candidateDivision')?.addEventListener('change', e => {
    state.candidates.division = e.target.value; filterCandidates(); refreshCandidateTable();
  });
  document.getElementById('candidateStatus')?.addEventListener('change', e => {
    state.candidates.status = e.target.value; filterCandidates(); refreshCandidateTable();
  });
  document.getElementById('candidateNationality')?.addEventListener('change', e => {
    state.candidates.nationality = e.target.value; filterCandidates(); refreshCandidateTable();
  });
  attachCandidateTableEvents();
};

function openCandidatePanel(id) {
  const c = state.candidates.all.find(x => x.id === id);
  if (!c) return;
  const color = DIVISION_COLORS[c.division] || '#B01A18';
  document.getElementById('panelTitle').textContent = 'Candidate Profile';
  document.getElementById('panelBody').innerHTML = `
    <div class="panel-profile">
      <div class="panel-avatar" style="background:${color};">${initials(c.name)}</div>
      <div class="panel-profile-info">
        <h4>${c.name}</h4><p>${c.position}</p>
        <div style="margin-top:4px;">${divisionBadge(c.division)} ${badge(c.status)}</div>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Contact</div>
      <div class="panel-info-row"><span>Email</span><span>${c.email}</span></div>
      <div class="panel-info-row"><span>Phone</span><span>${c.phone}</span></div>
      <div class="panel-info-row"><span>Nationality</span><span>${c.nationality}</span></div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Application</div>
      <div class="panel-info-row"><span>Status</span><span>${badge(c.status)}</span></div>
      <div class="panel-info-row"><span>Applied</span><span>${fmtDate(c.applied)}</span></div>
      <div class="panel-info-row"><span>Last Activity</span><span>${fmtDate(c.lastActivity)}</span></div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Timeline</div>
      <ul class="timeline">
        <li class="timeline-item"><strong>Application Received</strong><span>${fmtDate(c.applied)}</span></li>
        <li class="timeline-item"><strong>Status: ${c.status}</strong><span>${fmtDate(c.lastActivity)}</span></li>
      </ul>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Notes</div>
      <p style="font-size:13px;line-height:1.6;">${c.notes||'—'}</p>
    </div>`;
  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('active');
}

// ============================
// PAGE: CLIENTS
// ============================
pages.clients = async function () {
  // Seed from CLIENTS_DATA on first visit; preserve edits on re-render
  if (!state.clients) state.clients = CLIENTS_DATA.map(c => ({ ...c }));

  const cats    = ['All','Cruise Line','J1 Program','Other'];
  const active  = state.clientFilter || 'All';
  const display = active === 'All'
    ? state.clients
    : state.clients.filter(c => c.category === active);

  function clientCard(c) {
    const color = catColor(c.category);
    const cls   = catCls(c.category);
    const ini   = (c.name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    const snippet = c.about
      ? (c.about.length > 110 ? c.about.slice(0, 107) + '…' : c.about)
      : '';
    return `
      <div class="client-card" data-id="${c.id}" style="cursor:default;">
        <div class="client-card-header">
          <div class="client-avatar" style="background:${color};border-radius:10px;">${ini}</div>
          <div class="client-card-info" style="min-width:0;">
            <h4 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escH(c.name)}</h4>
            <span class="cat-badge ${cls}">${escH(c.category)}</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.55;min-height:34px;margin:0;">
          ${snippet ? escH(snippet) : '<em style="opacity:0.5;">No description</em>'}
        </p>
        <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;margin-bottom:4px;">
          ${c.phone   ? `<span>📞 <span style="color:var(--text-primary);">${escH(c.phone)}</span></span>` : ''}
          ${c.email   ? `<span>✉️ <a href="mailto:${escH(c.email)}"
              style="color:${color};" onclick="event.stopPropagation()">${escH(c.email)}</a></span>` : ''}
          ${c.website ? `<span>🌐 <a href="${escH(c.website)}" target="_blank" rel="noopener"
              style="color:${color};" onclick="event.stopPropagation()">
              ${escH(c.website.replace(/^https?:\/\//,''))}</a></span>` : ''}
          ${!c.phone && !c.email && !c.website
            ? `<span style="opacity:0.45;font-style:italic;font-size:11px;">No contact info</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;border-top:1px solid var(--border,#eee);padding-top:10px;margin-top:auto;">
          <button class="client-view-btn" data-id="${c.id}"
            style="flex:1;padding:5px 8px;border-radius:5px;
              border:1px solid ${color}40;background:${color}0d;
              font-size:11px;font-weight:600;cursor:pointer;color:${color};">
            👁 View
          </button>
          <button class="client-edit-btn" data-id="${c.id}"
            style="flex:1;padding:5px 8px;border-radius:5px;
              border:1px solid var(--border,#ddd);background:transparent;
              font-size:11px;font-weight:600;cursor:pointer;color:var(--text-primary);">
            ✏️ Edit
          </button>
          <button class="client-del-btn" data-id="${c.id}"
            style="padding:5px 10px;border-radius:5px;
              border:1px solid rgba(176,26,24,0.2);background:rgba(176,26,24,0.05);
              font-size:11px;font-weight:600;cursor:pointer;color:#B01A18;">
            🗑
          </button>
        </div>
      </div>`;
  }

  const catCounts = cats.reduce((acc, cat) => {
    acc[cat] = cat === 'All'
      ? state.clients.length
      : state.clients.filter(c => c.category === cat).length;
    return acc;
  }, {});

  const filterBar = cats.map(cat => `
    <button class="cat-filter-btn" data-cat="${cat}"
      style="padding:5px 16px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
        border:1.5px solid ${active===cat?'#B01A18':'var(--border,#ddd)'};
        background:${active===cat?'#B01A18':'transparent'};
        color:${active===cat?'#fff':'var(--text-primary,#333)'};">
      ${cat} <span style="opacity:0.7;">(${catCounts[cat]})</span>
    </button>`).join('');

  const grid = display.length
    ? display.map(clientCard).join('')
    : `<div style="grid-column:1/-1;padding:48px;text-align:center;
        color:var(--text-muted,#888);font-size:14px;">
        No clients in this category.
      </div>`;

  return `
    <div class="page-header" style="display:flex;align-items:flex-start;
      justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <div>
        <h1>Clients</h1>
        <p class="subtitle">Partner companies and organisations — ${state.clients.length} total</p>
      </div>
      <button id="addClientBtn"
        style="display:flex;align-items:center;gap:6px;padding:9px 20px;border-radius:8px;
          border:none;background:#B01A18;color:#fff;font-size:13px;font-weight:600;
          cursor:pointer;height:40px;white-space:nowrap;box-shadow:0 2px 8px rgba(176,26,24,0.25);">
        + Add Client
      </button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
      ${filterBar}
    </div>
    <div class="client-grid">${grid}</div>`;
};

pageEvents.clients = function () {
  // Category filter
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.clientFilter = btn.dataset.cat === 'All' ? '' : btn.dataset.cat;
      showPage('clients');
    });
  });

  // View details
  document.querySelectorAll('.client-view-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openClientViewModal(parseInt(btn.dataset.id));
    });
  });

  // Edit
  document.querySelectorAll('.client-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openClientFormModal(parseInt(btn.dataset.id));
    });
  });

  // Delete
  document.querySelectorAll('.client-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const c  = state.clients.find(x => x.id === id);
      if (!c) return;
      if (confirm(`Delete "${c.name}"?\nThis cannot be undone.`)) {
        state.clients = state.clients.filter(x => x.id !== id);
        showToast(`${c.name} removed.`, 'success');
        showPage('clients');
      }
    });
  });

  // Add new client
  document.getElementById('addClientBtn')?.addEventListener('click', () => {
    openClientFormModal(null);
  });
};

// ── View-only modal ───────────────────────────────────────────
function openClientViewModal(id) {
  const c = (state.clients || []).find(x => x.id === id);
  if (!c) return;
  const color = catColor(c.category);
  const cls   = catCls(c.category);
  const ini   = (c.name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  document.getElementById('modalTitle').textContent = c.name;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
      <div class="client-avatar" style="background:${color};width:52px;height:52px;
        border-radius:10px;font-size:20px;">${ini}</div>
      <div>
        <h4 style="font-size:15px;font-weight:700;margin:0 0 5px;">${escH(c.name)}</h4>
        <span class="cat-badge ${cls}">${escH(c.category)}</span>
      </div>
    </div>
    ${c.about ? `<div class="panel-section">
      <div class="panel-section-title">About</div>
      <p style="font-size:13px;line-height:1.65;margin:0;">${escH(c.about)}</p>
    </div>` : ''}
    <div class="panel-section">
      <div class="panel-section-title">Contact</div>
      ${c.phone   ? `<div class="panel-info-row"><span>Phone</span><span>${escH(c.phone)}</span></div>` : ''}
      ${c.email   ? `<div class="panel-info-row"><span>Email</span>
        <span><a href="mailto:${escH(c.email)}" style="color:${color};">${escH(c.email)}</a></span></div>` : ''}
      ${c.website ? `<div class="panel-info-row"><span>Website</span>
        <span><a href="${escH(c.website)}" target="_blank" rel="noopener"
          style="color:${color};">${escH(c.website.replace(/^https?:\/\//,''))}</a></span></div>` : ''}
      ${!c.phone && !c.email && !c.website
        ? '<p style="font-size:13px;color:#888;margin:0;">No contact information available.</p>' : ''}
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

// ── Add / Edit form modal ─────────────────────────────────────
function openClientFormModal(id) {
  const isEdit = id !== null;
  const c = isEdit ? (state.clients || []).find(x => x.id === id) : null;

  const inpSty = `width:100%;padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;
    font-size:13px;background:var(--bg-card,#fff);color:var(--text-primary,#333);box-sizing:border-box;`;

  document.getElementById('modalTitle').textContent = isEdit ? `Edit — ${c.name}` : 'Add New Client';
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">Client Name *</label>
        <input id="cfName" type="text" value="${isEdit ? escH(c.name) : ''}"
          placeholder="e.g. Viking Cruises" style="${inpSty}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">Category *</label>
        <select id="cfCat" style="${inpSty}">
          ${['Cruise Line','J1 Program','Other'].map(cat =>
            `<option value="${cat}" ${isEdit && c.category===cat?'selected':''}>${cat}</option>`
          ).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">About</label>
        <textarea id="cfAbout" rows="4" placeholder="Brief description…"
          style="${inpSty}resize:vertical;">${isEdit ? escH(c.about||'') : ''}</textarea>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">Contact Number</label>
        <input id="cfPhone" type="tel" value="${isEdit ? escH(c.phone||'') : ''}"
          placeholder="+1 (305) 123-4567" style="${inpSty}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">Email Address</label>
        <input id="cfEmail" type="email" value="${isEdit ? escH(c.email||'') : ''}"
          placeholder="contact@company.com" style="${inpSty}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;
          color:#888;display:block;margin-bottom:4px;">Website</label>
        <input id="cfWebsite" type="url" value="${isEdit ? escH(c.website||'') : ''}"
          placeholder="https://www.company.com" style="${inpSty}">
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;
        padding-top:12px;border-top:1px solid var(--border,#eee);">
        <button id="cfCancel" type="button"
          style="padding:8px 20px;border-radius:6px;border:1.5px solid var(--border,#ddd);
            background:transparent;font-size:13px;font-weight:600;cursor:pointer;">
          Cancel
        </button>
        <button id="cfSave" type="button" data-editid="${isEdit ? id : ''}"
          style="padding:8px 22px;border-radius:6px;border:none;
            background:#B01A18;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">
          ${isEdit ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </div>`;

  document.getElementById('modalOverlay').classList.add('active');

  document.getElementById('cfCancel').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('active');
  });

  document.getElementById('cfSave').addEventListener('click', () => {
    const name    = (document.getElementById('cfName').value    || '').trim();
    const cat     = (document.getElementById('cfCat').value     || '').trim();
    const about   = (document.getElementById('cfAbout').value   || '').trim();
    const phone   = (document.getElementById('cfPhone').value   || '').trim();
    const email   = (document.getElementById('cfEmail').value   || '').trim();
    const website = (document.getElementById('cfWebsite').value || '').trim();

    if (!name) { showToast('Client name is required.', 'error'); return; }

    if (isEdit) {
      const idx = state.clients.findIndex(x => x.id === id);
      if (idx >= 0) Object.assign(state.clients[idx], { name, category: cat, about, phone, email, website });
      showToast(`${name} updated.`, 'success');
    } else {
      const newId = state.clients.length ? Math.max(...state.clients.map(x => x.id)) + 1 : 1;
      state.clients.push({ id: newId, name, category: cat, about, phone, email, website });
      showToast(`${name} added.`, 'success');
    }
    document.getElementById('modalOverlay').classList.remove('active');
    showPage('clients');
  });
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
// PAGE: INTERN v TRAINEE
// ============================
pages.interntainee = async function () {
  const C = DIVISION_COLORS.j1;
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Intern v Trainee</h1>
        <p class="subtitle">J1 Exchange Visitor Program — category eligibility guide for embassy reporting</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
      <div class="card" style="border-top:4px solid ${C};">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;border-radius:50%;background:${C};display:flex;
            align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0;">🎓</div>
          <div>
            <div style="font-size:17px;font-weight:700;">Intern</div>
            <div style="font-size:12px;color:var(--text-muted,#888);margin-top:2px;">J1 Intern Category</div>
          </div>
        </div>
        <div style="font-size:13px;line-height:1.75;color:var(--text-secondary,#555);">
          <p style="margin:0 0 10px;"><strong>Who qualifies:</strong></p>
          <ul style="margin:0 0 14px;padding-left:18px;display:flex;flex-direction:column;gap:6px;">
            <li>Currently enrolled full-time in a degree program at a post-secondary academic institution <em>outside</em> the United States</li>
            <li>OR graduated within the <strong>past 12 months</strong> from such an institution</li>
          </ul>
          <p style="margin:0 0 8px;"><strong>Program requirements:</strong></p>
          <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;">
            <li>Internship must be <strong>directly related</strong> to the participant's current field of study</li>
            <li>Maximum duration: <strong>12 months</strong></li>
            <li>Requires DS-7002 Training/Internship Placement Plan</li>
            <li>Must be a structured, supervised program</li>
          </ul>
        </div>
      </div>

      <div class="card" style="border-top:4px solid #B01A18;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;border-radius:50%;background:#B01A18;display:flex;
            align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0;">💼</div>
          <div>
            <div style="font-size:17px;font-weight:700;">Trainee</div>
            <div style="font-size:12px;color:var(--text-muted,#888);margin-top:2px;">J1 Trainee Category</div>
          </div>
        </div>
        <div style="font-size:13px;line-height:1.75;color:var(--text-secondary,#555);">
          <p style="margin:0 0 10px;"><strong>Who qualifies:</strong></p>
          <ul style="margin:0 0 14px;padding-left:18px;display:flex;flex-direction:column;gap:6px;">
            <li>Holds a degree or professional certificate AND has at least <strong>1 year</strong> of work experience in their occupational field</li>
            <li>OR has <strong>5+ years</strong> of work experience in their occupational field (no degree required)</li>
          </ul>
          <p style="margin:0 0 8px;"><strong>Program requirements:</strong></p>
          <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;">
            <li>Maximum duration: <strong>18 months</strong></li>
            <li>Requires DS-7002 Training/Internship Placement Plan</li>
            <li>Must share knowledge and skills upon return home</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card mb-24">
      <div class="card-title" style="margin-bottom:16px;">Side-by-Side Comparison</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--bg-subtle,#F3F4F6);">
              <th style="padding:10px 14px;text-align:left;font-weight:700;border-bottom:2px solid var(--border,#E5E7EB);width:30%;">Criteria</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;border-bottom:2px solid var(--border,#E5E7EB);color:${C};">Intern</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;border-bottom:2px solid var(--border,#E5E7EB);color:#B01A18;">Trainee</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Education requirement',  'Currently enrolled OR graduated ≤12 months ago','Degree + 1 yr experience, OR 5 yrs experience'],
              ['Minimum work experience','None required',                                  'At least 1 year in field (or 5 yrs without degree)'],
              ['Program link to study','Must relate to current field of study',          'Career development beyond home-country opportunities'],
              ['Maximum duration',       '12 months',                                      '18 months'],
              ['Key document',           'DS-7002 Internship Placement Plan',              'DS-7002 Training Placement Plan'],
              ['Supervision',            'Direct supervisor required',                     'Structured training phases required'],
              ['Repeat eligibility',     'Once per degree program',                        'Once per career field'],
            ].map(([c,i,t]) => `
              <tr style="border-bottom:1px solid var(--border,#E5E7EB);">
                <td style="padding:10px 14px;font-weight:600;">${c}</td>
                <td style="padding:10px 14px;color:var(--text-secondary,#555);">${i}</td>
                <td style="padding:10px 14px;color:var(--text-secondary,#555);">${t}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="border-left:4px solid #B87A14;background:rgba(184,122,20,0.04);">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:22px;margin-top:2px;">📋</span>
        <div>
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#B87A14;">Embassy Reporting Notes</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.75;color:var(--text-secondary,#555);display:flex;flex-direction:column;gap:4px;">
            <li>The correct category <strong>(Intern or Trainee)</strong> must be specified on the DS-2019 Certificate of Eligibility</li>
            <li>DS-7002 must be signed by the host employer, exchange visitor, and sponsor <em>before</em> the program begins</li>
            <li>Misclassification is one of the most common compliance issues flagged during embassy interviews</li>
            <li>CTI Group verifies category eligibility during the application screening process</li>
          </ul>
        </div>
      </div>
    </div>`;
};

// ============================
// PAGE: SOCIAL MEDIA DISCLOSURE
// ============================
pages.socialmedia = async function () {
  const C = DIVISION_COLORS.j1;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Social Media Disclosure Form</h1>
        <p class="subtitle">J1 participants must complete this form prior to program commencement</p>
      </div>
    </div>

    ${!isLocal ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
      background:rgba(184,122,20,0.08);border:1px solid rgba(184,122,20,0.25);border-radius:8px;margin-bottom:20px;">
      <span>⚠️</span>
      <span style="font-size:13px;color:#B87A14;font-weight:500;">Server offline</span>
    </div>` : ''}

    <div class="card mb-24">
      <div class="card-title" style="margin-bottom:20px;">📝 Social Media Disclosure Form</div>

      <form id="smForm" style="display:flex;flex-direction:column;gap:24px;">

        <!-- Personal Info -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--text-muted,#888);
            text-transform:uppercase;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border,#E5E7EB);">
            Personal Information
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${[
              ['firstName','First Name','text','John','true'],
              ['lastName','Last Name','text','Doe','true'],
              ['email','Email Address','email','john@email.com','true'],
              ['phone','Phone Number','tel','+1 234 567 8900','false'],
              ['nationality','Nationality','text','Indonesian','false'],
              ['hostingCompany','Hosting Company','text','e.g. Viking Cruises','true'],
              ['startDate','Program Start Date','date','','false'],
              ['endDate','Program End Date','date','','false'],
            ].map(([id,label,type,ph,req]) => `
              <div>
                <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                  letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">
                  ${label}${req==='true'?' <span style="color:#B01A18;">*</span>':''}
                </label>
                <input id="sm_${id}" type="${type}" placeholder="${ph}"
                  ${req==='true'?'required':''} autocomplete="off"
                  style="width:100%;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                    border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg,#fff);
                    color:var(--text,#1A1A1A);outline:none;transition:border-color 0.15s;"
                  onfocus="this.style.borderColor='${C}'" onblur="this.style.borderColor='var(--border,#E5E7EB)'">
              </div>`).join('')}
          </div>
        </div>

        <!-- Social Media Account -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--text-muted,#888);
            text-transform:uppercase;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border,#E5E7EB);">
            Social Media Account <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;">(submit your primary account)</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:end;">
            <div>
              <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">
                Platform <span style="color:#B01A18;">*</span>
              </label>
              <select id="sm_platform" required
                style="width:100%;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                  border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg,#fff);
                  color:var(--text,#1A1A1A);outline:none;transition:border-color 0.15s;appearance:auto;"
                onfocus="this.style.borderColor='${C}'" onblur="this.style.borderColor='var(--border,#E5E7EB)'">
                <option value="">Select platform…</option>
                <option value="Instagram">📸 Instagram</option>
                <option value="TikTok">🎵 TikTok</option>
                <option value="Facebook">👤 Facebook</option>
                <option value="Twitter / X">🐦 Twitter / X</option>
                <option value="LinkedIn">💼 LinkedIn</option>
                <option value="YouTube">▶ YouTube</option>
                <option value="Snapchat">👻 Snapchat</option>
                <option value="Other">🌐 Other</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">
                Username / Profile URL
              </label>
              <input id="sm_username" type="text" placeholder="@username or profile URL"
                style="width:100%;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                  border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg,#fff);
                  color:var(--text,#1A1A1A);outline:none;transition:border-color 0.15s;"
                onfocus="this.style.borderColor='${C}'" onblur="this.style.borderColor='var(--border,#E5E7EB)'">
            </div>
          </div>
          <div style="margin-top:14px;">
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
              letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">
              🔒 Privacy Setting During Program <span style="color:#B01A18;">*</span>
            </label>
            <select id="sm_privacySetting" required
              style="width:100%;max-width:360px;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg,#fff);
                color:var(--text,#1A1A1A);outline:none;appearance:auto;">
              <option value="">Select privacy setting…</option>
              <option value="Account set to Private">Account set to Private</option>
              <option value="Account remains Public">Account remains Public</option>
              <option value="I do not have social media accounts">I do not have social media accounts</option>
            </select>
          </div>
        </div>

        <!-- Acknowledgements -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--text-muted,#888);
            text-transform:uppercase;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border,#E5E7EB);">
            Acknowledgements <span style="color:#B01A18;">*</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${[
              ['confirmedAccurate','I confirm that all social media accounts listed above are accurate and complete'],
              ['noProhibitedContent','I agree not to post prohibited content (confidential, discriminatory, or political) during my program'],
              ['termsAgreed','I have read and agree to the CTI Group Social Media Terms & Agreement'],
            ].map(([id,label]) => `
              <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;
                color:var(--text-secondary,#555);line-height:1.5;">
                <input id="sm_${id}" type="checkbox" required
                  style="margin-top:2px;width:15px;height:15px;accent-color:${C};flex-shrink:0;">
                ${label}
              </label>`).join('')}
          </div>
        </div>

        <!-- Signature -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--text-muted,#888);
            text-transform:uppercase;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border,#E5E7EB);">
            Signature
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:end;">
            <div>
              <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">
                Full Name (typed signature) <span style="color:#B01A18;">*</span>
              </label>
              <input id="sm_signature" type="text" placeholder="Type your full name" required
                style="width:100%;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                  border-radius:8px;font-size:14px;font-family:'Georgia',serif;font-style:italic;
                  background:var(--bg,#fff);color:var(--text,#1A1A1A);outline:none;transition:border-color 0.15s;"
                onfocus="this.style.borderColor='${C}'" onblur="this.style.borderColor='var(--border,#E5E7EB)'">
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:var(--text-muted,#888);margin-bottom:6px;">Date</label>
              <input type="text" value="${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}"
                disabled style="width:100%;padding:10px 13px;border:1.5px solid var(--border,#E5E7EB);
                  border-radius:8px;font-size:13px;background:var(--bg-subtle,#F3F4F6);
                  color:var(--text-muted,#888);font-family:inherit;">
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div style="display:flex;gap:12px;align-items:center;padding-top:8px;border-top:1px solid var(--border,#E5E7EB);">
          <button type="submit" id="smSubmitBtn"
            style="padding:12px 28px;border:none;border-radius:8px;background:${C};color:#fff;
              font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;
              box-shadow:0 4px 14px rgba(27,58,107,0.3);transition:all 0.15s;"
            onmouseover="this.style.background='#152e56'" onmouseout="this.style.background='${C}'">
            Submit Disclosure
          </button>
          <button type="button" onclick="document.getElementById('smForm').reset();showToast('Form cleared.','info');"
            style="padding:12px 20px;border:1.5px solid var(--border,#E5E7EB);border-radius:8px;
              background:transparent;color:var(--text-muted,#888);font-size:13px;font-weight:600;
              font-family:inherit;cursor:pointer;">
            Clear Form
          </button>
          <span id="smFormMsg" style="font-size:13px;display:none;"></span>
        </div>

      </form>
    </div>`;
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
  const C       = DIVISION_COLORS.j1;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // 7 milestone stages — counts are INDEPENDENT (a person can count in multiple)
  const STAGES = [
    { key:'registered',  label:'Registered',          icon:'📋', color:'#64748B', bg:'rgba(100,116,139,0.10)' },
    { key:'paid',        label:'Paid',                icon:'💳', color:'#6B47DC', bg:'rgba(107,71,220,0.10)' },
    { key:'ds',          label:'DS-160 Processed',    icon:'📄', color:'#1B3A6B', bg:'rgba(27,58,107,0.10)' },
    { key:'waiting',     label:'Waiting Appointment', icon:'⏳', color:'#B87A14', bg:'rgba(184,122,20,0.10)' },
    { key:'appointment', label:'Has Appointment',     icon:'📅', color:'#2D7A55', bg:'rgba(45,122,85,0.10)' },
    { key:'approved',    label:'Approved',            icon:'✅', color:'#059669', bg:'rgba(5,150,105,0.10)' },
    { key:'rejected',    label:'Rejected',            icon:'❌', color:'#B01A18', bg:'rgba(176,26,24,0.10)' },
  ];

  // Compute milestone counts + per-participant current stage
  function computeCounts(columns, rows) {
    const payIdx      = columns.findIndex(c => /payment status/i.test(c));
    const visIdx      = columns.findIndex(c => /^visa status$/i.test(c));
    const apptIdx     = columns.findIndex(c => /appointment date/i.test(c));
    const nameIdx     = columns.findIndex(c => /^name$/i.test(c));
    const natIdx      = columns.findIndex(c => /nationality/i.test(c));
    const passportIdx = columns.findIndex(c => /passport/i.test(c));

    const counts = Object.fromEntries(STAGES.map(s => [s.key, 0]));
    const people = [];

    rows.forEach(row => {
      const pay      = String(payIdx      >= 0 ? row[payIdx]      || '' : '');
      const vis      = String(visIdx      >= 0 ? row[visIdx]      || '' : '');
      const appt     = String(apptIdx     >= 0 ? row[apptIdx]     || '' : '').trim();
      const passport = String(passportIdx >= 0 ? row[passportIdx] || '' : '');

      counts.registered++;
      if (/paid/i.test(pay))                                             counts.paid++;
      if (/visa application processed/i.test(vis))                      counts.ds++;
      if (/visa payment processed/i.test(vis) && !appt)                 counts.waiting++;
      if (/visa payment processed/i.test(vis) && appt)                  counts.appointment++;
      if (/approv|issued|granted/i.test(vis))                           counts.approved++;
      if (/reject|denied|refused/i.test(vis))                           counts.rejected++;

      // Highest current stage (for table display)
      let stage;
      if (/reject|denied|refused/i.test(vis))                           stage = 'rejected';
      else if (/approv|issued|granted/i.test(vis))                      stage = 'approved';
      else if (/visa payment processed/i.test(vis) && appt)             stage = 'appointment';
      else if (/visa payment processed/i.test(vis))                     stage = 'waiting';
      else if (/visa application processed/i.test(vis))                 stage = 'ds';
      else if (/paid/i.test(pay))                                       stage = 'paid';
      else                                                               stage = 'registered';

      // Store all raw column values for the full panel view
      const allFields = columns.map((col, i) => [col, String(row[i] ?? '')]);

      people.push({
        name:          String(nameIdx >= 0 ? row[nameIdx] || '' : ''),
        nationality:   String(natIdx  >= 0 ? row[natIdx]  || '' : ''),
        passport,
        paymentStatus: pay,
        visaStatus:    vis,
        stage, appt,
        allFields
      });
    });
    return { counts, people };
  }

  let columns = [], rows = [], viewName = '', errorMsg = null;

  try {
    const res  = await fetch('/api/zoho/j1-visa');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Fetch failed');
    viewName = json.view || '';
    columns  = json.data?.columns || [];
    rows     = json.data?.rows    || [];
  } catch (e) { errorMsg = e.message; }

  const { counts, people } = computeCounts(columns, rows);
  const total   = counts.registered;
  const authErr = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Visa Status</h1>
        <p class="subtitle">J1 visa application pipeline · ${total} participants${viewName ? ' · ' + viewName : ''}</p>
      </div>
    </div>

    ${errorMsg && !rows.length ? `
    <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;
      background:rgba(176,26,24,0.07);border:1px solid rgba(176,26,24,0.25);
      border-radius:10px;margin-bottom:22px;">
      <span style="font-size:22px;">${authErr ? '🔑' : '⚠️'}</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:#B01A18;margin-bottom:4px;">
          ${authErr ? 'Server not connected' : 'Server error'}
        </div>
        <div style="font-size:13px;color:var(--text-secondary,#555);">
          ${authErr
            ? 'Session expired or server not connected. <a href="/auth/zoho" style="color:#B01A18;font-weight:700;text-decoration:underline;">Click here to reconnect →</a>'
            : errorMsg}
        </div>
      </div>
    </div>` : ''}

    <!-- 7-stage milestone pipeline -->
    <div style="display:flex;align-items:stretch;gap:0;margin-bottom:24px;overflow-x:auto;">
      ${STAGES.map((s, i) => `
        ${i > 0 ? `<div style="display:flex;align-items:center;padding:0 2px;color:var(--text-muted,#bbb);font-size:18px;flex-shrink:0;">›</div>` : ''}
        <div style="flex:1;min-width:90px;padding:16px 10px;text-align:center;
          background:${s.bg};border:1px solid ${s.color}30;
          border-radius:${i===0?'12px 0 0 12px':i===STAGES.length-1?'0 12px 12px 0':'0'};
          border-left:${i>0?'none':'1px solid '+s.color+'30'};">
          <div style="font-size:22px;line-height:1;margin-bottom:8px;">${s.icon}</div>
          <div style="font-size:32px;font-weight:800;color:${s.color};line-height:1;">${counts[s.key]}</div>
          <div style="font-size:10px;font-weight:700;color:${s.color};margin-top:6px;
            text-transform:uppercase;letter-spacing:0.05em;line-height:1.4;">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- Participants table -->
    ${people.length > 0 ? `
    <script type="application/json" id="j1visaData">${JSON.stringify({
      people,
      stagesMap: Object.fromEntries(STAGES.map(s => [s.key, s]))
    })}<\/script>
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">👤 Participant Details</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th>
            <th>Name</th>
            <th>Nationality</th>
            <th>Passport No.</th>
            <th>Payment Status</th>
            <th>Visa Status</th>
            <th>Appointment Date</th>
            <th>Current Stage</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${people.map((p, i) => {
              const stg = STAGES.find(s => s.key === p.stage) || STAGES[0];
              return `<tr>
                <td style="color:var(--text-muted,#888);font-size:12px;">${i+1}</td>
                <td><strong>${p.name || '—'}</strong></td>
                <td>${p.nationality || '—'}</td>
                <td style="font-family:monospace;font-size:12px;letter-spacing:0.03em;">${p.passport || '—'}</td>
                <td>${p.paymentStatus
                  ? `<span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;
                      background:rgba(107,71,220,0.1);color:#6B47DC;">${p.paymentStatus}</span>`
                  : '<span style="color:var(--text-muted,#aaa);">—</span>'}</td>
                <td style="font-size:12px;color:var(--text-secondary,#555);">${p.visaStatus || '—'}</td>
                <td style="color:${p.appt ? '#059669' : 'var(--text-muted,#aaa)'};">${p.appt || '—'}</td>
                <td>
                  <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
                    background:${stg.bg};color:${stg.color};white-space:nowrap;">
                    ${stg.icon} ${stg.label}
                  </span>
                </td>
                <td>
                  <button class="j1visa-details-btn" data-idx="${i}"
                    style="padding:4px 12px;border:1.5px solid ${C};border-radius:6px;
                      background:transparent;color:${C};font-size:11px;font-weight:700;
                      font-family:inherit;cursor:pointer;white-space:nowrap;transition:all 0.15s;"
                    onmouseover="this.style.background='${C}';this.style.color='#fff'"
                    onmouseout="this.style.background='transparent';this.style.color='${C}'">
                    View Details
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;
};

// ── J1 Visa side-panel events ──────────────────────────────────
pageEvents.j1visa = function () {
  const dataEl = document.getElementById('j1visaData');
  if (!dataEl) return;
  let parsed;
  try { parsed = JSON.parse(dataEl.textContent); } catch { return; }
  const { people, stagesMap } = parsed;
  const C = DIVISION_COLORS.j1;

  document.querySelectorAll('.j1visa-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const p   = people[idx];
      if (!p) return;
      const stg = stagesMap[p.stage] || stagesMap['registered'];

      document.getElementById('panelTitle').textContent = p.name || 'Participant';

      // All source columns + derived Current Stage
      const displayFields = (p.allFields && p.allFields.length
        ? p.allFields.filter(([col]) => !/^name$/i.test(col))  // name already in header
        : [
            ['Nationality',      p.nationality   || ''],
            ['Passport Number',  p.passport      || ''],
            ['Payment Status',   p.paymentStatus || ''],
            ['Visa Status',      p.visaStatus    || ''],
            ['Appointment Date', p.appt          || ''],
          ]
      ).concat([['Current Stage', stg.label]]);

      const isCodeField = col => /passport|sevis|visa.*(application|payment)\s*id|program number/i.test(col);

      document.getElementById('panelBody').innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:52px;height:52px;border-radius:50%;background:${stg.bg};
              border:2px solid ${stg.color};display:flex;align-items:center;justify-content:center;
              font-size:24px;flex-shrink:0;">${stg.icon}</div>
            <div>
              <div style="font-size:16px;font-weight:700;">${p.name || '—'}</div>
              <div style="font-size:12px;color:var(--text-muted,#888);margin-top:2px;">${p.nationality || '—'}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${displayFields.map(([col, val]) => `
              <div style="padding:11px 13px;background:var(--bg-subtle,#F3F4F6);border-radius:8px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
                  color:var(--text-muted,#888);margin-bottom:4px;">${col}</div>
                <div style="font-size:13px;font-weight:600;color:var(--text,#1A1A1A);
                  font-family:${isCodeField(col)?'monospace':'inherit'};">
                  ${val || '—'}
                </div>
              </div>`).join('')}
          </div>
          <div style="padding:12px 16px;background:${stg.bg};border-radius:8px;
            border:1px solid ${stg.color}40;">
            <span style="font-size:13px;font-weight:700;color:${stg.color};">
              ${stg.icon} Current Stage: ${stg.label}
            </span>
          </div>
        </div>`;

      document.getElementById('sidePanel').classList.add('open');
      document.getElementById('panelOverlay')?.classList.add('active');
    });
  });

  document.getElementById('panelClose')?.addEventListener('click', () => {
    document.getElementById('sidePanel').classList.remove('open');
    document.getElementById('panelOverlay')?.classList.remove('active');
  });
  document.getElementById('panelOverlay')?.addEventListener('click', () => {
    document.getElementById('sidePanel').classList.remove('open');
    document.getElementById('panelOverlay')?.classList.remove('active');
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
  salary:    8, city:      9, target:  10, start:   11, housing: 12
};

// Sort state
let _reqSortCol = null;
let _reqSortDir = 'asc';
let _reqColFilters = {};

pages.requisition = async function () {
  const C = DIVISION_COLORS.j1;

  let rawRows  = [];
  let errorMsg = null;
  let viewName = '';

  try {
    const res  = await fetch('/api/zoho/j1-requisition');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Fetch failed');
    viewName = json.view || 'J1 Requisition';
    rawRows  = json.data?.rows || [];
  } catch (e) { errorMsg = e.message; }

  // Server already returns only active J1 jobs, but filter defensively
  const rows = rawRows.filter(r =>
    r[REQ_CI.status] === 'Active' && r[REQ_CI.progType]?.trim()
  );

  // Cache for pageEvents
  state.dataCache['req-rows']    = rows;
  state.dataCache['req-rawrows'] = rawRows; // all rows for fulfillment chart

  // Summary stats (all rows are already Active + filled J1 Program Type)
  const totalHeadcount = rows.reduce((s,r) => s + (parseInt(r[REQ_CI.slots])||0), 0);
  const sponsors       = [...new Set(rows.map(r=>r[REQ_CI.sponsor]).filter(Boolean))].sort();
  const depts          = [...new Set(rows.map(r=>r[REQ_CI.dept]).filter(Boolean))].sort();
  const housings       = [...new Set(rows.map(r=>r[REQ_CI.housing]).filter(Boolean))].sort();
  const authErr        = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));

  // ── Column filter input helper ─────────────────────────────────
  const inpSty = `width:100%;font-size:11px;padding:2px 6px;height:24px;
    border:1px solid var(--border,#ddd);border-radius:3px;box-sizing:border-box;
    background:var(--surface,#fff);color:var(--text,#333);`;
  const selSty = inpSty + 'cursor:pointer;';

  const mkSel = (id, opts) => `<select id="${id}" style="${selSty}">
    <option value="">All</option>
    ${opts.map(v=>`<option value="${escH(v)}">${escH(v)}</option>`).join('')}
    </select>`;

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Requisition Dashboard</h1>
        <p class="subtitle">J1 Requisition
          <span style="font-size:11px;font-weight:600;background:rgba(45,122,85,0.15);color:#2D7A55;padding:2px 10px;border-radius:20px;margin-left:8px;vertical-align:middle;">● Live · Zoho Recruit</span>
        </p>
      </div>
    </div>

    ${errorMsg ? `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(176,26,24,0.07);
      border:1px solid rgba(176,26,24,0.25);border-radius:10px;margin-bottom:18px;">
      <span style="font-size:20px;">${authErr ? '🔑' : '⚠️'}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:#B01A18;">${authErr ? 'Server not connected' : 'Server error'}</div>
        <div style="font-size:12px;color:var(--text-secondary,#555);margin-top:2px;">${authErr
          ? '<a href="/auth/zoho" style="color:#B01A18;font-weight:700;text-decoration:underline;">Re-connect to Zoho →</a>'
          : errorMsg}</div>
      </div>
    </div>` : ''}

    ${rows.length > 0 ? `
    <!-- ── Global Filter Bar (top) ──────────────────────────────── -->
    <div class="card mb-24" style="padding:14px 18px;">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
        <input id="reqSearch" type="search" placeholder="🔍 Search company, position, city…"
          style="font-size:12px;padding:4px 10px;height:32px;min-width:220px;flex:1 1 220px;
            border:1px solid var(--border,#ddd);border-radius:6px;
            background:var(--surface,#fff);color:var(--text,#333);">
        <select id="reqDeptFilter" style="font-size:12px;padding:4px 8px;height:32px;
          border:1px solid var(--border,#ddd);border-radius:6px;
          background:var(--surface,#fff);color:var(--text,#333);min-width:140px;flex:1 1 140px;">
          <option value="">All Departments</option>
          ${depts.map(d=>`<option value="${escH(d)}">${escH(d)}</option>`).join('')}
        </select>
        <select id="reqSponsorFilter" style="font-size:12px;padding:4px 8px;height:32px;
          border:1px solid var(--border,#ddd);border-radius:6px;
          background:var(--surface,#fff);color:var(--text,#333);min-width:160px;flex:1 1 160px;">
          <option value="">All Sponsors</option>
          ${sponsors.map(s=>`<option value="${escH(s)}">${escH(s)}</option>`).join('')}
        </select>
        <select id="reqHousingFilter" style="font-size:12px;padding:4px 8px;height:32px;
          border:1px solid var(--border,#ddd);border-radius:6px;
          background:var(--surface,#fff);color:var(--text,#333);min-width:140px;flex:1 1 140px;">
          <option value="">All Housing</option>
          ${housings.map(h=>`<option value="${escH(h)}">${escH(h)}</option>`).join('')}
        </select>
        <button id="reqClearBtn"
          style="height:32px;padding:0 14px;border:1.5px solid #B01A18;border-radius:6px;
            background:transparent;color:#B01A18;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
          ✕ Clear</button>
        <span id="reqCount" style="font-size:12px;font-weight:600;color:#888;white-space:nowrap;">
          ${rows.length} requisitions</span>
      </div>
    </div>

    <!-- ── KPI Grid ───────────────────────────────────────────── -->
    <div class="kpi-grid mb-24">
      <div class="kpi-card">
        <span class="kpi-label">Requisitions</span>
        <span class="kpi-value" style="color:#1B3A6B;" id="reqKpiCount">${rows.length}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Total Headcount</span>
        <span class="kpi-value" style="color:${C};" id="reqKpiSlots">${totalHeadcount.toLocaleString()}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Sponsors</span>
        <span class="kpi-value" style="color:#6B47DC;">${sponsors.length}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Departments</span>
        <span class="kpi-value">${depts.length}</span>
      </div>
    </div>

    <!-- ── Chart Row 1: Sponsor donut (centred square) ─────────── -->
    <div class="two-col mb-24">
      <div class="card">
        <div class="card-title">Headcount by Sponsor</div>
        <div class="card-subtitle">Share of open headcount per sponsor</div>
        <div class="chart-wrap"><canvas id="reqSponsorChart"></canvas></div>
      </div>

      <!-- ── Chart Row 1b: Fulfillment summary (right col) ──── -->
      <div class="card">
        <div class="card-title">Fulfillment by Department</div>
        <div class="card-subtitle">Active req headcount vs actual placements · auto-syncs with placement data</div>
        <div class="chart-wrap" style="height:320px;"><canvas id="reqFulfillChart"></canvas></div>
      </div>
    </div>

    <!-- ── Chart Row 3: Start Date line (full width, tall) ───── -->
    <div class="card mb-24">
      <div class="card-title">Requisitions by Start Date</div>
      <div class="card-subtitle">Monthly count of new active requisitions · with cumulative overlay</div>
      <div class="chart-wrap" style="height:260px;"><canvas id="reqDateChart"></canvas></div>
    </div>

    <!-- ── Sortable + Column-Filtered Table ───────────────────── -->
    <div class="card">
      <div class="table-wrap">
        <table id="reqMainTable">
          <thead>
            <!-- Sort row -->
            <tr id="reqSortRow">
              <th data-rcol="0" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Hosting Company <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="1" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Department <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="2" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Position <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="3" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;text-align:center;">Headcount <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="4" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Sponsor <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th>Program Type</th>
              <th data-rcol="7" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Contract <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="8" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Salary <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="9" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">City <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="11" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Start Date <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th data-rcol="10" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">Target Date <span class="sort-icon" style="opacity:0.4;font-size:10px;"> ⇅</span></th>
              <th style="width:56px;"></th>
            </tr>
            <!-- Column filter row -->
            <tr id="reqColFilterRow">
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="0" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;">${mkSel('reqCF1', depts)}</th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="2" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="3" placeholder="#" style="${inpSty}"></th>
              <th style="padding:3px 4px;">${mkSel('reqCF4', sponsors)}</th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="5" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="7" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="8" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="9" placeholder="Filter…" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="11" placeholder="YYYY-MM" style="${inpSty}"></th>
              <th style="padding:3px 4px;"><input type="text" class="req-col-f" data-rcol="10" placeholder="YYYY-MM" style="${inpSty}"></th>
              <th></th>
            </tr>
          </thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
    </div>` : `
    <div class="card" style="text-align:center;padding:56px 24px;">
      <div style="font-size:48px;margin-bottom:14px;opacity:0.25;">📋</div>
      <div style="font-size:15px;font-weight:600;color:var(--text-muted,#888);">No active requisition data available.</div>
    </div>`}`;
};

pageEvents.requisition = function () {
  const C       = DIVISION_COLORS.j1;
  const rows    = state.dataCache['req-rows']    || [];
  const rawRows = state.dataCache['req-rawrows'] || [];
  const DL      = window.ChartDataLabels;          // datalabels plugin (CDN global)
  if (!rows.length) return;

  // ── prog type tags ─────────────────────────────────────────────
  function progTags(val) {
    return (val||'').split(';').map(t=>t.trim()).filter(Boolean)
      .map(t=>`<span style="display:inline-block;margin:1px 2px;padding:2px 6px;border-radius:10px;
        background:rgba(176,26,24,0.08);color:#B01A18;font-weight:600;font-size:11px;white-space:nowrap;">${escH(t)}</span>`)
      .join('') || '—';
  }

  // ── table render ───────────────────────────────────────────────
  let _currentRows = [...rows];

  function renderRows(subset) {
    if (!subset.length) return `<tr><td colspan="12" style="text-align:center;padding:36px;color:var(--text-muted,#888);">No matching records.</td></tr>`;
    return subset.map((r,i) => `
      <tr>
        <td style="font-weight:500;max-width:170px;white-space:normal;line-height:1.3;">${escH(r[REQ_CI.company]||'—')}</td>
        <td><span style="font-size:11px;padding:3px 8px;border-radius:20px;background:rgba(27,58,107,0.09);color:#1B3A6B;font-weight:600;white-space:nowrap;">${escH(r[REQ_CI.dept]||'—')}</span></td>
        <td style="font-weight:500;">${escH(r[REQ_CI.position]||'—')}</td>
        <td style="text-align:center;font-size:16px;font-weight:800;color:${C};">${r[REQ_CI.slots]||'0'}</td>
        <td style="font-size:12px;color:var(--text-secondary,#666);">${escH(r[REQ_CI.sponsor]||'—')}</td>
        <td style="font-size:11px;">${progTags(r[REQ_CI.progType])}</td>
        <td style="font-size:12px;white-space:nowrap;">${escH(r[REQ_CI.contract]||'—')}</td>
        <td style="font-size:13px;font-weight:600;">${escH(r[REQ_CI.salary]||'—')}</td>
        <td style="font-size:12px;">${escH(r[REQ_CI.city]||'—')}</td>
        <td style="font-size:12px;white-space:nowrap;">${escH(r[REQ_CI.start]||'—')}</td>
        <td style="font-size:12px;white-space:nowrap;">${escH(r[REQ_CI.target]||'—')}</td>
        <td style="text-align:center;">
          <button class="req-detail-btn" data-idx="${rows.indexOf(r)}"
            style="padding:4px 10px;border:1.5px solid ${C};border-radius:6px;
            background:transparent;color:${C};font-size:11px;font-weight:700;
            font-family:inherit;cursor:pointer;white-space:nowrap;"
            onmouseover="this.style.background='${C}';this.style.color='#fff'"
            onmouseout="this.style.background='transparent';this.style.color='${C}'">
            Details
          </button>
        </td>
      </tr>`).join('');
  }

  function refreshTable() {
    const tbody = document.getElementById('reqTableBody');
    if (tbody) tbody.innerHTML = renderRows(_currentRows);
    const cnt = document.getElementById('reqCount');
    if (cnt) cnt.textContent = `${_currentRows.length} of ${rows.length} requisitions`;
    const k = document.getElementById('reqKpiCount');
    if (k) k.textContent = _currentRows.length;
    const s = document.getElementById('reqKpiSlots');
    if (s) s.textContent = _currentRows.reduce((t,r)=>t+(parseInt(r[REQ_CI.slots])||0),0).toLocaleString(); // headcount
  }

  refreshTable();

  // ── column sort ────────────────────────────────────────────────
  document.getElementById('reqSortRow')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-rcol]');
    if (!th) return;
    const col = parseInt(th.dataset.rcol);
    if (_reqSortCol === col) {
      _reqSortDir = _reqSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _reqSortCol = col;
      _reqSortDir = col === 3 ? 'desc' : 'asc'; // slots default desc
    }
    // Update icons
    document.querySelectorAll('#reqSortRow .sort-icon').forEach(el => { el.textContent = ' ⇅'; el.style.opacity='0.4'; });
    const icon = th.querySelector('.sort-icon');
    if (icon) { icon.textContent = _reqSortDir === 'asc' ? ' ↑' : ' ↓'; icon.style.opacity='1'; }
    // Sort
    _currentRows = [..._currentRows].sort((a, b) => {
      let av = a[_reqSortCol] || '', bv = b[_reqSortCol] || '';
      if (_reqSortCol === 3) { av = parseInt(av)||0; bv = parseInt(bv)||0; }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return _reqSortDir === 'asc' ? cmp : -cmp;
    });
    refreshTable();
  });

  // Sponsor palette (shared between initial render and refreshCharts)
  const SP_COLORS = ['#1B3A6B','#B01A18','#059669','#B87A14','#6B47DC','#888888'];

  // ── dept name normaliser: "Food & Beverage" ↔ "Food and Beverage" ─
  function normDept(s) {
    return (s||'').toLowerCase().trim().replace(/\s*&\s*/g,' and ').replace(/\s+/g,' ');
  }

  // ── placement "Selected Job" → requisition Department aliases ─────
  // Add entries here when a job title doesn't directly match a dept name
  const JOB_ALIAS = {
    'front desk'   : 'guest relations',
    'front office' : 'guest relations',
  };

  // ── build fulfillment data from active req rows + J1_OFFLINE_DATA ─
  // Filled = actual placements (Selected Job → matched to req Dept)
  // Remaining = active headcount - filled  (formula auto-updates with data)
  function buildFulfillData(activeRows) {
    const gSponsor = document.getElementById('reqSponsorFilter')?.value || '';
    const gSearch  = (document.getElementById('reqSearch')?.value || '').toLowerCase().trim();

    // Active headcount by dept (from requisition)
    const deptHC = {};
    activeRows.forEach(r => {
      const d = r[REQ_CI.dept]||'Unknown';
      deptHC[d] = (deptHC[d]||0) + (parseInt(r[REQ_CI.slots])||0);
    });

    // Reverse lookup: normalised dept name → original req dept string
    const normToReqDept = {};
    Object.keys(deptHC).forEach(d => { normToReqDept[normDept(d)] = d; });

    // Filled count from live placement cache
    const deptFilled = {};
    const placements = Array.isArray(state.dataCache['j1-zoho-rows']) ? state.dataCache['j1-zoho-rows'] : [];
    placements.forEach(p => {
      if (gSponsor && p['Processing Sponsor'] !== gSponsor) return;
      if (gSearch) {
        const hay = [p['Hosting Company'],p['Selected Job']].join(' ').toLowerCase();
        if (!hay.includes(gSearch)) return;
      }
      // Apply alias first (e.g. "Front Desk" / "Front Office" → "Guest Relations")
      const normJob  = normDept(p['Selected Job']);
      const normKey  = JOB_ALIAS[normJob] || normJob;
      const reqDept  = normToReqDept[normKey];
      if (reqDept) deptFilled[reqDept] = (deptFilled[reqDept]||0) + 1;
    });

    // Sort by total headcount descending
    const depts     = Object.keys(deptHC).sort((a,b) => deptHC[b] - deptHC[a]);
    const filled    = depts.map(d => Math.min(deptFilled[d]||0, deptHC[d]));
    const remaining = depts.map(d => Math.max(0, deptHC[d] - (deptFilled[d]||0)));
    return { depts, filled, remaining };
  }

  // ── chart refresh (called whenever global filters change) ────────
  function refreshCharts(activeRows) {
    // ── 1. Sponsor doughnut ──────────────────────────────────────
    const sc = state.charts.get('reqSponsorChart');
    if (sc) {
      const sm = {};
      activeRows.forEach(r => { const s=r[REQ_CI.sponsor]||'?'; sm[s]=(sm[s]||0)+(parseInt(r[REQ_CI.slots])||0); });
      const ss = Object.entries(sm).sort((a,b)=>b[1]-a[1]);
      sc.data.labels            = ss.map(e=>e[0]);
      sc.data.datasets[0].data  = ss.map(e=>e[1]);
      sc.data.datasets[0].backgroundColor = ss.map((_,i)=>SP_COLORS[i%SP_COLORS.length]);
      sc.update();
    }

    // ── 2. Fulfillment — cross-ref J1_OFFLINE_DATA ───────────────
    const fc = state.charts.get('reqFulfillChart');
    if (fc) {
      const { depts, filled, remaining } = buildFulfillData(activeRows);
      fc.data.labels           = depts;
      fc.data.datasets[0].data = filled;    // Filled (green)
      fc.data.datasets[1].data = remaining; // Remaining (orange)
      fc.update();
    }

    // ── 3. Date line chart ───────────────────────────────────────
    const dc = state.charts.get('reqDateChart');
    if (dc) {
      const mm={};
      activeRows.forEach(r => {
        const raw=r[REQ_CI.start]; if(!raw) return;
        const m=raw.substring(0,7);
        mm[m]=(mm[m]||0)+(parseInt(r[REQ_CI.slots])||0);
      });
      const sm2   = Object.keys(mm).sort();
      const lbls  = sm2.map(m=>{ const [y,mo]=m.split('-'); return new Date(+y,+mo-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
      const cumul = sm2.map((_,i)=>sm2.slice(0,i+1).reduce((t,k)=>t+(mm[k]||0),0));
      dc.data.labels            = lbls;
      dc.data.datasets[0].data  = sm2.map(m=>mm[m]);
      dc.data.datasets[1].data  = cumul;
      dc.update();
    }
  }

  // ── global filters + column filters (unified) ──────────────────
  function applyAllFilters() {
    const gSearch  = (document.getElementById('reqSearch')?.value   || '').toLowerCase().trim();
    const gDept    = document.getElementById('reqDeptFilter')?.value    || '';
    const gSponsor = document.getElementById('reqSponsorFilter')?.value || '';
    const gHousing = document.getElementById('reqHousingFilter')?.value || '';

    // Column filters
    const colFilters = {};
    document.querySelectorAll('.req-col-f').forEach(el => {
      const v = el.value.trim();
      if (v) colFilters[parseInt(el.dataset.rcol)] = v.toLowerCase();
    });
    const cf1 = document.getElementById('reqCF1')?.value || '';
    const cf4 = document.getElementById('reqCF4')?.value || '';

    _currentRows = rows.filter(r => {
      if (gDept    && r[REQ_CI.dept]    !== gDept)    return false;
      if (gSponsor && r[REQ_CI.sponsor] !== gSponsor) return false;
      if (gHousing && r[REQ_CI.housing] !== gHousing) return false;
      if (gSearch) {
        const hay = [r[REQ_CI.company],r[REQ_CI.dept],r[REQ_CI.position],r[REQ_CI.city]].join(' ').toLowerCase();
        if (!hay.includes(gSearch)) return false;
      }
      if (cf1 && r[REQ_CI.dept]    !== cf1) return false;
      if (cf4 && r[REQ_CI.sponsor] !== cf4) return false;
      for (const [ci, fv] of Object.entries(colFilters)) {
        if (!String(r[ci]||'').toLowerCase().includes(fv)) return false;
      }
      return true;
    });

    // Re-apply sort if active
    if (_reqSortCol !== null) {
      _currentRows = [..._currentRows].sort((a,b) => {
        let av = a[_reqSortCol]||'', bv = b[_reqSortCol]||'';
        if (_reqSortCol===3) { av=parseInt(av)||0; bv=parseInt(bv)||0; }
        const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv));
        return _reqSortDir==='asc' ? cmp : -cmp;
      });
    }
    refreshTable();
    refreshCharts(_currentRows);
  }

  ['reqSearch','reqDeptFilter','reqSponsorFilter','reqHousingFilter','reqCF1','reqCF4'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyAllFilters);
  });
  document.querySelectorAll('.req-col-f').forEach(el => el.addEventListener('input', applyAllFilters));

  document.getElementById('reqClearBtn')?.addEventListener('click', () => {
    ['reqSearch','reqDeptFilter','reqSponsorFilter','reqHousingFilter','reqCF1','reqCF4'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('.req-col-f').forEach(el => { el.value = ''; });
    _reqSortCol = null; _reqSortDir = 'asc';
    document.querySelectorAll('#reqSortRow .sort-icon').forEach(el => { el.textContent=' ⇅'; el.style.opacity='0.4'; });
    _currentRows = [...rows];
    refreshTable();
    refreshCharts(_currentRows);
  });

  // ── details modal ──────────────────────────────────────────────
  function openDetails(idx) {
    const r = rows[idx];
    if (!r) return;
    const fld = (label, val, full) => val
      ? `<div style="${full?'grid-column:1/-1;':''}margin-bottom:14px;">
           <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#888);margin-bottom:3px;">${label}</div>
           <div style="font-size:13px;font-weight:500;">${escH(val)}</div>
         </div>` : '';

    document.getElementById('modalTitle').textContent = r[REQ_CI.company] || 'Requisition Details';
    document.getElementById('modalBody').innerHTML = `
      <div style="padding:4px 0 12px;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
          ${progTags(r[REQ_CI.progType])}
          <span style="padding:4px 12px;border-radius:20px;background:rgba(27,58,107,0.1);color:#1B3A6B;font-size:12px;font-weight:700;">${escH(r[REQ_CI.dept]||'')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:18px;padding:14px 18px;background:rgba(176,26,24,0.06);
          border-radius:12px;border:1px solid rgba(176,26,24,0.14);margin-bottom:18px;">
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${C};">Headcount</div>
            <div style="font-size:40px;font-weight:800;color:${C};line-height:1.1;">${r[REQ_CI.slots]||'0'}</div>
          </div>
          <div style="border-left:1px solid rgba(176,26,24,0.18);padding-left:18px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-secondary,#888);">Position</div>
            <div style="font-size:16px;font-weight:700;margin-top:4px;">${escH(r[REQ_CI.position]||'—')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
          ${fld('Sponsor', r[REQ_CI.sponsor])}
          ${fld('Contract Length', r[REQ_CI.contract])}
          ${fld('Salary', r[REQ_CI.salary])}
          ${fld('City', r[REQ_CI.city])}
          ${fld('Start Date', r[REQ_CI.start])}
          ${fld('Target Date', r[REQ_CI.target])}
          ${fld('Housing', r[REQ_CI.housing], true)}
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
      document.getElementById('modalOverlay').classList.remove('active');
  });

  // ── Chart 1: Headcount by Sponsor (doughnut — Placement style) ─
  const sponsorMap = {};
  rows.forEach(r => { const s=r[REQ_CI.sponsor]||'?'; sponsorMap[s]=(sponsorMap[s]||0)+(parseInt(r[REQ_CI.slots])||0); });
  const spSorted = Object.entries(sponsorMap).sort((a,b)=>b[1]-a[1]);

  createChart('reqSponsorChart', {
    type: 'doughnut',
    plugins: DL ? [DL] : [],
    data: {
      labels: spSorted.map(e=>e[0]),
      datasets: [{
        data: spSorted.map(e=>e[1]),
        backgroundColor: spSorted.map((_,i)=>SP_COLORS[i%SP_COLORS.length]),
        borderWidth: 2,
        borderColor: 'var(--card-bg,#fff)'
      }]
    },
    options: {
      responsive: true,
      cutout: '52%',
      plugins: {
        legend: { position: 'bottom' },
        datalabels: DL ? {
          display: (ctx) => {
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            return total ? ctx.dataset.data[ctx.dataIndex] / total >= 0.05 : false;
          },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct   = Math.round(v / total * 100);
            return `${ctx.chart.data.labels[ctx.dataIndex]}\n${v.toLocaleString()} (${pct}%)`;
          },
          color: '#fff',
          font: { size: 11, weight: 'bold' },
          textAlign: 'center'
        } : false
      }
    }
  });

  // ── Chart 2: Fulfillment by Department (stacked: Filled green + Remaining orange) ─
  // Filled = actual placements from J1_OFFLINE_DATA (auto-syncs when data updates)
  const { depts: fulfillDepts, filled: fulfillFilled, remaining: fulfillRemaining } = buildFulfillData(rows);

  createChart('reqFulfillChart', {
    type: 'bar',
    plugins: DL ? [DL] : [],
    data: {
      labels: fulfillDepts,
      datasets: [
        { label: 'Filled',
          data: fulfillFilled,
          backgroundColor: hexToRgba('#059669',0.85),
          borderRadius: 0, stack: 'f' },
        { label: 'Remaining',
          data: fulfillRemaining,
          backgroundColor: hexToRgba('#D97706',0.85),
          borderRadius: [0,4,4,0], stack: 'f' }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout:{ padding:{ right: 60 } },
      plugins:{
        legend:{
          position: 'top',
          labels:{ font:{size:12}, usePointStyle:true, pointStyle:'circle', padding:16 }
        },
        tooltip:{ mode:'index', intersect:false,
          callbacks:{
            footer: items => {
              const filled    = items.find(i=>i.datasetIndex===0)?.parsed.x || 0;
              const remaining = items.find(i=>i.datasetIndex===1)?.parsed.x || 0;
              const total = filled + remaining;
              return total ? `Total: ${total.toLocaleString()}  ·  Fill rate: ${Math.round(filled/total*100)}%` : '';
            }
          }
        },
        datalabels: DL ? {
          font:{ size:11, weight:'700' },
          display: ctx => (ctx.dataset.data[ctx.dataIndex] || 0) > 0,
          // Filled (ds0): value inside segment in white
          // Remaining (ds1): value inside + total OUTSIDE at bar end
          anchor: ctx => ctx.datasetIndex === 0 ? 'center' : 'end',
          align:  ctx => ctx.datasetIndex === 0 ? 'center' : 'end',
          offset: ctx => ctx.datasetIndex === 0 ? 0 : 6,
          color:  ctx => ctx.datasetIndex === 0 ? '#fff' : 'var(--text,#1A1A1A)',
          formatter: (v, ctx) => {
            if (ctx.datasetIndex === 0) return v > 0 ? v.toLocaleString() : '';
            const total = ctx.chart.data.datasets.reduce((s,ds)=>s+(ds.data[ctx.dataIndex]||0),0);
            return total > 0 ? total.toLocaleString() : '';
          }
        } : false
      },
      scales:{
        x:{ stacked:true, grid:{color:'rgba(0,0,0,0.05)'}, ticks:{font:{size:11}}, beginAtZero:true },
        y:{ stacked:true, grid:{display:false}, ticks:{font:{size:11}} }
      }
    }
  });

  // ── Chart 3: Headcount by Start Date (full-width line, SUM headcount) ─
  const monthMap={};
  rows.forEach(r => {
    const raw=r[REQ_CI.start]; if(!raw) return;
    const m=raw.substring(0,7);
    monthMap[m]=(monthMap[m]||0)+(parseInt(r[REQ_CI.slots])||0);
  });
  const sortedM = Object.keys(monthMap).sort();
  const mLabels = sortedM.map(m=>{ const [y,mo]=m.split('-'); return new Date(+y,+mo-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
  const mCumul  = sortedM.map((_,i)=>sortedM.slice(0,i+1).reduce((t,k)=>t+(monthMap[k]||0),0));

  createChart('reqDateChart', {
    type: 'line',
    plugins: DL ? [DL] : [],
    data: { labels:mLabels, datasets:[
      { label:'Headcount',
        data: sortedM.map(m=>monthMap[m]),
        borderColor:C, backgroundColor:hexToRgba(C,0.08), borderWidth:2.5,
        pointRadius:5, pointHoverRadius:8, pointBackgroundColor:C,
        fill:true, tension:0.3, yAxisID:'y' },
      { label:'Cumulative Headcount',
        data: mCumul,
        borderColor:'#6B47DC', backgroundColor:'transparent', borderWidth:2, borderDash:[5,4],
        pointRadius:3, pointHoverRadius:6, pointBackgroundColor:'#6B47DC',
        fill:false, tension:0.3, yAxisID:'y2' }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'top', labels:{ font:{size:12}, usePointStyle:true, pointStyle:'circle', padding:16 } },
        datalabels: DL ? {
          display: ctx => ctx.datasetIndex === 0 && (ctx.dataset.data[ctx.dataIndex] || 0) > 0,
          anchor: 'end',
          align: 'top',
          offset: 4,
          font:{ size:11, weight:'700' },
          color: C,
          formatter: v => v > 0 ? v.toLocaleString() : ''
        } : false
      },
      scales:{
        x:{ grid:{color:'rgba(0,0,0,0.04)'}, ticks:{font:{size:11}, maxRotation:45} },
        y:{ grid:{color:'rgba(0,0,0,0.05)'}, ticks:{font:{size:11}}, beginAtZero:true,
            title:{display:true, text:'Headcount', font:{size:10}, color:'var(--text-secondary,#888)'} },
        y2:{ position:'right', grid:{display:false}, ticks:{font:{size:11}}, beginAtZero:true,
             title:{display:true, text:'Cumulative', font:{size:10}, color:'#6B47DC'} }
      }
    }
  });
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
pages.travel = async function () {
  const C       = DIVISION_COLORS.j1;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Resolve ticket category from actual Zoho field values:
  //   Flight Ticket Status:  "" | "Requested" | "Ticket Issued"
  //   Ticket Payment Status: "" | "Paid"
  function resolveCategory(flightStatus, payStatus, daysUntil) {
    const f = (flightStatus || '').toLowerCase().trim();
    const p = (payStatus    || '').toLowerCase().trim();
    if (f.includes('issued')) {
      return (daysUntil !== null && daysUntil < 0) ? 'departed' : 'issued';
    }
    if (p === 'paid')         return 'paid';
    if (f === 'requested')    return 'requested';
    if (!f && !p)             return 'none';
    return 'other';
  }
  // Keep legacy alias so the old ticketCategory(raw) calls below still work
  function ticketCategory(raw) {
    const s = (raw || '').toLowerCase().trim();
    if (!s || s === 'n/a' || s === 'none' || s === 'no ticket' || s === 'not yet' || s === '-' || s === '—') return 'none';
    if (/paid|payment/.test(s))                                return 'paid';
    if (/issued|booked|confirmed|ticketed|e.?ticket/.test(s))  return 'issued';
    if (/departed|checked.?in|in.?transit/.test(s))            return 'departed';
    if (/cancel|refund/.test(s))                               return 'cancelled';
    return 'other';
  }

  // Top pipeline cards — departure (first 4) + return ticket (last 2)
  const STAGES = [
    { key:'none',          label:'No Ticket',        icon:'🚫', color:'#B01A18', bg:'rgba(176,26,24,0.10)'   },
    { key:'requested',     label:'Requested',        icon:'📋', color:'#B87A14', bg:'rgba(184,122,20,0.10)'  },
    { key:'issued',        label:'Issued',           icon:'✈️', color:'#059669', bg:'rgba(5,150,105,0.10)'   },
    { key:'departed',      label:'Departed',         icon:'🛫', color:'#1B3A6B', bg:'rgba(27,58,107,0.10)'   },
    { key:'ret_requested', label:'Rtn Requested',    icon:'📋', color:'#7C3AED', bg:'rgba(124,58,237,0.10)'  },
    { key:'ret_issued',    label:'Rtn Issued',       icon:'🏠', color:'#0891B2', bg:'rgba(8,145,178,0.10)'   },
  ];
  // Full badge palette — used for ticket status badges in table & side panel
  const BADGE_STAGES = [
    { key:'none',      label:'No Ticket', icon:'🚫', color:'#B01A18', bg:'rgba(176,26,24,0.10)'   },
    { key:'requested', label:'Requested', icon:'📋', color:'#B87A14', bg:'rgba(184,122,20,0.10)'  },
    { key:'paid',      label:'Paid',      icon:'💳', color:'#6B47DC', bg:'rgba(107,71,220,0.10)'  },
    { key:'issued',    label:'Issued',    icon:'✈️', color:'#059669', bg:'rgba(5,150,105,0.10)'   },
    { key:'departed',  label:'Departed',  icon:'🛫', color:'#1B3A6B', bg:'rgba(27,58,107,0.10)'   },
    { key:'other',     label:'Other',     icon:'🔄', color:'#64748B', bg:'rgba(100,116,139,0.10)' },
  ];

  // Parse columns+rows into structured objects — maps to J1 Participants field names
  function parseRows(columns, rows) {
    const fi = (pats) => {
      for (const p of pats) {
        const i = columns.findIndex(c => p.test(c));
        if (i >= 0) return i;
      }
      return -1;
    };
    const idx = {
      firstName:       fi([/^First Name$/i]),
      lastName:        fi([/^Last Name$/i]),
      name:            fi([/^Full Name$/i, /^full.?name$/i]),
      host:            fi([/^Hosting Company$/i, /hosting.?company/i]),
      departure:       fi([/^Departure Date$/i]),
      returnDate:      fi([/^Return Departure Date$/i]),   // when they fly back home
      flightStatus:    fi([/^Flight Ticket Status$/i]),
      payStatus:       fi([/^Ticket Payment Status$/i]),
      retFlightStatus: fi([/^Return Flight Ticket Status$/i]),
      retPayStatus:    fi([/^Return Ticket Payment Status$/i]),
      sponsor:         fi([/^Processing Sponsor$/i, /processing.?sponsor/i]),
      airline:         fi([/^Airline$/i]),
      flightNo:        fi([/^Airline PNR Number$/i]),
      retAirline:      fi([/^Return Airline$/i]),
      retFlightNo:     fi([/^Return Airline PNR Number$/i]),
      country:         fi([/^Country$/i]),
      appStatus:       fi([/^J1 Application Status$/i]),
      job:             fi([/^Selected Job$/i]),
      tripTo:          fi([/^Trip To$/i]),
    };
    const today = new Date(); today.setHours(0,0,0,0);
    return rows.map((row, i) => {
      const g = (k) => idx[k] >= 0 ? String(row[idx[k]] ?? '').trim() : '';
      const first = g('firstName'), last = g('lastName');
      const fullName = (first || last) ? `${first} ${last}`.trim() : g('name') || `Participant ${i+1}`;
      const depRaw = g('departure'), retRaw = g('returnDate');
      const flightStatus = g('flightStatus'), payStatus = g('payStatus');
      const retFlightStatus = g('retFlightStatus'), retPayStatus = g('retPayStatus');
      let daysUntil = null;
      if (depRaw) {
        const d = new Date(depRaw);
        if (!isNaN(d)) { d.setHours(0,0,0,0); daysUntil = Math.floor((d - today) / 86400000); }
      }
      return {
        fullName, host: g('host'), departure: depRaw, returnDate: retRaw,
        flightStatus, payStatus, retFlightStatus, retPayStatus,
        category:    resolveCategory(flightStatus,    payStatus,    daysUntil),
        retCategory: resolveCategory(retFlightStatus, retPayStatus, null),
        depLabel:    flightStatus || payStatus    || '',
        retLabel:    retFlightStatus || retPayStatus || '',
        sponsor: g('sponsor'), airline: g('airline'), flightNo: g('flightNo'),
        retAirline: g('retAirline'), retFlightNo: g('retFlightNo'),
        country: g('country'), appStatus: g('appStatus'), job: g('job'),
        tripTo: g('tripTo'), daysUntil,
        allFields: columns.map((c, ci) => [c, String(row[ci] ?? '')])
      };
    });
  }

  // Departure date cell: date + colour-coded urgency badge
  function urgencyTag(daysUntil, depRaw) {
    if (!depRaw) return '<span style="color:var(--text-muted,#aaa);">—</span>';
    const color = daysUntil === null ? '#888'
      : daysUntil < 0   ? '#64748B'
      : daysUntil <= 7  ? '#B01A18'
      : daysUntil <= 14 ? '#D97706'
      : daysUntil <= 30 ? '#B87A14'
      : '#059669';
    const label = daysUntil === null   ? ''
      : daysUntil < 0  ? `${Math.abs(daysUntil)}d ago`
      : daysUntil === 0 ? 'Today!'
      : `in ${daysUntil}d`;
    return `<div style="font-weight:600;font-size:12px;line-height:1.4;">${depRaw}</div>`
      + (label ? `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:${color}18;color:${color};">${label}</span>` : '');
  }

  function ticketBadge(category, label) {
    const stg = BADGE_STAGES.find(s => s.key === category) || BADGE_STAGES[BADGE_STAGES.length-1];
    return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
      background:${stg.bg};color:${stg.color};white-space:nowrap;">
      ${stg.icon} ${label || stg.label}
    </span>`;
  }

  function rowHtml(p, dispIdx, origIdx) {
    const urgent = p.daysUntil !== null && p.daysUntil <= 14 && p.category === 'none';
    const flight = [p.airline, p.flightNo].filter(Boolean).join(' · ');
    return `<tr data-idx="${origIdx}" ${urgent ? 'style="background:rgba(176,26,24,0.04);"' : ''}>
      <td style="color:var(--text-muted,#888);font-size:12px;">${dispIdx+1}</td>
      <td>
        <strong>${p.fullName}</strong>
        ${p.country ? `<div style="font-size:11px;color:var(--text-muted,#888);">${p.country}</div>` : ''}
      </td>
      <td style="font-size:13px;">${p.host || '—'}</td>
      <td>${urgencyTag(p.daysUntil, p.departure)}</td>
      <td style="font-size:12px;color:var(--text-secondary,#555);">${p.returnDate || '—'}</td>
      <td>${ticketBadge(p.category,    p.depLabel)}</td>
      <td>${ticketBadge(p.retCategory, p.retLabel)}</td>
      <td style="font-size:12px;">${p.sponsor || '—'}</td>
      <td style="font-size:11px;color:var(--text-muted,#888);">${flight || '—'}</td>
      <td>
        <button class="travel-view-btn" data-idx="${origIdx}"
          style="padding:4px 12px;border:1.5px solid ${C};border-radius:6px;
          font-size:11px;font-weight:700;color:${C};background:transparent;cursor:pointer;">
          View
        </button>
      </td>
    </tr>`;
  }

  // ── Fetch live data from server ──────────────────────────────
  let columns = [], rows = [], viewName = '', errorMsg = null;
  try {
    const res  = await fetch('/api/zoho/j1-travel');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Fetch failed');
    viewName = json.view || 'J1 Travel';
    columns  = json.data?.columns || [];
    rows     = json.data?.rows    || [];
  } catch (e) { errorMsg = e.message; }

  const people   = parseRows(columns, rows);
  const total    = people.length;
  const counts = Object.fromEntries(STAGES.map(s => [s.key, 0]));
  people.forEach(p => {
    if (p.category in counts) counts[p.category]++;
    if (p.retCategory === 'requested') counts.ret_requested++;
    else if (p.retCategory === 'issued') counts.ret_issued++;
  });
  const authErr  = errorMsg && (errorMsg.includes('NOT_AUTHENTICATED') || errorMsg.includes('401'));
  const sponsors = [...new Set(people.map(p => p.sponsor).filter(Boolean))].sort();

  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${C}">
        <h1>Travel</h1>
        <p class="subtitle">J1 Travel &nbsp;·&nbsp; ticket status &amp; departure tracker &nbsp;·&nbsp; ${total} participants${viewName ? ' &nbsp;·&nbsp; <em>' + viewName + '</em>' : ''}</p>
      </div>
    </div>

    ${errorMsg && !people.length ? `
    <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;
      background:rgba(176,26,24,0.07);border:1px solid rgba(176,26,24,0.25);
      border-radius:10px;margin-bottom:22px;">
      <span style="font-size:22px;">${authErr ? '🔑' : '⚠️'}</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:#B01A18;margin-bottom:4px;">
          ${authErr ? 'Server not connected' : 'Travel data unavailable'}
        </div>
        <div style="font-size:13px;color:var(--text-secondary,#555);">
          ${authErr
            ? 'Start the Node.js server and <a href="/auth/zoho" style="color:#B01A18;font-weight:700;text-decoration:underline;">reconnect Zoho →</a>'
            : errorMsg}
        </div>
      </div>
    </div>` : ''}

    <!-- ── Ticket status pipeline — click any card to filter ── -->
    <div style="display:flex;align-items:stretch;gap:0;margin-bottom:24px;overflow-x:auto;">
      ${STAGES.map((s, i) => `
        ${i > 0 ? '<div style="display:flex;align-items:center;padding:0 2px;color:var(--text-muted,#bbb);font-size:16px;flex-shrink:0;">›</div>' : ''}
        <div class="travel-stage-card" data-stage="${s.key}"
          style="flex:1;min-width:105px;padding:16px 10px;text-align:center;cursor:pointer;
            background:${s.bg};border:1px solid ${s.color}30;transition:opacity 0.2s,box-shadow 0.15s;
            border-radius:${i===0?'12px 0 0 12px':i===STAGES.length-1?'0 12px 12px 0':'0'};
            border-left:${i>0?'none':'1px solid '+s.color+'30'};">
          <div style="font-size:24px;line-height:1;margin-bottom:6px;">${s.icon}</div>
          <div style="font-size:30px;font-weight:800;color:${s.color};line-height:1.1;">${counts[s.key]}</div>
          <div style="font-size:10px;font-weight:700;color:${s.color};margin-top:5px;
            text-transform:uppercase;letter-spacing:0.06em;line-height:1.4;">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- ── Filter bar ── -->
    <div class="card mb-24" style="padding:14px 20px;">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
        <input id="travelSearch" type="search" placeholder="🔍 Search name or host…"
          style="flex:1;min-width:180px;max-width:260px;padding:7px 12px;
            border:1.5px solid var(--border,#ddd);border-radius:8px;
            font-size:13px;background:var(--input-bg,#fff);color:var(--text,#111);">
        <select id="travelStatusFilter"
          style="padding:7px 12px;border:1.5px solid var(--border,#ddd);border-radius:8px;
            font-size:13px;background:var(--input-bg,#fff);color:var(--text,#111);">
          <option value="">All Statuses</option>
          ${STAGES.map(s => `<option value="${s.key}">${s.icon} ${s.label} (${counts[s.key]})</option>`).join('')}
        </select>
        <select id="travelSponsorFilter"
          style="padding:7px 12px;border:1.5px solid var(--border,#ddd);border-radius:8px;
            font-size:13px;background:var(--input-bg,#fff);color:var(--text,#111);
            ${sponsors.length <= 1 ? 'display:none;' : ''}">
          <option value="">All Sponsors</option>
          ${sponsors.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="travelSort"
          style="padding:7px 12px;border:1.5px solid var(--border,#ddd);border-radius:8px;
            font-size:13px;background:var(--input-bg,#fff);color:var(--text,#111);">
          <option value="dep_asc">↑ Departure — soonest first</option>
          <option value="dep_desc">↓ Departure — latest first</option>
          <option value="name_asc">A–Z Name</option>
          <option value="urgent">🚨 Urgent — no ticket + soonest</option>
        </select>
        <button id="travelClearBtn"
          style="padding:7px 14px;border:1.5px solid var(--border,#ddd);border-radius:8px;
            font-size:12px;font-weight:600;cursor:pointer;
            background:var(--input-bg,#fff);color:var(--text-muted,#888);">✕ Clear</button>
        <span id="travelCount" style="margin-left:auto;font-size:12px;font-weight:600;
          color:var(--text-muted,#888);">${total} participants</span>
      </div>
    </div>

    <!-- Data store for pageEvents -->
    <script type="application/json" id="travelData">${JSON.stringify({ people, stages: STAGES, badgeStages: BADGE_STAGES })}<\/script>

    <!-- ── Table ── -->
    <div class="card" style="overflow:hidden;">
      <div class="table-wrap">
        <table id="travelTable">
          <thead><tr>
            <th style="width:36px;">#</th>
            <th>Name</th>
            <th>Hosting Company</th>
            <th>✈️ Departure</th>
            <th>🏠 Return</th>
            <th>Dep. Ticket</th>
            <th>Return Ticket</th>
            <th>Sponsor</th>
            <th>Flight Info</th>
            <th></th>
          </tr></thead>
          <tbody id="travelTbody">
            ${people.length === 0
              ? `<tr><td colspan="10" style="text-align:center;padding:56px 24px;
                  color:var(--text-muted,#aaa);font-size:13px;">
                  No travel data found — check server connection
                </td></tr>`
              : people.map((p, i) => rowHtml(p, i, i)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
};

// ── Travel page events (filters, sort, side panel) ────────────
pageEvents.travel = function () {
  const el = document.getElementById('travelData');
  if (!el) return;
  let parsed;
  try { parsed = JSON.parse(el.textContent); } catch { return; }

  const { people, stages, badgeStages } = parsed;
  const STAGES_MAP      = Object.fromEntries(stages.map(s => [s.key, s]));
  const BADGE_STAGES_MAP = Object.fromEntries((badgeStages || stages).map(s => [s.key, s]));
  const C = DIVISION_COLORS.j1;

  const tbody    = document.getElementById('travelTbody');
  const search   = document.getElementById('travelSearch');
  const statSel  = document.getElementById('travelStatusFilter');
  const sponSel  = document.getElementById('travelSponsorFilter');
  const sortSel  = document.getElementById('travelSort');
  const countEl  = document.getElementById('travelCount');
  const clearBtn = document.getElementById('travelClearBtn');

  function urgencyTag(daysUntil, depRaw) {
    if (!depRaw) return '<span style="color:var(--text-muted,#aaa);">—</span>';
    const color = daysUntil === null ? '#888'
      : daysUntil < 0   ? '#64748B'
      : daysUntil <= 7  ? '#B01A18'
      : daysUntil <= 14 ? '#D97706'
      : daysUntil <= 30 ? '#B87A14'
      : '#059669';
    const label = daysUntil === null   ? ''
      : daysUntil < 0  ? `${Math.abs(daysUntil)}d ago`
      : daysUntil === 0 ? 'Today!'
      : `in ${daysUntil}d`;
    return `<div style="font-weight:600;font-size:12px;line-height:1.4;">${depRaw}</div>`
      + (label ? `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:${color}18;color:${color};">${label}</span>` : '');
  }

  function ticketBadge(category, label) {
    const stg = BADGE_STAGES_MAP[category] || (badgeStages || stages)[((badgeStages || stages).length-1)];
    return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
      background:${stg.bg};color:${stg.color};white-space:nowrap;">
      ${stg.icon} ${label || stg.label}
    </span>`;
  }

  function rowHtml(p, dispIdx, origIdx) {
    const urgent = p.daysUntil !== null && p.daysUntil <= 14 && p.category === 'none';
    const flight = [p.airline, p.flightNo].filter(Boolean).join(' · ');
    return `<tr data-idx="${origIdx}" ${urgent ? 'style="background:rgba(176,26,24,0.04);"' : ''}>
      <td style="color:var(--text-muted,#888);font-size:12px;">${dispIdx+1}</td>
      <td>
        <strong>${p.fullName}</strong>
        ${p.country ? `<div style="font-size:11px;color:var(--text-muted,#888);">${p.country}</div>` : ''}
      </td>
      <td style="font-size:13px;">${p.host || '—'}</td>
      <td>${urgencyTag(p.daysUntil, p.departure)}</td>
      <td style="font-size:12px;color:var(--text-secondary,#555);">${p.returnDate || '—'}</td>
      <td>${ticketBadge(p.category,    p.depLabel)}</td>
      <td>${ticketBadge(p.retCategory, p.retLabel)}</td>
      <td style="font-size:12px;">${p.sponsor || '—'}</td>
      <td style="font-size:11px;color:var(--text-muted,#888);">${flight || '—'}</td>
      <td>
        <button class="travel-view-btn" data-idx="${origIdx}"
          style="padding:4px 12px;border:1.5px solid ${C};border-radius:6px;
          font-size:11px;font-weight:700;color:${C};background:transparent;cursor:pointer;">
          View
        </button>
      </td>
    </tr>`;
  }

  function openPanel(p) {
    const stg = BADGE_STAGES_MAP[p.category] || (badgeStages||stages)[(badgeStages||stages).length-1];
    const urgColor = p.daysUntil === null ? '#888'
      : p.daysUntil < 0   ? '#64748B'
      : p.daysUntil <= 7  ? '#B01A18'
      : p.daysUntil <= 14 ? '#D97706'
      : p.daysUntil <= 30 ? '#B87A14'
      : '#059669';
    const urgLabel = p.daysUntil === null   ? ''
      : p.daysUntil < 0  ? `${Math.abs(p.daysUntil)} days ago`
      : p.daysUntil === 0 ? 'Today!'
      : `in ${p.daysUntil} days`;

    const retStg = BADGE_STAGES_MAP[p.retCategory] || (badgeStages||stages)[(badgeStages||stages).length-1];

    document.getElementById('panelTitle').textContent = p.fullName || 'Participant';
    document.getElementById('panelBody').innerHTML = `
      <!-- Outbound ticket status -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 2px 12px;">
        <div style="text-align:center;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
            color:var(--text-muted,#888);margin-bottom:5px;">Departure Ticket</div>
          <span style="font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;
            background:${stg.bg};color:${stg.color};">${stg.icon} ${p.depLabel || stg.label}</span>
        </div>
        <div style="text-align:center;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
            color:var(--text-muted,#888);margin-bottom:5px;">Return Ticket</div>
          <span style="font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;
            background:${retStg.bg};color:${retStg.color};">${retStg.icon} ${p.retLabel || retStg.label}</span>
        </div>
      </div>

      <!-- Departure + Return date cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;padding:0 2px;">
        <div style="padding:14px;background:var(--surface,#f5f5f5);border-radius:10px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
            color:var(--text-muted,#888);margin-bottom:5px;">✈️ Departure</div>
          <div style="font-size:16px;font-weight:800;">${p.departure || '—'}</div>
          ${urgLabel ? `<div style="font-size:11px;font-weight:700;color:${urgColor};margin-top:4px;">${urgLabel}</div>` : ''}
        </div>
        <div style="padding:14px;background:var(--surface,#f5f5f5);border-radius:10px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
            color:var(--text-muted,#888);margin-bottom:5px;">🏠 Return</div>
          <div style="font-size:16px;font-weight:800;">${p.returnDate || '—'}</div>
        </div>
      </div>

      <!-- Outbound flight info -->
      ${(p.airline || p.flightNo) ? `
      <div style="padding:10px 14px;background:var(--surface,#f5f5f5);border-radius:10px;
        margin-bottom:10px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">🛩️</span>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--text-muted,#888);margin-bottom:2px;">OUTBOUND</div>
          ${p.airline  ? `<div style="font-size:13px;font-weight:600;">${p.airline}</div>` : ''}
          ${p.flightNo ? `<div style="font-size:11px;color:var(--text-muted,#888);font-family:monospace;">${p.flightNo}</div>` : ''}
        </div>
      </div>` : ''}
      <!-- Return flight info -->
      ${(p.retAirline || p.retFlightNo) ? `
      <div style="padding:10px 14px;background:var(--surface,#f5f5f5);border-radius:10px;
        margin-bottom:14px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">🔄</span>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--text-muted,#888);margin-bottom:2px;">RETURN</div>
          ${p.retAirline  ? `<div style="font-size:13px;font-weight:600;">${p.retAirline}</div>` : ''}
          ${p.retFlightNo ? `<div style="font-size:11px;color:var(--text-muted,#888);font-family:monospace;">${p.retFlightNo}</div>` : ''}
        </div>
      </div>` : ''}

      <div style="border-top:1px solid var(--border,#eee);padding-top:14px;">
        ${(p.allFields || []).filter(([,v]) => v && v.trim() && v !== '0').map(([k,v]) => `
          <div style="display:flex;padding:6px 4px;border-bottom:1px solid var(--border,#f0f0f0);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted,#888);
              min-width:130px;flex-shrink:0;">${k}</div>
            <div style="font-size:12px;color:var(--text,#111);word-break:break-word;">${v}</div>
          </div>`).join('')}
      </div>`;

    document.getElementById('sidePanel').classList.add('open');
    document.getElementById('panelOverlay')?.classList.add('active');
  }

  function attachViewBtns() {
    tbody?.querySelectorAll('.travel-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = people[+btn.dataset.idx];
        if (p) openPanel(p);
      });
    });
  }

  function applyFilters() {
    const q      = (search?.value  || '').toLowerCase().trim();
    const status = statSel?.value  || '';
    const spon   = sponSel?.value  || '';
    const sort   = sortSel?.value  || 'dep_asc';

    let filtered = people.map((p, i) => ({ ...p, _orig: i }));
    if (q)      filtered = filtered.filter(p => `${p.fullName} ${p.host}`.toLowerCase().includes(q));
    if (status) {
      if (status === 'ret_requested') filtered = filtered.filter(p => p.retCategory === 'requested');
      else if (status === 'ret_issued') filtered = filtered.filter(p => p.retCategory === 'issued');
      else filtered = filtered.filter(p => p.category === status);
    }
    if (spon)   filtered = filtered.filter(p => p.sponsor === spon);

    const nullLast = (a, b, mul) => {
      if (a === null && b === null) return 0;
      if (a === null) return 1; if (b === null) return -1;
      return (a - b) * mul;
    };
    filtered.sort((a, b) => {
      if (sort === 'name_asc')  return a.fullName.localeCompare(b.fullName);
      if (sort === 'dep_asc')   return nullLast(a.daysUntil, b.daysUntil,  1);
      if (sort === 'dep_desc')  return nullLast(a.daysUntil, b.daysUntil, -1);
      if (sort === 'urgent') {
        const aU = a.category === 'none' ? 0 : 1, bU = b.category === 'none' ? 0 : 1;
        if (aU !== bU) return aU - bU;
        return nullLast(a.daysUntil, b.daysUntil, 1);
      }
      return 0;
    });

    if (!tbody) return;
    tbody.innerHTML = filtered.length === 0
      ? `<tr><td colspan="9" style="text-align:center;padding:52px;color:var(--text-muted,#aaa);">No participants match the current filters</td></tr>`
      : filtered.map((p, di) => rowHtml(p, di, p._orig)).join('');

    if (countEl) countEl.textContent = filtered.length === people.length
      ? `${people.length} participants`
      : `${filtered.length} of ${people.length}`;

    attachViewBtns();
  }

  // Pipeline stage card → click to filter by that status
  document.querySelectorAll('.travel-stage-card').forEach(card => {
    card.addEventListener('click', () => {
      const stage = card.dataset.stage;
      const active = statSel.value === stage;
      statSel.value = active ? '' : stage;
      document.querySelectorAll('.travel-stage-card').forEach(c => {
        c.style.boxShadow = '';
        c.style.opacity   = active ? '1' : (c.dataset.stage === stage ? '1' : '0.55');
      });
      if (active) document.querySelectorAll('.travel-stage-card').forEach(c => c.style.opacity = '1');
      else card.style.boxShadow = `0 0 0 3px ${(STAGES_MAP[stage] || BADGE_STAGES_MAP[stage])?.color || '#888'}`;
      applyFilters();
    });
  });

  [search, statSel, sponSel, sortSel].forEach(el => el?.addEventListener('input', applyFilters));

  clearBtn?.addEventListener('click', () => {
    if (search)  search.value  = '';
    if (statSel) statSel.value = '';
    if (sponSel) sponSel.value = '';
    if (sortSel) sortSel.value = 'dep_asc';
    document.querySelectorAll('.travel-stage-card').forEach(c => { c.style.boxShadow = ''; c.style.opacity = '1'; });
    applyFilters();
  });

  document.getElementById('panelClose')?.addEventListener('click', () => {
    document.getElementById('sidePanel')?.classList.remove('open');
    document.getElementById('panelOverlay')?.classList.remove('active');
  });
  document.getElementById('panelOverlay')?.addEventListener('click', () => {
    document.getElementById('sidePanel')?.classList.remove('open');
    document.getElementById('panelOverlay')?.classList.remove('active');
  });

  // Initial render with default sort (soonest departure first)
  applyFilters();
};

// ============================
// PAGE: SETTINGS
// ============================
pages.settings = async function () {
  const divs = [
    {key:'cruise',label:'Cruise Line Recruitment'},
    {key:'j1',    label:'J1 Cultural Exchange'},
    {key:'marine',label:'Marine Travel'},
    {key:'visa',  label:'Visa Services'}
  ];
  const users = [
    { name:'CTI IT Team', email:'CTI-IT-Team@cti-usa.com', role:'Administrator' }
  ];
  return `
    <div class="page-header"><h1>Settings</h1>
      <p class="subtitle">Configure your CTI Group Command Center</p></div>

    <div class="settings-section"><h3>Company Information</h3>
      <div class="settings-grid">
        <div class="settings-field"><label>Company Name</label>
          <input value="CTI Group Worldwide Services, Inc."></div>
        <div class="settings-field"><label>Phone</label>
          <input value="+1 954-568-5900"></div>
        <div class="settings-field"><label>Email</label>
          <input value="info@cti-usa.com"></div>
        <div class="settings-field"><label>Website</label>
          <input value="www.cti-usa.com"></div>
      </div>
      <div class="settings-field"><label>Address</label>
        <input value="6600 NW 16th St, Suite 8, Plantation, FL 33313, USA"></div>
      <div style="margin-top:12px;">
        <button class="btn btn-primary" onclick="showToast('Company info saved.')">Save Changes</button>
      </div>
    </div>

    <div class="settings-section"><h3>Divisions</h3>
      ${divs.map(d => `<div class="toggle-row"><span>${d.label}</span>
        <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
      </div>`).join('')}
    </div>

    <div class="settings-section"><h3>Users &amp; Access</h3>
      <div class="table-wrap" style="margin-bottom:14px;">
        <table><thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Actions</th>
        </tr></thead>
        <tbody>${users.map(u => `<tr>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td><span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:12px;
            background:rgba(27,58,107,0.12);color:#1B3A6B;">${u.role}</span></td>
          <td><button class="btn-sm"
            onclick="showToast('Contact CTI-IT-Team@cti-usa.com to modify user access.','info')">
            Edit</button></td>
        </tr>`).join('')}</tbody></table>
      </div>
      <button class="btn btn-secondary"
        onclick="showToast('Contact CTI-IT-Team@cti-usa.com to request new user access.','info')">
        + Invite User
      </button>
    </div>

    <div class="settings-section"><h3>Data Management</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="showToast('Import dialog opened.','info')">Import CSV</button>
        <button class="btn btn-secondary" onclick="showToast('Cache cleared.','success')">Clear Cache</button>
      </div>
    </div>

    <div class="settings-section"><h3>Appearance</h3>
      <div class="toggle-row">
        <span>Dark Mode</span>
        <label class="toggle">
          <input type="checkbox" id="darkModeToggle" ${state.theme==='dark'?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>`;
};

pageEvents.settings = function () {
  document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    applyTheme(e.target.checked ? 'dark' : 'light');
  });
};

// ── Social Media Disclosure form submit ───────────────────────
pageEvents.socialmedia = function () {
  const form = document.getElementById('smForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('smSubmitBtn');
    const msg = document.getElementById('smFormMsg');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const val = id => (document.getElementById('sm_' + id)?.value || '').trim();
    const chk = id => document.getElementById('sm_' + id)?.checked || false;

    const payload = {
      firstName: val('firstName'), lastName: val('lastName'),
      email: val('email'), phone: val('phone'),
      nationality: val('nationality'), hostingCompany: val('hostingCompany'),
      startDate: val('startDate'), endDate: val('endDate'),
      platform: val('platform'), username: val('username'),
      privacySetting: val('privacySetting'),
      confirmedAccurate: chk('confirmedAccurate'),
      noProhibitedContent: chk('noProhibitedContent'),
      termsAgreed: chk('termsAgreed'),
      signature: val('signature')
    };

    try {
      const res = await fetch('/api/social-media-disclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Disclosure submitted and saved to Excel! ✅', 'success');
        form.reset();
        msg.style.display = 'none';
      } else {
        msg.textContent = data.error || 'Submission failed.';
        msg.style.display = 'inline';
        msg.style.color = '#B01A18';
      }
    } catch {
      msg.textContent = 'Server not available — run node server.js locally to save submissions.';
      msg.style.display = 'inline';
      msg.style.color = '#B87A14';
    }
    btn.disabled = false;
    btn.textContent = 'Submit Disclosure';
  });
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

  showPage('interntainee');

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
