const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("island", {
  onState: cb => ipcRenderer.on("state", (_e, s) => cb(s)),
  onAccentColor: cb => ipcRenderer.on("accent-color", (_e, color) => cb(color)),
  getAccentColor: () => ipcRenderer.invoke("settings:getAccentColor"),
  setAccentColor: color => ipcRenderer.invoke("settings:setAccentColor", color),
  cmd: (cmd, value) => ipcRenderer.send("cmd", { cmd, value }),
  drag: (phase, screenX, screenY) => ipcRenderer.send("drag", { phase, screenX, screenY }),
  interactive: on => ipcRenderer.send("interactive", on)
});
