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
  openSettings: tab => ipcRenderer.send("openSettings", tab),
  onSwitchTab: cb => ipcRenderer.on("switch-tab", (_e, tab) => cb(tab))
});
