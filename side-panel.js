// src/popup/popup-state.ts
var SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
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
function buildPopupIssuePanelModel(snapshot, diff, scanStatus = "complete") {
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
function collectSelectors(issues) {
  return Array.from(
    new Set(
      issues.map((issue) => issue.selector?.trim()).filter((selector) => Boolean(selector))
    )
  );
}

// src/shared/backend-settings.ts
var BACKEND_SETTINGS_STORAGE_KEY = "addon_backend_settings";
var DEFAULT_BACKEND_SETTINGS = {
  enabled: false,
  mode: "http",
  endpoint: "http://127.0.0.1",
  port: "5000",
  requestSigningSecret: "",
  authUsername: "",
  authPassword: "",
  required: false
};
function normalizeBackendSettings(input) {
  if (!isRecord(input)) {
    return { ...DEFAULT_BACKEND_SETTINGS };
  }
  return {
    enabled: coerceBoolean(input.enabled, DEFAULT_BACKEND_SETTINGS.enabled),
    mode: input.mode === "stdin" ? "stdin" : "http",
    endpoint: coerceString(input.endpoint, DEFAULT_BACKEND_SETTINGS.endpoint),
    port: coerceString(input.port, DEFAULT_BACKEND_SETTINGS.port),
    requestSigningSecret: coerceString(input.requestSigningSecret, DEFAULT_BACKEND_SETTINGS.requestSigningSecret),
    authUsername: coerceString(input.authUsername ?? input.username, DEFAULT_BACKEND_SETTINGS.authUsername),
    authPassword: coerceString(input.authPassword ?? input.password, DEFAULT_BACKEND_SETTINGS.authPassword),
    required: coerceBoolean(input.required, DEFAULT_BACKEND_SETTINGS.required)
  };
}
function buildBackendRequestFromSettings(settings) {
  if (!settings.enabled) {
    return void 0;
  }
  const request = {
    enabled: true,
    mode: settings.mode,
    required: settings.required
  };
  if (settings.requestSigningSecret.trim()) {
    request.requestSigningSecret = settings.requestSigningSecret.trim();
  }
  if (settings.authUsername.trim() && settings.authPassword.trim()) {
    request.auth = {
      username: settings.authUsername.trim(),
      password: settings.authPassword.trim()
    };
  }
  if (settings.mode === "stdin") {
    return request;
  }
  const endpoint = composeEndpoint(settings.endpoint, settings.port);
  if (!endpoint) {
    return void 0;
  }
  request.endpoint = endpoint;
  return request;
}
function composeEndpoint(endpoint, port) {
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    return void 0;
  }
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedEndpoint) ? trimmedEndpoint : `http://${trimmedEndpoint.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withScheme);
    const trimmedPort = port.trim();
    if (trimmedPort) {
      url.port = trimmedPort;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return void 0;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function coerceString(value, fallback) {
  return typeof value === "string" ? value : fallback;
}
function coerceBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
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
  showBackendSettings: true,
  showSummary: true,
  showDelta: true,
  showStatusLine: true,
  showOfflineBanner: true,
  showFooter: true
};
var DEFAULT_PANEL_SETTINGS = {
  theme: { ...DEFAULT_PANEL_THEME },
  visibility: { ...DEFAULT_PANEL_VISIBILITY }
};
var THEME_KEYS = Object.keys(DEFAULT_PANEL_THEME);
var VISIBILITY_KEYS = Object.keys(DEFAULT_PANEL_VISIBILITY);
var HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/;
function normalizePanelSettings(input) {
  if (!isRecord2(input)) {
    return cloneDefaultPanelSettings();
  }
  return {
    theme: normalizeTheme(input.theme),
    visibility: normalizeVisibility(input.visibility)
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
    visibility: cloneDefaultVisibility()
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

// src/ui/pdf.ts
var PAGE_WIDTH = 612;
var PAGE_HEIGHT = 792;
var LEFT_MARGIN = 50;
var TOP_MARGIN = 54;
var LINE_HEIGHT = 14;
var LINES_PER_PAGE = 42;
function buildIssuesPdfBlob(snapshot, issues) {
  const lines = buildIssueReportLines(snapshot, issues);
  const pdf = buildPdfDocument("Stealth Lightbeacon Issue Export", lines);
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

// src/popup/popup.ts
var runtimeHost = typeof globalThis === "undefined" ? {} : globalThis;
var state = {
  status: "idle",
  scanId: "",
  selectedIssueIds: /* @__PURE__ */ new Set(),
  backendSettings: { ...DEFAULT_BACKEND_SETTINGS },
  panelSettings: { ...DEFAULT_PANEL_SETTINGS },
  settingsOpen: false
};
var dom = {
  shell: null,
  statusPill: null,
  statusLine: null,
  summaryGrid: null,
  deltaPanel: null,
  errorPanel: null,
  offlinePanel: null,
  controlsSection: null,
  footer: null,
  issuesPanel: null,
  rescanButton: null,
  exportJsonButton: null,
  exportMarkdownButton: null,
  exportPdfButton: null,
  copySelectorsButton: null,
  settingsToggleButton: null,
  settingsCloseButton: null,
  settingsPanel: null,
  backendSettingsSection: null,
  bugReportLink: null,
  backendEnabled: null,
  backendMode: null,
  backendEndpoint: null,
  backendPort: null,
  backendSecret: null,
  backendAuthUsername: null,
  backendAuthPassword: null,
  backendRequired: null,
  openApiSpecLink: null,
  themeInputs: [],
  visibilityInputs: []
};
document.addEventListener("DOMContentLoaded", () => {
  bindDom();
  bindActions();
  void initialize();
});
function bindDom() {
  dom.shell = document.getElementById("popup-shell");
  dom.statusPill = document.getElementById("status-pill");
  dom.statusLine = document.getElementById("status-line");
  dom.settingsToggleButton = document.getElementById("settings-toggle-button");
  dom.settingsCloseButton = document.getElementById("settings-close-button");
  dom.settingsPanel = document.getElementById("settings-panel");
  dom.backendSettingsSection = document.getElementById("backend-settings-section");
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
  dom.exportPdfButton = document.getElementById("export-pdf-button");
  dom.copySelectorsButton = document.getElementById("copy-selectors-button");
  dom.backendEnabled = document.getElementById("backend-enabled");
  dom.backendMode = document.getElementById("backend-mode");
  dom.backendEndpoint = document.getElementById("backend-endpoint");
  dom.backendPort = document.getElementById("backend-port");
  dom.backendSecret = document.getElementById("backend-secret");
  dom.backendAuthUsername = document.getElementById("backend-auth-username");
  dom.backendAuthPassword = document.getElementById("backend-auth-password");
  dom.backendRequired = document.getElementById("backend-required");
  dom.openApiSpecLink = document.getElementById("openapi-spec-link");
  dom.themeInputs = Array.from(document.querySelectorAll("input[data-theme-setting]"));
  dom.visibilityInputs = Array.from(document.querySelectorAll("input[data-visibility-setting]"));
}
function bindActions() {
  dom.settingsToggleButton?.addEventListener("click", () => {
    state.settingsOpen = !state.settingsOpen;
    render();
  });
  dom.settingsCloseButton?.addEventListener("click", () => {
    state.settingsOpen = false;
    render();
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
  dom.exportPdfButton?.addEventListener("click", () => {
    void exportCurrentSelection("pdf");
  });
  dom.copySelectorsButton?.addEventListener("click", () => {
    void copySelectedSelectors();
  });
  bindSettingsInputs();
}
async function initialize() {
  await withEventLoopTrace("popup.initialize", async () => {
    if (!hasExtensionRuntime()) {
      state.status = "idle";
      state.note = "Runtime unavailable";
      render({ offline: true, statusLine: "Popup shell loaded outside the extension runtime." });
      return;
    }
    await Promise.all([loadBackendSettings(), loadPanelSettings()]);
    await startScan(false);
  });
}
function hasExtensionRuntime() {
  return Boolean(runtimeHost.chrome?.runtime?.sendMessage || runtimeHost.browser?.runtime?.sendMessage);
}
function getRuntime() {
  return runtimeHost.chrome ?? runtimeHost.browser;
}
async function startScan(manual) {
  await withEventLoopTrace("popup.scan", async () => {
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
      if (!activeTab.url) {
        throw new Error("Unable to resolve active tab URL");
      }
      state.tabId = activeTab.id;
      state.tabUrl = activeTab.url;
      state.scanId = createScanId();
      const backend = buildBackendRequestFromSettings(state.backendSettings);
      const reply = await runtime.runtime.sendMessage({
        type: "scan:start",
        request: {
          requestId: state.scanId,
          tabId: activeTab.id,
          url: activeTab.url,
          engine: "dom-lite",
          backend
        },
        persistHistory: true
      });
      if (!reply.ok) {
        throw new Error(reply.error);
      }
      state.snapshot = reply.payload.snapshot;
      state.diff = reply.payload.diff;
      state.selectedIssueIds.clear();
      state.status = inferStatus(reply.payload);
      state.note = reply.payload.recommendation ? `Backend recommendation: ${reply.payload.recommendation.engine}` : "Scan complete";
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
function inferStatus(payload) {
  if (payload.recommendation && payload.recommendation.confidence < 0.5) {
    return "fallback";
  }
  return "complete";
}
function render(options) {
  const trace = startEventLoopTrace("popup.render");
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
    if (dom.statusLine) {
      dom.statusLine.textContent = options?.statusLine ?? buildStatusLine();
    }
    if (dom.rescanButton) {
      dom.rescanButton.disabled = state.status === "loading" || !hasExtensionRuntime();
    }
    if (dom.exportJsonButton) {
      dom.exportJsonButton.disabled = !state.snapshot;
    }
    if (dom.exportMarkdownButton) {
      dom.exportMarkdownButton.disabled = !state.snapshot;
    }
    if (dom.copySelectorsButton) {
      dom.copySelectorsButton.disabled = !state.snapshot || collectSelectors(getSelectedIssues()).length === 0;
    }
    renderPanelSettings();
    renderSummary();
    renderDelta();
    renderIssues();
    hideError();
  } finally {
    trace.end(state.snapshot ? `issues=${state.snapshot.summary.total}` : "empty");
  }
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
  return `<article class="metric" data-testid="issue-summary"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></article>`;
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
  const delta = state.snapshot && state.diff ? buildPopupIssuePanelModel(state.snapshot, state.diff, state.status).delta : void 0;
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
  const model = buildPopupIssuePanelModel(state.snapshot, state.diff, state.status);
  if (model.total === 0) {
    dom.issuesPanel.innerHTML = `<section class="offline" data-testid="issue-empty">No issues found for this page.</section>`;
    return;
  }
  dom.issuesPanel.innerHTML = model.domains.map(
    (domain, index) => `
        <details class="domain-card" ${index === 0 ? "open" : ""} data-testid="issue-domain">
          <summary>
            <div>
              <span class="domain-name">${escapeHtml(domain.domain)}</span>
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
                    <h3 class="severity-title">${escapeHtml(group.severity)} (${group.issues.length})</h3>
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
    });
  });
  dom.issuesPanel.querySelectorAll("button[data-copy-selector]").forEach((button) => {
    button.addEventListener("click", () => {
      const issueId = button.dataset.copySelector ?? "";
      void copySelectorsForIssues([issueId]);
    });
  });
}
function severityChip(severity, count) {
  return `<span class="severity-chip ${escapeHtml(severity)}">${escapeHtml(severity)} ${count}</span>`;
}
function renderIssueCard(issue) {
  const checked = state.selectedIssueIds.has(issue.id) ? "checked" : "";
  return `
    <article class="issue-card" data-testid="issue-card">
      <div class="issue-head">
        <label>
          <input class="issue-check" type="checkbox" data-issue-id="${escapeAttr(issue.id)}" ${checked} />
          <div>
            <p class="issue-title">${escapeHtml(issue.title)}</p>
            <div class="issue-meta">
              <span><code>${escapeHtml(issue.ruleId)}</code></span>
              <span>${escapeHtml(issue.source)}</span>
              ${issue.selector ? `<span>${escapeHtml(issue.selector)}</span>` : ""}
            </div>
          </div>
        </label>
      </div>
      <p class="issue-summary">${escapeHtml(issue.summary)}</p>
      <p class="issue-evidence">${escapeHtml(issue.evidence)}</p>
      <div class="issue-actions">
        <button type="button" data-copy-selector="${escapeAttr(issue.id)}">Copy selector</button>
      </div>
    </article>
  `;
}
function buildStatusLine() {
  if (state.status === "loading") {
    return `Scanning active tab${state.tabUrl ? ` \xB7 ${state.tabUrl}` : ""}...`;
  }
  if (state.snapshot) {
    return `${state.snapshot.url} \xB7 ${state.snapshot.summary.total} issues \xB7 ${state.snapshot.engine}`;
  }
  return state.note ?? "Scan state will appear here.";
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
  const updateBackend = () => {
    state.backendSettings = readBackendSettingsFromDom();
    void persistBackendSettings();
  };
  const updatePanel = () => {
    state.panelSettings = readPanelSettingsFromDom();
    void persistPanelSettings();
    render();
  };
  dom.backendEnabled?.addEventListener("change", updateBackend);
  dom.backendMode?.addEventListener("change", updateBackend);
  dom.backendEndpoint?.addEventListener("change", updateBackend);
  dom.backendPort?.addEventListener("change", updateBackend);
  dom.backendSecret?.addEventListener("change", updateBackend);
  dom.backendAuthUsername?.addEventListener("change", updateBackend);
  dom.backendAuthPassword?.addEventListener("change", updateBackend);
  dom.backendRequired?.addEventListener("change", updateBackend);
  for (const input of dom.themeInputs) {
    input.addEventListener("change", updatePanel);
  }
  for (const input of dom.visibilityInputs) {
    input.addEventListener("change", updatePanel);
  }
}
async function loadBackendSettings() {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    state.backendSettings = { ...DEFAULT_BACKEND_SETTINGS };
    renderPanelSettings();
    return;
  }
  const payload = await storage.get([BACKEND_SETTINGS_STORAGE_KEY]);
  state.backendSettings = normalizeBackendSettings(payload[BACKEND_SETTINGS_STORAGE_KEY]);
  renderPanelSettings();
}
async function loadPanelSettings() {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    state.panelSettings = { ...DEFAULT_PANEL_SETTINGS };
    renderPanelSettings();
    return;
  }
  const payload = await storage.get([PANEL_SETTINGS_STORAGE_KEY]);
  state.panelSettings = normalizePanelSettings(payload[PANEL_SETTINGS_STORAGE_KEY]);
  renderPanelSettings();
}
async function persistBackendSettings() {
  state.backendSettings = readBackendSettingsFromDom();
  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({ [BACKEND_SETTINGS_STORAGE_KEY]: state.backendSettings });
  }
}
async function persistPanelSettings() {
  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({ [PANEL_SETTINGS_STORAGE_KEY]: state.panelSettings });
  }
}
function readBackendSettingsFromDom() {
  return normalizeBackendSettings({
    enabled: dom.backendEnabled?.checked ?? DEFAULT_BACKEND_SETTINGS.enabled,
    mode: dom.backendMode?.value === "stdin" ? "stdin" : "http",
    endpoint: dom.backendEndpoint?.value ?? DEFAULT_BACKEND_SETTINGS.endpoint,
    port: dom.backendPort?.value ?? DEFAULT_BACKEND_SETTINGS.port,
    requestSigningSecret: dom.backendSecret?.value ?? DEFAULT_BACKEND_SETTINGS.requestSigningSecret,
    authUsername: dom.backendAuthUsername?.value ?? DEFAULT_BACKEND_SETTINGS.authUsername,
    authPassword: dom.backendAuthPassword?.value ?? DEFAULT_BACKEND_SETTINGS.authPassword,
    required: dom.backendRequired?.checked ?? DEFAULT_BACKEND_SETTINGS.required
  });
}
function readPanelSettingsFromDom() {
  return normalizePanelSettings({
    theme: readThemeSettingsFromDom(),
    visibility: readVisibilitySettingsFromDom()
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
  if (dom.backendEnabled) {
    dom.backendEnabled.checked = state.backendSettings.enabled;
  }
  if (dom.backendMode) {
    dom.backendMode.value = state.backendSettings.mode;
  }
  if (dom.backendEndpoint) {
    dom.backendEndpoint.value = state.backendSettings.endpoint;
  }
  if (dom.backendPort) {
    dom.backendPort.value = state.backendSettings.port;
  }
  if (dom.backendSecret) {
    dom.backendSecret.value = state.backendSettings.requestSigningSecret;
  }
  if (dom.backendAuthUsername) {
    dom.backendAuthUsername.value = state.backendSettings.authUsername;
  }
  if (dom.backendAuthPassword) {
    dom.backendAuthPassword.value = state.backendSettings.authPassword;
  }
  if (dom.backendRequired) {
    dom.backendRequired.checked = state.backendSettings.required;
  }
  if (dom.openApiSpecLink) {
    const specUrl = getRuntime()?.runtime?.getURL?.("api/openapi.yaml") ?? "api/openapi.yaml";
    dom.openApiSpecLink.href = specUrl;
    dom.openApiSpecLink.title = specUrl;
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
  setSectionVisibility(dom.backendSettingsSection, state.panelSettings.visibility.showBackendSettings);
  setSectionVisibility(dom.summaryGrid, state.panelSettings.visibility.showSummary);
  setSectionVisibility(dom.deltaPanel, state.panelSettings.visibility.showDelta);
  setSectionVisibility(dom.statusLine, state.panelSettings.visibility.showStatusLine);
  setSectionVisibility(dom.offlinePanel, state.panelSettings.visibility.showOfflineBanner);
  setSectionVisibility(dom.footer, state.panelSettings.visibility.showFooter);
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
    const blob = buildIssuesPdfBlob(state.snapshot, selectedIssues);
    downloadBlob(blob, `stealth-lightbeacon-${state.snapshot.id}.pdf`);
    return;
  }
  const payload = format === "json" ? buildIssueExportJson(selectedIssues, metadata) : buildIssueExportMarkdown(selectedIssues, metadata);
  const extension = format === "json" ? "json" : "md";
  downloadText(payload, `stealth-lightbeacon-${state.snapshot.id}.${extension}`);
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
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
