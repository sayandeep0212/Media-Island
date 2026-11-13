const fs = require('fs');
const path = require('path');

// Synchronize stickers from app/stickers.js to mobile/stickers-data.js and app/mobile/stickers-data.js
const appStickersCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'stickers.js'), 'utf8');
const match = appStickersCode.match(/const STICKERS = (\[[\s\S]*?\]);\s*let/);

if (!match) {
  console.error("Could not find STICKERS array in app/stickers.js");
  process.exit(1);
}

const stickersJson = match[1];
const mobileStickersData = `/**
 * stickers-data.js
 * Exported sticker pack data for the Mobile Web Remote.
 * Contains all 11 vibrant vector stickers matching desktop Media Island.
 */
window.ISLAND_STICKERS = ${stickersJson};
`;

const destMobile = path.join(__dirname, '..', 'mobile', 'stickers-data.js');
fs.writeFileSync(destMobile, mobileStickersData, 'utf8');

const appMobileDir = path.join(__dirname, '..', 'app', 'mobile');
if (fs.existsSync(appMobileDir)) {
  fs.writeFileSync(path.join(appMobileDir, 'stickers-data.js'), mobileStickersData, 'utf8');
}

console.log('Successfully synchronized stickers for Desktop and Mobile!');

