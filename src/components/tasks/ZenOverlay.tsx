"use client";

import { useZenMode } from "../providers/ZenModeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Timer, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { PomodoroTimer } from "./PomodoroTimer";
import { cn } from "@/lib/utils";

export function ZenOverlay({ children }: { children: React.ReactNode }) {
    const { isZenMode, toggleZenMode } = useZenMode();
    const [timerOpen, setTimerOpen] = useState(false);

    return (
        <AnimatePresence>
            {isZenMode && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 md:p-12 overflow-hidden"
                >
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                    {/* Header Controls */}
                    <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTimerOpen(!timerOpen)}
                            className={cn("rounded-full transition-colors", timerOpen && "bg-muted")}
                            title="Toggle Pomodoro Timer"
                        >
                            <Timer className="h-5 w-5" />
                        </Button>
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

                    <div className="flex w-full max-w-6xl h-full gap-6 relative z-10 transition-all duration-500">
                        {/* Content Area */}
                        <div className={cn(
                            "flex-1 flex flex-col min-h-0 bg-card/30 backdrop-blur-xl border rounded-3xl shadow-2xl overflow-hidden transition-all duration-500",
                            timerOpen ? "md:mr-0" : ""
                        )}>
                            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                                {children}
                            </div>
                        </div>

                        {/* Pomodoro Timer Panel */}
                        <AnimatePresence>
                            {timerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, width: 0 }}
                                    animate={{ opacity: 1, x: 0, width: "320px" }}
                                    exit={{ opacity: 0, x: 20, width: 0 }}
                                    className="hidden md:flex flex-col bg-card/50 backdrop-blur-2xl border rounded-3xl shadow-xl overflow-hidden shrink-0"
                                >
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-indigo-500" />
                                            Pomodoro
                                        </h3>
                                        <Button variant="ghost" size="icon" onClick={() => setTimerOpen(false)} className="h-8 w-8 rounded-full">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <PomodoroTimer />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Timer Overlay */}
                    <AnimatePresence>
                        {timerOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                className="md:hidden fixed inset-x-4 bottom-20 bg-card/90 backdrop-blur-3xl border rounded-3xl shadow-2xl p-4 z-40"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Timer</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setTimerOpen(false)}>Close</Button>
                                </div>
                                <PomodoroTimer />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Tip */}
                    <div className="fixed bottom-8 inset-x-0 text-xs text-muted-foreground text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
                        Press <kbd className="font-mono bg-muted px-1.5 rounded">Esc</kbd> or <kbd className="font-mono bg-muted px-1.5 rounded">⌘ Z</kbd> to exit
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
