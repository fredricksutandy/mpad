import React, { useState, useRef } from 'react';
import { InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import {
  Send,
  Delete,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Globe,
  Scissors,
  Copy,
  Clipboard,
  Undo,
  Redo,
} from 'lucide-react';

interface KeyboardPadProps {
  sendPacket: (packet: InputPacket) => void;
  hapticsEnabled: boolean;
}

export const KeyboardPad: React.FC<KeyboardPadProps> = ({ sendPacket, hapticsEnabled }) => {
  const { triggerHaptic } = useHaptics(hapticsEnabled);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText) return;

    triggerHaptic('light');
    sendPacket({ type: 'text', text: inputText });
    setInputText('');
  };

  const handleKey = (key: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key });
  };

  const handleShortcut = (keys: string) => {
    triggerHaptic('medium');
    sendPacket({ type: 'shortcut', keys });
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full w-full p-3 gap-3 overflow-y-auto select-none bg-dark-950">
      {/* Live Text Input Bar */}
      <form onSubmit={handleSendText} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type text to send to PC..."
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-dark-850 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
          />
          <Keyboard className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="h-12 px-4 rounded-xl bg-brand-600 active:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none text-white font-medium flex items-center justify-center transition-all shadow-lg shadow-brand-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Action Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Essential Actions</span>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleKey('backspace')}
            className="glass-btn h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-300"
          >
            <Delete className="w-4 h-4" />
            <span>Bksp</span>
          </button>

          <button
            onClick={() => handleKey('enter')}
            className="glass-btn h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300"
          >
            <CornerDownLeft className="w-4 h-4" />
            <span>Enter</span>
          </button>

          <button
            onClick={() => handleKey('tab')}
            className="glass-btn h-12 rounded-xl flex items-center justify-center text-xs font-semibold text-slate-300"
          >
            Tab
          </button>

          <button
            onClick={() => handleKey('esc')}
            className="glass-btn h-12 rounded-xl flex items-center justify-center text-xs font-semibold text-amber-300"
          >
            Esc
          </button>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Productivity Hotkeys</span>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleShortcut('ctrl+a')}
            className="glass-btn h-11 rounded-xl text-xs font-medium text-slate-300"
          >
            Select All
          </button>

          <button
            onClick={() => handleShortcut('ctrl+c')}
            className="glass-btn h-11 rounded-xl flex items-center justify-center gap-1 text-xs font-medium text-slate-300"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>

          <button
            onClick={() => handleShortcut('ctrl+v')}
            className="glass-btn h-11 rounded-xl flex items-center justify-center gap-1 text-xs font-medium text-slate-300"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <button
            onClick={() => handleShortcut('ctrl+x')}
            className="glass-btn h-11 rounded-xl flex items-center justify-center gap-1 text-xs font-medium text-slate-300"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Cut</span>
          </button>

          <button
            onClick={() => handleShortcut('ctrl+z')}
            className="glass-btn h-11 rounded-xl flex items-center justify-center gap-1 text-xs font-medium text-slate-300"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={() => handleShortcut('ctrl+y')}
            className="glass-btn h-11 rounded-xl flex items-center justify-center gap-1 text-xs font-medium text-slate-300"
          >
            <Redo className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>

          <button
            onClick={() => handleShortcut('win+d')}
            className="glass-btn h-11 rounded-xl text-xs font-medium text-indigo-300"
          >
            Win + D
          </button>

          <button
            onClick={() => handleShortcut('alt+tab')}
            className="glass-btn h-11 rounded-xl text-xs font-medium text-indigo-300"
          >
            Alt + Tab
          </button>
        </div>
      </div>

      {/* Directional Arrow Keys Pad */}
      <div className="flex flex-col gap-2 mt-auto">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Navigation Pad</span>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => handleKey('up')}
            className="glass-btn w-24 h-12 rounded-xl flex items-center justify-center text-slate-200"
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleKey('left')}
              className="glass-btn w-24 h-12 rounded-xl flex items-center justify-center text-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleKey('down')}
              className="glass-btn w-24 h-12 rounded-xl flex items-center justify-center text-slate-200"
            >
              <ArrowDown className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleKey('right')}
              className="glass-btn w-24 h-12 rounded-xl flex items-center justify-center text-slate-200"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
