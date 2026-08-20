import { useEffect, useRef } from "react";

export interface UseIdleTimeoutProps {
  onIdle: () => void;
  timeout: number; // in milliseconds
}

export const useIdleTimeout = ({ onIdle, timeout }: UseIdleTimeoutProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onIdle();
      }, timeout);
    };

    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity checks to max once per 1000ms
      if (now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    // Initial timer setup
    resetTimer();

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onIdle, timeout]);
};
