
import React, { useEffect, useCallback, useRef } from "react";

export function useSyncLock(isOnline: boolean, tabIdRef: React.MutableRefObject<string>) {
    const SYNC_LOCK_KEY = "todo-gemini-sync-lock";
    const SYNC_LOCK_TTL_MS = 10000;
    const lockIntervalRef = useRef<number | null>(null);

    const readSyncLock = useCallback((): { owner: string; expiresAt: number } | null => {
        const raw = localStorage.getItem(SYNC_LOCK_KEY);
        if (!raw || raw.startsWith("{")) {
            // Legacy JSON format is ignored and replaced with the compact format.
            return null;
        }

        const separator = raw.lastIndexOf(":");
        if (separator <= 0) return null;

        const owner = raw.slice(0, separator);
        const expiresAt = Number(raw.slice(separator + 1));
        if (!owner || !Number.isFinite(expiresAt)) return null;

        return { owner, expiresAt };
    }, [SYNC_LOCK_KEY]);

    const writeSyncLock = useCallback((owner: string, expiresAt: number) => {
        localStorage.setItem(SYNC_LOCK_KEY, `${owner}:${expiresAt}`);
    }, [SYNC_LOCK_KEY]);

    const ensureSyncLock = useCallback(() => {
        const now = Date.now();
        const current = readSyncLock();
        const owner = tabIdRef.current;
        if (!current || current.expiresAt < now || current.owner === owner) {
            writeSyncLock(owner, now + SYNC_LOCK_TTL_MS);
            return true;
        }
        return current.owner === owner;
    }, [readSyncLock, writeSyncLock, SYNC_LOCK_TTL_MS, tabIdRef]);

    const releaseLock = useCallback(() => {
        const current = readSyncLock();
        if (current?.owner === tabIdRef.current) {
            localStorage.removeItem(SYNC_LOCK_KEY);
        }
    }, [readSyncLock, tabIdRef, SYNC_LOCK_KEY]);

    useEffect(() => {
        if (!isOnline) {
            if (lockIntervalRef.current !== null) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
            return;
        }

        const ownerId = tabIdRef.current;

        const refreshLock = () => {
            const now = Date.now();
            const current = readSyncLock();
            if (!current || current.expiresAt < now || current.owner === ownerId) {
                writeSyncLock(ownerId, now + SYNC_LOCK_TTL_MS);
            }
        };

        refreshLock();

        lockIntervalRef.current = window.setInterval(refreshLock, Math.floor(SYNC_LOCK_TTL_MS / 2));

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                refreshLock();
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === SYNC_LOCK_KEY) {
                refreshLock();
            }
        };

        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("storage", handleStorage);

        return () => {
            if (lockIntervalRef.current !== null) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("storage", handleStorage);
            releaseLock();
        };
    }, [isOnline, readSyncLock, writeSyncLock, SYNC_LOCK_TTL_MS, releaseLock, SYNC_LOCK_KEY, tabIdRef]);

    return { ensureSyncLock, readSyncLock, releaseLock };
}
