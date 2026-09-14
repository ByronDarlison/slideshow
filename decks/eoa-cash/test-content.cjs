const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const failures = [];

function fail(condition, message) {
  if (!condition) failures.push(message);
}

function plainText(fragment) {
  return fragment
    .replace(/<aside class="speaker-notes">[\s\S]*?<\/aside>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rarr;/g, '→')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split at the next slide, not nested section elements in the two-rhythm diagram.
const slides = [...html.matchAll(/<section class="slide[^"]*" id="slide-(\d+)"[\s\S]*?(?=<section class="slide|<\/main>|$)/g)];
fail(slides.length === 23, `expected 23 slides, found ${slides.length}`);

slides.forEach((match, index) => {
  const number = Number(match[1]);
  const section = match[0];
  const headings = [...section.matchAll(/<(?:h1|h2)\b[^>]*>([\s\S]*?)<\/(?:h1|h2)>/g)];
  const notes = section.match(/<aside class="speaker-notes">([\s\S]*?)<\/aside>/);
  fail(number === index + 1, `slide order breaks at ${number}`);
  fail(headings.length === 1, `slide ${number} must have one primary heading, found ${headings.length}`);
  fail(Boolean(notes), `slide ${number} has no speaker notes`);
  if (notes) {
    fail(/Target time:/.test(notes[1]), `slide ${number} has no target time`);
    fail(/\[Sources\][\s\S]*\[\/Sources\]/.test(notes[1]), `slide ${number} has no complete source block`);
  }
});

const requiredVisiblePhrases = [
  'For 20 years',
  'personal lines of credit and credit cards to make payroll',
  'In 2018 I adopted a business operating system',
  'Within 18 months, we had one year of operating expenses in cash.',
  'Two years later, I sold the company at a premium industry multiple.',
  'Adopting Metronomics transformed how we ran the company.',
  'One plan. Two review rhythms.',
  '36-month forecast',
  'Compare weekly actual with target.',
  'The sequence starts with countable activities (cash drivers)',
  'Average accounts receivable (AR) days',
  'Map How Your Key Functions Drive Cash',
  'Leads',
  'Handoffs:',
  'Sales-qualified leads · New business booked · Work ready to bill · Cash collected',
  'Each function manages a critical number that affects cash.',
  'Leads received that become sales-qualified (%)',
  'Deliveries accepted without defects or rework (%)',
  'Bad-debt rate (%)',
  'Read the method',
  'How Your Company Makes Money',
  'Each driver tells us the quantity and timing.',
  'Review weekly actual against target.',
  'Flag variances and take corrective action.',
  'Current result',
  'Immediate action brought average AR days from 42 back below target before month-end.',
  'Corrective action',
  'back in the green',
  'At month-end, update Rolling to see where cash is heading over the next 36 months.',
  'Average AR days improved',
  'Sales volume increased',
  '$80,000 ahead of forecast',
  'The system gives you time to manage future obligations before your bank balance forces the decision.',
  'Future cash is visible',
  'Manage future obligations',
  'Metronomics',
  '3HAG WAY',
  'The Metronome Effect',
  'Shannon Byrne Susko created Metronomics and wrote all three books.',
  'Take the presentation, articles, and working templates with you.',
  'Forecast tools',
  'Manage weekly',
  'Know where it’s heading. Act while you have choices.',
  'From reactive observer to proactive manager.',
  'Keep a rolling 36-month view.',
  'Questions?',
];

const visible = plainText(html);
for (const phrase of requiredVisiblePhrases) {
  fail(visible.includes(phrase), `missing required visible phrase: ${phrase}`);
}

const targetTimes = [...html.matchAll(/Target time: (\d+) minutes?(?: and (30) seconds)?[.,]/g)]
  .map((match) => Number(match[1]) + (match[2] ? 0.5 : 0));
const totalTargetMinutes = targetTimes.reduce((sum, minutes) => sum + minutes, 0);
fail(targetTimes.length === 23, `expected 23 target times, found ${targetTimes.length}`);
fail(totalTargetMinutes === 55, `speaker targets must total 55 minutes, found ${totalTargetMinutes}`);

fail(!/Sean Evans/.test(html), 'Sean Evans must not appear in the active deck or speaker notes');
fail(!/class="ask-line/.test(html), 'active deck must not contain audience ask lines');
fail(!/class="(?:support-line|target-caption)/.test(html), 'active deck must not contain bottom-line support footers');
fail(!/<footer class="slide-footer"/.test(html), 'active deck must not contain slide footers');
for (const unsupportedChoice of ['Accelerate', 'Sequence', 'Arrange financing']) {
  fail(!visible.includes(unsupportedChoice), `slide 16 must not introduce the unsupported choice label: ${unsupportedChoice}`);
}
fail(!/(?:Ask:|Expected answer:|Invite two short responses)/.test(html), 'active speaker notes must not contain audience-response prompts');
const textAt = n => plainText(slides[n - 1]?.[0] || '');
fail(textAt(9).includes('Actuals to date + remaining Plan'), 'forecast must explain the Rolling calculation');
fail(textAt(11).includes('Compare financial Actual with Plan.'), 'model must name monthly comparison');
fail(textAt(11).includes('Follow up until resolved.'), 'weekly response must continue until resolved');
fail(/Immediate action/.test(textAt(15)) && /before month-end/.test(textAt(15)), 'weekly action must correct the driver before month-end');
fail(!/\b(?:Plan|Actual|Rolling)\b/.test(textAt(15)), 'weekly correction must not become monthly Rolling review');
fail(/Plan/.test(textAt(16)) && /Actual/.test(textAt(16)) && /Rolling/.test(textAt(16)), 'monthly review must include Plan, Actual, Rolling');
fail(html.includes("[15, 'Monthly']"), 'Monthly sidebar must begin at slide 16');
fail(html.includes("[18, 'Action']"), 'Action sidebar must begin at slide 19');
fail(textAt(20).includes('cash surplus') && textAt(20).includes('2022'), 'closing story must preserve approved cash-surplus wording and 2022');
fail(textAt(18).includes('Continue with the planned hiring and capital expenditures.'), 'decision must use owner wording');
fail(!textAt(18).includes('The team needed no additional correction.'), 'removed decision sentence must stay removed');
fail(textAt(20).includes('For 20 years') && !textAt(20).includes('2009'), 'closing must match the opening time frame');
const flow = slides[5]?.[0] || '';
const handoffs = [...flow.matchAll(/<div class="kffm-handoff"><small>([^<]+)<\/small>/g)].map(m => m[1]);
fail(JSON.stringify(handoffs) === JSON.stringify(['Sales-qualified leads','New business booked','Work ready to bill','Cash collected']), 'handoffs must match the approved flow map');
fail(flow.includes('href="https://www.darlison.com/how-your-company-makes-money/"'), 'flow map must link to explanatory article');
fail(flow.includes('class="teaching-resource"'), 'flow-map QR must use shared teaching-resource style');
fail(!visible.includes('Sign-in required'), 'removed sign-in labels must stay removed');
fail(!visible.includes('illustrative'), 'example provenance belongs in notes only');
for (const n of [1,22]) fail((slides[n-1][0].match(/class="cash-step"/g) || []).length === 4 || /<ol/.test(slides[n-1][0]), 'bookends must preserve ordered four-part model');
for (const m of html.matchAll(/<a\b([^>]*href="https?:[^"]+"[^>]*)>/g)) {
  fail(/target="_blank"/.test(m[1]), 'external links must open in a new tab');
  fail(/rel="[^"]*noopener/.test(m[1]), 'new tabs need noopener protection');
}

const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
// Keep the quarterly plan and weekly scoreboard numerically reconciled.
const tableRows = number => [...(slides[number - 1][0].match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '').matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
const planRows = tableRows(10), actualRows = tableRows(12);
fail(planRows.length === 4 && actualRows.length === 4, 'both boards must retain all four functions');
const planned = [
  [15,20,20,20,25,25,25,20,20,20,20,15,15],
  [40,45,55,60,65,65,60,55,50,45,40,35,35],
  Array(13).fill('≥95'), Array(13).fill('≤35'),
];
const actual = [[22,18,16,15],[49,38,37,36],[93,96,95,97],[42,39,36,34]];
for (let row = 0; row < 4; row++) {
  const targets = [...(planRows[row] || '').matchAll(/class="score-target">([^<]+)<\/span>/g)].map(m => m[1]);
  fail(JSON.stringify(targets) === JSON.stringify(planned[row].map(String)), `quarterly target row ${row + 1} changed`);
  const weeklyTargets = [...(actualRows[row] || '').matchAll(/<small>Target<\/small>([^<]+)<\/span>/g)].map(m => m[1]);
  fail(JSON.stringify(weeklyTargets) === JSON.stringify(targets.slice(-4)), `weekly targets do not match the plan for row ${row + 1}`);
  const results = [...(actualRows[row] || '').matchAll(/class="score-result score-([a-z]+)"[^>]*>([^<]+)<\/span>/g)];
  fail(JSON.stringify(results.map(m => Number(m[2]))) === JSON.stringify(actual[row]), `weekly results changed for row ${row + 1}`);
  results.forEach((m, week) => {
    const value = Number(m[2]), target = Number(weeklyTargets[week]?.replace(/[≥≤]/g,''));
    const expected = row === 3 ? (value <= 35 ? 'green' : value <= 40 ? 'yellow' : 'red')
      : row === 2 ? (value >= 95 ? 'green' : value >= 90 ? 'yellow' : 'red')
      : value >= target ? 'green' : value >= target * (row === 0 ? .75 : .8) ? 'yellow' : 'red';
    fail(m[1] === expected, `incorrect traffic-light colour, row ${row + 1}, displayed week ${4 - week}`);
  });
}
fail(planned[0].reduce((a,b) => a+b,0) === 260 && planned[1].reduce((a,b) => a+b,0) === 650, 'quarterly totals must equal 260 leads and $650,000');
for (const source of imageSources) {
  fail(!/^https?:/i.test(source), `image must be local: ${source}`);
  fail(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(source) || fs.existsSync(path.join(__dirname, source)), `local image does not exist: ${source}`);
}

const fontSources = [...html.matchAll(/url\("([^"\)]+\.woff2)"\)/g)].map((match) => match[1]);
fail(fontSources.length === 2, `expected two local WOFF2 fonts, found ${fontSources.length}`);
for (const source of fontSources) {
  fail(!/^https?:/i.test(source), `font must be local: ${source}`);
  fail(fs.existsSync(path.join(__dirname, source)), `local font does not exist: ${source}`);
}
fail(!/fonts\.(?:googleapis|gstatic)\.com/i.test(html), 'presentation must not depend on Google Fonts');

fail(/id="slideSidebar"/.test(html), 'sidebar is missing');
fail(/id="sidebarToggle"/.test(html), 'collapsible sidebar control is missing');
fail(/id="fullscreenButton"/.test(html), 'visible full-screen control is missing');
fail(/id="fullscreenLabel">Full screen</.test(html), 'full-screen control must have a visible label');
fail(/requestFullscreen/.test(html) && /exitFullscreen/.test(html), 'full-screen entry and exit behavior is missing');
fail(/fullscreenchange/.test(html), 'full-screen control state must follow the browser');
fail(/@media \(max-width: 1180px\)/.test(html), 'responsive sidebar breakpoint is missing');

if (failures.length) {
  console.error('FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: 23 slides, one primary heading each, complete notes and sources, required distinctions, local assets, responsive sidebar, visible full-screen control, and ${totalTargetMinutes} minutes of planned delivery`);
