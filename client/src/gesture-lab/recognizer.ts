/* --- GESTURE_LAB_TEST_FEATURE_START --- */
/**
 * Gesture Lab — independent multi-touch recognizer (test branch only).
 *
 * This recognizer is a passive observer. It attaches its listeners on the
 * CAPTURE phase with `passive: true` and never calls `preventDefault()` or
 * `stopPropagation()`, so every touch still reaches the real Trackpad exactly
 * as before. Nothing in the app imports from this file, and this file imports
 * nothing from the app — the thresholds below are deliberately duplicated from
 * `components/Trackpad.tsx` so the lab can be deleted without touching it.
 *
 * Purpose: verify gesture detection and on-screen display when no desktop host
 * is available to connect to (no WebSocket, no cursor to watch).
 */

/** Thresholds mirrored from components/Trackpad.tsx (kept in sync by hand). */
const TAP_MAX_MS = 250;
const TAP_MAX_TRAVEL = 12;
const DOUBLE_TAP_MS = 300;
const HOLD_MS = 350;
const TWO_TAP_MAX_MS = 300;
const TWO_TAP_MAX_DRIFT = 15;
const SCROLL_MIN_DRIFT = 8;

/** Lab-only thresholds for gestures the app does not implement yet. */
const SWIPE_MIN_DRIFT = 40;
const PINCH_MIN_DELTA = 30;
const MULTI_TAP_MAX_MS = 320;

export interface GestureReading {
  /** Fingers currently on the glass. */
  fingers: number;
  /** Highest finger count seen during this touch sequence. */
  peakFingers: number;
  name: string;
  /** What the real app does with this gesture, in plain words. */
  mapping: string;
  /** True when the gesture is wired to a packet the PC would receive. */
  mapped: boolean;
  /** Centroid displacement since the peak finger count was reached. */
  dx: number;
  dy: number;
  /** Straight-line centroid displacement. */
  drift: number;
  /** Signed pinch delta: positive = fingers spread apart. */
  pinch: number;
  /** Milliseconds since the gesture started. */
  elapsed: number;
  /** True while fingers are still down. */
  live: boolean;
}

export interface GestureLogEntry extends GestureReading {
  id: number;
  at: number;
}

export const IDLE_READING: GestureReading = {
  fingers: 0,
  peakFingers: 0,
  name: 'Waiting for touch',
  mapping: 'Put 1–5 fingers on the pad',
  mapped: false,
  dx: 0,
  dy: 0,
  drift: 0,
  pinch: 0,
  elapsed: 0,
  live: false,
};

interface Point {
  x: number;
  y: number;
}

interface Label {
  name: string;
  mapping: string;
  mapped: boolean;
}

export interface RecognizerHandlers {
  /** Fires on every touch change, including the live in-progress gesture. */
  onChange: (reading: GestureReading) => void;
  /** Fires once per completed gesture, when the last finger lifts. */
  onGesture: (entry: GestureLogEntry) => void;
}

function centroidOf(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Mean distance of the touches from their centroid — the pinch measure. */
function spreadOf(points: Point[], center: Point): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (const p of points) {
    total += Math.hypot(p.x - center.x, p.y - center.y);
  }
  return total / points.length;
}

export function directionOf(dx: number, dy: number): string {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'Right' : 'Left';
  return dy >= 0 ? 'Down' : 'Up';
}

export function arrowOf(dx: number, dy: number): string {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return '·';
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? '→' : '←';
  return dy >= 0 ? '↓' : '↑';
}

const UNMAPPED = 'Free slot — nothing is sent to the PC';

export class GestureRecognizer {
  private readonly handlers: RecognizerHandlers;

  private target: EventTarget | null = null;

  private readonly points = new Map<number, Point>();

  /** Centroid + spread captured when the peak finger count was reached. */
  private anchor: Point = { x: 0, y: 0 };
  private anchorSpread = 0;
  private anchorAt = 0;

  private startedAt = 0;
  private peak = 0;

  /**
   * Geometry of the last frame that still had every finger down. The final
   * verdict is measured against this, not against the live touch list: the last
   * touchend carries no touches at all, and a partial lift moves the centroid
   * for reasons that have nothing to do with the gesture.
   */
  private lastCentroid: Point | null = null;
  private lastSpread = 0;

  /** Path length of the primary finger (matches Trackpad's `totalMoved`). */
  private travel = 0;
  private travelAfterHold = 0;
  private primary: Point | null = null;

  private holdTimer: number | null = null;
  private holdArmed = false;

  private lastTapAt = 0;
  private sequence = 0;

  private current: GestureReading = IDLE_READING;

  constructor(handlers: RecognizerHandlers) {
    this.handlers = handlers;
  }

  attach(target: EventTarget = document): () => void {
    this.detach();
    this.target = target;

    const opts: AddEventListenerOptions = { passive: true, capture: true };
    target.addEventListener('touchstart', this.onTouchStart as EventListener, opts);
    target.addEventListener('touchmove', this.onTouchMove as EventListener, opts);
    target.addEventListener('touchend', this.onTouchEnd as EventListener, opts);
    target.addEventListener('touchcancel', this.onTouchEnd as EventListener, opts);

    return () => this.detach();
  }

  detach(): void {
    const target = this.target;
    if (!target) return;
    const opts: EventListenerOptions = { capture: true };
    target.removeEventListener('touchstart', this.onTouchStart as EventListener, opts);
    target.removeEventListener('touchmove', this.onTouchMove as EventListener, opts);
    target.removeEventListener('touchend', this.onTouchEnd as EventListener, opts);
    target.removeEventListener('touchcancel', this.onTouchEnd as EventListener, opts);
    this.clearHoldTimer();
    this.target = null;
  }

  /** Ignore touches that land on the lab window itself, so dragging it is not a gesture. */
  private isOwnSurface(event: TouchEvent): boolean {
    const node = event.target;
    return node instanceof Element && node.closest('[data-gesture-lab]') !== null;
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private syncPoints(event: TouchEvent): void {
    this.points.clear();
    for (let i = 0; i < event.touches.length; i += 1) {
      const touch = event.touches[i];
      this.points.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // `peak` is still the previous peak here, so this updates while fingers land
    // or move and freezes as soon as one lifts.
    if (this.points.size > 0 && this.points.size >= this.peak) {
      const points = this.list();
      const center = centroidOf(points);
      this.lastCentroid = center;
      this.lastSpread = spreadOf(points, center);
    }
  }

  private list(): Point[] {
    return Array.from(this.points.values());
  }

  private resetSequence(): void {
    this.clearHoldTimer();
    this.peak = 0;
    this.travel = 0;
    this.travelAfterHold = 0;
    this.holdArmed = false;
    this.primary = null;
    this.anchorSpread = 0;
    this.lastCentroid = null;
    this.lastSpread = 0;
  }

  private rearmAnchor(now: number): void {
    const points = this.list();
    if (points.length === 0) return;
    const center = centroidOf(points);
    const spread = spreadOf(points, center);
    this.anchor = center;
    this.anchorSpread = spread;
    this.anchorAt = now;
    this.lastCentroid = center;
    this.lastSpread = spread;
  }

  /**
   * Track the peak finger count. Checked on move as well as start, because a
   * touchstart can be missed (a finger landing on the lab window is ignored) and
   * the final verdict must still know how many fingers took part.
   */
  private notePeak(count: number, now: number): void {
    if (count <= this.peak) return;
    this.peak = count;
    // Measure swipes and pinches from the moment the last finger joined.
    this.rearmAnchor(now);
    // Travel and the hold timer only mean something for a single finger.
    if (count > 1) {
      this.clearHoldTimer();
      this.holdArmed = false;
    }
  }

  private onTouchStart = (event: TouchEvent): void => {
    if (this.isOwnSurface(event)) return;

    const now = performance.now();
    const wasIdle = this.points.size === 0;
    this.syncPoints(event);

    if (wasIdle) {
      this.resetSequence();
      this.startedAt = now;
    }

    const count = this.points.size;
    this.notePeak(count, now);

    if (count === 1) {
      this.primary = { ...this.list()[0] };
      this.clearHoldTimer();
      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = null;
        if (this.points.size === 1 && this.travel < TAP_MAX_TRAVEL) {
          this.holdArmed = true;
          this.travelAfterHold = 0;
          this.emitLive(performance.now());
        }
      }, HOLD_MS);
    }

    this.emitLive(now);
  };

  private onTouchMove = (event: TouchEvent): void => {
    if (this.points.size === 0 || this.isOwnSurface(event)) return;

    const now = performance.now();
    const previousPrimary = this.primary;
    this.syncPoints(event);

    const points = this.list();
    this.notePeak(points.length, now);

    if (points.length === 1) {
      const p = points[0];
      if (previousPrimary) {
        const step = Math.hypot(p.x - previousPrimary.x, p.y - previousPrimary.y);
        this.travel += step;
        if (this.holdArmed) this.travelAfterHold += step;
      }
      this.primary = { ...p };
    } else {
      this.primary = null;
    }

    this.emitLive(now);
  };

  private onTouchEnd = (event: TouchEvent): void => {
    if (this.points.size === 0) return;

    const now = performance.now();
    const hadTouches = this.points.size;
    this.syncPoints(event);

    if (this.points.size > 0) {
      // Partial lift (e.g. one of three fingers): keep the sequence alive.
      if (this.points.size === 1 && hadTouches > 1) this.primary = { ...this.list()[0] };
      this.emitLive(now);
      return;
    }

    this.clearHoldTimer();

    const reading = this.buildReading(now, false);
    this.sequence += 1;
    const entry: GestureLogEntry = { ...reading, id: this.sequence, at: Date.now() };

    // Double-tap bookkeeping: a plain tap arms the next one, anything else clears it.
    if (entry.name === '1-Finger Tap') {
      this.lastTapAt = now;
    } else {
      this.lastTapAt = 0;
    }

    this.resetSequence();
    this.current = reading;
    this.handlers.onChange(reading);
    this.handlers.onGesture(entry);
  };

  private metrics(now: number) {
    const center = this.lastCentroid ?? this.anchor;
    const dx = center.x - this.anchor.x;
    const dy = center.y - this.anchor.y;
    const pinch = this.peak > 1 ? this.lastSpread - this.anchorSpread : 0;
    const base = this.peak > 1 ? this.anchorAt : this.startedAt;
    return {
      dx,
      dy,
      drift: Math.hypot(dx, dy),
      pinch,
      elapsed: Math.max(0, now - base),
    };
  }

  private buildReading(now: number, live: boolean): GestureReading {
    const m = this.metrics(now);
    const label = live ? this.labelLive(m) : this.labelFinal(m, now);
    return {
      fingers: this.points.size,
      peakFingers: this.peak,
      name: label.name,
      mapping: label.mapping,
      mapped: label.mapped,
      dx: m.dx,
      dy: m.dy,
      drift: m.drift,
      pinch: m.pinch,
      elapsed: m.elapsed,
      live,
    };
  }

  private emitLive(now: number): void {
    this.current = this.buildReading(now, this.points.size > 0);
    this.handlers.onChange(this.current);
  }

  get reading(): GestureReading {
    return this.current;
  }

  /** Name of the gesture while the fingers are still down. */
  private labelLive(m: { dx: number; dy: number; drift: number; pinch: number; elapsed: number }): Label {
    // Peak, not the live count: lifting one of three fingers should not relabel
    // the gesture as a two-finger one on the way up.
    const fingers = this.peak;

    if (fingers === 1) {
      if (this.holdArmed) {
        return this.travelAfterHold > TAP_MAX_TRAVEL
          ? { name: '1-Finger Drag', mapping: 'Drag & drop — button 1 held down', mapped: true }
          : { name: 'Tap & Hold', mapping: 'Drag mode armed — mousedown (button 1)', mapped: true };
      }
      if (this.travel > TAP_MAX_TRAVEL) {
        return { name: '1-Finger Move', mapping: 'Pointer move — dx / dy stream', mapped: true };
      }
      return { name: '1 Finger Down', mapping: `Tap under ${TAP_MAX_MS}ms clicks, hold ${HOLD_MS}ms drags`, mapped: false };
    }

    if (fingers === 2) {
      if (Math.abs(m.pinch) > PINCH_MIN_DELTA && Math.abs(m.pinch) > m.drift) {
        return { name: `Pinch ${m.pinch > 0 ? 'Out' : 'In'}`, mapping: UNMAPPED, mapped: false };
      }
      if (m.drift >= SCROLL_MIN_DRIFT) {
        return {
          name: `2-Finger Scroll ${directionOf(m.dx, m.dy)}`,
          mapping: 'Scroll wheel — dx / dy stream',
          mapped: true,
        };
      }
      return { name: '2 Fingers Down', mapping: 'Tap right-clicks, slide scrolls', mapped: false };
    }

    if (fingers >= 3) {
      if (m.drift >= SWIPE_MIN_DRIFT) {
        return { name: `${fingers}-Finger Swipe ${directionOf(m.dx, m.dy)}`, mapping: UNMAPPED, mapped: false };
      }
      if (Math.abs(m.pinch) > PINCH_MIN_DELTA) {
        return { name: `${fingers}-Finger Pinch ${m.pinch > 0 ? 'Out' : 'In'}`, mapping: UNMAPPED, mapped: false };
      }
      return { name: `${fingers} Fingers Down`, mapping: UNMAPPED, mapped: false };
    }

    return { name: IDLE_READING.name, mapping: IDLE_READING.mapping, mapped: false };
  }

  /** Name of the gesture once the last finger has lifted. */
  private labelFinal(
    m: { dx: number; dy: number; drift: number; pinch: number; elapsed: number },
    now: number
  ): Label {
    const fingers = this.peak;

    if (fingers === 1) {
      if (this.holdArmed) {
        return this.travelAfterHold > TAP_MAX_TRAVEL
          ? { name: '1-Finger Drag', mapping: 'Drag & drop — mousedown, move, mouseup', mapped: true }
          : { name: 'Tap & Hold', mapping: 'Drag mode — mousedown then mouseup (button 1)', mapped: true };
      }
      if (m.elapsed < TAP_MAX_MS && this.travel < TAP_MAX_TRAVEL) {
        const sinceLastTap = now - this.lastTapAt;
        if (this.lastTapAt > 0 && sinceLastTap < DOUBLE_TAP_MS) {
          return { name: 'Double Tap', mapping: 'Double click (button 1)', mapped: true };
        }
        return { name: '1-Finger Tap', mapping: 'Left click (button 1)', mapped: true };
      }
      if (this.travel >= TAP_MAX_TRAVEL) {
        return { name: '1-Finger Move', mapping: 'Pointer move — dx / dy stream', mapped: true };
      }
      return {
        name: '1-Finger Press',
        mapping: `No action — over ${TAP_MAX_MS}ms for a tap, under ${HOLD_MS}ms for a hold`,
        mapped: false,
      };
    }

    if (fingers === 2) {
      if (Math.abs(m.pinch) > PINCH_MIN_DELTA && Math.abs(m.pinch) > m.drift) {
        return { name: `Pinch ${m.pinch > 0 ? 'Out' : 'In'}`, mapping: UNMAPPED, mapped: false };
      }
      if (m.elapsed < TWO_TAP_MAX_MS && m.drift < TWO_TAP_MAX_DRIFT) {
        return { name: '2-Finger Tap', mapping: 'Right click (button 2)', mapped: true };
      }
      if (m.drift >= SCROLL_MIN_DRIFT) {
        return {
          name: `2-Finger Scroll ${directionOf(m.dx, m.dy)}`,
          mapping: 'Scroll wheel — dx / dy stream',
          mapped: true,
        };
      }
      return { name: '2-Finger Press', mapping: 'No action — too slow to tap, too short to scroll', mapped: false };
    }

    if (fingers >= 3) {
      if (m.drift >= SWIPE_MIN_DRIFT) {
        return { name: `${fingers}-Finger Swipe ${directionOf(m.dx, m.dy)}`, mapping: UNMAPPED, mapped: false };
      }
      if (Math.abs(m.pinch) > PINCH_MIN_DELTA) {
        return { name: `${fingers}-Finger Pinch ${m.pinch > 0 ? 'Out' : 'In'}`, mapping: UNMAPPED, mapped: false };
      }
      if (m.elapsed < MULTI_TAP_MAX_MS) {
        return { name: `${fingers}-Finger Tap`, mapping: UNMAPPED, mapped: false };
      }
      return { name: `${fingers}-Finger Hold`, mapping: UNMAPPED, mapped: false };
    }

    return { name: IDLE_READING.name, mapping: IDLE_READING.mapping, mapped: false };
  }
}
/* --- GESTURE_LAB_TEST_FEATURE_END --- */
