import { useState, useEffect } from 'react';
import { AppSettings } from '../types.js';

const STORAGE_KEY = 'mpad_settings_v2';

const defaultSettings: AppSettings = {
  sensitivity: 1.35,
  acceleration: 1.3,
  scrollSpeed: 1.2,
  invertScroll: false,
  haptics: true,
  showPhysicalButtons: false,
  leftHanded: false,
  threeFingerGestures: true,
  horizontalSwipeAction: 'apps',
  /* --- EXTENDED_SECTION_FEATURE_START --- */
  companionModule: 'none',
  /* --- EXTENDED_SECTION_FEATURE_END --- */
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return { settings, updateSetting, resetSettings };
}
