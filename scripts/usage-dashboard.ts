import { createServer, type ServerResponse } from 'node:http';
import { Client } from 'pg';
import {
  AI_FEATURES,
  aggregateAttempts,
  displaySubject,
  parseOptionalCap,
  subjectLabels,
  utcPeriods,
  type UsageAttemptRow,
  type UsageSummary,
} from './usage-dashboard-data';

const HOST = '127.0.0.1';
const PORT = 3199;

function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  let url: URL;
  try {
    url = new URL(raw || 'invalid:');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    process.env.COMMAND_OPERATIONS_TARGET !== `${url.hostname}${url.pathname}`
  )
    throw new Error(
      'Set COMMAND_OPERATIONS_TARGET to the verified database hostname/database before starting the usage dashboard.',
    );
  return raw as string;
}

type DashboardRows = {
  attempts: UsageAttemptRow[];
  buckets: Array<{ id: string; value: bigint | string | number }>;
  controls: Array<{ id: string; enabled: boolean }>;
};

async function readDashboardRows(connectionString: string, now: Date): Promise<DashboardRows> {
  const periods = utcPeriods(now);
  const client = new Client({ connectionString, connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const attempts = await client.query<UsageAttemptRow>(
      'SELECT "subject", "feature", "status", "reservedMicros", "usage", "createdAt" FROM "AiAttempt" WHERE "createdAt" >= $1',
      [periods.monthStart],
    );
    const buckets = await client.query<{ id: string; value: string }>(
      'SELECT "id", "value" FROM "AiBucket" WHERE "id" = ANY($1::text[])',
      [[`global:${periods.day}`, `global:${periods.month}`]],
    );
    const controls = await client.query<{ id: string; enabled: boolean }>(
      'SELECT "id", "enabled" FROM "AiControl" WHERE "id" = ANY($1::text[])',
      [['all', 'chat', 'syllabus']],
    );
    await client.query('COMMIT');
    return { attempts: attempts.rows, buckets: buckets.rows, controls: controls.rows };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original read failure without logging connection details.
    }
    throw error;
  } finally {
    await client.end();
  }
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function usd(micros: bigint) {
  const dollars = micros / BigInt(1_000_000);
  const fraction = (micros % BigInt(1_000_000)).toString().padStart(6, '0');
  return `$${dollars}.${fraction}`;
}

function statuses(summary: UsageSummary) {
  const preferred = ['RESERVED', 'FINISHED', 'UNCERTAIN'];
  const found = new Set(AI_FEATURES.flatMap((feature) => Object.keys(summary.counts[feature])));
  return [
    ...preferred.filter((status) => found.delete(status)),
    ...[...found].sort((a, b) => a.localeCompare(b)),
  ];
}

function summaryTable(title: string, summary: UsageSummary, labels: Map<string, string>) {
  const states = statuses(summary);
  const countHeaders = AI_FEATURES.flatMap((feature) =>
    states.map((status) => `<th>${escapeHtml(feature)} ${escapeHtml(status.toLowerCase())}</th>`),
  ).join('');
  const totalCells = AI_FEATURES.flatMap((feature) =>
    states.map((status) => `<td>${summary.counts[feature][status] || 0}</td>`),
  ).join('');
  const subjectRows = summary.subjects
    .map((subject) => {
      const cells = AI_FEATURES.flatMap((feature) =>
        states.map((status) => `<td>${subject.counts[feature][status] || 0}</td>`),
      ).join('');
      const note = subject.incompletelyPricedAttempts
        ? ` <span title="Attempts without complete recorded usage/pricing">(partial: ${subject.incompletelyPricedAttempts})</span>`
        : '';
      return `<tr><th>${escapeHtml(displaySubject(subject.subject, labels))}</th>${cells}<td>${usd(subject.estimatedMicros)}${note}</td></tr>`;
    })
    .join('');
  const pricingNote = summary.incompletelyPricedAttempts
    ? `${summary.incompletelyPricedAttempts} attempt(s) lack complete matching recorded usage/pricing; estimates are partial.`
    : 'All attempts in this period have complete matching recorded usage/pricing.';
  return `<section>
    <h2>${escapeHtml(title)}</h2>
    <div class="cards"><div><strong>${summary.attempts}</strong><span>attempts</span></div><div><strong>${usd(summary.estimatedMicros)}</strong><span>estimated recorded cost</span></div></div>
    <p class="note">${escapeHtml(pricingNote)}</p>
    <div class="table-wrap"><table><thead><tr><th>Scope</th>${countHeaders}<th>Estimated cost</th></tr></thead><tbody>
      <tr class="total"><th>Total</th>${totalCells}<td>${usd(summary.estimatedMicros)}</td></tr>
      ${subjectRows || `<tr><td colspan="${countHeaders ? AI_FEATURES.length * states.length + 2 : 2}">No attempts.</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function budgetCard(label: string, reserved: bigint, cap: ReturnType<typeof parseOptionalCap>) {
  const capText = cap.valid
    ? cap.value === null
      ? 'cap not provided'
      : `${usd(cap.value)} cap`
    : 'invalid cap setting';
  return `<div><strong>${usd(reserved)}</strong><span>${escapeHtml(label)} reserved / ${escapeHtml(capText)}</span></div>`;
}

function renderPage(rows: DashboardRows, now: Date) {
  const periods = utcPeriods(now);
  const labels = subjectLabels(
    process.env.COMMAND_AI_USAGE_SECRET,
    process.env.COMMAND_INVITED_WORKSPACES,
  );
  const month = aggregateAttempts(rows.attempts, periods.monthStart);
  const day = aggregateAttempts(rows.attempts, periods.dayStart);
  const buckets = new Map(rows.buckets.map((row) => [row.id, BigInt(row.value)]));
  const controls = new Map(rows.controls.map((row) => [row.id, row.enabled]));
  const control = (id: string) => {
    const exists = controls.has(id);
    const enabled = controls.get(id) === true;
    return `<div class="control ${enabled ? 'on' : 'off'}"><strong>${escapeHtml(id)}</strong><span>${exists ? (enabled ? 'enabled' : 'paused') : 'missing (paused)'}</span></div>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60"><title>Command AI usage</title><style>
    :root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#f5efe5;color:#26221d}body{max-width:1180px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:20px;align-items:end}h1{font-size:1.7rem;margin:0}h2{margin-top:34px;font-size:1.2rem}.muted,.note{color:#6c6258;font-size:.88rem}.cards,.controls{display:flex;flex-wrap:wrap;gap:12px;margin:14px 0}.cards>div,.control{background:#fffaf1;border:1px solid #ded2c2;border-radius:12px;padding:14px 16px;min-width:180px}.cards strong,.control strong{display:block;font-size:1.15rem}.cards span,.control span{display:block;margin-top:3px;color:#6c6258}.control.on{border-color:#71a37b}.control.off{border-color:#c99083}.table-wrap{overflow:auto;border:1px solid #ded2c2;border-radius:12px;background:#fffaf1}table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{padding:10px 12px;text-align:right;border-bottom:1px solid #e7ddcf;white-space:nowrap}th:first-child,td:first-child{text-align:left}thead th{background:#eee3d4}.total{font-weight:700}@media(prefers-color-scheme:dark){:root{background:#1b1916;color:#f2eadf}.cards>div,.control,.table-wrap{background:#25211d;border-color:#51483e}.cards span,.control span,.muted,.note{color:#bdb1a3}th,td{border-color:#443c34}thead th{background:#332d27}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  </style></head><body><header><div><h1>Command AI usage</h1><div class="muted">Local operator view / UTC / refreshes every 60 seconds</div></div><div class="muted">Updated ${escapeHtml(now.toISOString())}</div></header>
  <section><h2>Controls</h2><div class="controls">${['all', 'chat', 'syllabus'].map(control).join('')}</div></section>
  <section><h2>Conservative reservations</h2><div class="cards">${budgetCard('today', buckets.get(`global:${periods.day}`) || BigInt(0), parseOptionalCap(process.env.COMMAND_AI_DAILY_MICROS))}${budgetCard('this month', buckets.get(`global:${periods.month}`) || BigInt(0), parseOptionalCap(process.env.COMMAND_AI_MONTHLY_MICROS))}</div><p class="note">Reservations are no-refund ceilings, not provider invoices. Estimated recorded cost uses each attempt's stored pricing snapshot and observed input/output tokens.</p></section>
  ${summaryTable(`Today / ${periods.day} UTC`, day, labels)}
  ${summaryTable(`Month / ${periods.month} UTC`, month, labels)}
  </body></html>`;
}

function headers(
  response: ServerResponse,
  status: number,
  contentType = 'text/html; charset=utf-8',
) {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });
}

const connectionString = databaseUrl();
const server = createServer(async (request, response) => {
  if (request.socket.localAddress !== HOST || request.socket.remoteAddress !== HOST) {
    headers(response, 403, 'text/plain; charset=utf-8');
    response.end('Loopback access only.');
    return;
  }
  if (request.method !== 'GET' || (request.url !== '/' && request.url !== '/favicon.ico')) {
    headers(response, 404, 'text/plain; charset=utf-8');
    response.end('Not found.');
    return;
  }
  if (request.url === '/favicon.ico') {
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return;
  }
  try {
    const now = new Date();
    const rows = await readDashboardRows(connectionString, now);
    headers(response, 200);
    response.end(renderPage(rows, now));
  } catch {
    console.error('Usage dashboard query failed. No connection details were logged.');
    headers(response, 500, 'text/plain; charset=utf-8');
    response.end(
      'Usage dashboard query failed. Check the local terminal and database availability.',
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Command AI usage dashboard: http://${HOST}:${PORT}`);
});
