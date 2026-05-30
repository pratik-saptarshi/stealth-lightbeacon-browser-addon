var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/ui/pdf.ts
var pdf_exports = {};
__export(pdf_exports, {
  buildIssueReportLines: () => buildIssueReportLines,
  buildIssuesPdfBlob: () => buildIssuesPdfBlob,
  buildPdfDocument: () => buildPdfDocument,
  buildReportLines: () => buildReportLines,
  buildReportPdfBlob: () => buildReportPdfBlob
});
function buildIssuesPdfBlob(snapshot, issues) {
  const lines = buildIssueReportLines(snapshot, issues);
  const pdf = buildPdfDocument("Stealth Lightbeacon Issue Export", lines);
  return new Blob([pdf], { type: "application/pdf" });
}
function buildReportPdfBlob(bundle) {
  const lines = buildReportLines(bundle);
  const pdf = buildPdfDocument("Stealth Lightbeacon Scan Report", lines);
  return new Blob([pdf], { type: "application/pdf" });
}
function buildIssueReportLines(snapshot, issues) {
  const lines = [
    `Scan ID: ${snapshot.id}`,
    `URL: ${snapshot.url}`,
    `Origin: ${snapshot.origin}`,
    `Engine: ${snapshot.engine}`,
    `Generated: ${new Date(snapshot.timestamp).toISOString()}`,
    "",
    `Selected issues: ${issues.length}`,
    `Total issues on page: ${snapshot.summary.total}`,
    ""
  ];
  for (const issue of issues) {
    lines.push(`[${issue.severity}] ${issue.title}`);
    lines.push(`Rule: ${issue.ruleId}`);
    lines.push(`Domain: ${issue.domain}`);
    lines.push(`Summary: ${issue.summary}`);
    lines.push(`Evidence: ${issue.evidence}`);
    if (issue.selector) {
      lines.push(`Selector: ${issue.selector}`);
    }
    lines.push("");
  }
  return lines;
}
function buildReportLines(bundle) {
  const lines = [
    `Scan ID: ${bundle.snapshot.id}`,
    `URL: ${bundle.snapshot.url}`,
    `Origin: ${bundle.snapshot.origin}`,
    `Engine: ${bundle.snapshot.engine}`,
    `Generated: ${bundle.generatedAt}`,
    "",
    `Selected issues: ${bundle.snapshot.issues.length}`,
    `Total issues on page: ${bundle.snapshot.summary.total}`,
    `Critical: ${bundle.snapshot.summary.bySeverity.critical}`,
    `High: ${bundle.snapshot.summary.bySeverity.high}`,
    `Medium: ${bundle.snapshot.summary.bySeverity.medium}`,
    `Low: ${bundle.snapshot.summary.bySeverity.low}`,
    ""
  ];
  if (bundle.diff) {
    lines.push(`New issues: ${bundle.diff.newIssues.length}`);
    lines.push(`Resolved issues: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`Regressions: ${bundle.diff.regressions.length}`);
    lines.push(`Improvements: ${bundle.diff.improvements.length}`);
    lines.push("");
  }
  for (const issue of bundle.snapshot.issues) {
    lines.push(`[${issue.severity}] ${issue.title}`);
    lines.push(`Rule: ${issue.ruleId}`);
    lines.push(`Domain: ${issue.domain}`);
    lines.push(`Summary: ${issue.summary}`);
    lines.push(`Evidence: ${issue.evidence}`);
    if (issue.selector) {
      lines.push(`Selector: ${issue.selector}`);
    }
    lines.push("");
  }
  return lines;
}
function buildPdfDocument(title, lines) {
  const pages = chunkLines([title, "", ...lines], LINES_PER_PAGE);
  const objectParts = [];
  const pageObjects = [];
  const contentObjects = [];
  objectParts.push({
    number: 1,
    content: `<< /Type /Catalog /Pages 2 0 R >>`
  });
  const firstPageObject = 4;
  const firstContentObject = 5;
  for (let index = 0; index < pages.length; index++) {
    pageObjects.push(firstPageObject + index * 2);
    contentObjects.push(firstContentObject + index * 2);
  }
  objectParts.push({
    number: 2,
    content: `<< /Type /Pages /Kids [${pageObjects.map((pageObject) => `${pageObject} 0 R`).join(" ")}] /Count ${pages.length} >>`
  });
  objectParts.push({
    number: 3,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
  });
  pages.forEach((pageLines, index) => {
    const pageObject = pageObjects[index];
    const contentObject = contentObjects[index];
    const contentStream = buildPageContentStream(pageLines);
    objectParts.push({
      number: pageObject,
      content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`
    });
    objectParts.push({
      number: contentObject,
      content: `<< /Length ${byteLength(contentStream)} >>
stream
${contentStream}
endstream`
    });
  });
  objectParts.sort((left, right) => left.number - right.number);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const part of objectParts) {
    offsets[part.number] = byteLength(pdf);
    pdf += `${part.number} 0 obj
${part.content}
endobj
`;
  }
  const xrefStart = byteLength(pdf);
  const totalObjects = objectParts.length + 1;
  const xrefLines = [`xref`, `0 ${totalObjects}`, `0000000000 65535 f `];
  for (let objectNumber = 1; objectNumber < totalObjects; objectNumber++) {
    const offset = offsets[objectNumber] ?? 0;
    xrefLines.push(`${offset.toString().padStart(10, "0")} 00000 n `);
  }
  pdf += `${xrefLines.join("\n")}
`;
  pdf += `trailer << /Size ${totalObjects} /Root 1 0 R >>
`;
  pdf += `startxref
`;
  pdf += `${xrefStart}
`;
  pdf += `%%EOF`;
  return pdf;
}
function buildPageContentStream(lines) {
  const escapedLines = lines.map(escapePdfText);
  const textParts = [
    "BT",
    "/F1 12 Tf",
    `${LINE_HEIGHT} TL`,
    `1 0 0 1 ${LEFT_MARGIN} ${PAGE_HEIGHT - TOP_MARGIN} Tm`
  ];
  escapedLines.forEach((line, index) => {
    if (index === 0) {
      textParts.push(`(${line}) Tj`);
      return;
    }
    textParts.push("T*");
    textParts.push(`(${line}) Tj`);
  });
  textParts.push("ET");
  return textParts.join("\n");
}
function chunkLines(lines, chunkSize) {
  if (lines.length === 0) {
    return [[""]];
  }
  const chunks = [];
  for (let index = 0; index < lines.length; index += chunkSize) {
    chunks.push(lines.slice(index, index + chunkSize));
  }
  return chunks;
}
function escapePdfText(input) {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function byteLength(input) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return input.length;
}
var PAGE_WIDTH, PAGE_HEIGHT, LEFT_MARGIN, TOP_MARGIN, LINE_HEIGHT, LINES_PER_PAGE;
var init_pdf = __esm({
  "src/ui/pdf.ts"() {
    "use strict";
    PAGE_WIDTH = 612;
    PAGE_HEIGHT = 792;
    LEFT_MARGIN = 50;
    TOP_MARGIN = 54;
    LINE_HEIGHT = 14;
    LINES_PER_PAGE = 42;
  }
});

// src/side-panel/side-panel-state.ts
var SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var SIDE_PANEL_UI_STATE_STORAGE_KEY = "addon_side_panel_state";
var DEFAULT_SIDE_PANEL_UI_STATE = {
  settingsOpen: false,
  scanId: void 0,
  selectedIssueIds: []
};
function sortIssuesForPanel(issues) {
  return [...issues].sort((left, right) => {
    if (left.domain !== right.domain) {
      return left.domain.localeCompare(right.domain);
    }
    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
    const titleDelta = left.title.localeCompare(right.title);
    if (titleDelta !== 0) {
      return titleDelta;
    }
    const ruleDelta = left.ruleId.localeCompare(right.ruleId);
    if (ruleDelta !== 0) {
      return ruleDelta;
    }
    return left.id.localeCompare(right.id);
  });
}
function buildSidePanelIssuePanelModel(snapshot, diff, scanStatus = "complete") {
  const sortedIssues = sortIssuesForPanel(snapshot.issues);
  const groupedByDomain = /* @__PURE__ */ new Map();
  const counts = {
    critical: snapshot.summary.bySeverity.critical ?? 0,
    high: snapshot.summary.bySeverity.high ?? 0,
    medium: snapshot.summary.bySeverity.medium ?? 0,
    low: snapshot.summary.bySeverity.low ?? 0
  };
  for (const issue of sortedIssues) {
    const current = groupedByDomain.get(issue.domain) ?? {
      domain: issue.domain,
      total: 0,
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      groups: []
    };
    current.total += 1;
    current.counts[issue.severity] += 1;
    const severityGroup = current.groups.find((entry) => entry.severity === issue.severity);
    if (severityGroup) {
      severityGroup.issues.push(issue);
    } else {
      current.groups.push({
        severity: issue.severity,
        issues: [issue]
      });
      current.groups.sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);
    }
    groupedByDomain.set(issue.domain, current);
  }
  const domains = Array.from(groupedByDomain.values()).sort((left, right) => left.domain.localeCompare(right.domain));
  return {
    scanId: snapshot.id,
    scanStatus,
    origin: snapshot.origin,
    url: snapshot.url,
    generatedAt: new Date(snapshot.timestamp).toISOString(),
    total: snapshot.summary.total,
    counts,
    domains,
    delta: diff ? {
      newCount: diff.newIssues.length,
      fixedCount: diff.resolvedIssues.length + diff.improvements.length,
      unchangedCount: Math.max(snapshot.summary.total - diff.newIssues.length - (diff.resolvedIssues.length + diff.improvements.length), 0)
    } : void 0
  };
}
function buildIssueExportJson(issues, meta) {
  return JSON.stringify(
    {
      ...meta,
      issues
    },
    null,
    2
  );
}
function buildIssueExportMarkdown(issues, meta) {
  const lines = [
    "# Stealth Lightbeacon Issue Export",
    `- Scan ID: ${meta.scanId}`,
    `- Origin: ${meta.origin}`,
    `- URL: ${meta.url}`,
    `- Generated: ${meta.generatedAt}`,
    "",
    "## Issues"
  ];
  for (const issue of issues) {
    lines.push(`- [${issue.severity}] **${issue.domain}** / ${issue.ruleId}: ${issue.title}`);
    lines.push(`  - Summary: ${issue.summary}`);
    lines.push(`  - Evidence: ${issue.evidence}`);
    if (issue.selector) {
      lines.push(`  - Selector: ${issue.selector}`);
    }
  }
  return lines.join("\n");
}
function normalizeSidePanelUiState(input) {
  if (!isRecord(input)) {
    return {
      settingsOpen: DEFAULT_SIDE_PANEL_UI_STATE.settingsOpen,
      scanId: DEFAULT_SIDE_PANEL_UI_STATE.scanId,
      selectedIssueIds: [...DEFAULT_SIDE_PANEL_UI_STATE.selectedIssueIds]
    };
  }
  return {
    settingsOpen: typeof input.settingsOpen === "boolean" ? input.settingsOpen : DEFAULT_SIDE_PANEL_UI_STATE.settingsOpen,
    scanId: typeof input.scanId === "string" && input.scanId.trim() ? input.scanId.trim() : void 0,
    selectedIssueIds: normalizeSelectedIssueIds(input.selectedIssueIds)
  };
}
function buildSidePanelUiState(input) {
  return {
    settingsOpen: input.settingsOpen,
    scanId: input.scanId?.trim() || void 0,
    selectedIssueIds: normalizeSelectedIssueIds(input.selectedIssueIds)
  };
}
function collectSelectors(issues) {
  return Array.from(
    new Set(
      issues.map((issue) => issue.selector?.trim()).filter((selector) => Boolean(selector))
    )
  );
}
function buildReportDownloadPath(snapshot, format) {
  const domain = toDomainSlug(snapshot.origin || snapshot.url);
  const utcTimestamp = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, "-");
  const score = computeSnapshotScore(snapshot);
  const success = snapshot.summary.total === 0;
  const result = success ? "passed" : "failed";
  const extension = format === "markdown" ? "md" : format;
  const fileName = `${domain}_report_${utcTimestamp}_score_${score}_result_${result}_success_${success ? "true" : "false"}.${extension}`;
  return `${domain}/${fileName}`;
}
function normalizeSelectedIssueIds(input) {
  const values = toIterableArray(input);
  if (!values.length) {
    return [];
  }
  return Array.from(
    new Set(
      values.filter((value) => typeof value === "string").map((value) => value.trim()).filter((value) => Boolean(value))
    )
  );
}
function toIterableArray(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "object" && input !== null && Symbol.iterator in input) {
    return Array.from(input);
  }
  return [];
}
function toDomainSlug(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    const slug = host.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "unknown-domain";
  } catch {
    return "unknown-domain";
  }
}
function computeSnapshotScore(snapshot) {
  const bySeverity = snapshot.summary.bySeverity;
  const penalty = bySeverity.critical * 25 + bySeverity.high * 10 + bySeverity.medium * 5 + bySeverity.low;
  return Math.max(0, 100 - penalty);
}

// src/side-panel/latency-metrics.ts
var LATENCY_SAMPLES_STORAGE_KEY = "addon_scan_latency_samples";
var DEFAULT_SCAN_P95_TARGET_MS = 2e3;
function normalizeLatencySamples(input, maxSamples = 100) {
  if (!Array.isArray(input)) {
    return [];
  }
  const normalized = input.filter((value) => typeof value === "number" && Number.isFinite(value)).map((value) => Math.max(0, Math.round(value))).slice(-maxSamples);
  return normalized;
}
function appendLatencySample(samples, durationMs, maxSamples = 100) {
  const normalized = normalizeLatencySamples(samples, maxSamples);
  const next = [...normalized, Math.max(0, Math.round(durationMs))];
  return next.slice(-maxSamples);
}
function computeLatencyStats(samples) {
  const normalized = normalizeLatencySamples(samples);
  if (!normalized.length) {
    return { p95Ms: 0, sampleCount: 0 };
  }
  const sorted = [...normalized].sort((a, b) => a - b);
  const percentileIndex = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return {
    p95Ms: sorted[percentileIndex],
    sampleCount: sorted.length
  };
}
function formatLatencySloBadge(stats, targetMs = DEFAULT_SCAN_P95_TARGET_MS) {
  if (!stats.sampleCount) {
    return "p95 n/a";
  }
  const status = stats.p95Ms <= targetMs ? "ok" : "slow";
  return `p95 ${stats.p95Ms}ms (${status})`;
}

// src/ui/export.ts
function toJsonExport(bundle) {
  return JSON.stringify(bundle, null, 2);
}
function toHtmlExport(bundle) {
  const timestamp = new Date(bundle.snapshot.timestamp).toISOString();
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const domainRows = Object.entries(bundle.snapshot.summary.byDomain).filter(([, count]) => count > 0).map(
    ([domain, count]) => `<tr><td>${escapeHtml(domain)}</td><td>${count}</td><td>${renderDomainShare(
      count,
      bundle.snapshot.summary.total
    )}</td></tr>`
  ).join("\n");
  const issueRows = bundle.snapshot.issues.map(
    (issue) => `<tr>
  <td><span class="severity sev-${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span></td>
  <td>${escapeHtml(issue.domain)}</td>
  <td>${escapeHtml(issue.title)}</td>
  <td><code>${escapeHtml(issue.ruleId)}</code></td>
  <td>${escapeHtml(issue.summary)}</td>
  <td>${escapeHtml(issue.evidence)}</td>
</tr>`
  ).join("\n");
  const diffSection = bundle.diff ? `<section class="section">
    <h2>Diff</h2>
    <ul class="list">
      <li>New: ${bundle.diff.newIssues.length}</li>
      <li>Resolved: ${bundle.diff.resolvedIssues.length}</li>
      <li>Regressions: ${bundle.diff.regressions.length}</li>
      <li>Improvements: ${bundle.diff.improvements.length}</li>
    </ul>
  </section>` : "";
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
function toLlmMarkdownExport(bundle) {
  const lines = [
    "# Audit Findings",
    `URL: ${bundle.snapshot.url}`,
    `Generated: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    "",
    "## Prioritized Issue List",
    ...bundle.snapshot.issues.flatMap((issue) => [
      `- (${issue.severity}) ${issue.title} \u2014 ${issue.summary}`,
      `  evidence: ${issue.evidence}`
    ]),
    ""
  ];
  if (bundle.diff) {
    lines.push("## Delta");
    lines.push(`new: ${bundle.diff.newIssues.length}`);
    lines.push(`resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`regressions: ${bundle.diff.regressions.length}`);
    lines.push(`improvements: ${bundle.diff.improvements.length}`);
    lines.push("");
  }
  return lines.join("\n");
}
function toGeoXmlExport(bundle) {
  const issues = bundle.snapshot.issues.map(
    (issue) => `    <issue id="${issue.id}" ruleId="${issue.ruleId}" severity="${issue.severity}" domain="${issue.domain}">
      <summary>${xmlEscape(issue.summary)}</summary>
      <evidence>${xmlEscape(issue.evidence)}</evidence>
    </issue>`
  ).join("\n");
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
function xmlEscape(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function buildReport(bundle, format) {
  switch (format) {
    case "json":
      return toJsonExport(bundle);
    case "html":
      return toHtmlExport(bundle);
    case "llm-markdown":
      return toLlmMarkdownExport(bundle);
    case "geo-xml":
      return toGeoXmlExport(bundle);
    default:
      return toMarkdownExport(bundle);
  }
}
function toMarkdownExport(bundle) {
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const lines = [
    `# Stealth Lightbeacon Executive Audit Report`,
    "",
    `## Scan Export`,
    `- URL: ${bundle.snapshot.url}`,
    `- Origin: ${bundle.snapshot.origin}`,
    `- Engine: ${bundle.snapshot.engine}`,
    `- Timestamp: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    `- Score: ${score.toFixed(1)}/10`,
    `- Verdict: ${verdict.label}`,
    "",
    `## Executive Summary`,
    `- Total issues: ${bundle.snapshot.summary.total}`,
    `- Critical: ${bundle.snapshot.summary.bySeverity.critical}`,
    `- High: ${bundle.snapshot.summary.bySeverity.high}`,
    `- Medium: ${bundle.snapshot.summary.bySeverity.medium}`,
    `- Low: ${bundle.snapshot.summary.bySeverity.low}`,
    ""
  ];
  lines.push("## Domain Distribution");
  lines.push("| Domain | Issues | Share |");
  lines.push("| --- | ---: | ---: |");
  for (const [domain, count] of Object.entries(bundle.snapshot.summary.byDomain).filter(([, count2]) => count2 > 0)) {
    lines.push(`| ${domain} | ${count} | ${renderDomainShare(count, bundle.snapshot.summary.total)} |`);
  }
  lines.push("");
  const byDomain = /* @__PURE__ */ new Map();
  for (const issue of bundle.snapshot.issues) {
    const bucket = byDomain.get(issue.domain) ?? [];
    bucket.push(`- [${issue.severity}] **${issue.title}**: ${issue.summary}`);
    bucket.push(`  - Evidence: ${issue.evidence}`);
    byDomain.set(issue.domain, bucket);
  }
  for (const [domain, bulletPoints] of byDomain.entries()) {
    lines.push(`## ${domain}`);
    lines.push(...bulletPoints);
    lines.push("");
  }
  if (bundle.diff) {
    lines.push("## Diff");
    lines.push(`- New: ${bundle.diff.newIssues.length}`);
    lines.push(`- Resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`- Regressions: ${bundle.diff.regressions.length}`);
    lines.push(`- Improvements: ${bundle.diff.improvements.length}`);
  }
  return lines.join("\n");
}
function deriveScore(bySeverity) {
  const weighted = bySeverity.critical * 2.5 + bySeverity.high * 1.4 + bySeverity.medium * 0.7 + bySeverity.low * 0.2;
  const score = Math.max(0, Math.min(10, 10 - weighted));
  return Math.round(score * 10) / 10;
}
function scoreToVerdict(score) {
  if (score >= 8) {
    return { label: "Excellent", css: "good" };
  }
  if (score >= 6) {
    return { label: "Needs Attention", css: "warn" };
  }
  return { label: "High Risk", css: "bad" };
}
function renderDomainShare(count, total) {
  if (!total) {
    return "0.0%";
  }
  return `${(count / total * 100).toFixed(1)}%`;
}
function escapeHtml(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// src/shared/panel-settings.ts
var PANEL_SETTINGS_STORAGE_KEY = "addon_panel_settings";
var BUG_REPORT_EMAIL = "pratik.saptarshi@outlook.com";
var DEFAULT_PANEL_THEME = {
  backgroundStart: "#f6f1e8",
  backgroundEnd: "#edf3f8",
  panel: "#ffffff",
  panelStrong: "#ffffff",
  border: "#2c3e50",
  text: "#1f2d3d",
  muted: "#5f6f7f",
  mutedStrong: "#374151",
  accent: "#0d47a1",
  accentWeak: "#dbeafe",
  alert: "#d49a17",
  alertWeak: "#fff3cd",
  danger: "#990000",
  dangerWeak: "#ffe1e1"
};
var DEFAULT_PANEL_VISIBILITY = {
  showControls: true,
  showSummary: true,
  showDelta: true,
  showStatusLine: true,
  showOfflineBanner: true,
  showFooter: true
};
var DEFAULT_PANEL_SETTINGS = {
  theme: { ...DEFAULT_PANEL_THEME },
  visibility: { ...DEFAULT_PANEL_VISIBILITY },
  accessibility: {
    wcagLevel: "AA",
    includeBestPractices: true,
    includeAxeChecks: true
  },
  statusIndicatorMode: "header-badge"
};
var THEME_KEYS = Object.keys(DEFAULT_PANEL_THEME);
var VISIBILITY_KEYS = Object.keys(DEFAULT_PANEL_VISIBILITY);
var ACCESSIBILITY_LEVELS = ["A", "AA", "AAA"];
var HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/;
function normalizePanelSettings(input) {
  if (!isRecord2(input)) {
    return cloneDefaultPanelSettings();
  }
  return {
    theme: normalizeTheme(input.theme),
    visibility: normalizeVisibility(input.visibility),
    accessibility: normalizeAccessibility(input.accessibility),
    statusIndicatorMode: normalizeStatusIndicatorMode(input.statusIndicatorMode)
  };
}
function buildBugReportMailto(input = {}) {
  const params = new URLSearchParams();
  params.set("subject", "Stealth Lightbeacon bug report");
  const bodyLines = [
    `Extension version: ${input.version ?? "unknown"}`,
    `Page URL: ${input.pageUrl ?? "n/a"}`,
    `Panel status: ${input.status ?? "n/a"}`,
    `Note: ${input.note ?? "n/a"}`,
    `Settings: ${input.settingsSummary ?? "n/a"}`
  ];
  params.set("body", bodyLines.join("\n"));
  return `mailto:${BUG_REPORT_EMAIL}?${params.toString()}`;
}
function buildAccessibilityProfileSummary(input) {
  const wcagLabel = `WCAG ${input.wcagLevel}`;
  const base = input.includeBestPractices ? `${wcagLabel} plus best-practice checks for UX-oriented accessibility guardrails.` : `${wcagLabel} only, without best-practice checks.`;
  return input.includeAxeChecks ? `${base} Axe deep checks are enabled.` : `${base} Axe deep checks are disabled.`;
}
function normalizeTheme(input) {
  const source = isRecord2(input) ? input : {};
  const theme = cloneDefaultTheme();
  for (const key of THEME_KEYS) {
    theme[key] = normalizeHexColor(source[key], DEFAULT_PANEL_THEME[key]);
  }
  return theme;
}
function normalizeVisibility(input) {
  const source = isRecord2(input) ? input : {};
  const visibility = cloneDefaultVisibility();
  for (const key of VISIBILITY_KEYS) {
    visibility[key] = normalizeBoolean(source[key], DEFAULT_PANEL_VISIBILITY[key]);
  }
  return visibility;
}
function normalizeAccessibility(input) {
  const source = isRecord2(input) ? input : {};
  const wcagLevel = typeof source.wcagLevel === "string" && ACCESSIBILITY_LEVELS.includes(source.wcagLevel) ? source.wcagLevel : DEFAULT_PANEL_SETTINGS.accessibility.wcagLevel;
  const includeBestPractices = typeof source.includeBestPractices === "boolean" ? source.includeBestPractices : DEFAULT_PANEL_SETTINGS.accessibility.includeBestPractices;
  const includeAxeChecks = typeof source.includeAxeChecks === "boolean" ? source.includeAxeChecks : DEFAULT_PANEL_SETTINGS.accessibility.includeAxeChecks;
  return {
    wcagLevel,
    includeBestPractices,
    includeAxeChecks
  };
}
function normalizeStatusIndicatorMode(input) {
  return input === "footer-chip" ? "footer-chip" : "header-badge";
}
function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) {
    return fallback;
  }
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}
function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function cloneDefaultPanelSettings() {
  return {
    theme: cloneDefaultTheme(),
    visibility: cloneDefaultVisibility(),
    accessibility: {
      wcagLevel: DEFAULT_PANEL_SETTINGS.accessibility.wcagLevel,
      includeBestPractices: DEFAULT_PANEL_SETTINGS.accessibility.includeBestPractices,
      includeAxeChecks: DEFAULT_PANEL_SETTINGS.accessibility.includeAxeChecks
    },
    statusIndicatorMode: DEFAULT_PANEL_SETTINGS.statusIndicatorMode
  };
}
function cloneDefaultTheme() {
  return { ...DEFAULT_PANEL_THEME };
}
function cloneDefaultVisibility() {
  return { ...DEFAULT_PANEL_VISIBILITY };
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/shared/performance-trace.ts
var DEFAULT_WARN_THRESHOLD_MS = 16;
function startEventLoopTrace(label, sink = console, clock = globalThis.performance ?? { now: () => Date.now() }) {
  const startMark = `${label}:start`;
  const endMark = `${label}:end`;
  const startedAt = clock.now();
  clock.mark?.(startMark);
  return {
    end(details) {
      const durationMs = clock.now() - startedAt;
      clock.mark?.(endMark);
      clock.measure?.(label, startMark, endMark);
      const suffix = details ? ` ${details}` : "";
      const message = `[perf] ${label} ${durationMs.toFixed(2)}ms${suffix}`;
      sink.debug?.(message);
      if (durationMs >= DEFAULT_WARN_THRESHOLD_MS) {
        sink.warn?.(message);
      }
    }
  };
}
async function withEventLoopTrace(label, task, sink = console, clock = globalThis.performance ?? { now: () => Date.now() }) {
  const trace = startEventLoopTrace(label, sink, clock);
  try {
    return await Promise.resolve(task());
  } finally {
    trace.end();
  }
}

// src/side-panel/side-panel.ts
var runtimeHost = typeof globalThis === "undefined" ? {} : globalThis;
var state = {
  status: "idle",
  scanId: "",
  activeTab: "overview",
  historySnapshots: [],
  selectedIssueIds: /* @__PURE__ */ new Set(),
  panelSettings: { ...DEFAULT_PANEL_SETTINGS },
  settingsOpen: false,
  resultsExpanded: true,
  settingsFocusTarget: null,
  latencyStats: { p95Ms: 0, sampleCount: 0 }
};
var startupHydration;
var sidePanelUiSettingsTouched = false;
var dom = {
  shell: null,
  statusPill: null,
  statusPillFooter: null,
  statusLine: null,
  summaryGrid: null,
  deltaPanel: null,
  errorPanel: null,
  offlinePanel: null,
  controlsSection: null,
  footer: null,
  issuesPanel: null,
  overviewPanel: null,
  resultsPanel: null,
  historyPanel: null,
  rescanButton: null,
  exportJsonButton: null,
  exportMarkdownButton: null,
  exportHtmlButton: null,
  exportPdfButton: null,
  copySelectorsButton: null,
  collapseResultsButton: null,
  expandResultsButton: null,
  settingsToggleButton: null,
  settingsCloseButton: null,
  settingsPanel: null,
  bugReportLink: null,
  accessibilityWcagLevel: null,
  accessibilityBestPractices: null,
  accessibilityAxeChecks: null,
  accessibilityProfileSummary: null,
  statusIndicatorMode: null,
  themeInputs: [],
  visibilityInputs: [],
  tabButtons: []
};
document.addEventListener("DOMContentLoaded", () => {
  bindDom();
  bindActions();
  void initialize();
});
function bindDom() {
  dom.shell = document.getElementById("side-panel-shell");
  dom.statusPill = document.getElementById("status-pill");
  dom.statusPillFooter = document.getElementById("status-pill-footer");
  dom.statusLine = document.getElementById("status-line");
  dom.settingsToggleButton = document.getElementById("settings-toggle-button");
  dom.settingsCloseButton = document.getElementById("settings-close-button");
  dom.overviewPanel = document.getElementById("overview-panel");
  dom.resultsPanel = document.getElementById("results-panel");
  dom.historyPanel = document.getElementById("history-panel");
  dom.settingsPanel = document.getElementById("settings-panel");
  dom.bugReportLink = document.getElementById("bug-report-link");
  dom.controlsSection = document.querySelector(".controls");
  dom.summaryGrid = document.getElementById("summary-grid");
  dom.deltaPanel = document.getElementById("delta-panel");
  dom.errorPanel = document.getElementById("error-panel");
  dom.offlinePanel = document.getElementById("offline-panel");
  dom.footer = document.getElementById("footer");
  dom.issuesPanel = document.getElementById("issues-panel");
  dom.rescanButton = document.getElementById("rescan-button");
  dom.exportJsonButton = document.getElementById("export-json-button");
  dom.exportMarkdownButton = document.getElementById("export-markdown-button");
  dom.exportHtmlButton = document.getElementById("export-html-button");
  dom.exportPdfButton = document.getElementById("export-pdf-button");
  dom.copySelectorsButton = document.getElementById("copy-selectors-button");
  dom.collapseResultsButton = document.getElementById("collapse-results-button");
  dom.expandResultsButton = document.getElementById("expand-results-button");
  dom.accessibilityWcagLevel = document.getElementById("accessibility-wcag-level");
  dom.accessibilityBestPractices = document.getElementById("accessibility-best-practices");
  dom.accessibilityAxeChecks = document.getElementById("accessibility-axe-checks");
  dom.accessibilityProfileSummary = document.getElementById("accessibility-profile-summary");
  dom.statusIndicatorMode = document.getElementById("status-indicator-mode");
  dom.themeInputs = Array.from(document.querySelectorAll("input[data-theme-setting]"));
  dom.visibilityInputs = Array.from(document.querySelectorAll("input[data-visibility-setting]"));
  dom.tabButtons = Array.from(document.querySelectorAll("[data-side-panel-tab]"));
}
function bindActions() {
  dom.settingsToggleButton?.addEventListener("click", () => {
    state.settingsOpen = !state.settingsOpen;
    sidePanelUiSettingsTouched = true;
    state.settingsFocusTarget = state.settingsOpen ? "close" : "toggle";
    render();
    void persistSidePanelUiState();
  });
  dom.settingsCloseButton?.addEventListener("click", () => {
    state.settingsOpen = false;
    state.activeTab = "overview";
    sidePanelUiSettingsTouched = true;
    state.settingsFocusTarget = "toggle";
    render();
    void persistSidePanelUiState();
  });
  dom.settingsPanel?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    state.settingsOpen = false;
    state.settingsFocusTarget = "toggle";
    render();
    void persistSidePanelUiState();
    dom.settingsToggleButton?.focus();
  });
  dom.rescanButton?.addEventListener("click", () => {
    void startScan(true);
  });
  dom.exportJsonButton?.addEventListener("click", () => {
    void exportCurrentSelection("json");
  });
  dom.exportMarkdownButton?.addEventListener("click", () => {
    void exportCurrentSelection("markdown");
  });
  dom.exportHtmlButton?.addEventListener("click", () => {
    void downloadCurrentReport("html");
  });
  dom.exportPdfButton?.addEventListener("click", () => {
    void exportCurrentSelection("pdf");
  });
  dom.copySelectorsButton?.addEventListener("click", () => {
    void copySelectedSelectors();
  });
  dom.collapseResultsButton?.addEventListener("click", () => {
    state.resultsExpanded = false;
    render();
  });
  dom.expandResultsButton?.addEventListener("click", () => {
    state.resultsExpanded = true;
    render();
  });
  for (const button of dom.tabButtons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.sidePanelTab;
      if (!tab) {
        return;
      }
      setActiveTab(tab);
    });
  }
  bindSettingsInputs();
}
function setActiveTab(tab) {
  state.activeTab = tab;
  state.settingsOpen = tab === "settings";
  render();
}
async function initialize() {
  await withEventLoopTrace("side-panel.initialize", async () => {
    if (!hasExtensionRuntime()) {
      state.status = "idle";
      state.note = "Runtime unavailable";
      render({
        offline: true,
        statusLine: "Side panel shell loaded outside the extension runtime.",
        lightweight: true
      });
      return;
    }
    state.note = "Loading saved settings and cached scan...";
    render({ statusLine: state.note, lightweight: true });
    startupHydration = new Promise((resolve, reject) => {
      setTimeout(() => {
        void hydrateStartupState().then(resolve).catch(reject);
      }, 0);
    });
  });
}
function hasExtensionRuntime() {
  return Boolean(runtimeHost.chrome?.runtime?.sendMessage || runtimeHost.browser?.runtime?.sendMessage);
}
function getRuntime() {
  return runtimeHost.chrome ?? runtimeHost.browser;
}
async function startScan(manual) {
  await withEventLoopTrace("side-panel.scan", async () => {
    await ensureStartupHydrated();
    if (state.status === "loading") {
      return;
    }
    const runtime = getRuntime();
    if (!runtime?.runtime?.sendMessage || !runtime.tabs?.query) {
      renderError("Extension runtime is unavailable. Reload the addon page and try again.");
      return;
    }
    state.status = "loading";
    state.error = void 0;
    state.note = manual ? "Manual rescan running" : "Initial scan running";
    render();
    try {
      const activeTabs = await runtime.tabs.query({ active: true, currentWindow: true });
      const activeTab = activeTabs[0];
      if (!activeTab?.id) {
        throw new Error("No active tab available for scan");
      }
      state.tabId = activeTab.id;
      state.tabUrl = activeTab.url;
      state.scanId = createScanId();
      const scanStartedAt = Date.now();
      const reply = await runtime.runtime.sendMessage({
        type: "scan:start",
        request: {
          requestId: state.scanId,
          tabId: activeTab.id,
          // URL can be missing in side-panel flows without `tabs` permission grant.
          // Service worker resolves canonical URL from extracted page context.
          url: activeTab.url ?? "",
          engine: "dom-lite",
          accessibilityProfile: { ...state.panelSettings.accessibility }
        },
        persistHistory: true
      });
      const scanDurationMs = Date.now() - scanStartedAt;
      void persistLatencySample(scanDurationMs);
      if (!reply.ok) {
        throw new Error(reply.error);
      }
      state.snapshot = reply.payload.snapshot;
      state.diff = reply.payload.diff;
      state.historySnapshots = [
        reply.payload.snapshot,
        ...state.historySnapshots.filter((snapshot) => snapshot.id !== reply.payload.snapshot.id)
      ];
      state.selectedIssueIds.clear();
      state.status = inferStatus(reply.payload);
      state.note = reply.payload.recommendation ? `Backend recommendation: ${reply.payload.recommendation.engine}` : "Scan complete";
      state.activeTab = "results";
      void persistSidePanelUiState();
      render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.error = message;
      state.status = message.toLowerCase().includes("fallback") ? "fallback" : "failed";
      state.note = "Scan failed";
      renderError(message);
    }
  });
}
async function hydrateStartupState() {
  try {
    const [panelSettings, popupUiState, loadedCachedScan, historySnapshots, latencyStats] = await Promise.all([
      loadPanelSettings(),
      loadSidePanelUiState(),
      loadCachedScanFromHistory(),
      loadHistoryFromHistory(),
      loadLatencyStats()
    ]);
    state.panelSettings = panelSettings;
    state.historySnapshots = historySnapshots;
    state.latencyStats = latencyStats;
    if (!loadedCachedScan) {
      state.snapshot = void 0;
      state.diff = void 0;
      state.selectedIssueIds.clear();
      state.status = "idle";
      state.note = "No cached scan found. Click Rescan to scan the active tab.";
      state.activeTab = "overview";
    } else {
      state.activeTab = "results";
    }
    applySidePanelUiState(popupUiState);
    render();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.error = message;
    state.status = "failed";
    state.note = "Startup hydration failed";
    renderError(message);
  }
}
async function ensureStartupHydrated() {
  if (!startupHydration) {
    return;
  }
  await startupHydration;
}
function inferStatus(payload) {
  if (payload.recommendation && payload.recommendation.confidence < 0.5) {
    return "fallback";
  }
  return "complete";
}
function render(options) {
  const trace = startEventLoopTrace("side-panel.render");
  try {
    if (options?.offline) {
      dom.offlinePanel?.classList.remove("hidden");
    } else {
      dom.offlinePanel?.classList.add("hidden");
    }
    if (dom.statusPill) {
      dom.statusPill.dataset.status = state.status;
      dom.statusPill.textContent = statusLabel(state.status);
    }
    if (dom.statusPillFooter) {
      dom.statusPillFooter.dataset.status = state.status;
      dom.statusPillFooter.textContent = statusLabel(state.status);
    }
    if (dom.statusLine) {
      dom.statusLine.textContent = options?.statusLine ?? buildStatusLine();
    }
    if (dom.rescanButton) {
      dom.rescanButton.disabled = state.status === "loading" || !hasExtensionRuntime();
    }
    renderTabNavigation();
    renderTabPanels();
    if (options?.lightweight) {
      return;
    }
    if (dom.exportJsonButton) {
      dom.exportJsonButton.disabled = !state.snapshot;
    }
    if (dom.exportMarkdownButton) {
      dom.exportMarkdownButton.disabled = !state.snapshot;
    }
    if (dom.exportHtmlButton) {
      dom.exportHtmlButton.disabled = !state.snapshot;
    }
    if (dom.exportPdfButton) {
      dom.exportPdfButton.disabled = !state.snapshot;
    }
    if (dom.copySelectorsButton) {
      dom.copySelectorsButton.disabled = !state.snapshot || collectSelectors(getSelectedIssues()).length === 0;
    }
    renderPanelSettings();
    renderOverviewPanel();
    renderHistoryPanel();
    renderSummary();
    renderDelta();
    renderIssues();
    hideError();
  } finally {
    trace.end(state.snapshot ? `issues=${state.snapshot.summary.total}` : "empty");
  }
}
function renderTabNavigation() {
  for (const button of dom.tabButtons) {
    const tab = button.dataset.sidePanelTab;
    const selected = tab === state.activeTab;
    button.setAttribute("aria-selected", String(selected));
    button.classList.toggle("is-active", selected);
  }
  if (dom.settingsToggleButton) {
    dom.settingsToggleButton.setAttribute("aria-expanded", String(state.activeTab === "settings"));
  }
}
function renderTabPanels() {
  const setPanelHidden = (panel, hidden) => {
    if (!panel) {
      return;
    }
    panel.classList.toggle("hidden", hidden);
  };
  setPanelHidden(dom.overviewPanel, state.activeTab !== "overview");
  setPanelHidden(dom.resultsPanel, state.activeTab !== "results");
  setPanelHidden(dom.settingsPanel, state.activeTab !== "settings");
}
function renderOverviewPanel() {
  if (!dom.overviewPanel) {
    return;
  }
  const snapshot = state.snapshot;
  const issueCount = snapshot?.summary.total ?? 0;
  const historyCount = state.historySnapshots.length;
  dom.overviewPanel.innerHTML = `
    <section class="overview-grid" aria-label="Popup overview">
      <article class="info-card">
        <p class="eyebrow">Scan mode</p>
        <h2>Standalone audit</h2>
        <p>${escapeHtml2("Run locally with bundled rules directly in the extension runtime.")}</p>
        <button type="button" id="overview-rescan-button">Run Scan</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Results</p>
        <h2>Recent runs and reports</h2>
        <p>${escapeHtml2(`Review ${historyCount} saved runs, collapse issue groups, and download standard reports.`)}</p>
        <button type="button" data-side-panel-tab="results">Open Results</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Settings</p>
        <h2>Theme grid and visibility</h2>
        <p>Adjust colors, toggle optional sections, and keep the popup compact on smaller screens.</p>
        <button type="button" data-side-panel-tab="settings">Open Settings</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Current state</p>
        <h2>${escapeHtml2(snapshot ? snapshot.url : "No scan yet")}</h2>
        <p>${escapeHtml2(snapshot ? `${issueCount} issues \xB7 ${snapshot.engine}` : state.note ?? "Waiting for a scan")}</p>
        <p>${escapeHtml2("Mode: Standalone only")}</p>
      </article>
    </section>
  `;
  dom.overviewPanel.querySelector("#overview-rescan-button")?.addEventListener("click", () => {
    void startScan(true);
  });
  dom.overviewPanel.querySelectorAll("button[data-side-panel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.sidePanelTab;
      if (tab) {
        setActiveTab(tab);
      }
    });
  });
}
function renderHistoryPanel() {
  if (!dom.historyPanel) {
    return;
  }
  if (!state.historySnapshots.length) {
    dom.historyPanel.innerHTML = `<section class="history-empty" data-testid="history-empty">No saved runs yet.</section>`;
    return;
  }
  dom.historyPanel.innerHTML = state.historySnapshots.map((snapshot, index) => {
    const isLatest = index === 0;
    return `
        <details class="history-entry" data-testid="history-entry" ${state.resultsExpanded ? "open" : ""}>
          <summary>
            <div>
              <span class="history-title">${escapeHtml2(snapshot.url)}</span>
              <span class="history-meta">${new Date(snapshot.timestamp).toLocaleString()} \xB7 ${snapshot.summary.total} issues \xB7 ${escapeHtml2(snapshot.engine)}</span>
            </div>
            <div class="history-actions" aria-label="Report downloads">
              <button type="button" data-history-report="json" data-history-index="${index}">JSON</button>
              <button type="button" data-history-report="markdown" data-history-index="${index}">Markdown</button>
              <button type="button" data-history-report="html" data-history-index="${index}">HTML</button>
              <button type="button" data-history-report="pdf" data-history-index="${index}">PDF</button>
              ${isLatest ? '<span class="history-badge">Latest</span>' : ""}
            </div>
          </summary>
        </details>
      `;
  }).join("");
  dom.historyPanel.querySelectorAll("button[data-history-report]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const index = Number(button.dataset.historyIndex ?? "0");
      const snapshot = state.historySnapshots[index];
      const format = button.dataset.historyReport;
      if (!snapshot || !format) {
        return;
      }
      void downloadReportForSnapshot(snapshot, format);
    });
  });
}
function renderSummary() {
  if (!dom.summaryGrid) {
    return;
  }
  if (!state.panelSettings.visibility.showSummary) {
    dom.summaryGrid.classList.add("hidden");
    dom.summaryGrid.innerHTML = "";
    return;
  }
  dom.summaryGrid.classList.remove("hidden");
  const counts = state.snapshot?.summary.bySeverity ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const total = state.snapshot?.summary.total ?? 0;
  const generatedAt = state.snapshot ? new Date(state.snapshot.timestamp).toLocaleString() : "No scan yet";
  dom.summaryGrid.innerHTML = [
    metricCard("Total", total.toString()),
    metricCard("Critical", String(counts.critical ?? 0)),
    metricCard("High", String(counts.high ?? 0)),
    metricCard("Medium", String(counts.medium ?? 0)),
    metricCard("Low", String(counts.low ?? 0)),
    metricCard("Scan", generatedAt)
  ].join("");
}
function metricCard(label, value) {
  return `<article class="metric" data-testid="issue-summary"><span class="label">${escapeHtml2(label)}</span><span class="value">${escapeHtml2(value)}</span></article>`;
}
function renderDelta() {
  if (!dom.deltaPanel) {
    return;
  }
  if (!state.panelSettings.visibility.showDelta) {
    dom.deltaPanel.classList.add("hidden");
    dom.deltaPanel.innerHTML = "";
    return;
  }
  const delta = state.snapshot && state.diff ? buildSidePanelIssuePanelModel(state.snapshot, state.diff, state.status).delta : void 0;
  if (!delta) {
    dom.deltaPanel.classList.add("hidden");
    dom.deltaPanel.innerHTML = "";
    return;
  }
  dom.deltaPanel.classList.remove("hidden");
  dom.deltaPanel.innerHTML = `
    <strong>Delta summary</strong>
    <div class="delta-chips" data-testid="delta-chips">
      <span class="chip new">New ${delta.newCount}</span>
      <span class="chip fixed">Fixed ${delta.fixedCount}</span>
      <span class="chip unchanged">Estimated unchanged ${delta.unchangedCount}</span>
    </div>
  `;
}
function renderIssues() {
  if (!dom.issuesPanel) {
    return;
  }
  if (!state.snapshot) {
    dom.issuesPanel.innerHTML = `<section class="offline" data-testid="issue-empty">No scan has been run yet.</section>`;
    return;
  }
  const model = buildSidePanelIssuePanelModel(state.snapshot, state.diff, state.status);
  if (model.total === 0) {
    dom.issuesPanel.innerHTML = `<section class="offline" data-testid="issue-empty">No issues found for this page.</section>`;
    return;
  }
  dom.issuesPanel.innerHTML = model.domains.map(
    (domain) => `
        <details class="domain-card" ${state.resultsExpanded ? "open" : ""} data-testid="issue-domain">
          <summary>
            <div>
              <span class="domain-name">${escapeHtml2(domain.domain)}</span>
              <span class="domain-count">${domain.total} issue${domain.total === 1 ? "" : "s"}</span>
            </div>
            <div class="severity-row" aria-label="Severity counts">
              ${severityChip("critical", domain.counts.critical)}
              ${severityChip("high", domain.counts.high)}
              ${severityChip("medium", domain.counts.medium)}
              ${severityChip("low", domain.counts.low)}
            </div>
          </summary>
          <div class="domain-body">
            ${domain.groups.map(
      (group) => `
                  <section class="severity-section">
                    <h3 class="severity-title">${escapeHtml2(group.severity)} (${group.issues.length})</h3>
                    ${group.issues.map((issue) => renderIssueCard(issue)).join("")}
                  </section>
                `
    ).join("")}
          </div>
        </details>
      `
  ).join("");
  dom.issuesPanel.querySelectorAll("input[data-issue-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedIssueIds.add(checkbox.dataset.issueId ?? "");
      } else {
        state.selectedIssueIds.delete(checkbox.dataset.issueId ?? "");
      }
      render();
      void persistSidePanelUiState();
    });
  });
  dom.issuesPanel.querySelectorAll("button[data-copy-selector]").forEach((button) => {
    button.addEventListener("click", () => {
      const issueId = button.dataset.copySelector ?? "";
      void copySelectorsForIssues([issueId]);
    });
  });
  dom.issuesPanel.querySelectorAll("button[data-highlight-selector]").forEach((button) => {
    button.addEventListener("click", () => {
      const selector = button.dataset.highlightSelector ?? "";
      if (!selector) {
        return;
      }
      void sendHighlightAction({
        type: "issue:highlight",
        selector
      });
    });
  });
  dom.issuesPanel.querySelectorAll("button[data-clear-highlight]").forEach((button) => {
    button.addEventListener("click", () => {
      void sendHighlightAction({
        type: "issue:clear-highlight"
      });
    });
  });
}
function severityChip(severity, count) {
  return `<span class="severity-chip ${escapeHtml2(severity)}">${escapeHtml2(severity)} ${count}</span>`;
}
function renderIssueCard(issue) {
  const checked = state.selectedIssueIds.has(issue.id) ? "checked" : "";
  return `
    <article class="issue-card" data-testid="issue-card">
      <div class="issue-head">
        <label>
          <input class="issue-check" type="checkbox" data-issue-id="${escapeAttr(issue.id)}" ${checked} />
          <div>
            <p class="issue-title">${escapeHtml2(issue.title)}</p>
            <div class="issue-meta">
              <span><code>${escapeHtml2(issue.ruleId)}</code></span>
              <span>${escapeHtml2(issue.source)}</span>
              ${issue.selector ? `<span>${escapeHtml2(issue.selector)}</span>` : ""}
            </div>
          </div>
        </label>
      </div>
      <p class="issue-summary">${escapeHtml2(issue.summary)}</p>
      <p class="issue-evidence">${escapeHtml2(issue.evidence)}</p>
      <div class="issue-actions">
        <button type="button" data-copy-selector="${escapeAttr(issue.id)}">Copy selector</button>
        ${issue.selector ? `<button type="button" data-highlight-selector="${escapeAttr(issue.selector)}">Highlight</button>` : ""}
        <button type="button" data-clear-highlight="true">Clear highlight</button>
      </div>
    </article>
  `;
}
async function sendHighlightAction(action) {
  const runtime = getRuntime();
  if (!runtime?.runtime?.sendMessage) {
    return;
  }
  const message = state.tabId ? {
    ...action,
    tabId: state.tabId
  } : action;
  await runtime.runtime.sendMessage(message);
}
function buildStatusLine() {
  const latencyHint = ` \xB7 ${formatLatencySloBadge(state.latencyStats)}`;
  if (state.status === "loading") {
    return `Scanning active tab${state.tabUrl ? ` \xB7 ${state.tabUrl}` : ""}...${latencyHint}`;
  }
  if (state.snapshot) {
    const selectedCount = state.selectedIssueIds.size;
    return `${state.snapshot.url} \xB7 ${state.snapshot.summary.total} issues${selectedCount ? ` \xB7 ${selectedCount} selected` : ""} \xB7 ${state.snapshot.engine}${latencyHint}`;
  }
  return `${state.note ?? "Scan state will appear here."}${latencyHint}`;
}
function statusLabel(status) {
  switch (status) {
    case "loading":
      return "Loading";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    case "fallback":
      return "Fallback";
    default:
      return "Idle";
  }
}
function renderError(message) {
  if (!dom.errorPanel) {
    return;
  }
  dom.errorPanel.classList.remove("hidden");
  dom.errorPanel.textContent = message;
  dom.statusLine && (dom.statusLine.textContent = message);
  dom.statusPill && (dom.statusPill.dataset.status = state.status);
  dom.statusPill && (dom.statusPill.textContent = statusLabel(state.status));
}
function hideError() {
  if (!dom.errorPanel) {
    return;
  }
  if (!state.error) {
    dom.errorPanel.classList.add("hidden");
    dom.errorPanel.textContent = "";
    return;
  }
  dom.errorPanel.classList.remove("hidden");
  dom.errorPanel.textContent = state.error;
}
function bindSettingsInputs() {
  const updatePanel = () => {
    state.panelSettings = readPanelSettingsFromDom();
    void persistPanelSettings();
    render();
  };
  dom.accessibilityWcagLevel?.addEventListener("change", updatePanel);
  dom.accessibilityBestPractices?.addEventListener("change", updatePanel);
  dom.accessibilityAxeChecks?.addEventListener("change", updatePanel);
  dom.statusIndicatorMode?.addEventListener("change", updatePanel);
  for (const input of dom.themeInputs) {
    input.addEventListener("change", updatePanel);
  }
  for (const input of dom.visibilityInputs) {
    input.addEventListener("change", updatePanel);
  }
}
async function loadPanelSettings() {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return { ...DEFAULT_PANEL_SETTINGS };
  }
  const payload = await storage.get([PANEL_SETTINGS_STORAGE_KEY]);
  return normalizePanelSettings(payload[PANEL_SETTINGS_STORAGE_KEY]);
}
async function loadSidePanelUiState() {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return normalizeSidePanelUiState(void 0);
  }
  const payload = await storage.get([SIDE_PANEL_UI_STATE_STORAGE_KEY]);
  return normalizeSidePanelUiState(payload[SIDE_PANEL_UI_STATE_STORAGE_KEY]);
}
async function loadCachedScanFromHistory() {
  const runtime = getRuntime();
  if (!runtime?.runtime?.sendMessage || !runtime.tabs?.query) {
    return false;
  }
  try {
    const activeTabs = await runtime.tabs.query({ active: true, currentWindow: true });
    const activeTab = activeTabs[0];
    if (!activeTab?.url || !activeTab.id) {
      return false;
    }
    const activeUrl = new URL(activeTab.url);
    const reply = await runtime.runtime.sendMessage({
      type: "history:compare",
      origin: activeUrl.origin
    });
    state.tabId = activeTab.id;
    state.tabUrl = activeTab.url;
    if (!reply.ok || !reply.payload.latest) {
      return false;
    }
    state.snapshot = reply.payload.latest;
    state.diff = reply.payload.diff;
    state.selectedIssueIds.clear();
    state.status = "complete";
    state.note = "Cached scan loaded";
    return true;
  } catch {
    return false;
  }
}
async function loadHistoryFromHistory() {
  const runtime = getRuntime();
  if (!runtime?.runtime?.sendMessage || !runtime.tabs?.query) {
    return [];
  }
  try {
    const activeTabs = await runtime.tabs.query({ active: true, currentWindow: true });
    const activeTab = activeTabs[0];
    if (!activeTab?.url) {
      return [];
    }
    const origin = new URL(activeTab.url).origin;
    const reply = await runtime.runtime.sendMessage({
      type: "history:list",
      origin
    });
    if (!reply.ok) {
      return [];
    }
    return [...reply.payload.snapshots ?? []].sort((left, right) => right.timestamp - left.timestamp);
  } catch {
    return [];
  }
}
async function persistPanelSettings() {
  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({ [PANEL_SETTINGS_STORAGE_KEY]: state.panelSettings });
  }
}
async function loadLatencyStats() {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return { p95Ms: 0, sampleCount: 0 };
  }
  const payload = await storage.get([LATENCY_SAMPLES_STORAGE_KEY]);
  return computeLatencyStats(normalizeLatencySamples(payload[LATENCY_SAMPLES_STORAGE_KEY]));
}
async function persistLatencySample(durationMs) {
  try {
    const storage = getRuntime()?.storage?.local;
    if (!storage?.get || !storage?.set) {
      return;
    }
    const payload = await storage.get([LATENCY_SAMPLES_STORAGE_KEY]);
    const nextSamples = appendLatencySample(
      normalizeLatencySamples(payload[LATENCY_SAMPLES_STORAGE_KEY]),
      durationMs
    );
    await storage.set({ [LATENCY_SAMPLES_STORAGE_KEY]: nextSamples });
    state.latencyStats = computeLatencyStats(nextSamples);
  } catch {
  }
}
async function persistSidePanelUiState() {
  await ensureStartupHydrated();
  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({
      [SIDE_PANEL_UI_STATE_STORAGE_KEY]: buildSidePanelUiState({
        settingsOpen: state.settingsOpen,
        scanId: state.snapshot?.id,
        selectedIssueIds: state.selectedIssueIds
      })
    });
  }
}
function readPanelSettingsFromDom() {
  return normalizePanelSettings({
    theme: readThemeSettingsFromDom(),
    visibility: readVisibilitySettingsFromDom(),
    accessibility: {
      wcagLevel: dom.accessibilityWcagLevel?.value,
      includeBestPractices: dom.accessibilityBestPractices?.checked,
      includeAxeChecks: dom.accessibilityAxeChecks?.checked
    },
    statusIndicatorMode: dom.statusIndicatorMode?.value
  });
}
function readThemeSettingsFromDom() {
  const theme = {};
  for (const input of dom.themeInputs) {
    const key = input.dataset.themeSetting;
    if (!key) {
      continue;
    }
    theme[key] = input.value;
  }
  return theme;
}
function readVisibilitySettingsFromDom() {
  const visibility = {};
  for (const input of dom.visibilityInputs) {
    const key = input.dataset.visibilitySetting;
    if (!key) {
      continue;
    }
    visibility[key] = input.checked;
  }
  return visibility;
}
function renderPanelSettings() {
  applyPanelTheme();
  applyVisibilitySettings();
  renderSettingsForm();
  renderBugReportLink();
}
function renderSettingsForm() {
  if (dom.settingsToggleButton) {
    dom.settingsToggleButton.setAttribute("aria-expanded", String(state.settingsOpen));
  }
  if (dom.settingsPanel) {
    dom.settingsPanel.classList.toggle("hidden", !state.settingsOpen);
  }
  if (state.settingsFocusTarget === "close") {
    dom.settingsCloseButton?.focus();
    state.settingsFocusTarget = null;
  } else if (state.settingsFocusTarget === "toggle") {
    dom.settingsToggleButton?.focus();
    state.settingsFocusTarget = null;
  }
  for (const input of dom.themeInputs) {
    const key = input.dataset.themeSetting;
    if (!key) {
      continue;
    }
    input.value = state.panelSettings.theme[key];
  }
  for (const input of dom.visibilityInputs) {
    const key = input.dataset.visibilitySetting;
    if (!key) {
      continue;
    }
    input.checked = state.panelSettings.visibility[key];
  }
  if (dom.accessibilityWcagLevel) {
    dom.accessibilityWcagLevel.value = state.panelSettings.accessibility.wcagLevel;
  }
  if (dom.accessibilityBestPractices) {
    dom.accessibilityBestPractices.checked = state.panelSettings.accessibility.includeBestPractices;
  }
  if (dom.accessibilityAxeChecks) {
    dom.accessibilityAxeChecks.checked = state.panelSettings.accessibility.includeAxeChecks;
  }
  if (dom.accessibilityProfileSummary) {
    dom.accessibilityProfileSummary.textContent = buildAccessibilityProfileSummary(state.panelSettings.accessibility);
  }
  if (dom.statusIndicatorMode) {
    dom.statusIndicatorMode.value = state.panelSettings.statusIndicatorMode;
  }
}
function renderBugReportLink() {
  if (!dom.bugReportLink) {
    return;
  }
  const runtime = getRuntime();
  const version = runtime?.runtime?.getManifest?.().version ?? "unknown";
  const href = buildBugReportMailto({
    version,
    pageUrl: state.snapshot?.url ?? state.tabUrl,
    status: state.status,
    note: state.note,
    settingsSummary: summarizePanelSettings()
  });
  dom.bugReportLink.href = href;
  dom.bugReportLink.title = `Report a bug to ${BUG_REPORT_EMAIL}`;
}
function applySidePanelUiState(popupUiState) {
  if (!sidePanelUiSettingsTouched) {
    state.settingsOpen = popupUiState.settingsOpen;
  }
  if (!state.snapshot || popupUiState.scanId !== state.snapshot.id) {
    state.selectedIssueIds.clear();
    return;
  }
  const validIssueIds = new Set(state.snapshot.issues.map((issue) => issue.id));
  state.selectedIssueIds = new Set(popupUiState.selectedIssueIds.filter((issueId) => validIssueIds.has(issueId)));
}
function summarizePanelSettings() {
  const enabledSections = Object.entries(state.panelSettings.visibility).filter(([, value]) => value).map(([key]) => key).join(", ");
  return enabledSections || "none";
}
function applyPanelTheme() {
  if (!dom.shell) {
    return;
  }
  const style = dom.shell.style;
  style.setProperty("--bg-0", state.panelSettings.theme.backgroundStart);
  style.setProperty("--bg-1", state.panelSettings.theme.backgroundEnd);
  style.setProperty("--panel", state.panelSettings.theme.panel);
  style.setProperty("--panel-strong", state.panelSettings.theme.panelStrong);
  style.setProperty("--border", state.panelSettings.theme.border);
  style.setProperty("--text", state.panelSettings.theme.text);
  style.setProperty("--muted", state.panelSettings.theme.muted);
  style.setProperty("--muted-strong", state.panelSettings.theme.mutedStrong);
  style.setProperty("--accent", state.panelSettings.theme.accent);
  style.setProperty("--accent-weak", state.panelSettings.theme.accentWeak);
  style.setProperty("--alert", state.panelSettings.theme.alert);
  style.setProperty("--alert-weak", state.panelSettings.theme.alertWeak);
  style.setProperty("--danger", state.panelSettings.theme.danger);
  style.setProperty("--danger-weak", state.panelSettings.theme.dangerWeak);
}
function applyVisibilitySettings() {
  setSectionVisibility(dom.controlsSection, state.panelSettings.visibility.showControls);
  setSectionVisibility(dom.summaryGrid, state.panelSettings.visibility.showSummary);
  setSectionVisibility(dom.deltaPanel, state.panelSettings.visibility.showDelta);
  setSectionVisibility(dom.statusLine, state.panelSettings.visibility.showStatusLine);
  setSectionVisibility(dom.offlinePanel, state.panelSettings.visibility.showOfflineBanner);
  setSectionVisibility(dom.footer, state.panelSettings.visibility.showFooter);
  const footerMode = state.panelSettings.statusIndicatorMode === "footer-chip";
  setSectionVisibility(dom.statusPill, !footerMode);
  setSectionVisibility(dom.statusPillFooter, footerMode && state.panelSettings.visibility.showFooter);
}
function setSectionVisibility(element, visible) {
  if (!element || !(element instanceof HTMLElement)) {
    return;
  }
  element.classList.toggle("hidden", !visible);
}
function getSelectedIssues() {
  if (!state.snapshot) {
    return [];
  }
  return state.snapshot.issues.filter((issue) => state.selectedIssueIds.has(issue.id));
}
async function exportCurrentSelection(format) {
  const issues = getSelectedIssues();
  const selectedIssues = issues.length ? issues : state.snapshot?.issues ?? [];
  if (!selectedIssues.length || !state.snapshot) {
    return;
  }
  const metadata = {
    scanId: state.snapshot.id,
    origin: state.snapshot.origin,
    url: state.snapshot.url,
    generatedAt: new Date(state.snapshot.timestamp).toISOString()
  };
  if (format === "pdf") {
    const { buildIssuesPdfBlob: buildIssuesPdfBlob2 } = await Promise.resolve().then(() => (init_pdf(), pdf_exports));
    const blob = buildIssuesPdfBlob2(state.snapshot, selectedIssues);
    downloadBlob(blob, buildReportDownloadPath(state.snapshot, "pdf"));
    return;
  }
  const payload = format === "json" ? buildIssueExportJson(selectedIssues, metadata) : buildIssueExportMarkdown(selectedIssues, metadata);
  const fileFormat = format === "json" ? "json" : "markdown";
  downloadText(payload, buildReportDownloadPath(state.snapshot, fileFormat));
}
async function downloadCurrentReport(format) {
  if (!state.snapshot) {
    return;
  }
  await downloadReportForSnapshot(state.snapshot, format, state.diff);
}
async function downloadReportForSnapshot(snapshot, format, diff) {
  const generatedAt = new Date(snapshot.timestamp).toISOString();
  const runtime = getRuntime();
  if (format === "pdf") {
    const { buildReportPdfBlob: buildReportPdfBlob2 } = await Promise.resolve().then(() => (init_pdf(), pdf_exports));
    const blob2 = buildReportPdfBlob2({
      generatedAt,
      snapshot,
      diff
    });
    downloadBlob(blob2, buildReportDownloadPath(snapshot, "pdf"));
    return;
  }
  const report = runtime?.runtime?.sendMessage ? await buildReportFromRuntime(snapshot, format, diff, runtime.runtime.sendMessage) : buildReport(
    {
      generatedAt,
      snapshot,
      diff
    },
    format
  );
  const blob = new Blob([report], {
    type: format === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
  });
  downloadBlob(blob, buildReportDownloadPath(snapshot, format));
}
async function buildReportFromRuntime(snapshot, format, diff, sendMessage) {
  try {
    const reply = await sendMessage({
      type: "report:build",
      snapshot,
      diff,
      format
    });
    if (reply.ok) {
      return reply.payload.report;
    }
  } catch {
  }
  return buildReport(
    {
      generatedAt: new Date(snapshot.timestamp).toISOString(),
      snapshot,
      diff
    },
    format
  );
}
async function copySelectedSelectors() {
  await copySelectorsForIssues(Array.from(state.selectedIssueIds));
}
async function copySelectorsForIssues(issueIds) {
  if (!state.snapshot) {
    return;
  }
  const selectedIssues = state.snapshot.issues.filter((issue) => issueIds.includes(issue.id));
  const selectors = collectSelectors(selectedIssues);
  if (!selectors.length) {
    return;
  }
  await copyToClipboard(selectors.join("\n"));
}
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    state.note = "Selectors copied to clipboard";
    render();
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
    state.note = "Selectors copied to clipboard";
    render();
  }
}
function downloadText(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}
function createScanId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml2(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(value) {
  return escapeHtml2(value).replace(/`/g, "&#96;");
}
export {
  initialize
};
