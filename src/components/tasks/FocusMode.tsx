"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, SkipForward, Coffee, Focus } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTask } from "@/lib/actions";

interface FocusModeProps {
    task: {
        id: number;
        title: string;
        estimateMinutes: number | null;
        actualMinutes: number | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SessionType = "work" | "break";

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

export function FocusMode({ task, open, onOpenChange }: FocusModeProps) {
    const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
    const [isRunning, setIsRunning] = useState(false);
    const [sessionType, setSessionType] = useState<SessionType>("work");
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0); // in seconds
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Request notification permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const resetTimer = useCallback(() => {
        setTimeLeft(sessionType === "work" ? WORK_DURATION : BREAK_DURATION);
        setIsRunning(false);
    }, [sessionType]);

    const startTimer = () => setIsRunning(true);
    const pauseTimer = () => setIsRunning(false);

    const skipSession = useCallback(() => {
        if (sessionType === "work") {
            setCompletedPomodoros(prev => prev + 1);
            setSessionType("break");
            setTimeLeft(BREAK_DURATION);
        } else {
            setSessionType("work");
            setTimeLeft(WORK_DURATION);
        }
        setIsRunning(false);
    }, [sessionType]);

    const sendNotification = useCallback((title: string, body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
        }
    }, []);

    const finishSession = useCallback(async () => {
        setIsRunning(false);

        if (sessionType === "work") {
            const newCompletedPomodoros = completedPomodoros + 1;
            setCompletedPomodoros(newCompletedPomodoros);
            const newTotalTime = totalTimeSpent + WORK_DURATION;
            setTotalTimeSpent(newTotalTime);

            // Update task's actual minutes
            await updateTask(task.id, {
                actualMinutes: Math.round(newTotalTime / 60)
            });

            sendNotification("Pomodoro Complete! 🎉", "Time for a 5-minute break.");
            setSessionType("break");
            setTimeLeft(BREAK_DURATION);
        } else {
            sendNotification("Break Over! 💪", "Ready for another focused session?");
            setSessionType("work");
            setTimeLeft(WORK_DURATION);
        }
    }, [sessionType, completedPomodoros, totalTimeSpent, task.id, sendNotification]);

    // Timer logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishSession();
                        return prev;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeLeft, finishSession]);

    // Reset when dialog opens/closes
    useEffect(() => {
        if (!open && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [open]);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setIsRunning(false);
            setTimeLeft(WORK_DURATION);
            setSessionType("work");
        }
    }, [open]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = sessionType === "work"
        ? ((WORK_DURATION - timeLeft) / WORK_DURATION) * 100
        : ((BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Focus className="h-5 w-5" />
                        Focus Mode
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    {/* Task Title */}
                    <div className="text-center">
                        <h3 className="font-medium text-lg mb-2">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {sessionType === "work" ? "Focus Session" : "Break Time"}
                        </p>
                    </div>

                    {/* Timer Circle */}
                    <div className="flex justify-center">
                        <div className="relative w-64 h-64">
                            {/* Background Circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="128"
                                    cy="128"
                                    r="120"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    className="text-muted"
                                />
                                {/* Progress Circle */}
                                <circle
                                    cx="128"
                                    cy="128"
                                    r="120"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 120}`}
                                    strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                                    className={cn(
                                        "transition-all duration-1000",
                                        sessionType === "work" ? "text-blue-500" : "text-green-500"
                                    )}
                                    strokeLinecap="round"
                                />
                            </svg>
                            {/* Time Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-5xl font-bold tabular-nums">{formatTime(timeLeft)}</span>
                                {sessionType === "work" ? (
                                    <Focus className="h-8 w-8 text-blue-500 mt-2" />
                                ) : (
                                    <Coffee className="h-8 w-8 text-green-500 mt-2" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-3">
                        {!isRunning ? (
                            <Button onClick={startTimer} size="lg" className="gap-2">
                                <Play className="h-5 w-5" />
                                Start
                            </Button>
                        ) : (
                            <Button onClick={pauseTimer} variant="outline" size="lg" className="gap-2">
                                <Pause className="h-5 w-5" />
                                Pause
                            </Button>
                        )}
                        <Button onClick={skipSession} variant="outline" size="lg" className="gap-2">
                            <SkipForward className="h-5 w-5" />
                            Skip
                        </Button>
                        <Button onClick={resetTimer} variant="ghost" size="lg">
                            Reset
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{completedPomodoros}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}m</p>
                            <p className="text-xs text-muted-foreground">Time Spent</p>
                        </div>
                    </div>

                    {task.estimateMinutes && (
                        <div className="text-center text-sm text-muted-foreground">
                            Estimate: {task.estimateMinutes}m • Actual: {task.actualMinutes || 0}m
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
