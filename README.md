# Media Island (Chrome Extension + Desktop App + Mobile Remote)

Media Island is a dynamic island for Windows that shows what is playing in Chrome with live audio waveforms, track controls, and a companion **Mobile Remote (PWA)** that allows you to control media and change visualizer colors directly from your phone.

---

## 1. Windows Desktop App

### Run from Source
1. Install [Node.js](https://nodejs.org).
2. Open PowerShell and run:
   ```powershell
   cd app
   npm install
   npm start
   ```

### Features
- **Floating Island**: Hover over the island to expand it; drag it anywhere on your screen.
- **System Tray**: Right-click the tray icon and click **Settings & Mobile Remote**.
- **Accent Color**: Customize the audio waveform and seekbar color with instant preview.
- **Mobile QR Pairing**: Open Settings to see a QR code you can scan with your phone to instantly launch the remote control.

---

## 2. Chrome Extension
1. Open Chrome and navigate to `chrome://extensions`.
2. Turn on **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension` folder.
4. Play music or video in Chrome (YouTube, YouTube Music, Spotify Web, SoundCloud, etc.).
5. Media Island will display album artwork, track title, artist, audio waveform, and playback controls.

---

## 3. Mobile Remote (Phone Control via Firebase or Local Wi-Fi)

You can manage all Media Island activities directly from your phone:
- **Play / Pause, Next (`⏭`), Previous (`⏮`)**
- **Live Seek Slider** (scrub through tracks with elapsed and remaining time)
- **Sound Wave Bar Visualizer** (live bouncing equalizer on your phone screen)
- **Color Changing of Media Playing Bars**: Tap preset color chips or use the color picker on your phone to instantly change the waveform bars on both your phone and desktop!

### Connecting from Your Phone

#### Option A: Worldwide Cloud Access (Instant & Zero Setup)
1. In the desktop app, right-click the tray icon and select **Settings & Mobile Remote**.
2. Go to the **Phone Remote & Firebase** tab.
3. Scan the QR code or open:
   ```text
   https://media-island.web.app/?room=<YOUR_ROOM_ID>
   ```
4. Works anywhere in the world on **4G / 5G cellular data or any Wi-Fi network**!

#### Option B: Local Wi-Fi (Offline / Direct LAN)
1. Ensure your phone and PC are on the same Wi-Fi.
2. Open the direct LAN link displayed in Settings:
   ```text
   http://<your-pc-ip>:47890/?room=<YOUR_ROOM_ID>
   ```

---

## 4. Security & Environment Configuration

All sensitive API keys and Firebase credentials are kept strictly private and **never committed to GitHub**:

1. Copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Fill in your Firebase credentials in `.env`.
3. The `.env` file is excluded in `.gitignore` and loaded automatically by the desktop application.
4. When pairing with your phone via QR code, the desktop app securely packages your room configuration so you never have to hardcode keys into the mobile client.

---

## Author & Copyright

Designed and developed by **[sayandeep0212](https://github.com/sayandeep0212)**.

Copyright &copy; 2026 **sayandeep0212**. All rights reserved.
