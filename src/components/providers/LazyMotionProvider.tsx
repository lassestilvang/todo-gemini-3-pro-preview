"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * LazyMotion provider that loads animation features asynchronously.
 * This reduces initial bundle size by ~40KB by lazy-loading framer-motion features.
 */
export function LazyMotionProvider({ children }: { children: React.ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}
