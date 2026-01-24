"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTheme } from "next-themes";

const PerformanceContext = createContext<boolean>(false);

export function usePerformanceMode() {
    return useContext(PerformanceContext);
}

export function PerformanceProvider({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const isPerformanceMode = theme === "performance";

    return (
        <PerformanceContext.Provider value={isPerformanceMode}>
            {children}
        </PerformanceContext.Provider>
    );
}
