const { initializeApp, getApps, deleteApp } = require("firebase/app");
const { getDatabase, ref, set, update, onValue, off } = require("firebase/database");

let appInstance = null;
let db = null;
let currentRoom = "";
let commandListener = null;
let lastCommandTimestamp = Date.now();
let lastPushedStateJson = "";

let callbacks = {
  onCommand: () => {},
  onSetAccentColor: () => {},
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
    const cmdRef = ref(db, `rooms/${currentRoom}/command`);
    commandListener = onValue(cmdRef, snapshot => {
      const data = snapshot.val();
      if (!data || !data.cmd) return;

      // Ignore stale commands sent before connection or already processed
      if (data.ts && data.ts <= lastCommandTimestamp) return;
      if (data.ts) lastCommandTimestamp = data.ts;

      if (data.cmd === "setAccentColor" && data.value) {
        callbacks.onSetAccentColor(data.value);
      } else {
        callbacks.onCommand(data.cmd, data.value);
      }
    }, error => {
      console.error("[FirebaseSync] Command listen error:", error);
      callbacks.onStatusChange("error", error.message);
    });

    // Monitor connection state
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, snap => {
      if (snap.val() === true) {
        callbacks.onStatusChange("connected", `Connected to room: ${currentRoom}`);
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
  if (!db || !currentRoom) return;
  const settingsRef = ref(db, `rooms/${currentRoom}/settings`);
  update(settingsRef, {
    accentColor: settings.accentColor || "#ff8a3d",
    updatedAt: Date.now()
  }).catch(err => {
    console.error("[FirebaseSync] pushSettings error:", err.message);
  });
}

function cleanup() {
  if (db && currentRoom && commandListener) {
    try {
      const cmdRef = ref(db, `rooms/${currentRoom}/command`);
      off(cmdRef);
    } catch {}
    commandListener = null;
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
