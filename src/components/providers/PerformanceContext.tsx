"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useTheme } from "next-themes";

const PerformanceContext = createContext<boolean>(false);

export function usePerformanceMode() {
    return useContext(PerformanceContext);
}

export function PerformanceProvider({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Always false during SSR and initial hydration to match server output
    const isPerformanceMode = mounted ? theme === "performance" : false;

    return (
        <PerformanceContext.Provider value={isPerformanceMode}>
            {children}
        </PerformanceContext.Provider>
    );
}
