import React, { useState } from 'react';
import { ControlMode, CompanionModule, AppSettings } from '../types.js';
import {
  MousePointer,
  Keyboard,
  Tv,
  Presentation,
  Hash,
  Settings,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  Menu,
  X,
  Sliders,
  Layers,
  Mouse,
  Check,
} from 'lucide-react';

interface StatusHeaderProps {
  mode: ControlMode;
  setMode: (mode: ControlMode) => void;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  isConnected: boolean;
  ping: number | null;
  onOpenSettings: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  mode,
  setMode,
  settings,
  updateSetting,
  isConnected,
  ping,
  onOpenSettings,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const navItems: { id: ControlMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'trackpad', label: 'Precision Trackpad', desc: 'Touchpad gestures & cursor', icon: <MousePointer className="w-5 h-5" /> },
    { id: 'keyboard', label: 'Virtual Keyboard & Keys', desc: 'Live text input & navigation pad', icon: <Keyboard className="w-5 h-5" /> },
    { id: 'media', label: 'Media & Audio Remote', desc: 'Volume, playback, track skip', icon: <Tv className="w-5 h-5" /> },
    { id: 'presentation', label: 'Presentation Clicker', desc: 'Slide presenter & stopwatch', icon: <Presentation className="w-5 h-5" /> },
    { id: 'numpad', label: 'Numeric Keypad', desc: '10-key numpad for calculations', icon: <Hash className="w-5 h-5" /> },
  ];

  /* --- EXTENDED_SECTION_FEATURE_START --- */
  const companionOptions: { id: CompanionModule; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'None (Full Screen Trackpad)', icon: <X className="w-4 h-4" /> },
    { id: 'media', label: 'Media Controls (Volume / Play)', icon: <Tv className="w-4 h-4" /> },
    { id: 'keyboard', label: 'Keyboard & Hotkeys', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'presentation', label: 'Slide Clicker (Next / Prev)', icon: <Presentation className="w-4 h-4" /> },
    { id: 'numpad', label: 'Numeric Keypad Dock', icon: <Hash className="w-4 h-4" /> },
  ];
  /* --- EXTENDED_SECTION_FEATURE_END --- */

  return (
    <>
      {/* Minimal Top Header Bar */}
      <header className="flex items-center justify-between px-3 py-2 bg-dark-900/95 backdrop-blur-md border-b border-white/10 select-none z-20">
        {/* Left: Brand & Connection Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
            <span>mPad</span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? `${ping ?? 0}ms` : 'Offline'}</span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5">
          {/* Quick Toggle Physical Click Buttons */}
          {mode === 'trackpad' && (
            <button
              onClick={() => updateSetting('showPhysicalButtons', !settings.showPhysicalButtons)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                settings.showPhysicalButtons
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : 'glass-btn text-slate-400'
              }`}
              title="Toggle Physical Click Buttons"
            >
              <Mouse className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Buttons</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-400 active:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Menu Drawer Toggle */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-300 active:bg-brand-600/40 flex items-center justify-center"
            title="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Slide-Out Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex select-none animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-dark-900 border-r border-white/10 flex flex-col z-10 shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-850">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="font-bold text-base text-white">Menu & Features</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen Mode Selection */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Full Screen Modes
              </span>
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMode(item.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                          : 'glass-btn text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-dark-800'}`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[10px] text-slate-400 opacity-80">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- EXTENDED_SECTION_FEATURE_START --- */}
            {/* Split Screen Companion Section Selector */}
            {mode === 'trackpad' && (
              <div className="px-4 py-2 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Trackpad Companion Dock
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 px-1">
                  Split the trackpad into 75% pad and 25% docked widget:
                </p>

                <div className="space-y-1">
                  {companionOptions.map((opt) => {
                    const isSelected = settings.companionModule === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          updateSetting('companionModule', opt.id);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-brand-600/30 border border-brand-500 text-white font-semibold'
                            : 'glass-btn text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-brand-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* --- EXTENDED_SECTION_FEATURE_END --- */}

            {/* Drawer Footer Actions */}
            <div className="mt-auto p-4 border-t border-white/10 bg-dark-850 space-y-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl glass-btn text-xs font-semibold text-slate-200"
              >
                <Sliders className="w-4 h-4 text-brand-400" />
                <span>Trackpad & Cursor Settings</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
