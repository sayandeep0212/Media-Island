const fs = require('fs');
const path = require('path');
const os = require('os');
const asar = require(path.join(__dirname, '..', 'app', 'node_modules', '@electron/asar'));

const targets = [
  path.join(process.env.LOCALAPPDATA, 'Programs', 'Media Island', 'resources', 'app.asar'),
  path.join(__dirname, '..', 'app', 'release', 'win-unpacked', 'resources', 'app.asar')
];

const newIndexHtml = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'));
const newStickersJs = fs.readFileSync(path.join(__dirname, '..', 'app', 'stickers.js'));

async function patchAsar(asarPath) {
  if (!fs.existsSync(asarPath)) {
    console.log('Skipping (not found):', asarPath);
    return;
  }
  console.log('Patching:', asarPath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-island-asar-'));

  try {
    // 1. Extract existing asar
    asar.extractAll(asarPath, tempDir);

    // 2. Overwrite index.html and stickers.js
    fs.writeFileSync(path.join(tempDir, 'index.html'), newIndexHtml);
    fs.writeFileSync(path.join(tempDir, 'stickers.js'), newStickersJs);

    // 3. Backup original asar if backup doesn't exist yet
    const backupPath = asarPath + '.bak';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(asarPath, backupPath);
      console.log('Created backup:', backupPath);
    }

    // 4. Pack back into asar
    await asar.createPackage(tempDir, asarPath);
    console.log('Successfully updated:', asarPath);

    // Verify
    const list = asar.listPackage(asarPath);
    const hasStickers = list.some(f => f.includes('stickers.js'));
    console.log('Verified: contains stickers.js =', hasStickers);
  } finally {
    // Clean up tempDir
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function run() {
  for (const t of targets) {
    try {
      await patchAsar(t);
    } catch (err) {
      console.error('Error patching', t, ':', err);
    }
  }
}

run();

