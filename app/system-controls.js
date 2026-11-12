const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");

let coreExe = path.join(__dirname, "bin", "MediaIslandCore.exe");
if (coreExe.includes("app.asar")) {
  const unpackedPath = coreExe.replace("app.asar", "app.asar.unpacked");
  if (fs.existsSync(unpackedPath)) {
    coreExe = unpackedPath;
  } else {
    try {
      const tempExe = path.join(os.tmpdir(), "MediaIslandCore_v130.exe");
      if (!fs.existsSync(tempExe)) {
        fs.writeFileSync(tempExe, fs.readFileSync(coreExe));
      }
      coreExe = tempExe;
    } catch (e) {
      console.error("[SystemControls] Failed to unpack core executable:", e);
    }
  }
}

let lastSystemState = {
  volume: 50,
  brightness: 70,
  spotify: { running: false, playing: false, title: "", artist: "" }
};

let watcherInterval = null;

function runCore(args) {
  return new Promise((resolve) => {
    execFile(coreExe, args, { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout ? stdout.trim() : "");
    });
  });
}

async function getStatus() {
  const output = await runCore(["status"]);
  if (!output) return lastSystemState;
  try {
    const data = JSON.parse(output);
    if (data.brightness == null || data.brightness < 0) {
      data.brightness = lastSystemState.brightness >= 0 ? lastSystemState.brightness : 70;
    }
    if (data.volume == null || data.volume < 0) {
      data.volume = lastSystemState.volume >= 0 ? lastSystemState.volume : 50;
    }
    lastSystemState = data;
    return data;
  } catch {
    return lastSystemState;
  }
}

async function setVolume(level) {
  const val = Math.max(0, Math.min(100, Math.round(Number(level) || 0)));
  lastSystemState.volume = val;
  await runCore(["vol_set", String(val)]);
  return val;
}

async function setBrightness(level) {
  const val = Math.max(0, Math.min(100, Math.round(Number(level) || 0)));
  lastSystemState.brightness = val;
  await runCore(["bright_set", String(val)]);
  return val;
}

async function sendMediaKey(action) {
  return await runCore(["media", action]);
}

async function launchApp(target) {
  if (!target || typeof target !== "string") return false;
  const res = await runCore(["launch", target.trim()]);
  return !!(res && res.startsWith("LAUNCHED"));
}

function startWatcher(callbacks = {}) {
  if (watcherInterval) clearInterval(watcherInterval);

  let lastTrackStr = "";

  const poll = async () => {
    try {
      const status = await getStatus();
      if (!status) return;

      if (callbacks.onControls) {
        callbacks.onControls({
          volume: status.volume,
          brightness: status.brightness
        });
      }

      const sp = status.spotify;
      if (sp && sp.running) {
        const trackStr = `${sp.playing}:${sp.artist}:${sp.title}`;
        if (trackStr !== lastTrackStr) {
          lastTrackStr = trackStr;
          if (callbacks.onSpotifyState) {
            callbacks.onSpotifyState({
              type: sp.playing ? "music" : "none",
              source: "spotify",
              sourceName: "Spotify Desktop",
              sourceIcon: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231DB954'%3E%3Cpath d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'/%3E%3C/svg%3E",
              title: sp.title || (sp.playing ? "Spotify Track" : "Spotify Paused"),
              artist: sp.artist || "Spotify",
              art: "",
              duration: 0,
              currentTime: 0,
              playing: !!sp.playing
            });
          }
        }
      } else {
        if (lastTrackStr.startsWith("true:spotify")) {
          lastTrackStr = "";
          if (callbacks.onSpotifyState) {
            callbacks.onSpotifyState({ type: "none", playing: false });
          }
        }
      }
    } catch {}
  };

  poll();
  watcherInterval = setInterval(poll, 1500);
}

function stopWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
}

module.exports = {
  getStatus,
  setVolume,
  setBrightness,
  sendMediaKey,
  launchApp,
  startWatcher,
  stopWatcher
};
