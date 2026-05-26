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
const DATA_TTL      = 600;   // 10-minute data cache (seconds)
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
    headers: { 'Content-Type': 'application/json', ...extra },
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
    const data = await zGet(`${base}/${module}`, token, { fields, page, per_page: 200 });
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

function csvParseLine(line) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
    else if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else { cur += c; }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function csvToObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length < 2) return [];
  const header = csvParseLine(lines[0]).map(h => h.replace(/^"|"$/g,''));
  return lines.slice(1).map(line => {
    const cells = csvParseLine(line).map(c => c.replace(/^"|"$/g,''));
    const obj = {};
    header.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
}

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
  // Zoho Sheet returns records under data.records (array of arrays) with headers in data.header_row.
  // Normalize to objects.
  if (data.records && data.header_row) {
    const headers = data.header_row;
    return data.records.map(row => {
      const o = {}; headers.forEach((h, i) => { o[h] = row[i] ?? ''; }); return o;
    });
  }
  if (data.data?.records) {
    const headers = data.data.header_row || [];
    return data.data.records.map(row => {
      const o = {}; headers.forEach((h, i) => { o[h] = row[i] ?? ''; }); return o;
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
};

// ── Cruise Line Seafarer field map ───────────────────────────────────────
// Lives in the Recruit 'Candidates' module (plural label customized to
// 'Seafarers' in this account). Field API names confirmed via
// /api/cruise/debug/fields probe.
const SF = {
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
  };
}

// Cruise Seafarer mapper (Zoho Recruit "Seafarers" module)
function mapSeafarer(r) {
  const cl = r[SF.cruiseLine];
  return {
    _source:          'recruit',
    id:               r.id,
    createdTime:      r.Created_Time  || null,
    modifiedTime:     r.Modified_Time || null,
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

      // ── GET /api/cruise/debug/record?id=<recordId> ─────────────────────
      // Fetches a single Candidates record with EVERY field populated, so
      // we can see exactly which API name holds the value the user expects.
      if (method === 'GET' && path === '/api/cruise/debug/record') {
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'Pass ?id=<recordId>' }, 400, ch);
        const token = await getToken(env);
        const r = await fetch(`${ZOHO_RECRUIT}/Candidates/${id}`, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
        });
        const data = await r.json();
        // Filter to fields with a non-null value for easier reading
        const rec = data.data?.[0] || {};
        const filled = {};
        Object.entries(rec).forEach(([k, v]) => {
          if (v !== null && v !== '' && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v||{}).length === 0)) {
            filled[k] = v;
          }
        });
        return json({ id, filledFieldCount: Object.keys(filled).length, filled, raw: rec }, 200, ch);
      }

      // ── GET /api/cruise/debug/brandscan?brand=Cunard%20Line ────────────
      // Walks every page of Candidates, counts how many records per brand
      // pass the eligibility filter, and how many of those have a non-empty
      // Crew_ID_Number / Position_Applied. Names the first 3 samples per
      // bucket so we can confirm the right records are matching.
      if (method === 'GET' && path === '/api/cruise/debug/brandscan') {
        const brand = url.searchParams.get('brand') || 'Cunard Line';
        const token = await getToken(env);
        const fields = ['Full_Name','Cruise_Line','Employment_Status','Sign_On_Date',
                        'Onboarding_Status','Position_Applied','Position_Hired_2',
                        'Crew_ID_Number','Hired_Date'].join(',');
        const eligibleOB = new Set(['Completing Documents','Ready to Go','Rescheduled']);
        let all = [], page = 1, more = true;
        while (more && page <= 50) {
          const r = await zGet(`${ZOHO_RECRUIT}/Candidates`, token, { fields, page, per_page: 200 });
          all = all.concat(r.data || []);
          more = r.info?.more_records === true;
          page++;
        }
        const totals = { scanned: all.length, brandMatch: 0, eligible: 0,
                         withId: 0, withPos: 0, eligibleWithId: 0 };
        const sampleIds = [], samplePos = [], sampleElig = [];
        all.forEach(r => {
          if (r.Cruise_Line !== brand) return;
          totals.brandMatch++;
          const eligible = r.Employment_Status === 'New Hire'
            && !r.Sign_On_Date
            && eligibleOB.has(r.Onboarding_Status);
          if (eligible) totals.eligible++;
          if (r.Crew_ID_Number) { totals.withId++; if (sampleIds.length < 3) sampleIds.push({
            name: r.Full_Name, hired: r.Hired_Date, position: r.Position_Applied,
            id: r.Crew_ID_Number, emp: r.Employment_Status, signOn: r.Sign_On_Date,
            onb: r.Onboarding_Status,
          });}
          if (r.Position_Applied) { totals.withPos++; if (samplePos.length < 3) samplePos.push({
            name: r.Full_Name, hired: r.Hired_Date, position: r.Position_Applied,
          });}
          if (eligible && r.Crew_ID_Number) { totals.eligibleWithId++;
            if (sampleElig.length < 3) sampleElig.push({
              name: r.Full_Name, position: r.Position_Applied, id: r.Crew_ID_Number,
              hired: r.Hired_Date, onb: r.Onboarding_Status,
            });
          }
        });
        return json({ brand, totals, sampleIds, samplePos, sampleElig }, 200, ch);
      }

      // ── GET /api/cruise/debug/idsearch ─────────────────────────────────
      // Searches the Candidates module for records that have a non-empty
      // value in any of the ID-like fields, to find which one the team is
      // actually populating.
      if (method === 'GET' && path === '/api/cruise/debug/idsearch') {
        const token = await getToken(env);
        const probeFields = ['Candidate_ID','Crew_ID_Number','Temporary_ID','Crew_ID_2'];
        const fields = ['Full_Name','Cruise_Line','Hired_Date','Position_Applied','Position_Hired_2',
                        ...probeFields].join(',');
        // Pull 5 pages = up to 1000 candidates
        let all = [];
        for (let page = 1; page <= 5; page++) {
          const data = await zGet(`${ZOHO_RECRUIT}/Candidates`, token,
            { fields, page, per_page: 200 });
          all = all.concat(data.data || []);
          if (!data.info?.more_records) break;
        }
        const counts = {}; probeFields.forEach(f => counts[f] = 0);
        const samples = {}; probeFields.forEach(f => samples[f] = []);
        all.forEach(r => {
          probeFields.forEach(f => {
            if (r[f] != null && r[f] !== '') {
              counts[f]++;
              if (samples[f].length < 2) samples[f].push({
                full_name: r.Full_Name, cruise_line: r.Cruise_Line,
                hired_date: r.Hired_Date, position_applied: r.Position_Applied,
                position_hired_2: r.Position_Hired_2, [f]: r[f],
              });
            }
          });
        });
        return json({ scanned: all.length, counts, samples }, 200, ch);
      }

      // ── GET /api/cruise/debug/fields?module=Candidates ─────────────────
      // Lists every field on a Recruit module with its api_name + label so
      // we can find the right name for Position Hired / Seafarer ID, etc.
      if (method === 'GET' && path === '/api/cruise/debug/fields') {
        const moduleName = url.searchParams.get('module') || 'Candidates';
        const filter     = (url.searchParams.get('q') || '').toLowerCase();
        const token = await getToken(env);
        const r = await fetch(`${ZOHO_RECRUIT}/settings/fields?module=${moduleName}`, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
        });
        const data = await r.json();
        const all  = (data.fields || []).map(f => ({
          api_name:    f.api_name,
          field_label: f.field_label,
          data_type:   f.data_type,
        }));
        const matches = filter
          ? all.filter(f => (f.api_name + ' ' + f.field_label).toLowerCase().includes(filter))
          : all;
        return json({ moduleName, count: matches.length, fields: matches }, 200, ch);
      }

      // ── GET /api/cruise/debug/modules ──────────────────────────────────
      // Lists every Recruit module API name so we can find the right one
      // for the Seafarer / cruise records.
      if (method === 'GET' && path === '/api/cruise/debug/modules') {
        const token = await getToken(env);
        const r = await fetch(`${ZOHO_RECRUIT}/settings/modules`, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
        });
        const data = await r.json();
        const summary = (data.modules || []).map(m => ({
          api_name:     m.api_name,
          plural_label: m.plural_label,
          module_name:  m.module_name,
          singular:     m.singular_label,
          generated:    m.generated_type,
          visible:      m.visibility,
        }));
        return json({ summary, raw: data }, 200, ch);
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
        const fields  = Object.values(SF).join(',');

        const moduleName = url.searchParams.get('module') || 'Candidates';

        if (url.searchParams.get('debug')) {
          // Probe the module directly so we can see what Zoho says.
          const probe = await zGet(`${ZOHO_RECRUIT}/${moduleName}`, token, { fields, page: 1, per_page: 5 });
          return json({ probe, fieldsRequested: fields, moduleName }, 200, ch);
        }

        const records = await fetchAll(token, ZOHO_RECRUIT, moduleName, fields);
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

      // ── GET /api/recruit/job-openings ─────────────────────────────────
      if (method === 'GET' && path === '/api/recruit/job-openings') {
        const cached = await getCached(env, 'recruit-job-openings');
        if (cached) return json(cached, 200, ch);

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

      // ── PATCH /api/recruit/:module/:id ────────────────────────────────
      //    (Zoho Recruit uses PUT for updates)
      const recruitPatch = path.match(/^\/api\/recruit\/([^/]+)\/([^/]+)$/);
      if (method === 'PATCH' && recruitPatch) {
        const [, module, id] = recruitPatch;
        const token   = await getToken(env);
        const rawBody = await request.json();
        const body    = rawBody.data ? rawBody : { data: [{ ...rawBody }] };
        const data    = await zPut(`${ZOHO_RECRUIT}/${module}/${id}`, token, body);
        await clearCached(env, 'recruit-j1-participants');
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

      // ── 404 ───────────────────────────────────────────────────────────
      return json({ error: `No route: ${method} ${path}` }, 404, ch);

    } catch (err) {
      const status = (err.message === 'NOT_AUTHENTICATED' || err.message?.includes('invalid_code')) ? 401 : 500;
      return json({ error: err.message }, status, ch);
    }
  },
};
