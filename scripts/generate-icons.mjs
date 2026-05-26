import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const PROJECT_ROOT = resolve(process.cwd());
const sourcePath = resolve(PROJECT_ROOT, 'src/assets/icon.svg');
const distDir = resolve(PROJECT_ROOT, 'dist');
const outputDir = resolve(distDir, 'icons');
const sourceOutputDir = resolve(PROJECT_ROOT, 'icons');
const source = readFileSync(sourcePath, 'utf8');
const sizes = [16, 32, 48, 64, 128];
const states = {
  normal: {
    grade: '#990000',
    metric: '#D49A17'
  },
  alert: {
    grade: '#D49A17',
    metric: '#990000'
  },
  fail: {
    grade: '#990000',
    metric: '#E74C3C'
  }
};
const outputDirs = [outputDir, sourceOutputDir];
for (const dir of outputDirs) {
  mkdirSync(dir, { recursive: true });
}

function makeStatic(svg) {
  return svg
    .replace(/\.issue-flash \{[^}]*\}/s, '.issue-flash { opacity: 0.6; }')
    .replace(/\s*animation: [^;]*;/g, '')
    .replace(/\s*transform-origin:[^;]*;/g, '');
}

function recolorSvg(svg, state) {
  return svg
    .replace(/(id="grade-text"[^>]*fill=")[^"]*(")/, `$1${state.grade}$2`)
    .replace(/(id="metric-text"[^>]*fill=")[^"]*(")/, `$1${state.metric}$2`);
}

function iconPath(state, size, suffix) {
  const filename = `icon-${state}-${size}${suffix}.svg`;
  return {
    dist: resolve(outputDir, filename),
    src: resolve(sourceOutputDir, filename)
  };
}

for (const [stateName, stateColors] of Object.entries(states)) {
  const recolored = recolorSvg(source, stateColors);
  const staticSvg = makeStatic(recolored);

  for (const size of sizes) {
    const outputFile = iconPath(stateName, size, '');
    const staticOutput = iconPath(stateName, size, '-static');
    writeFileSync(outputFile.dist, recolored, 'utf8');
    writeFileSync(outputFile.src, recolored, 'utf8');
    writeFileSync(staticOutput.dist, staticSvg, 'utf8');
    writeFileSync(staticOutput.src, staticSvg, 'utf8');
  }
}

for (const size of sizes) {
  writeFileSync(resolve(outputDir, `icon-${size}.svg`), source, 'utf8');
  writeFileSync(resolve(sourceOutputDir, `icon-${size}.svg`), source, 'utf8');
}

// Provide a non-state canonical icon for extension branding and any fallback pathes.
for (const dir of outputDirs) {
  cpSync(sourcePath, resolve(dir, 'icon.svg'));
  cpSync(sourcePath, resolve(dir, 'icon-static.svg'));
}
