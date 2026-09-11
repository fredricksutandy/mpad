/* --- GESTURE_LAB_TEST_FEATURE_START --- */
/**
 * Standalone Gesture Lab page (test branch only) — served at /gesture-lab.html
 * by the Vite dev server.
 *
 * This page loads neither App nor the WebSocket client: it is a bare practice
 * pad plus the lab window, for checking gesture detection and the HUD display
 * with no desktop host in the picture at all. The real app keeps its own lab
 * window via the import in main.tsx.
 */
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Hand } from 'lucide-react';
import '../index.css';
import './mount.js';

const CHEATSHEET: Array<[string, string]> = [
  ['1-finger tap / slide', 'left click · pointer move'],
  ['1-finger hold 350ms', 'drag mode'],
  ['double tap', 'double click'],
  ['2-finger tap / slide', 'right click · scroll'],
  ['3–5 finger tap / swipe', 'unmapped — free slots'],
];

const PracticePad: React.FC = () => {
  const padRef = useRef<HTMLDivElement | null>(null);

  // Swallow the browser's own touch handling so multi-finger gestures reach the
  // lab intact, the same way the real Trackpad surface does.
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const block = (event: TouchEvent) => event.preventDefault();
    el.addEventListener('touchstart', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    el.addEventListener('touchend', block, { passive: false });
    return () => {
      el.removeEventListener('touchstart', block);
      el.removeEventListener('touchmove', block);
      el.removeEventListener('touchend', block);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-dark-950 text-slate-100">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/5 bg-dark-900/80 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Gesture Lab — practice pad
        </span>
        <span className="rounded bg-amber-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300">
          No PC needed
        </span>
      </header>

      <div
        ref={padRef}
        className="relative flex flex-1 touch-none flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-dark-900 to-dark-950"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <Hand className="mb-2 h-8 w-8 text-slate-600" />
        <p className="text-xs font-medium text-slate-500">Gesture here — the lab window names it</p>
        <ul className="mt-4 space-y-1 px-6 text-[10px] text-slate-600">
          {CHEATSHEET.map(([gesture, effect]) => (
            <li key={gesture} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span className="text-slate-500">{gesture}</span>
              <span className="text-slate-700">→ {effect}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PracticePad />
  </React.StrictMode>
);
/* --- GESTURE_LAB_TEST_FEATURE_END --- */
