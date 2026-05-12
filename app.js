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
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  cruise:    'Cruise Line',
  j1:        'J1 Cultural Exchange',
  marine:    'Marine Travel',
  visa:      'Visa Services',
  clients:   'Clients',
  reports:   'Reports',
  settings:  'Settings'
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
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('no server');
    const data = await res.json();
    state.zoho.connected = data.connected;
    state.zoho.checked   = true;
    updateZohoBadge();
  } catch {
    state.zoho.connected = false;
    state.zoho.checked   = true;
  }
}

function updateZohoBadge() {
  const badge = document.getElementById('zohoBadge');
  if (!badge) return;
  if (state.zoho.connected) {
    badge.textContent   = 'Zoho Live';
    badge.style.background = 'rgba(45,122,85,0.15)';
    badge.style.color      = '#2D7A55';
  } else {
    badge.textContent   = 'Connect Zoho';
    badge.style.background = 'rgba(176,26,24,0.12)';
    badge.style.color      = '#B01A18';
    badge.style.cursor     = 'pointer';
    badge.onclick = () => { window.location.href = '/auth/zoho'; };
  }
}

async function fetchZohoJ1Data() {
  try {
    const res = await fetch('/api/zoho/j1-placements');
    if (!res.ok) throw new Error('fetch failed');
    return await res.json();
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
      ${sel('j1FJob',     'All Jobs',     uniq('Selected Job'))}
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
      ${ms('j1TMJob',     'Job',     uniq('Selected Job'))}
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

  // ── Offline snapshot fallback (baked Zoho data for public/static hosting) ─
  if (!rows && Array.isArray(window.J1_OFFLINE_DATA) && window.J1_OFFLINE_DATA.length) {
    rows = window.J1_OFFLINE_DATA;
    state.dataCache['j1-zoho-rows'] = rows;
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

    // Table header: sortable columns + Action column
    const tblHead = J1_SHOW_COLS.map(c =>
      `<th data-col="${c}" class="sortable" style="cursor:pointer;white-space:nowrap;user-select:none;">
        ${c}<span class="sort-icon" style="opacity:0.5;font-size:10px;"> ⇅</span></th>`
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
          <h1>J1 Cultural Exchange</h1>
          <p class="subtitle">Exchange visitor program management
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
          <div class="card-title">By Selected Job</div>
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
  const allRows = state.dataCache['j1-zoho-rows'];

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
        <a href="/auth/zoho" style="color:${COLOR};font-weight:600;margin-left:8px;">Connect Zoho →</a>
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

  // Check Zoho connection (only works when running via node server.js)
  checkZohoStatus();

  // Handle redirect from Zoho callback
  if (window.location.search.includes('zoho=connected')) {
    showToast('Zoho Analytics connected!', 'success');
    history.replaceState({}, '', '/');
  }

  showPage('j1');
});
