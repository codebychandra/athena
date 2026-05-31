// Knowledge Library Seeder — run once with: node seed-knowledge.js
'use strict';
const https = require('https');
const WORKER = 'cti-athena.cti-athena.workers.dev';

const entries = [
// ═══════════════════════════════════════════════════════════
// CRUISE LINE — DEFINITIONS
// ═══════════════════════════════════════════════════════════
{ type:'Definition', portal:'Cruise Line', title:'Report to Ship',
  content:'Onboarding status meaning the seafarer has been confirmed, all documents are ready, and they are scheduled to board their assigned vessel.',
  whereToFind:'Seafarer page → Onboarding Status filter → select Report to Ship',
  relatedTerms:'Onboarding Status, Sign On Date, Seafarer' },

{ type:'Definition', portal:'Cruise Line', title:'Ready to Go',
  content:'Onboarding status meaning the seafarer has cleared all requirements and is ready for deployment, but does not yet have a confirmed sign-on date assignment.',
  whereToFind:'Seafarer page → Onboarding Status filter, or click the Ready to Go KPI card',
  relatedTerms:'Onboarding Status, No Assignment' },

{ type:'Definition', portal:'Cruise Line', title:'Completing Documents',
  content:'Onboarding status meaning the seafarer has a sign-on assignment but is still gathering required paperwork (passport, BST, SAT, medical, etc.).',
  whereToFind:'Seafarer page → Have Assignment Not Ready tab shows these seafarers',
  relatedTerms:'Onboarding Status, Attachment page, Documents' },

{ type:'Definition', portal:'Cruise Line', title:'Rescheduled',
  content:'Onboarding status meaning the seafarers deployment date was changed. They may still have a sign-on date but the original schedule was modified.',
  whereToFind:'Seafarer page → filter Onboarding Status = Rescheduled',
  relatedTerms:'Onboarding Status, Sign On Date' },

{ type:'Definition', portal:'Cruise Line', title:'Repeater',
  content:'Employment status for a seafarer who has previously worked with CTI or the cruise line and is returning for another contract.',
  whereToFind:'Seafarer page → Employment Type filter, or Deployment page → Repeater / New Hire KPI card',
  relatedTerms:'Employment Status, New Hire, Re Hire' },

{ type:'Definition', portal:'Cruise Line', title:'New Hire',
  content:'Employment status for a seafarer who is being placed by CTI for the first time — no prior contract history.',
  whereToFind:'Deployment page → Repeater / New Hire KPI card shows count. Filter via Employment Status.',
  relatedTerms:'Employment Status, Repeater, Re Hire' },

{ type:'Definition', portal:'Cruise Line', title:'Re Hire',
  content:'Employment status for a seafarer who previously worked with CTI, left, and is returning after a gap. Distinct from Repeater (active history) and New Hire (no history).',
  whereToFind:'Deployment page → Repeater / New Hire KPI counts New Hire + Re Hire combined',
  relatedTerms:'Employment Status, Repeater, New Hire' },

{ type:'Definition', portal:'Cruise Line', title:'Sign On Date',
  content:'The date the seafarer boards the vessel and begins their contract. Used for countdown calculations and deployment timeline planning.',
  whereToFind:'Seafarer page → Sign On Date column and filter. Deployment page → Sign On Date column.',
  relatedTerms:'Sign Off Date, Joining Ship, Sign On Port' },

{ type:'Definition', portal:'Cruise Line', title:'Joining Ship',
  content:'The specific vessel name the seafarer is assigned to join. Used to determine C1/D visa requirements — certain ships require the C1/D visa regardless of cruise line.',
  whereToFind:'Visa page → Joining Ship column. Seafarer page → Joining Ship column.',
  relatedTerms:'Sign On Date, Cruise Line, C1/D Visa' },

{ type:'Definition', portal:'Cruise Line', title:'Sign On Port',
  content:'The port where the seafarer boards the vessel. Determines OKTB and Schengen visa requirements — specific ports require these visas.',
  whereToFind:'Visa page → Sign On Port column. Seafarer page → Sign On Port column.',
  relatedTerms:'OKTB, Schengen Visa, Joining Ship' },

{ type:'Definition', portal:'Cruise Line', title:'CTI Office Analytics',
  content:'A grouped office label used in the Deployment Zoho Sheet for analytics. Values include CTI Indonesia, CTI Asia, etc. Used in the Deployment by CTI Office chart.',
  whereToFind:'Deployment page → CTI Office filter (uses CTI Office Analytics column). Deployment by CTI Office chart.',
  relatedTerms:'CTI Indonesia, CTI Office, Deployment' },

{ type:'Definition', portal:'Cruise Line', title:'C1/D Visa',
  content:'US Crew Member and Transit Visa required for seafarers joining ships that call at US ports, or for all Cunard Line, CUK Maritime, Ventura, Aurora, and Arcadia crew regardless of port.',
  whereToFind:'Visa page → C1/D Required KPI card filters table. Visa Required column shows red C1/D badge.',
  relatedTerms:'MCV, OKTB, Visa Required, Cunard Line, CUK Maritime' },

{ type:'Definition', portal:'Cruise Line', title:'MCV (Multiple Crew Visa)',
  content:'UK Multiple Crew Visa required for all crew of Cunard Line, P&O Cruises, and CUK Maritime. Allows multiple entries to the UK.',
  whereToFind:'Visa page → MCV Required KPI card. Visa Required column shows red MCV badge.',
  relatedTerms:'C1/D Visa, Cunard Line, P&O Cruises, CUK Maritime' },

{ type:'Definition', portal:'Cruise Line', title:'OKTB (Ok to Board)',
  content:'Ok to Board permit required at specific ports: Singapore, Hong Kong, Bridgetown, Cape Town, Yokohama, Malta/Valletta, Kotor, Montego Bay, Callao, Montevideo, St. Lucia.',
  whereToFind:'Visa page → OKTB Required KPI card. Visa Required column shows red OKTB badge when port matches.',
  relatedTerms:'Sign On Port, Visa Required, Malta' },

{ type:'Definition', portal:'Cruise Line', title:'NZeTA',
  content:'New Zealand Electronic Travel Authority. Required for crew joining Queen Anne, Queen Mary 2, Queen Elizabeth, and Arcadia. Auckland port is handled by CUK Onboarding — no crew action needed.',
  whereToFind:'Visa page → NZeTA Required KPI card. Visa Required column shows NZeTA badge for affected ships.',
  relatedTerms:'Joining Ship, Queen Anne, Queen Mary 2, Arcadia' },

{ type:'Definition', portal:'Cruise Line', title:'Schengen Visa',
  content:'Required for seafarers signing on at any European Schengen zone port including Barcelona, Lisbon, Rome/Civitavecchia, Bergen, Hamburg, Amsterdam, Paris and 80+ others. Malta can use OKTB instead per CTI policy.',
  whereToFind:'Visa page → Schengen Required KPI card. Also tracked via Zoho Other Visa Name / Other Visa Status fields.',
  relatedTerms:'Sign On Port, Visa Required, OKTB, Malta' },

{ type:'Definition', portal:'Cruise Line', title:'Cunard Line',
  content:'Luxury British cruise brand under Carnival UK. Ships: Queen Anne, Queen Mary 2 (QM2), Queen Elizabeth (QE), Queen Victoria (QV). All Cunard crew require C1/D and MCV visas.',
  whereToFind:'Seafarer/Deployment pages → Cruise Line filter. Requisition page → Headcount by Cruise Line chart.',
  relatedTerms:'C1/D Visa, MCV, CUK Maritime, P&O Cruises' },

{ type:'Definition', portal:'Cruise Line', title:'P&O Cruises',
  content:'British cruise line under Carnival UK. Ships: Arvia, Azura, Britannia, Iona, Ventura, Aurora, Arcadia. P&O crew require MCV. Ventura and Aurora also require C1/D. Arcadia requires C1/D and NZeTA.',
  whereToFind:'Seafarer/Deployment pages → Cruise Line filter.',
  relatedTerms:'MCV, C1/D Visa, NZeTA, Cunard Line, CUK Maritime' },

{ type:'Definition', portal:'Cruise Line', title:'CUK Maritime',
  content:'Maritime and crew management arm of Carnival UK. All CUK Maritime crew require C1/D and MCV visas.',
  whereToFind:'Seafarer page → Cruise Line filter. Final Interview page shows CUK approved candidates.',
  relatedTerms:'C1/D Visa, MCV, Cunard Line, P&O Cruises, Final Interview' },

// CRUISE LINE — FILTER GUIDES
{ type:'Filter Guide', portal:'Cruise Line', title:'How to find seafarers needing C1/D visa',
  content:'Go to Visa page. Click the C1/D Required KPI card at the top — this filters the table to only show seafarers where C1/D is confirmed required or marked Need to Process in Zoho.',
  whereToFind:'Visa page → C1/D Required KPI card (red)',
  relatedTerms:'C1/D Visa, Visa Required, Onboarding Status' },

{ type:'Filter Guide', portal:'Cruise Line', title:'How to filter seafarers by Cruise Line',
  content:'All pages have a Cruise Line filter in the global filter bar at the top. It is a multi-select dropdown — you can select multiple cruise lines at once. The filter applies to the entire page including KPIs and charts.',
  whereToFind:'Any Cruise page → Filter Bar → Cruise Line dropdown (first filter)',
  relatedTerms:'Global Filter, Cunard Line, P&O Cruises, CUK Maritime' },

{ type:'Filter Guide', portal:'Cruise Line', title:'How to filter Deployment by month and year',
  content:'On the Deployment page, use the Month dropdown and Year dropdown in the filter bar. The Countdown dropdown filters by days until sign-on: less than or equal to 7, 15, 30, 60, 90 days, or greater than 90 days.',
  whereToFind:'Deployment page → Filter Bar → Month dropdown + Year dropdown + Countdown dropdown',
  relatedTerms:'Deployment, Sign On Date, Countdown' },

{ type:'Filter Guide', portal:'Cruise Line', title:'How to find seafarers Have Assignment but Not Ready',
  content:'On the Seafarer page, click the Have Assignment Not Ready KPI card or tab. Shows seafarers who have a future sign-on date but Onboarding Status is Rescheduled or Completing Documents.',
  whereToFind:'Seafarer page → Have Assignment Not Ready KPI card (amber)',
  relatedTerms:'Onboarding Status, Completing Documents, Rescheduled, Seafarer' },

{ type:'Filter Guide', portal:'Cruise Line', title:'How to use KPI cards as filters on Visa page',
  content:'On the Visa page, clicking any KPI card filters the table below. Click Total Visa Required to reset. Click C1/D Required to see only those needing C1/D. Click Total Have Assignment to see seafarers with a sign-on date.',
  whereToFind:'Visa page → KPI card row → click to filter, click again or Total to reset',
  relatedTerms:'Visa Required, C1/D, MCV, OKTB, NZeTA, ATV, Schengen' },

{ type:'Filter Guide', portal:'Cruise Line', title:'How to drill down on Requisition charts',
  content:'On the Requisition page, right-click any bar on either chart (Headcount by Cruise Line or by Department) to open a floating drill-down panel showing detailed positions for that cruise line or department.',
  whereToFind:'Requisition page → right-click any bar on the charts',
  relatedTerms:'Requisition, Cruise Line, Department, Drill-down' },

// CRUISE LINE — DATA SOURCES
{ type:'Data Source', portal:'Cruise Line', title:'Seafarer data source',
  content:'All seafarer data comes from Zoho Recruit Candidates module. Resigned seafarers are automatically excluded. Data refreshes every 30 minutes via the cron schedule.',
  whereToFind:'Seafarer page. Refresh button in topbar forces immediate refresh.',
  relatedTerms:'Zoho Recruit, Candidates, CTI Indonesia' },

{ type:'Data Source', portal:'Cruise Line', title:'Deployment data source',
  content:'Deployment page data comes from a Zoho Sheet called Cruise Line Deployment Report, tab: Deployment. Contains 9,000+ historical deployment records. Updates are reflected after the 15-minute cache cycle.',
  whereToFind:'Deployment page → Live badge shows Zoho Sheet connection',
  relatedTerms:'Zoho Sheet, Deployment, CTI Office Analytics, Employment Status' },

{ type:'Data Source', portal:'Cruise Line', title:'Requisition / Job Openings data source',
  content:'Open positions come from Zoho Recruit Job Openings module, filtered to Cruise-related positions. Right-click chart bars to see detailed breakdown.',
  whereToFind:'Requisition page → Live badge. Charts: Headcount by Cruise Line and by Department.',
  relatedTerms:'Zoho Recruit, Job Openings, Cruise Line, Department' },

{ type:'Data Source', portal:'Cruise Line', title:'Final Interview data source',
  content:'Final Interview candidates come from the CUK Final Interview Zoho Sheet, two tabs. Only shows rows where Final Interview Status = Approved, Offer Letter Status = Completed, and Move to Processing Stage is blank.',
  whereToFind:'Final Interview page in Cruise Portal',
  relatedTerms:'CUK Maritime, Cunard Line, Zoho Sheet, Final Interview' },

{ type:'Data Source', portal:'Cruise Line', title:'CUK Weekly Report',
  content:'PDF reports for Cunard, P&O, and CUK Maritime generated from live Zoho data. Download requires a password. Can download individual brand or all 3 at once.',
  whereToFind:'Report page → CUK Weekly Report tab → Download This Brand or Download All Brands',
  relatedTerms:'PDF, Cunard Line, P&O Cruises, CUK Maritime, Password' },

// CRUISE LINE — BUSINESS RULES
{ type:'Business Rule', portal:'Cruise Line', title:'C1/D Visa requirement rules',
  content:'C1/D is required for: (1) All Cunard Line crew regardless of ship. (2) All CUK Maritime crew. (3) P&O ships: Ventura, Aurora, Arcadia. Ships where NOT required: Arvia, Azura, Britannia, Iona.',
  whereToFind:'Visa page → C1/D Required KPI. Visa Required column shows C1/D badge automatically.',
  relatedTerms:'C1/D Visa, Cunard Line, CUK Maritime, Ventura, Aurora, Arcadia' },

{ type:'Business Rule', portal:'Cruise Line', title:'OKTB port requirement rules',
  content:'OKTB is required at these sign-on ports: Singapore, Hong Kong, Yokohama, Bridgetown, Cape Town, Montevideo, Callao, Montego Bay, Kotor, St. Lucia, Malta, Valletta. Malta and Valletta can substitute OKTB for Schengen per CTI policy.',
  whereToFind:'Visa page → OKTB Required KPI card. Sign On Port column shows the port.',
  relatedTerms:'OKTB, Sign On Port, Malta, Singapore, Hong Kong' },

{ type:'Business Rule', portal:'Cruise Line', title:'Visa page data scope',
  content:'The Visa page only shows CTI Indonesia seafarers and excludes Resigned and Report to Ship statuses. This focuses visa tracking on upcoming deployments only.',
  whereToFind:'Visa page → page sub-title confirms: CTI Indonesia, excludes Resigned and Report to Ship',
  relatedTerms:'CTI Indonesia, Resigned, Report to Ship, Visa' },

{ type:'Business Rule', portal:'Cruise Line', title:'Attachment page data scope',
  content:'The Attachment page only shows CTI Indonesia seafarers (excludes Report to Ship status). The Send Form button emails the attachment form link directly to the seafarers email address. Last Sent column records date and time.',
  whereToFind:'Seafarer → Attachment menu item',
  relatedTerms:'CTI Indonesia, Send Form, Documents, Attachment' },

{ type:'Business Rule', portal:'Cruise Line', title:'NZeTA ship requirement rules',
  content:'NZeTA is required for crew joining: Queen Anne, Queen Mary 2 (QM2), Queen Elizabeth (QE), Arcadia. Auckland port is handled directly by CUK Onboarding — no crew action required for Auckland.',
  whereToFind:'Visa page → NZeTA Required KPI card. Joining Ship column shows vessel.',
  relatedTerms:'NZeTA, Queen Anne, Queen Mary 2, Arcadia, Auckland' },

// CRUISE LINE — CALCULATIONS
{ type:'Calculation', portal:'Cruise Line', title:'YoY deployment comparison',
  content:'The vs Last Year KPI compares current year (Jan to current month) vs the SAME period last year. In May 2026 it compares Jan-May 2026 vs Jan-May 2025 — NOT vs all 12 months of 2025. Clicking the card shows both years in charts side by side.',
  whereToFind:'Deployment page → vs [Last Year] KPI card.',
  relatedTerms:'YoY, Deployment, KPI, Comparison' },

{ type:'Calculation', portal:'Cruise Line', title:'MoM deployment comparison',
  content:'The vs Last Month KPI compares the current month count vs the previous calendar month. Clicking filters charts to show both months side by side.',
  whereToFind:'Deployment page → vs [Last Month] KPI card.',
  relatedTerms:'MoM, Deployment, KPI, Comparison' },

{ type:'Calculation', portal:'Cruise Line', title:'Countdown / Days Remaining',
  content:'Days remaining = Sign On Date minus today at midnight. Badge colors: red = 7 days or less (urgent), amber = 8-30 days (soon), green = 30+ days.',
  whereToFind:'Seafarer page → Countdown column. Visa page → Countdown column. Deployment → Countdown filter.',
  relatedTerms:'Sign On Date, Days Left, Countdown, Urgent' },

{ type:'Calculation', portal:'Cruise Line', title:'Visa Required column logic',
  content:'Shows badges only for CONFIRMED requirements. C1/D: if ship or cruise line matches the rule. MCV: if cruise line is Cunard/P&O/CUK. OKTB: if sign-on port is in OKTB list. NZeTA: if ship is QA/QM2/QE/Arcadia. Schengen: if port is in Schengen list or Zoho Other Visa = NTP. Uncertain cases are not shown.',
  whereToFind:'Visa page → Visa Required column. Click detail button for full breakdown.',
  relatedTerms:'Visa Required, C1/D, MCV, OKTB, NZeTA, Schengen' },

// CRUISE LINE — FAQ
{ type:'FAQ', portal:'Cruise Line', title:'Why dont I see all seafarers on the Visa page?',
  content:'The Visa page only shows CTI Indonesia seafarers and excludes Resigned and Report to Ship statuses. Check the Seafarer page for a complete view of all active seafarers.',
  whereToFind:'Seafarer page shows all active seafarers. Visa page subtitle confirms scope.',
  relatedTerms:'CTI Indonesia, Resigned, Report to Ship, Visa page' },

{ type:'FAQ', portal:'Cruise Line', title:'How do I find seafarers signing on at Singapore?',
  content:'Go to Visa page and click the OKTB Required KPI card — Singapore is an OKTB port. Alternatively use the Sign On Port column text filter and type Singapore.',
  whereToFind:'Visa page → OKTB Required KPI card, or Sign On Port text filter',
  relatedTerms:'OKTB, Singapore, Sign On Port, Visa' },

{ type:'FAQ', portal:'Cruise Line', title:'What is the difference between Deployment and Seafarer page?',
  content:'Seafarer page shows CURRENT active seafarers from Zoho Recruit (live status). Deployment page shows HISTORICAL records from Zoho Sheet — every deployment ever. Use Seafarer for current status, Deployment for trends and analytics.',
  whereToFind:'Seafarer page for current. Deployment page for history and charts.',
  relatedTerms:'Deployment, Seafarer, Zoho Recruit, Zoho Sheet, Historical' },

{ type:'FAQ', portal:'Cruise Line', title:'Why does Visa Required column not show all visas?',
  content:'Only CONFIRMED requirements are shown to avoid confusion. Unknown or uncertain cases are left blank. Click the magnifier detail button on any row to see the full visa analysis including uncertain items.',
  whereToFind:'Visa page → click magnifier icon on any row for full detail panel.',
  relatedTerms:'Visa Required, Business Rule, Detail Panel' },

// ═══════════════════════════════════════════════════════════
// J1 PROGRAM — DEFINITIONS
// ═══════════════════════════════════════════════════════════
{ type:'Definition', portal:'J1 Program', title:'USA Onboard',
  content:'J1 participant status meaning the participant is currently in the United States and actively working at their host company.',
  whereToFind:'Participant page → USA Onboard tab. Return Home → All In-Country includes these.',
  relatedTerms:'J1 Status, Host Company, Program Completed' },

{ type:'Definition', portal:'J1 Program', title:'Program Completed',
  content:'J1 participant status meaning the participant has finished their J1 program and returned home. Included in Total Placement KPI along with USA Onboard.',
  whereToFind:'Participant page → Program Completed tab.',
  relatedTerms:'J1 Status, Total Placement, USA Onboard' },

{ type:'Definition', portal:'J1 Program', title:'Visa Appointment',
  content:'J1 participant status meaning a US visa appointment is scheduled but not yet approved.',
  whereToFind:'Participant page → Visa Appointment tab. Visa page tracks appointment details.',
  relatedTerms:'J1 Status, Visa Journey, DS-2019' },

{ type:'Definition', portal:'J1 Program', title:'Consultation Call',
  content:'J1 status indicating the participant is at the consultation call stage — an initial screening with CTI staff to assess fit.',
  whereToFind:'Talent Pool page → Consultation Call tab.',
  relatedTerms:'J1 Status, Talent Pool, New Submission' },

{ type:'Definition', portal:'J1 Program', title:'Withdrawal',
  content:'J1 status for participants who withdrew voluntarily. These are EXCLUDED from the main Participant page by default.',
  whereToFind:'Excluded from Participant page. Withdrawal, Archived, and Unqualified are hidden.',
  relatedTerms:'J1 Status, Archived, Unqualified, Excluded' },

{ type:'Definition', portal:'J1 Program', title:'Sponsor (J1)',
  content:'The authorized J1 program sponsor organization responsible for issuing the DS-2019 form and managing the cultural exchange program officially.',
  whereToFind:'Participant page → Sponsor filter (global filter bar) and column in table.',
  relatedTerms:'DS-2019, Host Company, J1 Program' },

{ type:'Definition', portal:'J1 Program', title:'Host Company',
  content:'The US employer where the J1 participant works during their exchange program. Provides the actual work experience and may also provide housing.',
  whereToFind:'Participant page → Hosting Company column. Housing page shows CTI vs host-provided housing.',
  relatedTerms:'Sponsor, Housing, J1 Program, USA Onboard' },

{ type:'Definition', portal:'J1 Program', title:'DS-2019',
  content:'Certificate of Eligibility for Exchange Visitor Status — the official document enabling a J1 participant to apply for their visa. Issued by the sponsor. The DS-2019 end date determines program end date.',
  whereToFind:'Participant detail panel → DS-2019 End field. Return Home uses this for countdown.',
  relatedTerms:'Sponsor, Visa Appointment, Program End Date' },

{ type:'Definition', portal:'J1 Program', title:'Talent Pool',
  content:'Participants in the pipeline but not yet placed — statuses include New Submission, Consultation Call, Sales Call, On Hold, and Accepted.',
  whereToFind:'Talent Pool page in J1 Portal sidebar.',
  relatedTerms:'New Submission, Consultation Call, Sales Call, Accepted, Participant' },

{ type:'Definition', portal:'J1 Program', title:'Visa Journey',
  content:'The Visa Journey column shows the complete attempt history for a participants US visa: Pending, Rejected 1st Attempt, Pending 2nd Interview, Rejected 2nd, etc. Gives a quick visual of how many times they attempted.',
  whereToFind:'Visa page → Visa Journey column (first column, widest).',
  relatedTerms:'Visa Appointment, J1 Status, Rejected 1st Attempt' },

{ type:'Definition', portal:'J1 Program', title:'J1 Source',
  content:'How the participant was sourced — the recruitment channel or method through which CTI found the participant.',
  whereToFind:'Participant page → J1 Source filter in global filter bar and column in table.',
  relatedTerms:'Participant, Talent Pool, Host Company' },

// J1 PROGRAM — FILTER GUIDES
{ type:'Filter Guide', portal:'J1 Program', title:'How to find participants returning within 7 days',
  content:'Go to Return Home page. Click the Return in 7 Days tab — filters to participants whose program end date is within 7 days. The count badge on the tab is shown in red.',
  whereToFind:'Return Home page → Return in 7 Days tab (red badge)',
  relatedTerms:'Return Home, Program End Date, Days Left, Urgent' },

{ type:'Filter Guide', portal:'J1 Program', title:'How to find participants without a return ticket',
  content:'Go to Return Home page. Click the Return Not Arranged tab — shows participants whose return flight status is NOT Issued. Filter by Return Ticket = No Ticket to narrow further.',
  whereToFind:'Return Home page → Return Not Arranged tab, or Return Ticket filter',
  relatedTerms:'Return Ticket, Return Home, Flight Status, Issued' },

{ type:'Filter Guide', portal:'J1 Program', title:'How to filter Participant page by sponsor',
  content:'On the Participant page, use the Sponsor filter in the global filter bar. Multi-select dropdown — combine with J1 Status, J1 Source, and Hosting Company filters.',
  whereToFind:'Participant page → Filter Bar → Sponsor dropdown',
  relatedTerms:'Sponsor, Participant, Global Filter' },

{ type:'Filter Guide', portal:'J1 Program', title:'How to use Return Home countdown filter',
  content:'On the Return Home page, use the Countdown dropdown: All, less than or equal to 7/15/30/60/90 days, or greater than 90 days. Works alongside the tab filter.',
  whereToFind:'Return Home page → Filter Bar → Countdown dropdown',
  relatedTerms:'Return Home, Days Left, Countdown, Program End Date' },

// J1 PROGRAM — DATA SOURCES
{ type:'Data Source', portal:'J1 Program', title:'J1 participant data source',
  content:'Participant data comes from two Zoho sources: Zoho Recruit (candidates/participants) and Zoho CRM (J1_Participants1 module). Portal combines both. Source badge on each row shows Recruit or CRM origin.',
  whereToFind:'Participant page → source badge per row.',
  relatedTerms:'Zoho Recruit, Zoho CRM, Participant, Data Refresh' },

{ type:'Data Source', portal:'J1 Program', title:'Return Home data source',
  content:'Return Home data comes from Zoho Recruit participants filtered to those with a future program end date. Only active in-program participants — those who already returned are excluded.',
  whereToFind:'Return Home page. Shows only participants with future program end date.',
  relatedTerms:'DS-2019, Program End Date, USA Onboard, Return Ticket' },

{ type:'Data Source', portal:'J1 Program', title:'Travel and flight data source',
  content:'Travel page shows flight booking data from Zoho Recruit. You can update ticket status (Requested, Booked, Issued) and push directly to Zoho from the detail panel.',
  whereToFind:'Travel page → Departure tab and Return tab.',
  relatedTerms:'Return Ticket, Flight, Departure, Zoho Recruit' },

// J1 PROGRAM — BUSINESS RULES
{ type:'Business Rule', portal:'J1 Program', title:'Statuses excluded from Participant page',
  content:'The Participant page excludes three statuses by default: Withdrawal (voluntarily left), Archived (admin archived), and Unqualified Participant (did not meet requirements). These records still exist in Zoho but are hidden to keep focus on active participants.',
  whereToFind:'Participant page excludes these by default.',
  relatedTerms:'Withdrawal, Archived, Unqualified, J1 Status' },

{ type:'Business Rule', portal:'J1 Program', title:'Total Placement KPI calculation',
  content:'Total Placement = USA Onboard + Program Completed. Represents all participants who have been successfully placed in the program — both currently active and those who finished.',
  whereToFind:'Participant page → Total Placement KPI card.',
  relatedTerms:'USA Onboard, Program Completed, KPI' },

{ type:'Business Rule', portal:'J1 Program', title:'Days Left color coding on Return Home',
  content:'Days Left badge colors: Red = 7 days or fewer (urgent). Amber = 8 to 30 days (monitor). Green = more than 30 days (sufficient time). Helps prioritize which participants need immediate return arrangements.',
  whereToFind:'Return Home page → Days Left column (first column).',
  relatedTerms:'Return Home, Days Left, Countdown, Urgent' },

// J1 PROGRAM — CALCULATIONS
{ type:'Calculation', portal:'J1 Program', title:'Days Left calculation',
  content:'Days Left = Program End Date (DS-2019 End) minus today at midnight. Only future program end dates are included on Return Home page.',
  whereToFind:'Return Home page → Days Left column.',
  relatedTerms:'Program End Date, DS-2019, Return Home, Countdown' },

// J1 PROGRAM — FAQ
{ type:'FAQ', portal:'J1 Program', title:'Where are withdrawn participants?',
  content:'Withdrawn, Archived, and Unqualified participants are excluded from the Participant page. They still exist in Zoho Recruit and can be accessed directly there. The exclusion keeps the portal focused on active participants.',
  whereToFind:'Zoho Recruit directly for withdrawn records. Not visible in J1 portal by design.',
  relatedTerms:'Withdrawal, Archived, Unqualified, Participant page' },

{ type:'FAQ', portal:'J1 Program', title:'Difference between Talent Pool and Participant page',
  content:'Talent Pool = pre-placement pipeline (New Submission, Consultation Call, Sales Call, On Hold, Accepted). Participant = placed participants actively in program or completed (Visa Appointment, Visa Approved, USA Onboard, Program Completed, etc.).',
  whereToFind:'Talent Pool page for pipeline. Participant page for placed participants.',
  relatedTerms:'Talent Pool, New Submission, USA Onboard, J1 Status' },

{ type:'FAQ', portal:'J1 Program', title:'How do I find participants needing a return ticket?',
  content:'Go to Return Home page and click the Return Not Arranged tab. Shows everyone whose return ticket status is not Issued. Filter Return Ticket = No Ticket for no ticket at all.',
  whereToFind:'Return Home page → Return Not Arranged tab',
  relatedTerms:'Return Ticket, Return Home, Issued, No Ticket' },

{ type:'FAQ', portal:'J1 Program', title:'How do I update a participants ticket status and push to Zoho?',
  content:'Go to Travel page. Find the participant in Departure or Return tab. Click their row to open the detail panel. Update ticket status (Requested, Booked, or Issued) and click Save to Zoho.',
  whereToFind:'Travel page → click row → detail panel → update status → Save to Zoho',
  relatedTerms:'Travel, Return Ticket, Zoho, Save, Update' },

// ═══════════════════════════════════════════════════════════
// BOTH PORTALS — FAQ
// ═══════════════════════════════════════════════════════════
{ type:'FAQ', portal:'Both', title:'How do I use the AI assistant?',
  content:'Click the sparkle star button in the bottom-right corner of any page. Type your question or click the microphone to speak. The AI knows all the data on screen plus the full knowledge base. Click the mic once to start — it auto-sends after you pause.',
  whereToFind:'Bottom-right corner → sparkle star button → opens chat panel',
  relatedTerms:'AI Assistant, Voice, Microphone, Chat' },

{ type:'FAQ', portal:'Both', title:'How often does data refresh?',
  content:'Data refreshes every 30 minutes automatically. Force an immediate refresh by clicking the circular refresh button in the top-right topbar. The Last Updated badge shows when data was last loaded.',
  whereToFind:'Top-right topbar → refresh button (circular arrows).',
  relatedTerms:'Refresh, Cache, Last Updated, Cron' },

{ type:'FAQ', portal:'Both', title:'How do I push updates to Zoho from the portal?',
  content:'On pages that support editing (Participant detail, Housing, Travel, Attachment), open the detail panel by clicking the detail or Details button. Edit the fields and click Save to Zoho — the change writes directly to Zoho Recruit or CRM.',
  whereToFind:'Any detail panel → edit fields → Save to Zoho button',
  relatedTerms:'Zoho, Save, Update, Edit, Push' },
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function saveEntry(entry) {
  entry.id = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ action: 'save', entry });
    const req = https.request({
      hostname: WORKER,
      path: '/api/knowledge',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function seed() {
  console.log('Seeding', entries.length, 'knowledge entries...');
  let ok = 0, fail = 0;
  for (let i = 0; i < entries.length; i++) {
    try {
      const res = await saveEntry(entries[i]);
      if (res.status === 200) { ok++; process.stdout.write('.'); }
      else { fail++; console.log('\nFAIL', entries[i].title, res.status); }
    } catch (err) { fail++; console.log('\nERR', entries[i].title, err.message); }
    await delay(150);
  }
  console.log('\n\nDone:', ok, 'saved,', fail, 'failed. Total:', entries.length);
}
seed();
