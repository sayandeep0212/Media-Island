const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const firebaseSync = require("./firebase-sync");

let win;
let settingsWin;
let tray;
const clients = new Set();
function loadEnvConfig() {
  const envPaths = [
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, ".env"),
    path.join(process.cwd(), ".env")
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eq = trimmed.indexOf("=");
          if (eq > 0) {
            const key = trimmed.substring(0, eq).trim();
            const val = trimmed.substring(eq + 1).trim().replace(/^['"]|['"]$/g, "");
            process.env[key] = process.env[key] || val;
          }
        }
      } catch {}
    }
  }

  if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
    return {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || "",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
    };
  }
  return null;
}

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

const GLOBAL_WEB_URL = "https://media-island.web.app";

function generateRoomCode() {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `island-${suffix}`;
}

let settings = {
  accentColor: "#ff8a3d",
  roomCode: null,
  firebaseConfig: null
};
let dragOffset;
let currentRemoteStatus = { status: "not_configured", message: "Connecting to Firebase..." };

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let lastMediaState = null;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name in interfaces) {
    const isVirtual = /virtual|vbox|vmware|vethernet|wsl|hyper-v|bluetooth|loopback/i.test(name);
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (iface.address.startsWith("169.254.") || iface.address.startsWith("192.168.56.")) {
          continue;
        }
        candidates.push({ name, address: iface.address, isVirtual });
      }
    }
  }
  const primary = candidates.find(c => !c.isVirtual && /wi-?fi|wlan/i.test(c.name))
    || candidates.find(c => !c.isVirtual && /ethernet/i.test(c.name))
    || candidates.find(c => !c.isVirtual)
    || candidates[0];
  return primary ? primary.address : "127.0.0.1";
}

function place() {
  const { bounds } = screen.getPrimaryDisplay();
  const w = 560, h = 190;
  win.setBounds({ x: Math.round(bounds.x + (bounds.width - w) / 2), y: bounds.y + 6, width: w, height: h });
}

function loadSettings() {
  const file = path.join(app.getPath("userData"), "settings.json");
  try {
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    if (typeof saved.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(saved.accentColor)) {
      settings.accentColor = saved.accentColor;
    }
    if (typeof saved.roomCode === "string" && saved.roomCode.trim() && saved.roomCode.trim() !== "sayan-island") {
      settings.roomCode = saved.roomCode.trim();
    }
    if (saved.firebaseConfig && typeof saved.firebaseConfig === "object" && saved.firebaseConfig.apiKey) {
      settings.firebaseConfig = saved.firebaseConfig;
    } else {
      settings.firebaseConfig = loadEnvConfig() || DEFAULT_FIREBASE_CONFIG;
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Error loading settings:", error);
    settings.firebaseConfig = loadEnvConfig() || DEFAULT_FIREBASE_CONFIG;
  }

  if (!settings.roomCode || settings.roomCode === "sayan-island") {
    settings.roomCode = generateRoomCode();
    saveSettings();
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "settings.json"),
      JSON.stringify(settings, null, 2)
    );
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}

function trayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="7" width="28" height="18" rx="9" fill="#000"/><rect x="6" y="11" width="20" height="10" rx="5" fill="${settings.accentColor}"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Media Island");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Settings & Mobile Remote", click: openSettings },
    { type: "separator" },
    { label: "Quit Media Island", click: () => app.quit() }
  ]));
  tray.on("double-click", openSettings);
}

function createWindow() {
  win = new BrowserWindow({
    width: 560, height: 190,
    frame: false, transparent: true, resizable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile("index.html");
  win.webContents.on("did-finish-load", () => win.webContents.send("accent-color", settings.accentColor));
  place();
  screen.on("display-metrics-changed", place);
}

function openSettings(tab = "tab-remote") {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    if (tab) settingsWin.webContents.send("switch-tab", tab);
    return;
  }
  settingsWin = new BrowserWindow({
    width: 500,
    height: 640,
    title: "Media Island Settings & Remote • by sayandeep0212",
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });
  settingsWin.loadFile("settings.html", { hash: tab });
  settingsWin.on("closed", () => { settingsWin = null; });
}

function broadcastCommand(cmd, value = null) {
  const payload = JSON.stringify({ type: "cmd", cmd, value });
  for (const c of clients) {
    if (c.readyState === 1) c.send(payload);
  }
}

function applyAccentColor(color) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return;
  settings.accentColor = color;
  saveSettings();
  if (win && !win.isDestroyed()) win.webContents.send("accent-color", color);
  if (tray) tray.setImage(trayIcon());
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send("accent-color", color);
  firebaseSync.pushSettings(settings);
}

function startServer() {
  const localMobileDir = path.join(__dirname, "mobile");
  const parentMobileDir = path.join(__dirname, "..", "mobile");
  const mobileDir = fs.existsSync(localMobileDir) ? localMobileDir : parentMobileDir;

  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/" || reqPath === "/mobile" || reqPath === "/remote") reqPath = "/index.html";
    if (reqPath.startsWith("/mobile/")) reqPath = reqPath.replace("/mobile/", "/");

    const filePath = path.join(mobileDir, path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, ""));
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(content);
    });
  });

  const wss = new WebSocketServer({ server });

  server.on("error", error => {
    console.error("Media Island server error:", error);
    if (error.code === "EADDRINUSE") {
      dialog.showErrorBox(
        "Media Island is already running",
        "Another Media Island instance is already using port 47890. Close the other instance from the system tray, then launch Media Island again."
      );
    } else {
      dialog.showErrorBox("Media Island server could not start", error.message);
    }
    app.quit();
  });

  wss.on("connection", ws => {
    clients.add(ws);

    // Send current accent color and active playback state immediately on connection
    ws.send(JSON.stringify({ type: "accent-color", color: settings.accentColor }));
    if (lastMediaState) {
      ws.send(JSON.stringify(lastMediaState));
    }

    ws.on("message", data => {
      try {
        const m = JSON.parse(data.toString());
        if (m.type === "ping") return;

        if (m.type === "cmd") {
          if (m.cmd === "setAccentColor" && m.value) {
            applyAccentColor(m.value);
          } else {
            broadcastCommand(m.cmd, m.value);
          }
          return;
        }

        // State update from Chrome extension
        lastMediaState = m;
        if (win && !win.isDestroyed()) win.webContents.send("state", m);
        firebaseSync.pushState(m);

        // Also broadcast state to any mobile clients connected directly over WebSocket
        const broadcastMsg = JSON.stringify(m);
        for (const c of clients) {
          if (c !== ws && c.readyState === 1) c.send(broadcastMsg);
        }
      } catch {}
    });

    ws.on("close", () => clients.delete(ws));
  });

  server.listen(47890, "0.0.0.0", () => {
    console.log(`Media Island server listening on 0.0.0.0:47890 (Local: http://${getLocalIp()}:47890)`);
  });
}

// IPC Handlers
ipcMain.on("cmd", (_e, command) => {
  broadcastCommand(command.cmd, command.value);
});

ipcMain.on("openSettings", (_e, tab) => {
  openSettings(tab || "tab-remote");
});

ipcMain.on("interactive", (_e, on) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!on, { forward: true });
});

ipcMain.on("drag", (event, { phase, screenX, screenY }) => {
  if (!win || event.sender !== win.webContents) return;
  if (phase === "start") {
    const bounds = win.getBounds();
    dragOffset = { x: screenX - bounds.x, y: screenY - bounds.y };
  } else if (phase === "move" && dragOffset) {
    const display = screen.getDisplayNearestPoint({ x: screenX, y: screenY });
    const { x, y, width, height } = display.workArea;
    const nextX = Math.min(x + width - win.getBounds().width, Math.max(x, screenX - dragOffset.x));
    const nextY = Math.min(y + height - win.getBounds().height, Math.max(y, screenY - dragOffset.y));
    win.setPosition(Math.round(nextX), Math.round(nextY));
  } else if (phase === "end") {
    dragOffset = null;
  }
});

ipcMain.handle("settings:getAccentColor", () => settings.accentColor);
ipcMain.handle("settings:setAccentColor", (_e, color) => {
  applyAccentColor(color);
  return settings.accentColor;
});

ipcMain.handle("settings:generateRoomCode", () => generateRoomCode());

ipcMain.handle("settings:getRemoteConfig", async () => {
  const localIp = getLocalIp();
  const localUrl = `http://${localIp}:47890/?room=${encodeURIComponent(settings.roomCode)}`;
  const globalUrl = `${GLOBAL_WEB_URL}/?room=${encodeURIComponent(settings.roomCode)}`;

  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(globalUrl, {
      margin: 1,
      width: 160,
      color: { dark: "#000000ff", light: "#ffffffff" }
    });
  } catch {}

  return {
    roomCode: settings.roomCode,
    localUrl,
    globalUrl,
    qrCodeDataUrl,
    status: currentRemoteStatus
  };
});

ipcMain.handle("settings:saveRemoteConfig", async (_e, { roomCode }) => {
  if (roomCode && typeof roomCode === "string" && roomCode.trim()) {
    settings.roomCode = roomCode.trim();
  }
  saveSettings();

  firebaseSync.setup(settings.firebaseConfig, settings.roomCode);

  const localIp = getLocalIp();
  const localUrl = `http://${localIp}:47890/?room=${encodeURIComponent(settings.roomCode)}`;
  const globalUrl = `${GLOBAL_WEB_URL}/?room=${encodeURIComponent(settings.roomCode)}`;

  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(globalUrl, {
      margin: 1,
      width: 160,
      color: { dark: "#000000ff", light: "#ffffffff" }
    });
  } catch {}

  return {
    roomCode: settings.roomCode,
    localUrl,
    globalUrl,
    qrCodeDataUrl,
    status: currentRemoteStatus
  };
});

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return;
  if (process.platform === "darwin") app.dock.hide();
  loadSettings();
  createTray();
  app.setLoginItemSettings({ openAtLogin: true });

  // Initialize Firebase synchronization
  firebaseSync.init(settings.firebaseConfig, settings.roomCode, {
    onCommand: (cmd, value) => broadcastCommand(cmd, value),
    onSetAccentColor: color => applyAccentColor(color),
    onStatusChange: (status, message) => {
      currentRemoteStatus = { status, message };
      if (settingsWin && !settingsWin.isDestroyed()) {
        settingsWin.webContents.send("remote-status", currentRemoteStatus);
      }
    }
  });

  startServer();
  createWindow();
});

app.on("second-instance", () => {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
  }
});
app.on("window-all-closed", () => {});
