/* --- GESTURE_LAB_TEST_FEATURE_START --- */
/**
 * Gesture Lab window — a small draggable HUD that names every gesture it sees.
 *
 * Branch-only test tool. It renders in its own React root (see mount.tsx), reads
 * touches through a passive observer (see recognizer.ts) and sends nothing to the
 * PC, so gestures can be verified on the phone alone with no desktop host
 * connected. Nothing in the app depends on this component.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, GripHorizontal, X } from 'lucide-react';
import {
  GestureLogEntry,
  GestureReading,
  GestureRecognizer,
  IDLE_READING,
  arrowOf,
} from './recognizer.js';

const STORAGE_KEY = 'mpad_gesture_lab_v1';
const MARGIN = 10;
const HISTORY_LIMIT = 6;
const CARD_WIDTH = 222;

interface Position {
  x: number;
  y: number;
}

interface PersistedState {
  pos: Position | null;
  collapsed: boolean;
  hidden: boolean;
}

/** Top-right of the pad itself, clear of the header and the hotkey toolbar. */
function defaultPosition(): Position {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN };
  return {
    x: Math.max(MARGIN, window.innerWidth - CARD_WIDTH - MARGIN),
    y: Math.max(110, Math.round(window.innerHeight * 0.22)),
  };
}

function loadState(): PersistedState {
  const fallback: PersistedState = { pos: null, collapsed: false, hidden: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      pos:
        parsed.pos && typeof parsed.pos.x === 'number' && typeof parsed.pos.y === 'number'
          ? { x: parsed.pos.x, y: parsed.pos.y }
          : null,
      collapsed: Boolean(parsed.collapsed),
      hidden: Boolean(parsed.hidden),
    };
  } catch {
    return fallback;
  }
}

function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota — the lab just forgets its position.
  }
}

function clockOf(at: number): string {
  const d = new Date(at);
  return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export const GestureLabWindow: React.FC = () => {
  const persisted = useMemo(loadState, []);

  const [pos, setPos] = useState<Position>(() => persisted.pos ?? defaultPosition());
  const [collapsed, setCollapsed] = useState(persisted.collapsed);
  const [hidden, setHidden] = useState(persisted.hidden);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState<GestureReading>(IDLE_READING);
  const [history, setHistory] = useState<GestureLogEntry[]>([]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  const clampToViewport = useCallback((x: number, y: number): Position => {
    const card = cardRef.current;
    const width = card?.offsetWidth ?? CARD_WIDTH;
    const height = card?.offsetHeight ?? 170;
    const maxX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    return {
      x: Math.min(Math.max(x, MARGIN), maxX),
      y: Math.min(Math.max(y, MARGIN), maxY),
    };
  }, []);

  // Observe touches. Live readings are coalesced into one repaint per frame so
  // the HUD cannot add jitter to the trackpad it is measuring.
  useEffect(() => {
    let frame = 0;
    let pendingReading: GestureReading | null = null;
    let pendingLog: GestureLogEntry[] = [];

    const flush = () => {
      frame = 0;
      if (pendingReading) {
        setReading(pendingReading);
        pendingReading = null;
      }
      if (pendingLog.length > 0) {
        const batch = pendingLog;
        pendingLog = [];
        setHistory((prev) => [...batch.reverse(), ...prev].slice(0, HISTORY_LIMIT));
      }
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(flush);
    };

    const recognizer = new GestureRecognizer({
      onChange: (next) => {
        pendingReading = next;
        schedule();
      },
      onGesture: (entry) => {
        pendingLog.push(entry);
        schedule();
      },
    });

    const detach = recognizer.attach(document);

    return () => {
      detach();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    setPos((prev) => clampToViewport(prev.x, prev.y));
  }, [clampToViewport, collapsed, hidden]);

  useEffect(() => {
    const onResize = () => setPos((prev) => clampToViewport(prev.x, prev.y));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [clampToViewport]);

  useEffect(() => {
    saveState({ pos, collapsed, hidden });
  }, [pos, collapsed, hidden]);

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPos(clampToViewport(event.clientX - drag.offsetX, event.clientY - drag.offsetY));
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  if (hidden) {
    return (
      <button
        data-gesture-lab="launcher"
        onClick={() => setHidden(false)}
        title="Show Gesture Lab"
        className="pointer-events-auto fixed bottom-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-brand-500/40 bg-dark-900/90 text-brand-400 shadow-lg shadow-black/40 backdrop-blur active:scale-95"
      >
        <Activity className="h-4 w-4" />
      </button>
    );
  }

  const fingers = reading.fingers > 0 ? reading.fingers : reading.peakFingers;
  const last = history[0];

  return (
    <div
      ref={cardRef}
      data-gesture-lab="window"
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${CARD_WIDTH}px` }}
      className={`pointer-events-auto fixed z-40 select-none overflow-hidden rounded-xl border border-white/10 bg-dark-900/95 shadow-2xl shadow-black/60 backdrop-blur-md transition-shadow ${
        dragging ? 'border-brand-500/50 shadow-brand-900/40' : ''
      }`}
    >
      {/* Drag handle */}
      <header
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => setPos(defaultPosition())}
        className={`flex touch-none items-center gap-1.5 border-b border-white/5 px-2 py-1.5 ${
          dragging ? 'cursor-grabbing bg-brand-600/20' : 'cursor-grab bg-dark-850/80'
        }`}
      >
        <GripHorizontal className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
        <span className="flex-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Gesture Lab
        </span>
        <span className="rounded bg-amber-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-amber-300">
          Test
        </span>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-500 active:bg-white/10 active:text-white"
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setHidden(true)}
          title="Hide"
          className="flex h-5 w-5 items-center justify-center rounded text-slate-500 active:bg-white/10 active:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Live gesture name */}
      <div className="px-2.5 pb-2 pt-2">
        <div className="flex items-start gap-1.5">
          <span
            className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
              reading.live
                ? 'bg-brand-400 shadow-[0_0_6px] shadow-brand-500/80'
                : reading.mapped
                  ? 'bg-emerald-400'
                  : 'bg-slate-600'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              data-gesture-lab="name"
              className="truncate text-[13px] font-semibold leading-tight text-white"
            >
              {reading.name}
            </p>
            <p
              data-gesture-lab="mapping"
              className="mt-0.5 text-[9px] leading-snug text-slate-400 line-clamp-2"
            >
              {reading.mapping}
            </p>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Finger count + live metrics */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((slot) => (
                  <span
                    key={slot}
                    className={`h-1.5 w-3 rounded-full ${
                      slot <= fingers ? (reading.live ? 'bg-brand-400' : 'bg-slate-500') : 'bg-white/10'
                    }`}
                  />
                ))}
                <span className="ml-1 text-[10px] font-bold tabular-nums text-slate-300">{fingers}</span>
              </div>
              <span
                className={`rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-wide ${
                  reading.mapped ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'
                }`}
              >
                {reading.mapped ? 'Sent to PC' : 'Unmapped'}
              </span>
            </div>

            <div className="mt-1.5 grid grid-cols-3 gap-1 font-mono text-[9px] text-slate-500">
              <span className="truncate" title="Centroid travel">
                {arrowOf(reading.dx, reading.dy)} {Math.round(reading.drift)}px
              </span>
              <span className="truncate" title="Pinch spread delta">
                ⇔ {reading.pinch >= 0 ? '+' : ''}
                {Math.round(reading.pinch)}
              </span>
              <span className="truncate text-right" title="Duration">
                {Math.round(reading.elapsed)}ms
              </span>
            </div>

            {/* Recent gestures */}
            <div className="mt-2 border-t border-white/5 pt-1.5">
              <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-600">Recent</p>
              {history.length === 0 ? (
                <p className="py-1 text-[9px] italic text-slate-600">Nothing yet — tap or swipe the pad.</p>
              ) : (
                <ul className="space-y-0.5">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-1.5 text-[9px] leading-tight">
                      <span
                        className={`h-1 w-1 flex-shrink-0 rounded-full ${
                          entry.mapped ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <span className="flex-1 truncate text-slate-300">{entry.name}</span>
                      <span className="flex-shrink-0 font-mono text-slate-600">{clockOf(entry.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {collapsed && last && (
          <p className="mt-1.5 truncate font-mono text-[9px] text-slate-600">
            last: {last.name} · {clockOf(last.at)}
          </p>
        )}
      </div>
    </div>
  );
};
/* --- GESTURE_LAB_TEST_FEATURE_END --- */
