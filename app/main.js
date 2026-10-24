const { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

let win;
let settingsWin;
let tray;
const clients = new Set();
let settings = { accentColor: "#ff8a3d" };
let dragOffset;

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
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
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
    { label: "Settings", click: openSettings },
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

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 360,
    height: 300,
    title: "Media Island Settings",
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });
  settingsWin.loadFile("settings.html");
  settingsWin.on("closed", () => { settingsWin = null; });
}

function startServer() {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 47890 });
  wss.on("connection", ws => {
    clients.add(ws);
    ws.on("message", data => {
      try {
        const m = JSON.parse(data.toString());
        if (m.type === "ping") return;
        if (win) win.webContents.send("state", m);
      } catch {}
    });
    ws.on("close", () => clients.delete(ws));
  });
}

ipcMain.on("cmd", (_e, command) => {
  for (const c of clients) if (c.readyState === 1) c.send(JSON.stringify({ type: "cmd", ...command }));
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
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new TypeError("Accent color must be a six-digit hex color.");
  }
  settings.accentColor = color;
  fs.writeFileSync(path.join(app.getPath("userData"), "settings.json"), JSON.stringify(settings, null, 2));
  if (win && !win.isDestroyed()) win.webContents.send("accent-color", color);
  if (tray) tray.setImage(trayIcon());
  return color;
});

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();
  loadSettings();
  createTray();
  app.setLoginItemSettings({ openAtLogin: true });
  startServer();
  createWindow();
});
app.on("window-all-closed", () => {});
