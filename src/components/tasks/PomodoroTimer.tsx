"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { toast } from "sonner";

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";

const MODES: Record<TimerMode, { label: string; duration: number; icon: React.ReactNode }> = {
    pomodoro: { label: "Focus", duration: 25 * 60, icon: <Brain className="h-4 w-4" /> },
    shortBreak: { label: "Short Break", duration: 5 * 60, icon: <Coffee className="h-4 w-4" /> },
    longBreak: { label: "Long Break", duration: 15 * 60, icon: <Timer className="h-4 w-4" /> },
};

export function PomodoroTimer() {
    const isPerformanceMode = usePerformanceMode();
    const [mode, setMode] = useState<TimerMode>("pomodoro");
    const [timeLeft, setTimeLeft] = useState(MODES.pomodoro.duration);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (!isActive || timeLeft <= 0) {
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;
                return next < 0 ? 0 : next;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    useEffect(() => {
        if (isActive && timeLeft === 0) {
            setTimeout(() => setIsActive(false), 0);
            if (typeof window !== "undefined") {
                const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
                audio.play().catch(() => { });
                toast.success(`${MODES[mode].label} complete!`);
            }
        }
    }, [isActive, timeLeft, mode]);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(MODES[mode].duration);
    };

    const handleModeChange = (nextMode: TimerMode) => {
        setMode(nextMode);
        setIsActive(false);
        setTimeLeft(MODES[nextMode].duration);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const progress = (1 - timeLeft / MODES[mode].duration) * 100;

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div
                className="flex bg-muted/50 p-1 rounded-full border"
                role="tablist"
                aria-label="Timer mode"
            >
                {(Object.keys(MODES) as TimerMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            mode === m
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        role="tab"
                        aria-selected={mode === m}
                        aria-controls="timer-display"
                        aria-label={MODES[m].label}
                    >
                        {MODES[m].icon}
                        <span className="hidden sm:inline">{MODES[m].label}</span>
                    </button>
                ))}
            </div>

            <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 -rotate-90" aria-hidden="true">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-muted/20"
                    />
                    {isPerformanceMode ? (
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={753.98}
                            strokeDashoffset={753.98 * (1 - progress / 100)}
                            className={mode === "pomodoro" ? "text-indigo-500" : "text-emerald-500"}
                        />
                    ) : (
                        <m.circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={753.98}
                            initial={{ strokeDashoffset: 753.98 }}
                            animate={{ strokeDashoffset: 753.98 * (1 - progress / 100) }}
                            className={cn(
                                "transition-colors duration-500",
                                mode === "pomodoro" ? "text-indigo-500" : "text-emerald-500"
                            )}
                        />
                    )}
                </svg>
                <div
                    id="timer-display"
                    className="absolute flex flex-col items-center"
                    role="timer"
                    aria-live="off"
                >
                    <span className="text-6xl font-bold tracking-tighter tabular-nums">
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2">
                        {MODES[mode].label}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={resetTimer}
                            className="rounded-full h-12 w-12"
                            aria-label="Reset timer"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Reset Timer</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            onClick={toggleTimer}
                            className={cn(
                                "rounded-full h-16 w-16 shadow-lg",
                                isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-indigo-600 hover:bg-indigo-700"
                            )}
                            aria-label={isActive ? "Pause timer" : "Start timer"}
                        >
                            {isActive ? (
                                <Pause className="h-8 w-8 text-white" />
                            ) : (
                                <Play className="h-8 w-8 text-white ml-1" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isActive ? "Pause Timer" : "Start Timer"}</p>
                    </TooltipContent>
                </Tooltip>

                <div className="w-12" /> {/* Spacer */}
            </div>
        </div>
    );
}
