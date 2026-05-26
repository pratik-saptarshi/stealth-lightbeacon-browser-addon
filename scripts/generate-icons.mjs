import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const PROJECT_ROOT = resolve(process.cwd());
const SOURCE_ICON_PATH = resolve(PROJECT_ROOT, 'src/assets/icon.svg');
const DIST_ROOT = resolve(PROJECT_ROOT, 'dist');
const DIST_ICON_DIR = resolve(DIST_ROOT, 'icons');
const SOURCE_ICON_DIR = resolve(PROJECT_ROOT, 'icons');
const SOURCE_SVG = readFileSync(SOURCE_ICON_PATH, 'utf8');

const MANIFEST_ICON_SIZES = [16, 32, 48, 128];
const TOOLBAR_ICON_SIZES = [16, 32, 48, 64, 128];

const STATES = {
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

mkdirSync(DIST_ICON_DIR, { recursive: true });
mkdirSync(SOURCE_ICON_DIR, { recursive: true });

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

function writeSvgAsset(svg, size, baseName, root, stateSuffix = '') {
  const name = stateSuffix ? `${baseName}-${size}${stateSuffix}.svg` : `${baseName}-${size}.svg`;
  writeFileSync(resolve(root, name), svg, 'utf8');
}

function writeCanonicalSvg(root) {
  cpSync(SOURCE_ICON_PATH, resolve(root, 'icon.svg'));
  cpSync(SOURCE_ICON_PATH, resolve(root, 'icon-static.svg'));
}

function renderSvgToPng(svg, size, outputPath) {
  const raster = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: size
    }
  });

  const png = raster.render().asPng();
  writeFileSync(outputPath, png);
}

function writePngPair(svg, size, fileName, roots) {
  for (const root of roots) {
    renderSvgToPng(svg, size, resolve(root, fileName));
  }
}

const stateVariants = {};
for (const [stateName, stateColors] of Object.entries(STATES)) {
  const recolored = recolorSvg(SOURCE_SVG, stateColors);
  stateVariants[stateName] = {
    animated: recolored,
    static: makeStatic(recolored)
  };
}

for (const size of MANIFEST_ICON_SIZES) {
  const resized = SOURCE_SVG.replace(/width="128"/, `width="${size}"`).replace(/height="128"/, `height="${size}"`);
  writeSvgAsset(resized, size, 'icon', DIST_ICON_DIR);
  writeSvgAsset(resized, size, 'icon', SOURCE_ICON_DIR);
  writePngPair(makeStatic(resized), size, `extension_icon${size}.png`, [PROJECT_ROOT, DIST_ROOT]);
}

for (const [stateName, pair] of Object.entries(stateVariants)) {
  for (const size of TOOLBAR_ICON_SIZES) {
    const animatedSized = pair.animated.replace(/width="128"/, `width="${size}"`).replace(/height="128"/, `height="${size}"`);
    const staticSized = pair.static.replace(/width="128"/, `width="${size}"`).replace(/height="128"/, `height="${size}"`);

    writeSvgAsset(animatedSized, size, `icon-${stateName}`, DIST_ICON_DIR);
    writeSvgAsset(animatedSized, size, `icon-${stateName}`, SOURCE_ICON_DIR);
    writeSvgAsset(staticSized, size, `icon-${stateName}`, DIST_ICON_DIR, '-static');
    writeSvgAsset(staticSized, size, `icon-${stateName}`, SOURCE_ICON_DIR, '-static');

    writePngPair(animatedSized, size, `icons/icon-${stateName}-${size}.png`, [PROJECT_ROOT, DIST_ROOT]);
    writePngPair(staticSized, size, `icons/icon-${stateName}-${size}-static.png`, [PROJECT_ROOT, DIST_ROOT]);
  }
}

writeCanonicalSvg(SOURCE_ICON_DIR);
writeCanonicalSvg(DIST_ICON_DIR);
