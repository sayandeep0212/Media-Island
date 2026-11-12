// Media Island Mobile Remote Client
(function () {
  const $ = id => document.getElementById(id);

  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyC6cLy4w_MVXIJX3glLjIn2aWCKtqgBpzo",
    authDomain: "media-island.firebaseapp.com",
    projectId: "media-island",
    databaseURL: "https://media-island-default-rtdb.firebaseio.com",
    storageBucket: "media-island.firebasestorage.app",
    messagingSenderId: "277961059084",
    appId: "1:277961059084:web:6f94aa2e3d5281b053b729",
    measurementId: "G-45J422DSZM"
  };

  // State variables
  let db = null;
  let roomCode = "";
  let firebaseConfig = DEFAULT_FIREBASE_CONFIG;
  let localWs = null;
  let isDraggingSlider = false;
  let currentDuration = 0;
  let currentAccentColor = "#ff8a3d";

  // Elements
  const statusBadge = $("statusBadge");
  const statusText = $("statusText");
  const activeRoomDisplay = $("activeRoomDisplay");
  const roomIndicator = $("roomIndicator");
  const roomDot = $("roomDot");
  const quickScanBtn = $("quickScanBtn");
  const quickChangeBtn = $("quickChangeBtn");
  const desktopOfflineNotice = $("desktopOfflineNotice");
  const islandPill = $("islandPill");
  const artWrap = $("artWrap");
  const sourceIcon = $("sourceIcon");
  const sourceFallback = $("sourceFallback");
  const trackTitle = $("trackTitle");
  const trackArtist = $("trackArtist");
  const activeTitle = $("activeTitle");
  const activeArtist = $("activeArtist");
  const sourceName = $("sourceName");
  const wave = $("wave");
  const seekSlider = $("seekSlider");
  const elapsedTime = $("elapsedTime");
  const remainingTime = $("remainingTime");
  const prevBtn = $("prevBtn");
  const playPauseBtn = $("playPauseBtn");
  const nextBtn = $("nextBtn");
  const activeHexLabel = $("activeHexLabel");
  const nativeColorPicker = $("nativeColorPicker");
  const customHexInput = $("customHexInput");
  const applyCustomColorBtn = $("applyCustomColorBtn");
  const colorPresets = $("colorPresets");

  // Dynamic Island Stickers Studio Elements
  const mobileStickerBox = $("mobileStickerBox");
  const mobileStickerGrid = $("mobileStickerGrid");
  const activeStickerLabel = $("activeStickerLabel");
  const stickerAutoBtn = $("stickerAutoBtn");
  const stickerRandomBtn = $("stickerRandomBtn");
  let currentStickerId = "auto";

  // Neon Edge Lighting Studio Elements
  const glowToggle = $("glowToggle");
  const blackoutCard = $("blackoutCard");
  const toggleBlackoutBtn = $("toggleBlackoutBtn");
  const blackoutBtnLabel = $("blackoutBtnLabel");
  const activeGlowModeLabel = $("activeGlowModeLabel");
  const glowPresets = $("glowPresets");
  const glowAccentChipPreview = $("glowAccentChipPreview");
  const glowBrightnessSlider = $("glowBrightnessSlider");
  const glowBrightnessValue = $("glowBrightnessValue");

  // System Controls & Pinned Apps elements
  const mobileBrightSlider = $("mobileBrightSlider");
  const mobileBrightVal = $("mobileBrightVal");
  const mobileVolSlider = $("mobileVolSlider");
  const mobileVolVal = $("mobileVolVal");
  const mobileAppsGrid = $("mobileAppsGrid");

  let currentGlow = {
    enabled: false,
    mode: "aurora",
    brightness: 100,
    sleepBlackout: false,
    customColor: "#00f0ff"
  };

  const ICON_PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>';
  const ICON_PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1zm8 0c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1z"/></svg>';

  // Modal elements
  const settingsBtn = $("settingsBtn");
  const settingsModal = $("settingsModal");
  const closeModalBtn = $("closeModalBtn");
  const roomCodeInput = $("roomCodeInput");
  const saveConfigBtn = $("saveConfigBtn");

  // QR Scanner elements
  const openScannerBtn = $("openScannerBtn");
  const openScannerFromModalBtn = $("openScannerFromModalBtn");
  const scannerOverlay = $("scannerOverlay");
  const closeScannerBtn = $("closeScannerBtn");
  const scannerFrame = $("scannerFrame");
  const scannerHint = $("scannerHint");
  const scannerError = $("scannerError");
  let html5QrCode = null;
  let isScanning = false;

  // Haptic feedback helper
  function vibrate(ms = 25) {
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(ms); } catch {}
    }
  }

  // Format seconds to mm:ss
  function formatTime(seconds) {
    const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  // Set Accent Color throughout UI
  function setAccentColor(color, fromRemote = false) {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return;
    currentAccentColor = color;
    document.documentElement.style.setProperty("--accent", color);
    activeHexLabel.textContent = color.toUpperCase();
    nativeColorPicker.value = color;
    customHexInput.value = color.toUpperCase();

    // Update preset chips active state
    document.querySelectorAll(".preset-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.color.toLowerCase() === color.toLowerCase());
    });

    // If change originated on phone, send to desktop
    if (!fromRemote) {
      sendCommand("setAccentColor", color);
      if (db && roomCode) {
        db.ref(`rooms/${roomCode}/settings`).update({
          accentColor: color,
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }
  }

  // Update Media State in UI
  function updateMediaState(state) {
    if (!state || state.type === "none" || (!state.title && !state.playing)) {
      trackTitle.textContent = "No Media Playing";
      trackArtist.textContent = "Open YouTube or Spotify in desktop Chrome";
      activeTitle.textContent = "Media Island Remote";
      activeArtist.textContent = "Ready to control desktop audio & video";
      sourceName.textContent = "Desktop Chrome";
      sourceIcon.style.display = "none";
      sourceFallback.style.display = "none";
      artWrap.style.backgroundImage = "none";
      artWrap.classList.remove("playing");
      wave.classList.remove("playing");
      playPauseBtn.innerHTML = ICON_PLAY;
      seekSlider.value = 0;
      seekSlider.style.setProperty("--progress", "0%");
      elapsedTime.textContent = "0:00";
      remainingTime.textContent = "-0:00";
      return;
    }

    // Title & Artist
    trackTitle.textContent = state.title || "Unknown Track";
    trackArtist.textContent = state.artist || "";
    activeTitle.textContent = state.title || "Unknown Track";
    activeArtist.textContent = state.artist || "Unknown Artist";

    // Source info
    sourceName.textContent = state.sourceName || "Desktop Browser";
    if (state.sourceIcon) {
      sourceIcon.src = state.sourceIcon;
      sourceIcon.style.display = "block";
      sourceFallback.style.display = "none";
    } else {
      sourceIcon.style.display = "none";
      sourceFallback.style.display = "block";
      sourceFallback.textContent = (state.sourceName || "M").charAt(0).toUpperCase();
    }

    // Artwork
    if (state.art) {
      artWrap.style.backgroundImage = `url("${state.art}")`;
    } else {
      artWrap.style.backgroundImage = "none";
    }

    // Playing state
    const isPlaying = !!state.playing;
    artWrap.classList.toggle("playing", isPlaying);
    wave.classList.toggle("playing", isPlaying);
    playPauseBtn.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;

    // Progress
    currentDuration = Number.isFinite(state.duration) ? state.duration : 0;
    const curTime = Number.isFinite(state.currentTime) ? state.currentTime : 0;
    if (!isDraggingSlider && currentDuration > 0) {
      const pct = Math.min(100, Math.max(0, (curTime / currentDuration) * 100));
      seekSlider.value = Math.round(pct);
      seekSlider.style.setProperty("--progress", `${pct}%`);
      elapsedTime.textContent = formatTime(curTime);
      remainingTime.textContent = `-${formatTime(Math.max(0, currentDuration - curTime))}`;
    }
  }

  // Update Status Pill
  function setStatus(status, text) {
    statusBadge.className = `status-badge ${status}`;
    statusText.textContent = text;
  }

  // Send Command to Desktop
  function sendCommand(cmd, value = null) {
    vibrate(20);
    const payload = {
      cmd,
      value,
      ts: Date.now(),
      id: `${cmd}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: "mobile"
    };

    // 1. Send via Firebase
    if (db && roomCode) {
      db.ref(`rooms/${roomCode}/command`).set(payload).catch(err => {
        console.error("Firebase sendCommand error:", err);
      });
    }

    // 2. Send via Local WebSocket (if connected)
    if (localWs && localWs.readyState === WebSocket.OPEN) {
      localWs.send(JSON.stringify({ type: "cmd", ...payload }));
    }
  }

  // Attach Media Controls
  playPauseBtn.addEventListener("click", () => sendCommand("playpause"));
  prevBtn.addEventListener("click", () => sendCommand("prev"));
  nextBtn.addEventListener("click", () => sendCommand("next"));

  // Seek Slider Events
  seekSlider.addEventListener("input", e => {
    isDraggingSlider = true;
    const pct = Number(e.target.value);
    seekSlider.style.setProperty("--progress", `${pct}%`);
    if (currentDuration > 0) {
      const targetTime = (pct / 100) * currentDuration;
      elapsedTime.textContent = formatTime(targetTime);
      remainingTime.textContent = `-${formatTime(Math.max(0, currentDuration - targetTime))}`;
    }
  });

  seekSlider.addEventListener("change", e => {
    isDraggingSlider = false;
    const pct = Number(e.target.value);
    if (currentDuration > 0) {
      const targetTime = (pct / 100) * currentDuration;
      sendCommand("seek", targetTime);
    }
  });

  // Color Preset Chips
  colorPresets.addEventListener("click", e => {
    const chip = e.target.closest(".preset-chip");
    if (!chip) return;
    const color = chip.dataset.color;
    setAccentColor(color);
  });

  // Native Color Picker
  nativeColorPicker.addEventListener("input", e => {
    setAccentColor(e.target.value);
  });

  // Hex Input Apply
  applyCustomColorBtn.addEventListener("click", () => {
    let val = customHexInput.value.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#[0-9a-f]{6}$/i.test(val)) {
      setAccentColor(val);
    } else {
      alert("Please enter a valid 6-character hex color (e.g. #FF8A3D)");
    }
  });

  // ----------------------------------------------------
  // Dynamic Island Stickers Studio (stick-it-up pack)
  // ----------------------------------------------------
  let stickerInitRetries = 0;

  function getStickersList() {
    return Array.isArray(window.ISLAND_STICKERS) ? window.ISLAND_STICKERS : [];
  }

  function initStickersStudio() {
    if (!mobileStickerGrid) return;
    const list = getStickersList();
    if (list.length) {
      if (!mobileStickerGrid.children.length) {
        mobileStickerGrid.innerHTML = list.map(s => `
          <div class="sticker-card" data-id="${s.id}" role="button" tabindex="0" title="${s.name} Sticker">
            <span class="sticker-badge">✓</span>
            <div class="sticker-img-wrap">${s.svg}</div>
            <span class="sticker-name">${s.name}</span>
          </div>
        `).join("");
      }
      if (mobileStickerBox && list[0] && !mobileStickerBox.innerHTML.trim()) {
        mobileStickerBox.innerHTML = list[0].svg;
      }
    } else {
      if (stickerInitRetries < 50) {
        stickerInitRetries++;
        setTimeout(initStickersStudio, 150);
      }
    }

    if (mobileStickerBox && !mobileStickerBox.innerHTML.trim()) {
      const firstSvg = mobileStickerGrid.querySelector(".sticker-card .sticker-img-wrap");
      if (firstSvg) mobileStickerBox.innerHTML = firstSvg.innerHTML;
    }
  }

  function applyStickerUI(stickerId) {
    if (stickerId === "auto") {
      currentStickerId = "auto";
      if (activeStickerLabel) activeStickerLabel.textContent = "Auto (30s)";
      if (stickerAutoBtn) stickerAutoBtn.classList.add("active");
      document.querySelectorAll(".sticker-card").forEach(c => c.classList.remove("active"));
      return;
    }

    currentStickerId = stickerId;
    if (stickerAutoBtn) stickerAutoBtn.classList.remove("active");

    const card = document.querySelector(`.sticker-card[data-id="${stickerId}"]`);
    if (card) {
      const nameEl = card.querySelector(".sticker-name");
      if (activeStickerLabel && nameEl) activeStickerLabel.textContent = nameEl.textContent;
      const svgEl = card.querySelector(".sticker-img-wrap");
      if (mobileStickerBox && svgEl) {
        mobileStickerBox.innerHTML = svgEl.innerHTML;
        mobileStickerBox.classList.remove("slap");
        void mobileStickerBox.offsetWidth;
        mobileStickerBox.classList.add("slap");
      }
    } else {
      const list = getStickersList();
      const found = list.find(s => s.id === stickerId);
      if (found) {
        if (activeStickerLabel) activeStickerLabel.textContent = found.name;
        if (mobileStickerBox) {
          mobileStickerBox.innerHTML = found.svg;
          mobileStickerBox.classList.remove("slap");
          void mobileStickerBox.offsetWidth;
          mobileStickerBox.classList.add("slap");
        }
      }
    }

    document.querySelectorAll(".sticker-card").forEach(c => {
      c.classList.toggle("active", c.dataset.id === stickerId);
    });
  }

  function chooseSticker(stickerId, isUserAction = true) {
    applyStickerUI(stickerId);

    if (isUserAction) {
      vibrate(30);
      sendCommand("setSticker", stickerId);
      if (db && roomCode) {
        db.ref(`rooms/${roomCode}/settings`).update({
          currentSticker: stickerId,
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }
  }

  if (mobileStickerGrid) {
    mobileStickerGrid.addEventListener("click", e => {
      const card = e.target.closest(".sticker-card");
      if (!card) return;
      const id = card.dataset.id;
      if (id) chooseSticker(id, true);
    });

    mobileStickerGrid.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        const card = e.target.closest(".sticker-card");
        if (card && card.dataset.id) {
          e.preventDefault();
          chooseSticker(card.dataset.id, true);
        }
      }
    });
  }

  if (stickerAutoBtn) {
    stickerAutoBtn.addEventListener("click", () => {
      chooseSticker("auto", true);
    });
  }

  if (stickerRandomBtn) {
    stickerRandomBtn.addEventListener("click", () => {
      const cards = Array.from(document.querySelectorAll(".sticker-card"));
      if (cards.length) {
        const pool = cards.filter(c => c.dataset.id !== currentStickerId);
        const chosen = (pool.length ? pool : cards)[Math.floor(Math.random() * (pool.length || cards.length))];
        if (chosen && chosen.dataset.id) {
          chooseSticker(chosen.dataset.id, true);
        }
      }
    });
  }

  if (mobileStickerBox) {
    mobileStickerBox.addEventListener("click", () => {
      const list = getStickersList();
      if (!list.length) return;
      const nextIdx = (list.findIndex(s => s.id === currentStickerId) + 1) % list.length;
      chooseSticker(list[nextIdx].id, true);
    });
  }

  // ----------------------------------------------------
  // Neon Edge Lighting Studio Logic
  // ----------------------------------------------------
  function applyGlowUI(config, isUserAction = false) {
    if (!config) return;
    currentGlow = Object.assign(currentGlow, config);

    if (glowToggle) glowToggle.checked = !!currentGlow.enabled;

    if (blackoutCard) blackoutCard.classList.toggle("active", !!currentGlow.sleepBlackout);
    if (blackoutBtnLabel) blackoutBtnLabel.textContent = currentGlow.sleepBlackout ? "Wake Screen" : "Activate Blackout";

    const modeLabels = {
      aurora: "Cyberpunk Aurora",
      accent: "Match Island",
      cyan: "Electric Cyan",
      pink: "Neon Pink",
      sunset: "Sunset Amber",
      emerald: "Emerald Matrix",
      purple: "Purple Dream"
    };

    if (activeGlowModeLabel) {
      activeGlowModeLabel.textContent = modeLabels[currentGlow.mode] || currentGlow.mode;
    }

    if (glowPresets) {
      glowPresets.querySelectorAll(".glow-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.mode === currentGlow.mode);
      });
    }

    if (glowBrightnessSlider) glowBrightnessSlider.value = currentGlow.brightness || 100;
    if (glowBrightnessValue) glowBrightnessValue.textContent = `${currentGlow.brightness || 100}%`;
    if (glowAccentChipPreview) glowAccentChipPreview.style.background = currentAccentColor;

    if (isUserAction) {
      vibrate(25);
      sendCommand("setGlow", currentGlow);
      if (db && roomCode) {
        db.ref(`rooms/${roomCode}/settings/glow`).update({
          ...currentGlow,
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }
  }

  if (glowToggle) {
    glowToggle.addEventListener("change", () => {
      applyGlowUI({ enabled: glowToggle.checked }, true);
    });
  }

  if (toggleBlackoutBtn) {
    toggleBlackoutBtn.addEventListener("click", () => {
      applyGlowUI({ sleepBlackout: !currentGlow.sleepBlackout }, true);
    });
  }

  if (glowPresets) {
    glowPresets.addEventListener("click", e => {
      const chip = e.target.closest(".glow-chip");
      if (!chip) return;
      const mode = chip.dataset.mode;
      if (mode) {
        applyGlowUI({ mode, enabled: true }, true);
      }
    });
  }

  if (glowBrightnessSlider) {
    glowBrightnessSlider.addEventListener("input", e => {
      const val = Number(e.target.value) || 100;
      if (glowBrightnessValue) glowBrightnessValue.textContent = `${val}%`;
      currentGlow.brightness = val;
    });

    glowBrightnessSlider.addEventListener("change", e => {
      const val = Number(e.target.value) || 100;
      applyGlowUI({ brightness: val }, true);
    });
  }

  // System Controls & Pinned Apps Events
  if (mobileBrightSlider) {
    mobileBrightSlider.addEventListener("input", e => {
      const val = Number(e.target.value);
      if (mobileBrightVal) mobileBrightVal.textContent = `${val}%`;
    });
    mobileBrightSlider.addEventListener("change", e => {
      const val = Number(e.target.value);
      sendCommand("setBrightness", val);
    });
  }

  if (mobileVolSlider) {
    mobileVolSlider.addEventListener("input", e => {
      const val = Number(e.target.value);
      if (mobileVolVal) mobileVolVal.textContent = `${val}%`;
    });
    mobileVolSlider.addEventListener("change", e => {
      const val = Number(e.target.value);
      sendCommand("setVolume", val);
    });
  }

  if (mobileAppsGrid) {
    mobileAppsGrid.addEventListener("click", e => {
      const btn = e.target.closest(".m-app-btn");
      if (!btn) return;
      const target = btn.dataset.target;
      if (target) {
        vibrate(30);
        sendCommand("launchApp", target);
      }
    });
  }

  // Modal Dialog Events
  settingsBtn.addEventListener("click", () => {
    roomCodeInput.value = roomCode || "";
    settingsModal.classList.add("open");
  });

  closeModalBtn.addEventListener("click", () => {
    settingsModal.classList.remove("open");
  });

  settingsModal.addEventListener("click", e => {
    if (e.target === settingsModal) settingsModal.classList.remove("open");
  });

  saveConfigBtn.addEventListener("click", () => {
    const newRoom = roomCodeInput.value.trim();

    if (!newRoom) {
      alert("Please enter a Pairing Code / Room ID");
      return;
    }

    roomCode = newRoom;
    localStorage.setItem("media_island_room", roomCode);
    if (activeRoomDisplay) {
      activeRoomDisplay.textContent = roomCode;
    }
    settingsModal.classList.remove("open");
    connect();
  });

  // Read URL parameters for 1-click pairing via QR code or storage
  async function loadConfigFromUrlOrStorage() {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");

    if (urlRoom && urlRoom.trim()) {
      roomCode = urlRoom.trim();
      localStorage.setItem("media_island_room", roomCode);
    } else {
      const storedRoom = localStorage.getItem("media_island_room");
      if (storedRoom && storedRoom !== "sayan-island" && storedRoom.trim()) {
        roomCode = storedRoom.trim();
      } else {
        // Fallback default: island-p6j3fc (user's desktop room)
        roomCode = "island-p6j3fc";
        localStorage.setItem("media_island_room", roomCode);
      }
    }

    if (activeRoomDisplay) {
      activeRoomDisplay.textContent = roomCode;
    }

    firebaseConfig = DEFAULT_FIREBASE_CONFIG;
  }

  // Update Desktop Connection Indicator
  function updateDesktopStatus(isOnline) {
    if (roomDot) {
      roomDot.className = isOnline ? "room-dot online" : "room-dot waiting";
    }
    if (desktopOfflineNotice) {
      desktopOfflineNotice.style.display = isOnline ? "none" : "flex";
    }
    if (isOnline) {
      setStatus("connected", "Desktop Connected");
    } else {
      setStatus("connecting", "Waiting for PC");
    }
  }

  // Connect to Firebase and Local WebSocket
  function connect() {
    if (activeRoomDisplay) {
      activeRoomDisplay.textContent = roomCode;
    }

    if (!roomCode) {
      setStatus("connecting", "Pairing Required");
      settingsModal.classList.add("open");
      return;
    }

    setStatus("connecting", "Connecting...");

    // 1. Connect to Firebase Realtime Database
    if (firebaseConfig && firebaseConfig.databaseURL) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();

        // Listen for desktop online presence
        const desktopRef = db.ref(`rooms/${roomCode}/desktop`);
        desktopRef.on("value", snapshot => {
          const val = snapshot.val();
          const isOnline = !!(val && val.online);
          const isRecent = val && val.updatedAt && (Date.now() - val.updatedAt < 90000);
          updateDesktopStatus(isOnline || isRecent);
        });

        // Listen for desktop playback state
        const stateRef = db.ref(`rooms/${roomCode}/state`);
        stateRef.on("value", snapshot => {
          const state = snapshot.val();
          if (state && (state.title || state.playing)) {
            updateDesktopStatus(true);
          }
          updateMediaState(state);
        }, err => {
          console.error("Firebase state read error:", err);
          setStatus("error", "Firebase Error");
        });

        // Listen for accent color & sticker updates from desktop
        const settingsRef = db.ref(`rooms/${roomCode}/settings`);
        settingsRef.on("value", snapshot => {
          const val = snapshot.val();
          if (val) {
            if (val.accentColor) setAccentColor(val.accentColor, true);
            if (val.currentSticker) chooseSticker(val.currentSticker, false);
            if (val.glow) applyGlowUI(val.glow, false);
          }
        });

        // Listen for system controls (volume & brightness)
        const controlsRef = db.ref(`rooms/${roomCode}/controls`);
        controlsRef.on("value", snapshot => {
          const ctrls = snapshot.val();
          if (!ctrls) return;
          if (ctrls.volume != null && mobileVolSlider && !mobileVolSlider.matches(":active")) {
            mobileVolSlider.value = ctrls.volume;
            if (mobileVolVal) mobileVolVal.textContent = `${ctrls.volume}%`;
          }
          if (ctrls.brightness != null && mobileBrightSlider && !mobileBrightSlider.matches(":active")) {
            mobileBrightSlider.value = ctrls.brightness;
            if (mobileBrightVal) mobileBrightVal.textContent = `${ctrls.brightness}%`;
          }
        });

        // Realtime connection indicator
        db.ref(".info/connected").on("value", snap => {
          if (snap.val() !== true) {
            setStatus("connecting", "Reconnecting...");
            if (roomDot) roomDot.className = "room-dot offline";
          }
        });

      } catch (err) {
        console.error("Firebase initialization failed:", err);
        setStatus("error", "Config Error");
      }
    }

    // 2. Direct LAN WebSocket Fallback (if accessed over local desktop IP)
    const isLocalHost = window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1" ||
                        /^192\.168\./.test(window.location.hostname) ||
                        /^10\./.test(window.location.hostname) ||
                        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname);

    if (isLocalHost && window.location.port) {
      try {
        const wsUrl = `ws://${window.location.hostname}:${window.location.port}`;
        localWs = new WebSocket(wsUrl);

        localWs.onopen = () => {
          setStatus("connected", "Online (Local Wi-Fi)");
        };

        localWs.onmessage = e => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "state") {
              setStatus("connected", "Online (Local Wi-Fi)");
              updateMediaState(data);
            } else if (data.type === "accent-color") {
              setAccentColor(data.color, true);
            } else if (data.type === "sticker") {
              chooseSticker(data.value, false);
            } else if (data.type === "glow") {
              applyGlowUI(data.value, false);
            }
          } catch {}
        };

        localWs.onclose = () => {
          localWs = null;
          if (!db || !statusBadge.className.includes("connected")) {
            setStatus("connecting", "Disconnected");
          }
        };
      } catch {}
    }

    if (!roomCode && !isLocalHost) {
      setStatus("connecting", "Pairing Required");
      settingsModal.classList.add("open");
    }
  }

  // --- WhatsApp Web Style Camera QR Scanner ---
  function extractRoomFromScannedText(text) {
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();

    // 1. Full URL e.g. https://media-island.web.app/?room=island-xyz
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const parsedUrl = new URL(trimmed);
        const room = parsedUrl.searchParams.get("room");
        if (room && room.trim()) return room.trim();
      }
    } catch {}

    // 2. Query parameter in string e.g. ?room=xyz
    const match = trimmed.match(/[?&]room=([^&#\s]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }

    // 3. Raw room code format
    if (/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  async function startScanner() {
    scannerError.style.display = "none";
    scannerFrame.classList.remove("success");
    scannerHint.textContent = "Point camera at the QR code shown on your computer screen";
    scannerOverlay.classList.add("active");

    if (settingsModal.classList.contains("open")) {
      settingsModal.classList.remove("open");
    }

    if (!window.Html5Qrcode) {
      scannerError.textContent = "Scanner library is loading. Please try again in a moment.";
      scannerError.style.display = "block";
      return;
    }

    try {
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qrReader");
      }

      isScanning = true;
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        decodedText => {
          onQrCodeDetected(decodedText);
        },
        () => {
          // Frame scan pass without QR
        }
      );
    } catch (err) {
      console.error("Camera start failed:", err);
      isScanning = false;
      scannerError.textContent = "Camera permission denied or camera unavailable. You can enter your Room Code manually.";
      scannerError.style.display = "block";
    }
  }

  async function stopScanner() {
    if (html5QrCode && isScanning) {
      try {
        isScanning = false;
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    scannerOverlay.classList.remove("active");
  }

  function onQrCodeDetected(decodedText) {
    const detectedRoom = extractRoomFromScannedText(decodedText);
    if (!detectedRoom) return;

    vibrate([40, 60, 40]);
    scannerFrame.classList.add("success");
    scannerHint.textContent = `Paired with ${detectedRoom}! Connecting...`;

    setTimeout(async () => {
      await stopScanner();
      roomCode = detectedRoom;
      localStorage.setItem("media_island_room", roomCode);
      connect();
    }, 450);
  }

  if (openScannerBtn) openScannerBtn.addEventListener("click", startScanner);
  if (openScannerFromModalBtn) openScannerFromModalBtn.addEventListener("click", startScanner);
  if (closeScannerBtn) closeScannerBtn.addEventListener("click", stopScanner);

  if (quickScanBtn) quickScanBtn.addEventListener("click", startScanner);
  if (quickChangeBtn) {
    quickChangeBtn.addEventListener("click", () => {
      roomCodeInput.value = roomCode || "";
      settingsModal.classList.add("open");
    });
  }
  if (roomIndicator) {
    roomIndicator.addEventListener("click", () => {
      roomCodeInput.value = roomCode || "";
      settingsModal.classList.add("open");
    });
  }

  // Initialize
  initStickersStudio();
  loadConfigFromUrlOrStorage().then(() => {
    connect();
  });
})();
