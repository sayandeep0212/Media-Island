# Media Island (Chrome extension + desktop app)

## 1. Windows desktop app

To run from source, install Node.js (https://nodejs.org), then:

```powershell
cd app
npm install
npm start
```

To create a Windows installer:

```powershell
npm run build:win
```

The NSIS installer is created in `app/release/`. It lets users choose an install
folder and adds Start Menu and desktop shortcuts. The app starts at login and
listens on `127.0.0.1:47890`. Right-click the Media Island tray icon and choose
**Settings** to change the island's accent color; the choice is saved for future
launches.

Hover over the island to expand it. Drag the island to move it anywhere on the
screen; click **×** to hide it until the next track starts.

## 2. Chrome extension
1. Open chrome://extensions
2. Turn on Developer mode
3. Click "Load unpacked" and choose the `extension` folder
4. Play a video or song in Chrome. The pill appears at the top-center of your screen.

Hover over the pill to expand it and use prev / play-pause / next or seek through the track.
Next/prev work on YouTube, YouTube Music and Spotify Web; play/pause works everywhere.
