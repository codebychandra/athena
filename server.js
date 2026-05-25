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
  // 1. Try local file first (local dev)
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
      console.log('✅ Zoho tokens loaded from file');
      return;
    }
  } catch (e) {
    console.warn('Could not load tokens from file:', e.message);
  }
  // 2. Fall back to environment variable (Railway / cloud deployment)
  if (process.env.ZOHO_REFRESH_TOKEN) {
    tokens.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    tokens.accessToken  = null;   // will be refreshed on first request
    tokens.expiresAt    = 0;
    console.log('✅ Zoho refresh token loaded from environment variable');
  }
}

function saveTokens() {
  // Save to file (local dev); on Railway the file is ephemeral but that's OK —
  // the refresh token comes from env vars and access token is refreshed in memory.
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (e) {
    // Non-fatal on read-only / ephemeral filesystems
    console.warn('Could not save tokens to file (non-fatal):', e.message);
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

// ============================
// OAUTH ROUTES
// ============================

app.get('/auth/zoho', (req, res) => {
  const scopes = [
    // Zoho Analytics — read + metadata
    'ZohoAnalytics.data.read',
    'ZohoAnalytics.metadata.read',
    // Zoho Recruit — CREATE, READ, UPDATE (no DELETE)
    'ZohoRecruit.modules.ALL',
    'ZohoRecruit.settings.READ',
    'ZohoRecruit.bulk.READ',
    // Zoho CRM — CREATE, READ, UPDATE (no DELETE)
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.READ',
    'ZohoCRM.bulk.READ',
    'ZohoCRM.users.READ',
    // Zoho Sheet — CREATE, READ, UPDATE (no DELETE)
    'ZohoSheet.dataAPI.READ',
    'ZohoSheet.dataAPI.CREATE',
    'ZohoSheet.dataAPI.UPDATE',
    // Zoho WorkDrive — read-only for file/folder discovery
    'WorkDrive.workspace.READ',
    'WorkDrive.files.READ',
    'WorkDrive.links.READ',
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


// ─────────────────────────────────────────────────────────────────────────────
// J1 REQUISITION — source: Zoho Recruit "Job_Openings" module
// Filter: Placement_Category = 'J1 Program' AND Requisition_Status = 'Active'
// ─────────────────────────────────────────────────────────────────────────────

// Column display map: [display label, getter from mapJobRecord result]
const REQ_COL_MAP = [
  ['Hosting Company',      j => j.hostingCompany],                                          // 0
  ['Department',           j => j.department],                                              // 1
  ['Position Name',        j => j.positionName],                                           // 2
  ['Requisition',          j => String(j.numPositions || '')],                             // 3
  ['Client Name',          j => j.clientName],                                             // 4
  ['J1 Program Type',      j => j.j1ProgramType],                                         // 5
  ['Requisition Status',   j => j.status],                                                 // 6
  ['Contract Length',      j => j.contractLength],                                         // 7
  ['Salary',               j => j.salary],                                                 // 8
  ['City',                 j => [j.city, j.state].filter(v => v && v !== '—').join(', ') || '—'], // 9
  ['Target Date',          j => j.targetDate  || ''],                                      // 10
  ['Date Opened',          j => j.dateOpened  || ''],                                      // 11
  ['Housing Availability', j => j.housingAvail],                                           // 12
  ['Payment Frequency',    j => j.paymentFrequency],                                       // 13
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
  passportNumber:     'Passport_Number',
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
  department:         'Department',
  selectedJob:        'Select_a_Job',
  hostCompany:        'Hosting_Company_2',
  processingSponsor:  'Processing_Sponsor',
  sponsorStatus:      'Sponsor_Interview_Status',
  hcInterviewStatus:  'Hosting_Company_Interview_Status',
  housingAvailability:'Housing_Availability',
  housingLandlord:    'Housing_Name',                             // API name verified — label is "Housing Landlord"
  housingPaymentInit: 'Initial_Housing_Payment_Before_Departure',
  housingPaymentMo:   'Housing_Price',                            // API name verified — label is "Monthly Housing Payment"
  housingAddress:     'Housing_Address',
  visaStatus:         'J1_Visa_Status',
  visaExpiredDate:    'J1_Visa_Expired_Date',
  visaAppointment:    'J1_Visa_Appointment_Date',
  visaPaymentDate:    'J1_Visa_Payment_Date',
  visaNumber:         'J1_Visa_Number',
  refLetterStatus:    'Reference_Letter_Status',
  flightBooked:       'Flight_Ticket_Status',
  ticketPayStatus:    'Ticket_Payment_Status',
  ticketPricing:      'Ticket_Pricing',
  ticketPayMethod:    'Flight_Ticket_Payment_Method',             // API name verified
  airline:            'Airline',
  pnrNumber:          'PNR_Number',
  tripFrom:           'Trip_From',
  tripTo:             'Trip_To',
  departureDate:      'Departure_Date',
  arrivalDate:        'Arrival_Date',
  airportGateway:     'Airport_Gateway',
  airportPickup:      'Airport_Pick_Up',
  transportCost:      'Currency_1',                               // API name verified — label is "Transportation Cost"
  returnFlightStatus: 'Returning_Flight_Ticket_Status',
  returnDeparture:    'Returning_Departure_Date',
  returnArrival:      'Returning_Arrival_Date',
  returnAirline:      'Returning_Airline',
  returnPNR:          'Returning_Airline_PNR_Number',
  returnTripFrom:     'Returning_Trip_From',
  returnTripTo:       'Returning_Trip_To',
  returnGateway:      'Returning_Airport_Gateway',
  returnTicketPrice:  'Returning_Ticket_Pricing',                  // API name verified
  returnTicketPayStatus: 'Returning_Ticket_Payment_Status',       // API name verified
  returnTransportCost:'Return_Transportation_Cost',
  dateOfBirth:           'Date_Of_Birth',
  consultationCallDate:  'Consultation_Call_Date',
  consultationCallBy:    'Consultation_Call_Done_By',
  consultationCallNotes: 'Consultation_Call_Notes',
  consultationCallStatus:'Consultation_Call_Status',
  englishAssessment:     'English_Assessment',
  participantRating:     'Participant_Rating',
  attendance:            'Attendance',
  financialReadinessDate:'Financial_Readiness_Date',
  visaAppt2:             'J1_Visa_2nd_Appointment_Date',
  visaAppt3:             'J1_Visa_3rd_Appointment_Date',
  ctiUsaReview:          'CTI_USA_s_Review',
};

const CRM_FIELDS = {
  fullName:               'Full_Name',
  firstName:              'First_Name',
  lastName:               'Last_Name',
  passportNumber:         'Passport_Number',
  email:                  'Email',
  country:                'Country',
  phone:                  'Phone_Number',
  gender:                 'Gender',
  appStatus:              'J1_Application_Status',
  programSource:          'J1_Program_Source',
  programType:            'Program_Option',
  hostCompany:            'Hosting_Company',
  department:             'Department',
  processingSponsor:      'Processing_Sponsor',
  hcInterviewStatus:      'Host_Company_Interview_Status',
  age:                    'Age',
  positionApplied:        'Position_Applied',
  permanentAddress:       'Permanent_Address',
  ctiUsaReview:           'CTI_USA_s_Review',
  eligiblePrograms:       'Eligible_Programs',
  consultationCallStatus: 'Consultation_Call_Status',
  consultationCallNotes:  'Consultation_Call_Notes',
  dateOfBirth:            'Date_Of_Birth',
  consultationCallDate:   'Consultation_Call_Date',
  consultationCallBy:     'Consultation_Call_Done_By',
  englishAssessment:      'English_Assessment',
  participantRating:      'Participant_Rating',
  attendance:             'Attendance',
  financialReadinessDate: 'Financial_Readiness_Date',
  housingAvailability:    'Housing_Availability',
  housingLandlord:        'Housing_Landlord',              // CRM label: "Housing Landlord"
  housingPaymentInit:     'Initial_Housing_Payment_Before_Departure',
  housingPaymentMo:       'Monthly_Housing_Payment',       // CRM uses different name than Recruit
  housingAddress:         'Housing_Address',
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
  j1ProgramType:     'xx',                 // API name discovered via /api/discover/recruit/fields/Job_Openings
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
  // Zoho Recruit API v2 uses PUT (not PATCH) for record updates
  const r = await axios.put(`${ZOHO_RECRUIT}/${endpoint}`, body, {
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
    passportNumber:      r[F.passportNumber]     || '—',
    country:             r[F.country]            || '—',
    gender:              r[F.gender]             || '—',
    email:               r[F.email]              || '—',
    phone:               r[F.phone]              || '—',
    programType:         r[F.programType]        || '—',
    programSource:       r[F.programSources]     || '—',
    placementStatus:     r[F.appStatus]          || '—',
    processingSponsor:   r[F.processingSponsor]  || '—',
    department:          r[F.department]         || '—',
    selectedJob:         r[F.selectedJob]        || '—',
    hostCompany:         r[F.hostCompany]?.name  || r[F.hostCompany] || '—',
    hostCompanyId:       r[F.hostCompany]?.id   || null,
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
    visaExpiredDate:     r[F.visaExpiredDate]    || null,
    visaStatus:          r[F.visaStatus]         || '—',
    visaNumber:          r[F.visaNumber]         || '—',
    visaAppointment:     r[F.visaAppointment]    || null,
    visaPaymentDate:     r[F.visaPaymentDate]    || null,
    refLetterStatus:     r[F.refLetterStatus]    || '—',
    dateOfBirth:           r[F.dateOfBirth]           || null,
    consultationCallDate:  r[F.consultationCallDate]  || null,
    consultationCallBy:    r[F.consultationCallBy]    || '—',
    consultationCallNotes: r[F.consultationCallNotes] || '—',
    consultationCallStatus:r[F.consultationCallStatus]|| '—',
    englishAssessment:     arr(r[F.englishAssessment]),
    participantRating:     r[F.participantRating]     || '—',
    attendance:            r[F.attendance]            || '—',
    financialReadinessDate:r[F.financialReadinessDate]|| null,
    visaAppt2:             r[F.visaAppt2]             || null,
    visaAppt3:             r[F.visaAppt3]             || null,
    ctiUsaReview:          r[F.ctiUsaReview]          || '—',
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
  // CRM custom modules often return Full_Name but leave Last_Name null —
  // derive last name from Full_Name by removing the First_Name prefix
  const fullN  = (r[CF.fullName]  || '').trim();
  const firstN = (r[CF.firstName] || '').trim();
  const lastN  = (r[CF.lastName]  || '').trim()
    || (fullN && firstN && fullN.startsWith(firstN)
        ? fullN.slice(firstN.length).trim()
        : fullN.split(' ').slice(1).join(' ').trim());
  return {
    _source:                'crm',
    id:                     'crm_' + r.id,
    name:                   fullN || [firstN, lastN].filter(Boolean).join(' ') || '—',
    firstName:              firstN || '—',
    lastName:               lastN  || '—',
    passportNumber:         r[CF.passportNumber]         || '—',
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
    dateOfBirth:            r[CF.dateOfBirth]            || null,
    consultationCallDate:   r[CF.consultationCallDate]   || null,
    consultationCallBy:     r[CF.consultationCallBy]     || '—',
    englishAssessment:      arr(r[CF.englishAssessment]),
    participantRating:      r[CF.participantRating]      || '—',
    attendance:             r[CF.attendance]             || '—',
    financialReadinessDate: r[CF.financialReadinessDate] || null,
    programType:            r[CF.programType]            || '—',
    programSource:          r[CF.programSource]          || '—',
    department:             r[CF.department]             || '—',
    processingSponsor:      r[CF.processingSponsor]      || '—',
    hcInterviewStatus:      r[CF.hcInterviewStatus]      || '—',
    eligiblePrograms:       arr(r[CF.eligiblePrograms]),
    placementStatus:        r[CF.appStatus]              || '—',
    hostCompany:            r[CF.hostCompany]?.name || r[CF.hostCompany] || '—',
    hostCompanyId:          r[CF.hostCompany]?.id   || null,
    housingAvailability:    r[CF.housingAvailability]    || '—',
    housingLandlord:        r[CF.housingLandlord]        || '—',
    housingPaymentInit:     r[CF.housingPaymentInit]     || null,
    housingPaymentMo:       r[CF.housingPaymentMo]       || null,
    housingAddress:         r[CF.housingAddress]         || '—',
    // CRM does not have program dates or flight/visa/travel fields
    programStart:           null,
    programEnd:             null,
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
// Raw field dump — returns all keys of the first record to verify API field names
app.get('/api/recruit/raw-fields', async (req, res) => {
  try {
    const module = process.env.RECRUIT_J1_MODULE || 'J1_Participants';
    const data   = await recruitGet(module, { per_page: 1 });
    const record = data.data?.[0] || {};
    const keys   = Object.keys(record).sort();
    const visaKeys = keys.filter(k => /visa|letter|supporting/i.test(k));
    res.json({ total_fields: keys.length, visa_related: visaKeys, all_keys: keys, sample: record });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

app.get('/api/recruit/j1-participants', async (req, res) => {
  try {
    const cached = getCached('recruit-j1-participants');
    if (cached) return res.json(cached);
    const fields  = Object.values(RECRUIT_FIELDS).join(',');
    const module  = process.env.RECRUIT_J1_MODULE || 'J1_Participants';
    const records = await fetchAllPages(recruitGet, module, fields);
    const data    = records.map(mapRecruitRecord);
    const payload = { source: 'recruit', count: data.length, data };
    setCached('recruit-j1-participants', payload);
    console.log(`✅ Recruit J1 Participants: ${data.length} records`);
    res.json(payload);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('Recruit J1 Participants error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// GET Job Openings from Recruit
app.get('/api/recruit/job-openings', async (req, res) => {
  try {
    const cached = getCached('recruit-job-openings');
    if (cached) return res.json(cached);
    const fields  = Object.values(JOB_FIELDS).join(',');
    const module  = process.env.RECRUIT_JOB_MODULE || 'Job_Openings';
    const records = await fetchAllPages(recruitGet, module, fields);
    const data    = records.map(mapJobRecord);
    const payload = { source: 'recruit', count: data.length, data };
    setCached('recruit-job-openings', payload);
    console.log(`✅ Recruit Job Openings: ${data.length} records`);
    res.json(payload);
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
      : { data: [{ ...req.body }] };
    console.log(`🔧 Recruit PATCH payload:`, JSON.stringify(body, null, 2));
    const data = await recruitPatch(`${req.params.module}/${req.params.id}`, body);
    // Bust participant cache so next fetch returns fresh data
    clearCache('recruit-j1-participants');
    console.log(`✅ Recruit UPDATE ${req.params.module}/${req.params.id} — cache cleared`);
    res.json(data);
  } catch (err) {
    const zohoDetail = err.response?.data;
    const zohoMsg    = zohoDetail?.data?.[0]?.message || zohoDetail?.message || null;
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`Recruit UPDATE ${req.params.module}/${req.params.id}:`, zohoDetail || err.message);
    res.status(status).json({ error: zohoMsg || err.message, details: zohoDetail });
  }
});

// ─────────────────────────────────────────────────
// CRM ENDPOINTS
// ─────────────────────────────────────────────────

// GET all J1 Participants from CRM
app.get('/api/crm/j1-participants', async (req, res) => {
  try {
    const cached = getCached('crm-j1-participants');
    if (cached) return res.json(cached);
    const fields  = Object.values(CRM_FIELDS).join(',');
    const module  = process.env.CRM_J1_MODULE || 'J1_Participants1';
    const records = await fetchAllPages(crmGet, module, fields);
    const data    = records.map(mapCRMRecord);
    const payload = { source: 'crm', count: data.length, data };
    setCached('crm-j1-participants', payload);
    console.log(`✅ CRM J1 Participants: ${data.length} records`);
    res.json(payload);
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
      : { data: [{ ...req.body }] };
    console.log(`🔧 CRM PATCH payload:`, JSON.stringify(body, null, 2));
    const data = await crmPatch(`${req.params.module}/${req.params.id}`, body);
    // Bust participant cache so next fetch returns fresh data
    clearCache('crm-j1-participants');
    console.log(`✅ CRM UPDATE ${req.params.module}/${req.params.id} — cache cleared`);
    res.json(data);
  } catch (err) {
    const zohoDetail = err.response?.data;
    const zohoMsg    = zohoDetail?.data?.[0]?.message || zohoDetail?.message || null;
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error(`CRM UPDATE ${req.params.module}/${req.params.id}:`, zohoDetail || err.message);
    res.status(status).json({ error: zohoMsg || err.message, details: zohoDetail });
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


// ── Cache clear (force immediate re-fetch from Zoho) ──────────────────────────
app.get('/api/cache/clear', (req, res) => {
  clearCache();
  console.log('🧹 API cache cleared');
  res.json({ success: true, message: 'Cache cleared — next request will fetch fresh data from Zoho' });
});


// ============================
// DISCOVERY ENDPOINTS
// Enumerate every module, field, and worksheet available in this Zoho account
// ============================

// ── Helpers ────────────────────────────────────────────────────────────────
async function listRecruitModules(token) {
  const r = await axios.get(`${ZOHO_RECRUIT}/settings/modules`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return (r.data?.modules || []).map(m => ({
    apiName: m.api_name,
    label:   m.singular_label || m.plural_label || m.api_name,
    id:      m.id,
  }));
}

async function listCRMModules(token) {
  const r = await axios.get(`${ZOHO_CRM}/settings/modules`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return (r.data?.modules || []).map(m => ({
    apiName: m.api_name,
    label:   m.singular_label || m.plural_label || m.api_name,
    id:      m.id,
    editable: m.editable,
  }));
}

async function listRecruitFields(token, module) {
  const r = await axios.get(`${ZOHO_RECRUIT}/settings/fields`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    params:  { module }
  });
  return (r.data?.fields || []).map(f => ({
    apiName:  f.api_name,
    label:    f.field_label,
    type:     f.data_type,
    required: f.system_mandatory || false,
  }));
}

async function listCRMFields(token, module) {
  const r = await axios.get(`${ZOHO_CRM}/settings/fields`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    params:  { module }
  });
  return (r.data?.fields || []).map(f => ({
    apiName:  f.api_name,
    label:    f.field_label,
    type:     f.data_type,
    required: f.system_mandatory || false,
  }));
}

async function listWorksheets(token, resourceId) {
  const body = new URLSearchParams();
  body.set('method', 'worksheet.list');
  const r = await axios.post(`${ZOHO_SHEET}/${resourceId}`, body.toString(), {
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  if (r.data?.status === 'failure') {
    throw new Error(`Sheet API ${r.data.error_code}: ${r.data.error_message}`);
  }
  // API returns worksheet_names array or worksheets array
  return r.data?.worksheet_names
      || (r.data?.worksheets || []).map(w => w.worksheet_name || w.name || w)
      || [];
}

async function listAllSpreadsheets(token) {
  try {
    const r = await axios.get(`${ZOHO_SHEET}/spreadsheets`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    return (r.data?.spreadsheets || r.data?.workbooks || []).map(s => ({
      id:   s.resource_id || s.spreadsheet_id || s.id,
      name: s.spreadsheet_name || s.name,
    }));
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

async function listWorkDriveSheets(token) {
  try {
    const WORKDRIVE = 'https://workdrive.zoho.com/api/v1';
    // List files filtered to Zoho Sheet type
    const r = await axios.get(`${WORKDRIVE}/files`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params:  { filter_type: 'zsheet' }
    });
    return (r.data?.data || []).map(f => ({
      id:   f.id,
      name: f.attributes?.name || f.name,
      type: f.attributes?.type || f.type,
    }));
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

// ── GET /api/discover/sheets/:resource_id/raw-fetch ──────────────────────
// Debug: shows the raw Zoho Sheet API response for worksheet.records.fetch
app.get('/api/discover/sheets/:resource_id/raw-fetch', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const sheetName  = req.query.sheet || 'J1 Visa Log';
    const body       = new URLSearchParams();
    body.set('method',          'worksheet.records.fetch');
    body.set('worksheet_name',  sheetName);
    body.set('header_row',      '1');
    body.set('start_row_index', '0');
    body.set('row_count',       '5');   // just first 5 rows for debug
    const r = await axios.post(
      `${ZOHO_SHEET}/${req.params.resource_id}`, body.toString(),
      { headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json({ requestedSheet: sheetName, response: r.data });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/recruit/modules ─────────────────────────────────────
app.get('/api/discover/recruit/modules', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const modules = await listRecruitModules(token);
    console.log(`🔍 Recruit modules: ${modules.length}`);
    res.json({ count: modules.length, modules });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/recruit/fields/:module ──────────────────────────────
app.get('/api/discover/recruit/fields/:module', async (req, res) => {
  try {
    const token  = await ensureValidToken();
    const fields = await listRecruitFields(token, req.params.module);
    console.log(`🔍 Recruit ${req.params.module} fields: ${fields.length}`);
    res.json({ module: req.params.module, count: fields.length, fields });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/crm/modules ─────────────────────────────────────────
app.get('/api/discover/crm/modules', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const modules = await listCRMModules(token);
    console.log(`🔍 CRM modules: ${modules.length}`);
    res.json({ count: modules.length, modules });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/crm/fields/:module ──────────────────────────────────
app.get('/api/discover/crm/fields/:module', async (req, res) => {
  try {
    const token  = await ensureValidToken();
    const fields = await listCRMFields(token, req.params.module);
    console.log(`🔍 CRM ${req.params.module} fields: ${fields.length}`);
    res.json({ module: req.params.module, count: fields.length, fields });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/sheets ──────────────────────────────────────────────
// Lists all spreadsheets accessible in this account
app.get('/api/discover/sheets', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const [direct, workdrive] = await Promise.all([
      listAllSpreadsheets(token),
      listWorkDriveSheets(token),
    ]);
    res.json({ direct, workdrive });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover/sheets/:resource_id/worksheets ─────────────────────
// Lists all worksheets (tabs) inside a spreadsheet
app.get('/api/discover/sheets/:resource_id/worksheets', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const worksheets = await listWorksheets(token, req.params.resource_id);
    res.json({ resource_id: req.params.resource_id, count: worksheets.length, worksheets });
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message, details: err.response?.data });
  }
});

// ── GET /api/discover ─────────────────────────────────────────────────────
// Full account discovery — all modules + spreadsheets in one call
app.get('/api/discover', async (req, res) => {
  try {
    const token = await ensureValidToken();

    const [
      recruitModRes, crmModRes,
      spreadsheetRes, workdriveRes,
    ] = await Promise.allSettled([
      listRecruitModules(token),
      listCRMModules(token),
      listAllSpreadsheets(token),
      listWorkDriveSheets(token),
    ]);

    const ok = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.response?.data || r.reason?.message };

    const report = {
      generatedAt: new Date().toISOString(),
      recruit: {
        modules:      ok(recruitModRes),
        moduleCount:  recruitModRes.status === 'fulfilled' ? recruitModRes.value.length : 0,
      },
      crm: {
        modules:     ok(crmModRes),
        moduleCount: crmModRes.status === 'fulfilled' ? crmModRes.value.length : 0,
      },
      sheets: {
        allSpreadsheets: ok(spreadsheetRes),
        workdrive:       ok(workdriveRes),
      },
    };

    console.log(`✅ Discovery complete — ${report.recruit.moduleCount} Recruit modules, ${report.crm.moduleCount} CRM modules`);
    res.json(report);
  } catch (err) {
    res.status(err.message === 'NOT_AUTHENTICATED' ? 401 : 500)
       .json({ error: err.message });
  }
});

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
    // Warm up cache on startup
    warmUpCaches();
  }
});

// ── Proactive 10-minute data refresh ─────────────────────────
async function warmUpCaches() {
  console.log('🔄 Warming up data caches...');
  try {
    const [rRes, cRes, jRes] = await Promise.allSettled([
      fetchAllPages(recruitGet, process.env.RECRUIT_J1_MODULE || 'J1_Participants',
        Object.values(RECRUIT_FIELDS).join(',')),
      fetchAllPages(crmGet, process.env.CRM_J1_MODULE || 'J1_Participants1',
        Object.values(CRM_FIELDS).join(',')),
      fetchAllPages(recruitGet, process.env.RECRUIT_JOB_MODULE || 'Job_Openings',
        Object.values(JOB_FIELDS).join(',')),
    ]);
    if (rRes.status === 'fulfilled') {
      const data = rRes.value.map(mapRecruitRecord);
      setCached('recruit-j1-participants', { source:'recruit', count:data.length, data });
      console.log(`✅ Recruit J1 Participants: ${data.length} records`);
    } else { console.warn('⚠️  Recruit J1:', rRes.reason?.message); }

    if (cRes.status === 'fulfilled') {
      const data = cRes.value.map(mapCRMRecord);
      setCached('crm-j1-participants', { source:'crm', count:data.length, data });
      console.log(`✅ CRM J1 Participants: ${data.length} records`);
    } else { console.warn('⚠️  CRM J1:', cRes.reason?.message); }

    if (jRes.status === 'fulfilled') {
      const data = jRes.value.map(mapJobRecord);
      setCached('recruit-job-openings', { source:'recruit', count:data.length, data });
      console.log(`✅ Job Openings: ${data.length} records`);
    } else { console.warn('⚠️  Job Openings:', jRes.reason?.message); }

    console.log('✅ Cache warm-up complete\n');
  } catch (e) {
    console.error('❌ Cache warm-up error:', e.message);
  }
}

// Refresh all caches every 10 minutes
setInterval(() => {
  if (tokens.refreshToken) {
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Auto-refreshing Zoho data...`);
    warmUpCaches();
  }
}, CACHE_TTL);
