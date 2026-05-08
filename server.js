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

  // Refresh expired token
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

// ============================
// INIT
// ============================
loadTokens();
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ============================
// OAUTH ROUTES
// ============================

// Step 1: Redirect user to Zoho login
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

// Step 2: Zoho redirects back with a code
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

// Connection status
app.get('/api/status', (req, res) => {
  res.json({
    connected:  !!tokens.refreshToken,
    expiresAt:  tokens.expiresAt,
    hasToken:   !!tokens.accessToken
  });
});

// List all workspaces (for debugging/discovery)
app.get('/api/zoho/workspaces', async (req, res) => {
  try {
    const token    = await ensureValidToken();
    const response = await axios.get(`${ZOHO_ANALYTICS}/workspaces`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    res.json(response.data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

// List views in a workspace (for debugging)
app.get('/api/zoho/workspaces/:wsId/views', async (req, res) => {
  try {
    const token    = await ensureValidToken();
    const response = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${req.params.wsId}/views`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
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
    const token = await ensureValidToken();

    // 1. List all workspaces
    const wsRes = await axios.get(`${ZOHO_ANALYTICS}/workspaces`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    const workspaces = wsRes.data.data?.workspaces || [];
    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'No workspaces found in your Zoho Analytics account' });
    }

    let foundWs   = null;
    let foundView = null;

    // 2. Search each workspace for "J1 Placement Report"
    for (const ws of workspaces) {
      const viewsRes = await axios.get(
        `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const views = viewsRes.data.data?.views || [];
      const match = views.find(v =>
        v.viewName === 'J1 Placement Report' ||
        v.viewName.toLowerCase().includes('j1 placement')
      );
      if (match) { foundWs = ws; foundView = match; break; }
    }

    if (!foundView) {
      // Return list of available workspaces/views to help diagnose
      const allViews = [];
      for (const ws of workspaces.slice(0, 5)) {
        const viewsRes = await axios.get(
          `${ZOHO_ANALYTICS}/workspaces/${ws.workspaceId}/views`,
          { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
        );
        const views = (viewsRes.data.data?.views || []).map(v => ({
          workspace: ws.workspaceName,
          viewName:  v.viewName,
          viewId:    v.viewId
        }));
        allViews.push(...views);
      }
      return res.status(404).json({
        error:           'J1 Placement Report not found',
        availableViews:  allViews
      });
    }

    // 3. Fetch actual data
    const dataRes = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${foundWs.workspaceId}/views/${foundView.viewId}/data`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    res.json({
      source:    'zoho',
      workspace: foundWs.workspaceName,
      view:      foundView.viewName,
      data:      dataRes.data.data
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
    const token    = await ensureValidToken();
    const response = await axios.get(
      `${ZOHO_ANALYTICS}/workspaces/${req.params.wsId}/views/${req.params.viewId}/data`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    res.json(response.data);
  } catch (err) {
    const status = err.message === 'NOT_AUTHENTICATED' ? 401 : 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
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
