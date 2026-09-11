/* --- EXTENDED_SECTION_FEATURE_START --- */
import React, { useRef, useState } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * On-screen key rows for the companion keyboard. Row 3 is always
 * [modifier][7 keys][backspace] so both layers keep the same silhouette.
 */
const LETTER_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const SYMBOL_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['!', '@', '#', '$', '%', '&', '*', '(', ')'],
  ['~', '-', '_', '=', '+', '/', ':', ';'],
];

/** Sticky-shift states, mirroring a phone keyboard: one-shot, then locked. */
type ShiftState = 'off' | 'once' | 'lock';

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

  // Accordion + keyboard state. Local on purpose: the dock is a transient work
  // surface, so nothing here belongs in saved settings.
  const [keyboardOpen, setKeyboardOpen] = useState(true);
  const [shift, setShift] = useState<ShiftState>('off');
  const [symbols, setSymbols] = useState(false);
  const lastShiftTapRef = useRef(0);

  if (module === 'none') return null;

  const isKeyboard = module === 'keyboard';
  const collapsed = isKeyboard && !keyboardOpen;

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

  const handleCharKey = (char: string) => {
    const upper = char.toUpperCase();
    const hasCase = upper !== char;

    triggerHaptic('light');
    sendPacket({ type: 'text', text: shift !== 'off' && hasCase ? upper : char });
    if (shift === 'once' && hasCase) setShift('off');
  };

  /** Tap for a one-shot capital, double-tap to lock caps. */
  const handleShiftKey = () => {
    triggerHaptic('selection');
    const now = performance.now();
    const isDoubleTap = now - lastShiftTapRef.current < 400;
    lastShiftTapRef.current = now;

    if (isDoubleTap) {
      setShift('lock');
      return;
    }
    setShift((prev) => (prev === 'off' ? 'once' : 'off'));
  };

  const toggleKeyboard = () => {
    triggerHaptic('selection');
    setKeyboardOpen((open) => !open);
  };

  const keyClass = (extra = '') =>
    `h-9 flex-1 min-w-0 rounded-md glass-btn flex items-center justify-center text-[13px] font-medium text-slate-200 ${extra}`;

  /** Keys fire on pointerdown: typing should feel immediate, like the trackpad. */
  const pressHandler = (action: () => void) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    action();
  };

  return (
    <aside
      className={`relative flex flex-col bg-dark-900/95 border-t landscape:border-t-0 landscape:border-l border-white/10 p-2 select-none overflow-hidden transition-all w-full landscape:h-full ${
        collapsed ? 'h-11' : isKeyboard ? 'h-auto max-h-[75vh]' : 'h-44'
      }`}
    >
      {/* Mini Title & Close Bar — the title doubles as the keyboard accordion */}
      <div
        className={`flex items-center justify-between px-1 ${
          collapsed ? '' : 'pb-1.5 mb-1.5 border-b border-white/5'
        }`}
      >
        {isKeyboard ? (
          <button
            onClick={toggleKeyboard}
            className="flex flex-1 items-center gap-1.5 text-left text-slate-400 active:text-white"
            title={keyboardOpen ? 'Minimize keyboard' : 'Expand keyboard'}
          >
            {keyboardOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">⌨️ Keyboard & Hotkeys</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {module === 'media' && '🎵 Quick Media Dock'}
            {module === 'presentation' && '📊 Quick Slide Clicker'}
            {module === 'numpad' && '🔢 Quick Numpad'}
          </span>
        )}
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full glass-btn flex items-center justify-center text-slate-400 hover:text-white flex-shrink-0"
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

      {/* Module: Keyboard — hotkeys, arrows, and the full QWERTY */}
      {isKeyboard && keyboardOpen && (
        <div className="flex flex-col flex-1 min-h-0 gap-1.5 overflow-y-auto">
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

          {/* Full QWERTY — the reason the dock needs an accordion */}
          <div className="flex flex-col gap-1 pt-1.5 border-t border-white/5">
            {(symbols ? SYMBOL_ROWS : LETTER_ROWS).slice(0, 2).map((row, rowIndex) => (
              <div key={row.join('')} className={`flex gap-1 ${rowIndex === 1 ? 'px-[4%]' : ''}`}>
                {row.map((char) => (
                  <button
                    key={char}
                    onPointerDown={pressHandler(() => handleCharKey(char))}
                    className={keyClass()}
                  >
                    {shift === 'off' ? char : char.toUpperCase()}
                  </button>
                ))}
              </div>
            ))}

            <div className="flex gap-1">
              {!symbols && (
                <button
                  onPointerDown={pressHandler(handleShiftKey)}
                  className={keyClass(
                    shift === 'lock'
                      ? 'bg-brand-600 text-white'
                      : shift === 'once'
                        ? 'bg-brand-600/40 text-white'
                        : 'text-slate-400'
                  )}
                  title={shift === 'lock' ? 'Caps locked — tap to release' : 'Shift — double-tap to lock'}
                >
                  {shift === 'lock' ? '⇪' : '⇧'}
                </button>
              )}
              {(symbols ? SYMBOL_ROWS : LETTER_ROWS)[2].map((char) => (
                <button
                  key={char}
                  onPointerDown={pressHandler(() => handleCharKey(char))}
                  className={keyClass()}
                >
                  {shift === 'off' ? char : char.toUpperCase()}
                </button>
              ))}
              <button
                onPointerDown={pressHandler(() => handleKey('backspace'))}
                className={keyClass('text-rose-300')}
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1">
              <button
                onPointerDown={pressHandler(() => {
                  triggerHaptic('selection');
                  setSymbols((on) => !on);
                })}
                className={keyClass('flex-[1.4] text-[11px] font-bold text-brand-300')}
              >
                {symbols ? 'ABC' : '?123'}
              </button>
              <button onPointerDown={pressHandler(() => handleCharKey(','))} className={keyClass()}>
                ,
              </button>
              <button
                onPointerDown={pressHandler(() => handleCharKey(' '))}
                className={keyClass('flex-[4] text-[10px] uppercase tracking-wider text-slate-500')}
              >
                space
              </button>
              <button onPointerDown={pressHandler(() => handleCharKey('.'))} className={keyClass()}>
                .
              </button>
              <button
                onPointerDown={pressHandler(() => handleKey('enter'))}
                className={keyClass('flex-[1.4] bg-brand-600/80 text-white')}
                title="Enter"
              >
                <CornerDownLeft className="w-4 h-4" />
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
