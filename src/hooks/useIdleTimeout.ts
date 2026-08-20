import { useEffect, useRef, useState } from "react";

export interface UseIdleTimeoutProps {
    onIdle: () => void;
    timeout: number; // in milliseconds
}

export const useIdleTimeout = ({ onIdle, timeout }: UseIdleTimeoutProps) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleActivity = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                onIdle();
            }, timeout);
        };

        // Initial start
        handleActivity();

        // Events to listen for
        const events = [
            "mousemove",
            "mousedown",
            "keydown",
            "touchstart",
            "scroll",
            "click",
        ];

        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
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
