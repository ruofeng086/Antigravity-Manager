import fs from 'fs';
import path from 'path';

const osTarget = process.argv[2];
if (!osTarget) {
  console.error('Usage: node scripts/collect-artifacts.mjs <windows|macos-arm64|macos-x64|linux>');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const distDir = path.resolve('dist-artifacts');
fs.mkdirSync(distDir, { recursive: true });

function findFiles(dir, matchFn) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, matchFn));
    } else if (matchFn(entry.name, fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

const targetBase = path.resolve('src-tauri/target');
console.log(`Searching for built artifacts for '${osTarget}' in ${targetBase}...`);

if (osTarget === 'windows') {
  const exes = findFiles(targetBase, (name, fullPath) => {
    return fullPath.includes('nsis') && name.endsWith('.exe') && !name.includes('uninstall');
  });
  if (exes.length === 0) {
    console.error('❌ Error: No Windows NSIS installer found under src-tauri/target/release/bundle/nsis');
    process.exit(1);
  }
  const dest = path.join(distDir, `Antigravity-Manager-${version}-Setup.exe`);
  fs.copyFileSync(exes[0], dest);
  console.log(`✅ [Windows] Staged ${dest} (${fs.statSync(dest).size} bytes)`);
} else if (osTarget === 'macos-arm64') {
  const dmgs = findFiles(targetBase, (name, fullPath) => {
    return fullPath.includes('dmg') && name.endsWith('.dmg');
  });
  if (dmgs.length === 0) {
    console.error('❌ Error: No macOS DMG found under src-tauri/target');
    process.exit(1);
  }
  const dest = path.join(distDir, `Antigravity-Manager-${version}-aarch64.dmg`);
  fs.copyFileSync(dmgs[0], dest);
  console.log(`✅ [macOS-arm64] Staged ${dest} (${fs.statSync(dest).size} bytes)`);
} else if (osTarget === 'macos-x64') {
  const dmgs = findFiles(targetBase, (name, fullPath) => {
    return fullPath.includes('dmg') && name.endsWith('.dmg');
  });
  if (dmgs.length === 0) {
    console.error('❌ Error: No macOS DMG found under src-tauri/target');
    process.exit(1);
  }
  const dest = path.join(distDir, `Antigravity-Manager-${version}-x64.dmg`);
  fs.copyFileSync(dmgs[0], dest);
  console.log(`✅ [macOS-x64] Staged ${dest} (${fs.statSync(dest).size} bytes)`);
} else if (osTarget === 'linux') {
  const appimages = findFiles(targetBase, (name, fullPath) => {
    return (fullPath.includes('appimage') || fullPath.includes('AppImage')) && name.endsWith('.AppImage');
  });
  const debs = findFiles(targetBase, (name, fullPath) => {
    return fullPath.includes('deb') && name.endsWith('.deb');
  });

  if (appimages.length === 0 && debs.length === 0) {
    console.error('❌ Error: No Linux AppImage or DEB found under src-tauri/target');
    process.exit(1);
  }

  if (appimages.length > 0) {
    const dest = path.join(distDir, `Antigravity-Manager-${version}-amd64.AppImage`);
    fs.copyFileSync(appimages[0], dest);
    console.log(`✅ [Linux AppImage] Staged ${dest} (${fs.statSync(dest).size} bytes)`);
  }
  if (debs.length > 0) {
    const dest = path.join(distDir, `Antigravity-Manager_${version}_amd64.deb`);
    fs.copyFileSync(debs[0], dest);
    console.log(`✅ [Linux DEB] Staged ${dest} (${fs.statSync(dest).size} bytes)`);
  }
} else {
  console.error(`Unknown os target: ${osTarget}`);
  process.exit(1);
}

const files = fs.readdirSync(distDir);
console.log('Staged dist-artifacts:');
for (const f of files) {
  const s = fs.statSync(path.join(distDir, f));
  console.log(` - ${f} (${s.size} bytes)`);
}
