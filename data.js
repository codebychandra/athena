// Embedded mock data — no server required
window.MOCK_DATA = {

'data/overview.json': {
  period: "May 2026",
  kpis: { totalPlacements: 1284, totalRevenue: 2400000, activeCandidates: 347, visaApprovalRate: 94 },
  kpiChanges: { totalPlacements: 12, totalRevenue: 8.3, activeCandidates: -3, visaApprovalRate: 2 },
  monthlyTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    cruise:  [42,58,71,65,48,39,35,42,51,60,68,74],
    j1:      [28,45,62,58,32,18,12,15,28,38,45,40],
    marine:  [18,22,25,24,20,19,18,17,19,21,23,22],
    visa:    [14,18,20,19,16,15,14,13,15,17,18,18]
  },
  revenueShare: { cruise: 52, j1: 28, marine: 12, visa: 8 },
  divisionSummary: {
    cruise: { placed: 580, pending: 140, activeClients: 24 },
    j1:     { placed: 320, pending: 95,  activePrograms: 8 },
    marine: { placed: 218, inTransit: 62, activeRoutes: 12 },
    visa:   { approved: 166, processing: 50, visaTypes: 6 }
  }
},

'data/cruise.json': {
  kpis: { totalPlaced: 580, activeOpenings: 142, partnerLines: 24, avgDaysToPlace: 18, renewalRate: 76 },
  positionPlacements: {
    labels: ["Housekeeping","F&B","Entertainment","Deck","Engineering","Medical","Admin"],
    data:   [142, 118, 74, 68, 62, 44, 72]
  },
  monthlyTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    data:   [42,58,71,65,48,39,35,42,51,60,68,74]
  },
  pipeline: {
    labels: ["Applied","Screened","Interviewed","Offered","Placed"],
    data:   [920,620,380,210,580]
  },
  clients: [
    { name:"Carnival Cruise Lines",    placements:112, openRoles:28, status:"Active",   lastActivity:"2026-05-05" },
    { name:"Virgin Voyages",           placements:88,  openRoles:15, status:"Active",   lastActivity:"2026-05-03" },
    { name:"Cunard",                   placements:74,  openRoles:12, status:"Active",   lastActivity:"2026-04-28" },
    { name:"Holland America Line",     placements:68,  openRoles:20, status:"Active",   lastActivity:"2026-05-01" },
    { name:"Oceania Cruises",          placements:55,  openRoles:18, status:"Active",   lastActivity:"2026-04-22" },
    { name:"Regent Seven Seas",        placements:48,  openRoles:10, status:"Active",   lastActivity:"2026-04-30" },
    { name:"P&O Cruises",              placements:62,  openRoles:22, status:"Active",   lastActivity:"2026-05-04" },
    { name:"Margaritaville at Sea",    placements:44,  openRoles:14, status:"Pending",  lastActivity:"2026-04-15" },
    { name:"CIEE",                     placements:29,  openRoles:3,  status:"Active",   lastActivity:"2026-05-02" }
  ]
},

'data/j1.json': {
  kpis: { exchangesPlaced: 320, activePrograms: 8, partnerUniversities: 45, countriesRepresented: 32, completionRate: 91 },
  programPlacements: {
    labels: ["Summer Work Travel","Intern","Trainee","Au Pair","Camp Counselor","Teacher","Research Scholar"],
    data:   [98, 62, 48, 36, 44, 22, 10]
  },
  countryOrigin: [
    { country:"Philippines", count:68 },{ country:"Indonesia",   count:54 },
    { country:"Colombia",    count:42 },{ country:"Mexico",      count:38 },
    { country:"Ukraine",     count:30 },{ country:"Brazil",      count:26 },
    { country:"Romania",     count:22 },{ country:"Thailand",    count:18 },
    { country:"India",       count:14 },{ country:"Peru",        count:8  }
  ],
  seasonalTrend: {
    labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    data:   [15,18,28,38,45,62,80,72,32,18,12,10]
  },
  complianceStatus: {
    labels: ["In Good Standing","Warning","Under Review","Completed"],
    data:   [210,18,12,80]
  },
  monthlyTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    data:   [28,45,62,58,32,18,12,15,28,38,45,40]
  }
},

'data/marine.json': {
  kpis: { totalPlaced: 218, activeRoutes: 12, partnerVessels: 38, countriesCovered: 28, avgContractMonths: 9 },
  rolePlacements: {
    labels: ["Officers","Engineers","Ratings","Hospitality","Medical"],
    data:   [58, 62, 48, 32, 18]
  },
  routes: [
    { route:"Caribbean Circuit",       vessel:"MV Pacific Star",    crewPlaced:24, departurePort:"Miami, FL",        nextRotation:"2026-06-01" },
    { route:"Mediterranean Round",     vessel:"MV Adriatic Breeze", crewPlaced:18, departurePort:"Barcelona, Spain", nextRotation:"2026-06-15" },
    { route:"Trans-Pacific",           vessel:"MV Horizon Voyager", crewPlaced:22, departurePort:"Los Angeles, CA",  nextRotation:"2026-05-28" },
    { route:"Northern Europe Circuit", vessel:"MV Nordic Glory",    crewPlaced:16, departurePort:"Hamburg, Germany", nextRotation:"2026-07-01" },
    { route:"Southeast Asia Route",    vessel:"MV Asian Pearl",     crewPlaced:20, departurePort:"Singapore",        nextRotation:"2026-06-10" },
    { route:"Gulf of Mexico",          vessel:"MV Gulf Mariner",    crewPlaced:14, departurePort:"Houston, TX",      nextRotation:"2026-05-20" },
    { route:"Alaska Passage",          vessel:"MV Aurora Voyager",  crewPlaced:18, departurePort:"Seattle, WA",      nextRotation:"2026-05-30" },
    { route:"Indian Ocean Circuit",    vessel:"MV Malabar Star",    crewPlaced:12, departurePort:"Mumbai, India",    nextRotation:"2026-07-15" }
  ],
  nationalities: {
    labels: ["Philippines","Indonesia","Ukraine","India","Romania","Croatia","Greece","Myanmar","Colombia","Brazil"],
    data:   [68, 44, 28, 22, 18, 14, 12, 10, 8, 6]
  },
  monthlyTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    data:   [18,22,25,24,20,19,18,17,19,21,23,22]
  }
},

'data/visa.json': {
  kpis: { totalApplications: 216, approved: 166, processing: 50, avgProcessingDays: 28, successRate: 94 },
  byType: {
    labels: ["J1 Exchange Visitor","H-2B Seasonal","B1/B2 Visitor","Work Permit","Seafarer's Document","SEAMAN Book"],
    data:   [82, 44, 28, 24, 20, 18]
  },
  pipeline: {
    labels: ["Submitted","Under Review","Additional Docs","Approved","Rejected"],
    data:   [216, 160, 32, 166, 18]
  },
  approvalTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    data:   [88,90,92,91,93,94,92,93,95,94,96,94]
  },
  processingTime: {
    labels: ["J1 Exchange Visitor","H-2B Seasonal","B1/B2 Visitor","Work Permit","Seafarer's Document","SEAMAN Book"],
    data:   [35, 42, 18, 48, 14, 12]
  },
  monthlyTrend: {
    labels: ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
    data:   [14,18,20,19,16,15,14,13,15,17,18,18]
  },
  applications: [
    { applicant:"Maria Santos",      type:"J1 Exchange Visitor",  division:"j1",     submitted:"2026-04-10", status:"Approved",      due:"2026-05-10", officer:"R. Dela Cruz" },
    { applicant:"Budi Santoso",      type:"Seafarer's Document",  division:"marine", submitted:"2026-04-15", status:"Processing",    due:"2026-05-20", officer:"A. Reyes" },
    { applicant:"Carlos Gomez",      type:"J1 Exchange Visitor",  division:"j1",     submitted:"2026-03-28", status:"Approved",      due:"2026-04-28", officer:"R. Dela Cruz" },
    { applicant:"Olena Kovalenko",   type:"H-2B Seasonal",        division:"cruise", submitted:"2026-04-01", status:"Under Review",  due:"2026-05-15", officer:"A. Reyes" },
    { applicant:"Lucas Silva",       type:"Work Permit",          division:"marine", submitted:"2026-03-20", status:"Approved",      due:"2026-05-05", officer:"J. Cruz" },
    { applicant:"Elena Ionescu",     type:"J1 Exchange Visitor",  division:"j1",     submitted:"2026-04-20", status:"Processing",    due:"2026-05-25", officer:"R. Dela Cruz" },
    { applicant:"Somchai Wongsawat", type:"SEAMAN Book",          division:"marine", submitted:"2026-04-05", status:"Approved",      due:"2026-05-05", officer:"J. Cruz" },
    { applicant:"Isabella Rojas",    type:"B1/B2 Visitor",        division:"j1",     submitted:"2026-04-22", status:"Additional Docs",due:"2026-05-22",officer:"A. Reyes" },
    { applicant:"Dewi Rahayu",       type:"H-2B Seasonal",        division:"cruise", submitted:"2026-03-15", status:"Approved",      due:"2026-04-15", officer:"R. Dela Cruz" },
    { applicant:"Andrei Popescu",    type:"Work Permit",          division:"marine", submitted:"2026-04-18", status:"Processing",    due:"2026-05-28", officer:"J. Cruz" }
  ]
},

'data/clients.json': [
  { id:1,  name:"Carnival Cruise Lines",    division:"cruise",  industry:"Cruise & Maritime",      contact:"James Thompson",  email:"j.thompson@carnival.com",       placements:112, openRoles:28, status:"Active",      contractStart:"2024-01-01", contractEnd:"2026-12-31", notes:"Top-tier partner. Multi-year contract." },
  { id:2,  name:"Virgin Voyages",           division:"cruise",  industry:"Cruise & Maritime",      contact:"Sarah Mitchell",   email:"s.mitchell@virginvoyages.com",  placements:88,  openRoles:15, status:"Active",      contractStart:"2024-06-01", contractEnd:"2026-05-31", notes:"Focus on entertainment and F&B staff." },
  { id:3,  name:"Cunard",                   division:"cruise",  industry:"Cruise & Maritime",      contact:"Robert Williams",  email:"r.williams@cunard.com",         placements:74,  openRoles:12, status:"Active",      contractStart:"2023-09-01", contractEnd:"2026-08-31", notes:"White-glove service standards required." },
  { id:4,  name:"Holland America Line",     division:"cruise",  industry:"Cruise & Maritime",      contact:"Linda Hartman",    email:"l.hartman@hollandamerica.com",  placements:68,  openRoles:20, status:"Active",      contractStart:"2024-03-01", contractEnd:"2027-02-28", notes:"Strong preference for Filipino candidates." },
  { id:5,  name:"Oceania Cruises",          division:"cruise",  industry:"Cruise & Maritime",      contact:"David Park",       email:"d.park@oceaniacruises.com",     placements:55,  openRoles:18, status:"Active",      contractStart:"2025-01-01", contractEnd:"2026-12-31", notes:"Luxury segment, culinary-focused." },
  { id:6,  name:"Regent Seven Seas",        division:"cruise",  industry:"Luxury Cruise",          contact:"Amanda Foster",    email:"a.foster@rssc.com",             placements:48,  openRoles:10, status:"Active",      contractStart:"2024-07-01", contractEnd:"2026-06-30", notes:"Ultra-luxury segment. Very selective." },
  { id:7,  name:"P&O Cruises",              division:"cruise",  industry:"Cruise & Maritime",      contact:"Mark Evans",       email:"m.evans@pocruises.com",         placements:62,  openRoles:22, status:"Active",      contractStart:"2023-11-01", contractEnd:"2026-10-31", notes:"UK-based operations, large volume." },
  { id:8,  name:"Margaritaville at Sea",    division:"cruise",  industry:"Cruise & Maritime",      contact:"Chris Johnson",    email:"c.johnson@margaritaville.com",  placements:44,  openRoles:14, status:"Pending",     contractStart:"2025-06-01", contractEnd:"2026-05-31", notes:"Contract renewal under review." },
  { id:9,  name:"CIEE",                     division:"cruise",  industry:"Cultural Exchange",       contact:"Patricia Lee",     email:"p.lee@ciee.org",                placements:29,  openRoles:3,  status:"Active",      contractStart:"2024-01-01", contractEnd:"2026-12-31", notes:"Partner for J1/cultural programs." },
  { id:10, name:"Grand Hyatt Hotels",       division:"j1",      industry:"Hospitality",             contact:"Susan Carter",     email:"s.carter@hyatt.com",            placements:48,  openRoles:12, status:"Active",      contractStart:"2024-04-01", contractEnd:"2027-03-31", notes:"Primarily Summer Work Travel program." },
  { id:11, name:"Walt Disney World",        division:"j1",      industry:"Entertainment & Parks",   contact:"Michael Brown",    email:"m.brown@disney.com",            placements:62,  openRoles:25, status:"Active",      contractStart:"2023-06-01", contractEnd:"2026-05-31", notes:"High volume seasonal. Focus on summer." },
  { id:12, name:"Marriott International",   division:"j1",      industry:"Hospitality",             contact:"Jennifer Davis",   email:"j.davis@marriott.com",          placements:36,  openRoles:8,  status:"Active",      contractStart:"2024-09-01", contractEnd:"2026-08-31", notes:"Trainee and intern programs." },
  { id:13, name:"Universal Studios",        division:"j1",      industry:"Entertainment & Parks",   contact:"Kevin Nguyen",     email:"k.nguyen@universalstudios.com", placements:28,  openRoles:10, status:"Active",      contractStart:"2025-01-01", contractEnd:"2026-12-31", notes:"Theme park seasonal positions." },
  { id:14, name:"State University NY",      division:"j1",      industry:"Education",               contact:"Dr. Anne Walsh",   email:"a.walsh@suny.edu",              placements:14,  openRoles:4,  status:"Active",      contractStart:"2024-08-01", contractEnd:"2026-07-31", notes:"Research scholar placements." },
  { id:15, name:"Pacific Carriers Ltd.",    division:"marine",  industry:"Shipping & Logistics",    contact:"Captain R. Tan",   email:"r.tan@pacificcarriers.com",     placements:42,  openRoles:8,  status:"Active",      contractStart:"2024-01-01", contractEnd:"2026-12-31", notes:"Bulk carrier fleet. 6–9 month contracts." },
  { id:16, name:"Stolt-Nielsen",            division:"marine",  industry:"Tanker Operations",       contact:"Hans Bergmann",    email:"h.bergmann@stolt.com",          placements:38,  openRoles:10, status:"Active",      contractStart:"2023-07-01", contractEnd:"2026-06-30", notes:"Chemical tanker specialist crew." },
  { id:17, name:"MSC Cruises",              division:"marine",  industry:"Cruise & Maritime",       contact:"Lucia Romano",     email:"l.romano@msccruises.com",       placements:30,  openRoles:6,  status:"Negotiating", contractStart:"2025-03-01", contractEnd:"2026-02-28", notes:"Contract negotiation in progress." },
  { id:18, name:"Maersk Line",              division:"marine",  industry:"Container Shipping",      contact:"Lars Petersen",    email:"l.petersen@maersk.com",         placements:22,  openRoles:4,  status:"Active",      contractStart:"2024-05-01", contractEnd:"2027-04-30", notes:"Container ship officers and engineers." }
],

'data/candidates.json': [
  { id:1,  name:"Maria Santos",        division:"cruise",  position:"Housekeeping Supervisor", nationality:"Philippines", status:"Placed",      applied:"2026-01-15", lastActivity:"2026-04-20", email:"m.santos@email.com",      phone:"+63-917-123-4567", notes:"Excellent performance record." },
  { id:2,  name:"Jose Cruz",           division:"cruise",  position:"F&B Steward",             nationality:"Philippines", status:"Screening",   applied:"2026-03-10", lastActivity:"2026-05-01", email:"j.cruz@email.com",        phone:"+63-918-234-5678", notes:"Strong F&B background." },
  { id:3,  name:"Ana Reyes",           division:"j1",      position:"Summer Work Travel",      nationality:"Philippines", status:"Interviewing",applied:"2026-02-20", lastActivity:"2026-04-25", email:"a.reyes@email.com",       phone:"+63-919-345-6789", notes:"Hotel internship candidate." },
  { id:4,  name:"Juan Dela Cruz",      division:"marine",  position:"AB Seaman",               nationality:"Philippines", status:"Placed",      applied:"2026-01-08", lastActivity:"2026-03-15", email:"j.delacruz@email.com",    phone:"+63-920-456-7890", notes:"10 years seafaring experience." },
  { id:5,  name:"Rosa Garcia",         division:"cruise",  position:"Guest Services",          nationality:"Philippines", status:"Offered",     applied:"2026-03-05", lastActivity:"2026-05-02", email:"r.garcia@email.com",      phone:"+63-921-567-8901", notes:"Fluent in English and Spanish." },
  { id:6,  name:"Mark Villanueva",     division:"cruise",  position:"Deck Officer",            nationality:"Philippines", status:"Placed",      applied:"2025-11-20", lastActivity:"2026-02-10", email:"m.villanueva@email.com",  phone:"+63-922-678-9012", notes:"STCW certified." },
  { id:7,  name:"Liza Mendoza",        division:"j1",      position:"Au Pair",                 nationality:"Philippines", status:"Applied",     applied:"2026-04-18", lastActivity:"2026-04-18", email:"l.mendoza@email.com",     phone:"+63-923-789-0123", notes:"Child care experience verified." },
  { id:8,  name:"Carlo Ramos",         division:"marine",  position:"Chief Engineer",          nationality:"Philippines", status:"Interviewing",applied:"2026-02-14", lastActivity:"2026-04-30", email:"c.ramos@email.com",       phone:"+63-924-890-1234", notes:"Class 1 Engineer license." },
  { id:9,  name:"Grace Torres",        division:"cruise",  position:"Medical Officer",         nationality:"Philippines", status:"Placed",      applied:"2026-01-22", lastActivity:"2026-04-05", email:"g.torres@email.com",      phone:"+63-925-901-2345", notes:"Registered nurse, 5 years at sea." },
  { id:10, name:"Paolo Aquino",        division:"cruise",  position:"Entertainment Staff",     nationality:"Philippines", status:"Screening",   applied:"2026-04-01", lastActivity:"2026-05-03", email:"p.aquino@email.com",      phone:"+63-926-012-3456", notes:"Performer background." },
  { id:11, name:"Sophia Bautista",     division:"j1",      position:"Camp Counselor",          nationality:"Philippines", status:"Placed",      applied:"2026-01-30", lastActivity:"2026-03-20", email:"s.bautista@email.com",    phone:"+63-927-123-4568", notes:"Summer camp placement confirmed." },
  { id:12, name:"Ryan Fernandez",      division:"marine",  position:"Motorman",                nationality:"Philippines", status:"On Hold",     applied:"2026-03-12", lastActivity:"2026-04-10", email:"r.fernandez@email.com",   phone:"+63-928-234-5679", notes:"Medical clearance pending." },
  { id:13, name:"Budi Santoso",        division:"marine",  position:"2nd Officer",             nationality:"Indonesia",   status:"Placed",      applied:"2026-01-10", lastActivity:"2026-03-28", email:"b.santoso@email.com",     phone:"+62-811-234-5678", notes:"OOW certified." },
  { id:14, name:"Dewi Rahayu",         division:"cruise",  position:"Spa Therapist",           nationality:"Indonesia",   status:"Placed",      applied:"2025-12-05", lastActivity:"2026-02-20", email:"d.rahayu@email.com",      phone:"+62-812-345-6789", notes:"International certification." },
  { id:15, name:"Ahmad Hidayat",       division:"cruise",  position:"Room Attendant",          nationality:"Indonesia",   status:"Interviewing",applied:"2026-03-25", lastActivity:"2026-05-01", email:"a.hidayat@email.com",     phone:"+62-813-456-7890", notes:"First-time applicant." },
  { id:16, name:"Siti Wahyuni",        division:"j1",      position:"Summer Work Travel",      nationality:"Indonesia",   status:"Screening",   applied:"2026-04-05", lastActivity:"2026-05-02", email:"s.wahyuni@email.com",     phone:"+62-814-567-8901", notes:"English proficiency: B2." },
  { id:17, name:"Rizky Pratama",       division:"marine",  position:"AB Seaman",               nationality:"Indonesia",   status:"Placed",      applied:"2026-01-18", lastActivity:"2026-03-10", email:"r.pratama@email.com",     phone:"+62-815-678-9012", notes:"Pacific carrier route assigned." },
  { id:18, name:"Nurul Aini",          division:"cruise",  position:"F&B Supervisor",          nationality:"Indonesia",   status:"Offered",     applied:"2026-02-28", lastActivity:"2026-05-04", email:"n.aini@email.com",        phone:"+62-816-789-0123", notes:"6 years cruise F&B." },
  { id:19, name:"Hendra Gunawan",      division:"cruise",  position:"Deck Cadet",              nationality:"Indonesia",   status:"Applied",     applied:"2026-04-20", lastActivity:"2026-04-20", email:"h.gunawan@email.com",     phone:"+62-817-890-1234", notes:"Fresh maritime graduate." },
  { id:20, name:"Yuli Kartika",        division:"j1",      position:"Trainee - Culinary",      nationality:"Indonesia",   status:"Placed",      applied:"2026-01-25", lastActivity:"2026-04-01", email:"y.kartika@email.com",     phone:"+62-818-901-2345", notes:"Culinary arts degree." },
  { id:21, name:"Putri Susanti",       division:"cruise",  position:"Housekeeping",            nationality:"Indonesia",   status:"Screening",   applied:"2026-03-30", lastActivity:"2026-05-03", email:"p.susanti@email.com",     phone:"+62-819-012-3456", notes:"Background check in progress." },
  { id:22, name:"Agus Setiawan",       division:"marine",  position:"Cook",                    nationality:"Indonesia",   status:"Rejected",    applied:"2026-02-10", lastActivity:"2026-03-05", email:"a.setiawan@email.com",    phone:"+62-820-123-4567", notes:"Did not meet STCW requirements." },
  { id:23, name:"Carlos Gomez",        division:"j1",      position:"Intern - Hotel",          nationality:"Colombia",    status:"Placed",      applied:"2026-01-12", lastActivity:"2026-03-25", email:"c.gomez@email.com",       phone:"+57-310-234-5678", notes:"Hospitality management student." },
  { id:24, name:"Isabella Rojas",      division:"j1",      position:"Au Pair",                 nationality:"Colombia",    status:"Interviewing",applied:"2026-03-18", lastActivity:"2026-05-01", email:"i.rojas@email.com",       phone:"+57-311-345-6789", notes:"Childcare certified." },
  { id:25, name:"Miguel Hernandez",    division:"cruise",  position:"Chef",                    nationality:"Mexico",      status:"Placed",      applied:"2025-12-15", lastActivity:"2026-02-28", email:"m.hernandez@email.com",   phone:"+52-55-234-5678",  notes:"Executive chef background." },
  { id:26, name:"Sofia Martinez",      division:"j1",      position:"Summer Work Travel",      nationality:"Mexico",      status:"Screening",   applied:"2026-04-08", lastActivity:"2026-05-02", email:"s.martinez@email.com",    phone:"+52-55-345-6789",  notes:"Hotel and resort experience." },
  { id:27, name:"Andres Vargas",       division:"cruise",  position:"Bartender",               nationality:"Colombia",    status:"Offered",     applied:"2026-02-22", lastActivity:"2026-05-03", email:"a.vargas@email.com",      phone:"+57-312-456-7890", notes:"Mixology certified." },
  { id:28, name:"Valentina Lopez",     division:"j1",      position:"Camp Counselor",          nationality:"Colombia",    status:"Applied",     applied:"2026-04-22", lastActivity:"2026-04-22", email:"v.lopez@email.com",       phone:"+57-313-567-8901", notes:"Sports instructor background." },
  { id:29, name:"Diego Ramirez",       division:"j1",      position:"Trainee - Culinary",      nationality:"Mexico",      status:"Placed",      applied:"2026-01-20", lastActivity:"2026-03-30", email:"d.ramirez@email.com",     phone:"+52-55-456-7890",  notes:"Top culinary school graduate." },
  { id:30, name:"Camila Moreno",       division:"j1",      position:"Intern - Hotel",          nationality:"Colombia",    status:"Screening",   applied:"2026-03-28", lastActivity:"2026-05-01", email:"c.moreno@email.com",      phone:"+57-314-678-9012", notes:"Tourism degree, 3rd year." },
  { id:31, name:"Javier Flores",       division:"cruise",  position:"Entertainment Staff",     nationality:"Mexico",      status:"Interviewing",applied:"2026-03-14", lastActivity:"2026-04-28", email:"j.flores@email.com",      phone:"+52-55-567-8901",  notes:"Professional dancer." },
  { id:32, name:"Maria Gutierrez",     division:"j1",      position:"Au Pair",                 nationality:"Mexico",      status:"Placed",      applied:"2026-01-05", lastActivity:"2026-03-10", email:"m.gutierrez@email.com",   phone:"+52-55-678-9012",  notes:"Placed with NY family." },
  { id:33, name:"Olena Kovalenko",     division:"cruise",  position:"Purser",                  nationality:"Ukraine",     status:"Placed",      applied:"2025-11-10", lastActivity:"2026-01-20", email:"o.kovalenko@email.com",   phone:"+380-67-234-5678", notes:"Accounting and admin specialist." },
  { id:34, name:"Dmytro Shevchenko",   division:"marine",  position:"Chief Engineer",          nationality:"Ukraine",     status:"Placed",      applied:"2025-12-01", lastActivity:"2026-02-15", email:"d.shevchenko@email.com",  phone:"+380-68-345-6789", notes:"20 years maritime engineering." },
  { id:35, name:"Natalia Petrenko",    division:"j1",      position:"Teacher",                 nationality:"Ukraine",     status:"Screening",   applied:"2026-03-22", lastActivity:"2026-05-02", email:"n.petrenko@email.com",    phone:"+380-69-456-7890", notes:"ESL certified teacher." },
  { id:36, name:"Mykola Lysenko",      division:"cruise",  position:"Deck Officer",            nationality:"Ukraine",     status:"Interviewing",applied:"2026-02-18", lastActivity:"2026-05-01", email:"m.lysenko@email.com",     phone:"+380-73-567-8901", notes:"OOW watchkeeping certificate." },
  { id:37, name:"Iryna Bondarenko",    division:"j1",      position:"Research Scholar",        nationality:"Ukraine",     status:"Placed",      applied:"2026-01-28", lastActivity:"2026-04-10", email:"i.bondarenko@email.com",  phone:"+380-74-678-9012", notes:"PhD candidate, biology." },
  { id:38, name:"Vasyl Kravchenko",    division:"marine",  position:"2nd Officer",             nationality:"Ukraine",     status:"Applied",     applied:"2026-04-25", lastActivity:"2026-04-25", email:"v.kravchenko@email.com",  phone:"+380-97-789-0123", notes:"Documents under verification." },
  { id:39, name:"Lucas Silva",         division:"marine",  position:"Cook",                    nationality:"Brazil",      status:"Placed",      applied:"2026-01-14", lastActivity:"2026-03-22", email:"l.silva@email.com",       phone:"+55-11-234-5678",  notes:"Brazilian cuisine specialist." },
  { id:40, name:"Camila Oliveira",     division:"cruise",  position:"F&B Steward",             nationality:"Brazil",      status:"Placed",      applied:"2025-12-10", lastActivity:"2026-02-25", email:"c.oliveira@email.com",    phone:"+55-21-345-6789",  notes:"Portuguese and English fluent." },
  { id:41, name:"Gabriel Souza",       division:"j1",      position:"Summer Work Travel",      nationality:"Brazil",      status:"Offered",     applied:"2026-03-02", lastActivity:"2026-05-04", email:"g.souza@email.com",       phone:"+55-11-456-7890",  notes:"Tourism major, 2nd year." },
  { id:42, name:"Fernanda Costa",      division:"cruise",  position:"Spa Therapist",           nationality:"Brazil",      status:"Screening",   applied:"2026-04-10", lastActivity:"2026-05-03", email:"f.costa@email.com",       phone:"+55-21-567-8901",  notes:"CIDESCO certified." },
  { id:43, name:"Rafael Almeida",      division:"marine",  position:"AB Seaman",               nationality:"Brazil",      status:"Placed",      applied:"2026-01-28", lastActivity:"2026-04-05", email:"r.almeida@email.com",     phone:"+55-11-678-9012",  notes:"STCW compliant." },
  { id:44, name:"Julia Ferreira",      division:"j1",      position:"Intern - Hotel",          nationality:"Brazil",      status:"Interviewing",applied:"2026-03-08", lastActivity:"2026-04-28", email:"j.ferreira@email.com",    phone:"+55-21-789-0123",  notes:"Hospitality management student." },
  { id:45, name:"Andrei Popescu",      division:"marine",  position:"Motorman",                nationality:"Romania",     status:"Processing",  applied:"2026-02-05", lastActivity:"2026-04-18", email:"a.popescu@email.com",     phone:"+40-72-234-5678",  notes:"Visa processing in progress." },
  { id:46, name:"Elena Ionescu",       division:"j1",      position:"Teacher",                 nationality:"Romania",     status:"Placed",      applied:"2025-11-25", lastActivity:"2026-02-08", email:"e.ionescu@email.com",     phone:"+40-73-345-6789",  notes:"Math teacher placement." },
  { id:47, name:"Mihai Constantin",    division:"cruise",  position:"Engineering Officer",     nationality:"Romania",     status:"Offered",     applied:"2026-02-12", lastActivity:"2026-05-01", email:"m.constantin@email.com",  phone:"+40-74-456-7890",  notes:"Y3 Engineering certificate." },
  { id:48, name:"Cristina Dumitrescu", division:"j1",      position:"Au Pair",                 nationality:"Romania",     status:"Applied",     applied:"2026-04-15", lastActivity:"2026-04-15", email:"c.dumitrescu@email.com",  phone:"+40-75-567-8901",  notes:"Childcare experience 3 years." },
  { id:49, name:"Somchai Wongsawat",   division:"marine",  position:"Cook",                    nationality:"Thailand",    status:"Placed",      applied:"2026-01-06", lastActivity:"2026-03-18", email:"s.wongsawat@email.com",   phone:"+66-81-234-5678",  notes:"Thai cuisine specialist." },
  { id:50, name:"Nisa Thongchai",      division:"j1",      position:"Summer Work Travel",      nationality:"Thailand",    status:"Screening",   applied:"2026-04-12", lastActivity:"2026-05-02", email:"n.thongchai@email.com",   phone:"+66-82-345-6789",  notes:"Resort hospitality background." }
]

}; // end MOCK_DATA
