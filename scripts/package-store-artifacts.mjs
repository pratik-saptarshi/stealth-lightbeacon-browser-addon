import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import writeCRX3File from 'crx3';

export function listFilesRecursively(basePath) {
  const files = [];
  const root = basePath;
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const entryPath = join(dir, entry);
      const entryStat = statSync(entryPath);
      if (entryStat.isDirectory()) {
        walk(entryPath);
        continue;
      }
      files.push(relative(root, entryPath));
    }
  }
  walk(root);
  return files.sort();
}

export function sha256(path) {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

// crx3@2 exports `writeCRX3File(files, { keyPath, crxPath, zipPath })` as its
// default export. `zipPath: ''` disables crx3's default zip copy in the CWD.
// The PEM never touches the repo: it is staged in a temp key file and removed afterwards.
async function writeCrx({ distDir, fileList, crxPath, privateKeyPem }) {
  const keyDir = mkdtempSync(join(tmpdir(), 'slt-crx-key-'));
  const keyPath = join(keyDir, 'signing-key.pem');
  try {
    writeFileSync(keyPath, privateKeyPem);
    await writeCRX3File(
      fileList.map((file) => join(distDir, file)),
      { keyPath, crxPath, zipPath: '' }
    );
  } finally {
    rmSync(keyDir, { recursive: true, force: true });
  }
}

export async function packageStoreArtifacts(env = process.env, deps = {}) {
  const {
    existsSyncImpl = existsSync,
    mkdirSyncImpl = mkdirSync,
    readFileSyncImpl = readFileSync,
    writeFileSyncImpl = writeFileSync,
    rmSyncImpl = rmSync,
    spawnSyncImpl = spawnSync
  } = deps;

  const repoRoot = env.PUBLISH_REPO_ROOT ?? process.cwd();
  const distDir = resolve(repoRoot, 'dist');
  const artifactsDir = resolve(repoRoot, 'artifacts');
  const storeZip = resolve(artifactsDir, 'addon-store.zip');
  const crxPath = resolve(artifactsDir, 'addon-signed.crx');
  const publishManifestPath = resolve(artifactsDir, 'publish-manifest.json');

  if (!existsSyncImpl(distDir)) {
    throw new Error('dist directory is missing. Run "pnpm run build" first.');
  }

  rmSyncImpl(artifactsDir, { recursive: true, force: true });
  mkdirSyncImpl(artifactsDir, { recursive: true });

  const zipResult = spawnSyncImpl('zip', ['-qr', storeZip, '.'], {
    cwd: distDir,
    stdio: 'inherit'
  });
  if (zipResult.status !== 0) {
    throw new Error(`zip command failed with status ${zipResult.status ?? -1}`);
  }

  const manifest = JSON.parse(readFileSyncImpl(join(distDir, 'manifest.json'), 'utf8'));
  const fileList = listFilesRecursively(distDir);

  const crxPrivateKeyPem = env.CRX_PRIVATE_KEY_PEM;
  if (crxPrivateKeyPem) {
    await writeCrx({ distDir, fileList, crxPath, privateKeyPem: crxPrivateKeyPem });
  }

  const publishManifest = {
    generatedAt: new Date().toISOString(),
    version: manifest.version,
    commitSha: env.GITHUB_SHA ?? null,
    artifacts: {
      zip: {
        path: 'artifacts/addon-store.zip',
        sha256: sha256(storeZip)
      },
      crx: existsSyncImpl(crxPath)
        ? {
            path: 'artifacts/addon-signed.crx',
            sha256: sha256(crxPath)
          }
        : null
    },
    releaseFiles: fileList
  };

  writeFileSyncImpl(publishManifestPath, JSON.stringify(publishManifest, null, 2));

  console.log(`[package:store] wrote ${relative(repoRoot, storeZip)}`);
  if (existsSyncImpl(crxPath)) {
    console.log(`[package:store] wrote ${relative(repoRoot, crxPath)}`);
  } else {
    console.log('[package:store] skipped CRX generation (CRX_PRIVATE_KEY_PEM not set)');
  }
  console.log(`[package:store] wrote ${relative(repoRoot, publishManifestPath)}`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await packageStoreArtifacts();
}
