const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const {
  BunnySticker,
  HeartSticker,
  GooSticker,
  NoriCoolSticker,
  PipHeadphonesSticker,
  KuroHeadphonesSticker,
  MochiHeadphonesSticker,
  CatCuteSticker,
  MochiHeartSticker,
  PeaceHandSticker,
  NoriHeadphonesSticker
} = require('stick-it-up');

const stickerConfigs = [
  { id: 'bunny', name: 'Bunny', component: React.createElement(BunnySticker, { size: 28, peel: false }) },
  { id: 'heart', name: 'Heart', component: React.createElement(HeartSticker, { size: 28, peel: false }) },
  { id: 'goo', name: 'Goo', component: React.createElement(GooSticker, { size: 28, peel: false }) },
  { id: 'nori-cool', name: 'Nori Cool', component: React.createElement(NoriCoolSticker, { size: 28, peel: false }) },
  { id: 'pip-headphones', name: 'Pip Headphones', component: React.createElement(PipHeadphonesSticker, { size: 28, peel: false }) },
  { id: 'kuro-headphones', name: 'Kuro Headphones', component: React.createElement(KuroHeadphonesSticker, { size: 28, peel: false }) },
  { id: 'mochi-headphones', name: 'Mochi Headphones', component: React.createElement(MochiHeadphonesSticker, { size: 28, peel: false }) },
  { id: 'cat-cute', name: 'Cat Cute', component: React.createElement(CatCuteSticker, { size: 28, peel: false }) },
  { id: 'mochi-heart', name: 'Mochi Heart', component: React.createElement(MochiHeartSticker, { size: 28, peel: false }) },
  { id: 'peace-hand', name: 'Peace Hand', component: React.createElement(PeaceHandSticker, { size: 28, peel: false }) },
  { id: 'nori-headphones', name: 'Nori Headphones', component: React.createElement(NoriHeadphonesSticker, { size: 28, peel: false }) }
];

const renderedStickers = stickerConfigs.map(item => {
  let svg = ReactDOMServer.renderToStaticMarkup(item.component);
  // Ensure the SVG is responsive within its container
  svg = svg.replace(/width="[^"]*"/, 'width="100%"');
  svg = svg.replace(/height="[^"]*"/, 'height="100%"');
  return {
    id: item.id,
    name: item.name,
    svg
  };
});

const fileContent = `/**
 * stickers.js
 * Generated from 'stick-it-up' package components:
 * - BunnySticker
 * - HeartSticker
 * - GooSticker
 * - NoriCoolSticker
 * - PipHeadphonesSticker
 * - KuroHeadphonesSticker
 * - MochiHeadphonesSticker
 * - CatCuteSticker
 * - MochiHeartSticker
 * - PeaceHandSticker
 * - NoriHeadphonesSticker
 *
 * Provides responsive sizing, random placement & tilt,
 * 30-second automatic stay interval, manual selection hook,
 * and the authentic stick-it-up 3D vinyl peel effect.
 */

(function() {
  const STICKERS = ${JSON.stringify(renderedStickers, null, 2)};

  let currentIndex = -1;
  let intervalTimer = null;
  const STAY_DURATION = 30000; // Automatically stay for 30 seconds
  const stickerBox = document.getElementById("sticker-box");

  if (!stickerBox) {
    console.warn("Media Island: #sticker-box element not found.");
    return;
  }

  function getRandomPlacement() {
    // Realistic sticker tilt between -8deg and +8deg
    const angle = (Math.random() * 16 - 8).toFixed(1);
    // Subtle natural placement jitter between -1.5px and +1.5px
    const dx = (Math.random() * 3 - 1.5).toFixed(1);
    const dy = (Math.random() * 3 - 1.5).toFixed(1);
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
    const { rot, offset } = getRandomPlacement();

    // Trigger cute sticker slap animation
    stickerBox.classList.remove("sticker-slap");
    void stickerBox.offsetWidth; // Force reflow
    stickerBox.classList.add("sticker-slap");

    stickerBox.style.setProperty("--sticker-tilt", rot);
    stickerBox.style.setProperty("--sticker-offset", offset);
    stickerBox.setAttribute("title", \`Sticker: \${item.name} (Stays 30s • Click to randomize)\`);
    stickerBox.setAttribute("aria-label", \`\${item.name} sticker\`);
    stickerBox.innerHTML = item.svg;
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
    // Automatically change sticker randomly after staying 30 seconds
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

  // Expose hook so track changes can also trigger a random sticker change and reset the 30s timer
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
})();
`;

// Write to desktop app
fs.writeFileSync(path.join(__dirname, '..', 'app', 'stickers.js'), fileContent, 'utf8');

// Also write mobile data file for phone browser selection
const mobileStickersData = `/**
 * stickers-data.js
 * Exported sticker pack data for the Mobile Web Remote.
 * Contains all 11 stick-it-up stickers for mobile selection.
 */
window.ISLAND_STICKERS = ${JSON.stringify(renderedStickers, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'mobile', 'stickers-data.js'), mobileStickersData, 'utf8');
const appMobileDir = path.join(__dirname, '..', 'app', 'mobile');
if (fs.existsSync(appMobileDir)) {
  fs.writeFileSync(path.join(appMobileDir, 'stickers-data.js'), mobileStickersData, 'utf8');
}

console.log('Successfully updated stickers for Desktop (app/stickers.js) and Mobile (mobile/stickers-data.js)!');
