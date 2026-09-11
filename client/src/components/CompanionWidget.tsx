/* --- EXTENDED_SECTION_FEATURE_START --- */
import React, { useEffect, useRef, useState } from 'react';
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

  // Accordion + typing state. Local on purpose: the dock is a transient work
  // surface, so nothing here belongs in saved settings.
  const [keyboardOpen, setKeyboardOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** What the PC has already received from this draft, for diffing edits. */
  const sentRef = useRef('');

  // iOS keeps the layout viewport the same size when the soft keyboard opens, so
  // the dock would sit behind it. Lift it by however much of the viewport the
  // keyboard covers; on Android the window resizes and this stays 0.
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

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

  /** Start a fresh draft; the PC keeps whatever was already sent. */
  const resetDraft = () => {
    sentRef.current = '';
    setDraft('');
  };

  /**
   * The phone's own keyboard edits this field, and every edit is forwarded as it
   * happens: shared prefix stays, the rest is backspaced and retyped. That also
   * covers autocorrect and predictive text, which rewrite whole words at once.
   */
  const handleDraftChange = (next: string) => {
    const sent = sentRef.current;

    let shared = 0;
    while (shared < sent.length && shared < next.length && sent[shared] === next[shared]) {
      shared += 1;
    }

    const removals = sent.length - shared;
    const addition = next.slice(shared);

    for (let i = 0; i < removals; i += 1) sendPacket({ type: 'key', key: 'backspace' });
    if (addition) sendPacket({ type: 'text', text: addition });
    if (removals > 0 || addition) triggerHaptic('light');

    sentRef.current = next;
    setDraft(next);
  };

  /** The phone's Go / Enter key. */
  const handleDraftSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    triggerHaptic('medium');
    sendPacket({ type: 'key', key: 'enter' });
    resetDraft();
  };

  /** Backspace from the dock, kept in step with the draft. */
  const handleBackspace = () => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key: 'backspace' });
    sentRef.current = sentRef.current.slice(0, -1);
    setDraft((text) => text.slice(0, -1));
  };

  /** Arrows move the PC caret away from the draft, so the diff has to restart. */
  const handleCaretKey = (key: string) => {
    handleKey(key);
    resetDraft();
  };

  /**
   * Expanding focuses the field, which is what summons the phone's keyboard —
   * it has to happen inside the tap, so the input stays mounted while collapsed.
   */
  const toggleKeyboard = () => {
    triggerHaptic('selection');
    if (keyboardOpen) {
      inputRef.current?.blur();
      setKeyboardOpen(false);
      return;
    }
    setKeyboardOpen(true);
    inputRef.current?.focus();
  };

  return (
    <aside
      style={isKeyboard && keyboardInset > 0 ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
      className={`relative flex flex-col bg-dark-900/95 border-t landscape:border-t-0 landscape:border-l border-white/10 p-2 select-none overflow-hidden transition-all w-full landscape:h-full ${
        collapsed ? 'h-14' : isKeyboard ? 'h-auto max-h-[75vh]' : 'h-44'
      }`}
    >
      {/* Mini Title & Close Bar — the title doubles as the keyboard accordion */}
      <div
        className={`flex items-center justify-between px-1 ${
          collapsed ? '' : 'pb-1.5 mb-1.5 border-b border-white/5'
        }`}
      >
        {isKeyboard ? (
          <form onSubmit={handleDraftSubmit} className="flex flex-1 items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={toggleKeyboard}
              className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-slate-400 active:bg-white/10 active:text-white"
              title={keyboardOpen ? 'Minimize keyboard' : 'Expand keyboard'}
            >
              {keyboardOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {/* Tapping this is what raises the phone's own keyboard. */}
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onFocus={() => setKeyboardOpen(true)}
              enterKeyHint="enter"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Tap to type — keys go straight to the PC"
              aria-label="Send keystrokes to the PC"
              className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-dark-850 border border-white/10 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </form>
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

      {/* Module: Keyboard — the phone's own keyboard types into the field above */}
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
              <button
                onClick={handleBackspace}
                className="h-8 px-2.5 rounded-lg glass-btn text-rose-300 text-xs font-semibold flex items-center gap-1"
                title="Backspace"
              >
                <Delete className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  handleKey('enter');
                  resetDraft();
                }}
                className="h-8 px-2.5 rounded-lg glass-btn text-emerald-300 text-xs font-semibold flex items-center gap-1"
                title="Enter"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Arrows — these move the PC caret, so each one restarts the draft */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleCaretKey('left')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleCaretKey('up')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleCaretKey('down')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleCaretKey('right')} className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300">
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
