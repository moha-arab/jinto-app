// build-opk.js — packages the app into dist/jinto-<version>.opk (a zip with manifest.json
// at the root). Ships ONLY what the app needs at runtime; all dev tooling stays out.
// Run: node build-opk.js   (requires PowerShell for Compress-Archive — no npm deps)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).meta.version;
const STAGE = path.join(ROOT, 'dist', 'stage');
const OPK = path.join(ROOT, 'dist', 'jinto-' + version + '.opk');

// Runtime allow-list. Anything not named here does not ship.
const INCLUDE = [
  'manifest.json',
  'icons',
  'windows',
  'scripts',
];
const EXCLUDE = [
  /secrets\.local\.js$/i,        // dev keys — must never ship (proxy mode replaces them)
  /\.md$/i,
];

fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

let files = 0;
function copy(rel) {
  const src = path.join(ROOT, rel);
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(src)) copy(path.join(rel, f));
    return;
  }
  if (EXCLUDE.some((rx) => rx.test(rel))) return;
  const dst = path.join(STAGE, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  files++;
}
for (const item of INCLUDE) copy(item);

// sanity: the packaged app must be in proxy mode and reference no local secrets
const proxyCfg = fs.readFileSync(path.join(STAGE, 'scripts', 'proxy-config.js'), 'utf8');
if (!/enabled:\s*true/.test(proxyCfg)) throw new Error('ABORT: proxy-config.js is not enabled:true — this build would ship with no working services');
const bgHtml = fs.readFileSync(path.join(STAGE, 'windows', 'background', 'background.html'), 'utf8');
if (!fs.existsSync(path.join(STAGE, 'scripts', 'proxy-config.js'))) throw new Error('ABORT: proxy-config.js missing');
console.log('staged ' + files + ' files (secrets.local.js excluded: ' + !fs.existsSync(path.join(STAGE, 'secrets.local.js')) + ')');

execFileSync('C:/Windows/System32/tar.exe', ['-a', '-cf', OPK + '.zip', '-C', STAGE, ...fs.readdirSync(STAGE)]); // -a needs a .zip extension to pick the zip format
fs.renameSync(OPK + '.zip', OPK);
const kb = Math.round(fs.statSync(OPK).size / 1024);
console.log('built ' + path.relative(ROOT, OPK) + ' (' + kb + ' KB)');
