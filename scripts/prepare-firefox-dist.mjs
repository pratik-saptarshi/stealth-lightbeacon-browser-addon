import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const FIREFOX_EXTENSION_ID = 'stealth-lightbeacon@pratik-saptarshi.github.io';

// Chrome-only manifest surface. Firefox uses `sidebar_action` and has no
// `sidePanel` permission, so both are rewritten for the AMO bundle.
const CHROME_ONLY_PERMISSIONS = new Set(['sidePanel']);

export function buildFirefoxManifest(manifest) {
  const { side_panel: _sidePanel, ...rest } = manifest;
  const firefoxManifest = {
    ...rest,
    sidebar_action: {
      default_panel: 'side-panel.html',
      default_title: 'Stealth Lightbeacon'
    },
    browser_specific_settings: {
      ...(manifest.browser_specific_settings ?? {}),
      gecko: {
        ...(manifest.browser_specific_settings?.gecko ?? {}),
        id: FIREFOX_EXTENSION_ID
      }
    }
  };

  if (Array.isArray(manifest.permissions)) {
    firefoxManifest.permissions = manifest.permissions.filter(
      (permission) => !CHROME_ONLY_PERMISSIONS.has(permission)
    );
  }

  return firefoxManifest;
}

export async function prepareFirefoxDist(env = process.env) {
  const repoRoot = env.PUBLISH_REPO_ROOT ?? process.cwd();
  const distDir = resolve(repoRoot, 'dist');
  const firefoxDir = resolve(repoRoot, 'artifacts', 'firefox');

  if (!existsSync(distDir)) {
    throw new Error('dist directory is missing. Run "pnpm run build" first.');
  }

  const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'));

  rmSync(firefoxDir, { recursive: true, force: true });
  mkdirSync(firefoxDir, { recursive: true });
  cpSync(distDir, firefoxDir, { recursive: true });
  writeFileSync(
    join(firefoxDir, 'manifest.json'),
    `${JSON.stringify(buildFirefoxManifest(manifest), null, 2)}\n`,
    'utf8'
  );

  console.log(`[prepare:firefox] wrote ${relative(repoRoot, firefoxDir)}/manifest.json`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await prepareFirefoxDist();
}
