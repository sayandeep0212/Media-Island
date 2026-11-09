const { initializeApp, getApps, deleteApp } = require("firebase/app");
const { getDatabase, ref, set, update, onValue, off, onDisconnect } = require("firebase/database");

let appInstance = null;
let db = null;
let currentRoom = "";
let commandListener = null;
let settingsListener = null;
let lastProcessedCmdId = null;
let isInitialCommandSnapshot = true;
let lastSyncedSticker = null;
let lastSyncedGlowJson = "";
let lastPushedStateJson = "";
let heartbeatInterval = null;

let callbacks = {
  onCommand: () => {},
  onSetAccentColor: () => {},
  onSetSticker: () => {},
  onStatusChange: () => {}
};

function init(firebaseConfig, roomCode, cbs = {}) {
  callbacks = { ...callbacks, ...cbs };
  return setup(firebaseConfig, roomCode);
}

function setup(firebaseConfig, roomCode) {
  cleanup();

  if (!firebaseConfig || !roomCode) {
    callbacks.onStatusChange("not_configured", "Firebase not configured");
    return false;
  }

  const resolvedConfig = {
    ...firebaseConfig,
    databaseURL: firebaseConfig.databaseURL || `https://${firebaseConfig.projectId || "media-island"}-default-rtdb.firebaseio.com`
  };

  currentRoom = roomCode.trim();
  lastCommandTimestamp = Date.now();

  try {
    appInstance = initializeApp(resolvedConfig, `media-island-desktop-${Date.now()}`);
    db = getDatabase(appInstance);

    callbacks.onStatusChange("connecting", `Connecting to room: ${currentRoom}...`);

    // Listen for incoming commands from mobile
    isInitialCommandSnapshot = true;
    lastProcessedCmdId = null;
    const cmdRef = ref(db, `rooms/${currentRoom}/command`);
    commandListener = onValue(cmdRef, snapshot => {
      const data = snapshot.val();
      if (!data || !data.cmd) return;

      const cmdId = data.id || `${data.cmd}_${data.value || ""}_${data.ts || ""}`;
      if (isInitialCommandSnapshot) {
        isInitialCommandSnapshot = false;
        lastProcessedCmdId = cmdId;
        return;
      }

      if (cmdId === lastProcessedCmdId) return;
      lastProcessedCmdId = cmdId;

      console.log(`[FirebaseSync] Received command:`, data.cmd, data.value);

      if (data.cmd === "setAccentColor" && data.value) {
        callbacks.onSetAccentColor(data.value);
      } else if (data.cmd === "setSticker" && data.value) {
        callbacks.onSetSticker(data.value);
      } else if (data.cmd === "setGlow" && data.value) {
        if (callbacks.onSetGlow) callbacks.onSetGlow(data.value);
      } else if (data.cmd === "toggleGlow") {
        if (callbacks.onToggleGlow) callbacks.onToggleGlow();
      } else if (data.cmd === "setGlowMode" && data.value) {
        if (callbacks.onSetGlow) callbacks.onSetGlow({ mode: data.value, enabled: true });
      } else if (data.cmd === "setGlowColor" && data.value) {
        if (callbacks.onSetGlow) callbacks.onSetGlow({ customColor: data.value, mode: "custom", enabled: true });
      } else if (data.cmd === "setGlowSleepBlackout") {
        if (callbacks.onSetGlow) callbacks.onSetGlow({ sleepBlackout: !!data.value });
      } else {
        callbacks.onCommand(data.cmd, data.value);
      }
    }, error => {
      console.error("[FirebaseSync] Command listen error:", error);
      callbacks.onStatusChange("error", error.message);
    });

    // Also listen for settings changes (stickers, glow & accent color) from mobile
    let isInitialSettingsSnapshot = true;
    const settingsRef = ref(db, `rooms/${currentRoom}/settings`);
    settingsListener = onValue(settingsRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;

      if (isInitialSettingsSnapshot) {
        isInitialSettingsSnapshot = false;
        if (data.currentSticker) lastSyncedSticker = data.currentSticker;
        if (data.glow) {
          lastSyncedGlowJson = JSON.stringify(data.glow);
          if (callbacks.onSetGlow) callbacks.onSetGlow(data.glow);
        }
        return;
      }

      if (data.currentSticker && data.currentSticker !== lastSyncedSticker) {
        lastSyncedSticker = data.currentSticker;
        callbacks.onSetSticker(data.currentSticker);
      }
      if (data.glow) {
        const glowJson = JSON.stringify(data.glow);
        if (glowJson !== lastSyncedGlowJson) {
          lastSyncedGlowJson = glowJson;
          if (callbacks.onSetGlow) callbacks.onSetGlow(data.glow);
        }
      }
    });

    // Monitor connection state and maintain desktop presence
    const connectedRef = ref(db, ".info/connected");
    const presenceRef = ref(db, `rooms/${currentRoom}/desktop`);
    onValue(connectedRef, snap => {
      if (snap.val() === true) {
        callbacks.onStatusChange("connected", `Connected to room: ${currentRoom}`);
        set(presenceRef, { online: true, updatedAt: Date.now(), room: currentRoom }).catch(() => {});
        try {
          onDisconnect(presenceRef).set({ online: false, updatedAt: Date.now() });
        } catch {}

        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (db && currentRoom) {
            update(presenceRef, { online: true, updatedAt: Date.now() }).catch(() => {});
          }
        }, 15000);
      } else {
        callbacks.onStatusChange("connecting", "Reconnecting to Firebase...");
      }
    });

    return true;
  } catch (error) {
    console.error("[FirebaseSync] Initialization error:", error);
    callbacks.onStatusChange("error", error.message);
    return false;
  }
}

function pushState(state) {
  if (!db || !currentRoom) return;
  const json = JSON.stringify(state || {});
  if (json === lastPushedStateJson) return;
  lastPushedStateJson = json;

  const stateRef = ref(db, `rooms/${currentRoom}/state`);
  const payload = state ? {
    playing: !!state.playing,
    title: state.title || "",
    artist: state.artist || "",
    art: state.art || "",
    currentTime: Number.isFinite(state.currentTime) ? Math.round(state.currentTime * 10) / 10 : 0,
    duration: Number.isFinite(state.duration) ? Math.round(state.duration * 10) / 10 : 0,
    sourceName: state.sourceName || "",
    sourceIcon: state.sourceIcon || "",
    updatedAt: Date.now()
  } : {
    type: "none",
    playing: false,
    updatedAt: Date.now()
  };

  set(stateRef, payload).catch(err => {
    console.error("[FirebaseSync] pushState error:", err.message);
  });
}

function pushSettings(settings) {
  if (!db || !currentRoom || !settings) return;
  const settingsRef = ref(db, `rooms/${currentRoom}/settings`);
  const payload = {};
  if (settings.accentColor) {
    payload.accentColor = settings.accentColor;
  }
  if (settings.currentSticker) {
    payload.currentSticker = settings.currentSticker;
    lastSyncedSticker = settings.currentSticker;
  }
  if (settings.glow) {
    const glowJson = JSON.stringify(settings.glow);
    if (glowJson !== lastSyncedGlowJson) {
      lastSyncedGlowJson = glowJson;
      payload.glow = settings.glow;
    }
  }
  if (Object.keys(payload).length === 0) return;
  payload.updatedAt = Date.now();
  update(settingsRef, payload).catch(err => {
    console.error("[FirebaseSync] pushSettings error:", err.message);
  });
}

function cleanup() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (db && currentRoom && commandListener) {
    try {
      const cmdRef = ref(db, `rooms/${currentRoom}/command`);
      off(cmdRef);
    } catch {}
    commandListener = null;
  }

  if (db && currentRoom && settingsListener) {
    try {
      const settingsRef = ref(db, `rooms/${currentRoom}/settings`);
      off(settingsRef);
    } catch {}
    settingsListener = null;
  }

  if (appInstance) {
    try {
      deleteApp(appInstance).catch(() => {});
    } catch {}
    appInstance = null;
    db = null;
  }
}

module.exports = {
  init,
  setup,
  pushState,
  pushSettings,
  cleanup
};
