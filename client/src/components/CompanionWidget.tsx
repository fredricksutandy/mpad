/* --- EXTENDED_SECTION_FEATURE_START --- */
import React from 'react';
import { CompanionModule, InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  SkipForward,
  SkipBack,
  ChevronRight,
  ChevronLeft,
  Tv,
  XCircle,
  EyeOff,
  Copy,
  Clipboard,
  Undo2,
  LayoutGrid,
  CornerDownLeft,
  Delete,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
} from 'lucide-react';

interface CompanionWidgetProps {
  module: CompanionModule;
  onClose: () => void;
  sendPacket: (packet: InputPacket) => void;
  hapticsEnabled: boolean;
}

export const CompanionWidget: React.FC<CompanionWidgetProps> = ({
  module,
  onClose,
  sendPacket,
  hapticsEnabled,
}) => {
  const { triggerHaptic } = useHaptics(hapticsEnabled);

  if (module === 'none') return null;

  const handleKey = (key: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key });
  };

  const handleText = (text: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'text', text });
  };

  const handleShortcut = (keys: string) => {
    triggerHaptic('medium');
    sendPacket({ type: 'shortcut', keys });
  };

  const handleMedia = (action: 'volume_up' | 'volume_down' | 'mute' | 'play_pause' | 'next' | 'prev') => {
    triggerHaptic('medium');
    sendPacket({ type: 'media', action });
  };

  return (
    <aside className="relative flex flex-col bg-dark-900/95 border-t landscape:border-t-0 landscape:border-l border-white/10 p-2 select-none overflow-hidden transition-all h-full w-full">
      {/* Mini Title & Close Bar */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {module === 'media' && '🎵 Quick Media Dock'}
          {module === 'keyboard' && '⌨️ Quick Hotkeys & Arrows'}
          {module === 'presentation' && '📊 Quick Slide Clicker'}
          {module === 'numpad' && '🔢 Quick Numpad'}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full glass-btn flex items-center justify-center text-slate-400 hover:text-white"
          title="Close Companion Dock"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Module: Media */}
      {module === 'media' && (
        <div className="flex flex-col justify-around flex-1 gap-1.5">
          <div className="flex items-center justify-around gap-2">
            <button
              onClick={() => handleMedia('prev')}
              className="flex-1 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-300 active:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleMedia('play_pause')}
              className="flex-[1.5] h-10 rounded-xl bg-brand-600 active:bg-brand-700 text-white flex items-center justify-center shadow-md shadow-brand-500/20"
            >
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </button>
            <button
              onClick={() => handleMedia('next')}
              className="flex-1 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-300 active:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleMedia('volume_down')}
              className="h-9 rounded-lg glass-btn flex items-center justify-center gap-1 text-slate-300 text-xs font-semibold"
            >
              <Volume1 className="w-3.5 h-3.5" />
              <span>Vol -</span>
            </button>
            <button
              onClick={() => handleMedia('mute')}
              className="h-9 rounded-lg glass-btn flex items-center justify-center gap-1 text-rose-300 text-xs font-semibold"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute</span>
            </button>
            <button
              onClick={() => handleMedia('volume_up')}
              className="h-9 rounded-lg glass-btn flex items-center justify-center gap-1 text-emerald-300 text-xs font-semibold"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Vol +</span>
            </button>
          </div>
        </div>
      )}

      {/* Module: Presentation */}
      {module === 'presentation' && (
        <div className="flex flex-col justify-between flex-1 gap-1.5">
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => {
                triggerHaptic('medium');
                sendPacket({ type: 'key', key: 'left' });
              }}
              className="flex-1 rounded-xl glass-btn flex items-center justify-center gap-1 text-slate-300 font-semibold text-xs"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>PREV</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic('heavy');
                sendPacket({ type: 'key', key: 'right' });
              }}
              className="flex-[2] rounded-xl bg-brand-600 active:bg-brand-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 text-sm"
            >
              <span>NEXT SLIDE</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleKey('f5')}
              className="h-8 rounded-lg glass-btn text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1"
            >
              <Tv className="w-3 h-3" />
              <span>F5 Start</span>
            </button>
            <button
              onClick={() => handleKey('esc')}
              className="h-8 rounded-lg glass-btn text-[11px] font-semibold text-rose-300 flex items-center justify-center gap-1"
            >
              <XCircle className="w-3 h-3" />
              <span>Exit</span>
            </button>
            <button
              onClick={() => handleKey('b')}
              className="h-8 rounded-lg glass-btn text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1"
            >
              <EyeOff className="w-3 h-3" />
              <span>Black (B)</span>
            </button>
          </div>
        </div>
      )}

      {/* Module: Keyboard / Hotkeys */}
      {module === 'keyboard' && (
        <div className="flex flex-col justify-around flex-1 gap-1.5 overflow-y-auto">
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleShortcut('ctrl+c')} className="h-8 rounded-lg glass-btn text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1">
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
            <button onClick={() => handleShortcut('ctrl+v')} className="h-8 rounded-lg glass-btn text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1">
              <Clipboard className="w-3 h-3" />
              <span>Paste</span>
            </button>
            <button onClick={() => handleShortcut('ctrl+z')} className="h-8 rounded-lg glass-btn text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1">
              <Undo2 className="w-3 h-3" />
              <span>Undo</span>
            </button>
            <button onClick={() => handleShortcut('win+d')} className="h-8 rounded-lg glass-btn text-[11px] font-medium text-indigo-300 flex items-center justify-center gap-1">
              <LayoutGrid className="w-3 h-3" />
              <span>Win+D</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            <div className="flex gap-1">
              <button onClick={() => handleKey('backspace')} className="h-8 px-2.5 rounded-lg glass-btn text-rose-300 text-xs font-semibold flex items-center gap-1">
                <Delete className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleKey('enter')} className="h-8 px-2.5 rounded-lg glass-btn text-emerald-300 text-xs font-semibold flex items-center gap-1">
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleKey('left')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleKey('up')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleKey('down')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleKey('right')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module: Numpad */}
      {module === 'numpad' && (
        <div className="grid grid-cols-4 gap-1 flex-1 overflow-y-auto">
          {['7', '8', '9', '/'].map((k) => (
            <button key={k} onClick={() => handleText(k)} className="h-7 rounded-md glass-btn text-xs font-bold text-slate-200">
              {k}
            </button>
          ))}
          {['4', '5', '6', '*'].map((k) => (
            <button key={k} onClick={() => handleText(k)} className="h-7 rounded-md glass-btn text-xs font-bold text-slate-200">
              {k}
            </button>
          ))}
          {['1', '2', '3', '-'].map((k) => (
            <button key={k} onClick={() => handleText(k)} className="h-7 rounded-md glass-btn text-xs font-bold text-slate-200">
              {k}
            </button>
          ))}
          <button onClick={() => handleText('0')} className="h-7 rounded-md glass-btn text-xs font-bold text-slate-200">0</button>
          <button onClick={() => handleText('.')} className="h-7 rounded-md glass-btn text-xs font-bold text-slate-200">.</button>
          <button onClick={() => handleKey('backspace')} className="h-7 rounded-md glass-btn text-xs font-bold text-rose-300">⌫</button>
          <button onClick={() => handleKey('enter')} className="h-7 rounded-md bg-brand-600 text-xs font-bold text-white">↵</button>
        </div>
      )}
    </aside>
  );
};
/* --- EXTENDED_SECTION_FEATURE_END --- */
