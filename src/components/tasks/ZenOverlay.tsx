"use client";

import { useZenMode } from "../providers/ZenModeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function ZenOverlay({ children }: { children: React.ReactNode }) {
    const { isZenMode, toggleZenMode } = useZenMode();

    return (
        <AnimatePresence>
            {isZenMode && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden"
                >
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                    {/* Header Controls */}
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleZenMode}
                            className="rounded-full"
                            title="Exit Zen Mode (Esc)"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="absolute top-6 left-6 hidden md:block">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Zen Mode Active
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="w-full max-w-4xl flex-1 flex flex-col min-h-0 bg-card/30 backdrop-blur-xl border rounded-3xl shadow-2xl relative z-10 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                            {children}
                        </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="mt-8 text-xs text-muted-foreground text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
                        Press <kbd className="font-mono bg-muted px-1.5 rounded">Esc</kbd> or <kbd className="font-mono bg-muted px-1.5 rounded">⌘ Z</kbd> to exit
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
