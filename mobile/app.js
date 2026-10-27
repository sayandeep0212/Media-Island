// Media Island Mobile Remote Client
(function () {
  const $ = id => document.getElementById(id);

  // State variables
  let db = null;
  let roomCode = "sayan-island";
  let firebaseConfig = null;
  let localWs = null;
  let isDraggingSlider = false;
  let currentDuration = 0;
  let currentAccentColor = "#ff8a3d";

  // Elements
  const statusBadge = $("statusBadge");
  const statusText = $("statusText");
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

  // Modal elements
  const settingsBtn = $("settingsBtn");
  const settingsModal = $("settingsModal");
  const closeModalBtn = $("closeModalBtn");
  const roomCodeInput = $("roomCodeInput");
  const firebaseConfigInput = $("firebaseConfigInput");
  const saveConfigBtn = $("saveConfigBtn");

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
      playPauseBtn.textContent = "▶";
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
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶";

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
    const payload = { cmd, value, ts: Date.now(), source: "mobile" };

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

  // Modal Dialog Events
  settingsBtn.addEventListener("click", () => {
    roomCodeInput.value = roomCode || "sayan-island";
    firebaseConfigInput.value = firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : "";
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
    const configStr = firebaseConfigInput.value.trim();

    if (!newRoom) {
      alert("Please enter a Pairing Code / Room ID");
      return;
    }

    let parsedConfig = null;
    if (configStr) {
      try {
        parsedConfig = JSON.parse(configStr);
      } catch (err) {
        alert("Invalid JSON for Firebase Config. Please check the format.");
        return;
      }
    }

    roomCode = newRoom;
    firebaseConfig = parsedConfig;

    localStorage.setItem("media_island_room", roomCode);
    if (firebaseConfig) {
      localStorage.setItem("media_island_firebase_config", JSON.stringify(firebaseConfig));
    } else {
      localStorage.removeItem("media_island_firebase_config");
    }

    settingsModal.classList.remove("open");
    connect();
  });

  // Read URL parameters for 1-click pairing via QR code or storage
  async function loadConfigFromUrlOrStorage() {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");
    const urlConfig = params.get("config") || params.get("cfg");

    if (urlRoom) {
      roomCode = urlRoom;
      localStorage.setItem("media_island_room", roomCode);
    } else {
      roomCode = localStorage.getItem("media_island_room") || "sayan-island";
    }

    if (urlConfig) {
      try {
        firebaseConfig = JSON.parse(decodeURIComponent(urlConfig));
        localStorage.setItem("media_island_firebase_config", JSON.stringify(firebaseConfig));
      } catch {}
    } else {
      const stored = localStorage.getItem("media_island_firebase_config");
      if (stored) {
        try { firebaseConfig = JSON.parse(stored); } catch {}
      }
    }

    // Attempt to load local git-ignored firebase-config.json if available
    if (!firebaseConfig) {
      try {
        const res = await fetch("./firebase-config.json");
        if (res.ok) {
          const fetched = await res.json();
          if (fetched && fetched.apiKey && !fetched.apiKey.includes("your_api_key")) {
            firebaseConfig = fetched;
            localStorage.setItem("media_island_firebase_config", JSON.stringify(firebaseConfig));
          }
        }
      } catch {}
    }

    if (firebaseConfig && !firebaseConfig.databaseURL && firebaseConfig.projectId) {
      firebaseConfig.databaseURL = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
    }
  }

  // Connect to Firebase and Local WebSocket
  function connect() {
    setStatus("connecting", "Connecting...");

    // 1. Connect to Firebase Realtime Database
    if (firebaseConfig && firebaseConfig.databaseURL) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();

        // Listen for desktop playback state
        const stateRef = db.ref(`rooms/${roomCode}/state`);
        stateRef.on("value", snapshot => {
          setStatus("connected", "Online (Cloud)");
          const state = snapshot.val();
          updateMediaState(state);
        }, err => {
          console.error("Firebase state read error:", err);
          setStatus("error", "Firebase Error");
        });

        // Listen for accent color updates from desktop
        const settingsRef = db.ref(`rooms/${roomCode}/settings`);
        settingsRef.on("value", snapshot => {
          const val = snapshot.val();
          if (val && val.accentColor) {
            setAccentColor(val.accentColor, true);
          }
        });

        // Realtime connection indicator
        db.ref(".info/connected").on("value", snap => {
          if (snap.val() === true) {
            setStatus("connected", "Online (Cloud)");
          } else {
            setStatus("connecting", "Reconnecting...");
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

    if (!firebaseConfig && !isLocalHost) {
      setStatus("connecting", "Setup Needed");
      // Open settings modal if no configuration exists yet
      setTimeout(() => {
        if (!localStorage.getItem("media_island_firebase_config")) {
          settingsModal.classList.add("open");
        }
      }, 500);
    }
  }

  // Initialize
  loadConfigFromUrlOrStorage().then(() => {
    connect();
  });
})();
