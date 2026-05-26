import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'dist/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.background = manifest.background ?? {};
manifest.background.service_worker = 'service-worker.js';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
