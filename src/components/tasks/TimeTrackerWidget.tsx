"use client";

import * as React from "react";
import { m } from "framer-motion";
import { Play, Square, Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    startTimeEntry,
    stopTimeEntry,
    getActiveTimeEntry,
} from "@/lib/actions";
import { isSuccess } from "@/lib/action-result";

interface TimeTrackerWidgetProps {
    taskId: number;
    estimateMinutes: number | null;
    trackedMinutes?: number | null;
    userId?: string;
    compact?: boolean;
    onEditClick?: () => void;
    className?: string;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TimeTrackerWidget({
    taskId,
    estimateMinutes,
    trackedMinutes = 0,
    userId,
    compact = false,
    onEditClick,
    className,
}: TimeTrackerWidgetProps) {
    const [isTracking, setIsTracking] = React.useState(false);
    const [activeEntryId, setActiveEntryId] = React.useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Check for active entry on mount
    React.useEffect(() => {
        async function checkActive() {
            if (!userId) return;
            const result = await getActiveTimeEntry(taskId, userId);
            if (isSuccess(result) && result.data) {
                setIsTracking(true);
                setActiveEntryId(result.data.id);
                // Calculate elapsed time
                const start = new Date(result.data.startedAt).getTime();
                const now = Date.now();
                setElapsedSeconds(Math.floor((now - start) / 1000));
            }
        }
        checkActive();
    }, [taskId, userId]);

    // Timer effect
    React.useEffect(() => {
        if (isTracking) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isTracking]);

    const handleStart = async () => {
        if (!userId) {
            toast.error("Not authenticated");
            return;
        }
        const result = await startTimeEntry(taskId, userId);
        if (isSuccess(result)) {
            setIsTracking(true);
            setActiveEntryId(result.data.id);
            setElapsedSeconds(0);
            toast.success("Time tracking started");
        } else {
            toast.error(result.error.message);
        }
    };

    const handleStop = async () => {
        if (!userId || !activeEntryId) {
            toast.error("No active entry");
            return;
        }
        const result = await stopTimeEntry(activeEntryId, userId);
        if (isSuccess(result)) {
            setIsTracking(false);
            setActiveEntryId(null);
            const mins = Math.round(elapsedSeconds / 60);
            toast.success(`Tracked ${formatMinutes(mins)}`);
            setElapsedSeconds(0);
        } else {
            toast.error(result.error.message);
        }
    };

    const totalTracked = (trackedMinutes || 0) + Math.floor(elapsedSeconds / 60);
    const progress = estimateMinutes ? Math.min((totalTracked / estimateMinutes) * 100, 100) : 0;
    const isOverEstimate = estimateMinutes && totalTracked > estimateMinutes;

    // Compact display for task list
    if (compact && !isExpanded && !isTracking) {
        return (
            <m.button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                }}
                className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    "bg-muted/50 hover:bg-muted transition-colors",
                    isOverEstimate && "text-red-500",
                    className
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Clock className="h-3 w-3" />
                {trackedMinutes && trackedMinutes > 0 ? (
                    <span>
                        {formatMinutes(trackedMinutes)}
                        {estimateMinutes && <span className="text-muted-foreground"> / {formatMinutes(estimateMinutes)}</span>}
                    </span>
                ) : estimateMinutes ? (
                    <span className="text-muted-foreground">{formatMinutes(estimateMinutes)}</span>
                ) : (
                    <span className="text-muted-foreground">Track</span>
                )}
            </m.button>
        );
    }

    return (
        <m.div
            initial={compact ? { opacity: 0, scale: 0.95 } : false}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "rounded-lg border bg-card p-3 shadow-sm",
                isTracking && "border-primary/50 bg-primary/5",
                className
            )}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-3">
                {/* Play/Pause/Stop Controls */}
                <div className="flex items-center gap-1">
                    {!isTracking ? (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                            onClick={handleStart}
                        >
                            <Play className="h-4 w-4 ml-0.5" />
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                                onClick={handleStop}
                            >
                                <Square className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Timer Display */}
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isTracking && (
                                <m.span
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="w-2 h-2 rounded-full bg-red-500"
                                />
                            )}
                            <span className={cn(
                                "font-mono text-lg font-semibold",
                                isTracking && "text-primary"
                            )}>
                                {formatDuration(elapsedSeconds)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatMinutes(totalTracked)}
                            {estimateMinutes && (
                                <span className={isOverEstimate ? "text-red-500" : ""}>
                                    {" / "}{formatMinutes(estimateMinutes)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {estimateMinutes && (
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <m.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    isOverEstimate
                                        ? "bg-red-500"
                                        : progress > 80
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                )}
                            />
                        </div>
                    )}
                </div>

                {/* Edit Button */}
                {onEditClick && (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={onEditClick}
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                )}

                {/* Collapse button for compact mode */}
                {compact && (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setIsExpanded(false)}
                    >
                        <span className="text-xs">×</span>
                    </Button>
                )}
            </div>
        </m.div>
    );
}
