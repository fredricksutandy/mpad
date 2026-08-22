import { useCallback } from 'react';

export function useHaptics(enabled: boolean = true) {
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
      if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
        return;
      }

      try {
        switch (type) {
          case 'selection':
          case 'light':
            navigator.vibrate(8);
            break;
          case 'medium':
            navigator.vibrate(18);
            break;
          case 'heavy':
            navigator.vibrate([25, 10, 25]);
            break;
        }
      } catch {
        // Ignore haptic failures
      }
    },
    [enabled]
  );

  return { triggerHaptic };
}
