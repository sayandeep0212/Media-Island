// Reads media state from the page and reports it to the background worker.
let last = "";
let hadMedia = false;

const els = () => [...document.querySelectorAll("video, audio")];

function cleanDocTitle(t) {
  if (!t) return "";
  return t
    .replace(/^▶\s*/, "")
    .replace(/\s*-\s*YouTube Music$/i, "")
    .replace(/\s*-\s*YouTube$/i, "")
    .replace(/\s*\|\s*Spotify$/i, "")
    .replace(/\s*\|\s*SoundCloud$/i, "")
    .trim();
}

function snapshot() {
  const list = els();
  if (!list.length) return null;

  // Find playing element first, else active/loaded element, else first element
  const playingEl = list.find(e => !e.paused && !e.ended && e.readyState > 2 && !e.muted) ||
                    list.find(e => !e.paused && !e.ended);
  const activeEl = playingEl ||
                   list.find(e => e.currentTime > 0) ||
                   list.find(e => Number.isFinite(e.duration) && e.duration > 0) ||
                   list[0];

  const md = navigator.mediaSession && navigator.mediaSession.metadata;
  let title = (md && md.title) || "";
  let artist = (md && md.artist) || "";
  let art = "";
  if (md && md.artwork && md.artwork.length) art = md.artwork[md.artwork.length - 1].src;

  // Extract title from document if empty
  if (!title) {
    title = cleanDocTitle(document.title);
  }

  // Extract artist from YouTube channel / artist element if available
  if (!artist) {
    const owner = document.querySelector("#owner-name a, ytd-video-owner-renderer ytd-channel-name a, ytmusic-player-bar .subtitle a, .byline a");
    if (owner && owner.textContent.trim()) {
      artist = owner.textContent.trim();
    }
  }

  // If no art from mediaSession, try video poster, og:image, or youtube thumbnail
  if (!art) {
    if (activeEl && activeEl.poster) {
      art = activeEl.poster;
    } else {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.content) art = ogImg.content;
    }
  }

  const isPlaying = !!(playingEl && !playingEl.paused && !playingEl.ended);
  const curTime = activeEl ? activeEl.currentTime : 0;
  const dur = activeEl && Number.isFinite(activeEl.duration) ? activeEl.duration : 0;

  // If page has a media element with duration or title, report it
  if (!title && !dur && !curTime) return null;

  return {
    playing: isPlaying,
    title: title || "Playing Media",
    artist: artist || "Web Player",
    art: art || "",
    currentTime: curTime,
    duration: dur
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
  const el = list.find(e => !e.paused) || list.find(e => e.currentTime > 0) || list[0];

  if (msg.cmd === "playpause" || msg.cmd === "toggle") {
    // Try YouTube / Web Player native buttons first
    const playBtn = document.querySelector(".ytp-play-button, [data-testid='play-button'], .play-pause-button, button[aria-label='Play'], button[aria-label='Pause'], ytmusic-player-bar #play-pause-button");
    if (playBtn) {
      playBtn.click();
    } else if (el) {
      if (el.paused) el.play().catch(() => {});
      else el.pause();
    }
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
