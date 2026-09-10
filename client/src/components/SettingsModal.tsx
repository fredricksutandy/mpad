import React from 'react';
import { AppSettings } from '../types.js';
import { X, Sliders, RotateCcw, Smartphone, MousePointer, Gauge, Hand } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  updateSetting,
  resetSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-dark-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-dark-850">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Sliders className="w-5 h-5 text-brand-400" />
            <span>Trackpad Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm text-slate-200">
          {/* Pointer Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-4 h-4 text-brand-400" />
                <span>Pointer Sensitivity</span>
              </span>
              <span className="text-brand-300 font-mono">{settings.sensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={settings.sensitivity}
              onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))}
              className="w-full accent-brand-500 bg-dark-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Precise (0.5x)</span>
              <span>Fast (3.0x)</span>
            </div>
          </div>

          {/* Pointer Acceleration */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-brand-400" />
                <span>Cursor Acceleration</span>
              </span>
              <span className="text-brand-300 font-mono">{settings.acceleration.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={settings.acceleration}
              onChange={(e) => updateSetting('acceleration', parseFloat(e.target.value))}
              className="w-full accent-brand-500 bg-dark-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Linear (1.0x)</span>
              <span>Aggressive (2.5x)</span>
            </div>
          </div>

          {/* Scroll Speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span>Two-Finger Scroll Speed</span>
              <span className="text-brand-300 font-mono">{settings.scrollSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.scrollSpeed}
              onChange={(e) => updateSetting('scrollSpeed', parseFloat(e.target.value))}
              className="w-full accent-brand-500 bg-dark-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          <div className="pt-2 border-t border-white/5 space-y-4">
            {/* Invert Scroll */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-xs block">Invert Scroll Direction</span>
                <span className="text-[11px] text-slate-400">Natural / Mac style vs Windows style</span>
              </div>
              <input
                type="checkbox"
                checked={settings.invertScroll}
                onChange={(e) => updateSetting('invertScroll', e.target.checked)}
                className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
              />
            </label>

            {/* Physical Click Buttons Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-brand-400" />
                <div>
                  <span className="font-semibold text-xs block">Show Physical Buttons</span>
                  <span className="text-[11px] text-slate-400">Display Left, Mid, and Right click buttons</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showPhysicalButtons}
                onChange={(e) => updateSetting('showPhysicalButtons', e.target.checked)}
                className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
              />
            </label>

            {/* Haptic Feedback */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-brand-400" />
                <div>
                  <span className="font-semibold text-xs block">Haptic Feedback</span>
                  <span className="text-[11px] text-slate-400">Vibrate on taps and clicks</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.haptics}
                onChange={(e) => updateSetting('haptics', e.target.checked)}
                className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Multi-Finger Gestures */}
          <div className="pt-2 border-t border-white/5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Hand className="w-4 h-4 text-brand-400" />
                <div>
                  <span className="font-semibold text-xs block">3-Finger Gestures</span>
                  <span className="text-[11px] text-slate-400">Swipe up for Task View, down for Desktop</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.threeFingerGestures}
                onChange={(e) => updateSetting('threeFingerGestures', e.target.checked)}
                className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
              />
            </label>

            <div className={settings.threeFingerGestures ? 'space-y-2' : 'space-y-2 opacity-40 pointer-events-none'}>
              <div>
                <span className="font-semibold text-xs block">Horizontal Swipe</span>
                <span className="text-[11px] text-slate-400">What a 3-finger left / right swipe switches</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateSetting('horizontalSwipeAction', 'apps')}
                  className={`rounded-xl px-3 py-2 text-left border transition-colors ${
                    settings.horizontalSwipeAction === 'apps'
                      ? 'bg-brand-600/30 border-brand-500/60 text-white'
                      : 'glass-btn border-white/10 text-slate-300'
                  }`}
                >
                  <span className="block text-xs font-semibold">Apps</span>
                  <span className="block text-[10px] font-mono text-slate-400">alt+tab</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSetting('horizontalSwipeAction', 'tabs')}
                  className={`rounded-xl px-3 py-2 text-left border transition-colors ${
                    settings.horizontalSwipeAction === 'tabs'
                      ? 'bg-brand-600/30 border-brand-500/60 text-white'
                      : 'glass-btn border-white/10 text-slate-300'
                  }`}
                >
                  <span className="block text-xs font-semibold">Browser Tabs</span>
                  <span className="block text-[10px] font-mono text-slate-400">ctrl+tab</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-dark-850 flex justify-between items-center">
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
