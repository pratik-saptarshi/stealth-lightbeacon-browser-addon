import {
  buildIssueExportJson,
  buildIssueExportMarkdown,
  buildPopupIssuePanelModel,
  collectSelectors,
  type PopupScanStatus
} from './popup-state';
import {
  BACKEND_SETTINGS_STORAGE_KEY,
  buildBackendRequestFromSettings,
  DEFAULT_BACKEND_SETTINGS,
  normalizeBackendSettings,
  type BackendSettingsForm
} from '../shared/backend-settings';
import { startEventLoopTrace, withEventLoopTrace } from '../shared/performance-trace';
import { buildIssuesPdfBlob } from '../ui/pdf';
import type { DiffResult, Issue, ScanSnapshot } from '../shared/types';
import type { ScanStartReply } from '../shared/message-contracts';

type PopupRuntime = {
  chrome?: {
    runtime?: {
      sendMessage?: (message: unknown) => Promise<unknown>;
      getURL?: (path: string) => string;
    };
    storage?: {
      local?: {
        get?: (keys: string[]) => Promise<Record<string, unknown>>;
        set?: (items: Record<string, unknown>) => Promise<void>;
      };
    };
    tabs?: {
      query?: (query: Record<string, unknown>) => Promise<Array<{ id?: number; url?: string }>>;
    };
  };
  browser?: {
    runtime?: {
      sendMessage?: (message: unknown) => Promise<unknown>;
      getURL?: (path: string) => string;
    };
    storage?: {
      local?: {
        get?: (keys: string[]) => Promise<Record<string, unknown>>;
        set?: (items: Record<string, unknown>) => Promise<void>;
      };
    };
    tabs?: {
      query?: (query: Record<string, unknown>) => Promise<Array<{ id?: number; url?: string }>>;
    };
  };
};

type PopupState = {
  status: PopupScanStatus;
  scanId: string;
  tabId?: number;
  tabUrl?: string;
  snapshot?: ScanSnapshot;
  diff?: DiffResult;
  selectedIssueIds: Set<string>;
  error?: string;
  note?: string;
  backendSettings: BackendSettingsForm;
};

const runtimeHost = (typeof globalThis === 'undefined' ? {} : (globalThis as unknown as PopupRuntime)) as PopupRuntime;

const state: PopupState = {
  status: 'idle',
  scanId: '',
  selectedIssueIds: new Set(),
  backendSettings: { ...DEFAULT_BACKEND_SETTINGS }
};

const dom = {
  shell: null as HTMLElement | null,
  statusPill: null as HTMLElement | null,
  statusLine: null as HTMLElement | null,
  summaryGrid: null as HTMLElement | null,
  deltaPanel: null as HTMLElement | null,
  errorPanel: null as HTMLElement | null,
  offlinePanel: null as HTMLElement | null,
  issuesPanel: null as HTMLElement | null,
  rescanButton: null as HTMLButtonElement | null,
  exportJsonButton: null as HTMLButtonElement | null,
  exportMarkdownButton: null as HTMLButtonElement | null,
  exportPdfButton: null as HTMLButtonElement | null,
  copySelectorsButton: null as HTMLButtonElement | null,
  backendEnabled: null as HTMLInputElement | null,
  backendMode: null as HTMLSelectElement | null,
  backendEndpoint: null as HTMLInputElement | null,
  backendPort: null as HTMLInputElement | null,
  backendSecret: null as HTMLInputElement | null,
  backendAuthUsername: null as HTMLInputElement | null,
  backendAuthPassword: null as HTMLInputElement | null,
  backendRequired: null as HTMLInputElement | null,
  saveBackendButton: null as HTMLButtonElement | null,
  openApiSpecLink: null as HTMLAnchorElement | null
};

document.addEventListener('DOMContentLoaded', () => {
  bindDom();
  bindActions();
  void initialize();
});

function bindDom(): void {
  dom.shell = document.getElementById('popup-shell');
  dom.statusPill = document.getElementById('status-pill');
  dom.statusLine = document.getElementById('status-line');
  dom.summaryGrid = document.getElementById('summary-grid');
  dom.deltaPanel = document.getElementById('delta-panel');
  dom.errorPanel = document.getElementById('error-panel');
  dom.offlinePanel = document.getElementById('offline-panel');
  dom.issuesPanel = document.getElementById('issues-panel');
  dom.rescanButton = document.getElementById('rescan-button') as HTMLButtonElement | null;
  dom.exportJsonButton = document.getElementById('export-json-button') as HTMLButtonElement | null;
  dom.exportMarkdownButton = document.getElementById('export-markdown-button') as HTMLButtonElement | null;
  dom.exportPdfButton = document.getElementById('export-pdf-button') as HTMLButtonElement | null;
  dom.copySelectorsButton = document.getElementById('copy-selectors-button') as HTMLButtonElement | null;
  dom.backendEnabled = document.getElementById('backend-enabled') as HTMLInputElement | null;
  dom.backendMode = document.getElementById('backend-mode') as HTMLSelectElement | null;
  dom.backendEndpoint = document.getElementById('backend-endpoint') as HTMLInputElement | null;
  dom.backendPort = document.getElementById('backend-port') as HTMLInputElement | null;
  dom.backendSecret = document.getElementById('backend-secret') as HTMLInputElement | null;
  dom.backendAuthUsername = document.getElementById('backend-auth-username') as HTMLInputElement | null;
  dom.backendAuthPassword = document.getElementById('backend-auth-password') as HTMLInputElement | null;
  dom.backendRequired = document.getElementById('backend-required') as HTMLInputElement | null;
  dom.saveBackendButton = document.getElementById('save-backend-button') as HTMLButtonElement | null;
  dom.openApiSpecLink = document.getElementById('openapi-spec-link') as HTMLAnchorElement | null;
}

function bindActions(): void {
  dom.rescanButton?.addEventListener('click', () => {
    void startScan(true);
  });

  dom.exportJsonButton?.addEventListener('click', () => {
    void exportCurrentSelection('json');
  });

  dom.exportMarkdownButton?.addEventListener('click', () => {
    void exportCurrentSelection('markdown');
  });

  dom.exportPdfButton?.addEventListener('click', () => {
    void exportCurrentSelection('pdf');
  });

  dom.copySelectorsButton?.addEventListener('click', () => {
    void copySelectedSelectors();
  });

  dom.saveBackendButton?.addEventListener('click', () => {
    void persistBackendSettings();
  });

  bindSettingsInputs();
}

async function initialize(): Promise<void> {
  await withEventLoopTrace('popup.initialize', async () => {
    if (!hasExtensionRuntime()) {
      state.status = 'idle';
      state.note = 'Runtime unavailable';
      render({ offline: true, statusLine: 'Popup shell loaded outside the extension runtime.' });
      return;
    }

    await loadBackendSettings();
    await startScan(false);
  });
}

function hasExtensionRuntime(): boolean {
  return Boolean(runtimeHost.chrome?.runtime?.sendMessage || runtimeHost.browser?.runtime?.sendMessage);
}

function getRuntime(): NonNullable<PopupRuntime['chrome'] | PopupRuntime['browser']> | undefined {
  return runtimeHost.chrome ?? runtimeHost.browser;
}

async function startScan(manual: boolean): Promise<void> {
  await withEventLoopTrace('popup.scan', async () => {
    if (state.status === 'loading') {
      return;
    }

    const runtime = getRuntime();
    if (!runtime?.runtime?.sendMessage || !runtime.tabs?.query) {
      renderError('Extension runtime is unavailable. Reload the addon page and try again.');
      return;
    }

    state.status = 'loading';
    state.error = undefined;
    state.note = manual ? 'Manual rescan running' : 'Initial scan running';
    render();

    try {
      const activeTabs = await runtime.tabs.query({ active: true, currentWindow: true });
      const activeTab = activeTabs[0];
      if (!activeTab?.id) {
        throw new Error('No active tab available for scan');
      }

      if (!activeTab.url) {
        throw new Error('Unable to resolve active tab URL');
      }

      state.tabId = activeTab.id;
      state.tabUrl = activeTab.url;
      state.scanId = createScanId();
      const backend = buildBackendRequestFromSettings(state.backendSettings);
      const reply = (await runtime.runtime.sendMessage({
        type: 'scan:start',
        request: {
          requestId: state.scanId,
          tabId: activeTab.id,
          url: activeTab.url,
          engine: 'dom-lite',
          backend
        },
        persistHistory: true
      })) as ScanStartReply;

      if (!reply.ok) {
        throw new Error(reply.error);
      }

      state.snapshot = reply.payload.snapshot;
      state.diff = reply.payload.diff;
      state.selectedIssueIds.clear();
      state.status = inferStatus(reply.payload);
      state.note = reply.payload.recommendation
        ? `Backend recommendation: ${reply.payload.recommendation.engine}`
        : 'Scan complete';
      render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.error = message;
      state.status = message.toLowerCase().includes('fallback') ? 'fallback' : 'failed';
      state.note = 'Scan failed';
      renderError(message);
    }
  });
}

function inferStatus(payload: { recommendation?: { confidence: number } }): PopupScanStatus {
  if (payload.recommendation && payload.recommendation.confidence < 0.5) {
    return 'fallback';
  }

  return 'complete';
}

function render(options?: { offline?: boolean; statusLine?: string }): void {
  const trace = startEventLoopTrace('popup.render');
  try {
    if (options?.offline) {
      dom.offlinePanel?.classList.remove('hidden');
    } else {
      dom.offlinePanel?.classList.add('hidden');
    }

    if (dom.statusPill) {
      dom.statusPill.dataset.status = state.status;
      dom.statusPill.textContent = statusLabel(state.status);
    }

    if (dom.statusLine) {
      dom.statusLine.textContent = options?.statusLine ?? buildStatusLine();
    }

    if (dom.rescanButton) {
      dom.rescanButton.disabled = state.status === 'loading' || !hasExtensionRuntime();
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

    renderSettings();

    renderSummary();
    renderDelta();
    renderIssues();
    hideError();
  } finally {
    trace.end(state.snapshot ? `issues=${state.snapshot.summary.total}` : 'empty');
  }
}

function renderSummary(): void {
  if (!dom.summaryGrid) {
    return;
  }

  const counts = state.snapshot?.summary.bySeverity ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const total = state.snapshot?.summary.total ?? 0;
  const generatedAt = state.snapshot ? new Date(state.snapshot.timestamp).toLocaleString() : 'No scan yet';

  dom.summaryGrid.innerHTML = [
    metricCard('Total', total.toString()),
    metricCard('Critical', String(counts.critical ?? 0)),
    metricCard('High', String(counts.high ?? 0)),
    metricCard('Medium', String(counts.medium ?? 0)),
    metricCard('Low', String(counts.low ?? 0)),
    metricCard('Scan', generatedAt)
  ].join('');
}

function metricCard(label: string, value: string): string {
  return `<article class="metric" data-testid="issue-summary"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></article>`;
}

function renderDelta(): void {
  if (!dom.deltaPanel) {
    return;
  }

  const delta = state.snapshot && state.diff ? buildPopupIssuePanelModel(state.snapshot, state.diff, state.status).delta : undefined;
  if (!delta) {
    dom.deltaPanel.classList.add('hidden');
    dom.deltaPanel.innerHTML = '';
    return;
  }

  dom.deltaPanel.classList.remove('hidden');
  dom.deltaPanel.innerHTML = `
    <strong>Delta summary</strong>
    <div class="delta-chips" data-testid="delta-chips">
      <span class="chip new">New ${delta.newCount}</span>
      <span class="chip fixed">Fixed ${delta.fixedCount}</span>
      <span class="chip unchanged">Estimated unchanged ${delta.unchangedCount}</span>
    </div>
  `;
}

function renderIssues(): void {
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

  dom.issuesPanel.innerHTML = model.domains
    .map(
      (domain, index) => `
        <details class="domain-card" ${index === 0 ? 'open' : ''} data-testid="issue-domain">
          <summary>
            <div>
              <span class="domain-name">${escapeHtml(domain.domain)}</span>
              <span class="domain-count">${domain.total} issue${domain.total === 1 ? '' : 's'}</span>
            </div>
            <div class="severity-row" aria-label="Severity counts">
              ${severityChip('critical', domain.counts.critical)}
              ${severityChip('high', domain.counts.high)}
              ${severityChip('medium', domain.counts.medium)}
              ${severityChip('low', domain.counts.low)}
            </div>
          </summary>
          <div class="domain-body">
            ${domain.groups
              .map(
                (group) => `
                  <section class="severity-section">
                    <h3 class="severity-title">${escapeHtml(group.severity)} (${group.issues.length})</h3>
                    ${group.issues.map((issue) => renderIssueCard(issue)).join('')}
                  </section>
                `
              )
              .join('')}
          </div>
        </details>
      `
    )
    .join('');

  dom.issuesPanel.querySelectorAll<HTMLInputElement>('input[data-issue-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedIssueIds.add(checkbox.dataset.issueId ?? '');
      } else {
        state.selectedIssueIds.delete(checkbox.dataset.issueId ?? '');
      }

      render();
    });
  });

  dom.issuesPanel.querySelectorAll<HTMLButtonElement>('button[data-copy-selector]').forEach((button) => {
    button.addEventListener('click', () => {
      const issueId = button.dataset.copySelector ?? '';
      void copySelectorsForIssues([issueId]);
    });
  });
}

function severityChip(severity: string, count: number): string {
  return `<span class="severity-chip ${escapeHtml(severity)}">${escapeHtml(severity)} ${count}</span>`;
}

function renderIssueCard(issue: Issue): string {
  const checked = state.selectedIssueIds.has(issue.id) ? 'checked' : '';
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
              ${issue.selector ? `<span>${escapeHtml(issue.selector)}</span>` : ''}
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

function buildStatusLine(): string {
  if (state.status === 'loading') {
    return `Scanning active tab${state.tabUrl ? ` · ${state.tabUrl}` : ''}...`;
  }

  if (state.snapshot) {
    return `${state.snapshot.url} · ${state.snapshot.summary.total} issues · ${state.snapshot.engine}`;
  }

  return state.note ?? 'Scan state will appear here.';
}

function statusLabel(status: PopupScanStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    case 'fallback':
      return 'Fallback';
    default:
      return 'Idle';
  }
}

function renderError(message: string): void {
  if (!dom.errorPanel) {
    return;
  }

  dom.errorPanel.classList.remove('hidden');
  dom.errorPanel.textContent = message;
  dom.statusLine && (dom.statusLine.textContent = message);
  dom.statusPill && (dom.statusPill.dataset.status = state.status);
  dom.statusPill && (dom.statusPill.textContent = statusLabel(state.status));
}

function hideError(): void {
  if (!dom.errorPanel) {
    return;
  }

  if (!state.error) {
    dom.errorPanel.classList.add('hidden');
    dom.errorPanel.textContent = '';
    return;
  }

  dom.errorPanel.classList.remove('hidden');
  dom.errorPanel.textContent = state.error;
}

function bindSettingsInputs(): void {
  const update = () => {
    state.backendSettings = readBackendSettingsFromDom();
  };

  dom.backendEnabled?.addEventListener('change', update);
  dom.backendMode?.addEventListener('change', update);
  dom.backendEndpoint?.addEventListener('input', update);
  dom.backendPort?.addEventListener('input', update);
  dom.backendSecret?.addEventListener('input', update);
  dom.backendAuthUsername?.addEventListener('input', update);
  dom.backendAuthPassword?.addEventListener('input', update);
  dom.backendRequired?.addEventListener('change', update);
}

async function loadBackendSettings(): Promise<void> {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    state.backendSettings = { ...DEFAULT_BACKEND_SETTINGS };
    renderSettings();
    return;
  }

  const payload = await storage.get([BACKEND_SETTINGS_STORAGE_KEY]);
  state.backendSettings = normalizeBackendSettings(payload[BACKEND_SETTINGS_STORAGE_KEY]);
  renderSettings();
}

async function persistBackendSettings(): Promise<void> {
  state.backendSettings = readBackendSettingsFromDom();
  const storage = getRuntime()?.storage?.local;

  if (storage?.set) {
    await storage.set({ [BACKEND_SETTINGS_STORAGE_KEY]: state.backendSettings });
  }

  state.note = state.backendSettings.enabled ? 'Backend settings saved' : 'Backend settings cleared';
  render();
}

function renderSettings(): void {
  if (!dom.backendEnabled) {
    return;
  }

  dom.backendEnabled.checked = state.backendSettings.enabled;
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
    const specUrl = getRuntime()?.runtime?.getURL?.('api/openapi.yaml') ?? 'api/openapi.yaml';
    dom.openApiSpecLink.href = specUrl;
    dom.openApiSpecLink.title = specUrl;
  }
}

function readBackendSettingsFromDom(): BackendSettingsForm {
  return normalizeBackendSettings({
    enabled: dom.backendEnabled?.checked ?? DEFAULT_BACKEND_SETTINGS.enabled,
    mode: dom.backendMode?.value === 'stdin' ? 'stdin' : 'http',
    endpoint: dom.backendEndpoint?.value ?? DEFAULT_BACKEND_SETTINGS.endpoint,
    port: dom.backendPort?.value ?? DEFAULT_BACKEND_SETTINGS.port,
    requestSigningSecret: dom.backendSecret?.value ?? DEFAULT_BACKEND_SETTINGS.requestSigningSecret,
    authUsername: dom.backendAuthUsername?.value ?? DEFAULT_BACKEND_SETTINGS.authUsername,
    authPassword: dom.backendAuthPassword?.value ?? DEFAULT_BACKEND_SETTINGS.authPassword,
    required: dom.backendRequired?.checked ?? DEFAULT_BACKEND_SETTINGS.required
  });
}

function getSelectedIssues(): Issue[] {
  if (!state.snapshot) {
    return [];
  }

  return state.snapshot.issues.filter((issue) => state.selectedIssueIds.has(issue.id));
}

async function exportCurrentSelection(format: 'json' | 'markdown' | 'pdf'): Promise<void> {
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

  if (format === 'pdf') {
    const blob = buildIssuesPdfBlob(state.snapshot, selectedIssues);
    downloadBlob(blob, `stealth-lightbeacon-${state.snapshot.id}.pdf`);
    return;
  }

  const payload =
    format === 'json'
      ? buildIssueExportJson(selectedIssues, metadata)
      : buildIssueExportMarkdown(selectedIssues, metadata);

  const extension = format === 'json' ? 'json' : 'md';
  downloadText(payload, `stealth-lightbeacon-${state.snapshot.id}.${extension}`);
}

async function copySelectedSelectors(): Promise<void> {
  await copySelectorsForIssues(Array.from(state.selectedIssueIds));
}

async function copySelectorsForIssues(issueIds: string[]): Promise<void> {
  if (!state.snapshot) {
    return;
  }

  const selectedIssues = state.snapshot.issues.filter((issue) => issueIds.includes(issue.id));
  const selectors = collectSelectors(selectedIssues);

  if (!selectors.length) {
    return;
  }

  await copyToClipboard(selectors.join('\n'));
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    state.note = 'Selectors copied to clipboard';
    render();
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
    state.note = 'Selectors copied to clipboard';
    render();
  }
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

function createScanId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
