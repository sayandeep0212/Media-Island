const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("island", {
  onState: cb => ipcRenderer.on("state", (_e, s) => cb(s)),
  onAccentColor: cb => ipcRenderer.on("accent-color", (_e, color) => cb(color)),
  onRemoteStatus: cb => ipcRenderer.on("remote-status", (_e, data) => cb(data)),
  getAccentColor: () => ipcRenderer.invoke("settings:getAccentColor"),
  setAccentColor: color => ipcRenderer.invoke("settings:setAccentColor", color),
  getRemoteConfig: () => ipcRenderer.invoke("settings:getRemoteConfig"),
  saveRemoteConfig: config => ipcRenderer.invoke("settings:saveRemoteConfig", config),
  generateRoomCode: () => ipcRenderer.invoke("settings:generateRoomCode"),
  cmd: (cmd, value) => ipcRenderer.send("cmd", { cmd, value }),
  drag: (phase, screenX, screenY) => ipcRenderer.send("drag", { phase, screenX, screenY }),
  interactive: on => ipcRenderer.send("interactive", on),
  setExpanded: expanded => ipcRenderer.send("set-expanded", expanded),
  openSettings: tab => ipcRenderer.send("openSettings", tab),
  onSwitchTab: cb => ipcRenderer.on("switch-tab", (_e, tab) => cb(tab)),
  onSelectSticker: cb => ipcRenderer.on("select-sticker", (_e, id) => cb(id)),
  onGlowConfig: cb => ipcRenderer.on("glow-config", (_e, cfg) => cb(cfg)),
  getGlowConfig: () => ipcRenderer.invoke("glow:getConfig"),
  setGlowConfig: cfg => ipcRenderer.invoke("glow:setConfig", cfg),
  toggleGlow: () => ipcRenderer.invoke("glow:toggle"),
  toggleSleepBlackout: () => ipcRenderer.invoke("glow:toggleBlackout"),

  // System Controls & Pinned Apps
  getSystemControls: () => ipcRenderer.invoke("system:getControls"),
  setVolume: level => ipcRenderer.invoke("system:setVolume", level),
  setBrightness: level => ipcRenderer.invoke("system:setBrightness", level),
  launchApp: target => ipcRenderer.invoke("system:launchApp", target),
  getPinnedApps: () => ipcRenderer.invoke("settings:getPinnedApps"),
  savePinnedApps: apps => ipcRenderer.invoke("settings:savePinnedApps", apps),
  pickAppFile: () => ipcRenderer.invoke("settings:pickAppFile"),
  getDesktopShortcuts: () => ipcRenderer.invoke("settings:getDesktopShortcuts"),
  onPinnedApps: cb => ipcRenderer.on("pinned-apps", (_e, apps) => cb(apps)),
  getTimeFormat: () => ipcRenderer.invoke("settings:getTimeFormat"),
  setTimeFormat: fmt => ipcRenderer.invoke("settings:setTimeFormat", fmt),
  onTimeFormat: cb => ipcRenderer.on("time-format", (_e, fmt) => cb(fmt)),
  onSystemControls: cb => ipcRenderer.on("system-controls", (_e, data) => cb(data))
});
