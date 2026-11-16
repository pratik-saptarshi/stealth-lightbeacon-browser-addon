export function listFilesRecursively(basePath: string): string[];
export function sha256(path: string): string;
/**
 * Packages `dist/` into `artifacts/addon-store.zip` and, when
 * `CRX_PRIVATE_KEY_PEM` is set, `artifacts/addon-signed.crx`.
 *
 * The CRX is produced by crx3's default export,
 * `writeCRX3File(files, { keyPath, crxPath, zipPath })`. The PEM is staged
 * in a temporary key file outside the repository and deleted afterwards.
 */
export function packageStoreArtifacts(
  env?: NodeJS.ProcessEnv,
  deps?: {
    existsSyncImpl?: (path: string) => boolean;
    mkdirSyncImpl?: typeof import('node:fs').mkdirSync;
    readFileSyncImpl?: typeof import('node:fs').readFileSync;
    writeFileSyncImpl?: typeof import('node:fs').writeFileSync;
    rmSyncImpl?: typeof import('node:fs').rmSync;
    spawnSyncImpl?: typeof import('node:child_process').spawnSync;
  }
): Promise<void>;
