import React, { useState, useEffect } from 'react';
import { InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import {
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Presentation,
  Tv,
  XCircle,
  EyeOff,
  Sun,
} from 'lucide-react';

interface PresenterProps {
  sendPacket: (packet: InputPacket) => void;
  hapticsEnabled: boolean;
}

export const Presenter: React.FC<PresenterProps> = ({ sendPacket, hapticsEnabled }) => {
  const { triggerHaptic } = useHaptics(hapticsEnabled);

  // Stopwatch state for presentations
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: number | null = null;
    if (timerRunning) {
      interval = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    triggerHaptic('medium');
    sendPacket({ type: 'key', key: 'right' });
  };

  const handlePrev = () => {
    triggerHaptic('medium');
    sendPacket({ type: 'key', key: 'left' });
  };

  const handleStartPresentation = () => {
    triggerHaptic('heavy');
    sendPacket({ type: 'key', key: 'f5' });
    if (!timerRunning) setTimerRunning(true);
  };

  const handleExit = () => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key: 'esc' });
  };

  const handleBlackout = () => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key: 'b' });
  };

  const handleWhiteout = () => {
    triggerHaptic('light');
    sendPacket({ type: 'key', key: 'w' });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4 select-none bg-dark-950 items-center justify-between">
      {/* Header & Stopwatch */}
      <div className="w-full flex items-center justify-between glass-panel px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <Presentation className="w-5 h-5 text-brand-400" />
          <span className="text-xs font-semibold text-slate-300">Slide Clicker</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-brand-300">{formatTime(seconds)}</span>
          <button
            onClick={() => {
              triggerHaptic('light');
              setTimerRunning(!timerRunning);
            }}
            className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-300"
          >
            {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setSeconds(0);
              setTimerRunning(false);
            }}
            className="w-8 h-8 rounded-lg glass-btn flex items-center justify-center text-slate-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Slide Navigation Buttons */}
      <div className="flex flex-col w-full flex-1 gap-4 my-2">
        {/* Next Slide (Primary / Huge) */}
        <button
          onClick={handleNext}
          className="flex-1 w-full rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 active:from-brand-700 active:to-indigo-700 shadow-xl shadow-brand-500/20 flex flex-col items-center justify-center gap-2 text-white active:scale-[0.98] transition-transform"
        >
          <ChevronRight className="w-16 h-16 stroke-[2.5]" />
          <span className="text-lg font-bold tracking-wide">NEXT SLIDE</span>
        </button>

        {/* Previous Slide */}
        <button
          onClick={handlePrev}
          className="h-24 w-full rounded-2xl glass-btn flex items-center justify-center gap-3 text-slate-200 active:text-white"
        >
          <ChevronLeft className="w-8 h-8" />
          <span className="text-base font-semibold">PREVIOUS</span>
        </button>
      </div>

      {/* Secondary Controls (F5, Esc, Blank, White) */}
      <div className="grid grid-cols-4 w-full gap-2">
        <button
          onClick={handleStartPresentation}
          className="glass-btn h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-emerald-300"
        >
          <Tv className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Start (F5)</span>
        </button>

        <button
          onClick={handleExit}
          className="glass-btn h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-rose-300"
        >
          <XCircle className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Exit (Esc)</span>
        </button>

        <button
          onClick={handleBlackout}
          className="glass-btn h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-400"
        >
          <EyeOff className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Black (B)</span>
        </button>

        <button
          onClick={handleWhiteout}
          className="glass-btn h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-400"
        >
          <Sun className="w-4 h-4" />
          <span className="text-[10px] font-semibold">White (W)</span>
        </button>
      </div>
    </div>
  );
};
