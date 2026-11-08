const fs = require('fs');
const code = fs.readFileSync('mobile/stickers-data.js', 'utf8');
const vm = require('vm');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const stickers = sandbox.window.ISLAND_STICKERS;
console.log('Found stickers:', stickers.length);

const html = stickers.map(s => `      <div class="sticker-card" data-id="${s.id}" role="button" tabindex="0" title="${s.name} Sticker">
        <span class="sticker-badge">✓</span>
        <div class="sticker-img-wrap">${s.svg}</div>
        <span class="sticker-name">${s.name}</span>
      </div>`).join('\n');

function updateHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const target = '<div class="stickers-grid" id="mobileStickerGrid">\n      <!-- 11 stick-it-up stickers rendered dynamically -->\n    </div>';
  const replacement = '<div class="stickers-grid" id="mobileStickerGrid">\n' + html + '\n    </div>';
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated', filePath);
  } else {
    console.warn('Target not found in', filePath);
  }
}

updateHtml('mobile/index.html');
updateHtml('app/mobile/index.html');

