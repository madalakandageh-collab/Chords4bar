import { useEffect, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

export function useWakeLock(enabled: boolean) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsActive(false);
      return;
    }

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const requestLock = async () => {
      try {
        const nav = navigator as unknown as {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        };
        if (nav.wakeLock && !cancelled) {
          sentinel = await nav.wakeLock.request('screen');
          if (!cancelled) {
            setIsActive(true);
            sentinel.addEventListener?.('release', () => {
              if (!cancelled) setIsActive(false);
            });
          } else {
            await sentinel.release();
          }
        }
      } catch {
        if (!cancelled) setIsActive(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {});
      }
      setIsActive(false);
    };
  }, [enabled]);

  return isActive;
}
