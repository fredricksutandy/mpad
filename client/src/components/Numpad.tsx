import React from 'react';
import { InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { Delete, CornerDownLeft, Hash } from 'lucide-react';

interface NumpadProps {
  sendPacket: (packet: InputPacket) => void;
  hapticsEnabled: boolean;
}

export const Numpad: React.FC<NumpadProps> = ({ sendPacket, hapticsEnabled }) => {
  const { triggerHaptic } = useHaptics(hapticsEnabled);

  const handleKey = (key: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key });
  };

  const handleText = (text: string) => {
    triggerHaptic('light');
    sendPacket({ type: 'text', text });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4 select-none bg-dark-950 items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400 mt-1">
        <Hash className="w-5 h-5 text-brand-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Numeric Keypad</span>
      </div>

      <div className="grid grid-cols-4 gap-3 w-full max-w-sm flex-1">
        {/* Row 1 */}
        <button
          onClick={() => handleKey('backspace')}
          className="glass-btn rounded-2xl flex items-center justify-center text-rose-300 active:text-white"
        >
          <Delete className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleText('/')}
          className="glass-btn rounded-2xl flex items-center justify-center text-lg font-bold text-slate-300"
        >
          /
        </button>
        <button
          onClick={() => handleText('*')}
          className="glass-btn rounded-2xl flex items-center justify-center text-lg font-bold text-slate-300"
        >
          *
        </button>
        <button
          onClick={() => handleText('-')}
          className="glass-btn rounded-2xl flex items-center justify-center text-lg font-bold text-slate-300"
        >
          -
        </button>

        {/* Row 2 */}
        <button
          onClick={() => handleText('7')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          7
        </button>
        <button
          onClick={() => handleText('8')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          8
        </button>
        <button
          onClick={() => handleText('9')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          9
        </button>
        <button
          onClick={() => handleText('+')}
          className="glass-btn rounded-2xl flex items-center justify-center text-lg font-bold text-slate-300"
        >
          +
        </button>

        {/* Row 3 */}
        <button
          onClick={() => handleText('4')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          4
        </button>
        <button
          onClick={() => handleText('5')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          5
        </button>
        <button
          onClick={() => handleText('6')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          6
        </button>
        <button
          onClick={() => handleKey('tab')}
          className="glass-btn rounded-2xl flex items-center justify-center text-sm font-semibold text-slate-300"
        >
          Tab
        </button>

        {/* Row 4 */}
        <button
          onClick={() => handleText('1')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          1
        </button>
        <button
          onClick={() => handleText('2')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          2
        </button>
        <button
          onClick={() => handleText('3')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          3
        </button>
        <button
          onClick={() => handleKey('enter')}
          className="row-span-2 bg-brand-600 active:bg-brand-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20"
        >
          <CornerDownLeft className="w-6 h-6" />
        </button>

        {/* Row 5 */}
        <button
          onClick={() => handleText('0')}
          className="col-span-2 glass-btn rounded-2xl flex items-center justify-center text-2xl font-semibold text-white"
        >
          0
        </button>
        <button
          onClick={() => handleText('.')}
          className="glass-btn rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
        >
          .
        </button>
      </div>
    </div>
  );
};
