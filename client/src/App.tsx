import React, { useState } from 'react';
import { ControlMode } from './types.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { useSettings } from './hooks/useSettings.js';
import { StatusHeader } from './components/StatusHeader.js';
import { Trackpad } from './components/Trackpad.js';
import { KeyboardPad } from './components/KeyboardPad.js';
import { MediaRemote } from './components/MediaRemote.js';
import { Presenter } from './components/Presenter.js';
import { Numpad } from './components/Numpad.js';
import { SettingsModal } from './components/SettingsModal.js';
/* --- EXTENDED_SECTION_FEATURE_START --- */
import { CompanionWidget } from './components/CompanionWidget.js';
/* --- EXTENDED_SECTION_FEATURE_END --- */
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [mode, setMode] = useState<ControlMode>('trackpad');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isConnected, ping, statusMessage, sendPacket, reconnect } = useWebSocket();
  useWakeLock();
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 text-slate-100 font-sans">
      {/* Top Header & Slide-Out Menu */}
      <StatusHeader
        mode={mode}
        setMode={setMode}
        settings={settings}
        updateSetting={updateSetting}
        isConnected={isConnected}
        ping={ping}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Offline Alert Banner */}
      {!isConnected && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 px-3 py-1.5 flex items-center justify-between text-rose-300 text-xs animate-fade-in z-10 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
          <button
            onClick={reconnect}
            className="flex items-center gap-1 font-semibold text-rose-200 active:text-white px-2 py-0.5 rounded bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden relative">
        {mode === 'trackpad' && (
          <div className="flex flex-col landscape:flex-row h-full w-full overflow-hidden">
            {/* Primary Trackpad Area (~75% - 80%) */}
            <div className="flex-1 h-full w-full overflow-hidden">
              <Trackpad settings={settings} sendPacket={sendPacket} />
            </div>

            {/* --- EXTENDED_SECTION_FEATURE_START --- */}
            {/* Optional Companion Split Section (~20% - 25%) */}
            {/* Height comes from the dock itself: the keyboard module is an accordion. */}
            {settings.companionModule !== 'none' && (
              <div className="w-full landscape:h-full landscape:w-80 flex-shrink-0">
                <CompanionWidget
                  module={settings.companionModule}
                  onClose={() => updateSetting('companionModule', 'none')}
                  sendPacket={sendPacket}
                  hapticsEnabled={settings.haptics}
                />
              </div>
            )}
            {/* --- EXTENDED_SECTION_FEATURE_END --- */}
          </div>
        )}

        {mode === 'keyboard' && (
          <KeyboardPad sendPacket={sendPacket} hapticsEnabled={settings.haptics} />
        )}
        {mode === 'media' && (
          <MediaRemote sendPacket={sendPacket} hapticsEnabled={settings.haptics} />
        )}
        {mode === 'presentation' && (
          <Presenter sendPacket={sendPacket} hapticsEnabled={settings.haptics} />
        )}
        {mode === 'numpad' && (
          <Numpad sendPacket={sendPacket} hapticsEnabled={settings.haptics} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
      />
    </div>
  );
};
