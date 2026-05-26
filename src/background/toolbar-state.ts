import type { ScanSnapshot, Severity } from '../shared/types';

type ActionApi = {
  setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
  setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
  setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
  setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
};

export type ToolbarState = 'normal' | 'alert' | 'fail';

export const ACTION_ICON_PATHS = {
  normal: {
    16: 'icons/icon-normal-16.svg',
    32: 'icons/icon-normal-32.svg',
    48: 'icons/icon-normal-48.svg',
    64: 'icons/icon-normal-64.svg',
    128: 'icons/icon-normal-128.svg'
  },
  alert: {
    16: 'icons/icon-alert-16.svg',
    32: 'icons/icon-alert-32.svg',
    48: 'icons/icon-alert-48.svg',
    64: 'icons/icon-alert-64.svg',
    128: 'icons/icon-alert-128.svg'
  },
  fail: {
    16: 'icons/icon-fail-16.svg',
    32: 'icons/icon-fail-32.svg',
    48: 'icons/icon-fail-48.svg',
    64: 'icons/icon-fail-64.svg',
    128: 'icons/icon-fail-128.svg'
  }
} as const;

export const ACTION_ICON_PATHS_STATIC = {
  normal: {
    16: 'icons/icon-normal-16-static.svg',
    32: 'icons/icon-normal-32-static.svg',
    48: 'icons/icon-normal-48-static.svg',
    64: 'icons/icon-normal-64-static.svg',
    128: 'icons/icon-normal-128-static.svg'
  },
  alert: {
    16: 'icons/icon-alert-16-static.svg',
    32: 'icons/icon-alert-32-static.svg',
    48: 'icons/icon-alert-48-static.svg',
    64: 'icons/icon-alert-64-static.svg',
    128: 'icons/icon-alert-128-static.svg'
  },
  fail: {
    16: 'icons/icon-fail-16-static.svg',
    32: 'icons/icon-fail-32-static.svg',
    48: 'icons/icon-fail-48-static.svg',
    64: 'icons/icon-fail-64-static.svg',
    128: 'icons/icon-fail-128-static.svg'
  }
} as const;

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const BADGE_COLORS: Record<ToolbarState, string> = {
  normal: '#0D47A1',
  alert: '#D49A17',
  fail: '#990000'
};

export function resolveToolbarState(snapshot?: ScanSnapshot): ToolbarState {
  if (!snapshot || snapshot.summary.total <= 0) {
    return 'normal';
  }

  if ((snapshot.summary.bySeverity.critical ?? 0) > 0 || (snapshot.summary.bySeverity.high ?? 0) > 0) {
    return 'fail';
  }

  if ((snapshot.summary.bySeverity.medium ?? 0) > 0 || (snapshot.summary.bySeverity.low ?? 0) > 0) {
    return 'alert';
  }

  return 'normal';
}

export function formatIssueCounter(totalIssues: number): string {
  if (!totalIssues) {
    return '';
  }

  return totalIssues > 999 ? '999+' : String(totalIssues);
}

function actionApi(context: { chrome?: { action?: ActionApi; browserAction?: ActionApi }; browser?: { action?: ActionApi; browserAction?: ActionApi } }): ActionApi | undefined {
  return (
    context.chrome?.action ??
    context.chrome?.browserAction ??
    context.browser?.action ??
    context.browser?.browserAction
  );
}

export async function applyToolbarState(
  context: { chrome?: { action?: ActionApi; browserAction?: ActionApi }; browser?: { action?: ActionApi; browserAction?: ActionApi } },
  tabId: number | undefined,
  snapshot: ScanSnapshot | undefined
): Promise<void> {
  const api = actionApi(context);
  if (!api) {
    return;
  }

  const toolbarState = resolveToolbarState(snapshot);
  const badgeText = formatIssueCounter(snapshot?.summary.total ?? 0);
  const iconPaths = ACTION_ICON_PATHS[toolbarState];

  try {
    await Promise.resolve(
      api.setIcon?.({
        tabId,
        path: iconPaths
      })
    );
  } catch {
    try {
      await Promise.resolve(
        api.setIcon?.({
          tabId,
          path: ACTION_ICON_PATHS_STATIC[toolbarState]
        })
      );
    } catch {
      // ignore toolbar rendering failures and continue with badge update only
    }
  }

  try {
    await Promise.resolve(
      api.setBadgeText?.({
        tabId,
        text: badgeText
      })
    );
    await Promise.resolve(
      api.setBadgeBackgroundColor?.({
        tabId,
        color: BADGE_COLORS[toolbarState]
      })
    );
    await Promise.resolve(
      api.setBadgeTextColor?.({
        tabId,
        color: '#fff'
      })
    );
  } catch {
    return;
  }
}
