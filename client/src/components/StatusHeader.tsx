import React from 'react';
import { ControlMode } from '../types.js';
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
} from 'lucide-react';

interface StatusHeaderProps {
  mode: ControlMode;
  setMode: (mode: ControlMode) => void;
  isConnected: boolean;
  ping: number | null;
  onOpenSettings: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  mode,
  setMode,
  isConnected,
  ping,
  onOpenSettings,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const navItems: { id: ControlMode; label: string; icon: React.ReactNode }[] = [
    { id: 'trackpad', label: 'Pad', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'keyboard', label: 'Keys', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'media', label: 'Media', icon: <Tv className="w-4 h-4" /> },
    { id: 'presentation', label: 'Slides', icon: <Presentation className="w-4 h-4" /> },
    { id: 'numpad', label: 'Num', icon: <Hash className="w-4 h-4" /> },
  ];

  return (
    <header className="flex flex-col bg-dark-900 border-b border-white/10 select-none">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        {/* Brand & Connection Status */}
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

        {/* Right Tools: Fullscreen & Settings */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-400 active:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-400 active:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex items-center justify-around p-1.5 gap-1 bg-dark-950/60">
        {navItems.map((item) => {
          const isActive = mode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 active:bg-white/5'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
