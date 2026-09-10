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

**Proposed mapping to Windows equivalents:**

| Gesture | Action | Keys |
|---|---|---|
| 3-finger swipe up | Task View | `win+tab` |
| 3-finger swipe down | Show desktop | `win+d` |
| 3-finger swipe left/right | Switch app | `alt+tab` / `alt+shift+tab` |
| 4-finger swipe left/right | Switch virtual desktop | `win+ctrl+left` / `win+ctrl+right` |
| 4-finger tap | Action Center | `win+a` |
| 5-finger pinch | Show desktop | `win+d` |

**Nice property:** these can all be emitted as existing `shortcut` packets, so the
server, protocol, and InputBridge need **no changes**. Work is confined to touch
tracking in `Trackpad.tsx` - track pointer count, direction, and a distance
threshold, and fire once per gesture rather than per frame.

**Watch out:** the existing 1- and 2-finger handlers must not fire while 3+ fingers
are down. Debounce so one swipe does not emit a burst of `alt+tab`.

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
