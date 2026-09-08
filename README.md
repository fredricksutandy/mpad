# 📱 mPad — Mobile-to-PC Precision Trackpad & Remote Control

**mPad** turns your smartphone (iPhone / Android) into a low-latency, multi-touch trackpad, keyboard, media remote, and presentation clicker for your PC — with **zero app installation required** on your phone!

---

## ⚡ Features

### 🖱️ Multi-Touch Precision Trackpad
- **1-Finger Drag**: Smooth pointer movement with configurable sensitivity & velocity acceleration.
- **1-Finger Tap**: Left Click with instant haptic vibration.
- **2-Finger Tap**: Right Click (context menu).
- **2-Finger Drag**: Smooth vertical & horizontal scrolling (with Natural / Inverted scroll toggle).
- **Tap-and-Hold + Drag**: Drag & Drop / Window moving / Text selection.
- **Double Tap**: Double Click.
- **Dedicated Buttons**: Optional on-screen Left, Middle, and Right click buttons.
- **Quick Hotkeys**: 1-tap buttons for `Copy`, `Paste`, `Undo`, `Show Desktop`, `Enter`, `Esc`.

### ⌨️ Virtual Keyboard & Hotkeys
- Type on your phone's native soft keyboard to send live text to your PC.
- Arrow keys navigation pad (`Up`, `Down`, `Left`, `Right`).
- Productivity shortcuts: `Select All`, `Copy`, `Paste`, `Cut`, `Undo`, `Redo`, `Win+D`, `Alt+Tab`.

### 📊 Presentation Remote (Clicker Mode)
- **Huge Next / Previous Slide Buttons**: Designed for seamless PowerPoint, Google Slides, and Keynote presentations.
- **F5 / Esc**: Start presentation mode or exit.
- **Blackout (`B`) / Whiteout (`W`)**: Toggle blank screen during talks.
- **Built-in Presentation Stopwatch**: Keep track of your speaking time right from your phone.

### 🎵 Media Controller
- Dedicated controls for **Play / Pause**, **Next Track**, **Previous Track**.
- **Volume Buttons & Mute**: Fine volume adjustment.
- **Space & Fullscreen**: Quick controls for YouTube, Netflix, Spotify, and media players.

### 🔢 Numeric Keypad (Numpad)
- Full 10-key numeric keypad with arithmetic operators for laptops without dedicated numpads.

### 📱 Mobile Web UX & PWA
- **Zero App Store Install**: Pure PWA accessed via local browser (`Safari` or `Chrome`).
- **Screen Wake Lock API**: Keeps your phone screen awake while using the trackpad.
- **Haptic Vibration Feedback**: Tactile click feel on taps and gestures.
- **Real-Time Ping Indicator**: Live latency monitor (typically `< 3ms` over local Wi-Fi).

---

## 🚀 Getting Started

### 1. Requirements
- Node.js (v18+)
- Windows (the input bridge uses Win32 `SendInput`)
- Computer and smartphone connected to the **same Wi-Fi network** (or mobile hotspot).

### 2. One-time setup
In the `mpad` directory, run:

```bash
npm install
npm run setup
```

`npm run setup` builds the app and puts an **mPad** shortcut on your desktop.

### 3. Daily use — no terminal
1. Double-click the **mPad** shortcut. No console window appears.
2. Your browser opens the host page at `http://localhost:8765/host` — QR code, LAN URL, and a live count of connected phones.
3. Scan the QR with your phone camera (or type the URL into Safari / Chrome).
4. *(Optional)* Tap **"Add to Home Screen"** on your phone for a borderless, full-screen native app experience!
5. Press **Stop mPad server** on the host page when you are done.

Double-clicking the shortcut while mPad is already running just reopens the host page — it never starts a second copy.

> **Not connecting?** If your PC has VM, WSL, or VPN adapters, the host page lists every address it found; pick a different one to regenerate the QR. Startup problems are logged to `mpad.log` in the project folder.

### 4. After changing the code
The shortcut runs the compiled output, so rebuild first:

```bash
npm run build
```

Or run from a terminal as before:

```bash
npm start
# development mode:
npm run dev
```

---

## ⚙️ Customization & Settings

Tap the **Settings (⚙️) icon** in the top header on your phone to configure:
- **Pointer Sensitivity**: Adjust cursor movement speed (0.5x to 3.0x).
- **Cursor Acceleration**: Adjust velocity curve for flick gestures.
- **Scroll Speed & Invert Scroll**: Toggle Natural (Mac style) vs Standard (Windows style) scrolling.
- **Haptic Feedback**: Enable / disable vibration on clicks and taps.

---

## 🛠️ Tech Stack & Architecture

- **Desktop Host**: Node.js + Express + WebSocket (`ws`) + Win32 `SendInput` native bridge (`InputBridge.exe`).
- **Launcher**: Desktop shortcut -> hidden VBScript launcher -> host page (`/host`) with server-rendered QR code and stop control.
- **Mobile Client**: React 18 + Vite + Tailwind CSS + Lucide Icons + Screen Wake Lock API + Vibration API.
- **Communication Protocol**: High-frequency JSON/Binary event packets streamed over local WebSocket.
