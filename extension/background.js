// Collects state from all tabs/frames, picks the active one, and forwards to the desktop app.
const frames = new Map(); // "tabId:frameId" -> {state, ts, tabId, frameId}
let ws = null;

function key(t, f) { return t + ":" + f; }

function mediaSource(tab) {
  try {
    const pageUrl = new URL(tab.url);
    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") return {};
    const host = pageUrl.hostname.replace(/^www\./, "");
    const names = {
      "music.youtube.com": "YouTube Music",
      "youtube.com": "YouTube",
      "youtu.be": "YouTube",
      "open.spotify.com": "Spotify",
      "spotify.com": "Spotify",
      "soundcloud.com": "SoundCloud",
      "netflix.com": "Netflix",
      "twitch.tv": "Twitch",
      "music.apple.com": "Apple Music"
    };
    const sourceName = names[host] || host;
    return { sourceName, sourceIcon: new URL("/favicon.ico", pageUrl).href };
  } catch {
    return {};
  }
}

function pick() {
  let best = null;
  for (const v of frames.values()) {
    if (!v.state) continue;
    if (!best) { best = v; continue; }
    if (v.state.playing && !best.state.playing) best = v;
    else if (v.state.playing === best.state.playing && v.ts > best.ts) best = v;
  }
  return best;
}

let lastSent = "";
function push(force) {
  const best = pick();
  const payload = best ? { type: "state", ...best.state } : { type: "none" };
  const json = JSON.stringify(payload);
  if (!force && json === lastSent) return;
  lastSent = json;
  if (ws && ws.readyState === 1) ws.send(json);
}

function connect() {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  try { ws = new WebSocket("ws://127.0.0.1:47890"); } catch { return; }
  ws.onopen = () => push(true);
  ws.onmessage = e => {
    try {
      const m = JSON.parse(e.data);
      const best = pick();
      if (m.type === "cmd" && best) {
        chrome.tabs.sendMessage(best.tabId, { type: "cmd", cmd: m.cmd, value: m.value }, { frameId: best.frameId }).catch(() => {});
      }
    } catch {}
  };
  ws.onclose = () => { ws = null; };
  ws.onerror = () => {};
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "state" || !sender.tab) return;
  const k = key(sender.tab.id, sender.frameId || 0);
  if (msg.state) {
    const state = { ...msg.state, ...mediaSource(sender.tab) };
    frames.set(k, { state, ts: Date.now(), tabId: sender.tab.id, frameId: sender.frameId || 0 });
  }
  else frames.delete(k);
  connect();
  push();
});

chrome.tabs.onRemoved.addListener(id => {
  for (const k of [...frames.keys()]) if (k.startsWith(id + ":")) frames.delete(k);
  push();
});

chrome.alarms.create("keepalive", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => { connect(); if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "ping" })); });
setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "ping" })); }, 20000);
connect();
