"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ZenModeContextType {
    isZenMode: boolean;
    toggleZenMode: () => void;
    setZenMode: (isZen: boolean) => void;
}

const ZenModeContext = createContext<ZenModeContextType | undefined>(undefined);

export function ZenModeProvider({ children }: { children: React.ReactNode }) {
    const [isZenMode, setIsZenMode] = useState(false);

    const toggleZenMode = () => setIsZenMode((prev) => !prev);
    const setZenMode = (isZen: boolean) => setIsZenMode(isZen);

    // Escape key to exit Zen Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isZenMode) {
                setIsZenMode(false);
            }
            if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsZenMode((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isZenMode]);

    return (
        <ZenModeContext.Provider value={{ isZenMode, toggleZenMode, setZenMode }}>
            {children}
        </ZenModeContext.Provider>
    );
}

export function useZenMode() {
    const context = useContext(ZenModeContext);
    if (context === undefined) {
        // Return fallback to prevent crash if used outside provider
        return {
            isZenMode: false,
            toggleZenMode: () => { },
            setZenMode: () => { }
        };
    }
    return context;
}
