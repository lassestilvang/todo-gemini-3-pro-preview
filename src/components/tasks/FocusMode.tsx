"use client";

import * as React from "react";
import { Play, Pause, CheckCircle2, RotateCcw, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTask } from "@/lib/actions";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface FocusModeProps {
    task: {
        id: number;
        title: string;
        description: string | null;
        priority: string | null;
    };
    onClose: () => void;
}

export function FocusMode({ task, onClose }: FocusModeProps) {
    const [timeLeft, setTimeLeft] = React.useState(25 * 60); // 25 minutes
    const [isActive, setIsActive] = React.useState(false);
    const [isBreak, setIsBreak] = React.useState(false);

    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play sound or notification here
            if (!isBreak) {
                toast.success("Focus session complete! Take a break.");
                setIsBreak(true);
                setTimeLeft(5 * 60); // 5 minute break
            } else {
                toast.info("Break over! Ready for the next session?");
                setIsBreak(false);
                setTimeLeft(25 * 60);
            }
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, isBreak]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleComplete = async () => {
        try {
            await updateTask(task.id, { isCompleted: true });
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
            });
            toast.success("Task completed!");
            setTimeout(onClose, 2000);
        } catch (error) {
            toast.error("Failed to complete task");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={onClose}
            >
                <Minimize2 className="h-6 w-6" />
            </Button>

            <div className="max-w-2xl w-full text-center space-y-12">
                <div className="space-y-4">
                    <div className={cn(
                        "inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-medium",
                        isBreak ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"
                    )}>
                        {isBreak ? "Break Time" : "Focus Mode"}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        {task.title}
                    </h1>
                    {task.description && (
                        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                            {task.description}
                        </p>
                    )}
                </div>

                <div className="tabular-nums text-8xl md:text-9xl font-bold tracking-tighter font-mono">
                    {formatTime(timeLeft)}
                </div>

                <div className="flex items-center justify-center gap-6">
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-16 w-16 rounded-full border-2"
                        onClick={resetTimer}
                    >
                        <RotateCcw className="h-6 w-6" />
                    </Button>

                    <Button
                        size="lg"
                        className={cn(
                            "h-24 w-24 rounded-full shadow-lg transition-all hover:scale-105",
                            isActive ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
                        )}
                        onClick={toggleTimer}
                    >
                        {isActive ? (
                            <Pause className="h-10 w-10" />
                        ) : (
                            <Play className="h-10 w-10 ml-1" />
                        )}
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        className="h-16 w-16 rounded-full border-2 hover:bg-green-100 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-900/30 dark:hover:text-green-400 dark:hover:border-green-800"
                        onClick={handleComplete}
                    >
                        <CheckCircle2 className="h-6 w-6" />
                    </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                    {isActive ? "Stay focused. You got this!" : "Ready to start?"}
                </div>
            </div>
        </div>
    );
}
