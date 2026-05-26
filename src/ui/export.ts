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
  const lines = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8" /><title>Scan Report</title></head>',
    '<body>',
    `<h1>Scan Report</h1>`,
    `<p><strong>URL:</strong> ${bundle.snapshot.url}</p>`,
    `<p><strong>Origin:</strong> ${bundle.snapshot.origin}</p>`,
    `<p><strong>Engine:</strong> ${bundle.snapshot.engine}</p>`,
    `<p><strong>Timestamp:</strong> ${new Date(bundle.snapshot.timestamp).toISOString()}</p>`,
    `<h2>Summary</h2>`,
    `<ul>`,
    `<li>Total issues: ${bundle.snapshot.summary.total}</li>`,
    `<li>Critical: ${bundle.snapshot.summary.bySeverity.critical}</li>`,
    `<li>High: ${bundle.snapshot.summary.bySeverity.high}</li>`,
    `<li>Medium: ${bundle.snapshot.summary.bySeverity.medium}</li>`,
    `<li>Low: ${bundle.snapshot.summary.bySeverity.low}</li>`,
    `</ul>`,
    '<h2>Issues</h2>'
  ];

  for (const issue of bundle.snapshot.issues) {
    lines.push(`<h3>[${issue.severity}] ${issue.title}</h3>`);
    lines.push(`<p><strong>Rule:</strong> ${issue.ruleId}</p>`);
    lines.push(`<p>${issue.summary}</p>`);
    lines.push(`<p><small>${issue.domain}</small> ${issue.evidence}</p>`);
  }

  if (bundle.diff) {
    lines.push('<h2>Diff</h2>');
    lines.push(`<p>New: ${bundle.diff.newIssues.length}</p>`);
    lines.push(`<p>Resolved: ${bundle.diff.resolvedIssues.length}</p>`);
    lines.push(`<p>Regressions: ${bundle.diff.regressions.length}</p>`);
    lines.push(`<p>Improvements: ${bundle.diff.improvements.length}</p>`);
  }

  lines.push('</body></html>');

  return lines.join('\n');
}

export function toLlmMarkdownExport(bundle: ExportBundle): string {
  const lines = [
    '# Audit Findings',
    `URL: ${bundle.snapshot.url}`,
    `Generated: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    '',
    '## Prioritized Issue List',
    ...bundle.snapshot.issues.map((issue) => `- (${issue.severity}) ${issue.title} — ${issue.summary}`),
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
  const lines = [
    `# Scan Export`,
    `- URL: ${bundle.snapshot.url}`,
    `- Origin: ${bundle.snapshot.origin}`,
    `- Engine: ${bundle.snapshot.engine}`,
    `- Timestamp: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    '',
    `## Summary`,
    `- Total issues: ${bundle.snapshot.summary.total}`,
    `- Critical: ${bundle.snapshot.summary.bySeverity.critical}`,
    `- High: ${bundle.snapshot.summary.bySeverity.high}`,
    `- Medium: ${bundle.snapshot.summary.bySeverity.medium}`,
    `- Low: ${bundle.snapshot.summary.bySeverity.low}`,
    ''
  ];

  const byDomain = new Map<string, string[]>();

  for (const issue of bundle.snapshot.issues) {
    const bucket = byDomain.get(issue.domain) ?? [];
    bucket.push(`- [${issue.severity}] **${issue.title}**: ${issue.summary}`);
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
