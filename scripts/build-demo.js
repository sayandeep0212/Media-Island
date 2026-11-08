const fs = require('fs');
const path = require('path');

const stickersJs = fs.readFileSync(path.join(__dirname, '..', 'app', 'stickers.js'), 'utf8');
const match = stickersJs.match(/const STICKERS = (\[[\s\S]*?\]);\s*let/);
const stickersData = match ? match[1] : '[]';

const demoHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    :root {
      --accent: #22c55e;
    }
    .island-container {
      background: radial-gradient(circle at top, #1f222e 0%, #0d0f14 100%);
    }
    #demo-pill {
      margin: 0 auto;
      width: 244px;
      height: 42px;
      box-sizing: border-box;
      background: #000;
      border: 1px solid #202020;
      border-radius: 999px;
      display: flex;
      align-items: center;
      padding: 5px 14px 5px 5px;
      color: #fff;
      position: relative;
      transition: all 0.35s cubic-bezier(0.3, 1.3, 0.5, 1);
      box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
    }
    #demo-pill.open {
      width: 500px;
      height: 154px;
      border-radius: 44px;
      padding: 14px 20px;
      flex-direction: column;
      align-items: stretch;
    }
    #topline {
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 32px;
      box-sizing: border-box;
      position: relative;
    }
    #demo-pill.open #topline {
      min-height: 54px;
    }
    #art {
      position: relative;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: #2a2024 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23631a22'/%3E%3Ccircle cx='40' cy='32' r='14' fill='%23d1434a'/%3E%3Crect x='18' y='52' width='44' height='20' rx='8' fill='%23d1434a'/%3E%3C/svg%3E") center/cover;
      flex: none;
      transition: all 0.35s;
    }
    #demo-pill.open #art {
      width: 54px;
      height: 54px;
      border-radius: 15px;
    }
    #source-badge {
      position: absolute;
      right: -5px;
      bottom: -5px;
      width: 17px;
      height: 17px;
      box-sizing: border-box;
      overflow: hidden;
      display: grid;
      place-items: center;
      border: 2px solid #000;
      border-radius: 50%;
      background: #e62117;
      color: #fff;
      font-size: 8px;
      font-weight: 900;
    }
    #info {
      display: none;
      min-width: 0;
      margin: 0 12px;
      opacity: 0;
      width: 0;
      transition: opacity 0.25s;
    }
    #demo-pill.open #info {
      display: block;
      flex: 1;
      opacity: 1;
      width: auto;
    }
    #title {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #artist {
      font-size: 13px;
      color: #9a9a9a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 3px;
    }
    #wave {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 22px;
      flex: none;
      margin-left: 10px;
    }
    #demo-pill.open #wave {
      margin-left: 0;
    }
    #wave i {
      display: block;
      width: 3px;
      border-radius: 3px;
      background: var(--accent);
      height: 6px;
      animation: bar 0.9s ease-in-out infinite;
    }
    #wave i:nth-child(1) { animation-delay: -0.7s; }
    #wave i:nth-child(2) { animation-delay: -0.3s; }
    #wave i:nth-child(3) { animation-delay: -0.5s; }
    #wave i:nth-child(4) { animation-delay: -0.1s; }
    #wave i:nth-child(5) { animation-delay: -0.6s; }

    #sticker-box {
      width: 28px;
      height: 28px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: auto;
      position: relative;
      user-select: none;
      perspective: 600px;
    }
    #demo-pill.open #sticker-box {
      margin-left: 12px;
    }
    #sticker-box svg {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      transform-origin: center center !important;
      transform: var(--sticker-offset, translate(0, 0)) var(--sticker-tilt, rotate(0deg)) perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
      transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #sticker-box:hover svg {
      transform: var(--sticker-offset, translate(0, 0)) var(--sticker-tilt, rotate(0deg)) perspective(600px) rotateX(12deg) rotateY(-12deg) translateY(-3px) scale(1.15);
      filter: drop-shadow(0 10px 14px rgba(0,0,0,0.6));
    }
    #sticker-box:active svg {
      transform: var(--sticker-offset, translate(0, 0)) var(--sticker-tilt, rotate(0deg)) scale(0.92);
      transition: transform 100ms ease;
    }
    @keyframes stickerSlap {
      0% { transform: scale(0.4) rotate(-15deg); opacity: 0; }
      60% { transform: scale(1.18) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    .sticker-slap svg {
      animation: stickerSlap 380ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    #phone-btn {
      display: none;
      width: 28px;
      height: 28px;
      margin-left: 10px;
      border: 0;
      border-radius: 50%;
      background: #242424;
      color: #aaa;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }
    #demo-pill.open #phone-btn {
      display: flex;
    }
    #close {
      display: none;
      width: 28px;
      height: 28px;
      margin-left: 6px;
      border: 0;
      border-radius: 50%;
      background: #242424;
      color: #aaa;
      font-size: 19px;
      line-height: 1;
      cursor: pointer;
    }
    #demo-pill.open #close {
      display: block;
    }
    #progress-row {
      display: none;
      align-items: center;
      gap: 10px;
      margin: 6px 1px 0;
      color: #a5a5a5;
      font-size: 11px;
    }
    #demo-pill.open #progress-row {
      display: flex;
    }
    #progress-bar {
      flex: 1;
      height: 5px;
      border-radius: 99px;
      background: linear-gradient(to right, var(--accent) 42%, #333 42%);
    }
    #ctrls {
      display: none;
      justify-content: center;
      align-items: center;
      gap: 28px;
      margin-top: 6px;
    }
    #demo-pill.open #ctrls {
      display: flex;
    }
    #ctrls button {
      background: none;
      border: 0;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    @keyframes bar {
      0%, 100% { height: 6px; }
      50% { height: 22px; }
    }

    /* Red placement guide overlay matching user screenshot */
    .red-guide {
      position: absolute;
      right: 5px;
      top: 3px;
      width: 44px;
      height: 28px;
      border: 2px dashed #ff3b30;
      border-radius: 10px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s;
    }
    .show-guide .red-guide {
      opacity: 0.9;
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] p-4 font-sans select-none antialiased">
  <div class="max-w-2xl mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
    
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[var(--border)] pb-4">
      <div>
        <h2 class="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
          <span>✨</span> Media Island Sticker Pack Demo (11 Stickers)
        </h2>
        <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
          Auto-switches every <b>30 seconds</b> • Authentic <code class="bg-[var(--surface-hover)] px-1 py-0.5 rounded text-xs">stick-it-up</code> 3D vinyl peel
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button id="toggle-state-btn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition">
          Toggle Open / Collapse
        </button>
      </div>
    </div>

    <!-- Live Display Stage -->
    <div class="island-container rounded-xl p-8 flex flex-col items-center justify-center min-h-[190px] border border-[var(--border)] relative overflow-hidden">
      <div id="demo-pill" class="show">
        <div id="topline">
          <div id="art">
            <span id="source-badge">▶</span>
          </div>
          <div id="info">
            <div id="title">Starboy (feat. Daft Punk)</div>
            <div id="artist">The Weeknd</div>
          </div>
          <div id="wave">
            <i></i><i></i><i></i><i></i><i></i>
          </div>
          
          <!-- Sticker Container -->
          <div id="sticker-box" role="button" tabindex="0" title="Click to change sticker"></div>
          
          <!-- Red marker comparison overlay -->
          <div id="guide-box" class="red-guide"></div>

          <button id="phone-btn">📱</button>
          <button id="close">×</button>
        </div>

        <div id="progress-row">
          <span>1:48</span>
          <div id="progress-bar"></div>
          <span>-2:02</span>
        </div>

        <div id="ctrls">
          <button>⏮</button>
          <button style="font-size: 23px;">⏸</button>
          <button>⏭</button>
        </div>
      </div>

      <!-- Live 30-sec Countdown indicator -->
      <div class="absolute bottom-2.5 flex items-center gap-3 text-xs text-gray-400 font-mono">
        <span class="flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Auto-change in: <span id="timer-sec" class="text-white font-bold">30s</span>
        </span>
        <span class="text-gray-600">•</span>
        <span>Click sticker to instant-swap</span>
      </div>
    </div>

    <!-- Sticker Gallery & Controls -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-[var(--foreground)]">All Active Stickers in Pack:</span>
        <div class="flex items-center gap-2">
          <span class="text-xs text-[var(--muted-foreground)]">Showing:</span>
          <span id="current-name" class="text-xs font-mono font-bold text-amber-400">Bunny</span>
        </div>
      </div>

      <!-- 11 sticker pill buttons -->
      <div class="flex flex-wrap gap-1.5" id="sticker-buttons"></div>
    </div>

    <!-- Verification & Action row -->
    <div class="bg-[var(--surface)] p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between">
      <div class="space-y-0.5">
        <span class="text-xs font-semibold text-[var(--foreground)]">Alignment Guide</span>
        <p class="text-[11px] text-[var(--muted-foreground)]">Toggle red border box from your screenshot to verify exact positioning.</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="guide-btn" class="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] hover:border-red-500 transition font-medium">
          Toggle Red Alignment Box
        </button>
        <button id="random-btn" class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition">
          🎲 Next Random Sticker
        </button>
      </div>
    </div>

  </div>

  <script>
    const STICKERS = ${stickersData};
    let currentIndex = 0;
    let secondsLeft = 30;
    let timerInterval = null;
    let countdownInterval = null;

    const pill = document.getElementById("demo-pill");
    const stickerBox = document.getElementById("sticker-box");
    const currentNameEl = document.getElementById("current-name");
    const btnContainer = document.getElementById("sticker-buttons");
    const timerSecEl = document.getElementById("timer-sec");

    function getRandomPlacement() {
      const angle = (Math.random() * 16 - 8).toFixed(1);
      const dx = (Math.random() * 3 - 1.5).toFixed(1);
      const dy = (Math.random() * 3 - 1.5).toFixed(1);
      return {
        rot: 'rotate(' + angle + 'deg)',
        offset: 'translate(' + dx + 'px, ' + dy + 'px)'
      };
    }

    function setSticker(index) {
      currentIndex = index;
      const item = STICKERS[currentIndex];
      const { rot, offset } = getRandomPlacement();

      stickerBox.classList.remove("sticker-slap");
      void stickerBox.offsetWidth;
      stickerBox.classList.add("sticker-slap");

      stickerBox.style.setProperty("--sticker-tilt", rot);
      stickerBox.style.setProperty("--sticker-offset", offset);
      stickerBox.innerHTML = item.svg;
      currentNameEl.textContent = item.name;

      // Update button highlights
      document.querySelectorAll(".sticker-select-btn").forEach((btn, i) => {
        if (i === currentIndex) {
          btn.className = "sticker-select-btn text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium";
        } else {
          btn.className = "sticker-select-btn text-xs px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] font-medium";
        }
      });
    }

    function nextRandomSticker() {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * STICKERS.length);
      } while (nextIndex === currentIndex && STICKERS.length > 1);
      setSticker(nextIndex);
      reset30SecTimer();
    }

    function reset30SecTimer() {
      secondsLeft = 30;
      timerSecEl.textContent = secondsLeft + 's';
      if (timerInterval) clearInterval(timerInterval);
      if (countdownInterval) clearInterval(countdownInterval);

      countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft < 0) secondsLeft = 30;
        timerSecEl.textContent = secondsLeft + 's';
      }, 1000);

      timerInterval = setInterval(() => {
        nextRandomSticker();
      }, 30000);
    }

    // Build buttons for all 11 stickers
    STICKERS.forEach((st, idx) => {
      const btn = document.createElement("button");
      btn.textContent = st.name;
      btn.onclick = () => {
        setSticker(idx);
        reset30SecTimer();
      };
      btnContainer.appendChild(btn);
    });

    // Sticker click event
    stickerBox.addEventListener("click", nextRandomSticker);
    document.getElementById("random-btn").addEventListener("click", nextRandomSticker);

    // Toggle Collapsed / Open
    document.getElementById("toggle-state-btn").addEventListener("click", () => {
      pill.classList.toggle("open");
    });

    // Toggle guide box
    document.getElementById("guide-btn").addEventListener("click", () => {
      pill.classList.toggle("show-guide");
    });

    // Initial render
    setSticker(0);
    reset30SecTimer();
  </script>
</body>
</html>
`;

const outPath = path.join('C:', 'Users', 'sayan', '.gemini', 'antigravity', 'brain', '0a1ddd81-a6c7-4850-b14e-c15c4e886039', 'island-demo.html');
fs.writeFileSync(outPath, demoHtml, 'utf8');
console.log('Successfully updated island-demo.html with 11 stickers and 30s countdown!');
