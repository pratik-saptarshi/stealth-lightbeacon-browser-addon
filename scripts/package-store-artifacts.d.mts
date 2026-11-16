export function listFilesRecursively(basePath: string): string[];
export function sha256(path: string): string;
export function packageStoreArtifacts(
  env?: NodeJS.ProcessEnv,
  deps?: {
    existsSyncImpl?: (path: string) => boolean;
    mkdirSyncImpl?: typeof import('node:fs').mkdirSync;
    readFileSyncImpl?: typeof import('node:fs').readFileSync;
    writeFileSyncImpl?: typeof import('node:fs').writeFileSync;
    rmSyncImpl?: typeof import('node:fs').rmSync;
    spawnSyncImpl?: typeof import('node:child_process').spawnSync;
    CrxImpl?: new (options: { privateKey: string }) => {
      load: (distDir: string) => Promise<unknown>;
      pack: () => Promise<Buffer>;
    };
  }
): Promise<void>;
