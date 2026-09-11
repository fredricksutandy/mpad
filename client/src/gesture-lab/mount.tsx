/* --- GESTURE_LAB_TEST_FEATURE_START --- */
/**
 * Self-contained bootstrap for the Gesture Lab window (test branch only).
 *
 * Importing this module for its side effect is the feature's only hook into the
 * app: it appends its own container to <body> and renders into its own React
 * root, so the App component tree, the settings store and the WebSocket layer
 * stay untouched. Delete the `gesture-lab` folder and the single import in
 * `main.tsx` and nothing else has to change.
 *
 * Add `?gesturelab=0` to the URL to load the app without the lab.
 */
import ReactDOM from 'react-dom/client';
import { GestureLabWindow } from './GestureLabWindow.js';

const CONTAINER_ID = 'mpad-gesture-lab-root';

function isEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('gesturelab') ?? params.get('lab');
    if (flag === null) return true;
    return !['0', 'off', 'false', 'no'].includes(flag.toLowerCase());
  } catch {
    return true;
  }
}

export function mountGestureLab(): void {
  if (typeof document === 'undefined' || !isEnabled()) return;
  if (document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.setAttribute('data-gesture-lab', 'root');
  // The container is a transparent overlay host: only the window itself
  // (pointer-events-auto) may receive input, everything else falls through.
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  ReactDOM.createRoot(container).render(<GestureLabWindow />);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountGestureLab(), { once: true });
  } else {
    mountGestureLab();
  }
}
/* --- GESTURE_LAB_TEST_FEATURE_END --- */
