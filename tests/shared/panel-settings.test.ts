import { describe, expect, it } from 'vitest';
import {
  BUG_REPORT_EMAIL,
  DEFAULT_PANEL_SETTINGS,
  buildBugReportMailto,
  normalizePanelSettings
} from '../../src/shared/panel-settings';

describe('panel settings helpers', () => {
  it('normalizes theme colors and visibility toggles', () => {
    expect(normalizePanelSettings(undefined)).toEqual(DEFAULT_PANEL_SETTINGS);
    expect(
      normalizePanelSettings({
        theme: {
          backgroundStart: 'fefefe',
          accent: '#123ABC',
          danger: 'not-a-color'
        },
        visibility: {
          showControls: false,
          showFooter: true
        }
      })
    ).toEqual({
      theme: {
        backgroundStart: '#fefefe',
        backgroundEnd: '#edf3f8',
        panel: '#ffffff',
        panelStrong: '#ffffff',
        border: '#2c3e50',
        text: '#1f2d3d',
        muted: '#5f6f7f',
        mutedStrong: '#374151',
        accent: '#123abc',
        accentWeak: '#dbeafe',
        alert: '#d49a17',
        alertWeak: '#fff3cd',
        danger: '#990000',
        dangerWeak: '#ffe1e1'
      },
      visibility: {
        showControls: false,
        showBackendSettings: true,
        showSummary: true,
        showDelta: true,
        showStatusLine: true,
        showOfflineBanner: true,
        showFooter: true
      }
    });
  });

  it('builds a bug report mailto with context details', () => {
    const href = buildBugReportMailto({
      version: '0.1.5',
      pageUrl: 'https://example.com/page',
      status: 'failed',
      note: 'Scan failed',
      settingsSummary: 'showControls, showSummary'
    });

    expect(href).toContain(`mailto:${BUG_REPORT_EMAIL}`);
    expect(href).toContain('Stealth+Lightbeacon+bug+report');
    expect(href).toContain('Extension+version%3A+0.1.5');
    expect(href).toContain('Page+URL%3A+https%3A%2F%2Fexample.com%2Fpage');
  });
});
