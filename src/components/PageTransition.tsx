"use client";

import { m } from "framer-motion";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { useIsClient } from "@/hooks/use-is-client";

export function PageTransition({ children }: { children: React.ReactNode }) {
    const isPerformanceMode = usePerformanceMode();
    const isClient = useIsClient();

    // During SSR and initial hydration, render a plain div to match server output.
    // This avoids hydration mismatches caused by framer-motion's initial styles.
    if (isPerformanceMode || !isClient) {
        return <div className="flex-1 w-full h-full">{children}</div>;
    }

    return (
        <m.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a "premium" feel
            }}
            className="flex-1 w-full h-full"
        >
            {children}
        </m.div>
    );
}
