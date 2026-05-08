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
  dashboard:  'Dashboard',
  analytics:  'Analytics',
  cruise:     'Cruise Line',
  j1:         'J1 Cultural Exchange',
  marine:     'Marine Travel',
  visa:       'Visa Services',
  candidates: 'Candidates',
  clients:    'Clients',
  reports:    'Reports',
  settings:   'Settings'
};

// ============================
// STATE
// ============================
const state = {
  page:      'dashboard',
  theme:     localStorage.getItem('cti-theme') || 'light',
  period:    'month',
  dataCache: {},
  charts:    new Map(),
  candidates: {
    all: [], filtered: [], currentPage: 1, perPage: 25,
    sortCol: null, sortDir: 'asc',
    search: '', division: '', status: '', nationality: ''
  }
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
    const html = await pages[name]();
    content.style.opacity = '0';
    content.innerHTML = html;
    await new Promise(r => requestAnimationFrame(r));
    content.style.transition = 'opacity 0.15s ease';
    content.style.opacity = '1';
    if (chartInits[name]) await chartInits[name]();
    if (pageEvents[name]) pageEvents[name]();
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
pages.j1 = async function () {
  const d = await loadJSON('data/j1.json');
  const countryRows = d.countryOrigin.map((c,i) => `
    <tr>
      <td>${i+1}</td><td><strong>${c.country}</strong></td><td>${fmt(c.count)}</td>
      <td><div class="mini-bar-track" style="width:100px;">
        <div class="mini-bar-fill" style="width:${Math.round(c.count/d.countryOrigin[0].count*100)}%;background:${DIVISION_COLORS.j1};"></div>
      </div></td>
    </tr>`).join('');
  return `
    <div class="page-header">
      <div class="division-header" style="border-left-color:${DIVISION_COLORS.j1}">
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
  const clients = await loadJSON('data/clients.json');
  const cards = clients.map(c => {
    const color = DIVISION_COLORS[c.division] || '#B01A18';
    return `
      <div class="client-card" data-id="${c.id}">
        <div class="client-card-header">
          <div class="client-avatar" style="background:${color};">${c.name[0]}</div>
          <div class="client-card-info"><h4>${c.name}</h4><p>${c.industry}</p></div>
        </div>
        ${divisionBadge(c.division)}
        <div class="client-card-stats">
          <div class="client-stat"><div class="client-stat-value">${fmt(c.placements)}</div><div class="client-stat-label">Placements</div></div>
          <div class="client-stat"><div class="client-stat-value">${fmt(c.openRoles)}</div><div class="client-stat-label">Open Roles</div></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          ${badge(c.status)}<span class="btn-ghost" style="font-size:12px;color:var(--red);">View Details →</span>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="page-header"><h1>Client Management</h1>
      <p class="subtitle">Partner companies and organizations across all divisions</p></div>
    <div class="client-grid">${cards}</div>`;
};

pageEvents.clients = async function () {
  const clients = await loadJSON('data/clients.json');
  document.querySelectorAll('.client-card').forEach(card => {
    card.addEventListener('click', () => {
      const c = clients.find(x => x.id === parseInt(card.dataset.id));
      if (c) openClientModal(c);
    });
  });
};

function openClientModal(c) {
  const color = DIVISION_COLORS[c.division] || '#B01A18';
  document.getElementById('modalTitle').textContent = c.name;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
      <div class="client-avatar" style="background:${color};width:52px;height:52px;border-radius:8px;font-size:22px;">${c.name[0]}</div>
      <div><h4 style="font-size:15px;font-weight:700;">${c.name}</h4>
        <p style="font-size:12px;color:var(--text-muted);">${c.industry}</p>
        <div style="margin-top:4px;">${divisionBadge(c.division)} ${badge(c.status)}</div>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Contact</div>
      <div class="panel-info-row"><span>Contact Person</span><span>${c.contact}</span></div>
      <div class="panel-info-row"><span>Email</span><span>${c.email}</span></div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Contract</div>
      <div class="panel-info-row"><span>Start</span><span>${fmtDate(c.contractStart)}</span></div>
      <div class="panel-info-row"><span>End</span><span>${fmtDate(c.contractEnd)}</span></div>
      <div class="panel-info-row"><span>Placements YTD</span><span><strong>${fmt(c.placements)}</strong></span></div>
      <div class="panel-info-row"><span>Open Roles</span><span>${fmt(c.openRoles)}</span></div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Notes</div>
      <p style="font-size:13px;line-height:1.6;">${c.notes||'—'}</p>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

// ============================
// PAGE: REPORTS
// ============================
pages.reports = async function () {
  const reports = [
    {title:'Monthly Placement Summary',     desc:'All divisions — placements, pipeline, and completion rates for the current month.',       last:'2026-05-01'},
    {title:'Division Performance Comparison',desc:'Side-by-side KPI comparison across Cruise, J1, Marine, and Visa divisions.',             last:'2026-05-01'},
    {title:'Candidate Pipeline Report',     desc:'Full funnel breakdown from application to placement for all active candidates.',           last:'2026-04-28'},
    {title:'Visa Status Report',            desc:'Current visa application statuses, processing times, and approval rates.',                last:'2026-05-03'},
    {title:'Client Activity Report',        desc:'Client engagement summary, open roles, and contract status across all divisions.',        last:'2026-04-30'},
    {title:'Revenue by Division',           desc:'Estimated revenue breakdown and growth comparison by division.',                          last:'2026-05-01'},
    {title:'Compliance & J1 Status Report', desc:'J1 program compliance dashboard — good standing, warnings, and reviews.',                last:'2026-04-25'},
    {title:'Year-End Summary',              desc:'Comprehensive annual review of placements, revenue, clients, and growth across all operations.', last:'2025-12-31'}
  ];
  const cards = reports.map(r => `
    <div class="report-card">
      <h4>${r.title}</h4><p>${r.desc}</p>
      <div class="report-last-gen">Last generated: ${fmtDate(r.last)}</div>
      <div class="report-actions">
        <button class="btn btn-primary" style="font-size:12px;padding:5px 12px;"
          onclick="showToast('Generating PDF…','info')">Generate PDF</button>
        <button class="btn btn-secondary" style="font-size:12px;padding:5px 12px;"
          onclick="showToast('Export started…','info')">Export CSV</button>
      </div>
    </div>`).join('');
  return `
    <div class="page-header"><h1>Reports & Exports</h1>
      <p class="subtitle">Generate and download reports for all divisions</p></div>
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
  const notifs = ['New candidate application','Visa status change','Client contract expiry',
                  'Placement confirmed','Pipeline milestone reached','Monthly report ready'];
  const users  = [
    {name:'Admin User',   role:'Admin',   email:'admin@ctigroup.com'},
    {name:'Maria Santos', role:'Manager', email:'m.santos@ctigroup.com'},
    {name:'James Lee',    role:'Viewer',  email:'j.lee@ctigroup.com'}
  ];
  return `
    <div class="page-header"><h1>Settings</h1><p class="subtitle">Configure your CTI Group Command Center</p></div>

    <div class="settings-section"><h3>Company Information</h3>
      <div class="settings-grid">
        <div class="settings-field"><label>Company Name</label><input value="CTI Group Worldwide Services, Inc."></div>
        <div class="settings-field"><label>Phone</label><input value="+1 (800) 284-4653"></div>
        <div class="settings-field"><label>Email</label><input value="info@ctigroup.com"></div>
        <div class="settings-field"><label>Website</label><input value="www.cti-usa.com"></div>
      </div>
      <div class="settings-field"><label>Address</label><input value="600 S. Magnolia Ave., Suite 300, Tampa, FL 33606"></div>
      <div style="margin-top:12px;">
        <button class="btn btn-primary" onclick="showToast('Company info saved.')">Save Changes</button>
      </div>
    </div>

    <div class="settings-section"><h3>Divisions</h3>
      ${divs.map(d => `<div class="toggle-row"><span>${d.label}</span>
        <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
      </div>`).join('')}
    </div>

    <div class="settings-section"><h3>Users & Access</h3>
      <div class="table-wrap" style="margin-bottom:12px;">
        <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td><strong>${u.name}</strong></td><td>${u.email}</td>
          <td>${badge(u.role)}</td>
          <td><button class="btn-sm" onclick="showToast('Edit user…','info')">Edit</button></td>
        </tr>`).join('')}</tbody></table>
      </div>
      <button class="btn btn-secondary" onclick="showToast('Invite sent!','info')">Invite User</button>
    </div>

    <div class="settings-section"><h3>Notifications</h3>
      ${notifs.map(n => `<div class="toggle-row"><span>${n}</span>
        <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
      </div>`).join('')}
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

  showPage('dashboard');
});
