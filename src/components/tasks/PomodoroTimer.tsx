"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";

const MODES: Record<TimerMode, { label: string; duration: number; icon: React.ReactNode }> = {
    pomodoro: { label: "Focus", duration: 25 * 60, icon: <Brain className="h-4 w-4" /> },
    shortBreak: { label: "Short Break", duration: 5 * 60, icon: <Coffee className="h-4 w-4" /> },
    longBreak: { label: "Long Break", duration: 15 * 60, icon: <Timer className="h-4 w-4" /> },
};

export function PomodoroTimer() {
    const [mode, setMode] = useState<TimerMode>("pomodoro");
    const [timeLeft, setTimeLeft] = useState(MODES.pomodoro.duration);
    const [isActive, setIsActive] = useState(false);

    const resetTimer = useCallback(() => {
        setIsActive(false);
        setTimeLeft(MODES[mode].duration);
    }, [mode]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play sound or show notification
            if (typeof window !== "undefined") {
                const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
                audio.play().catch(() => { });
            }
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    useEffect(() => {
        resetTimer();
    }, [mode, resetTimer]);

    const toggleTimer = () => setIsActive(!isActive);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const progress = (1 - timeLeft / MODES[mode].duration) * 100;

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="flex bg-muted/50 p-1 rounded-full border">
                {(Object.keys(MODES) as TimerMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            mode === m
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {MODES[m].icon}
                        <span className="hidden sm:inline">{MODES[m].label}</span>
                    </button>
                ))}
            </div>

            <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 -rotate-90">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-muted/20"
                    />
                    <motion.circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={753.98} // 2 * pi * 120
                        initial={{ strokeDashoffset: 753.98 }}
                        animate={{ strokeDashoffset: 753.98 * (1 - progress / 100) }}
                        className={cn(
                            "transition-colors duration-500",
                            mode === "pomodoro" ? "text-indigo-500" : "text-emerald-500"
                        )}
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-6xl font-bold tracking-tighter tabular-nums">
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2">
                        {MODES[mode].label}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={resetTimer}
                    className="rounded-full h-12 w-12"
                >
                    <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    onClick={toggleTimer}
                    className={cn(
                        "rounded-full h-16 w-16 shadow-lg",
                        isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                >
                    {isActive ? (
                        <Pause className="h-8 w-8 text-white" />
                    ) : (
                        <Play className="h-8 w-8 text-white ml-1" />
                    )}
                </Button>
                <div className="w-12" /> {/* Spacer */}
            </div>
        </div>
    );
}
