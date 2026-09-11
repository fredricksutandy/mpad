# 🧪 Gesture Lab — branch-only test feature

A small draggable window that names every gesture it detects, so **display and
gesture behaviour can be verified on the phone alone, with no desktop host
connected**. Nothing is sent to the PC; the lab only watches and reports.

This feature lives only on the `claude/gesture-display-window-and78s` branch and
is deliberately self-contained.

## What it shows

| Row | Meaning |
| --- | --- |
| Gesture name | Live while fingers are down (`3 Fingers Down` → `3-Finger Swipe Left`), then the final verdict when the last finger lifts |
| Mapping line | What the real app does with it (`Right click (button 2)`) or `Free slot — nothing is sent to the PC` |
| Finger pips | How many fingers are on the glass right now (1–5) |
| Metrics | Centroid travel + direction arrow, pinch spread delta, gesture duration |
| Recent | Last 6 completed gestures with a timestamp; a green dot means the gesture is wired to the PC |

Gestures recognised: 1-finger tap / move / press, double tap, tap & hold, 1-finger
drag, 2-finger tap / scroll (with direction), pinch in / out, and 3–5 finger taps,
holds, swipes and pinches — the multi-finger ones are reported as unmapped,
because the app does not send them yet.

## Using it

**In the real app** (phone pointed at the mPad server, host bridge not required):
the window mounts itself on top of the trackpad. Drag it by the title bar,
double-tap the title bar to snap it back to its default corner, chevron collapses
it, `✕` hides it into a small round launcher in the bottom-right corner.
Position and collapsed state are remembered in `localStorage`
(`mpad_gesture_lab_v1`). Load the app with `?gesturelab=0` to start without it.

**Standalone, no WebSocket at all**: `npm run dev:client`, then open
`http://<your-ip>:5173/gesture-lab.html` on the phone — a bare practice pad with
the same window and a gesture cheat-sheet.

## Why it leaves no footprint

| File | Change |
| --- | --- |
| `client/src/main.tsx` | one side-effect `import './gesture-lab/mount.js'`, wrapped in `GESTURE_LAB_TEST_FEATURE` markers |
| `client/gesture-lab.html` | new file; Vite's production build only takes `index.html` as input, so it ships nothing extra |
| `client/gesture-lab.test.ts` | new file, deliberately outside `client/src` — Tailwind scans that folder, and a test file inside it would add dead class names to the production CSS |
| everything else | untouched |

With the lab present, `npx vite build` emits the same `index.html` and the same
CSS bundle as without it; only the JS grows (~0.4 kB gzipped) for the window
itself.

- `mount.tsx` appends its own `<div>` to `<body>` and renders in its **own React
  root** — the `App` tree, `useSettings`, `types.ts` and `useWebSocket` are not
  modified, and no props are threaded anywhere.
- `recognizer.ts` observes `touchstart/move/end/cancel` on `document` in the
  **capture phase with `passive: true`**, and never calls `preventDefault()` or
  `stopPropagation()`, so `Trackpad.tsx` keeps receiving identical events. Its
  thresholds are copied from `Trackpad.tsx` rather than imported, on purpose.
- Touches that start on the window itself are ignored (`[data-gesture-lab]`), so
  dragging the HUD is never mistaken for a gesture.
- Live readings are coalesced into one `requestAnimationFrame` repaint, so the
  HUD cannot add jitter to the trackpad it is measuring.

To remove the feature: delete this folder, delete `client/gesture-lab.html`, and
delete the marked import block in `client/src/main.tsx`.

## Checking it without a phone

```bash
npx tsx client/gesture-lab.test.ts
```

21 synthetic touch sequences (taps, holds, drags, scrolls, pinches, 3–5 finger
swipes, partial lift-offs, touches landing on the window itself) are pushed
through the recognizer on a virtual clock and the resulting gesture names are
asserted. No test runner, no browser, no phone.

## Files

```
client/src/gesture-lab/
  recognizer.ts         passive multi-touch recognizer + gesture naming
  GestureLabWindow.tsx  the draggable window UI
  mount.tsx             self-mounting bootstrap (own container + own React root)
  standalone.tsx        entry for the /gesture-lab.html practice pad
client/gesture-lab.html standalone practice page (dev server only)
client/gesture-lab.test.ts  recognizer test bench
```
