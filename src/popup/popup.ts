import {
  buildIssueExportJson,
  buildIssueExportMarkdown,
  buildReportDownloadPath,
  buildPopupUiState,
  buildPopupIssuePanelModel,
  collectSelectors,
  normalizePopupUiState,
  POPUP_UI_STATE_STORAGE_KEY,
  type PopupUiState,
  type PopupScanStatus
} from './popup-state';
import { buildReport } from '../ui/export';
import {
  BACKEND_SETTINGS_STORAGE_KEY,
  buildBackendRequestFromSettings,
  DEFAULT_BACKEND_SETTINGS,
  normalizeBackendSettings,
  type BackendSettingsForm
} from '../shared/backend-settings';
import {
  BUG_REPORT_EMAIL,
  buildAccessibilityProfileSummary,
  buildBugReportMailto,
  DEFAULT_PANEL_SETTINGS,
  PANEL_SETTINGS_STORAGE_KEY,
  normalizePanelSettings,
  type PanelSettingsForm
} from '../shared/panel-settings';
import { startEventLoopTrace, withEventLoopTrace } from '../shared/performance-trace';
import type { DiffResult, Issue, RuleDomain, ScanSnapshot } from '../shared/types';
import type { HistoryCompareReply, HistoryListReply, ReportBuildReply, ScanStartReply } from '../shared/message-contracts';

type PopupTab = 'overview' | 'connection' | 'results' | 'settings';

type PopupRuntime = {
  chrome?: {
    runtime?: {
      sendMessage?: (message: unknown) => Promise<unknown>;
      getURL?: (path: string) => string;
      getManifest?: () => { version?: string };
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
      getManifest?: () => { version?: string };
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
  activeTab: PopupTab;
  tabId?: number;
  tabUrl?: string;
  snapshot?: ScanSnapshot;
  diff?: DiffResult;
  historySnapshots: ScanSnapshot[];
  selectedIssueIds: Set<string>;
  error?: string;
  note?: string;
  backendSettings: BackendSettingsForm;
  panelSettings: PanelSettingsForm;
  settingsOpen: boolean;
  resultsExpanded: boolean;
  settingsFocusTarget: 'toggle' | 'close' | null;
};

const runtimeHost = (typeof globalThis === 'undefined' ? {} : (globalThis as unknown as PopupRuntime)) as PopupRuntime;

const state: PopupState = {
  status: 'idle',
  scanId: '',
  activeTab: 'overview',
  historySnapshots: [],
  selectedIssueIds: new Set(),
  backendSettings: { ...DEFAULT_BACKEND_SETTINGS },
  panelSettings: { ...DEFAULT_PANEL_SETTINGS },
  settingsOpen: false,
  resultsExpanded: true,
  settingsFocusTarget: null
};

let startupHydration: Promise<void> | undefined;
let popupUiSettingsTouched = false;

const dom = {
  shell: null as HTMLElement | null,
  statusPill: null as HTMLElement | null,
  statusLine: null as HTMLElement | null,
  summaryGrid: null as HTMLElement | null,
  deltaPanel: null as HTMLElement | null,
  errorPanel: null as HTMLElement | null,
  offlinePanel: null as HTMLElement | null,
  controlsSection: null as HTMLElement | null,
  footer: null as HTMLElement | null,
  issuesPanel: null as HTMLElement | null,
  overviewPanel: null as HTMLElement | null,
  connectionPanel: null as HTMLElement | null,
  resultsPanel: null as HTMLElement | null,
  historyPanel: null as HTMLElement | null,
  rescanButton: null as HTMLButtonElement | null,
  exportJsonButton: null as HTMLButtonElement | null,
  exportMarkdownButton: null as HTMLButtonElement | null,
  exportHtmlButton: null as HTMLButtonElement | null,
  exportPdfButton: null as HTMLButtonElement | null,
  copySelectorsButton: null as HTMLButtonElement | null,
  collapseResultsButton: null as HTMLButtonElement | null,
  expandResultsButton: null as HTMLButtonElement | null,
  settingsToggleButton: null as HTMLButtonElement | null,
  settingsCloseButton: null as HTMLButtonElement | null,
  settingsPanel: null as HTMLElement | null,
  backendSettingsSection: null as HTMLElement | null,
  bugReportLink: null as HTMLAnchorElement | null,
  backendEnabled: null as HTMLInputElement | null,
  backendMode: null as HTMLSelectElement | null,
  backendEndpoint: null as HTMLInputElement | null,
  backendPort: null as HTMLInputElement | null,
  backendSecret: null as HTMLInputElement | null,
  backendAuthUsername: null as HTMLInputElement | null,
  backendAuthPassword: null as HTMLInputElement | null,
  backendRequired: null as HTMLInputElement | null,
  openApiSpecLink: null as HTMLAnchorElement | null,
  accessibilityWcagLevel: null as HTMLSelectElement | null,
  accessibilityBestPractices: null as HTMLInputElement | null,
  accessibilityProfileSummary: null as HTMLElement | null,
  themeInputs: [] as HTMLInputElement[],
  visibilityInputs: [] as HTMLInputElement[],
  tabButtons: [] as HTMLButtonElement[]
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
  dom.settingsToggleButton = document.getElementById('settings-toggle-button') as HTMLButtonElement | null;
  dom.settingsCloseButton = document.getElementById('settings-close-button') as HTMLButtonElement | null;
  dom.overviewPanel = document.getElementById('overview-panel');
  dom.connectionPanel = document.getElementById('connection-panel');
  dom.resultsPanel = document.getElementById('results-panel');
  dom.historyPanel = document.getElementById('history-panel');
  dom.settingsPanel = document.getElementById('settings-panel');
  dom.backendSettingsSection = document.getElementById('backend-settings-section');
  dom.bugReportLink = document.getElementById('bug-report-link') as HTMLAnchorElement | null;
  dom.controlsSection = document.querySelector('.controls');
  dom.summaryGrid = document.getElementById('summary-grid');
  dom.deltaPanel = document.getElementById('delta-panel');
  dom.errorPanel = document.getElementById('error-panel');
  dom.offlinePanel = document.getElementById('offline-panel');
  dom.footer = document.getElementById('footer');
  dom.issuesPanel = document.getElementById('issues-panel');
  dom.rescanButton = document.getElementById('rescan-button') as HTMLButtonElement | null;
  dom.exportJsonButton = document.getElementById('export-json-button') as HTMLButtonElement | null;
  dom.exportMarkdownButton = document.getElementById('export-markdown-button') as HTMLButtonElement | null;
  dom.exportHtmlButton = document.getElementById('export-html-button') as HTMLButtonElement | null;
  dom.exportPdfButton = document.getElementById('export-pdf-button') as HTMLButtonElement | null;
  dom.copySelectorsButton = document.getElementById('copy-selectors-button') as HTMLButtonElement | null;
  dom.collapseResultsButton = document.getElementById('collapse-results-button') as HTMLButtonElement | null;
  dom.expandResultsButton = document.getElementById('expand-results-button') as HTMLButtonElement | null;
  dom.backendEnabled = document.getElementById('backend-enabled') as HTMLInputElement | null;
  dom.backendMode = document.getElementById('backend-mode') as HTMLSelectElement | null;
  dom.backendEndpoint = document.getElementById('backend-endpoint') as HTMLInputElement | null;
  dom.backendPort = document.getElementById('backend-port') as HTMLInputElement | null;
  dom.backendSecret = document.getElementById('backend-secret') as HTMLInputElement | null;
  dom.backendAuthUsername = document.getElementById('backend-auth-username') as HTMLInputElement | null;
  dom.backendAuthPassword = document.getElementById('backend-auth-password') as HTMLInputElement | null;
  dom.backendRequired = document.getElementById('backend-required') as HTMLInputElement | null;
  dom.openApiSpecLink = document.getElementById('openapi-spec-link') as HTMLAnchorElement | null;
  dom.accessibilityWcagLevel = document.getElementById('accessibility-wcag-level') as HTMLSelectElement | null;
  dom.accessibilityBestPractices = document.getElementById('accessibility-best-practices') as HTMLInputElement | null;
  dom.accessibilityProfileSummary = document.getElementById('accessibility-profile-summary');
  dom.themeInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-theme-setting]'));
  dom.visibilityInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-visibility-setting]'));
  dom.tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-popup-tab]'));
}

function bindActions(): void {
  dom.settingsToggleButton?.addEventListener('click', () => {
    state.settingsOpen = !state.settingsOpen;
    popupUiSettingsTouched = true;
    state.settingsFocusTarget = state.settingsOpen ? 'close' : 'toggle';
    render();
    void persistPopupUiState();
  });

  dom.settingsCloseButton?.addEventListener('click', () => {
    state.settingsOpen = false;
    state.activeTab = 'overview';
    popupUiSettingsTouched = true;
    state.settingsFocusTarget = 'toggle';
    render();
    void persistPopupUiState();
  });

  dom.settingsPanel?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    state.settingsOpen = false;
    state.settingsFocusTarget = 'toggle';
    render();
    void persistPopupUiState();
    dom.settingsToggleButton?.focus();
  });

  dom.rescanButton?.addEventListener('click', () => {
    void startScan(true);
  });

  dom.exportJsonButton?.addEventListener('click', () => {
    void exportCurrentSelection('json');
  });

  dom.exportMarkdownButton?.addEventListener('click', () => {
    void exportCurrentSelection('markdown');
  });

  dom.exportHtmlButton?.addEventListener('click', () => {
    void downloadCurrentReport('html');
  });

  dom.exportPdfButton?.addEventListener('click', () => {
    void exportCurrentSelection('pdf');
  });

  dom.copySelectorsButton?.addEventListener('click', () => {
    void copySelectedSelectors();
  });

  dom.collapseResultsButton?.addEventListener('click', () => {
    state.resultsExpanded = false;
    render();
  });

  dom.expandResultsButton?.addEventListener('click', () => {
    state.resultsExpanded = true;
    render();
  });

  for (const button of dom.tabButtons) {
    button.addEventListener('click', () => {
      const tab = button.dataset.popupTab as PopupTab | undefined;
      if (!tab) {
        return;
      }

      setActiveTab(tab);
    });
  }

  bindSettingsInputs();
}

function setActiveTab(tab: PopupTab): void {
  state.activeTab = tab;
  state.settingsOpen = tab === 'settings';
  render();
}

export async function initialize(): Promise<void> {
  await withEventLoopTrace('popup.initialize', async () => {
    if (!hasExtensionRuntime()) {
      state.status = 'idle';
      state.note = 'Runtime unavailable';
      render({
        offline: true,
        statusLine: 'Popup shell loaded outside the extension runtime.',
        lightweight: true
      });
      return;
    }

    state.note = 'Loading saved settings and cached scan...';
    render({ statusLine: state.note, lightweight: true });
    startupHydration = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void hydrateStartupState()
          .then(resolve)
          .catch(reject);
      }, 0);
    });
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
    await ensureStartupHydrated();

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
          ruleCategories: buildRuleCategoriesFromAccessibilityProfile(),
          accessibilityProfile: { ...state.panelSettings.accessibility },
          backend
        },
        persistHistory: true
      })) as ScanStartReply;

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
      state.note = reply.payload.recommendation
        ? `Backend recommendation: ${reply.payload.recommendation.engine}`
        : 'Scan complete';
      state.activeTab = 'results';
      void persistPopupUiState();
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

async function hydrateStartupState(): Promise<void> {
  try {
    const [backendSettings, panelSettings, popupUiState, loadedCachedScan, historySnapshots] = await Promise.all([
      loadBackendSettings(),
      loadPanelSettings(),
      loadPopupUiState(),
      loadCachedScanFromHistory(),
      loadHistoryFromHistory()
    ]);

    state.backendSettings = backendSettings;
    state.panelSettings = panelSettings;
    state.historySnapshots = historySnapshots;

    if (!loadedCachedScan) {
      state.snapshot = undefined;
      state.diff = undefined;
      state.selectedIssueIds.clear();
      state.status = 'idle';
      state.note = 'No cached scan found. Click Rescan to scan the active tab.';
      state.activeTab = 'overview';
    } else {
      state.activeTab = 'results';
    }

    applyPopupUiState(popupUiState);
    render();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.error = message;
    state.status = 'failed';
    state.note = 'Startup hydration failed';
    renderError(message);
  }
}

async function ensureStartupHydrated(): Promise<void> {
  if (!startupHydration) {
    return;
  }

  await startupHydration;
}

function inferStatus(payload: { recommendation?: { confidence: number } }): PopupScanStatus {
  if (payload.recommendation && payload.recommendation.confidence < 0.5) {
    return 'fallback';
  }

  return 'complete';
}

function render(options?: { offline?: boolean; statusLine?: string; lightweight?: boolean }): void {
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
    renderConnectionPanel();
    renderHistoryPanel();

    renderSummary();
    renderDelta();
    renderIssues();
    hideError();
  } finally {
    trace.end(state.snapshot ? `issues=${state.snapshot.summary.total}` : 'empty');
  }
}

function renderTabNavigation(): void {
  for (const button of dom.tabButtons) {
    const tab = button.dataset.popupTab as PopupTab | undefined;
    const selected = tab === state.activeTab;
    button.setAttribute('aria-selected', String(selected));
    button.classList.toggle('is-active', selected);
  }

  if (dom.settingsToggleButton) {
    dom.settingsToggleButton.setAttribute('aria-expanded', String(state.activeTab === 'settings'));
  }
}

function renderTabPanels(): void {
  const setPanelHidden = (panel: HTMLElement | null | undefined, hidden: boolean) => {
    if (!panel) {
      return;
    }

    panel.classList.toggle('hidden', hidden);
  };

  setPanelHidden(dom.overviewPanel, state.activeTab !== 'overview');
  setPanelHidden(dom.connectionPanel, state.activeTab !== 'connection');
  setPanelHidden(dom.resultsPanel, state.activeTab !== 'results');
  setPanelHidden(dom.settingsPanel, state.activeTab !== 'settings');
}

function renderOverviewPanel(): void {
  if (!dom.overviewPanel) {
    return;
  }

  const snapshot = state.snapshot;
  const issueCount = snapshot?.summary.total ?? 0;
  const historyCount = state.historySnapshots.length;
  const backendMode = state.backendSettings.enabled
    ? state.backendSettings.mode === 'stdin'
      ? 'Standalone stdin mode'
      : 'Remote HTTP backend'
    : 'Local-only audit mode';

  dom.overviewPanel.innerHTML = `
    <section class="overview-grid" aria-label="Popup overview">
      <article class="info-card">
        <p class="eyebrow">Connection</p>
        <h2>Standalone audit</h2>
        <p>${escapeHtml(
          state.backendSettings.enabled && state.backendSettings.mode === 'stdin'
            ? 'Run locally with the packaged stdin adapter and bundled rules.'
            : 'Run locally without an external dependency, or switch to HTTP when needed.'
        )}</p>
        <button type="button" data-popup-tab="connection">Open Connection</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Results</p>
        <h2>Recent runs and reports</h2>
        <p>${escapeHtml(`Review ${historyCount} saved runs, collapse issue groups, and download standard reports.`)}</p>
        <button type="button" data-popup-tab="results">Open Results</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Settings</p>
        <h2>Theme grid and visibility</h2>
        <p>Adjust colors, toggle optional sections, and keep the popup compact on smaller screens.</p>
        <button type="button" data-popup-tab="settings">Open Settings</button>
      </article>
      <article class="info-card">
        <p class="eyebrow">Current state</p>
        <h2>${escapeHtml(snapshot ? snapshot.url : 'No scan yet')}</h2>
        <p>${escapeHtml(snapshot ? `${issueCount} issues · ${snapshot.engine}` : state.note ?? 'Waiting for a scan')}</p>
        <p>${escapeHtml(`Mode: ${backendMode}`)}</p>
      </article>
    </section>
  `;

  dom.overviewPanel.querySelectorAll<HTMLButtonElement>('button[data-popup-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.popupTab as PopupTab | undefined;
      if (tab) {
        setActiveTab(tab);
      }
    });
  });
}

function renderConnectionPanel(): void {
  if (!dom.connectionPanel) {
    return;
  }

  if (dom.connectionPanel.classList.contains('hidden')) {
    return;
  }

  const standalone = !state.backendSettings.enabled || state.backendSettings.mode === 'stdin';
  const modeLabel = state.backendSettings.enabled
    ? state.backendSettings.mode === 'stdin'
      ? 'Standalone stdin engine'
      : 'Remote HTTP backend'
    : 'Standalone local-only audit mode';
  const summary =
    standalone && state.backendSettings.enabled
      ? 'Standalone execution is enabled. The service worker can run the audit locally through the packaged stdin adapter, parse testrun output, and keep reporting offline.'
      : state.backendSettings.enabled
        ? 'Backend settings are configured for a remote HTTP endpoint, but the popup still retains local audit and report generation capabilities.'
        : 'Standalone execution is available without an external dependency. The popup can run an audit locally and still produce standard reports.';

  const summaryHost = dom.connectionPanel.querySelector<HTMLElement>('#connection-summary');
  if (summaryHost) {
    summaryHost.innerHTML = `
      <article class="connection-callout">
        <p class="eyebrow">Connection state</p>
        <h2>${escapeHtml(modeLabel)}</h2>
        <p>${escapeHtml(summary)}</p>
        <ul>
          <li>Bundled rules remain available in the popup and service worker.</li>
          <li>History lookups and report generation use the background message bridge.</li>
          <li>Markdown, HTML, JSON, and PDF outputs stay available for saved runs.</li>
        </ul>
      </article>
    `;
  }
}

function renderHistoryPanel(): void {
  if (!dom.historyPanel) {
    return;
  }

  if (!state.historySnapshots.length) {
    dom.historyPanel.innerHTML = `<section class="history-empty" data-testid="history-empty">No saved runs yet.</section>`;
    return;
  }

  dom.historyPanel.innerHTML = state.historySnapshots
    .map((snapshot, index) => {
      const isLatest = index === 0;
      return `
        <details class="history-entry" data-testid="history-entry" ${state.resultsExpanded ? 'open' : ''}>
          <summary>
            <div>
              <span class="history-title">${escapeHtml(snapshot.url)}</span>
              <span class="history-meta">${new Date(snapshot.timestamp).toLocaleString()} · ${snapshot.summary.total} issues · ${escapeHtml(snapshot.engine)}</span>
            </div>
            <div class="history-actions" aria-label="Report downloads">
              <button type="button" data-history-report="json" data-history-index="${index}">JSON</button>
              <button type="button" data-history-report="markdown" data-history-index="${index}">Markdown</button>
              <button type="button" data-history-report="html" data-history-index="${index}">HTML</button>
              <button type="button" data-history-report="pdf" data-history-index="${index}">PDF</button>
              ${isLatest ? '<span class="history-badge">Latest</span>' : ''}
            </div>
          </summary>
        </details>
      `;
    })
    .join('');

  dom.historyPanel.querySelectorAll<HTMLButtonElement>('button[data-history-report]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const index = Number(button.dataset.historyIndex ?? '0');
      const snapshot = state.historySnapshots[index];
      const format = button.dataset.historyReport as 'json' | 'markdown' | 'html' | 'pdf' | undefined;
      if (!snapshot || !format) {
        return;
      }

      void downloadReportForSnapshot(snapshot, format);
    });
  });
}

function renderSummary(): void {
  if (!dom.summaryGrid) {
    return;
  }

  if (!state.panelSettings.visibility.showSummary) {
    dom.summaryGrid.classList.add('hidden');
    dom.summaryGrid.innerHTML = '';
    return;
  }

  dom.summaryGrid.classList.remove('hidden');

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

  if (!state.panelSettings.visibility.showDelta) {
    dom.deltaPanel.classList.add('hidden');
    dom.deltaPanel.innerHTML = '';
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
      (domain) => `
        <details class="domain-card" ${state.resultsExpanded ? 'open' : ''} data-testid="issue-domain">
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
      void persistPopupUiState();
    });
  });

  dom.issuesPanel.querySelectorAll<HTMLButtonElement>('button[data-copy-selector]').forEach((button) => {
    button.addEventListener('click', () => {
      const issueId = button.dataset.copySelector ?? '';
      void copySelectorsForIssues([issueId]);
    });
  });

  dom.issuesPanel.querySelectorAll<HTMLButtonElement>('button[data-highlight-selector]').forEach((button) => {
    button.addEventListener('click', () => {
      const selector = button.dataset.highlightSelector ?? '';
      if (!selector) {
        return;
      }

      void sendHighlightAction({
        type: 'issue:highlight',
        selector
      });
    });
  });

  dom.issuesPanel.querySelectorAll<HTMLButtonElement>('button[data-clear-highlight]').forEach((button) => {
    button.addEventListener('click', () => {
      void sendHighlightAction({
        type: 'issue:clear-highlight'
      });
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
        ${issue.selector ? `<button type="button" data-highlight-selector="${escapeAttr(issue.selector)}">Highlight</button>` : ''}
        <button type="button" data-clear-highlight="true">Clear highlight</button>
      </div>
    </article>
  `;
}

async function sendHighlightAction(
  action: { type: 'issue:highlight'; selector: string } | { type: 'issue:clear-highlight' }
): Promise<void> {
  const runtime = getRuntime();
  if (!runtime?.runtime?.sendMessage) {
    return;
  }

  const message = state.tabId
    ? {
        ...action,
        tabId: state.tabId
      }
    : action;

  await runtime.runtime.sendMessage(message);
}

function buildStatusLine(): string {
  if (state.status === 'loading') {
    return `Scanning active tab${state.tabUrl ? ` · ${state.tabUrl}` : ''}...`;
  }

  if (state.snapshot) {
    const selectedCount = state.selectedIssueIds.size;
    return `${state.snapshot.url} · ${state.snapshot.summary.total} issues${selectedCount ? ` · ${selectedCount} selected` : ''} · ${state.snapshot.engine}`;
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
  const updateBackend = () => {
    state.backendSettings = readBackendSettingsFromDom();
    void persistBackendSettings();
  };

  const updatePanel = () => {
    state.panelSettings = readPanelSettingsFromDom();
    void persistPanelSettings();
    render();
  };

  dom.backendEnabled?.addEventListener('change', updateBackend);
  dom.backendMode?.addEventListener('change', updateBackend);
  dom.backendEndpoint?.addEventListener('change', updateBackend);
  dom.backendPort?.addEventListener('change', updateBackend);
  dom.backendSecret?.addEventListener('change', updateBackend);
  dom.backendAuthUsername?.addEventListener('change', updateBackend);
  dom.backendAuthPassword?.addEventListener('change', updateBackend);
  dom.backendRequired?.addEventListener('change', updateBackend);
  dom.accessibilityWcagLevel?.addEventListener('change', updatePanel);
  dom.accessibilityBestPractices?.addEventListener('change', updatePanel);

  for (const input of dom.themeInputs) {
    input.addEventListener('change', updatePanel);
  }

  for (const input of dom.visibilityInputs) {
    input.addEventListener('change', updatePanel);
  }
}

async function loadBackendSettings(): Promise<BackendSettingsForm> {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return { ...DEFAULT_BACKEND_SETTINGS };
  }

  const payload = await storage.get([BACKEND_SETTINGS_STORAGE_KEY]);
  return normalizeBackendSettings(payload[BACKEND_SETTINGS_STORAGE_KEY]);
}

async function loadPanelSettings(): Promise<PanelSettingsForm> {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return { ...DEFAULT_PANEL_SETTINGS };
  }

  const payload = await storage.get([PANEL_SETTINGS_STORAGE_KEY]);
  return normalizePanelSettings(payload[PANEL_SETTINGS_STORAGE_KEY]);
}

async function loadPopupUiState(): Promise<PopupUiState> {
  const storage = getRuntime()?.storage?.local;
  if (!storage?.get) {
    return normalizePopupUiState(undefined);
  }

  const payload = await storage.get([POPUP_UI_STATE_STORAGE_KEY]);
  return normalizePopupUiState(payload[POPUP_UI_STATE_STORAGE_KEY]);
}

async function loadCachedScanFromHistory(): Promise<boolean> {
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
    const reply = (await runtime.runtime.sendMessage({
      type: 'history:compare',
      origin: activeUrl.origin
    })) as HistoryCompareReply;

    state.tabId = activeTab.id;
    state.tabUrl = activeTab.url;

    if (!reply.ok || !reply.payload.latest) {
      return false;
    }

    state.snapshot = reply.payload.latest;
    state.diff = reply.payload.diff;
    state.selectedIssueIds.clear();
    state.status = 'complete';
    state.note = 'Cached scan loaded';
    return true;
  } catch {
    return false;
  }
}

async function loadHistoryFromHistory(): Promise<ScanSnapshot[]> {
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
    const reply = (await runtime.runtime.sendMessage({
      type: 'history:list',
      origin
    })) as HistoryListReply;

    if (!reply.ok) {
      return [];
    }

    return [...(reply.payload.snapshots ?? [])].sort((left, right) => right.timestamp - left.timestamp);
  } catch {
    return [];
  }
}

async function persistBackendSettings(): Promise<void> {
  state.backendSettings = readBackendSettingsFromDom();
  const storage = getRuntime()?.storage?.local;

  if (storage?.set) {
    await storage.set({ [BACKEND_SETTINGS_STORAGE_KEY]: state.backendSettings });
  }
}

async function persistPanelSettings(): Promise<void> {
  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({ [PANEL_SETTINGS_STORAGE_KEY]: state.panelSettings });
  }
}

async function persistPopupUiState(): Promise<void> {
  await ensureStartupHydrated();

  const storage = getRuntime()?.storage?.local;
  if (storage?.set) {
    await storage.set({
      [POPUP_UI_STATE_STORAGE_KEY]: buildPopupUiState({
        settingsOpen: state.settingsOpen,
        scanId: state.snapshot?.id,
        selectedIssueIds: state.selectedIssueIds
      })
    });
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

function readPanelSettingsFromDom(): PanelSettingsForm {
  return normalizePanelSettings({
    theme: readThemeSettingsFromDom(),
    visibility: readVisibilitySettingsFromDom(),
    accessibility: {
      wcagLevel: dom.accessibilityWcagLevel?.value,
      includeBestPractices: dom.accessibilityBestPractices?.checked
    }
  });
}

function readThemeSettingsFromDom(): Record<string, string> {
  const theme: Record<string, string> = {};
  for (const input of dom.themeInputs) {
    const key = input.dataset.themeSetting;
    if (!key) {
      continue;
    }

    theme[key] = input.value;
  }

  return theme;
}

function readVisibilitySettingsFromDom(): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  for (const input of dom.visibilityInputs) {
    const key = input.dataset.visibilitySetting;
    if (!key) {
      continue;
    }

    visibility[key] = input.checked;
  }

  return visibility;
}

function buildRuleCategoriesFromAccessibilityProfile(): RuleDomain[] {
  const categories: RuleDomain[] = ['accessibility'];
  const profile = state.panelSettings.accessibility;

  if (profile.wcagLevel === 'AA' || profile.wcagLevel === 'AAA') {
    categories.push('WCAG2.1AA');
  }
  if (profile.wcagLevel === 'AAA') {
    categories.push('WCAG2.2AA');
  }
  if (profile.includeBestPractices) {
    categories.push('ux');
  }

  return categories;
}

function renderPanelSettings(): void {
  applyPanelTheme();
  applyVisibilitySettings();
  renderSettingsForm();
  renderBugReportLink();
}

function renderSettingsForm(): void {
  if (dom.settingsToggleButton) {
    dom.settingsToggleButton.setAttribute('aria-expanded', String(state.settingsOpen));
  }

  if (dom.settingsPanel) {
    dom.settingsPanel.classList.toggle('hidden', !state.settingsOpen);
  }

  if (state.settingsFocusTarget === 'close') {
    dom.settingsCloseButton?.focus();
    state.settingsFocusTarget = null;
  } else if (state.settingsFocusTarget === 'toggle') {
    dom.settingsToggleButton?.focus();
    state.settingsFocusTarget = null;
  }

  for (const input of dom.themeInputs) {
    const key = input.dataset.themeSetting as keyof PanelSettingsForm['theme'] | undefined;
    if (!key) {
      continue;
    }

    input.value = state.panelSettings.theme[key];
  }

  for (const input of dom.visibilityInputs) {
    const key = input.dataset.visibilitySetting as keyof PanelSettingsForm['visibility'] | undefined;
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
    const specUrl = getRuntime()?.runtime?.getURL?.('api/openapi.yaml') ?? 'api/openapi.yaml';
    dom.openApiSpecLink.href = specUrl;
    dom.openApiSpecLink.title = specUrl;
  }

  if (dom.accessibilityWcagLevel) {
    dom.accessibilityWcagLevel.value = state.panelSettings.accessibility.wcagLevel;
  }
  if (dom.accessibilityBestPractices) {
    dom.accessibilityBestPractices.checked = state.panelSettings.accessibility.includeBestPractices;
  }
  if (dom.accessibilityProfileSummary) {
    dom.accessibilityProfileSummary.textContent = buildAccessibilityProfileSummary(state.panelSettings.accessibility);
  }
}

function renderBugReportLink(): void {
  if (!dom.bugReportLink) {
    return;
  }

  const runtime = getRuntime();
  const version = runtime?.runtime?.getManifest?.().version ?? 'unknown';
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

function applyPopupUiState(popupUiState: PopupUiState): void {
  if (!popupUiSettingsTouched) {
    state.settingsOpen = popupUiState.settingsOpen;
  }

  if (!state.snapshot || popupUiState.scanId !== state.snapshot.id) {
    state.selectedIssueIds.clear();
    return;
  }

  const validIssueIds = new Set(state.snapshot.issues.map((issue) => issue.id));
  state.selectedIssueIds = new Set(popupUiState.selectedIssueIds.filter((issueId) => validIssueIds.has(issueId)));
}

function summarizePanelSettings(): string {
  const enabledSections = Object.entries(state.panelSettings.visibility)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  return enabledSections || 'none';
}

function applyPanelTheme(): void {
  if (!dom.shell) {
    return;
  }

  const style = dom.shell.style;
  style.setProperty('--bg-0', state.panelSettings.theme.backgroundStart);
  style.setProperty('--bg-1', state.panelSettings.theme.backgroundEnd);
  style.setProperty('--panel', state.panelSettings.theme.panel);
  style.setProperty('--panel-strong', state.panelSettings.theme.panelStrong);
  style.setProperty('--border', state.panelSettings.theme.border);
  style.setProperty('--text', state.panelSettings.theme.text);
  style.setProperty('--muted', state.panelSettings.theme.muted);
  style.setProperty('--muted-strong', state.panelSettings.theme.mutedStrong);
  style.setProperty('--accent', state.panelSettings.theme.accent);
  style.setProperty('--accent-weak', state.panelSettings.theme.accentWeak);
  style.setProperty('--alert', state.panelSettings.theme.alert);
  style.setProperty('--alert-weak', state.panelSettings.theme.alertWeak);
  style.setProperty('--danger', state.panelSettings.theme.danger);
  style.setProperty('--danger-weak', state.panelSettings.theme.dangerWeak);
}

function applyVisibilitySettings(): void {
  setSectionVisibility(dom.controlsSection, state.panelSettings.visibility.showControls);
  setSectionVisibility(dom.backendSettingsSection, state.panelSettings.visibility.showBackendSettings);
  setSectionVisibility(dom.summaryGrid, state.panelSettings.visibility.showSummary);
  setSectionVisibility(dom.deltaPanel, state.panelSettings.visibility.showDelta);
  setSectionVisibility(dom.statusLine, state.panelSettings.visibility.showStatusLine);
  setSectionVisibility(dom.offlinePanel, state.panelSettings.visibility.showOfflineBanner);
  setSectionVisibility(dom.footer, state.panelSettings.visibility.showFooter);
}

function setSectionVisibility(element: Element | null | undefined, visible: boolean): void {
  if (!element || !(element instanceof HTMLElement)) {
    return;
  }

  element.classList.toggle('hidden', !visible);
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
    const { buildIssuesPdfBlob } = await import('../ui/pdf');
    const blob = buildIssuesPdfBlob(state.snapshot, selectedIssues);
    downloadBlob(blob, buildReportDownloadPath(state.snapshot, 'pdf'));
    return;
  }

  const payload =
    format === 'json'
      ? buildIssueExportJson(selectedIssues, metadata)
      : buildIssueExportMarkdown(selectedIssues, metadata);

  const fileFormat = format === 'json' ? 'json' : 'markdown';
  downloadText(payload, buildReportDownloadPath(state.snapshot, fileFormat));
}

async function downloadCurrentReport(format: 'json' | 'markdown' | 'html' | 'pdf'): Promise<void> {
  if (!state.snapshot) {
    return;
  }

  await downloadReportForSnapshot(state.snapshot, format, state.diff);
}

async function downloadReportForSnapshot(
  snapshot: ScanSnapshot,
  format: 'json' | 'markdown' | 'html' | 'pdf',
  diff?: DiffResult
): Promise<void> {
  const generatedAt = new Date(snapshot.timestamp).toISOString();
  const runtime = getRuntime();

  if (format === 'pdf') {
    const { buildReportPdfBlob } = await import('../ui/pdf');
    const blob = buildReportPdfBlob({
      generatedAt,
      snapshot,
      diff
    });
    downloadBlob(blob, buildReportDownloadPath(snapshot, 'pdf'));
    return;
  }

  const report =
    runtime?.runtime?.sendMessage
      ? await buildReportFromRuntime(snapshot, format, diff, runtime.runtime.sendMessage)
      : buildReport(
          {
            generatedAt,
            snapshot,
            diff
          },
          format
        );

  const blob = new Blob([report], {
    type: format === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8'
  });
  downloadBlob(blob, buildReportDownloadPath(snapshot, format));
}

async function buildReportFromRuntime(
  snapshot: ScanSnapshot,
  format: 'json' | 'markdown' | 'html',
  diff: DiffResult | undefined,
  sendMessage: (message: unknown) => Promise<unknown>
): Promise<string> {
  try {
    const reply = (await sendMessage({
      type: 'report:build',
      snapshot,
      diff,
      format
    })) as ReportBuildReply;

    if (reply.ok) {
      return reply.payload.report;
    }
  } catch {
    // Fall back to the local renderer below.
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
