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

// ============================
// INIT
// ============================
loadTokens();
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ============================
// OAUTH ROUTES
// ============================

app.get('/auth/zoho', (req, res) => {
  const scopes = [
    'ZohoAnalytics.data.read',
    'ZohoAnalytics.metadata.read'
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
app.get('/api/zoho/j1-placements', async (req, res) => {
  try {
    const token      = await ensureValidToken();
    const headers    = await zohoHeaders(token);
    const workspaces = await getAllWorkspaces(token);

    console.log('Workspaces found:', workspaces.map(w => w.workspaceName));

    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'No workspaces found in your Zoho Analytics account' });
    }

    let foundWs   = null;
    let foundView = null;

    for (const ws of workspaces) {
      const viewsRes = await axios.get(
        `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`,
        { headers }
      );
      const views = viewsRes.data.data?.views || [];
      const match = views.find(v =>
        v.viewName === 'J1 Placement Report' ||
        v.viewName.toLowerCase().includes('j1 placement')
      );
      if (match) { foundWs = ws; foundView = match; break; }
    }

    if (!foundView) {
      const allViews = [];
      for (const ws of workspaces.slice(0, 5)) {
        const viewsRes = await axios.get(
          `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`,
          { headers }
        );
        const views = (viewsRes.data.data?.views || []).map(v => ({
          workspace: ws.workspaceName,
          viewName:  v.viewName,
          viewId:    v.viewId
        }));
        allViews.push(...views);
      }
      return res.status(404).json({
        error:          'J1 Placement Report not found',
        availableViews: allViews
      });
    }

    const dataRes = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${foundWs.workspaceId}/views/${foundView.viewId}/data`,
      { headers }
    );

    // Zoho returns CSV text — parse it into { columns, rows }
    const rawData    = dataRes.data;
    const parsedData = typeof rawData === 'string'
      ? parseCSV(rawData)
      : (rawData && rawData.columns ? rawData : parseCSV(String(rawData || '')));

    res.json({
      source:    'zoho',
      workspace: foundWs.workspaceName,
      view:      foundView.viewName,
      data:      parsedData
    });

  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    console.error('J1 fetch error:', err.response?.data || err.message);
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// Generic view data fetch by IDs
app.get('/api/zoho/workspaces/:wsId/views/:viewId/data', async (req, res) => {
  try {
    const token   = await ensureValidToken();
    const headers = await zohoHeaders(token);
    const response = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${req.params.wsId}/views/${req.params.viewId}/data`,
      { headers }
    );
    res.json(response.data);
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
    'Hosting Company','Programme Start','Programme End',
    'Platform','Username',
    'Privacy Setting','Confirmed Accurate','No Prohibited Content',
    'Monitoring Consent','Terms Agreed','Typed Signature'
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
      d.monitoringConsent ? 'Yes' : 'No',
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
