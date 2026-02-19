"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTheme } from "next-themes";
import { useIsClient } from "@/hooks/use-is-client";

const PerformanceContext = createContext<boolean>(false);

export function usePerformanceMode() {
    return useContext(PerformanceContext);
}

export function PerformanceProvider({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const isClient = useIsClient();

    // Always false during SSR and initial hydration to match server output
    const isPerformanceMode = isClient ? (theme === "performance" || theme === "performance-dark") : false;

    return (
        <PerformanceContext.Provider value={isPerformanceMode}>
            {children}
        </PerformanceContext.Provider>
    );
}
