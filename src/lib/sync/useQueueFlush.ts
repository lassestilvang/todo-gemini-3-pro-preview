
import React, { useEffect, useCallback, useRef } from "react";
import { PendingAction } from "./types";
import { addToQueueBatch } from "./db";

type IdleWindow = Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
};

export function useQueueFlush(params: {
    setPendingActions: React.Dispatch<React.SetStateAction<PendingAction[]>>;
    flushActionsRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
    maxPendingQueue: number;
    flushIdleTimeoutMs: number;
}) {
    const { setPendingActions, flushActionsRef, maxPendingQueue, flushIdleTimeoutMs } = params;
    const pendingQueueRef = useRef<PendingAction[]>([]);
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flushIdleRef = useRef<number | null>(null);

    const flushQueuedActions = useCallback(async () => {
        const queued = pendingQueueRef.current;
        if (queued.length === 0) return;
        pendingQueueRef.current = [];

        if (flushTimerRef.current !== null) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
        const idleWindow = window as IdleWindow;
        if (flushIdleRef.current !== null && idleWindow.cancelIdleCallback) {
            idleWindow.cancelIdleCallback(flushIdleRef.current);
            flushIdleRef.current = null;
        }

        await addToQueueBatch(queued);
        setPendingActions(prev => [...prev, ...queued]);
    }, [setPendingActions]);

    useEffect(() => {
        flushActionsRef.current = flushQueuedActions;
    }, [flushActionsRef, flushQueuedActions]);

    const scheduleFlush = useCallback(() => {
        if (pendingQueueRef.current.length >= maxPendingQueue) {
            void flushQueuedActions();
            return;
        }

        if (flushTimerRef.current !== null || flushIdleRef.current !== null) return;

        const idleWindow = window as IdleWindow;
        if (idleWindow.requestIdleCallback) {
            flushIdleRef.current = idleWindow.requestIdleCallback(() => {
                flushIdleRef.current = null;
                void flushQueuedActions();
            }, { timeout: flushIdleTimeoutMs });
            return;
        }

        flushTimerRef.current = setTimeout(async () => {
            flushTimerRef.current = null;
            await flushQueuedActions();
        }, 50);
    }, [flushQueuedActions, maxPendingQueue, flushIdleTimeoutMs, pendingQueueRef]);

    return { pendingQueueRef, flushQueuedActions, scheduleFlush };
}
