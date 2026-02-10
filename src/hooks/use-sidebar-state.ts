"use client";

import { useState, useCallback, useEffect } from "react";

export type SidebarMode = "normal" | "slim" | "hidden";

const STORAGE_KEY_MODE = "sidebar-mode";
const STORAGE_KEY_WIDTH = "sidebar-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

function syncDomAttribute(mode: SidebarMode) {
    try {
        document.documentElement.dataset.sidebarMode = mode;
    } catch {
        // ignore storage/DOM access issues
    }
}

function setSidebarWidthVar(width: number) {
    try {
        document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
    } catch {
        // ignore storage/DOM access issues
    }
}

function safeGet(key: string) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSet(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // ignore storage access issues
    }
}

export function useSidebarState() {
    const [mode, _setMode] = useState<SidebarMode>("normal");
    const [width, _setWidth] = useState<number>(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const storedMode = safeGet(STORAGE_KEY_MODE);
        if (storedMode === "normal" || storedMode === "slim" || storedMode === "hidden") {
            _setMode(storedMode);
            syncDomAttribute(storedMode);
        }
        const storedWidth = safeGet(STORAGE_KEY_WIDTH);
        if (storedWidth) {
            const parsed = parseInt(storedWidth, 10);
            if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
                _setWidth(parsed);
                setSidebarWidthVar(parsed);
            }
        }
    }, []);

    const setMode = useCallback((newMode: SidebarMode) => {
        _setMode(newMode);
        safeSet(STORAGE_KEY_MODE, newMode);
        syncDomAttribute(newMode);
    }, []);

    const setWidth = useCallback((newWidth: number) => {
        const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        _setWidth(clamped);
        safeSet(STORAGE_KEY_WIDTH, String(clamped));
        setSidebarWidthVar(clamped);
    }, []);

    const cycleMode = useCallback(() => {
        const next: Record<SidebarMode, SidebarMode> = {
            normal: "slim",
            slim: "hidden",
            hidden: "normal",
        };
        _setMode(prev => {
            const newMode = next[prev];
            safeSet(STORAGE_KEY_MODE, newMode);
            syncDomAttribute(newMode);
            return newMode;
        });
    }, []);

    return { mode, setMode, width, setWidth, cycleMode, isResizing, setIsResizing };
}

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH };
