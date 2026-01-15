"use client";

import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
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
        </motion.div>
    );
}
