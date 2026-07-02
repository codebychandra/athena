// ─────────────────────────────────────────────────────────────────────────────
//  CTI Athena — Cloudflare Worker  (replaces Railway/Express server.js)
//
//  Secrets  →  set once via Cloudflare dashboard or: wrangler secret put NAME
//    ZOHO_CLIENT_ID
//    ZOHO_CLIENT_SECRET
//    ZOHO_REFRESH_TOKEN
//
//  KV namespace → create then paste the ID into wrangler.toml
//    wrangler kv:namespace create TOKEN_CACHE
//    binding = "TOKEN_CACHE"
// ─────────────────────────────────────────────────────────────────────────────

const ZOHO_ACCOUNTS = 'https://accounts.zoho.com';
const ZOHO_RECRUIT  = 'https://recruit.zoho.com/recruit/v2';
const ZOHO_CRM      = 'https://www.zohoapis.com/crm/v2';
const DATA_TTL      = 1800;  // 30-minute data cache (seconds)
const TOKEN_TTL     = 3540;  // ~59-minute token cache (seconds)

// ── Allowed origins (GitHub Pages + local dev) ────────────────────────────
const ALLOWED_ORIGINS = [
  'https://codebychandra.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function corsHeaders(origin) {
  const o = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  o,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });
}

// ── Token management (cached in KV) ──────────────────────────────────────
async function getToken(env) {
  try {
    const cached = await env.TOKEN_CACHE.get('access_token', { type: 'json' });
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  } catch (_) {}

  const body = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id:     env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type:    'refresh_token',
  });
  const res  = await fetch(`${ZOHO_ACCOUNTS}/oauth/v2/token`, { method: 'POST', body });
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const entry = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  await env.TOKEN_CACHE.put('access_token', JSON.stringify(entry), { expirationTtl: TOKEN_TTL });
  return entry.token;
}

// ── Zoho API helpers ──────────────────────────────────────────────────────
async function zGet(url, token, params = {}) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  const r = await fetch(u.toString(), { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  return r.json();
}

async function zPut(url, token, body) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function zPatch(url, token, body) {
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function fetchAll(token, base, module, fields) {
  let all = [], page = 1, more = true;
  while (more) {
    const params = { page, per_page: 200 };
    // Empty/null fields => let Zoho return every field on the layout.
    // (Some modules silently drop fields from the response when a long fields
    // list is requested.)
    if (fields) params.fields = fields;
    const data = await zGet(`${base}/${module}`, token, params);
    const records = data.data || [];
    all = all.concat(records);
    more = data.info?.more_records === true;
    page++;
  }
  return all;
}

// ── Zoho Sheet: read "CUK Final Interview" workbook ───────────────────────
// Requires ZohoSheet.dataAPI.READ scope on the refresh token.
// Set env.ZOHO_SHEET_RESOURCE_ID to the workbook's resource_id from the URL
// (https://sheet.zoho.com/sheet/open/<RESOURCE_ID>).
const ZOHO_SHEET_API   = 'https://sheet.zoho.com/api/v2';
const FINAL_INTERVIEW_TABS = [
  { name: 'CUK Final Interview Candidates', defaultBrand: null   }, // brand inferred from row
  { name: 'CUK Maritime',                   defaultBrand: 'CUK Maritime' },
];


async function fetchSheetTabAsCSV(token, resourceId, worksheetName) {
  const body = new URLSearchParams({
    method:         'worksheet.records.fetch',
    worksheet_name: worksheetName,
  });
  const url = `${ZOHO_SHEET_API}/${resourceId}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!r.ok) throw new Error(`Sheet API ${r.status}: ${await r.text()}`);
  const data = await r.json();

  // Format 1a: { records: [{col:val,...}] }  ← actual Zoho Sheet v2 response
  if (data.records && Array.isArray(data.records) && data.records.length &&
      typeof data.records[0] === 'object' && !Array.isArray(data.records[0])) {
    return data.records.map(row => {
      const o = {};
      Object.entries(row).forEach(([k, v]) => { if (k !== 'row_index') o[k] = v ?? ''; });
      return o;
    });
  }
  // Format 1b: { records: [[...]], header_row: [...] }
  if (data.records && data.header_row) {
    const headers = data.header_row;
    return data.records.map(row => {
      const o = {}; headers.forEach((h, i) => { o[h] = row[i] ?? ''; }); return o;
    });
  }
  // Format 2: { data: { records: [[...]], header_row: [...] } }
  if (data.data?.records && Array.isArray(data.data.records)) {
    const headers = data.data.header_row || [];
    return data.data.records.map(row => {
      const o = {}; headers.forEach((h, i) => { o[h] = row[i] ?? ''; }); return o;
    });
  }
  // Format 3: { data: { rows: [{col: val, ...}] } }  ← actual Zoho Sheet v2 format
  if (data.data?.rows && Array.isArray(data.data.rows)) {
    return data.data.rows.map(row => {
      // Strip internal Zoho metadata fields (ROWNO, CREATEDTIME, etc.)
      const o = {};
      Object.entries(row).forEach(([k, v]) => {
        if (!k.startsWith('_') && k !== 'ROWNO' && k !== 'CREATEDTIME' && k !== 'MODIFIEDTIME')
          o[k] = v ?? '';
      });
      return o;
    });
  }
  return [];
}

async function fetchFinalInterviewSheet(env) {
  if (!env.ZOHO_SHEET_RESOURCE_ID) {
    throw new Error('Set ZOHO_SHEET_RESOURCE_ID secret to the CUK Final Interview workbook id');
  }
  const token = await getToken(env);
  const all   = [];

  for (const tab of FINAL_INTERVIEW_TABS) {
    let rows = [];
    try { rows = await fetchSheetTabAsCSV(token, env.ZOHO_SHEET_RESOURCE_ID, tab.name); }
    catch (e) { console.error(`Sheet tab "${tab.name}" failed:`, e.message); continue; }

    rows.forEach(r => {
      const finStat   = String(r['Final Interview Status']     || '').trim();
      const offerStat = String(r['Offer Letter Status']        || '').trim();
      const moveStat  = String(r['Move to Processing Stage']   || '').trim();
      if (finStat.toLowerCase() !== 'approved')   return;
      if (offerStat.toLowerCase() !== 'completed') return;
      if (moveStat) return;  // blank only

      const brand = tab.defaultBrand
        || r['Cruise Line'] || r['Brand'] || r['Cruise_Line'] || '—';

      all.push({
        _source:        'sheet-final-interview',
        cruiseLine:     brand,
        fullName:       r['Full Name'] || r['Name'] || [r['First Name'], r['Last Name']].filter(Boolean).join(' ') || '—',
        positionHired:  r['Position Hired'] || r['Position'] || '—',
        hiredDate:      r['Hired Date'] || r['Final Interview Date'] || null,
        seafarerIdNumber: r['Seafarer ID Number'] || null,
        gender:         r['Gender'] || '—',
        email:          r['Email']  || '—',
        phone:          r['Phone']  || '—',
        country:        r['Country'] || '—',
        finalInterviewStatus: finStat,
        offerLetterStatus:    offerStat,
      });
    });
  }
  return all;
}

// ── Microsoft Graph — send email via cti-it-team@cti-usa.com ─────────────
// Requires application permission Mail.Send granted to the Azure app for this mailbox.
// Secrets: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID
const MS_GRAPH_API  = 'https://graph.microsoft.com/v1.0';
const MS_AUTH_URL   = 'https://login.microsoftonline.com';
const SA_SEND_FROM  = 'cti-it-team@cti-usa.com';

function escHTML(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getMSToken(env) {
  try {
    const cached = await env.TOKEN_CACHE.get('ms_graph_token', { type: 'json' });
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  } catch (_) {}

  const body = new URLSearchParams({
    client_id:     env.MS_CLIENT_ID,
    client_secret: env.MS_CLIENT_SECRET,
    scope:         'https://graph.microsoft.com/.default',
    grant_type:    'client_credentials',
  });
  const res  = await fetch(`${MS_AUTH_URL}/${env.MS_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body });
  const data = await res.json();
  if (data.error) throw new Error(`MS Graph auth: ${data.error_description || data.error}`);

  const entry = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  await env.TOKEN_CACHE.put('ms_graph_token', JSON.stringify(entry), { expirationTtl: 3540 });
  return entry.token;
}

// ── KV data cache helpers ─────────────────────────────────────────────────
async function getCached(env, key) {
  try { return await env.TOKEN_CACHE.get(key, { type: 'json' }); } catch (_) { return null; }
}
async function setCached(env, key, data) {
  try { await env.TOKEN_CACHE.put(key, JSON.stringify(data), { expirationTtl: DATA_TTL }); } catch (_) {}
}
async function clearCached(env, key) {
  try { if (key) await env.TOKEN_CACHE.delete(key); } catch (_) {}
}

// ── Field maps (same API names as server.js) ──────────────────────────────
const RF = {
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
  housingLandlord:    'Housing_Name',
  housingPaymentInit: 'Initial_Housing_Payment_Before_Departure',
  housingPaymentMo:   'Housing_Price',
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
  ticketPayMethod:    'Flight_Ticket_Payment_Method',
  airline:            'Airline',
  pnrNumber:          'PNR_Number',
  tripFrom:           'Trip_From',
  tripTo:             'Trip_To',
  departureDate:      'Departure_Date',
  arrivalDate:        'Arrival_Date',
  airportGateway:     'Airport_Gateway',
  airportPickup:      'Airport_Pick_Up',
  transportCost:      'Currency_1',
  returnFlightStatus: 'Returning_Flight_Ticket_Status',
  returnDeparture:    'Returning_Departure_Date',
  returnArrival:      'Returning_Arrival_Date',
  returnAirline:      'Returning_Airline',
  returnPNR:          'Returning_Airline_PNR_Number',
  returnTripFrom:     'Returning_Trip_From',
  returnTripTo:       'Returning_Trip_To',
  returnGateway:      'Returning_Airport_Gateway',
  returnTicketPrice:  'Returning_Ticket_Pricing',
  returnTicketPayStatus: 'Returning_Ticket_Payment_Status',
  returnTransportCost:'Return_Transportation_Cost',
  dateOfBirth:            'Date_Of_Birth',
  age:                    'Age',
  consultationCallDate:   'Consultation_Call_Date',
  consultationCallBy:     'Consultation_Call_Done_By',
  consultationCallNotes:  'Consultation_Call_Notes',
  consultationCallStatus: 'Consultation_Call_Status',
  englishAssessment:      'English_Assessment',
  participantRating:      'Participant_Rating',
  attendance:             'Attendance',
  financialReadinessDate: 'Financial_Readiness_Date',
  visaAppt2:              'J1_Visa_2nd_Appointment_Date',
  visaAppt3:              'J1_Visa_3rd_Appointment_Date',
  ctiUsaReview:           'CTI_USA_s_Review',
  passportStatus:          'Passport_Status',
  policeClearanceStatus:   'Police_Clearance_Status',
  uniAccreditationStatus:  'University_Accreditation',
  proofAcademicStatus:     'Academic_Status',
  educationalCertStatus:   'Educational_Certificate_Status',
  academicTranscriptStatus:'Academic_Transcripts',
  englishAssessmentLetterStatus: 'English_Assessment_Letter',
  signedJ1Policy:          'Signed_J1_Program_Policy',
  stage1Investment:        'Stage_1_Investment',
  stage2Investment:        'Stage_2_Investment',
  stage3Investment:        'Stage_3_Investment',
  stage4Investment:        'Stage_4_Investment',
  hcInterviewDate:         'Hosting_Company_Interview_Date',
};

const CF = {
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
  housingLandlord:        'Housing_Landlord',
  housingPaymentInit:     'Initial_Housing_Payment_Before_Departure',
  housingPaymentMo:       'Monthly_Housing_Payment',
  housingAddress:         'Housing_Address',
};

const JF = {
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
  j1ProgramType:     'xx',
  clientName:        'Client_Name',
  marlins:           'Marlins_Passing_Score',   // 'Marlins (%)'
  flightTicket:      'Flight_Ticket',
};

// ── Cruise Line Seafarer field map ───────────────────────────────────────
// Lives in the Recruit 'Candidates' module (plural label customized to
// 'Seafarers' in this account). Field API names confirmed via
// /api/cruise/debug/fields probe.
const SF = {
  candidateId:        'Candidate_ID',          // 'Seafarer ID' (autonumber, e.g. CTI-26512)
  fullName:           'Full_Name',
  firstName:          'First_Name',
  lastName:           'Last_Name',
  cruiseLine:         'Cruise_Line',
  positionHired:      'Position_Applied',     // label: 'Position Hired'
  hiredDate:          'Hired_Date',
  seafarerIdNumber:   'Crew_ID_Number',       // label: 'Seafarer ID Number'
  employmentStatus:   'Employment_Status',
  signOnDate:         'Sign_On_Date',
  onboardingStatus:   'Onboarding_Status',
  gender:             'Gender',
  email:              'Email',
  phone:              'Mobile',               // 'Phone' doesn't exist; field is named 'Mobile'
  country:            'Country',
  // ── extra fields for the CUK Mistral Request report ──
  placeOfBirth:       'Place_of_Birth',
  dateOfBirth:        'Date_of_Birth',
  maritalStatus:      'Marital_Status',
  passportNumber:     'Passport_Number',
  passportIssuedDate: 'Passport_Issued_Date',
  passportExpiredDate:'Passport_Expired_Date',
  passportIssuedNation:'Passport_Issued_Country',
  hairColor:          'Hair_Color',
  eyeColor:           'Eye_Color',
  height:             'Height',
  weight:             'Weight',
  city:               'City',
  state:              'State',
  street:             'Street',
  postalCode:         'Zip_Code',
  gatewayAirport:     'Gateway_Airport',
  // ── Next of Kin / Emergency Contact ──
  relationshipToCrew:    'Relationship_to_Crew',
  emergencyName:         'Emergency_Contact_Name',
  emergencyPhone:        'Emergency_Contact',
  emergencyCity:         'Emergency_Contact_City',
  emergencyStreet:       'Emergency_Contact_Street_Address',
  signOffDate:        'Sign_Off_Date',            // confirmed
  signOnPort:         'Sign_On_Port',             // confirmed
  joiningShip:        'Joining_Ship',            // TODO: confirm field name via /api/cruise/debug/fields
  ctiOffice:          'CTI_Office',              // confirmed picklist
  // ── Document status fields (verify via /api/cruise/debug/fields?module=Candidates) ──
  passportStatus:      'Passport_Status',          // confirmed (shared with RF map)
  passportIssuedPlace: 'Passport_Issued_Place',    // TODO: verify
  bstStatus:           'BST_Status',               // confirmed
  bstNumber:           'BST_Certificate_Number',   // confirmed
  bstExpiry:           'BST_Expiration_Date',      // confirmed
  satStatus:           'SAT_Status',               // confirmed
  satNumber:           'SAT_Certificate_Number',   // confirmed
  satExpiry:           'SAT_Expiration_Date',      // confirmed
  crowdMgtStatus:      'Crowd_Mgt_Status',              // confirmed
  crowdMgtNumber:      'Crowd_Mgt_Number',              // confirmed
  crowdMgtExpiry:      'Crowd_Mgt_Expiration_Date',     // confirmed
  crisisMgtStatus:     'Crisis_Mgt_Status',             // confirmed
  crisisMgtNumber:     'Crisis_Mgt_Number',             // confirmed
  crisisMgtExpiry:     'Crisis_Mgt_Expiration_Date',    // confirmed
  pscrbStatus:         'PSCRB_Status',             // confirmed
  pscrbNumber:         'PSCRB_Number',             // confirmed
  pscrbExpiry:         'PSCRB_Expiration_Date',    // confirmed
  seamanBookStatus:    'Seaman_Book_Status',        // confirmed
  seamanBookNumber:    'Seaman_Book_Number',        // confirmed
  seamanBookExpiry:    'Seaman_Book_Expiration_Date', // confirmed
  sdbStatus:           'Bermuda_Seaman_Status',    // confirmed
  sdbExpiry:           'SDB_Expiration_Date',      // confirmed
  bidStatus:           'BID_Status',               // confirmed
  bidExpiry:           'BID_Expiration_Date',      // confirmed
  c1dStatus:           'C1_D_Visa_Status',         // confirmed
  c1dNumber:           'C1_D_Visa_Number',         // confirmed
  c1dAppointment:      'C1_D_Visa_Appointment_Date', // confirmed
  c1dExpiry:           'C1_D_Visa_Expiration_Date', // confirmed
  mcvStatus:           'MCV_Status',               // confirmed
  mcvNumber:           'MCV_Number',               // confirmed
  mcvPassportNumber:   'MCV_s_Passport_Number',    // confirmed
  mcvExpiry:           'MCV_Expiration_Date',      // confirmed
  oktbStatus:          'OKTB',                     // confirmed (field API name is just OKTB)
  nzetaStatus:         'NZeTA_Visa_Status',          // confirmed
  nzetaNumber:         'NZeTA_Visa_Number',         // confirmed
  nzetaExpiry:         'NZeTA_Expiration_Date',     // confirmed
  atvStatus:           'Australian_Transit_Visa_Status', // confirmed
  atvAppointment:      'ATV_Appointment_Date',      // confirmed
  atvNumber:           'Australian_Transit_Visa_Number', // confirmed
  atvExpiry:           'ATV_Expiration_Date',      // confirmed
  otherVisaName:       'Other_Visa_Name',          // TODO: verify
  otherVisaStatus:     'Other_Visa_Status',        // TODO: verify
  medicalStatus:       'Medical_Status',           // TODO: verify
  medicalExamDate:     'Medical_Examination_Date', // TODO: verify
  medicalIssuanceDate: 'Medical_Issuance_Date',    // TODO: verify
  medicalExpiry:       'Medical_Expiry_Date',      // TODO: verify
  completedVaccination:'Vaccines_Status',           // confirmed (multi-select checklist)
  dateMmr1:            'Date_MMR_1_Completed',     // TODO: verify
};

// ── Record mappers ────────────────────────────────────────────────────────
function mapRecruit(r) {
  const arr = v => Array.isArray(v) ? v.join(', ') : (v || '—');
  return {
    _source:             'recruit',
    id:                  r.id,
    createdTime:         r.Created_Time  || null,
    modifiedTime:        r.Modified_Time || null,
    name:                r[RF.name] || [r[RF.firstName], r[RF.lastName]].filter(Boolean).join(' ') || '—',
    firstName:           r[RF.firstName]          || '—',
    lastName:            r[RF.lastName]           || '—',
    passportNumber:      r[RF.passportNumber]     || '—',
    country:             r[RF.country]            || '—',
    gender:              r[RF.gender]             || '—',
    email:               r[RF.email]              || '—',
    phone:               r[RF.phone]              || '—',
    programType:         r[RF.programType]        || '—',
    programSource:       r[RF.programSources]     || '—',
    placementStatus:     r[RF.appStatus]          || '—',
    processingSponsor:   r[RF.processingSponsor]  || '—',
    department:          r[RF.department]         || '—',
    selectedJob:         r[RF.selectedJob]        || '—',
    hostCompany:         r[RF.hostCompany]?.name  || r[RF.hostCompany] || '—',
    hostCompanyId:       r[RF.hostCompany]?.id    || null,
    programStart:        r[RF.programStart]       || null,
    programEnd:          r[RF.programEnd]         || null,
    eligiblePrograms:    arr(r[RF.eligiblePrograms]),
    sponsorStatus:       r[RF.sponsorStatus]      || '—',
    hcInterviewStatus:   r[RF.hcInterviewStatus]  || '—',
    housingAvailability: r[RF.housingAvailability]|| '—',
    housingLandlord:     r[RF.housingLandlord]    || '—',
    housingPaymentInit:  r[RF.housingPaymentInit] || null,
    housingPaymentMo:    r[RF.housingPaymentMo]   || null,
    housingAddress:      r[RF.housingAddress]     || '—',
    ds2019End:           r[RF.visaExpiredDate]    || null,
    visaExpiredDate:     r[RF.visaExpiredDate]    || null,
    visaStatus:          r[RF.visaStatus]         || '—',
    visaNumber:          r[RF.visaNumber]         || '—',
    visaAppointment:     r[RF.visaAppointment]    || null,
    visaPaymentDate:     r[RF.visaPaymentDate]    || null,
    refLetterStatus:     r[RF.refLetterStatus]    || '—',
    dateOfBirth:              r[RF.dateOfBirth]              || null,
    age:                      r[RF.age]                      || '—',
    consultationCallDate:     r[RF.consultationCallDate]     || null,
    consultationCallBy:       r[RF.consultationCallBy]       || '—',
    consultationCallNotes:    r[RF.consultationCallNotes]    || '—',
    consultationCallStatus:   r[RF.consultationCallStatus]   || '—',
    englishAssessment:        arr(r[RF.englishAssessment]),
    participantRating:        r[RF.participantRating]        || '—',
    attendance:               r[RF.attendance]               || '—',
    financialReadinessDate:   r[RF.financialReadinessDate]   || null,
    visaAppt2:                r[RF.visaAppt2]                || null,
    visaAppt3:                r[RF.visaAppt3]                || null,
    ctiUsaReview:             r[RF.ctiUsaReview]             || '—',
    flightBooked:       r[RF.flightBooked]       || '—',
    ticketPayStatus:    r[RF.ticketPayStatus]     || '—',
    ticketPricing:      r[RF.ticketPricing]       || null,
    ticketPayMethod:    r[RF.ticketPayMethod]     || '—',
    airline:            r[RF.airline]             || '—',
    pnrNumber:          r[RF.pnrNumber]           || '—',
    tripFrom:           r[RF.tripFrom]            || '—',
    tripTo:             r[RF.tripTo]              || '—',
    departureDate:      r[RF.departureDate]       || null,
    arrivalDate:        r[RF.arrivalDate]         || null,
    airportGateway:     r[RF.airportGateway]      || '—',
    airportPickup:      r[RF.airportPickup]       || '—',
    transportCost:      r[RF.transportCost]       || null,
    returnFlightStatus: r[RF.returnFlightStatus]  || '—',
    returnDeparture:    r[RF.returnDeparture]     || null,
    returnArrival:      r[RF.returnArrival]       || null,
    returnAirline:      r[RF.returnAirline]       || '—',
    returnPNR:          r[RF.returnPNR]           || '—',
    returnTripFrom:     r[RF.returnTripFrom]      || '—',
    returnTripTo:       r[RF.returnTripTo]        || '—',
    returnGateway:      r[RF.returnGateway]       || '—',
    returnTicketPrice:  r[RF.returnTicketPrice]   || null,
    returnTicketPayStatus: r[RF.returnTicketPayStatus] || '—',
    returnTransportCost:   r[RF.returnTransportCost]   || null,
    passportStatus:          r[RF.passportStatus]          || '—',
    policeClearanceStatus:   r[RF.policeClearanceStatus]   || '—',
    uniAccreditationStatus:  r[RF.uniAccreditationStatus]  || '—',
    proofAcademicStatus:     r[RF.proofAcademicStatus]     || '—',
    educationalCertStatus:   r[RF.educationalCertStatus]   || '—',
    academicTranscriptStatus:r[RF.academicTranscriptStatus]|| '—',
    englishAssessmentLetterStatus: r[RF.englishAssessmentLetterStatus] || '—',
    signedJ1Policy:          r[RF.signedJ1Policy]          || '—',
    stage1Investment:        r[RF.stage1Investment]        || null,
    stage2Investment:        r[RF.stage2Investment]        || null,
    stage3Investment:        r[RF.stage3Investment]        || null,
    stage4Investment:        r[RF.stage4Investment]        || null,
    hcInterviewDate:         r[RF.hcInterviewDate]         || null,
  };
}

function mapCRM(r) {
  const arr   = v => Array.isArray(v) ? v.join(', ') : (v || '—');
  const fullN  = (r[CF.fullName]  || '').trim();
  const firstN = (r[CF.firstName] || '').trim();
  const lastN  = (r[CF.lastName]  || '').trim()
    || (fullN && firstN && fullN.startsWith(firstN)
        ? fullN.slice(firstN.length).trim()
        : fullN.split(' ').slice(1).join(' ').trim());
  return {
    _source:                'crm',
    id:                     'crm_' + r.id,
    createdTime:            r.Created_Time  || null,
    modifiedTime:           r.Modified_Time || null,
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
    programStart: null, programEnd: null,
  };
}

function mapJob(r) {
  return {
    id:                r.id,
    jobId:             r[JF.jobId]             || '—',
    status:            r[JF.status]            || '—',
    placementCategory: r[JF.placementCategory] || '—',
    hostingCompany:    r[JF.hostingCompany]?.name || r[JF.hostingCompany] || '—',
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
    clientName:        r[JF.clientName]?.name || r[JF.clientName] || '—',
    marlins:           r[JF.marlins]           || '—',
    flightTicket:      Array.isArray(r[JF.flightTicket])
                         ? r[JF.flightTicket].join(', ')
                         : r[JF.flightTicket] || '—',
  };
}

// Cruise Seafarer mapper (Zoho Recruit "Seafarers" module)
function mapSeafarer(r) {
  const cl = r[SF.cruiseLine];
  return {
    _source:          'recruit',
    id:               r.id,
    candidateId:      r[SF.candidateId]    || null,
    createdTime:      r.Created_Time       || null,
    modifiedTime:     r.Modified_Time      || null,
    fullName:         r[SF.fullName] || [r[SF.firstName], r[SF.lastName]].filter(Boolean).join(' ') || '—',
    firstName:        r[SF.firstName] || '—',
    lastName:         r[SF.lastName]  || '—',
    cruiseLine:       Array.isArray(cl) ? cl.join(', ') : (cl?.name || cl || '—'),
    positionHired:    Array.isArray(r[SF.positionHired])
                        ? r[SF.positionHired].join(', ')
                        : (r[SF.positionHired]?.name || r[SF.positionHired] || '—'),
    hiredDate:        r[SF.hiredDate]         || null,
    seafarerIdNumber: r[SF.seafarerIdNumber]  || null,
    employmentStatus: r[SF.employmentStatus]  || null,
    signOnDate:       r[SF.signOnDate]        || null,
    onboardingStatus: r[SF.onboardingStatus]  || null,
    gender:           r[SF.gender]            || '—',
    email:            r[SF.email]             || '—',
    phone:            r[SF.phone]             || '—',
    country:          r[SF.country]           || '—',
    // extra fields for the Mistral Request report
    placeOfBirth:        r[SF.placeOfBirth]        || '',
    dateOfBirth:         r[SF.dateOfBirth]         || '',
    maritalStatus:       r[SF.maritalStatus]       || '',
    passportNumber:      r[SF.passportNumber]      || '',
    passportIssuedDate:  r[SF.passportIssuedDate]  || '',
    passportExpiredDate: r[SF.passportExpiredDate] || '',
    passportIssuedNation:r[SF.passportIssuedNation]|| '',
    hairColor:           r[SF.hairColor]           || '',
    eyeColor:            r[SF.eyeColor]            || '',
    height:              r[SF.height]              || '',
    weight:              r[SF.weight]              || '',
    city:                r[SF.city]                || '',
    state:               r[SF.state]               || '',
    street:              r[SF.street]              || '',
    postalCode:          r[SF.postalCode]          || '',
    gatewayAirport:      r[SF.gatewayAirport]      || '',
    relationshipToCrew:  r[SF.relationshipToCrew]  || '',
    emergencyName:       r[SF.emergencyName]       || '',
    emergencyPhone:      r[SF.emergencyPhone]      || '',
    emergencyCity:       r[SF.emergencyCity]       || '',
    emergencyStreet:     r[SF.emergencyStreet]     || '',
    signOffDate:         r[SF.signOffDate]         || null,
    signOnPort:          r[SF.signOnPort]          || '',
    joiningShip:         r[SF.joiningShip]         || '',
    ctiOffice:           r[SF.ctiOffice]           || '',
    // ── Document status fields (values depend on Zoho field names above being correct) ──
    passportStatus:      r[SF.passportStatus]      || '',
    passportIssuedPlace: r[SF.passportIssuedPlace] || '',
    bstStatus:           r[SF.bstStatus]           || '',
    bstNumber:           r[SF.bstNumber]           || '',
    bstExpiry:           r[SF.bstExpiry]           || '',
    satStatus:           r[SF.satStatus]           || '',
    satNumber:           r[SF.satNumber]           || '',
    satExpiry:           r[SF.satExpiry]           || '',
    crowdMgtStatus:      r[SF.crowdMgtStatus]      || '',
    crowdMgtNumber:      r[SF.crowdMgtNumber]      || '',
    crowdMgtExpiry:      r[SF.crowdMgtExpiry]      || '',
    crisisMgtStatus:     r[SF.crisisMgtStatus]     || '',
    crisisMgtNumber:     r[SF.crisisMgtNumber]     || '',
    crisisMgtExpiry:     r[SF.crisisMgtExpiry]     || '',
    pscrbStatus:         r[SF.pscrbStatus]         || '',
    pscrbNumber:         r[SF.pscrbNumber]         || '',
    pscrbExpiry:         r[SF.pscrbExpiry]         || '',
    seamanBookStatus:    r[SF.seamanBookStatus]    || '',
    seamanBookNumber:    r[SF.seamanBookNumber]    || '',
    seamanBookExpiry:    r[SF.seamanBookExpiry]    || '',
    sdbStatus:           r[SF.sdbStatus]           || '',
    sdbExpiry:           r[SF.sdbExpiry]           || '',
    bidStatus:           r[SF.bidStatus]           || '',
    bidExpiry:           r[SF.bidExpiry]           || '',
    c1dStatus:           r[SF.c1dStatus]           || '',
    c1dNumber:           r[SF.c1dNumber]           || '',
    c1dAppointment:      r[SF.c1dAppointment]      || '',
    c1dExpiry:           r[SF.c1dExpiry]           || '',
    mcvStatus:           r[SF.mcvStatus]           || '',
    mcvNumber:           r[SF.mcvNumber]           || '',
    mcvPassportNumber:   r[SF.mcvPassportNumber]   || '',
    mcvExpiry:           r[SF.mcvExpiry]           || '',
    oktbStatus:          r[SF.oktbStatus]          || '',
    nzetaStatus:         r[SF.nzetaStatus]         || '',
    nzetaNumber:         r[SF.nzetaNumber]         || '',
    nzetaExpiry:         r[SF.nzetaExpiry]         || '',
    atvStatus:           r[SF.atvStatus]           || '',
    atvAppointment:      r[SF.atvAppointment]      || '',
    atvNumber:           r[SF.atvNumber]           || '',
    atvExpiry:           r[SF.atvExpiry]           || '',
    otherVisaName:       r[SF.otherVisaName]       || '',
    otherVisaStatus:     r[SF.otherVisaStatus]     || '',
    medicalStatus:       r[SF.medicalStatus]       || '',
    medicalExamDate:     r[SF.medicalExamDate]     || '',
    medicalIssuanceDate: r[SF.medicalIssuanceDate] || '',
    medicalExpiry:       r[SF.medicalExpiry]       || '',
    completedVaccination: Array.isArray(r[SF.completedVaccination])
      ? r[SF.completedVaccination].join('; ')
      : (r[SF.completedVaccination] || ''),
    dateMmr1:            r[SF.dateMmr1]            || '',
  };
}

// Requisition column map (same as server.js REQ_COL_MAP)
const REQ_COLS = [
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
  ['Payment Frequency',    j => j.paymentFrequency],
];

// ── Main fetch handler ────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const ch     = corsHeaders(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: ch });
    }

    const url      = new URL(request.url);
    const path     = url.pathname;
    const method   = request.method;

    try {

      // ── GET /api/status ───────────────────────────────────────────────
      if (method === 'GET' && path === '/api/status') {
        return json({ connected: true, source: 'cloudflare-worker' }, 200, ch);
      }

      // ── GET /api/cache/clear ──────────────────────────────────────────
      if (method === 'GET' && path === '/api/cache/clear') {
        await Promise.allSettled([
          clearCached(env, 'recruit-j1-participants'),
          clearCached(env, 'crm-j1-participants'),
          clearCached(env, 'recruit-job-openings'),
          clearCached(env, 'j1-requisition'),
          clearCached(env, 'cruise-seafarers'),
          clearCached(env, 'cruise-final-interview'),
          clearCached(env, 'cruise-deployment'),
        ]);
        return json({ success: true, message: 'Cache cleared' }, 200, ch);
      }

      // ── GET /api/recruit/j1-participants ──────────────────────────────
      if (method === 'GET' && path === '/api/recruit/j1-participants') {
        const cached = await getCached(env, 'recruit-j1-participants');
        if (cached) return json(cached, 200, ch);

        const token   = await getToken(env);
        const fields  = Object.values(RF).join(',');
        const records = await fetchAll(token, ZOHO_RECRUIT, 'J1_Participants', fields);
        const data    = records.map(mapRecruit);
        const payload = { source: 'recruit', count: data.length, data };
        await setCached(env, 'recruit-j1-participants', payload);
        return json(payload, 200, ch);
      }

      // ── GET /api/crm/j1-participants ──────────────────────────────────
      if (method === 'GET' && path === '/api/crm/j1-participants') {
        const cached = await getCached(env, 'crm-j1-participants');
        if (cached) return json(cached, 200, ch);

        const token   = await getToken(env);
        const fields  = Object.values(CF).join(',');
        const records = await fetchAll(token, ZOHO_CRM, 'J1_Participants1', fields);
        const data    = records.map(mapCRM);
        const payload = { source: 'crm', count: data.length, data };
        await setCached(env, 'crm-j1-participants', payload);
        return json(payload, 200, ch);
      }


      // ── GET /api/cruise/seafarers ──────────────────────────────────────
      // Cruise hires live in the Recruit 'Candidates' module (the plural label
      // is customized to 'Seafarers' in this account). Front-end filters by
      // the per-record Cruise_Line value.
      // ?debug=1   bypasses cache and returns the raw Zoho response.
      // ?module=X  overrides the module name (used during diagnostics).
      if (method === 'GET' && path === '/api/cruise/seafarers') {
        const cached = await getCached(env, 'cruise-seafarers');
        if (cached && !url.searchParams.get('debug')) return json(cached, 200, ch);

        const token   = await getToken(env);
        const moduleName = url.searchParams.get('module') || 'Candidates';

        if (url.searchParams.get('debug')) {
          // Probe the module directly so we can see what Zoho says.
          // No fields parameter — Zoho's behaviour with a long `fields` list
          // on the Candidates module was silently dropping Position_Applied,
          // Crew_ID_Number and Mobile. Returning all fields fixes it.
          const probe = await zGet(`${ZOHO_RECRUIT}/${moduleName}`, token, { page: 1, per_page: 5 });
          return json({ probe, moduleName }, 200, ch);
        }

        // Pull every field on the layout — mapSeafarer picks just the ones
        // we need. Bypassing the `fields` parameter avoids the silent drop.
        const records = await fetchAll(token, ZOHO_RECRUIT, moduleName, null);
        const data    = records.map(mapSeafarer);
        const payload = { source: 'recruit-seafarers', count: data.length, data };
        await setCached(env, 'cruise-seafarers', payload);
        return json(payload, 200, ch);
      }

      // ── GET /api/cruise/final-interview ────────────────────────────────
      // Reads Zoho Sheet "CUK Final Interview" — two tabs:
      //   'CUK Final Interview Candidates' (Cunard + P&O)
      //   'CUK Maritime'
      // Filters rows: Final Interview Status=Approved, Offer Letter Status=Completed,
      // Move to Processing Stage=blank.
      if (method === 'GET' && path === '/api/cruise/final-interview') {
        const cached = await getCached(env, 'cruise-final-interview');
        if (cached) return json(cached, 200, ch);

        try {
          const data = await fetchFinalInterviewSheet(env);
          const payload = { source: 'zoho-sheet', count: data.length, data };
          await setCached(env, 'cruise-final-interview', payload);
          return json(payload, 200, ch);
        } catch (err) {
          return json({ error: 'sheet_fetch_failed', message: err.message, data: [] }, 200, ch);
        }
      }

      // ── GET /api/cruise/deployment ────────────────────────────────────
      // Reads Zoho Sheet "Cruise Line Deployment Report" — tab: Deployment
      // Resource ID: begbjf0b04d7026534b328e36baa0a9d82df7
      // Requires ZohoSheet.dataAPI.READ scope + ZOHO_DEPLOYMENT_SHEET_ID secret
      if (method === 'GET' && path === '/api/cruise/deployment') {
        const debug = url.searchParams.get('debug');
        if (!debug) {
          const cached = await getCached(env, 'cruise-deployment');
          if (cached) return json(cached, 200, ch);
        }
        try {
          const resourceId = env.ZOHO_DEPLOYMENT_SHEET_ID || 'begbjf0b04d7026534b328e36baa0a9d82df7';
          const token = await getToken(env);
          const sheetBody = new URLSearchParams({ method:'worksheet.records.fetch', worksheet_name:'Deployment' });
          const sheetRes  = await fetch(`${ZOHO_SHEET_API}/${resourceId}`, {
            method:'POST',
            headers:{ Authorization:`Zoho-oauthtoken ${token}`, 'Content-Type':'application/x-www-form-urlencoded' },
            body: sheetBody,
            cf: { cacheEverything: false },   // bypass Cloudflare edge cache
          });
          const sheetText = await sheetRes.text();

          const sheetData = JSON.parse(sheetText);
          // Zoho Sheet v2: { method, records: [{col:val,...}, ...] }
          let rows = [];
          if (sheetData.records && Array.isArray(sheetData.records)) {
            rows = sheetData.records.map(r => {
              const o = {};
              Object.entries(r).forEach(([k, v]) => { if (k !== 'row_index') o[k] = v ?? ''; });
              return o;
            });
          }
          const payload = { source: 'zoho-sheet', count: rows.length, data: rows };
          if (!debug) await setCached(env, 'cruise-deployment', payload);
          return json(payload, 200, ch);
        } catch (err) {
          return json({ error: 'deployment_sheet_failed', message: err.message, data: [] }, 200, ch);
        }
      }

      // ── GET /api/recruit/job-openings ─────────────────────────────────
      // ?refresh=1 skips the cache (targeted re-pull) but still re-caches, so it
      // is much faster than clearing every cache.
      if (method === 'GET' && path === '/api/recruit/job-openings') {
        const refresh = url.searchParams.get('refresh');
        if (!refresh) {
          const cached = await getCached(env, 'recruit-job-openings');
          if (cached) return json(cached, 200, ch);
        }
        const token   = await getToken(env);
        const fields  = Object.values(JF).join(',');
        const records = await fetchAll(token, ZOHO_RECRUIT, 'Job_Openings', fields);
        const data    = records.map(mapJob);
        const payload = { source: 'recruit', count: data.length, data };
        await setCached(env, 'recruit-job-openings', payload);
        return json(payload, 200, ch);
      }

      // ── GET /api/zoho/j1-requisition ──────────────────────────────────
      if (method === 'GET' && path === '/api/zoho/j1-requisition') {
        const cached = await getCached(env, 'j1-requisition');
        if (cached) return json(cached, 200, ch);

        const token   = await getToken(env);
        const fields  = Object.values(JF).join(',');
        const records = await fetchAll(token, ZOHO_RECRUIT, 'Job_Openings', fields);
        const allJobs = records.map(mapJob);
        const j1Jobs  = allJobs.filter(j =>
          /^j1 program$/i.test((j.placementCategory || '').trim()) &&
          /^active$/i.test((j.status || '').trim())
        );
        const columns = REQ_COLS.map(([label]) => label);
        const rows    = j1Jobs.map(j => REQ_COLS.map(([, get]) => String(get(j) ?? '')));
        const payload = { source: 'zoho-recruit', view: 'Job Openings', data: { columns, rows } };
        await setCached(env, 'j1-requisition', payload);
        return json(payload, 200, ch);
      }

      // ── GET /api/recruit/candidates/:id/attachments ───────────────────
      //    List attachment metadata for a Candidates record.
      //    Scope: ZohoRecruit.modules.ALL (READ covers attachments)
      const candidateAttachList = path.match(/^\/api\/recruit\/candidates\/([^/]+)\/attachments$/);
      if (method === 'GET' && candidateAttachList) {
        const [, candidateId] = candidateAttachList;
        const token = await getToken(env);
        const data  = await zGet(`${ZOHO_RECRUIT}/Candidates/${candidateId}/Attachments`, token);
        if (data.code && data.code !== 0) {
          const msg = String(data.message || JSON.stringify(data));
          const status = msg.toLowerCase().includes('permission') || String(data.code) === 'REQUIRED_PERMISSION_DENIED' ? 403 : 400;
          return json({ error: msg, zohoCode: data.code }, status, ch);
        }
        return json({ data: data.data || [] }, 200, ch);
      }

      // ── GET /api/recruit/candidates/:id/attachments/:attachId ─────────
      //    Stream the attachment file back with its original Content-Type.
      //    Zoho returns the raw file bytes; we forward them transparently.
      const candidateAttachDl = path.match(/^\/api\/recruit\/candidates\/([^/]+)\/attachments\/([^/]+)$/);
      if (method === 'GET' && candidateAttachDl) {
        const [, candidateId, attachmentId] = candidateAttachDl;
        const token   = await getToken(env);
        const zohoUrl = `${ZOHO_RECRUIT}/Candidates/${candidateId}/Attachments/${attachmentId}`;
        const zohoRes = await fetch(zohoUrl, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
        if (!zohoRes.ok) {
          const errText = await zohoRes.text().catch(() => '');
          return json({ error: `Zoho attachment download failed (${zohoRes.status})`, detail: errText }, zohoRes.status, ch);
        }
        const contentType  = zohoRes.headers.get('Content-Type')  || 'application/octet-stream';
        const disposition  = zohoRes.headers.get('Content-Disposition') || 'inline';
        return new Response(zohoRes.body, {
          status: 200,
          headers: { ...ch, 'Content-Type': contentType, 'Content-Disposition': disposition },
        });
      }

      // ── PATCH /api/recruit/:module/:id ────────────────────────────────
      //    (Zoho Recruit uses PUT for updates)
      const recruitPatch = path.match(/^\/api\/recruit\/([^/]+)\/([^/]+)$/);
      if (method === 'PATCH' && recruitPatch) {
        const [, module, id] = recruitPatch;
        const token   = await getToken(env);
        const rawBody = await request.json();
        const body    = rawBody.data ? rawBody : { data: [{ ...rawBody }] };
        const data    = await zPut(`${ZOHO_RECRUIT}/${module}/${id}`, token, body);
        // Drop both caches so the next reader sees fresh data.
        await clearCached(env, 'recruit-j1-participants');
        if (module === 'Candidates') await clearCached(env, 'cruise-seafarers');
        return json(data, 200, ch);
      }

      // ── PATCH /api/crm/:module/:id ────────────────────────────────────
      const crmPatch = path.match(/^\/api\/crm\/([^/]+)\/([^/]+)$/);
      if (method === 'PATCH' && crmPatch) {
        const [, module, id] = crmPatch;
        const token   = await getToken(env);
        const rawBody = await request.json();
        const body    = rawBody.data ? rawBody : { data: [{ ...rawBody }] };
        const data    = await zPatch(`${ZOHO_CRM}/${module}/${id}`, token, body);
        await clearCached(env, 'crm-j1-participants');
        return json(data, 200, ch);
      }

      // ── POST /api/cruise/send-form ─────────────────────────────────────
      // Sends the Zoho document collection form link to a seafarer's email via
      // Microsoft Graph using cti-it-team@cti-usa.com (Mail.Send app permission).
      // Required env secrets: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID
      if (method === 'POST' && path === '/api/cruise/send-form') {
        const body = await request.json().catch(() => ({}));
        const { to, name, formLink } = body;
        if (!to || !name || !formLink) return json({ error: 'Missing to, name or formLink' }, 400, ch);

        const token = await getMSToken(env);
        const html  = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;">
  <tr><td>
    <!-- Header -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#B01A18 !important;border-radius:8px 8px 0 0;overflow:hidden;" bgcolor="#B01A18">
      <tr>
        <td style="padding:22px 28px;background:#B01A18 !important;" bgcolor="#B01A18">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <!-- CTI Logo -->
                <img src="https://codebychandra.github.io/athena/logo.png"
                     width="48" height="48" alt="CTI Group"
                     style="display:block;border:0;outline:none;">
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;line-height:1.1;">CTI Group</div>
                <div style="color:rgba(255,255,255,0.75);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px;">Worldwide Services, Inc.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Red accent strip -->
      <tr><td style="height:4px;background:#8B1210;" bgcolor="#8B1210"></td></tr>
    </table>
    <!-- Body -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">Dear <strong>${escHTML(name)}</strong>,</p>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.6;">We hope this message finds you well.</p>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.6;">As part of your onboarding process with <strong style="color:#B01A18;">CTI Group</strong>, we kindly request that you complete and submit the required document collection form at your earliest convenience.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#1A1A1A;line-height:1.6;">Please click the button below to access your personalized form:</p>
        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
          <tr>
            <td style="background:#B01A18 !important;border-radius:6px;text-align:center;" bgcolor="#B01A18">
              <a href="${escHTML(formLink)}"
                 style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                Submit Documents
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="${escHTML(formLink)}" style="color:#B01A18;word-break:break-all;">${escHTML(formLink)}</a>
        </p>
        <p style="margin:0 0 10px;font-size:14px;color:#1A1A1A;line-height:1.6;">If you have any questions or require assistance, please do not hesitate to contact your assigned coordinator.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#1A1A1A;">Thank you for your cooperation.</p>
        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #eeeeee;padding-top:20px;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              <strong style="color:#555;">CTI Group Worldwide Services, Inc.</strong><br>
              Cruise Line Division &nbsp;·&nbsp;
              <a href="https://www.cti-usa.com" style="color:#B01A18;text-decoration:none;">www.cti-usa.com</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:#aaa;margin:14px 0 0;padding:0 10px;">
      This is an automated message from CTI Group Worldwide Services, Inc. Please do not reply to this email.
    </p>
  </td></tr>
</table>
</body></html>`;

        const mail = {
          message: {
            subject: `Document Collection Request – ${name}`,
            body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: true,
        };
        const sendRes = await fetch(`${MS_GRAPH_API}/users/${SA_SEND_FROM}/sendMail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mail),
        });
        if (sendRes.status === 202) return json({ ok: true }, 200, ch);
        const errText = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
        return json({ ok: false, error: errText }, 200, ch);
      }

      // ── POST /api/cruise/send-mistral-form ────────────────────────────
      // Sends the Mistral personal-information form link to a seafarer via
      // Microsoft Graph using cti-it-team@cti-usa.com.
      if (method === 'POST' && path === '/api/cruise/send-mistral-form') {
        const body = await request.json().catch(() => ({}));
        const { to, name } = body;
        if (!to || !name) return json({ error: 'Missing to or name' }, 400, ch);

        const MISTRAL_FORM = 'https://zfrmz.com/eLrVxDrPk5aG5Qm5wf0h';
        const token = await getMSToken(env);
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;">
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#B01A18 !important;border-radius:8px 8px 0 0;overflow:hidden;" bgcolor="#B01A18">
      <tr>
        <td style="padding:22px 28px;background:#B01A18 !important;" bgcolor="#B01A18">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://codebychandra.github.io/athena/logo.png" width="48" height="48" alt="CTI Group" style="display:block;border:0;"></td>
            <td style="padding-left:12px;">
              <div style="color:#fff;font-size:18px;font-weight:700;">CTI Group</div>
              <div style="color:rgba(255,255,255,0.75);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px;">Worldwide Services, Inc.</div>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:4px;background:#8B1210;" bgcolor="#8B1210"></td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">Dear <strong>${escHTML(name)}</strong>,</p>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.6;">As part of your onboarding process with <strong style="color:#B01A18;">CTI Group</strong>, we kindly ask you to verify and complete your personal information.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#1A1A1A;line-height:1.6;">To proceed, please complete the form using the link below:</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="background:#B01A18 !important;border-radius:6px;text-align:center;" bgcolor="#B01A18">
              <a href="${MISTRAL_FORM}" style="display:inline-block;padding:13px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">
                Complete Form
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">
          Or copy and paste this link into your browser:<br>
          <a href="${MISTRAL_FORM}" style="color:#B01A18;word-break:break-all;">${MISTRAL_FORM}</a>
        </p>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.6;">If you have already submitted this information, please disregard this message.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#1A1A1A;">Thank you for your cooperation.</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #eee;padding-top:20px;">
            <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
              Best regards,<br>
              <strong>CTI Group Worldwide Services, Inc.</strong><br>
              <a href="https://www.cti-usa.com" style="color:#B01A18;text-decoration:none;">www.cti-usa.com</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:14px 0 0;">
      This is an automated message from CTI Group Worldwide Services, Inc. Please do not reply to this email.
    </p>
  </td></tr>
</table>
</body></html>`;

        const mail = {
          message: {
            subject: `Additional Information Required – Crew ID Registration – ${escHTML(name)}`,
            body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: true,
        };
        const sendRes = await fetch(`${MS_GRAPH_API}/users/${SA_SEND_FROM}/sendMail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mail),
        });
        if (sendRes.status === 202 || sendRes.status === 200 || sendRes.status === 204)
          return json({ ok: true }, 200, ch);
        const errText = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
        return json({ ok: false, error: errText }, 200, ch);
      }

      // ── POST /api/cruise/send-rts-followup ────────────────────────────
      // Sends a Report-to-Ship follow-up email to an account manager via
      // Microsoft Graph (cti-it-team@cti-usa.com as sender).
      if (method === 'POST' && path === '/api/cruise/send-rts-followup') {
        const body = await request.json().catch(() => ({}));
        const { to, cruiseLines, monthYear, count } = body;
        if (!to || !cruiseLines?.length || !monthYear || !count)
          return json({ error: 'Missing required fields: to, cruiseLines, monthYear, count' }, 400, ch);

        const token = await getMSToken(env);

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;">
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#B01A18 !important;border-radius:8px 8px 0 0;overflow:hidden;" bgcolor="#B01A18">
      <tr>
        <td style="padding:22px 28px;background:#B01A18 !important;" bgcolor="#B01A18">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><img src="https://codebychandra.github.io/athena/logo.png" width="48" height="48" alt="CTI Group"
                     style="display:block;border:0;"></td>
            <td style="padding-left:12px;">
              <div style="color:#fff;font-size:18px;font-weight:700;">CTI Group</div>
              <div style="color:rgba(255,255,255,0.75);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px;">Worldwide Services, Inc.</div>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:4px;background:#8B1210;" bgcolor="#8B1210"></td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">Dear team,</p>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.7;">
          We would like to follow up regarding the <strong>Report to Ship (RTS)</strong> status for the seafarers
          assigned to your cruise line${cruiseLines.length > 1 ? 's' : ''} for <strong>${escHTML(monthYear)}</strong>.
        </p>
        <p style="margin:0 0 10px;font-size:14px;color:#1A1A1A;line-height:1.7;">
          Our records indicate the following seafarers have not yet been updated with their RTS status:
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#555;border:1px solid #e0e0e0;">Cruise Line</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#555;border:1px solid #e0e0e0;width:120px;">Pending Seafarers</th>
          </tr>
          ${cruiseLines.map(c => `<tr>
            <td style="padding:8px 12px;font-size:13px;color:#1A1A1A;border:1px solid #e0e0e0;">${escHTML(c.name)}</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#B01A18;text-align:center;border:1px solid #e0e0e0;">${escHTML(String(c.count))}</td>
          </tr>`).join('')}
          <tr style="background:#fff8f8;">
            <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1A1A1A;border:1px solid #e0e0e0;">Total</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#B01A18;text-align:center;border:1px solid #e0e0e0;">${escHTML(String(count))}</td>
          </tr>
        </table>
        <p style="margin:0 0 14px;font-size:14px;color:#1A1A1A;line-height:1.7;">
          Please review and update their status in the system as soon as possible.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#1A1A1A;line-height:1.7;">
          Thank you for your cooperation.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #eee;padding-top:20px;">
            <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
              Best regards,<br>
              <strong>CTI Group Worldwide Services, Inc.</strong>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:14px 0 0;">
      This is an automated message from CTI Group Worldwide Services, Inc.
    </p>
  </td></tr>
</table>
</body></html>`;

        const mail = {
          message: {
            subject: `Follow-up Required: Report to Ship Status Update — ${escHTML(monthYear)}`,
            body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: true,
        };
        const sendRes = await fetch(`${MS_GRAPH_API}/users/${SA_SEND_FROM}/sendMail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mail),
        });
        if (sendRes.status === 202) return json({ ok: true }, 200, ch);
        const errText = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
        return json({ ok: false, error: errText }, 200, ch);
      }

      // ── POST /api/cruise/send-feedback ────────────────────────────────
      // Heat Map parameter feedback to a CTI department. Allowlisted recipients.
      if (method === 'POST' && path === '/api/cruise/send-feedback') {
        const body = await request.json().catch(() => ({}));
        const { to, subject, message } = body;
        if (!to || !subject || !message)
          return json({ ok: false, error: 'Missing required fields: to, subject, message' }, 400, ch);
        const ALLOWED = ['compliance@cti-usa.com', 'harold@cti-usa.com', 'herry.wahyudi@cti-usa.com', 'cuk-onboarding@cti-usa.com'];
        if (!ALLOWED.includes(String(to).trim().toLowerCase()))
          return json({ ok: false, error: 'Recipient not permitted' }, 400, ch);

        // TEST REDIRECT: set to an address to divert all feedback there; '' = live.
        const FEEDBACK_TEST_REDIRECT = '';
        const actualTo = FEEDBACK_TEST_REDIRECT || to;
        const testBanner = FEEDBACK_TEST_REDIRECT
          ? `<div style="margin:0 0 14px;padding:8px 12px;background:#fff3cd;border:1px solid #ffe69c;border-radius:6px;font-size:12px;color:#8a6d3b;"><strong>TEST MODE</strong> — intended recipient: ${escHTML(to)}</div>`
          : '';

        const token = await getMSToken(env);
        const safeMsg = testBanner + escHTML(String(message)).replace(/\n/g, '<br>');
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;"><tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#B01A18;border-radius:8px 8px 0 0;" bgcolor="#B01A18"><tr>
    <td style="padding:20px 26px;" bgcolor="#B01A18">
      <div style="color:#fff;font-size:17px;font-weight:700;">CTI Group</div>
      <div style="color:rgba(255,255,255,0.8);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px;">CUK Heat Map — Parameter Feedback</div>
    </td></tr>
    <tr><td style="height:4px;background:#8B1210;" bgcolor="#8B1210"></td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
    <tr><td style="padding:28px;font-size:14px;color:#1A1A1A;line-height:1.7;">${safeMsg}</td></tr>
  </table>
  <p style="text-align:center;font-size:11px;color:#aaa;margin:14px 0 0;">Sent from the CTI Group Cruise Line Portal.</p>
</td></tr></table>
</body></html>`;

        const mail = {
          message: {
            subject: (FEEDBACK_TEST_REDIRECT ? '[TEST] ' : '') + String(subject),
            body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: actualTo } }],
          },
          saveToSentItems: true,
        };
        const sendRes = await fetch(`${MS_GRAPH_API}/users/${SA_SEND_FROM}/sendMail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mail),
        });
        if (sendRes.status === 202 || sendRes.status === 200) return json({ ok: true, sentTo: actualTo }, 200, ch);
        const errText = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
        return json({ ok: false, error: errText }, 200, ch);
      }

      // ── GET /api/knowledge ────────────────────────────────────────────
      // Returns all knowledge entries from KV.
      if (method === 'GET' && path === '/api/knowledge') {
        const data = await getCached(env, 'ai-knowledge-base');
        return json(data || { entries: [] }, 200, ch);
      }

      // ── POST /api/knowledge ───────────────────────────────────────────
      // action: 'save' → upsert entry; action: 'delete' → remove by id
      if (method === 'POST' && path === '/api/knowledge') {
        try {
          const body    = await request.json();
          const current = (await getCached(env, 'ai-knowledge-base')) || { entries: [] };
          const entries = [...(current.entries || [])];

          if (body.action === 'delete') {
            const idx = entries.findIndex(e => e.id === body.id);
            if (idx !== -1) entries.splice(idx, 1);
          } else if (body.action === 'save') {
            const entry = body.entry;
            // Support new structure (title/type/portal) and legacy (topic/category)
            const hasTitle   = entry?.title || entry?.topic;
            const hasContent = entry?.content;
            if (!hasTitle || !hasContent) return json({ ok: false, error: 'title and content required' }, 400, ch);
            entry.updatedAt = new Date().toISOString();
            if (!entry.id) entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const idx = entries.findIndex(e => e.id === entry.id);
            if (idx !== -1) entries[idx] = entry; else entries.push(entry);
          }

          // Store without TTL so knowledge never expires
          await env.TOKEN_CACHE.put('ai-knowledge-base', JSON.stringify({ entries }));
          return json({ ok: true, entries }, 200, ch);
        } catch (err) {
          return json({ ok: false, error: err.message }, 500, ch);
        }
      }

      // ── GET /api/cruise/demand ────────────────────────────────────────
      // Shared Requisition Setup config (Talent Pool + Monthly Demand) so it
      // is the same for every user/device. Stored in KV with no TTL.
      if (method === 'GET' && path === '/api/cruise/demand') {
        const data = await getCached(env, 'cruise-demand-config');
        return json({ demand: (data && data.demand) || {} }, 200, ch);
      }

      // ── POST /api/cruise/demand ───────────────────────────────────────
      // Body: { demand: {...} } — replaces the stored config.
      if (method === 'POST' && path === '/api/cruise/demand') {
        try {
          const body   = await request.json();
          const demand = body && body.demand;
          if (!demand || typeof demand !== 'object') {
            return json({ ok: false, error: 'demand object required' }, 400, ch);
          }
          await env.TOKEN_CACHE.put('cruise-demand-config', JSON.stringify({ demand }));
          return json({ ok: true }, 200, ch);
        } catch (err) {
          return json({ ok: false, error: err.message }, 500, ch);
        }
      }

      // ── Shared cruise app-state (KV) ──────────────────────────────────
      // Generic key/value store so per-device data (heat map, recruiting
      // notes, pending overrides, sent-timestamps) is shared across all
      // users/devices. Allowlisted keys only. No TTL → persists.
      if ((method === 'GET' || method === 'POST') && path === '/api/cruise/state') {
        const ALLOWED = ['heatmap', 'rpt_notes', 'pending_overrides', 'mistral_sent', 'sa_sent'];
        if (method === 'GET') {
          const key = url.searchParams.get('key') || '';
          if (!ALLOWED.includes(key)) return json({ error: 'unknown key' }, 400, ch);
          const data = await getCached(env, 'cruise-state:' + key);
          return json({ value: data ? data.value : null }, 200, ch);
        }
        try {
          const body = await request.json();
          const key  = body && body.key;
          if (!ALLOWED.includes(key)) return json({ ok: false, error: 'unknown key' }, 400, ch);
          await env.TOKEN_CACHE.put('cruise-state:' + key, JSON.stringify({ value: body.value }));
          return json({ ok: true }, 200, ch);
        } catch (err) {
          return json({ ok: false, error: err.message }, 500, ch);
        }
      }

      // ── POST /api/ai/chat ──────────────────────────────────────────────────
      // Proxies to Anthropic Claude API. Requires ANTHROPIC_API_KEY secret.
      if (method === 'POST' && path === '/api/ai/chat') {
        try {
          const apiKey = env.ANTHROPIC_API_KEY;
          if (!apiKey) return json({ error: 'AI not configured — set ANTHROPIC_API_KEY secret in Cloudflare dashboard' }, 400, ch);

          const body = await request.json();
          // Optional overrides for structured tasks (e.g. Heat Map AI Autofill).
          const customSystem = body.system ? String(body.system).slice(0, 8000) : null;
          const maxTokens    = Math.min(Math.max(parseInt(body.max_tokens, 10) || 800, 100), 4000);
          // Trim per-request size to stay within the input-token/minute rate limit.
          // Structured tasks (customSystem) carry their own context, so skip the
          // big knowledge base / page context for those.
          const messages = (body.messages || []).slice(customSystem ? -2 : -6);
          const context  = customSystem ? '' : String(body.context || '').slice(0, 2000);

          // Load knowledge base for AI context (chat only; capped).
          let knowledgeContext = '';
          if (!customSystem) {
            try {
              const kb = (await getCached(env, 'ai-knowledge-base')) || { entries: [] };
              if (kb.entries?.length) {
                let kbText = kb.entries.map(e => {
                  let entry = `[${e.portal || e.category || 'General'} | ${e.type || 'Definition'}] ${e.title || e.topic}`;
                  entry += `\n${e.content}`;
                  return entry;
                }).join('\n\n');
                if (kbText.length > 2500) kbText = kbText.slice(0, 2500) + '…';
                knowledgeContext = '\n\n--- KNOWLEDGE BASE ---\n' + kbText + '\n--- END KNOWLEDGE BASE ---';
              }
            } catch (_) {}
          }

          // Detect which portal is active from context
          const isCruise = context.includes('SEAFARERS') || context.includes('DEPLOYMENT') ||
                           context.includes('Cruise Line Portal') || context.includes('Page: Seafarer') ||
                           context.includes('Page: Visa') || context.includes('Page: Deployment') ||
                           context.includes('Page: Requisition') || context.includes('Page: Attachment');
          const isJ1     = context.includes('J1') || context.includes('Page: Participant') ||
                           context.includes('Page: Return Home') || context.includes('Page: Housing') ||
                           context.includes('Page: Travel') || context.includes('Page: Visa Services');

          const systemPrompt = `You are CTI AI, an assistant for CTI Group Worldwide Services Inc.${isCruise ? ' You are currently helping with the CRUISE LINE PORTAL.' : isJ1 ? ' You are currently helping with the J1 PROGRAM PORTAL.' : ''}

You explain data, guide users to the right page/filter, and answer questions about CTI operations.

--- TERMINOLOGY ---
Onboarding Status: Report to Ship (ready to board), Ready to Go (cleared/no assignment), Completing Documents (gathering docs), Rescheduled (date changed), Resigned (left company)
Employment: Repeater (returned seafarer), New Hire (first placement), Re Hire (returning after gap)
Visa: C1/D (US crew visa — Cunard/CUK Maritime/Ventura/Aurora/Arcadia), MCV (UK multiple crew visa — Cunard/P&O/CUK), OKTB (Ok to Board — Singapore/HK/Bridgetown/Cape Town/Yokohama/Malta/Kotor/Montego Bay/Callao/Montevideo/St.Lucia), NZeTA (New Zealand — QA/QM2/QE/Arcadia), Schengen (Europe)
Cruise Lines: Cunard Line (QA/QM2/QE/QV), P&O Cruises (Arvia/Azura/Britannia/Iona/Ventura/Aurora/Arcadia), CUK Maritime
J1 Statuses: New Submission, Consultation Call, Sales Call, On Hold, Accepted, Visa Appointment, Visa Approved, USA Onboard, Program Completed, Withdrawal, Archived, Unqualified
--- END TERMINOLOGY ---

--- CRUISE LINE PORTAL — WHERE TO FIND DATA & FILTERS ---
Seafarer page: All active seafarers (resigned excluded). Filters: Cruise Line, Onboarding Status, Employment Type, Sign-On date range. KPI cards filter the table — click "Ready to Go" to see only ready seafarers, "Have Assignment Not Ready" for those with sign-on date but incomplete docs. Charts show by cruise line, by month, by not-ready breakdown — right-click any bar for drill-down details.

Visa page: Visa requirements for CTI Indonesia non-resigned seafarers. KPI cards (C1/D Required, MCV Required, OKTB Required, NZeTA Required, ATV, Schengen, Total Have Assignment) click to filter table. Visa Required column shows red badges for confirmed requirements. Detail button (magnifier) on each row shows full visa breakdown. Filter by Cruise Line, Onboarding Status, Sign-On date.

Deployment page: Full deployment history from Zoho Sheet (9,000+ records). Filters: Cruise Line, Employment Status, CTI Office, Month dropdown, Year dropdown, Countdown (≤7/15/30/60/90/+90 days). KPIs: Total Visa Required, Total Have Assignment (with sign-on date), YoY comparison (Jan–current month vs same period last year), MoM comparison. Charts: by Cruise Line, by Month (chronological), by CTI Office Analytics, by Employment Report.

Attachment page: Document status for CTI Indonesia seafarers. Send Form button emails the attachment form link to each seafarer. Last Sent column records date/time of last send. Filter by cruise line, status columns.

Requisition page: Open job positions from Zoho Recruit. Charts: Headcount by Cruise Line, by Department — right-click bars for drill-down. Filter by cruise line, status, department, position.

Final Interview page: CUK candidates approved in Final Interview sheet. Shows candidates ready to move to processing.

Report page: CUK Weekly Report generator. Password protected (ask admin). Download individual brand or all 3 brands as PDF.
--- END CRUISE PORTAL ---

--- J1 PROGRAM PORTAL — WHERE TO FIND DATA & FILTERS ---
Participant page: All active J1 participants (excludes Withdrawal/Archived/Unqualified). Tabs by status (USA Onboard, Visa Appointment, etc.) with counts. Filters: J1 Status, Source, Sponsor, Hosting Company. Click Detail on any row to view/edit full profile and push changes to Zoho. KPIs: Total, USA Onboard, Total Placement (Onboard + Completed).

Talent Pool page: Pipeline participants (New Submission, Consultation Call, Sales Call, On Hold, Accepted). Shows candidates waiting for placement. Filter by status tabs.

Visa page: Visa appointment tracking. Visa Journey column shows the full attempt trail (Pending → Rejected 1st → Pending 2nd, etc.). Filter by status, appointment date, source, sponsor. Date filters support before/on/after operators.

Return Home page: Participants with future program end date. Tabs: All In-Country, Return in 7 Days (urgent), Return in 15 Days, Return in 30 Days, Return Not Arranged (no return ticket issued). Countdown dropdown filters: ≤7/15/30/60/90/>90 days. Days Left column shows colored badges (red ≤7, amber ≤30, green >30). Filter by J1 Status, Source, Sponsor, Return Ticket status.

Housing page: Participant housing assignments. Shows CTI-arranged vs host-provided housing. Filter by housing status, sponsor, program dates.

Travel page: Flight booking management. Tabs: Departure tickets, Return tickets. Update ticket status (Requested → Booked → Issued) and push to Zoho. Filter by sponsor, gateway, dates.

Requisition page: Open J1 positions from host companies. Charts and table of openings by sponsor/department.
--- END J1 PORTAL ---
${knowledgeContext}

Current page data:
${context}

Rules:
- Keep answers SHORT — 2-3 sentences or 3-4 bullet points max.
- When explaining where to find data, mention the specific page name and filter/tab to use.
- NEVER use markdown: no **, *, #, or backticks. Plain text with dashes for lists.
- Cite numbers from the context when available (format with commas: 1,234).
- If data is not in context, explain WHICH page/filter to use to find it.
- Answer in English`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type':      'application/json',
              'x-api-key':         apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model:      'claude-sonnet-4-5',
              max_tokens: maxTokens,
              system:     customSystem || systemPrompt,
              messages,
            }),
          });

          const aiData = await aiRes.json();
          if (!aiRes.ok) return json({ error: aiData.error?.message || 'Claude API error' }, 500, ch);

          const text = aiData.content?.[0]?.text || '';
          return json({ response: text }, 200, ch);
        } catch (err) {
          return json({ error: err.message }, 500, ch);
        }
      }

      // ── 404 ───────────────────────────────────────────────────────────
      return json({ error: `No route: ${method} ${path}` }, 404, ch);

    } catch (err) {
      const status = (err.message === 'NOT_AUTHENTICATED' || err.message?.includes('invalid_code')) ? 401 : 500;
      return json({ error: err.message }, status, ch);
    }
  },

  // ── Cron Trigger: pre-warm ALL portal caches every 15 min ────────────────
  // Runs in parallel — keeps every dataset hot so users never hit a cold fetch.
  // Triggered by the schedule in wrangler.toml: "*/15 * * * *"
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const token = await getToken(env);

      await Promise.allSettled([

        // ── Cruise: seafarers ──────────────────────────────────────────────
        (async () => {
          const records = await fetchAll(token, ZOHO_RECRUIT, 'Candidates', null);
          const data    = records.map(mapSeafarer);
          await setCached(env, 'cruise-seafarers', { source:'recruit-seafarers', count:data.length, data });
        })(),

        // ── Cruise: deployment sheet ───────────────────────────────────────
        (async () => {
          const resourceId = env.ZOHO_DEPLOYMENT_SHEET_ID || 'begbjf0b04d7026534b328e36baa0a9d82df7';
          const sheetBody  = new URLSearchParams({ method:'worksheet.records.fetch', worksheet_name:'Deployment' });
          const sheetRes   = await fetch(`${ZOHO_SHEET_API}/${resourceId}`, {
            method:'POST',
            headers:{ Authorization:`Zoho-oauthtoken ${token}`, 'Content-Type':'application/x-www-form-urlencoded' },
            body: sheetBody, cf:{ cacheEverything:false },
          });
          const sheetData = await sheetRes.json();
          let rows = [];
          if (sheetData.records && Array.isArray(sheetData.records)) {
            rows = sheetData.records.map(r => { const o={}; Object.entries(r).forEach(([k,v])=>{ if(k!=='row_index') o[k]=v??''; }); return o; });
          }
          await setCached(env, 'cruise-deployment', { source:'zoho-sheet', count:rows.length, data:rows });
        })(),

        // ── J1: Recruit participants ───────────────────────────────────────
        (async () => {
          const records = await fetchAll(token, ZOHO_RECRUIT, 'Candidates', Object.values(RF).join(','));
          const data    = records.map(mapRecruit);
          await setCached(env, 'recruit-j1-participants', { source:'recruit', count:data.length, data });
        })(),

        // ── J1: CRM participants ───────────────────────────────────────────
        (async () => {
          const records = await fetchAll(token, ZOHO_CRM, 'J1_Participants1', Object.values(CF).join(','));
          const data    = records.map(mapCRM);
          await setCached(env, 'crm-j1-participants', { source:'crm', count:data.length, data });
        })(),

        // ── J1: Requisition (job openings) ────────────────────────────────
        (async () => {
          const records = await fetchAll(token, ZOHO_RECRUIT, 'Job_Openings', Object.values(JF).join(','));
          const allJobs = records.map(mapJob);
          await setCached(env, 'recruit-job-openings', { source:'recruit', count:allJobs.length, data:allJobs });
          // Also warm the j1-requisition view
          const j1Jobs  = allJobs.filter(j => /^j1 program$/i.test((j.placementCategory||'').trim()) && /^active$/i.test((j.status||'').trim()));
          const columns = REQ_COLS.map(([label]) => label);
          const rows    = j1Jobs.map(j => REQ_COLS.map(([,get]) => String(get(j)??'')));
          await setCached(env, 'j1-requisition', { source:'zoho-recruit', view:'Job Openings', data:{ columns, rows } });
        })(),

      ]);
    })());
  },
};
