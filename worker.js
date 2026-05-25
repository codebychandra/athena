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
  uniAccreditationStatus:  'University_Accreditation_Status',
  proofAcademicStatus:     'Proof_of_Academic_Status',
  educationalCertStatus:   'Educational_Certificate_Status',
  academicTranscriptStatus:'Academic_Transcripts_Status',
  englishAssessmentLetterStatus: 'English_Assessment_Letter_Status',
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

// ── Record mappers ────────────────────────────────────────────────────────
function mapRecruit(r) {
  const arr = v => Array.isArray(v) ? v.join(', ') : (v || '—');
  return {
    _source:             'recruit',
    id:                  r.id,
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
