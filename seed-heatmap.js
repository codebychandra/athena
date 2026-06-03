// Heat Map Report knowledge seeder — node seed-heatmap.js
'use strict';
const https = require('https');
const WORKER = 'cti-athena.cti-athena.workers.dev';

const entries = [
{ type:'Definition', portal:'Cruise Line', title:'CUK Heat Map Report',
  content:'A quarterly performance scorecard CTI Group produces for Carnival UK (CUK). It rates CTI across 9 parameters using a RAG (Red/Amber/Green) system. Each parameter has a person-in-charge, an explanation, and Red/Amber/Green thresholds. Page 2 gives the Executive Summary with success rate, CTI remarks, and Quarter-on-Quarter (QoQ) change vs the previous quarter.',
  whereToFind:'Quarterly PDF: CTI Group Heat Map Report. Q1 2026 covers Dec 2025 - Feb 2026.',
  relatedTitles:'RAG, QoQ Change, Demand Delivery, Attrition' },

{ type:'Definition', portal:'Cruise Line', title:'RAG (Red Amber Green)',
  content:'The colour-coding system used in the Heat Map Report. Red = below target / problem requiring action. Amber = borderline / needs monitoring. Green = meeting or exceeding target. Each of the 9 parameters has its own RAG thresholds.',
  whereToFind:'Heat Map Report page 1 — RED/AMBER/GREEN columns per parameter.',
  relatedTitles:'CUK Heat Map Report' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Supplier Relationship Management RAG',
  content:'Measured from FPO team feedback. RED: lack of engagement / unwillingness to partner on issues. AMBER: repeat feedback on the same subject or not rectified in a timely manner. GREEN: strong working relationship across all teams. PIC: Robert Upchurch, Jordan Eliades.',
  whereToFind:'Heat Map Report page 1, row 1.', relatedTitles:'RAG' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Monthly Audit RAG',
  content:'Meetings to discuss areas requiring focused support. RED: Met. AMBER: N/A. GREEN: Not Met. PIC: Robert Upchurch, Jordan Eliades, Marcos Xavier, Jasmine Debora.',
  whereToFind:'Heat Map Report page 1, row 2.', relatedTitles:'RAG' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Annual Audit RAG',
  content:'Compliance Department annual MLC audit. RED: MLC audit failure due to non-conformity not rectified within the agreed 30-day timeframe. AMBER: MLC nonconformity currently being rectified. GREEN: no nonconformities, or all addressed and audit complete with no outstanding actions. PIC: Galang Surya.',
  whereToFind:'Heat Map Report page 1, row 3.', relatedTitles:'RAG, MLC' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Monthly Invoice RAG',
  content:'RED: more than 2 months submitting erroneous invoices. AMBER: a month of submitting erroneous invoices. GREEN: no errors on monthly invoices. PIC: Jordan Eliades, Harold Danier, Agus Yudana.',
  whereToFind:'Heat Map Report page 1, row 4.', relatedTitles:'RAG' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Demand Delivery RAG',
  content:'Monthly demand vs monthly hired. RED: below 90% met. AMBER: 90-95%, or more than 110% of demand issued (over-supply). GREEN: 95-100%. PIC: Herry Wahyudi.',
  whereToFind:'Heat Map Report page 1, row 5.', relatedTitles:'RAG, Demand Delivery' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Attrition (Rolling Turnover) RAG',
  content:'% rolling turnover (quarterly) and % attrition vs overall establishment. RED: over 5% attrition against overall establishment. AMBER: 3-5% of establishment, OR rolling-turnover change of more than 1.5% increase over the quarter (flag to investigate). GREEN: less than 3% of overall establishment. PIC: Marcos Xavier, Jasmine Debora.',
  whereToFind:'Heat Map Report page 1, row 6.', relatedTitles:'Attrition, RAG' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — New Hires vs Re-Joiners RAG',
  content:'% of seafarers on their second-plus contract (re-joiners). RED: below 85%. AMBER: 85-90%. GREEN: above 90%. PIC: Marcos Xavier, Jasmine Debora.',
  whereToFind:'Heat Map Report page 1, row 7.', relatedTitles:'New Hire, Repeater, Re Hire' },

{ type:'Business Rule', portal:'Cruise Line', title:'Heat Map — Absconders RAG',
  content:'Number of seafarers who absconded in the month. RED: absconders (count called out per month). AMBER: N/A. GREEN: no absconders. PIC: Galang Surya.',
  whereToFind:'Heat Map Report page 1, row 8.', relatedTitles:'RAG' },

{ type:'Calculation', portal:'Cruise Line', title:'Heat Map — Attrition rate calculation',
  content:'Attrition = resignations during the quarter ÷ total establishment (active seafarers as of that period). Counted from the recorded resignation date. Example Q1 2026: 77 resignations ÷ 3,032 active seafarers = 2.54%.',
  whereToFind:'Heat Map Report page 4, Attrition section.', relatedTitles:'Attrition, Heat Map — Attrition RAG' },

{ type:'Calculation', portal:'Cruise Line', title:'Heat Map — QoQ Change formula',
  content:'Quarter-on-Quarter Change (%) shows the relative change of a metric vs the previous quarter. Formula: QoQ Change (%) = ((Current Quarter − Previous Quarter) ÷ Previous Quarter) × 100.',
  whereToFind:'Heat Map Report page 2 footnote.', relatedTitles:'CUK Heat Map Report' },

{ type:'Example', portal:'Cruise Line', title:'Heat Map Q1 2026 Results (Dec 2025-Feb 2026)',
  content:'Demand Delivery: RED — Demand 14/21 fulfilled (66.7%); Talent Pool 54/67 fulfilled (80.6%), 7 HOAS F&B in process, 2 remaining. Attrition: GREEN — 2.54% (77 resignations / 3,032 active; down from 112 last quarter). New Hires vs Re-Joiners: AMBER — 88% re-joiners (529 of 602 embarked; 73 new hires = 12%). Absconders: GREEN — 0 (down from 1). Monthly Invoice: GREEN — 100%, no discrepancies. Monthly/Annual Audit & Supplier Relationship: GREEN.',
  whereToFind:'Heat Map Report page 2 Executive Summary + pages 3-4 detail.', relatedTitles:'CUK Heat Map Report, Demand Delivery, Attrition' },

{ type:'Example', portal:'Cruise Line', title:'Heat Map Q1 2026 Waiting for Assignment',
  content:'New-hire seafarers pending their first assignment (compliance vs non-compliance): Cunard Line — compliance 52, non-compliance 109. P&O Cruises — compliance 162, non-compliance 192. CUK Maritime — compliance 3, non-compliance 18.',
  whereToFind:'Heat Map Report page 2, Waiting for Assignment row.', relatedTitles:'CUK Heat Map Report' },

{ type:'Example', portal:'Cruise Line', title:'Heat Map Q1 2026 Talent Pool requisitions',
  content:'67 total talent pool requisitions across brands: Cunard Line 26, CUK Maritime 16, P&O Cruises 25 (HOAS Food & Beverage). 54 fulfilled = 80.6% success rate. 7 HOAS F&B candidates in Mistral processing; 2 more needed to fully meet HOAS FB requirement.',
  whereToFind:'Heat Map Report page 3, Demand Overview.', relatedTitles:'Talent Pool, Demand Delivery' },

{ type:'FAQ', portal:'Cruise Line', title:'How does CTI report performance to Carnival UK?',
  content:'Through the quarterly CUK Heat Map Report — a RAG-rated scorecard across 9 parameters (Supplier Relationship, Monthly Audit, Annual Audit, Monthly Invoice, Demand Delivery, Attrition, New Hires vs Re-Joiners, Absconders, Waiting for Assignment) plus an Executive Summary with QoQ comparison.',
  whereToFind:'CUK Heat Map Report PDF, issued quarterly.', relatedTitles:'CUK Heat Map Report, RAG' },
];

function saveEntry(entry) {
  entry.id = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ action:'save', entry });
    const req = https.request({ hostname:WORKER, path:'/api/knowledge', method:'POST',
      headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) } },
      res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(res.statusCode)); });
    req.on('error', reject); req.write(body); req.end();
  });
}

(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  let ok=0, fail=0;
  for (const e of entries) {
    try { (await saveEntry(e))===200 ? (ok++, process.stdout.write('.')) : fail++; }
    catch { fail++; }
    await delay(150);
  }
  console.log('\nHeat Map knowledge: ' + ok + ' saved, ' + fail + ' failed of ' + entries.length);
})();
