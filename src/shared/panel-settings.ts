export interface PanelThemeSettings {
  backgroundStart: string;
  backgroundEnd: string;
  panel: string;
  panelStrong: string;
  border: string;
  text: string;
  muted: string;
  mutedStrong: string;
  accent: string;
  accentWeak: string;
  alert: string;
  alertWeak: string;
  danger: string;
  dangerWeak: string;
}

export interface PanelVisibilitySettings {
  showControls: boolean;
  showBackendSettings: boolean;
  showSummary: boolean;
  showDelta: boolean;
  showStatusLine: boolean;
  showOfflineBanner: boolean;
  showFooter: boolean;
}

export interface PanelSettingsForm {
  theme: PanelThemeSettings;
  visibility: PanelVisibilitySettings;
  accessibility: PanelAccessibilitySettings;
}

export interface PanelAccessibilitySettings {
  wcagLevel: 'A' | 'AA' | 'AAA';
  includeBestPractices: boolean;
}

export const PANEL_SETTINGS_STORAGE_KEY = 'addon_panel_settings';
export const BUG_REPORT_EMAIL = 'pratik.saptarshi@outlook.com';

export const DEFAULT_PANEL_THEME: PanelThemeSettings = {
  backgroundStart: '#f6f1e8',
  backgroundEnd: '#edf3f8',
  panel: '#ffffff',
  panelStrong: '#ffffff',
  border: '#2c3e50',
  text: '#1f2d3d',
  muted: '#5f6f7f',
  mutedStrong: '#374151',
  accent: '#0d47a1',
  accentWeak: '#dbeafe',
  alert: '#d49a17',
  alertWeak: '#fff3cd',
  danger: '#990000',
  dangerWeak: '#ffe1e1'
};

export const DEFAULT_PANEL_VISIBILITY: PanelVisibilitySettings = {
  showControls: true,
  showBackendSettings: true,
  showSummary: true,
  showDelta: true,
  showStatusLine: true,
  showOfflineBanner: true,
  showFooter: true
};

export const DEFAULT_PANEL_SETTINGS: PanelSettingsForm = {
  theme: { ...DEFAULT_PANEL_THEME },
  visibility: { ...DEFAULT_PANEL_VISIBILITY },
  accessibility: {
    wcagLevel: 'AA',
    includeBestPractices: true
  }
};

const THEME_KEYS = Object.keys(DEFAULT_PANEL_THEME) as Array<keyof PanelThemeSettings>;
const VISIBILITY_KEYS = Object.keys(DEFAULT_PANEL_VISIBILITY) as Array<keyof PanelVisibilitySettings>;
const ACCESSIBILITY_LEVELS = ['A', 'AA', 'AAA'] as const;
const HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/;

export function normalizePanelSettings(input: unknown): PanelSettingsForm {
  if (!isRecord(input)) {
    return cloneDefaultPanelSettings();
  }

  return {
    theme: normalizeTheme(input.theme),
    visibility: normalizeVisibility(input.visibility),
    accessibility: normalizeAccessibility(input.accessibility)
  };
}

export function buildBugReportMailto(input: {
  version?: string;
  pageUrl?: string;
  status?: string;
  note?: string;
  settingsSummary?: string;
} = {}): string {
  const params = new URLSearchParams();
  params.set('subject', 'Stealth Lightbeacon bug report');

  const bodyLines = [
    `Extension version: ${input.version ?? 'unknown'}`,
    `Page URL: ${input.pageUrl ?? 'n/a'}`,
    `Panel status: ${input.status ?? 'n/a'}`,
    `Note: ${input.note ?? 'n/a'}`,
    `Settings: ${input.settingsSummary ?? 'n/a'}`
  ];

  params.set('body', bodyLines.join('\n'));
  return `mailto:${BUG_REPORT_EMAIL}?${params.toString()}`;
}

export function buildAccessibilityProfileSummary(input: PanelAccessibilitySettings): string {
  const wcagLabel = `WCAG ${input.wcagLevel}`;
  if (input.includeBestPractices) {
    return `${wcagLabel} plus best-practice checks for UX-oriented accessibility guardrails.`;
  }

  return `${wcagLabel} only, without best-practice checks.`;
}

function normalizeTheme(input: unknown): PanelThemeSettings {
  const source = isRecord(input) ? input : {};
  const theme = cloneDefaultTheme();

  for (const key of THEME_KEYS) {
    theme[key] = normalizeHexColor(source[key], DEFAULT_PANEL_THEME[key]);
  }

  return theme;
}

function normalizeVisibility(input: unknown): PanelVisibilitySettings {
  const source = isRecord(input) ? input : {};
  const visibility = cloneDefaultVisibility();

  for (const key of VISIBILITY_KEYS) {
    visibility[key] = normalizeBoolean(source[key], DEFAULT_PANEL_VISIBILITY[key]);
  }

  return visibility;
}

function normalizeAccessibility(input: unknown): PanelAccessibilitySettings {
  const source = isRecord(input) ? input : {};
  const wcagLevel = typeof source.wcagLevel === 'string' && ACCESSIBILITY_LEVELS.includes(source.wcagLevel as (typeof ACCESSIBILITY_LEVELS)[number])
    ? source.wcagLevel as PanelAccessibilitySettings['wcagLevel']
    : DEFAULT_PANEL_SETTINGS.accessibility.wcagLevel;
  const includeBestPractices =
    typeof source.includeBestPractices === 'boolean'
      ? source.includeBestPractices
      : DEFAULT_PANEL_SETTINGS.accessibility.includeBestPractices;

  return {
    wcagLevel,
    includeBestPractices
  };
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) {
    return fallback;
  }

  return trimmed.startsWith('#') ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function cloneDefaultPanelSettings(): PanelSettingsForm {
  return {
    theme: cloneDefaultTheme(),
    visibility: cloneDefaultVisibility(),
    accessibility: {
      wcagLevel: DEFAULT_PANEL_SETTINGS.accessibility.wcagLevel,
      includeBestPractices: DEFAULT_PANEL_SETTINGS.accessibility.includeBestPractices
    }
  };
}

function cloneDefaultTheme(): PanelThemeSettings {
  return { ...DEFAULT_PANEL_THEME };
}

function cloneDefaultVisibility(): PanelVisibilitySettings {
  return { ...DEFAULT_PANEL_VISIBILITY };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
