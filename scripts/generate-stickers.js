const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'stickers-catalog.json');
if (!fs.existsSync(catalogPath)) {
  console.error("Missing stickers-catalog.json! Run build_catalog_json.js first.");
  process.exit(1);
}

const stickers = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
console.log(`Loaded ${stickers.length} stickers from catalog.`);

// Desktop stickers.js code
const desktopCode = `/**
 * stickers.js
 * Vibrant, glossy, high-contrast Dynamic Island stickers collected from stickitupx.com (Stick It Up)
 * Supports ${stickers.length} stickers across Characters, Mascots, Symbols, Chrome Shapes, and Tech Founders.
 */

(function() {
  const STICKERS = ${JSON.stringify(stickers, null, 2)};

  let currentIndex = -1;
  let intervalTimer = null;
  const STAY_DURATION = 30000; // Stay for 30s before rotating

  const stickerBox = document.getElementById("sticker-box");
  if (!stickerBox) return;

  function getRandomPlacement() {
    const angle = (Math.random() * 10 - 5).toFixed(1);
    const dx = (Math.random() * 2 - 1).toFixed(1);
    const dy = (Math.random() * 2 - 1).toFixed(1);
    return {
      rot: \`rotate(\${angle}deg)\`,
      offset: \`translate(\${dx}px, \${dy}px)\`
    };
  }

  function pickRandomSticker() {
    let nextIndex;
    if (STICKERS.length <= 1) {
      nextIndex = 0;
    } else {
      do {
        nextIndex = Math.floor(Math.random() * STICKERS.length);
      } while (nextIndex === currentIndex);
    }
    currentIndex = nextIndex;
    return STICKERS[currentIndex];
  }

  function applySticker(item) {
    if (!item) return;
    const placement = getRandomPlacement();
    stickerBox.innerHTML = item.svg;
    stickerBox.style.transform = \`\${placement.rot} \${placement.offset}\`;
    stickerBox.title = \`\${item.name} Sticker (click to change)\`;
  }

  function renderSticker(trigger = "change") {
    const item = pickRandomSticker();
    applySticker(item);
  }

  // Click to randomly change
  stickerBox.addEventListener("click", (e) => {
    e.stopPropagation();
    renderSticker("click");
    resetAutoChange();
  });

  // Keyboard accessibility
  stickerBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      renderSticker("key");
      resetAutoChange();
    }
  });

  function startAutoChange() {
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
      renderSticker("timer");
    }, STAY_DURATION);
  }

  function resetAutoChange() {
    startAutoChange();
  }

  // Initial render
  renderSticker("init");
  startAutoChange();

  // Expose hook so track changes can also trigger a random sticker change
  window.changeIslandSticker = function() {
    renderSticker("track");
    resetAutoChange();
  };

  // Expose hook so mobile remote or settings can choose any specific sticker
  window.selectIslandSticker = function(stickerId) {
    if (!stickerId || stickerId === "auto" || stickerId === "random") {
      renderSticker("manual-auto");
      resetAutoChange();
      return;
    }
    const idx = STICKERS.findIndex(s => s.id === stickerId);
    if (idx !== -1) {
      currentIndex = idx;
      applySticker(STICKERS[idx]);
      if (intervalTimer) clearInterval(intervalTimer);
    }
  };

  // Expose list for inspection or settings
  window.ISLAND_STICKERS = STICKERS;
})();
`;

// Mobile stickers-data.js code
const mobileData = `/**
 * stickers-data.js
 * Exported sticker pack data for the Mobile Web Remote.
 * Contains ${stickers.length} stickers collected from stickitupx.com (Stick It Up).
 * Categories: Characters, Mascots, Symbols, Chrome, and Founders.
 */
window.ISLAND_STICKERS = ${JSON.stringify(stickers, null, 2)};
`;

// Write to app/stickers.js
const appStickersPath = path.join(__dirname, '..', 'app', 'stickers.js');
fs.writeFileSync(appStickersPath, desktopCode, 'utf8');
console.log('Updated app/stickers.js');

// Write to mobile/stickers-data.js
const destMobile = path.join(__dirname, '..', 'mobile', 'stickers-data.js');
fs.writeFileSync(destMobile, mobileData, 'utf8');
console.log('Updated mobile/stickers-data.js');

// Write to app/mobile/stickers-data.js
const appMobileDir = path.join(__dirname, '..', 'app', 'mobile');
if (fs.existsSync(appMobileDir)) {
  fs.writeFileSync(path.join(appMobileDir, 'stickers-data.js'), mobileData, 'utf8');
  console.log('Updated app/mobile/stickers-data.js');
}

console.log(`Successfully generated and synchronized ${stickers.length} stickers across Desktop and Mobile!`);
