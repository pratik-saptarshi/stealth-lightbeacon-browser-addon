import type { DiffResult, ScanSnapshot } from '../shared/types';

export type ReportFormat = 'json' | 'markdown' | 'html' | 'llm-markdown' | 'geo-xml';

export interface ExportBundle {
  generatedAt: string;
  snapshot: ScanSnapshot;
  diff?: DiffResult;
}

export function toJsonExport(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function toHtmlExport(bundle: ExportBundle): string {
  const timestamp = new Date(bundle.snapshot.timestamp).toISOString();
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const domainRows = Object.entries(bundle.snapshot.summary.byDomain)
    .filter(([, count]) => count > 0)
    .map(
      ([domain, count]) =>
        `<tr><td>${escapeHtml(domain)}</td><td>${count}</td><td>${renderDomainShare(
          count,
          bundle.snapshot.summary.total
        )}</td></tr>`
    )
    .join('\n');
  const issueRows = bundle.snapshot.issues
    .map(
      (issue) => `<tr>
  <td><span class="severity sev-${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span></td>
  <td>${escapeHtml(issue.domain)}</td>
  <td>${escapeHtml(issue.title)}</td>
  <td><code>${escapeHtml(issue.ruleId)}</code></td>
  <td>${escapeHtml(issue.summary)}</td>
  <td>${escapeHtml(issue.evidence)}</td>
</tr>`
    )
    .join('\n');

  const diffSection = bundle.diff
    ? `<section class="section">
    <h2>Diff</h2>
    <ul class="list">
      <li>New: ${bundle.diff.newIssues.length}</li>
      <li>Resolved: ${bundle.diff.resolvedIssues.length}</li>
      <li>Regressions: ${bundle.diff.regressions.length}</li>
      <li>Improvements: ${bundle.diff.improvements.length}</li>
    </ul>
  </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stealth Lightbeacon Executive Audit Report</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1020; --panel:rgba(255,255,255,0.06); --border:rgba(255,255,255,0.14); --text:#e8eefc; --muted:#9ba8c7; --accent:#77b7ff; --good:#4cd38a; --warn:#f4b860; --bad:#ff6b7a; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, "Segoe UI", system-ui, sans-serif; color:var(--text); background:linear-gradient(180deg,#090d17 0%,#0b1020 100%); }
    .shell { max-width:1200px; margin:0 auto; padding:24px 18px 40px; }
    .card { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:18px; margin-bottom:16px; }
    .eyebrow { margin:0 0 8px; text-transform:uppercase; letter-spacing:.12em; font-size:.78rem; color:var(--accent); font-weight:700; }
    h1,h2 { margin:0; line-height:1.2; }
    .muted { color:var(--muted); }
    .meta { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
    .chip { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:12px; padding:10px; }
    .chip span { color:var(--muted); font-size:.76rem; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:4px; }
    .score { font-size:2.2rem; font-weight:800; letter-spacing:-.04em; }
    .verdict { display:inline-block; border-radius:999px; padding:6px 11px; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
    .verdict.good { color:var(--good); border:1px solid rgba(76,211,138,.25); background:rgba(76,211,138,.1); }
    .verdict.warn { color:var(--warn); border:1px solid rgba(244,184,96,.25); background:rgba(244,184,96,.1); }
    .verdict.bad { color:var(--bad); border:1px solid rgba(255,107,122,.25); background:rgba(255,107,122,.1); }
    table { width:100%; border-collapse:collapse; table-layout:fixed; }
    th,td { padding:10px 12px; text-align:left; border-bottom:1px solid rgba(255,255,255,.1); vertical-align:top; overflow-wrap:anywhere; }
    th { text-transform:uppercase; letter-spacing:.08em; font-size:.72rem; color:var(--muted); background:rgba(255,255,255,.04); }
    .severity { display:inline-block; border-radius:999px; padding:4px 9px; font-size:.74rem; text-transform:uppercase; letter-spacing:.08em; font-weight:700; }
    .sev-critical { color:var(--bad); background:rgba(255,107,122,.1); border:1px solid rgba(255,107,122,.25); }
    .sev-high { color:var(--warn); background:rgba(244,184,96,.1); border:1px solid rgba(244,184,96,.25); }
    .sev-medium { color:#7db3ff; background:rgba(125,179,255,.1); border:1px solid rgba(125,179,255,.25); }
    .sev-low { color:var(--good); background:rgba(76,211,138,.1); border:1px solid rgba(76,211,138,.25); }
    .section { margin-top:12px; }
    .list { margin:10px 0 0; padding-left:20px; }
    @media (max-width: 900px) { .meta { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media print { body { background:#fff; color:#111; } .card,.chip { background:#fff; border-color:#333; } th,td { border-color:#555; color:#111; } .muted { color:#333; } }
  </style>
</head>
<body>
  <div class="shell">
    <section class="card">
      <p class="eyebrow">Executive Audit Report</p>
      <h1>Stealth Lightbeacon</h1>
      <p class="muted">Target URL: <code>${escapeHtml(bundle.snapshot.url)}</code></p>
      <div class="meta">
        <div class="chip"><span>Audit Score</span><strong>${score.toFixed(1)}/10</strong></div>
        <div class="chip"><span>Total Issues</span><strong>${bundle.snapshot.summary.total}</strong></div>
        <div class="chip"><span>Engine</span><strong>${escapeHtml(bundle.snapshot.engine)}</strong></div>
        <div class="chip"><span>Timestamp</span><strong>${escapeHtml(timestamp)}</strong></div>
      </div>
    </section>
    <section class="card">
      <h2>Executive Summary</h2>
      <p><span class="verdict ${verdict.css}">${verdict.label}</span></p>
      <p class="score">${score.toFixed(1)} <span class="muted">/ 10</span></p>
      <p class="muted">Critical: ${bundle.snapshot.summary.bySeverity.critical} | High: ${bundle.snapshot.summary.bySeverity.high} | Medium: ${bundle.snapshot.summary.bySeverity.medium} | Low: ${bundle.snapshot.summary.bySeverity.low}</p>
    </section>
    <section class="card section">
      <h2>Domain Distribution</h2>
      <table>
        <thead><tr><th>Domain</th><th>Issues</th><th>Share</th></tr></thead>
        <tbody>${domainRows || '<tr><td colspan="3">No issues detected.</td></tr>'}</tbody>
      </table>
    </section>
    <section class="card section">
      <h2>Issues</h2>
      <table>
        <thead><tr><th>Severity</th><th>Domain</th><th>Title</th><th>Rule</th><th>Summary</th><th>Evidence</th></tr></thead>
        <tbody>${issueRows || '<tr><td colspan="6">No issues detected.</td></tr>'}</tbody>
      </table>
    </section>
    ${diffSection}
  </div>
</body>
</html>`;
}

export function toLlmMarkdownExport(bundle: ExportBundle): string {
  const lines = [
    '# Audit Findings',
    `URL: ${bundle.snapshot.url}`,
    `Generated: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    '',
    '## Prioritized Issue List',
    ...bundle.snapshot.issues.flatMap((issue) => [
      `- (${issue.severity}) ${issue.title} — ${issue.summary}`,
      `  evidence: ${issue.evidence}`
    ]),
    ''
  ];

  if (bundle.diff) {
    lines.push('## Delta');
    lines.push(`new: ${bundle.diff.newIssues.length}`);
    lines.push(`resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`regressions: ${bundle.diff.regressions.length}`);
    lines.push(`improvements: ${bundle.diff.improvements.length}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function toGeoXmlExport(bundle: ExportBundle): string {
  const issues = bundle.snapshot.issues
    .map(
      (issue) => `    <issue id="${issue.id}" ruleId="${issue.ruleId}" severity="${issue.severity}" domain="${issue.domain}">
      <summary>${xmlEscape(issue.summary)}</summary>
      <evidence>${xmlEscape(issue.evidence)}</evidence>
    </issue>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<geoReport>
  <scan url="${xmlEscape(bundle.snapshot.url)}" engine="${bundle.snapshot.engine}" timestamp="${new Date(bundle.snapshot.timestamp).toISOString()}">
    <summary total="${bundle.snapshot.summary.total}" critical="${bundle.snapshot.summary.bySeverity.critical}" high="${bundle.snapshot.summary.bySeverity.high}" medium="${bundle.snapshot.summary.bySeverity.medium}" low="${bundle.snapshot.summary.bySeverity.low}" />
  </scan>
  <issues>
${issues}
  </issues>
</geoReport>`;
}

function xmlEscape(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildReport(bundle: ExportBundle, format: ReportFormat): string {
  switch (format) {
    case 'json':
      return toJsonExport(bundle);
    case 'html':
      return toHtmlExport(bundle);
    case 'llm-markdown':
      return toLlmMarkdownExport(bundle);
    case 'geo-xml':
      return toGeoXmlExport(bundle);
    default:
      return toMarkdownExport(bundle);
  }
}

export function toMarkdownExport(bundle: ExportBundle): string {
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const lines = [
    `# Stealth Lightbeacon Executive Audit Report`,
    '',
    `## Scan Export`,
    `- URL: ${bundle.snapshot.url}`,
    `- Origin: ${bundle.snapshot.origin}`,
    `- Engine: ${bundle.snapshot.engine}`,
    `- Timestamp: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    `- Score: ${score.toFixed(1)}/10`,
    `- Verdict: ${verdict.label}`,
    '',
    `## Executive Summary`,
    `- Total issues: ${bundle.snapshot.summary.total}`,
    `- Critical: ${bundle.snapshot.summary.bySeverity.critical}`,
    `- High: ${bundle.snapshot.summary.bySeverity.high}`,
    `- Medium: ${bundle.snapshot.summary.bySeverity.medium}`,
    `- Low: ${bundle.snapshot.summary.bySeverity.low}`,
    ''
  ];

  lines.push('## Domain Distribution');
  lines.push('| Domain | Issues | Share |');
  lines.push('| --- | ---: | ---: |');
  for (const [domain, count] of Object.entries(bundle.snapshot.summary.byDomain).filter(([, count]) => count > 0)) {
    lines.push(`| ${domain} | ${count} | ${renderDomainShare(count, bundle.snapshot.summary.total)} |`);
  }
  lines.push('');

  const byDomain = new Map<string, string[]>();

  for (const issue of bundle.snapshot.issues) {
    const bucket = byDomain.get(issue.domain) ?? [];
    bucket.push(`- [${issue.severity}] **${issue.title}**: ${issue.summary}`);
    bucket.push(`  - Evidence: ${issue.evidence}`);
    byDomain.set(issue.domain, bucket);
  }

  for (const [domain, bulletPoints] of byDomain.entries()) {
    lines.push(`## ${domain}`);
    lines.push(...bulletPoints);
    lines.push('');
  }

  if (bundle.diff) {
    lines.push('## Diff');
    lines.push(`- New: ${bundle.diff.newIssues.length}`);
    lines.push(`- Resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`- Regressions: ${bundle.diff.regressions.length}`);
    lines.push(`- Improvements: ${bundle.diff.improvements.length}`);
  }

  return lines.join('\n');
}

function deriveScore(bySeverity: ScanSnapshot['summary']['bySeverity']): number {
  const weighted = bySeverity.critical * 2.5 + bySeverity.high * 1.4 + bySeverity.medium * 0.7 + bySeverity.low * 0.2;
  const score = Math.max(0, Math.min(10, 10 - weighted));
  return Math.round(score * 10) / 10;
}

function scoreToVerdict(score: number): { label: string; css: 'good' | 'warn' | 'bad' } {
  if (score >= 8) {
    return { label: 'Excellent', css: 'good' };
  }
  if (score >= 6) {
    return { label: 'Needs Attention', css: 'warn' };
  }
  return { label: 'High Risk', css: 'bad' };
}

function renderDomainShare(count: number, total: number): string {
  if (!total) {
    return '0.0%';
  }
  return `${((count / total) * 100).toFixed(1)}%`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
