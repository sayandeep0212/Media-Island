// Reads media state from the page and reports it to the background worker.
let last = "";
let hadMedia = false;

const els = () => [...document.querySelectorAll("video, audio")];

function snapshot() {
  const list = els();
  if (!list.length) return null;
  const playingEl = list.find(e => !e.paused && !e.ended && e.readyState > 2 && !e.muted);
  const md = navigator.mediaSession && navigator.mediaSession.metadata;
  let title = (md && md.title) || "";
  const artist = (md && md.artist) || "";
  let art = "";
  if (md && md.artwork && md.artwork.length) art = md.artwork[md.artwork.length - 1].src;
  if (!title && playingEl) title = document.title;
  if (!title && !playingEl) return null;
  return {
    playing: !!playingEl,
    title,
    artist,
    art,
    currentTime: playingEl ? playingEl.currentTime : 0,
    duration: playingEl && Number.isFinite(playingEl.duration) ? playingEl.duration : 0
  };
}

function tick() {
  const s = snapshot();
  const json = JSON.stringify(s);
  if (json === last) return;
  last = json;
  if (!s && !hadMedia) return;
  hadMedia = !!s;
  chrome.runtime.sendMessage({ type: "state", state: s }).catch(() => {});
}
setInterval(tick, 1000);

const SEL = {
  next: [".ytp-next-button", "[data-testid='control-button-skip-forward']", ".next-button", "ytmusic-player-bar .next-button"],
  prev: [".ytp-prev-button", "[data-testid='control-button-skip-back']", ".previous-button", "ytmusic-player-bar .previous-button"]
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== "cmd") return;
  const list = els();
  const el = list.find(e => !e.paused) || list[0];
  if (msg.cmd === "playpause" && el) {
    el.paused ? el.play() : el.pause();
  } else if (msg.cmd === "seek" && el && Number.isFinite(msg.value) && Number.isFinite(el.duration)) {
    el.currentTime = Math.min(el.duration, Math.max(0, msg.value));
  } else if (msg.cmd === "next" || msg.cmd === "prev") {
    for (const s of SEL[msg.cmd]) {
      const b = document.querySelector(s);
      if (b) { b.click(); return; }
    }
    if (msg.cmd === "prev" && el) el.currentTime = 0;
  }
  setTimeout(tick, 200);
});
