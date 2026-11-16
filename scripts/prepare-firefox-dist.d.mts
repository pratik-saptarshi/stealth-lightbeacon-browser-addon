export const FIREFOX_EXTENSION_ID: string;

/**
 * Rewrites a Chrome manifest for Firefox: adds `sidebar_action`, pins
 * `browser_specific_settings.gecko.id`, and drops the Chrome-only
 * `side_panel` key and `sidePanel` permission.
 */
export function buildFirefoxManifest(manifest: Record<string, unknown>): Record<string, unknown>;

/**
 * Copies the built `dist/` to `artifacts/firefox/` and writes the Firefox
 * manifest variant into that directory.
 */
export function prepareFirefoxDist(env?: NodeJS.ProcessEnv): Promise<void>;
