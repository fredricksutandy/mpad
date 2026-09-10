# mPad backlog

Captured 2026-09-10. Not started unless marked otherwise.

---

## 1. Device registry (replaces one-shot pairing)

**Goal:** register a device once on the PC; connecting later is a click on the host
page rather than a rescan. Unregistered devices cannot connect at all.

**Shape:**
- Phone generates a device id + secret on first pairing, keeps it in `localStorage`.
- Server keeps a registry file (device id, label, secret hash, first seen, last seen)
  next to the app, outside git.
- QR stays as the **enrolment** path: scanning enrols a *pending* device; the host
  page shows it as "New device wants to connect - Approve / Deny".
- Approved devices reconnect silently after a restart, which also removes today's
  annoyance that the token is regenerated on every start.
- Host page gains a device list with rename and revoke.

**Touches:** `server/auth.ts` (registry + verification), `server/hostPage.ts` (device
list, approve/deny/revoke), `client/src/hooks/useWebSocket.ts` (device credential),
new loopback-only endpoints under `/__host/devices`.

**Watch out:** store a hash of the device secret, not the secret. Revoke must drop
live sockets, not just future ones. Keep the current token path working as the
failsafe the user asked for.

---

## 2. Scroll direction is backwards

Two-finger scroll currently moves the page the same way as the fingers; it should
match a normal Windows touchpad (drag down = content up).

**Touches:** `client/src/components/Trackpad.tsx` (scroll handler, ~line 175) and
the `invertScroll` default in `client/src/hooks/useSettings.ts`. Likely a sign flip
plus a default change. Verify against the existing Natural/Inverted setting so the
toggle still means what it says.

---

## 3. Multi-finger gestures (3, 4, 5 fingers), macOS-style

**3-finger: done.** Shipped in `Trackpad.tsx`.

| Gesture | Action | Keys |
|---|---|---|
| 3-finger swipe up | Task View | `win+tab` |
| 3-finger swipe down | Show desktop | `win+d` |
| 3-finger swipe left/right | Switch app *or* browser tab | `alt+tab` / `ctrl+tab` (+`shift` reversed) |

The horizontal pair is a setting (`horizontalSwipeAction`, default `apps`), and the
whole feature has an on/off switch (`threeFingerGestures`). Both live in the Settings
modal. The confirmed mapping fires as a plain `shortcut` packet, so the protocol, the
server and InputBridge were untouched, as predicted.

**Tuning constants** (top of `Trackpad.tsx`): 60px commit threshold, 1.3x dominant-axis
ratio so diagonals do nothing, one action per touch cycle, 900ms on-screen confirmation.

**Bug this uncovered, now fixed.** Fingers never land or lift together, so a 3-finger
swipe used to ramp through `count === 1` and `count === 2` at both ends. Measured on
the pre-change build: ~470px of cursor drift, stray scroll packets, and - when the hand
came off as one unit, the normal way to end a swipe - a phantom **right click**, because
`isTwoFingerTapCandidate` was never cleared by a third finger. The fix latches the max
touch count for the cycle and mutes the 1- and 2-finger paths until the pad is clear.
A small (4px) dead zone on two-finger scroll closes the landing-side half.

**Regression net:** `scripts/test-gestures.mjs` drives the built client in Chromium with
synthetic multi-touch and asserts on the packets the app emits - the mappings, the
debounce, the thresholds, the leaks above, and that 1- and 2-finger behaviour is
unchanged. Playwright is deliberately not a project dependency; the file header says
how to run it. Extend it alongside the 4- and 5-finger work.

**Still open: 4 and 5 fingers.** A 4th or 5th finger latches the count above 3 and
deliberately fires nothing, so these can be added without disturbing the 3-finger set.

| Gesture | Action | Keys |
|---|---|---|
| 4-finger swipe left/right | Previous / next virtual desktop | `win+ctrl+left` / `win+ctrl+right` |
| 4-finger swipe up | New virtual desktop | `win+ctrl+d` |
| 4-finger swipe down | Close virtual desktop | `win+ctrl+f4` |
| 4-finger tap | Action Center | `win+a` |
| 5-finger tap | Show desktop | `win+d` |

Grouping all four 4-finger directions around virtual desktops keeps one theme per
finger count, which is easier to remember than a mixed bag. `win+ctrl+f4` needs `f4`
plus the existing modifiers - already in `InputBridge.cs`'s `keyMap`, and `SendKey`
already flags the arrows and Win as extended keys, so still no server work.

**Watch out for 5 fingers:** a phone in portrait gives roughly 8cm of pad width and
five adult fingertips need most of that, so the contact points end up close together
and the centroid direction gets noisy. A 5-finger *tap* is reliable; a 5-finger swipe
or pinch on a phone-sized surface probably is not. Prove it on a real handset before
committing to a mapping.

---

## 4. Keyboard without the mode switch

Today, going from trackpad to keyboard means opening the menu and changing mode.
Wanted: a keyboard button on the trackpad screen that opens a text field overlay,
and closing it returns to the trackpad - no mode transition.

**Touches:** `client/src/App.tsx` (overlay state) and `Trackpad.tsx` (trigger
button), reusing `KeyboardPad`. Check for overlap with the existing
`CompanionWidget`, which already hosts a keyboard module.

**Watch out:** the phone's soft keyboard resizes the viewport; make sure the
trackpad surface is not resized or scrolled underneath while the overlay is open.

---

## 5. Motion / camera interaction - later

Gesture or motion control via the phone's camera or gyroscope.

**Blocked on TLS.** Both `DeviceOrientationEvent` and `getUserMedia` require a
secure context, and mPad is plain HTTP. Nothing here can start until the HTTPS
decision below is made.

Notes from earlier discussion: MediaPipe runs on-device in the browser (free, no
API cost, ~30fps). Discrete hand poses work; blink detection does not - blinking is
involuntary. Battery drain is the real cost, so treat it as a mode you switch on,
not an always-on input.

---

## Still open from earlier

- **TLS decision:** cert for `mpad.local` via mDNS (stable, survives DHCP changes,
  needs an advertising dependency) vs. cert pinned to the current IP (no dependency,
  breaks when the IP changes). Either way the iPhone needs a CA profile installed
  and trusted once. Gates item 5, and encrypts keystrokes in transit.
- **Private firewall profile is disabled** on this machine, so SMB, RPC and the
  print spooler are exposed on any network marked Private. Re-enable with
  `Set-NetFirewallProfile -Profile Private -Enabled True` and confirm mPad still
  works.
- **Public network category still blocks mPad** and the firewall configuration does
  not explain why: no matching block rule, permissive node.exe allow rules present
  in the enforced ruleset. Unresolved. Check the "Blocks all incoming connections"
  toggle in Windows Security for the Public profile.
- **Rate and payload limits** not done: `maxPayload` on the WebSocket server, a cap
  on concurrent clients, and a simple event-rate limit. Wanted before mPad is ever
  exposed to a network with strangers on it.
- **Protocol hardening:** strip CR/LF from `text` and `key` payloads before they
  reach the bridge (the bridge parses stdin line by line, so a newline injects
  commands), bound numeric fields, allowlist key names.
- **No LICENSE file** despite the README saying MIT; GitHub's default branch may
  still be `master`.
