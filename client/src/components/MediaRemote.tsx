import React from 'react';
import { InputPacket } from '../types.js';
import { useHaptics } from '../hooks/useHaptics.js';
import {
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sliders,
  Tv,
} from 'lucide-react';

interface MediaRemoteProps {
  sendPacket: (packet: InputPacket) => void;
  hapticsEnabled: boolean;
}

export const MediaRemote: React.FC<MediaRemoteProps> = ({ sendPacket, hapticsEnabled }) => {
  const { triggerHaptic } = useHaptics(hapticsEnabled);

  const handleMedia = (action: 'volume_up' | 'volume_down' | 'mute' | 'play_pause' | 'next' | 'prev') => {
    triggerHaptic('medium');
    sendPacket({ type: 'media', action });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 gap-6 select-none bg-dark-950 items-center justify-between">
      {/* Title */}
      <div className="flex items-center gap-2 text-slate-400 mt-2">
        <Tv className="w-5 h-5 text-brand-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Media & Audio Controller</span>
      </div>

      {/* Primary Play/Pause & Track Navigation Disc */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleMedia('prev')}
            className="w-16 h-16 rounded-full glass-btn flex items-center justify-center text-slate-300 active:text-white"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={() => handleMedia('play_pause')}
            className="w-24 h-24 rounded-full bg-brand-600 active:bg-brand-700 shadow-xl shadow-brand-500/25 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Play className="w-10 h-10 fill-current translate-x-0.5" />
          </button>

          <button
            onClick={() => handleMedia('next')}
            className="w-16 h-16 rounded-full glass-btn flex items-center justify-center text-slate-300 active:text-white"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Volume Control Panel */}
      <div className="w-full max-w-sm glass-panel p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-brand-400" />
            <span>Volume Control</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleMedia('volume_down')}
            className="glass-btn h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-300 active:text-white"
          >
            <Volume1 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Vol -</span>
          </button>

          <button
            onClick={() => handleMedia('mute')}
            className="glass-btn h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-rose-300 active:text-white"
          >
            <VolumeX className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Mute</span>
          </button>

          <button
            onClick={() => handleMedia('volume_up')}
            className="glass-btn h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-emerald-300 active:text-white"
          >
            <Volume2 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Vol +</span>
          </button>
        </div>
      </div>

      {/* Quick Media Keys Footer */}
      <div className="w-full grid grid-cols-2 gap-3 mb-2">
        <button
          onClick={() => {
            triggerHaptic('light');
            sendPacket({ type: 'key', key: 'space' });
          }}
          className="glass-btn h-12 rounded-xl text-xs font-semibold text-slate-300"
        >
          Space (Pause Video)
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            sendPacket({ type: 'key', key: 'f' });
          }}
          className="glass-btn h-12 rounded-xl text-xs font-semibold text-slate-300"
        >
          F (Fullscreen Video)
        </button>
      </div>
    </div>
  );
};
