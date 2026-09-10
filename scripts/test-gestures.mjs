/**
 * Multi-finger gesture tests for the trackpad.
 *
 * Drives the real built client in Chromium with synthetic multi-touch sequences and
 * records every packet the app tries to send, so the touch state machine in
 * `client/src/components/Trackpad.tsx` can be checked without a phone and a PC.
 *
 * Playwright is not a project dependency - install it just for this run:
 *
 *   npm run build:client
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/test-gestures.mjs
 *
 * Set CHROMIUM_PATH to point at an existing Chromium instead of downloading one.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ is missing or stale. Run `npm run build:client` first.');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed. Run: npm i --no-save playwright');
  process.exit(1);
}

// ---------------------------------------------------------------- static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(DIST, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- browser setup
const launchOpts = {};
const explicit = process.env.CHROMIUM_PATH
  ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium') : null);
if (explicit && fs.existsSync(explicit)) launchOpts.executablePath = explicit;

const browser = await chromium.launch(launchOpts);

/** Fresh page with a stubbed WebSocket that records packets instead of dialling out. */
async function openPad(settings = {}) {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 400, height: 800 } });
  await ctx.addInitScript((s) => {
    // connect() bails without a pairing token, and sendPacket needs readyState OPEN.
    localStorage.setItem('mpad.pairingToken', 'test-token');
    if (Object.keys(s).length) localStorage.setItem('mpad_settings_v2', JSON.stringify(s));
    window.__packets = [];
    class FakeWS {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      constructor() { this.readyState = 1; setTimeout(() => this.onopen && this.onopen({}), 0); }
      send(d) { try { window.__packets.push(JSON.parse(d)); } catch {} }
      close() { this.readyState = 3; }
    }
    window.WebSocket = FakeWS;
  }, settings);

  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('div.cursor-crosshair');
  await page.evaluate(() => {
    const el = document.querySelector('div.cursor-crosshair');
    const r = el.getBoundingClientRect();
    window.__fire = (type, pts) => {
      const touches = pts.map((p, i) => new Touch({
        identifier: p.id ?? i, target: el, clientX: r.left + p.x, clientY: r.top + p.y,
      }));
      el.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: touches,
      }));
    };
  });
  return { ctx, page };
}

const { ctx, page } = await openPad();
const fire = (type, pts) => page.evaluate(([t, p]) => window.__fire(t, p), [type, pts]);
const reset = () => page.evaluate(() => { window.__packets = []; });
const packets = () => page.evaluate(() => window.__packets);
const settle = (ms) => page.waitForTimeout(ms);

/** n fingers spread horizontally, all shifted by (dx, dy). */
const hand = (n, dx = 0, dy = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: i, x: 120 + i * 40 + dx, y: 300 + dy }));

/**
 * A realistic swipe. Fingers land staggered, travel together, then lift staggered,
 * including the small moves a real hand makes on the way down and the way up - which
 * is exactly where the 1- and 2-finger paths used to leak.
 */
async function swipe(axis, distance, fingers = 3) {
  const at = (n, step) => hand(n, axis === 'x' ? step : 0, axis === 'y' ? step : 0);
  await fire('touchstart', at(1, 0));
  await fire('touchmove',  at(1, 2));
  await fire('touchstart', at(2, 2));
  await fire('touchmove',  at(2, 5));
  await fire('touchstart', at(fingers, 5));
  for (let i = 1; i <= 8; i++) await fire('touchmove', at(fingers, 5 + (distance * i) / 8));
  await fire('touchend',   at(2, distance));
  await fire('touchmove',  at(2, distance + 4));
  await fire('touchend',   at(1, distance + 4));
  await fire('touchmove',  at(1, distance + 8));
  await fire('touchend',   []);
}

const results = [];
async function scenario(name, fn, check) {
  await settle(400);          // clear the 300ms double-click window between scenarios
  await reset();
  await fn();
  await settle(60);
  const { ok, detail } = check(await packets());
  results.push({ name, ok, detail });
}

const shortcuts = (p) => p.filter((x) => x.type === 'shortcut').map((x) => x.keys);

// ---------------------------------------------------------------- 3-finger swipes
for (const [name, axis, dist, keys] of [
  ['RIGHT', 'x',  110, 'alt+tab'],
  ['LEFT',  'x', -110, 'alt+shift+tab'],
  ['UP',    'y', -110, 'win+tab'],
  ['DOWN',  'y',  110, 'win+d'],
]) {
  await scenario(`3-finger swipe ${name} -> ${keys}`, () => swipe(axis, dist), (p) => {
    const s = shortcuts(p);
    return { ok: s.length === 1 && s[0] === keys, detail: `shortcuts=${JSON.stringify(s)}` };
  });
}

// ---------------------------------------------------------------- the leaks it closes
await scenario('3-finger swipe: no click, no scroll, <10px pointer drift', () => swipe('x', 110), (p) => {
  const clicks = p.filter((x) => ['click', 'dblclick', 'mousedown'].includes(x.type));
  const scrolls = p.filter((x) => x.type === 'scroll');
  const drift = p.filter((x) => x.type === 'move').reduce((a, m) => a + Math.hypot(m.dx, m.dy), 0);
  return {
    ok: clicks.length === 0 && scrolls.length === 0 && drift < 10,
    detail: `clicks=${clicks.length} scrolls=${scrolls.length} pointerDrift=${drift.toFixed(1)}px`,
  };
});

// Three fingers land together, travel together, and the whole hand comes off in one
// touchend - the normal way to end a swipe. Nothing moves while exactly two are down,
// so before the lockout the 2-finger tap candidate survived and fired a right click.
await scenario('3-finger swipe, hand lifted as one -> no phantom right click', async () => {
  await fire('touchstart', hand(1));
  await fire('touchstart', hand(2));
  await fire('touchstart', hand(3));
  for (let i = 1; i <= 8; i++) await fire('touchmove', hand(3, i * 14));
  await fire('touchend', []);
}, (p) => {
  const rc = p.filter((x) => x.type === 'click' && x.button === 2);
  return { ok: rc.length === 0, detail: `rightClicks=${rc.length}` };
});

// ---------------------------------------------------------------- debounce & thresholds
await scenario('3-finger swipe fires ONCE, not per frame', () => swipe('x', 300), (p) =>
  ({ ok: shortcuts(p).length === 1, detail: `fired ${shortcuts(p).length}x` }));

await scenario('3-finger short swipe (30px) fires nothing', () => swipe('x', 30), (p) =>
  ({ ok: shortcuts(p).length === 0, detail: `shortcuts=${JSON.stringify(shortcuts(p))}` }));

await scenario('3-finger diagonal fires nothing', async () => {
  await fire('touchstart', hand(1));
  await fire('touchstart', hand(2));
  await fire('touchstart', hand(3));
  for (let i = 1; i <= 8; i++) await fire('touchmove', hand(3, i * 12, i * 12));
  await fire('touchend', []);
}, (p) => ({ ok: shortcuts(p).length === 0, detail: `shortcuts=${JSON.stringify(shortcuts(p))}` }));

// 4 and 5 finger gestures are not implemented yet; a 4th finger must stay inert
// rather than borrowing the 3-finger action.
await scenario('4-finger swipe fires no 3-finger action', () => swipe('x', 110, 4), (p) =>
  ({ ok: shortcuts(p).length === 0, detail: `shortcuts=${JSON.stringify(shortcuts(p))}` }));

await scenario('touchcancel mid-gesture -> trackpad still works after', async () => {
  await fire('touchstart', hand(1));
  await fire('touchstart', hand(2));
  await fire('touchstart', hand(3));
  await fire('touchmove',  hand(3, 20));
  await fire('touchcancel', hand(1, 20));   // one contact left behind
  await reset();
  await fire('touchstart', hand(1));
  await fire('touchend', []);
}, (p) => {
  const c = p.filter((x) => x.type === 'click' && x.button === 1);
  return { ok: c.length === 1, detail: `leftClicks=${c.length} (0 would mean a wedged pad)` };
});

// ---------------------------------------------------------------- existing gestures
await scenario('1-finger tap -> left click', async () => {
  await fire('touchstart', hand(1));
  await fire('touchend', []);
}, (p) => {
  const c = p.filter((x) => x.type === 'click');
  return { ok: c.length === 1 && c[0].button === 1, detail: `all=${JSON.stringify(p)}` };
});

await scenario('2-finger tap -> right click', async () => {
  await fire('touchstart', hand(1));
  await fire('touchstart', hand(2));
  await fire('touchend', []);
}, (p) => {
  const c = p.filter((x) => x.type === 'click');
  return { ok: c.length === 1 && c[0].button === 2, detail: `clicks=${JSON.stringify(c)}` };
});

await scenario('1-finger drag -> move packets', async () => {
  await fire('touchstart', hand(1));
  for (let i = 1; i <= 6; i++) await fire('touchmove', hand(1, i * 10));
  await fire('touchend', []);
}, (p) => {
  const m = p.filter((x) => x.type === 'move');
  return { ok: m.length >= 5, detail: `${m.length} move packets` };
});

await scenario('2-finger drag -> scroll packets', async () => {
  await fire('touchstart', hand(1));
  await fire('touchstart', hand(2));
  for (let i = 1; i <= 6; i++) await fire('touchmove', hand(2, 0, i * 12));
  await fire('touchend', []);
}, (p) => {
  const s = p.filter((x) => x.type === 'scroll');
  return { ok: s.length >= 4, detail: `${s.length} scroll packets` };
});

await ctx.close();

// ---------------------------------------------------------------- the Apps/Tabs setting
for (const [mode, right, left] of [
  ['apps', 'alt+tab', 'alt+shift+tab'],
  ['tabs', 'ctrl+tab', 'ctrl+shift+tab'],
]) {
  const { ctx: c2, page: p2 } = await openPad({ horizontalSwipeAction: mode });
  const got = {};
  for (const [dir, sign] of [['right', 1], ['left', -1]]) {
    await p2.evaluate(() => { window.__packets = []; });
    await p2.evaluate((s) => {
      const h = (n, dx) => Array.from({ length: n }, (_, i) => ({ id: i, x: 120 + i * 40 + dx, y: 300 }));
      window.__fire('touchstart', h(1, 0));
      window.__fire('touchstart', h(2, 0));
      window.__fire('touchstart', h(3, 0));
      for (let i = 1; i <= 8; i++) window.__fire('touchmove', h(3, s * i * 14));
      window.__fire('touchend', []);
    }, sign);
    await p2.waitForTimeout(60);
    const pk = await p2.evaluate(() => window.__packets);
    got[dir] = pk.filter((x) => x.type === 'shortcut').map((x) => x.keys)[0];
  }
  results.push({
    name: `horizontalSwipeAction="${mode}" -> ${right} / ${left}`,
    ok: got.right === right && got.left === left,
    detail: `right=${got.right} left=${got.left}`,
  });
  await c2.close();
}

// ---------------------------------------------------------------- report
let pass = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n        ${r.detail}`);
  if (r.ok) pass++;
}
console.log(`\n${pass}/${results.length} passed`);

await browser.close();
server.close();
process.exit(pass === results.length ? 0 : 1);
