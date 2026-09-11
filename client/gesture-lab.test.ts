/* --- GESTURE_LAB_TEST_FEATURE_START --- */
/**
 * Recognizer test bench — run it with `npx tsx client/gesture-lab.test.ts`.
 *
 * No test runner and no browser: a virtual clock and synthetic multi-touch
 * sequences drive the recognizer directly, so gesture naming can be checked from
 * a laptop when no phone (and no desktop host) is at hand. Not imported by the
 * app, so it never reaches the bundle. It sits outside `client/src` on purpose:
 * Tailwind scans that folder, and a test file there would add dead class names
 * to the production CSS.
 */
import { GestureRecognizer, GestureLogEntry } from './src/gesture-lab/recognizer.js';

let clock = 1000;
const holdTimers: Array<{ fn: () => void; at: number }> = [];

class FakeElement {
  constructor(private readonly inLab: boolean) {}
  closest(sel: string) {
    return this.inLab && sel === '[data-gesture-lab]' ? {} : null;
  }
}

(globalThis as any).Element = FakeElement;
(globalThis as any).performance = { now: () => clock };
(globalThis as any).window = {
  setTimeout: (fn: () => void, ms: number) => {
    holdTimers.push({ fn, at: clock + ms });
    return holdTimers.length;
  },
};
(globalThis as any).clearTimeout = () => {};

type Pt = [number, number];

class FakeTarget {
  private handlers = new Map<string, Function[]>();
  addEventListener(type: string, fn: Function) {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }
  removeEventListener(type: string, fn: Function) {
    this.handlers.set(type, (this.handlers.get(type) ?? []).filter((f) => f !== fn));
  }
  fire(type: string, points: Pt[], target: unknown = null) {
    const touches = points.map(([x, y], i) => ({ identifier: i, clientX: x, clientY: y }));
    for (const fn of this.handlers.get(type) ?? []) fn({ type, target, touches });
  }
}

const target = new FakeTarget();
const finals: GestureLogEntry[] = [];
let live: string[] = [];
const recognizer = new GestureRecognizer({
  onChange: (r) => { if (r.live) live.push(r.name); },
  onGesture: (e) => finals.push(e),
});
recognizer.attach(target as unknown as EventTarget);

/** Advance the virtual clock, firing any hold timer that comes due. */
function tick(ms: number) {
  const end = clock + ms;
  for (const t of [...holdTimers]) {
    if (t.at <= end) {
      clock = t.at;
      holdTimers.splice(holdTimers.indexOf(t), 1);
      t.fn();
    }
  }
  clock = end;
}

let failures = 0;
function expect(label: string, actual: string, wanted: string, mapped?: boolean, wantMapped?: boolean) {
  const ok = actual === wanted && (mapped === undefined || mapped === wantMapped);
  if (!ok) failures += 1;
  const mapTag = mapped === undefined ? '' : mapped ? '  [sent to PC]' : '  [unmapped]';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} → ${actual}${mapTag}${ok ? '' : `   (wanted ${wanted})`}`);
}

/** Assert a label was displayed live at some point during the last sequence. */
function expectSeen(label: string, wanted: string) {
  const ok = live.includes(wanted);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} \u2192 ${wanted}${ok ? '' : `   (live was: ${live.join(', ')})`}`);
}

/** Run one touch sequence; returns the finalized gesture. */
function sequence(label: string, steps: Array<() => void>): GestureLogEntry {
  live = [];
  const before = finals.length;
  for (const step of steps) step();
  if (finals.length === before) {
    failures += 1;
    console.log(`FAIL  ${label.padEnd(30)} → no gesture emitted`);
    return { name: '(none)', mapped: false } as GestureLogEntry;
  }
  return finals[finals.length - 1];
}

const down = (pts: Pt[], node?: unknown) => () => target.fire('touchstart', pts, node);
const move = (pts: Pt[], node?: unknown) => () => target.fire('touchmove', pts, node);
const up = (pts: Pt[] = [], node?: unknown) => () => target.fire('touchend', pts, node);
const wait = (ms: number) => () => tick(ms);

// --- 1 finger -------------------------------------------------------------
let g = sequence('quick tap', [down([[100, 100]]), wait(90), up()]);
expect('quick tap', g.name, '1-Finger Tap', g.mapped, true);

g = sequence('second tap within 300ms', [wait(120), down([[101, 101]]), wait(80), up()]);
expect('second tap within 300ms', g.name, 'Double Tap', g.mapped, true);

g = sequence('slow press, no move', [wait(600), down([[100, 100]]), wait(300), up()]);
expect('slow press, no move', g.name, '1-Finger Press', g.mapped, false);

g = sequence('hold 400ms', [wait(600), down([[100, 100]]), wait(400), up()]);
expect('hold 400ms', g.name, 'Tap & Hold', g.mapped, true);

g = sequence('hold then drag', [
  wait(600), down([[100, 100]]), wait(400), move([[160, 140]]), wait(80), up(),
]);
expect('hold then drag', g.name, '1-Finger Drag', g.mapped, true);

g = sequence('fast slide', [
  wait(600), down([[100, 100]]), move([[140, 105]]), move([[180, 112]]), wait(120), up(),
]);
expect('fast slide', g.name, '1-Finger Move', g.mapped, true);

// --- 2 fingers ------------------------------------------------------------
g = sequence('2-finger tap', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 104]]), wait(140),
  up([[100, 100]]), up(),
]);
expect('2-finger tap', g.name, '2-Finger Tap', g.mapped, true);

g = sequence('2-finger slide down', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 104]]),
  move([[102, 140], [162, 144]]), move([[103, 180], [163, 184]]), wait(200),
  up([[103, 180]]), up(),
]);
expect('2-finger slide down', g.name, '2-Finger Scroll Down', g.mapped, true);
expectSeen('  live label while moving', '2-Finger Scroll Down');

g = sequence('2-finger slide right', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 104]]),
  move([[160, 101], [220, 105]]), wait(200), up(),
]);
expect('2-finger slide right', g.name, '2-Finger Scroll Right', g.mapped, true);

g = sequence('2-finger slow press', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 104]]),
  move([[102, 103], [162, 107]]), wait(500), up(),
]);
expect('2-finger slow press', g.name, '2-Finger Press', g.mapped, false);

g = sequence('pinch out', [
  wait(600), down([[120, 100]]), down([[120, 100], [160, 104]]),
  move([[40, 100], [240, 104]]), wait(250), up(),
]);
expect('pinch out', g.name, 'Pinch Out', g.mapped, false);

g = sequence('pinch in', [
  wait(600), down([[40, 100]]), down([[40, 100], [240, 104]]),
  move([[130, 100], [150, 104]]), wait(250), up(),
]);
expect('pinch in', g.name, 'Pinch In', g.mapped, false);

// --- 3+ fingers -----------------------------------------------------------
g = sequence('3-finger tap', [
  wait(600), down([[100, 200]]), down([[100, 200], [160, 198]]),
  down([[100, 200], [160, 198], [220, 202]]), wait(150),
  up([[100, 200], [160, 198]]), up(),
]);
expect('3-finger tap', g.name, '3-Finger Tap', g.mapped, false);

g = sequence('3-finger swipe left', [
  wait(600), down([[200, 200]]), down([[200, 200], [260, 198]]),
  down([[200, 200], [260, 198], [320, 202]]),
  move([[140, 202], [200, 200], [260, 204]]),
  move([[60, 204], [120, 202], [180, 206]]), wait(220), up(),
]);
expect('3-finger swipe left', g.name, '3-Finger Swipe Left', g.mapped, false);
expectSeen('  live label mid-swipe', '3-Finger Swipe Left');

g = sequence('3-finger swipe up', [
  wait(600), down([[200, 300]]), down([[200, 300], [260, 298]]),
  down([[200, 300], [260, 298], [320, 302]]),
  move([[200, 180], [260, 178], [320, 182]]), wait(200), up(),
]);
expect('3-finger swipe up', g.name, '3-Finger Swipe Up', g.mapped, false);

g = sequence('3-finger hold', [
  wait(600), down([[100, 200]]), down([[100, 200], [160, 198]]),
  down([[100, 200], [160, 198], [220, 202]]), wait(600), up(),
]);
expect('3-finger hold', g.name, '3-Finger Hold', g.mapped, false);

g = sequence('4-finger swipe down', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 100]]),
  down([[100, 100], [160, 100], [220, 100]]),
  down([[100, 100], [160, 100], [220, 100], [280, 100]]),
  move([[100, 220], [160, 220], [220, 220], [280, 220]]), wait(200), up(),
]);
expect('4-finger swipe down', g.name, '4-Finger Swipe Down', g.mapped, false);

g = sequence('5-finger hold', [
  wait(600), down([[80, 100]]), down([[80, 100], [140, 100]]),
  down([[80, 100], [140, 100], [200, 100]]),
  down([[80, 100], [140, 100], [200, 100], [260, 100]]),
  down([[80, 100], [140, 100], [200, 100], [260, 100], [320, 100]]),
  wait(500), up(),
]);
expect('5-finger hold', g.name, '5-Finger Hold', g.mapped, false);

// Fingers lifting one at a time must not demote the verdict to fewer fingers.
g = sequence('3 fingers, lift one by one', [
  wait(600), down([[100, 200]]), down([[100, 200], [160, 198]]),
  down([[100, 200], [160, 198], [220, 202]]), wait(150),
  up([[100, 200], [160, 198]]), up([[100, 200]]), up(),
]);
expect('3 fingers, lift one by one', g.name, '3-Finger Tap', g.mapped, false);

// A second finger landing on the lab window swallows its touchstart; the move
// that follows must still promote the gesture to 2 fingers.
const labNode2 = new FakeElement(true);
g = sequence('finger 2 lands on window', [
  wait(600), down([[100, 100]]), down([[100, 100], [160, 104]], labNode2),
  // The move stream reveals the second finger; measurement starts from there.
  move([[101, 110], [161, 114]]), move([[102, 150], [162, 154]]),
  move([[103, 190], [163, 194]]), wait(200), up(),
]);
expect('finger 2 lands on window', g.name, '2-Finger Scroll Down', g.mapped, true);

// --- touches on the lab window itself ------------------------------------
const labNode = new FakeElement(true);
const before = finals.length;
target.fire('touchstart', [[10, 10]], labNode);
tick(60);
target.fire('touchmove', [[40, 40]], labNode);
target.fire('touchend', [], labNode);
const ignored = finals.length === before;
console.log(`${ignored ? 'PASS' : 'FAIL'}  ${'drag on lab window'.padEnd(30)} \u2192 ignored (no gesture emitted)`);
if (!ignored) failures += 1;

// A real gesture still works right after the window was dragged.
g = sequence('tap after window drag', [wait(600), down([[100, 100]]), wait(90), up()]);
expect('tap after window drag', g.name, '1-Finger Tap', g.mapped, true);

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`} — ${finals.length} gestures recognised`);
process.exit(failures === 0 ? 0 : 1);
/* --- GESTURE_LAB_TEST_FEATURE_END --- */
