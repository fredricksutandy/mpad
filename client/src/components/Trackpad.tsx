import React, { useRef, useState, useCallback, useEffect } from 'react';
import { AppSettings, InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { Copy, Clipboard, Undo2, LayoutGrid, CornerDownLeft, XCircle, MousePointer, Hand, Layers } from 'lucide-react';

/** Fingers required before a swipe counts as a multi-finger gesture. */
const GESTURE_MIN_FINGERS = 3;
/** Centroid travel, in px, before a swipe commits to an action. */
const GESTURE_THRESHOLD_PX = 60;
/** The dominant axis must beat the other one by this factor, so diagonals do nothing. */
const GESTURE_AXIS_RATIO = 1.3;
/** How long the on-screen confirmation of a fired gesture stays up. */
const GESTURE_LABEL_MS = 900;
/** Centroid travel, in px, before two fingers start scrolling. */
const SCROLL_DEAD_ZONE_PX = 4;

type SwipeDirection = 'up' | 'down' | 'left' | 'right';

const centroidOf = (touches: Touch[]) => {
  let sx = 0;
  let sy = 0;
  for (const t of touches) {
    sx += t.clientX;
    sy += t.clientY;
  }
  return { x: sx / touches.length, y: sy / touches.length };
};

interface TrackpadProps {
  settings: AppSettings;
  sendPacket: (packet: InputPacket) => void;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export const Trackpad: React.FC<TrackpadProps> = ({ settings, sendPacket }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { triggerHaptic } = useHaptics(settings.haptics);

  const [activeTouches, setActiveTouches] = useState<TouchPoint[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [gestureLabel, setGestureLabel] = useState<string | null>(null);

  // Gesture tracking refs to avoid re-renders during high-frequency touch events
  const stateRef = useRef({
    touchStartTime: 0,
    touchStartX: 0,
    touchStartY: 0,
    lastX: 0,
    lastY: 0,
    totalMoved: 0,
    lastTapTime: 0,
    dragHoldTimer: null as number | null,
    isDragging: false,

    // 2-finger scroll/tap tracking
    twoFingerStartTime: 0,
    lastMidX: 0,
    lastMidY: 0,
    twoFingerMoved: 0,
    isTwoFingerTapCandidate: false,

    // 3+ finger gesture tracking
    maxTouchCount: 0,
    gestureActive: false,
    gestureFired: false,
    gestureStartX: 0,
    gestureStartY: 0,
    gestureLabelTimer: null as number | null,

    // Pointer fallback tracking
    activePointers: new Map<number, { x: number; y: number }>(),
  });

  const clearDragTimer = useCallback(() => {
    if (stateRef.current.dragHoldTimer) {
      clearTimeout(stateRef.current.dragHoldTimer);
      stateRef.current.dragHoldTimer = null;
    }
  }, []);

  // Maps a committed 3-finger swipe onto a Windows shortcut. Everything here rides the
  // existing `shortcut` packet, so the protocol, the server and InputBridge are untouched.
  const fireGesture = useCallback(
    (direction: SwipeDirection) => {
      const useTabs = settings.horizontalSwipeAction === 'tabs';

      let keys: string;
      let label: string;

      switch (direction) {
        case 'up':
          keys = 'win+tab';
          label = 'Task View';
          break;
        case 'down':
          keys = 'win+d';
          label = 'Show Desktop';
          break;
        case 'right':
          keys = useTabs ? 'ctrl+tab' : 'alt+tab';
          label = useTabs ? 'Next Tab' : 'Next App';
          break;
        case 'left':
          keys = useTabs ? 'ctrl+shift+tab' : 'alt+shift+tab';
          label = useTabs ? 'Previous Tab' : 'Previous App';
          break;
      }

      triggerHaptic('medium');
      sendPacket({ type: 'shortcut', keys });

      setGestureLabel(label);
      if (stateRef.current.gestureLabelTimer) {
        clearTimeout(stateRef.current.gestureLabelTimer);
      }
      stateRef.current.gestureLabelTimer = window.setTimeout(() => {
        setGestureLabel(null);
        stateRef.current.gestureLabelTimer = null;
      }, GESTURE_LABEL_MS);
    },
    [sendPacket, settings.horizontalSwipeAction, triggerHaptic]
  );

  // Unmount only: the label timer outlives the touch listeners below, which re-bind
  // whenever a setting changes.
  useEffect(() => {
    const state = stateRef.current;
    return () => {
      if (state.gestureLabelTimer) {
        clearTimeout(state.gestureLabelTimer);
        state.gestureLabelTimer = null;
      }
    };
  }, []);

  // Native non-passive touch listeners on container DOM element
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      const rect = el.getBoundingClientRect();

      setActiveTouches(
        touches.map((t) => ({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
        }))
      );

      const count = touches.length;
      const now = performance.now();

      if (count > stateRef.current.maxTouchCount) {
        stateRef.current.maxTouchCount = count;
      }

      // 3+ fingers take over the whole touch cycle. Fingers never land at the same
      // instant, so without this the ramp through count 1 and 2 leaks a drag, a scroll
      // or a right click into the middle of a swipe.
      if (count >= GESTURE_MIN_FINGERS) {
        clearDragTimer();

        if (stateRef.current.isDragging) {
          stateRef.current.isDragging = false;
          setIsDragging(false);
          sendPacket({ type: 'mouseup', button: 1 });
        }
        stateRef.current.isTwoFingerTapCandidate = false;

        // Anchored once per cycle, so a finger landing late does not shift the origin.
        if (!stateRef.current.gestureActive) {
          stateRef.current.gestureActive = true;
          const c = centroidOf(touches);
          stateRef.current.gestureStartX = c.x;
          stateRef.current.gestureStartY = c.y;
        }
        return;
      }

      if (count === 1) {
        // A lone first touch means the pad was empty a moment ago, so any latched
        // gesture state is stale. Without this, a touchcancel that never reaches
        // zero would leave the 1- and 2-finger paths muted for good.
        stateRef.current.maxTouchCount = 1;
        stateRef.current.gestureActive = false;
        stateRef.current.gestureFired = false;

        const t = touches[0];
        stateRef.current.touchStartTime = now;
        stateRef.current.touchStartX = t.clientX;
        stateRef.current.touchStartY = t.clientY;
        stateRef.current.lastX = t.clientX;
        stateRef.current.lastY = t.clientY;
        stateRef.current.totalMoved = 0;

        clearDragTimer();

        // 350ms tap-and-hold to initiate drag mode
        stateRef.current.dragHoldTimer = window.setTimeout(() => {
          if (stateRef.current.totalMoved < 12 && !stateRef.current.isDragging) {
            stateRef.current.isDragging = true;
            setIsDragging(true);
            triggerHaptic('medium');
            sendPacket({ type: 'mousedown', button: 1 });
          }
        }, 350);
      } else if (count === 2) {
        clearDragTimer();

        if (stateRef.current.isDragging) {
          stateRef.current.isDragging = false;
          setIsDragging(false);
          sendPacket({ type: 'mouseup', button: 1 });
        }

        stateRef.current.twoFingerStartTime = now;
        stateRef.current.twoFingerMoved = 0;
        stateRef.current.isTwoFingerTapCandidate = true;

        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        stateRef.current.lastMidX = midX;
        stateRef.current.lastMidY = midY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      const count = touches.length;
      const rect = el.getBoundingClientRect();

      setActiveTouches(
        touches.map((t) => ({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
        }))
      );

      // Once 3+ fingers have been seen this cycle the 1- and 2-finger paths stay muted
      // until the pad is clear, so lifting fingers one at a time cannot leak a cursor
      // jump or a scroll.
      if (stateRef.current.maxTouchCount >= GESTURE_MIN_FINGERS) {
        const canFire =
          settings.threeFingerGestures &&
          !stateRef.current.gestureFired &&
          // Exactly three: a 4th or 5th finger latches the count higher and fires
          // nothing, leaving those gestures free to be added later.
          stateRef.current.maxTouchCount === GESTURE_MIN_FINGERS &&
          count >= GESTURE_MIN_FINGERS;

        if (canFire) {
          const c = centroidOf(touches);
          const dx = c.x - stateRef.current.gestureStartX;
          const dy = c.y - stateRef.current.gestureStartY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          // One action per cycle, and only along a clearly dominant axis.
          if (absX > GESTURE_THRESHOLD_PX && absX > absY * GESTURE_AXIS_RATIO) {
            stateRef.current.gestureFired = true;
            fireGesture(dx > 0 ? 'right' : 'left');
          } else if (absY > GESTURE_THRESHOLD_PX && absY > absX * GESTURE_AXIS_RATIO) {
            stateRef.current.gestureFired = true;
            fireGesture(dy > 0 ? 'down' : 'up');
          }
        }
        return;
      }

      if (count === 1) {
        const t = touches[0];
        const rawDx = t.clientX - stateRef.current.lastX;
        const rawDy = t.clientY - stateRef.current.lastY;

        stateRef.current.lastX = t.clientX;
        stateRef.current.lastY = t.clientY;

        const dist = Math.hypot(rawDx, rawDy);
        stateRef.current.totalMoved += dist;

        if (stateRef.current.totalMoved > 10) {
          clearDragTimer();
        }

        if (dist > 0) {
          const speed = dist;
          const accel = Math.pow(Math.max(1, speed / 3.0), settings.acceleration - 1.0);
          const outDx = rawDx * settings.sensitivity * accel;
          const outDy = rawDy * settings.sensitivity * accel;

          sendPacket({ type: 'move', dx: outDx, dy: outDy });
        }
      } else if (count === 2) {
        clearDragTimer();
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;

        const rawDx = midX - stateRef.current.lastMidX;
        const rawDy = midY - stateRef.current.lastMidY;

        stateRef.current.lastMidX = midX;
        stateRef.current.lastMidY = midY;

        const dist = Math.hypot(rawDx, rawDy);
        stateRef.current.twoFingerMoved += dist;

        if (stateRef.current.twoFingerMoved > 8) {
          stateRef.current.isTwoFingerTapCandidate = false;
        }

        // Dead zone: stops a settling touch from scrolling, and narrows the window in
        // which a third finger on its way down can leak a scroll.
        if (dist > 0.5 && stateRef.current.twoFingerMoved > SCROLL_DEAD_ZONE_PX) {
          const direction = settings.invertScroll ? 1 : -1;
          const scrollDy = rawDy * settings.scrollSpeed * 8 * direction;
          const scrollDx = rawDx * settings.scrollSpeed * 8 * direction;

          sendPacket({
            type: 'scroll',
            dy: Math.round(scrollDy),
            dx: Math.round(scrollDx),
          });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      clearDragTimer();

      const remaining = Array.from(e.touches);
      const rect = el.getBoundingClientRect();

      setActiveTouches(
        remaining.map((t) => ({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
        }))
      );

      // Tail of a multi-finger cycle: no click, no right click, and no stale tap time
      // left behind to seed a double click on the next touch.
      if (stateRef.current.maxTouchCount >= GESTURE_MIN_FINGERS) {
        if (remaining.length === 0) {
          stateRef.current.maxTouchCount = 0;
          stateRef.current.gestureActive = false;
          stateRef.current.gestureFired = false;
          stateRef.current.isTwoFingerTapCandidate = false;
          stateRef.current.totalMoved = 0;
          stateRef.current.twoFingerMoved = 0;
          stateRef.current.lastTapTime = 0;
        }
        return;
      }

      const now = performance.now();

      if (remaining.length === 0 && stateRef.current.isDragging) {
        stateRef.current.isDragging = false;
        setIsDragging(false);
        triggerHaptic('medium');
        sendPacket({ type: 'mouseup', button: 1 });
        return;
      }

      if (remaining.length === 0 && stateRef.current.isTwoFingerTapCandidate) {
        const duration = now - stateRef.current.twoFingerStartTime;
        if (duration < 300 && stateRef.current.twoFingerMoved < 15) {
          triggerHaptic('medium');
          sendPacket({ type: 'click', button: 2 });
          stateRef.current.isTwoFingerTapCandidate = false;
          return;
        }
      }

      if (remaining.length === 0) {
        const duration = now - stateRef.current.touchStartTime;
        if (duration < 250 && stateRef.current.totalMoved < 12) {
          const timeSinceLastTap = now - stateRef.current.lastTapTime;
          
          if (timeSinceLastTap < 300) {
            triggerHaptic('heavy');
            sendPacket({ type: 'dblclick', button: 1 });
            stateRef.current.lastTapTime = 0;
          } else {
            triggerHaptic('light');
            sendPacket({ type: 'click', button: 1 });
            stateRef.current.lastTapTime = now;
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [
    clearDragTimer,
    fireGesture,
    sendPacket,
    settings.acceleration,
    settings.invertScroll,
    settings.scrollSpeed,
    settings.sensitivity,
    settings.threeFingerGestures,
    triggerHaptic,
  ]);

  const handleButtonClick = (button: number, type: 'light' | 'medium' = 'light') => {
    triggerHaptic(type);
    sendPacket({ type: 'click', button });
  };

  const handleShortcut = (keys: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'shortcut', keys });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden select-none">
      {/* Quick Hotkey Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-900/80 border-b border-white/5 overflow-x-auto gap-2 no-scrollbar">
        <button
          onClick={() => handleShortcut('ctrl+c')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </button>

        <button
          onClick={() => handleShortcut('ctrl+v')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span>Paste</span>
        </button>

        <button
          onClick={() => handleShortcut('ctrl+z')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => handleShortcut('win+d')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Desktop</span>
        </button>

        <button
          onClick={() => handleShortcut('enter')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Enter</span>
        </button>

        <button
          onClick={() => handleShortcut('esc')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-btn text-xs font-medium text-slate-300 active:text-white"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Esc</span>
        </button>
      </div>

      {/* Main Touchpad Canvas Surface */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-gradient-to-b from-dark-900 to-dark-950 touch-none cursor-crosshair overflow-hidden flex flex-col items-center justify-center border-b border-white/5"
      >
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Status / Gesture / Drag Badge */}
        {gestureLabel ? (
          <div className="z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-semibold animate-fade-in">
            <Layers className="w-4 h-4" />
            <span>{gestureLabel}</span>
          </div>
        ) : isDragging ? (
          <div className="z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-semibold animate-pulse">
            <Hand className="w-4 h-4" />
            <span>Dragging Mode (Hold active)</span>
          </div>
        ) : (
          <div className="z-10 flex flex-col items-center text-slate-500/60 pointer-events-none space-y-1">
            <MousePointer className="w-8 h-8 opacity-40 mb-1 animate-pulse-subtle" />
            <span className="text-xs font-medium tracking-wide">Touch & slide to move pointer</span>
            <span className="text-[11px] opacity-70">1-tap Left Click • 2-tap Right Click • 2-finger Scroll</span>
            {settings.threeFingerGestures && (
              <span className="text-[11px] opacity-70">
                3-finger ← → {settings.horizontalSwipeAction === 'tabs' ? 'Switch Tab' : 'Switch App'} • ↑ Task View • ↓ Desktop
              </span>
            )}
          </div>
        )}

        {/* Touch Ripple / Finger Glow Indicators */}
        {activeTouches.map((touch) => (
          <div
            key={touch.id}
            className="absolute rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform"
            style={{
              left: `${touch.x}px`,
              top: `${touch.y}px`,
              width: '64px',
              height: '64px',
              background: isDragging 
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0) 70%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%)',
            }}
          >
            <div className={`w-3 h-3 mx-auto mt-[26px] rounded-full ${isDragging ? 'bg-amber-400' : 'bg-brand-400'} shadow-lg shadow-brand-500/50`} />
          </div>
        ))}
      </div>

      {/* Bottom Physical Buttons (Toggleable via Settings or Header) */}
      {settings.showPhysicalButtons && (
        <div className="flex h-20 w-full bg-dark-900/90 border-t border-white/5 p-2 gap-2 flex-shrink-0 animate-fade-in">
          <button
            onClick={() => handleButtonClick(1, 'light')}
            className="flex-1 rounded-xl glass-btn flex flex-col items-center justify-center text-slate-300 active:text-white active:bg-brand-600/30"
          >
            <span className="text-sm font-semibold">Left Click</span>
            <span className="text-[10px] text-slate-400/80">Tap / Select</span>
          </button>

          <button
            onClick={() => handleButtonClick(3, 'light')}
            className="w-16 rounded-xl glass-btn flex flex-col items-center justify-center text-slate-400 active:text-white"
          >
            <span className="text-xs font-semibold">Mid</span>
            <span className="text-[9px] text-slate-500">Scroll</span>
          </button>

          <button
            onClick={() => handleButtonClick(2, 'medium')}
            className="flex-1 rounded-xl glass-btn flex flex-col items-center justify-center text-slate-300 active:text-white active:bg-brand-600/30"
          >
            <span className="text-sm font-semibold">Right Click</span>
            <span className="text-[10px] text-slate-400/80">Context Menu</span>
          </button>
        </div>
      )}
    </div>
  );
};
