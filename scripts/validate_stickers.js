const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- VALIDATING STICKERS INTEGRATION ---');

// 1. Validate mobile/stickers-data.js
const mobileCode = fs.readFileSync('mobile/stickers-data.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
try {
  vm.runInContext(mobileCode, sandbox);
  console.log('✓ mobile/stickers-data.js parsed successfully.');
} catch (e) {
  console.error('✗ Failed to parse mobile/stickers-data.js:', e.message);
  process.exit(1);
}

const mobileStickers = sandbox.window.ISLAND_STICKERS;
console.log(`✓ Total mobile stickers: ${mobileStickers.length}`);

// 2. Validate app/mobile/stickers-data.js
const appMobileCode = fs.readFileSync('app/mobile/stickers-data.js', 'utf8');
if (appMobileCode !== mobileCode) {
  console.warn('! app/mobile/stickers-data.js differs from mobile/stickers-data.js');
} else {
  console.log('✓ app/mobile/stickers-data.js is identical to mobile/stickers-data.js');
}

// 3. Validate app/stickers.js
const appStickersCode = fs.readFileSync('app/stickers.js', 'utf8');
const appSandbox = {
  document: {
    getElementById: () => ({
      addEventListener: () => {},
      innerHTML: '',
      style: {},
      title: ''
    })
  },
  window: {},
  setInterval: () => 1,
  clearInterval: () => {}
};
vm.createContext(appSandbox);
try {
  vm.runInContext(appStickersCode, appSandbox);
  console.log('✓ app/stickers.js evaluated successfully in mock browser environment.');
} catch (e) {
  console.error('✗ Failed to evaluate app/stickers.js:', e.message);
  process.exit(1);
}

const desktopStickers = appSandbox.window.ISLAND_STICKERS;
console.log(`✓ Total desktop stickers: ${desktopStickers.length}`);

// 4. Validate all stickers have id, name, category, and valid svg
const idSet = new Set();
const categoryCounts = {};

for (const s of mobileStickers) {
  if (!s.id) throw new Error(`Sticker missing id: ${JSON.stringify(s)}`);
  if (!s.name) throw new Error(`Sticker missing name: ${s.id}`);
  if (!s.category) throw new Error(`Sticker missing category: ${s.id}`);
  if (!s.svg || !s.svg.startsWith('<svg') || !s.svg.endsWith('</svg>')) {
    throw new Error(`Sticker has invalid svg: ${s.id}`);
  }
  if (!s.svg.includes('viewBox=')) {
    throw new Error(`Sticker svg missing viewBox: ${s.id}`);
  }
  if (idSet.has(s.id)) {
    throw new Error(`Duplicate sticker id: ${s.id}`);
  }
  idSet.add(s.id);
  categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
}

console.log('✓ All stickers have valid IDs, Names, Categories, and ViewBoxes.');
console.log('✓ Category breakdown:', categoryCounts);
console.log('--- ALL VALIDATION CHECKS PASSED ---');
