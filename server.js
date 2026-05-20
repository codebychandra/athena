require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REDIRECT_URI  = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/callback';
const TOKENS_FILE   = path.join(__dirname, '.zoho_tokens.json');

const ZOHO_ACCOUNTS  = 'https://accounts.zoho.com';
const ZOHO_ANALYTICS = 'https://analyticsapi.zoho.com/restapi/v2';
const ZOHO_RECRUIT   = 'https://recruit.zoho.com/recruit/v2';
const ZOHO_CRM       = 'https://www.zohoapis.com/crm/v2';
const ZOHO_SHEET     = 'https://sheet.zoho.com/api/v2';

// ── Server-side cache (10-minute TTL) ─────────────────────────────────────────
const CACHE_TTL  = 10 * 60 * 1000;   // 10 minutes in ms
const _apiCache  = new Map();
function getCached(key)       { const e = _apiCache.get(key); return (e && Date.now()-e.t < CACHE_TTL) ? e.d : null; }
function setCached(key, data) { _apiCache.set(key, { d: data, t: Date.now() }); }
function clearCache(key)      { if (key) _apiCache.delete(key); else _apiCache.clear(); }

// ============================
// TOKEN MANAGEMENT
// ============================
let tokens = { accessToken: null, refreshToken: null, expiresAt: 0 };
let cachedOrgId = null;

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
      console.log('✅ Zoho tokens loaded from file');
    }
  } catch (e) {
    console.warn('Could not load tokens:', e.message);
  }
}

function saveTokens() {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (e) {
    console.error('Could not save tokens:', e.message);
  }
}

async function ensureValidToken() {
  if (!tokens.refreshToken) throw new Error('NOT_AUTHENTICATED');

  const now = Date.now();
  if (tokens.accessToken && tokens.expiresAt > now + 60000) {
    return tokens.accessToken;
  }

  console.log('Refreshing Zoho access token...');
  const res = await axios.post(`${ZOHO_ACCOUNTS}/oauth/v2/token`, null, {
    params: {
      refresh_token: tokens.refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'refresh_token'
    }
  });

  if (res.data.error) throw new Error(res.data.error);

  tokens.accessToken = res.data.access_token;
  tokens.expiresAt   = now + res.data.expires_in * 1000;
  saveTokens();
  console.log('✅ Token refreshed');
  return tokens.accessToken;
}

// Helper — build headers with org ID
async function zohoHeaders(token) {
  const orgId = await getOrgId(token);
  return {
    Authorization:    `Zoho-oauthtoken ${token}`,
    'ZANALYTICS-ORGID': orgId
  };
}

// Helper — get org ID (cached)
async function getOrgId(token) {
  if (cachedOrgId) return cachedOrgId;
  try {
    const r = await axios.get(`${ZOHO_ANALYTICS}/orgs`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const orgs = r.data?.data?.orgs || [];
    if (orgs.length > 0) {
      cachedOrgId = orgs[0].orgId;
      console.log('✅ Org ID cached:', cachedOrgId);
      return cachedOrgId;
    }
  } catch (e) {
    console.warn('Could not fetch org ID:', e.message);
  }
  // Fallback from env
  return process.env.ZOHO_ORG_ID || null;
}

// Helper — parse Zoho CSV response into { columns, rows }
function parseCSV(text) {
  if (!text || typeof text !== 'string') return { columns: [], rows: [] };
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (!lines.length) return { columns: [], rows: [] };

  function parseLine(line) {
    const result = [];
    let cur = '';
    let inQ  = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const columns = parseLine(lines[0]);
  const rows    = lines.slice(1).filter(l => l.trim()).map(parseLine);
  return { columns, rows };
}

// Helper — get all workspaces (owned + shared)
async function getAllWorkspaces(token) {
  const headers    = await zohoHeaders(token);
  const r          = await axios.get(`${ZOHO_ANALYTICS}/workspaces`, { headers });
  const data       = r.data?.data || {};
  const owned      = data.ownedWorkspaces  || [];
  const shared     = data.sharedWorkspaces || [];
  return [...owned, ...shared];
}

// Helper — fetch view data, falling back to async export when sync is disallowed
// (error code 8133 = SYNC_EXPORT_NOT_ALLOWED, e.g. on query/formula tables)
// (error code 8525 = URL_RULE_NOT_CONFIGURED,  e.g. on QueryTable views)
const ASYNC_FALLBACK_CODES = new Set([8133, 8525]);

async function fetchViewData(wsId, viewId, headers) {
  // 1. Try synchronous export first
  try {
    const r = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${wsId}/views/${viewId}/data`,
      { headers }
    );
    return r.data;
  } catch (syncErr) {
    const errCode = syncErr.response?.data?.data?.errorCode;
    if (!ASYNC_FALLBACK_CODES.has(errCode)) throw syncErr;   // unexpected — re-throw
    console.log(`⚡ View ${viewId}: sync blocked (${errCode}), switching to async export...`);
  }

  // 2. Initiate async export (CSV)
  const initRes = await axios.post(
    `${ZOHO_ANALYTICS}/workspaces/${wsId}/views/${viewId}/data/export`,
    null,
    { headers, params: { exportType: 'CSV' } }
  );
  const jobId = initRes.data?.data?.jobId;
  if (!jobId) {
    throw new Error(`Async export did not return a jobId. Response: ${JSON.stringify(initRes.data)}`);
  }
  console.log(`📤 Async export job started: ${jobId}`);

  // 3. Poll until COMPLETE (max 20 × 3 s = 60 s)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${wsId}/views/${viewId}/data/export/${jobId}`,
      { headers }
    );
    const job = poll.data?.data;
    console.log(`⏳ Export poll ${i + 1}/20: status = ${job?.status}`);

    if (job?.status === 'COMPLETE') {
      if (job.downloadUrl) {
        const dl = await axios.get(job.downloadUrl, { headers });
        return dl.data;     // CSV text
      }
      return poll.data;
    }
    if (job?.status === 'FAILED') {
      throw new Error(`Async export FAILED: ${job.errorMessage || JSON.stringify(job)}`);
    }
  }
  throw new Error('Async export timed out after 60 seconds');
}

// ============================
// INIT
// ============================
loadTokens();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Ensure all unmatched /api/* routes return JSON, never HTML ────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No API route: ${req.method} ${req.path}` });
});

// ── Global error handler — always JSON ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============================
// OAUTH ROUTES
// ============================

app.get('/auth/zoho', (req, res) => {
  const scopes = [
    // Zoho Analytics — read only (data comes from clean analytics tables)
    'ZohoAnalytics.data.read',
    'ZohoAnalytics.metadata.read',
    // Zoho Recruit — CREATE, READ, UPDATE (no DELETE)
    'ZohoRecruit.modules.READ',
    'ZohoRecruit.modules.CREATE',
    'ZohoRecruit.modules.UPDATE',
    'ZohoRecruit.settings.READ',
    // Zoho CRM — CREATE, READ, UPDATE (no DELETE)
    'ZohoCRM.modules.READ',
    'ZohoCRM.modules.CREATE',
    'ZohoCRM.modules.UPDATE',
    'ZohoCRM.settings.READ',
    // Zoho Sheet — CREATE, READ, UPDATE (no DELETE)
    'ZohoSheet.dataAPI.READ',
    'ZohoSheet.dataAPI.CREATE',
    'ZohoSheet.dataAPI.UPDATE',
  ].join(',');

  const url = `${ZOHO_ACCOUNTS}/oauth/v2/auth?` +
    `scope=${encodeURIComponent(scopes)}&` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#B01A18;">Zoho Auth Error</h2>
        <p>${error}</p>
        <a href="/">← Back to dashboard</a>
      </body></html>`);
  }

  try {
    const response = await axios.post(`${ZOHO_ACCOUNTS}/oauth/v2/token`, null, {
      params: {
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code'
      }
    });

    if (response.data.error) throw new Error(response.data.error);

    tokens.accessToken  = response.data.access_token;
    tokens.refreshToken = response.data.refresh_token;
    tokens.expiresAt    = Date.now() + response.data.expires_in * 1000;
    cachedOrgId = null; // reset org cache on new auth
    saveTokens();

    console.log('✅ Zoho OAuth successful — tokens saved');
    res.redirect('/?zoho=connected');
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#B01A18;">OAuth Failed</h2>
        <pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
        <a href="/auth/zoho">Try again</a>
      </body></html>`);
  }
});

// ============================
// API ENDPOINTS
// ============================

app.get('/api/status', (req, res) => {
  res.json({
    connected:  !!tokens.refreshToken,
    expiresAt:  tokens.expiresAt,
    hasToken:   !!tokens.accessToken
  });
});

// Debug — full diagnostic
app.get('/api/zoho/debug', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const baseHdr = { Authorization: `Zoho-oauthtoken ${token}` };
    const results = {};

    try {
      const r = await axios.get(`${ZOHO_ANALYTICS}/orgs`, { headers: baseHdr });
      results.orgs = r.data;
    } catch (e) { results.orgs_error = e.response?.data || e.message; }

    try {
      const headers = await zohoHeaders(token);
      const r = await axios.get(`${ZOHO_ANALYTICS}/workspaces`, { headers });
      results.workspaces = r.data;
    } catch (e) { results.workspaces_error = e.response?.data || e.message; }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// List all workspaces
app.get('/api/zoho/workspaces', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const workspaces = await getAllWorkspaces(token);
    res.json({ count: workspaces.length, workspaces });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// List views in a workspace
app.get('/api/zoho/workspaces/:wsId/views', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const headers = await zohoHeaders(token);
    const response = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${req.params.wsId}/views`,
      { headers }
    );
    res.json(response.data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// J1 Placement Report — auto-discover + fetch
// ── Shared helper — find a view by search terms across all workspaces ──────
async function findZohoView(headers, workspaces, matchFn) {
  for (const ws of workspaces) {
    const r = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`, { headers }
    );
    const views = r.data?.data?.views || [];
    const match = views.find(matchFn);
    if (match) return { ws, view: match };
  }
  return null;
}

async function allViewsList(headers, workspaces) {
  const list = [];
  for (const ws of workspaces.slice(0, 6)) {
    const r = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`, { headers }
    );
    (r.data?.data?.views || []).forEach(v =>
      list.push({ workspace: ws.workspaceName, viewName: v.viewName, viewId: v.viewId })
    );
  }
  return list;
}

// ── Zoho Sheet helper — fetch all rows from a named worksheet ──────────────
// Paginates using start_row_index + row_count until all rows are loaded.
async function fetchSheetRecords(resourceId, sheetName) {
  const token    = await ensureValidToken();
  let allRows    = [];
  let startIdx   = 0;
  const pageSize = 1000;

  while (true) {
    // Zoho Sheet API v2 requires POST with application/x-www-form-urlencoded body
    const body = new URLSearchParams();
    body.set('method',          'worksheet.records.fetch');
    body.set('worksheet_name',  sheetName);
    body.set('header_row',      '1');
    body.set('start_row_index', String(startIdx));
    body.set('row_count',       String(pageSize));

    const r    = await axios.post(`${ZOHO_SHEET}/${resourceId}`, body.toString(), {
      headers: {
        Authorization:  `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    if (r.data?.status === 'failure') {
      throw new Error(`Sheet API error ${r.data.error_code}: ${r.data.error_message}`);
    }

    const page = r.data?.records?.row || [];
    allRows    = allRows.concat(page);
    if (page.length < pageSize) break;   // last page
    startIdx  += pageSize;
  }

  if (!allRows.length) return { columns: [], rows: [] };

  // Column names = keys of first row, excluding Zoho's auto "No." counter column
  const columns  = Object.keys(allRows[0]).filter(k => k !== 'No.');
  const dataRows = allRows.map(row => columns.map(col => String(row[col] ?? '')));
  return { columns, rows: dataRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// J1 PLACEMENT — source: Zoho Sheet "J1 Placement Report"
// https://sheet.zoho.com/sheet/open/l9728edc6734e53cd4bf0a5566639f8a90b48
// ─────────────────────────────────────────────────────────────────────────────
const PLACEMENT_SHEET_ID   = process.env.PLACEMENT_SHEET_ID   || 'l9728edc6734e53cd4bf0a5566639f8a90b48';
const PLACEMENT_SHEET_NAME = process.env.PLACEMENT_SHEET_NAME || 'placement';

app.get('/api/zoho/j1-placements', async (req, res) => {
  try {
    const cached = getCached('j1-placements');
    if (cached) return res.json(cached);
    const data = await fetchSheetRecords(PLACEMENT_SHEET_ID, PLACEMENT_SHEET_NAME);
    console.log(`✅ J1 Placements (Sheet): ${data.rows.length} rows, ${data.columns.length} cols`);
    const payload = { source: 'zoho-sheet', view: PLACEMENT_SHEET_NAME, data };
    setCached('j1-placements', payload);
    res.json(payload);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 Placements fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// J1 VISA — source: Zoho Sheet "J1 Visa Log"
// https://sheet.zoho.com/sheet/open/2lr3n52a29b81f88c47618df49092afd2b286
// ─────────────────────────────────────────────────────────────────────────────
const VISA_SHEET_ID   = process.env.VISA_SHEET_ID   || '2lr3n52a29b81f88c47618df49092afd2b286';
const VISA_SHEET_NAME = process.env.VISA_SHEET_NAME || 'j1 visa log';

app.get('/api/zoho/j1-visa', async (req, res) => {
  try {
    const cached = getCached('j1-visa');
    if (cached) return res.json(cached);
    const data = await fetchSheetRecords(VISA_SHEET_ID, VISA_SHEET_NAME);
    console.log(`✅ J1 Visa (Sheet): ${data.rows.length} rows, ${data.columns.length} cols`);
    const payload = { source: 'zoho-sheet', view: VISA_SHEET_NAME, data };
    setCached('j1-visa', payload);
    res.json(payload);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 Visa fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// J1 REQUISITION — source: Zoho Recruit "Job_Openings" module
// Filter: Placement_Category = 'J1 Program' AND Requisition_Status = 'Active'
// ─────────────────────────────────────────────────────────────────────────────

// Column display map: [display label, getter from mapJobRecord result]
const REQ_COL_MAP = [
  ['Hosting Company',      j => j.hostingCompany],
  ['Department',           j => j.department],
  ['Position Name',        j => j.positionName],
  ['Requisition',          j => String(j.numPositions || '')],
  ['Client Name',          j => j.clientName],
  ['J1 Program Type',      j => j.j1ProgramType],
  ['Requisition Status',   j => j.status],
  ['Contract Length',      j => j.contractLength],
  ['Salary',               j => j.salary],
  ['City',                 j => [j.city, j.state].filter(v => v && v !== '—').join(', ') || '—'],
  ['Target Date',          j => j.targetDate  || ''],
  ['Date Opened',          j => j.dateOpened  || ''],
  ['Housing Availability', j => j.housingAvail],
];

app.get('/api/zoho/j1-requisition', async (req, res) => {
  try {
    const cached = getCached('j1-requisition');
    if (cached) return res.json(cached);

    const fields  = Object.values(JOB_FIELDS).join(',');
    const module  = process.env.RECRUIT_JOB_MODULE || 'Job_Openings';
    const records = await fetchAllPages(recruitGet, module, fields);
    const allJobs = records.map(mapJobRecord);

    // Filter: Placement Category = 'J1 Program' AND Status = 'Active'
    const j1Jobs  = allJobs.filter(j =>
      /^j1 program$/i.test((j.placementCategory || '').trim()) &&
      /^active$/i.test((j.status || '').trim())
    );

    const columns = REQ_COL_MAP.map(([label]) => label);
    const rows    = j1Jobs.map(j => REQ_COL_MAP.map(([, get]) => String(get(j) ?? '')));

    console.log(`✅ J1 Requisition (Recruit): ${rows.length}/${allJobs.length} active J1 jobs`);
    const payload = { source: 'zoho-recruit', view: 'Job Openings', data: { columns, rows } };
    setCached('j1-requisition', payload);
    res.json(payload);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 Requisition fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// J1 TRAVEL — source: Zoho Recruit "J1_Participants" module
// Filter: J1_Application_Status IN ('Stage 4','USA Onboard','Program Completed')
//         AND Processing_Sponsor IS NOT NULL/empty
// Sort:   Program_Start_Date DESC
// ─────────────────────────────────────────────────────────────────────────────

const J1_TRAVEL_INCLUDE = new Set(['Stage 4', 'USA Onboard', 'Program Completed']);

// Column display map: [display label, getter from mapRecruitRecord result]
const TRAVEL_COL_MAP = [
  ['J1 Application Status',       r => r.placementStatus],
  ['J1 Program Sources',          r => r.programSource],
  ['Full Name',                   r => r.name],
  ['Email',                       r => r.email],
  ['Selected Job',                r => r.selectedJob],
  ['Program Start Date',          r => r.programStart   || ''],
  ['Program End Date',            r => r.programEnd     || ''],
  ['Processing Sponsor',          r => r.processingSponsor],
  ['Hosting Company',             r => r.hostCompany],
  ['Trip From',                   r => r.tripFrom],
  ['Trip To',                     r => r.tripTo],
  ['Departure Date',              r => r.departureDate  || ''],
  ['Arrival Date',                r => r.arrivalDate    || ''],
  ['Airport Gateway',             r => r.airportGateway],
  ['Airport Pick-Up',             r => r.airportPickup],
  ['Flight Ticket Status',        r => r.flightBooked],
  ['Ticket Pricing',              r => r.ticketPricing != null ? String(r.ticketPricing) : ''],
  ['Ticket Payment Method',       r => r.ticketPayMethod],
  ['Ticket Payment Status',       r => r.ticketPayStatus],
  ['Airline',                     r => r.airline],
  ['Airline PNR Number',          r => r.pnrNumber],
  ['Transportation Cost',         r => r.transportCost != null ? String(r.transportCost) : ''],
  ['Return Trip From',            r => r.returnTripFrom],
  ['Return Trip To',              r => r.returnTripTo],
  ['Return Airport Gateway',      r => r.returnGateway],
  ['Return Departure Date',       r => r.returnDeparture || ''],
  ['Return Arrival Date',         r => r.returnArrival   || ''],
  ['Return Flight Ticket Status', r => r.returnFlightStatus],
  ['Return Ticket Price',         r => r.returnTicketPrice != null ? String(r.returnTicketPrice) : ''],
  ['Return Ticket Payment Status',r => r.returnTicketPayStatus],
  ['Return Airline',              r => r.returnAirline],
  ['Return Airline PNR Number',   r => r.returnPNR],
  ['Return Transportation Cost',  r => r.returnTransportCost != null ? String(r.returnTransportCost) : ''],
];

app.get('/api/zoho/j1-travel', async (req, res) => {
  try {
    const cached = getCached('j1-travel');
    if (cached) return res.json(cached);

    const fields  = Object.values(RECRUIT_FIELDS).join(',');
    const module  = process.env.RECRUIT_J1_MODULE || 'J1_Participants';
    const records = await fetchAllPages(recruitGet, module, fields);
    const allRecs = records.map(mapRecruitRecord);

    // Filter: status IN ('Stage 4','USA Onboard','Program Completed') AND sponsor set
    const filtered = allRecs.filter(r =>
      J1_TRAVEL_INCLUDE.has(r.placementStatus) &&
      r.processingSponsor && r.processingSponsor !== '—'
    );

    // Sort: programStart DESC
    filtered.sort((a, b) => String(b.programStart || '').localeCompare(String(a.programStart || '')));

    const columns = TRAVEL_COL_MAP.map(([label]) => label);
    const rows    = filtered.map(r => TRAVEL_COL_MAP.map(([, get]) => String(get(r) ?? '')));

    console.log(`✅ J1 Travel (Recruit): ${rows.length}/${allRecs.length} participants, ${columns.length} cols`);
    const payload = { source: 'zoho-recruit', view: 'J1 Participants', data: { columns, rows } };
    setCached('j1-travel', payload);
    res.json(payload);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 Travel fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// (Legacy Analytics endpoints retained below for reference — no longer used by dashboard)
app.get('/api/zoho/j1-travel-analytics-legacy', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const headers    = await zohoHeaders(token);
    const workspaces = await getAllWorkspaces(token);
    if (!workspaces.length) return res.status(404).json({ error: 'No workspaces found' });

    const found = await findZohoView(headers, workspaces, v =>
      v.viewName === 'J1 Participants' ||
      v.viewName.toLowerCase().includes('j1 participant')
    );
    if (!found) return res.status(404).json({ error: 'J1 Participants table not found' });

    const raw     = await fetchViewData(found.ws.workspaceId, found.view.viewId, headers);
    const allData = typeof raw === 'string' ? parseCSV(raw) : (raw?.columns ? raw : parseCSV(String(raw || '')));
    const allCols = allData.columns || [];
    const allRows = allData.rows    || [];

    // WHERE "J1 Application Status" IN ('Stage 4','USA Onboard','Program Completed')
    //   AND "Processing Sponsor" IS NOT NULL AND TRIM("Processing Sponsor") <> ''
    const appIdx      = allCols.indexOf('J1 Application Status');
    const sponsorIdx  = allCols.indexOf('Processing Sponsor');
    const filtered    = allRows.filter(r => {
      const appStatus = String(r[appIdx]     ?? '').trim();
      const sponsor   = String(r[sponsorIdx] ?? '').trim();
      return J1_TRAVEL_INCLUDE.has(appStatus) && sponsor !== '';
    });

    // ORDER BY "Program Start Date" DESC
    const startIdx = allCols.indexOf('Program Start Date');
    filtered.sort((a, b) =>
      String(b[startIdx] ?? '').localeCompare(String(a[startIdx] ?? ''))
    );

    // SELECT only the columns defined in the QueryTable SQL
    const showIdx = J1_TRAVEL_SHOW_COLS.map(c => allCols.indexOf(c));
    const columns = J1_TRAVEL_SHOW_COLS.filter((_, i) => showIdx[i] >= 0);
    const validIdx = showIdx.filter(i => i >= 0);
    const rows = filtered.map(r => validIdx.map(i => String(r[i] ?? '')));

    console.log(`✅ J1 Travel: ${rows.length}/${allRows.length} participants (${allRows.length - rows.length} excluded), ${columns.length} cols`);
    res.json({ source: 'zoho', workspace: found.ws.workspaceName, view: 'J1 Travel', data: { columns, rows } });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 Travel fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// Generic view data fetch by IDs (uses fetchViewData for async-export support)
app.get('/api/zoho/workspaces/:wsId/views/:viewId/data', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const headers = await zohoHeaders(token);
    const raw     = await fetchViewData(req.params.wsId, req.params.viewId, headers);
    const data    = typeof raw === 'string' ? parseCSV(raw) : (raw?.columns ? raw : parseCSV(String(raw || '')));
    res.json({ source: 'zoho', data });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ============================
// ZOHO RECRUIT + CRM + SHEET
// ============================

// ── Field maps (from Zoho Recruit / CRM API names) ──────────────────────────
const RECRUIT_FIELDS = {
  name:               'Full_Name',
  firstName:          'First_Name',
  lastName:           'CustomModule2_Name',
  country:            'Country',
  appStatus:          'J1_Application_Status',
  programSources:     'J1_Program_Sources',
  eligiblePrograms:   'Eligible_Programs',
  gender:             'Gender',
  email:              'Email',
  phone:              'Phone_Number1',
  programType:        'Program_Option',
  programStart:       'Program_Start_Date',
  programEnd:         'Program_End_Date',
  selectedJob:        'Select_a_Job',
  hostCompany:        'Hosting_Company_2',
  processingSponsor:  'Processing_Sponsor',
  sponsorStatus:      'Sponsor_Interview_Status',
  hcInterviewStatus:  'Hosting_Company_Interview_Status',
  housingAvailability:'Housing_Availability',
  housingLandlord:    'Housing_Landlord',
  housingPaymentInit: 'Initial_Housing_Payment_Before_Departure',
  housingPaymentMo:   'Monthly_Housing_Payment',
  housingAddress:     'Housing_Address',
  visaStatus:         'J1_Visa_Status',
  visaExpiredDate:    'J1_Visa_Expired_Date',
  visaAppointment:    'J1_Visa_Appointment_Date',
  visaNumber:         'J1_Visa_Number',
  refLetterStatus:    'Reference_Letter_Status',
  flightBooked:       'Flight_Ticket_Status',
  ticketPayStatus:    'Ticket_Payment_Status',
  ticketPricing:      'Ticket_Pricing',
  ticketPayMethod:    'Ticket_Payment_Method',
  airline:            'Airline',
  pnrNumber:          'PNR_Number',
  tripFrom:           'Trip_From',
  tripTo:             'Trip_To',
  departureDate:      'Departure_Date',
  arrivalDate:        'Arrival_Date',
  airportGateway:     'Airport_Gateway',
  airportPickup:      'Airport_Pick_Up',
  transportCost:      'Transportation_Cost',
  returnFlightStatus: 'Returning_Flight_Ticket_Status',
  returnDeparture:    'Returning_Departure_Date',
  returnArrival:      'Returning_Arrival_Date',
  returnAirline:      'Returning_Airline',
  returnPNR:          'Returning_Airline_PNR_Number',
  returnTripFrom:     'Returning_Trip_From',
  returnTripTo:       'Returning_Trip_To',
  returnGateway:      'Returning_Airport_Gateway',
  returnTicketPrice:  'Return_Ticket_Price',
  returnTicketPayStatus: 'Return_Ticket_Payment_Status',
  returnTransportCost:'Return_Transportation_Cost',
};

const CRM_FIELDS = {
  fullName:               'Full_Name',
  firstName:              'First_Name',
  lastName:               'Last_Name',
  email:                  'Email',
  country:                'Country',
  phone:                  'Phone',
  gender:                 'Gender',
  appStatus:              'J1_Application_Status',
  programSource:          'J1_Program_Source',
  programType:            'Program_Option',
  hostCompany:            'Hosting_Company',
  age:                    'Age',
  positionApplied:        'Position_Applied',
  permanentAddress:       'Permanent_Address',
  ctiUsaReview:           'CTI_USA_s_Review',
  eligiblePrograms:       'Eligible_Programs',
  consultationCallStatus: 'Consultation_Call_Status',
  consultationCallNotes:  'Consultation_Call_Notes',
};

const JOB_FIELDS = {
  jobId:             'Job_Opening_ID',
  status:            'Requisition_Status',
  placementCategory: 'Placement_Category',
  hostingCompany:    'Hosting_Company_2',
  positionName:      'Position',
  city:              'City',
  state:             'State',
  department:        'Department',
  numPositions:      'Requisition',
  salary:            'Salary',
  paymentFrequency:  'Payment_Frequency',
  housingAvail:      'Housing_Availability',
  targetDate:        'Target_Date',
  dateOpened:        'Date_Opened',
  contractLength:    'Contract_Length',
  j1ProgramType:     'J1_Program_Type',
  clientName:        'Client_Name',
};

// ── Recruit API helper ──────────────────────────────────────────────────────
async function recruitGet(endpoint, params = {}) {
  const token = await ensureValidToken();
  const url   = new URL(`${ZOHO_RECRUIT}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await axios.get(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return r.data;
}

async function recruitPost(endpoint, body) {
  const token = await ensureValidToken();
  const r = await axios.post(`${ZOHO_RECRUIT}/${endpoint}`, body, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' }
  });
  return r.data;
}

async function recruitPatch(endpoint, body) {
  const token = await ensureValidToken();
  const r = await axios.patch(`${ZOHO_RECRUIT}/${endpoint}`, body, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' }
  });
  return r.data;
}

// ── CRM API helper ─────────────────────────────────────────────────────────
async function crmGet(endpoint, params = {}) {
  const token = await ensureValidToken();
  const url   = new URL(`${ZOHO_CRM}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await axios.get(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return r.data;
}

async function crmPost(endpoint, body) {
  const token = await ensureValidToken();
  const r = await axios.post(`${ZOHO_CRM}/${endpoint}`, body, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' }
  });
  return r.data;
}

async function crmPatch(endpoint, body) {
  const token = await ensureValidToken();
  const r = await axios.patch(`${ZOHO_CRM}/${endpoint}`, body, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' }
  });
  return r.data;
}

// ── Sheet API helper ───────────────────────────────────────────────────────
async function sheetGet(endpoint, params = {}) {
  const token = await ensureValidToken();
  const url   = new URL(`${ZOHO_SHEET}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await axios.get(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return r.data;
}

// ── Paginated fetch helper ─────────────────────────────────────────────────
async function fetchAllPages(apiFn, module, fields) {
  let all = [], page = 1, more = true;
  while (more) {
    const data    = await apiFn(module, { fields, page, per_page: 200 });
    const records = data.data || [];
    all  = all.concat(records);
    more = data.info?.more_records === true;
    page++;
  }
  return all;
}

// ── Map a raw Recruit record to a clean object ─────────────────────────────
function mapRecruitRecord(r) {
  const F = RECRUIT_FIELDS;
  const arr = v => Array.isArray(v) ? v.join(', ') : (v || '—');
  return {
    _source:             'recruit',
    id:                  r.id,
    name:                r[F.name] || [r[F.firstName], r[F.lastName]].filter(Boolean).join(' ') || '—',
    firstName:           r[F.firstName]          || '—',
    lastName:            r[F.lastName]           || '—',
    country:             r[F.country]            || '—',
    gender:              r[F.gender]             || '—',
    email:               r[F.email]              || '—',
    phone:               r[F.phone]              || '—',
    programType:         r[F.programType]        || '—',
    programSource:       r[F.programSources]     || '—',
    placementStatus:     r[F.appStatus]          || '—',
    processingSponsor:   r[F.processingSponsor]  || '—',
    selectedJob:         r[F.selectedJob]        || '—',
    hostCompany:         r[F.hostCompany]        || '—',
    programStart:        r[F.programStart]       || null,
    programEnd:          r[F.programEnd]         || null,
    eligiblePrograms:    arr(r[F.eligiblePrograms]),
    sponsorStatus:       r[F.sponsorStatus]      || '—',
    hcInterviewStatus:   r[F.hcInterviewStatus]  || '—',
    housingAvailability: r[F.housingAvailability]|| '—',
    housingLandlord:     r[F.housingLandlord]    || '—',
    housingPaymentInit:  r[F.housingPaymentInit] || null,
    housingPaymentMo:    r[F.housingPaymentMo]   || null,
    housingAddress:      r[F.housingAddress]     || '—',
    ds2019End:           r[F.visaExpiredDate]    || null,
    visaStatus:          r[F.visaStatus]         || '—',
    visaNumber:          r[F.visaNumber]         || '—',
    visaAppointment:     r[F.visaAppointment]    || null,
    refLetterStatus:     r[F.refLetterStatus]    || '—',
    flightBooked:        r[F.flightBooked]       || '—',
    ticketPayStatus:     r[F.ticketPayStatus]    || '—',
    ticketPricing:       r[F.ticketPricing]      || null,
    ticketPayMethod:     r[F.ticketPayMethod]    || '—',
    airline:             r[F.airline]            || '—',
    pnrNumber:           r[F.pnrNumber]          || '—',
    tripFrom:            r[F.tripFrom]           || '—',
    tripTo:              r[F.tripTo]             || '—',
    departureDate:       r[F.departureDate]      || null,
    arrivalDate:         r[F.arrivalDate]        || null,
    airportGateway:      r[F.airportGateway]     || '—',
    airportPickup:       r[F.airportPickup]      || '—',
    transportCost:       r[F.transportCost]      || null,
    returnFlightStatus:  r[F.returnFlightStatus] || '—',
    returnDeparture:     r[F.returnDeparture]    || null,
    returnArrival:       r[F.returnArrival]      || null,
    returnAirline:       r[F.returnAirline]      || '—',
    returnPNR:           r[F.returnPNR]          || '—',
    returnTripFrom:      r[F.returnTripFrom]     || '—',
    returnTripTo:        r[F.returnTripTo]       || '—',
    returnGateway:       r[F.returnGateway]      || '—',
    returnTicketPrice:   r[F.returnTicketPrice]  || null,
    returnTicketPayStatus: r[F.returnTicketPayStatus] || '—',
    returnTransportCost: r[F.returnTransportCost]|| null,
  };
}

function mapCRMRecord(r) {
  const CF = CRM_FIELDS;
  const arr = v => Array.isArray(v) ? v.join(', ') : (v || '—');
  return {
    _source:                'crm',
    id:                     'crm_' + r.id,
    name:                   r[CF.fullName] || [r[CF.firstName], r[CF.lastName]].filter(Boolean).join(' ') || '—',
    firstName:              r[CF.firstName]              || '—',
    lastName:               r[CF.lastName]               || '—',
    email:                  r[CF.email]                  || '—',
    country:                r[CF.country]                || '—',
    phone:                  r[CF.phone]                  || '—',
    gender:                 r[CF.gender]                 || '—',
    age:                    r[CF.age]                    || '—',
    positionApplied:        r[CF.positionApplied]        || '—',
    permanentAddress:       r[CF.permanentAddress]       || '—',
    ctiUsaReview:           r[CF.ctiUsaReview]           || '—',
    consultationCallStatus: r[CF.consultationCallStatus] || '—',
    consultationCallNotes:  r[CF.consultationCallNotes]  || '—',
    programType:            r[CF.programType]            || '—',
    programSource:          r[CF.programSource]          || '—',
    eligiblePrograms:       arr(r[CF.eligiblePrograms]),
    placementStatus:        r[CF.appStatus]              || '—',
    hostCompany:            r[CF.hostCompany]            || '—',
  };
}

function mapJobRecord(r) {
  const JF = JOB_FIELDS;
  return {
    id:                r.id,
    jobId:             r[JF.jobId]             || '—',
    status:            r[JF.status]            || '—',
    placementCategory: r[JF.placementCategory] || '—',
    hostingCompany:    (r[JF.hostingCompany]?.name || r[JF.hostingCompany]) || '—',
    positionName:      r[JF.positionName]      || '—',
    city:              r[JF.city]              || '—',
    state:             r[JF.state]             || '—',
    department:        r[JF.department]        || '—',
    numPositions:      Number(r[JF.numPositions]) || 0,
    salary:            r[JF.salary]            || '—',
    paymentFrequency:  r[JF.paymentFrequency]  || '—',
    housingAvail:      r[JF.housingAvail]      || '—',
    targetDate:        r[JF.targetDate]        || null,
    dateOpened:        r[JF.dateOpened]        || null,
    contractLength:    r[JF.contractLength]    || '—',
    j1ProgramType:     Array.isArray(r[JF.j1ProgramType])
                         ? r[JF.j1ProgramType].join('; ')
                         : r[JF.j1ProgramType] || '—',
    clientName:        (r[JF.clientName]?.name || r[JF.clientName]) || '—',
  };
}

// ─────────────────────────────────────────────────
// RECRUIT ENDPOINTS
// ─────────────────────────────────────────────────

// GET all J1 Participants from Recruit
app.get('/api/recruit/j1-participants', async (req, res) => {
  try {
    const fields  = Object.values(RECRUIT_FIELDS).join(',');
    const module  = process.env.RECRUIT_J1_MODULE || 'J1_Participants';
    const records = await fetchAllPages(recruitGet, module, fields);
    const data    = records.map(mapRecruitRecord);
    console.log(`✅ Recruit J1 Participants: ${data.length} records`);
    res.json({ source: 'recruit', count: data.length, data });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('Recruit J1 Participants error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// GET Job Openings from Recruit
app.get('/api/recruit/job-openings', async (req, res) => {
  try {
    const fields  = Object.values(JOB_FIELDS).join(',');
    const module  = process.env.RECRUIT_JOB_MODULE || 'Job_Openings';
    const records = await fetchAllPages(recruitGet, module, fields);
    const data    = records.map(mapJobRecord);
    console.log(`✅ Recruit Job Openings: ${data.length} records`);
    res.json({ source: 'recruit', count: data.length, data });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('Recruit Job Openings error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// GET single Recruit record
app.get('/api/recruit/:module/:id', async (req, res) => {
  try {
    const data = await recruitGet(`${req.params.module}/${req.params.id}`);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// CREATE a Recruit record  (POST body: { data: [ { Field: value, ... } ] })
app.post('/api/recruit/:module', async (req, res) => {
  try {
    const data = await recruitPost(req.params.module, req.body);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`Recruit CREATE ${req.params.module}:`, err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// UPDATE a Recruit record  (PATCH body: { data: [ { id: "...", Field: value, ... } ] })
app.patch('/api/recruit/:module/:id', async (req, res) => {
  try {
    const body = req.body.data
      ? req.body
      : { data: [{ id: req.params.id, ...req.body }] };
    const data = await recruitPatch(`${req.params.module}/${req.params.id}`, body);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`Recruit UPDATE ${req.params.module}/${req.params.id}:`, err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────
// CRM ENDPOINTS
// ─────────────────────────────────────────────────

// GET all J1 Participants from CRM
app.get('/api/crm/j1-participants', async (req, res) => {
  try {
    const fields  = Object.values(CRM_FIELDS).join(',');
    const module  = process.env.CRM_J1_MODULE || 'J1_Participants1';
    const records = await fetchAllPages(crmGet, module, fields);
    const data    = records.map(mapCRMRecord);
    console.log(`✅ CRM J1 Participants: ${data.length} records`);
    res.json({ source: 'crm', count: data.length, data });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('CRM J1 Participants error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// GET single CRM record
app.get('/api/crm/:module/:id', async (req, res) => {
  try {
    const data = await crmGet(`${req.params.module}/${req.params.id}`);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// CREATE a CRM record
app.post('/api/crm/:module', async (req, res) => {
  try {
    const data = await crmPost(req.params.module, req.body);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`CRM CREATE ${req.params.module}:`, err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// UPDATE a CRM record
app.patch('/api/crm/:module/:id', async (req, res) => {
  try {
    const body = req.body.data
      ? req.body
      : { data: [{ id: req.params.id, ...req.body }] };
    const data = await crmPatch(`${req.params.module}/${req.params.id}`, body);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`CRM UPDATE ${req.params.module}/${req.params.id}:`, err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────
// SHEET ENDPOINTS
// ─────────────────────────────────────────────────

// GET all spreadsheets in Zoho Sheet
app.get('/api/sheet/list', async (req, res) => {
  try {
    const data = await sheetGet('spreadsheets');
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// GET rows from a specific worksheet
// Query params: ?resource_id=<spreadsheet_id>&sheet_name=<name>&header_row=1
app.get('/api/sheet/:resource_id', async (req, res) => {
  try {
    const params = {
      method:       'worksheet.records.fetch',
      sheet_name:   req.query.sheet_name  || 'Sheet1',
      header_row:   req.query.header_row  || 1,
      start_row:    req.query.start_row   || 1,
    };
    const data = await sheetGet(`${req.params.resource_id}`, params);
    res.json(data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// APPEND rows to a Zoho Sheet worksheet
// Body: { sheet_name: "Sheet1", row_data: [ { col: value } ] }
app.post('/api/sheet/:resource_id/rows', async (req, res) => {
  try {
    const token = await ensureValidToken();
    const { sheet_name = 'Sheet1', row_data } = req.body;
    const r = await axios.post(
      `${ZOHO_SHEET}/${req.params.resource_id}`,
      null,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params:  { method: 'worksheet.records.add', sheet_name, json_data: JSON.stringify(row_data) }
      }
    );
    res.json(r.data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('Sheet append error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// UPDATE a row in a Zoho Sheet worksheet
// Body: { sheet_name, row_index, row_data: { col: value } }
app.patch('/api/sheet/:resource_id/rows/:row_index', async (req, res) => {
  try {
    const token = await ensureValidToken();
    const { sheet_name = 'Sheet1', row_data } = req.body;
    const r = await axios.post(
      `${ZOHO_SHEET}/${req.params.resource_id}`,
      null,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params:  {
          method:     'worksheet.records.update',
          sheet_name,
          row_array:  req.params.row_index,
          json_data:  JSON.stringify(row_data),
        }
      }
    );
    res.json(r.data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('Sheet update error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ─────────────────────────────────────────────────
// COMBINED: Recruit + CRM participants (merged, deduplicated)
// ─────────────────────────────────────────────────
app.get('/api/all-participants', async (req, res) => {
  try {
    const [recruitResult, crmResult] = await Promise.allSettled([
      (async () => {
        const fields  = Object.values(RECRUIT_FIELDS).join(',');
        const module  = process.env.RECRUIT_J1_MODULE || 'J1_Participants';
        const records = await fetchAllPages(recruitGet, module, fields);
        return records.map(mapRecruitRecord);
      })(),
      (async () => {
        const fields  = Object.values(CRM_FIELDS).join(',');
        const module  = process.env.CRM_J1_MODULE || 'J1_Participants1';
        const records = await fetchAllPages(crmGet, module, fields);
        return records.map(mapCRMRecord);
      })(),
    ]);

    const fromRecruit = recruitResult.status === 'fulfilled' ? recruitResult.value : [];
    const fromCRM     = crmResult.status     === 'fulfilled' ? crmResult.value     : [];

    if (recruitResult.status === 'rejected') console.error('❌ Recruit fetch failed:', recruitResult.reason?.message);
    if (crmResult.status     === 'rejected') console.error('❌ CRM fetch failed:',     crmResult.reason?.message);

    // CRM (early-stage) first, then Recruit (later-stage)
    const combined = [...fromCRM, ...fromRecruit];
    console.log(`✅ All participants: ${fromRecruit.length} Recruit + ${fromCRM.length} CRM = ${combined.length} total`);
    res.json({
      source:  'recruit+crm',
      recruit: fromRecruit.length,
      crm:     fromCRM.length,
      total:   combined.length,
      data:    combined,
    });
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// ============================
// SOCIAL MEDIA DISCLOSURE — save to Excel
// ============================
const XLSX       = require('xlsx');
const EXCEL_FILE = path.join(__dirname, 'social_media_disclosures.xlsx');

function getOrCreateWorkbook() {
  if (fs.existsSync(EXCEL_FILE)) {
    return XLSX.readFile(EXCEL_FILE);
  }
  const wb = XLSX.utils.book_new();
  const headers = [
    'Submitted At','First Name','Last Name','Email','Phone','Nationality',
    'Hosting Company','Program Start','Program End',
    'Platform','Username',
    'Privacy Setting','Confirmed Accurate','No Prohibited Content',
    'Terms Agreed','Typed Signature'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Disclosures');
  XLSX.writeFile(wb, EXCEL_FILE);
  return wb;
}

app.post('/api/social-media-disclosure', (req, res) => {
  try {
    const d   = req.body;
    const wb  = getOrCreateWorkbook();
    const ws  = wb.Sheets['Disclosures'];
    const row = [
      new Date().toLocaleString(),
      d.firstName, d.lastName, d.email, d.phone, d.nationality,
      d.hostingCompany, d.startDate, d.endDate,
      d.platform, d.username,
      d.privacySetting,
      d.confirmedAccurate ? 'Yes' : 'No',
      d.noProhibitedContent ? 'Yes' : 'No',
      d.termsAgreed ? 'Yes' : 'No',
      d.signature
    ];
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: -1 });
    XLSX.writeFile(wb, EXCEL_FILE);
    console.log(`📋 Social media disclosure saved — ${d.firstName} ${d.lastName}`);
    res.json({ success: true, message: 'Disclosure submitted successfully.' });
  } catch (err) {
    console.error('Disclosure save error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Cache clear (force immediate re-fetch from Zoho) ──────────────────────────
app.get('/api/cache/clear', (req, res) => {
  clearCache();
  console.log('🧹 API cache cleared');
  res.json({ success: true, message: 'Cache cleared — next request will fetch fresh data from Zoho' });
});

// ─────────────────────────────────────────────────────────────────────────────
// MAKE SNAPSHOT — fetch all 4 live endpoints → write offline data to data.js
// Visit http://localhost:3000/api/make-snapshot to regenerate GitHub Pages data
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/make-snapshot', async (req, res) => {
  try {
    const today   = new Date().toISOString().slice(0, 10);
    const port    = process.env.PORT || 3000;
    const base    = `http://localhost:${port}`;
    const report  = {};

    // Fetch all 4 data endpoints in parallel
    const [travelRes, reqRes, visaRes, placementRes] = await Promise.allSettled([
      axios.get(`${base}/api/zoho/j1-travel`,       { timeout: 120000 }),
      axios.get(`${base}/api/zoho/j1-requisition`,  { timeout: 60000  }),
      axios.get(`${base}/api/zoho/j1-visa`,         { timeout: 60000  }),
      axios.get(`${base}/api/zoho/j1-placements`,   { timeout: 60000  }),
    ]);

    // Map: JS variable name → fetched { columns, rows } data
    const snapshots = [
      { varName: 'J1_TRAVEL_OFFLINE_DATA',      result: travelRes      },
      { varName: 'J1_REQUISITION_OFFLINE_DATA',  result: reqRes         },
      { varName: 'J1_VISA_OFFLINE_DATA',         result: visaRes        },
      { varName: 'J1_PLACEMENT_OFFLINE_DATA',    result: placementRes   },
    ];

    const dataJsPath = path.join(__dirname, 'data.js');
    let content = fs.readFileSync(dataJsPath, 'utf8');

    for (const { varName, result } of snapshots) {
      if (result.status !== 'fulfilled') {
        report[varName] = `SKIPPED — fetch failed: ${result.reason?.message}`;
        continue;
      }
      const data = result.value?.data?.data;   // { columns, rows }
      if (!data?.rows?.length) {
        report[varName] = 'SKIPPED — no rows returned';
        continue;
      }

      const json     = JSON.stringify(data);
      const newBlock = `window.${varName} = ${json};`;

      // Replace existing assignment (single-line or multi-line object)
      const regex = new RegExp(`window\\.${varName}\\s*=[\\s\\S]+?;(?=\\s*\\n|\\s*$)`);
      if (regex.test(content)) {
        content = content.replace(regex, newBlock);
        report[varName] = `updated — ${data.rows.length} rows`;
      } else {
        content += `\n// ${varName} snapshot (auto-generated ${today})\n${newBlock}\n`;
        report[varName] = `appended — ${data.rows.length} rows`;
      }
    }

    fs.writeFileSync(dataJsPath, content, 'utf8');
    console.log(`✅ Snapshot written to data.js on ${today}`, report);
    res.json({ success: true, date: today, snapshots: report });

  } catch (err) {
    console.error('make-snapshot error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  CTI Group Command Center`);
  console.log(`  http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!tokens.refreshToken) {
    console.log('\n⚠️  Zoho not connected yet.');
    console.log(`   → Visit http://localhost:${PORT}/auth/zoho to authorize\n`);
  } else {
    console.log('\n✅ Zoho Analytics connected\n');
  }
});
