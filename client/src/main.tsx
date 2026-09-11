import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';
/* --- GESTURE_LAB_TEST_FEATURE_START --- */
// Branch-only test tool: self-mounting gesture HUD. Remove this import and
// the src/gesture-lab folder to drop the feature entirely.
import './gesture-lab/mount.js';
/* --- GESTURE_LAB_TEST_FEATURE_END --- */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
