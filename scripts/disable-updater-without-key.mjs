import fs from 'fs';
import path from 'path';

if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  const confPath = path.resolve('src-tauri/tauri.conf.json');
  if (fs.existsSync(confPath)) {
    const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    if (conf.bundle && conf.bundle.createUpdaterArtifacts !== false) {
      conf.bundle.createUpdaterArtifacts = false;
      fs.writeFileSync(confPath, JSON.stringify(conf, null, 2), 'utf8');
      console.log('No TAURI_SIGNING_PRIVATE_KEY set; disabled createUpdaterArtifacts.');
    }
  }
} else {
  console.log('TAURI_SIGNING_PRIVATE_KEY is configured; updater artifacts kept.');
}
