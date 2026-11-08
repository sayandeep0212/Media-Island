const fs = require('fs');
const path = require('path');

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
 * Contains all 11 stick-it-up stickers for mobile selection.
 */
window.ISLAND_STICKERS = ${stickersJson};
`;

const destPath = path.join(__dirname, '..', 'mobile', 'stickers-data.js');
fs.writeFileSync(destPath, mobileStickersData, 'utf8');
console.log('Successfully created mobile/stickers-data.js with all 11 stickers!');

