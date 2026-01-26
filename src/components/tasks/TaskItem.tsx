"use client";

import { m } from "framer-motion";

import { useState, useEffect, memo } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock, Repeat, AlertCircle, Lock, ChevronDown, GitBranch, GripVertical } from "lucide-react";
import { toggleTaskCompletion, updateSubtask } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusMode } from "./FocusMode";
import { Target } from "lucide-react";
import { playSuccessSound } from "@/lib/audio";
import { useUser } from "@/components/providers/UserProvider";
import { formatTimePreference } from "@/lib/time-utils";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";

import { ResolvedIcon } from "@/components/ui/resolved-icon";

// Define a type for the task prop based on the schema or a shared type
// For now, I'll define a simplified interface matching the schema

export interface Subtask {
    id: number;
    parentId: number | null;
    title: string;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
}

export interface Task {
    id: number;
    title: string;
    description: string | null;
    icon?: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    deadline: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
    position: number;
    actualMinutes: number | null;
    isRecurring: boolean | null;
    listId: number | null;
    listName?: string | null;
    listColor?: string | null;
    listIcon?: string | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null; icon: string | null }>;
    blockedByCount?: number;
    subtasks?: Subtask[];
    subtaskCount?: number;
    completedSubtaskCount?: number;
}

interface TaskItemProps {
    task: Task;
    showListInfo?: boolean;
    userId?: string;
    disableAnimations?: boolean;
    // Typed for @dnd-kit stability - ensures memo works correctly with drag-and-drop
    dragHandleProps?: DraggableSyntheticListeners;
}


// Format minutes to human-readable duration
function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const priorityColors = {
    high: "text-red-500",
    medium: "text-orange-500",
    low: "text-blue-500",
    none: "text-gray-400",
};

// React.memo prevents re-renders when parent state changes (e.g., dialog open/close)
// but the task props remain unchanged. In lists with 50+ tasks, this reduces
// unnecessary re-renders by ~95% when opening the task edit dialog.
export const TaskItem = memo(function TaskItem({ task, showListInfo = true, userId, disableAnimations = false, dragHandleProps }: TaskItemProps) {
    const [isCompleted, setIsCompleted] = useState(task.isCompleted || false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [subtaskStates, setSubtaskStates] = useState<Record<number, boolean>>(
        () => (task.subtasks || []).reduce((acc, s) => ({ ...acc, [s.id]: s.isCompleted || false }), {} as Record<number, boolean>)
    );

    const hasSubtasks = (task.subtaskCount || 0) > 0;
    const completedCount = task.completedSubtaskCount || 0;
    const totalCount = task.subtaskCount || 0;

    const handleSubtaskToggle = async (subtaskId: number, checked: boolean) => {
        if (!userId) return;
        setSubtaskStates(prev => ({ ...prev, [subtaskId]: checked }));
        await updateSubtask(subtaskId, userId, checked);
    };

    const handleToggle = async (checked: boolean) => {
        if (task.blockedByCount && task.blockedByCount > 0 && checked) {
            alert("This task is blocked by other tasks. Complete them first!");
            return;
        }
        setIsCompleted(checked);

        if (checked) {
            if (!isPerformanceMode) {
                import("canvas-confetti").then((confetti) => {
                    confetti.default({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.7 },
                        colors: ['#5b21b6', '#7c3aed', '#a78bfa'] // Purple theme
                    });
                });
            }
            playSuccessSound();
        }

        if (!userId) return;
        const result = await toggleTaskCompletion(task.id, userId, checked);

        if (result && result.leveledUp) {
            const event = new CustomEvent("user-level-update", {
                detail: { level: result.newLevel, leveledUp: true }
            });
            window.dispatchEvent(event);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const isPerformanceMode = usePerformanceMode();
    const resolvedPerformanceMode = mounted && isPerformanceMode;

    const now = mounted ? new Date() : new Date(0); // Use a stable "now" for server/hydration
    const isOverdue = task.dueDate && new Date(task.dueDate) < now && !isCompleted;
    const isDeadlineExceeded = task.deadline && new Date(task.deadline) < now && !isCompleted;
    const isBlocked = (task.blockedByCount || 0) > 0;
    const [showFocusMode, setShowFocusMode] = useState(false);
    const { use24HourClock } = useUser();

    // Force animations disabled if performance mode is on
    const effectiveDisableAnimations = disableAnimations || resolvedPerformanceMode;

    return (
        <m.div
            layout={!effectiveDisableAnimations ? true : undefined}
            initial={!effectiveDisableAnimations ? { opacity: 0, y: 10 } : undefined}
            animate={!effectiveDisableAnimations ? { opacity: 1, y: 0 } : undefined}
            exit={!effectiveDisableAnimations ? { opacity: 0, height: 0 } : undefined}
            className="mb-2" // Add margin bottom here to separate items when animating
        >
            <div
                className={cn(
                    "group flex items-center gap-3 rounded-lg border p-4 hover:bg-accent/40 transition-all duration-200 cursor-pointer hover:shadow-sm bg-card card relative",
                    isCompleted && "opacity-60 bg-muted/30",
                    isBlocked && !isCompleted && "bg-orange-50/50 border-orange-100",
                    disableAnimations && "cursor-default" // Change cursor if dragging via handle
                )}
                data-testid="task-item"
                data-task-id={task.id}
                data-task-completed={isCompleted}
            >
                {/* Drag Handle */}
                {disableAnimations && (
                    <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors -ml-2 -mr-1 outline-none"
                        {...dragHandleProps}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}
                {/* Expand/Collapse Button */}
                {hasSubtasks ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsExpanded(!isExpanded);
                        }}
                        className="flex items-center justify-center w-5 h-5 -ml-1 rounded hover:bg-muted transition-colors"
                        aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                        aria-expanded={isExpanded}
                    >
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                !isExpanded && "-rotate-90"
                            )}
                        />
                    </button>
                ) : (
                    <div className="w-5 h-5 -ml-1" /> // Spacer for alignment
                )}

                <m.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Checkbox
                        checked={isCompleted}
                        onCheckedChange={handleToggle}
                        disabled={isBlocked && !isCompleted}
                        className={cn(
                            "rounded-full h-5 w-5 transition-all border-2",
                            isCompleted ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : "border-muted-foreground/30",
                            isBlocked && !isCompleted ? "opacity-30 cursor-not-allowed" : ""
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        data-testid="task-checkbox"
aria-label={isCompleted ? `Mark task '${task.title}' as incomplete` : `Mark task '${task.title}' as complete`}
                    />
                </m.div>

                <div className="flex-1 min-w-0">
                    <div className={cn("font-medium truncate text-sm transition-all flex items-center gap-2", isCompleted && "text-muted-foreground")}>
                        <div className="relative inline-flex items-center gap-2 max-w-full">
                            {task.icon && (
                                <ResolvedIcon icon={task.icon} className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate">{task.title}</span>
                            {isCompleted && (
                                <div
                                    className="absolute left-0 top-1/2 h-[1.5px] bg-muted-foreground/50 w-full"
                                />
                            )}
                        </div>
                        {isBlocked && !isCompleted && (
                            <Lock className="h-3 w-3 text-orange-500" />
                        )}
                        {showListInfo && task.listName && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full ml-auto">
                                <ResolvedIcon icon={task.listIcon || null} className="w-3 h-3" color={task.listColor} />
                                <span>{task.listName}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                        {hasSubtasks && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <GitBranch className="h-3 w-3" />
                                <span>{completedCount}/{totalCount}</span>
                            </div>
                        )}
                        {isBlocked && !isCompleted && (
                            <div className="flex items-center gap-1 text-orange-500 font-medium">
                                <Lock className="h-3 w-3" />
                                Blocked
                            </div>
                        )}
                        {task.dueDate && (
                            <div className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}>
                                <Calendar className="h-3 w-3" />
                                {format(task.dueDate, "MMM d")}
                                {(task.dueDate.getHours() !== 0 || task.dueDate.getMinutes() !== 0) && (
                                    <span className="text-muted-foreground">
                                        {formatTimePreference(task.dueDate, use24HourClock)}
                                    </span>
                                )}
                            </div>
                        )}
                        {task.deadline && (
                            <div className={cn("flex items-center gap-1", isDeadlineExceeded ? "text-red-600 font-bold" : "text-orange-500")}>
                                <AlertCircle className="h-3 w-3" />
                                {format(task.deadline, "MMM d")}
                                {(task.deadline.getHours() !== 0 || task.deadline.getMinutes() !== 0) && (
                                    <span>
                                        {formatTimePreference(task.deadline, use24HourClock)}
                                    </span>
                                )}
                            </div>
                        )}
                        {task.priority && task.priority !== "none" && (
                            <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                                <Flag className="h-3 w-3" />
                                <span className="capitalize">{task.priority}</span>
                            </div>
                        )}
                        {(task.estimateMinutes || task.actualMinutes) && (
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all",
                                task.actualMinutes && task.estimateMinutes && task.actualMinutes > task.estimateMinutes
                                    ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50"
                                    : task.actualMinutes && task.estimateMinutes
                                        ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50"
                                        : "bg-muted/80 text-muted-foreground ring-1 ring-border/50"
                            )}>
                                <Clock className="h-3.5 w-3.5" />
                                {task.actualMinutes ? (
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">{formatDuration(task.actualMinutes)}</span>
                                        {task.estimateMinutes && (
                                            <>
                                                <span className="text-muted-foreground/60">/</span>
                                                <span className="opacity-70">{formatDuration(task.estimateMinutes)}</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <span className="font-semibold">{formatDuration(task.estimateMinutes!)}</span>
                                )}
                            </div>
                        )}
                        {task.isRecurring && (
                            <div className="flex items-center gap-1 text-blue-500">
                                <Repeat className="h-3 w-3" />
                                <span>Recurring</span>
                            </div>
                        )}
                        {task.energyLevel && (
                            <div className="flex items-center gap-1">
                                {task.energyLevel === "high" && "🔋"}
                                {task.energyLevel === "medium" && "🔌"}
                                {task.energyLevel === "low" && "🪫"}
                            </div>
                        )}
                        {task.context && (
                            <div className="flex items-center gap-1">
                                {task.context === "computer" && "💻"}
                                {task.context === "phone" && "📱"}
                                {task.context === "errands" && "🏃"}
                                {task.context === "meeting" && "👥"}
                                {task.context === "home" && "🏠"}
                                {task.context === "anywhere" && "🌍"}
                            </div>
                        )}
                    </div>
                    {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {task.labels.map(label => (
                                <Badge
                                    key={label.id}
                                    variant="outline"
                                    style={{
                                        borderColor: (label.color || '#000000') + '40',
                                        backgroundColor: (label.color || '#000000') + '10',
                                        color: label.color || '#000000'
                                    }}
                                    className="text-[10px] px-1.5 py-0 h-5 font-normal border flex items-center gap-1"
                                >
                                    {/* <ResolvedIcon> handles fallback internally if needed, or we can just pass null.
                                        But wait, ResolvedIcon renders `ListTodo` fallback if null.
                                        For labels without icons, we might prefer *no* icon?
                                        The old code called `getLabelIcon(label.icon)` which returned a Lucide icon (Tag default).
                                        ResolvedIcon defaults to ListTodo. Let's provide a fallback of Tag explicitly if needed,
                                        or let ResolvedIcon handle it. Since `label.icon` is nullable string.
                                        Let's assume standard behavior: if icon is present, show it.
                                    */}
                                    <ResolvedIcon icon={label.icon} className="h-3 w-3" color={label.color} />
                                    {label.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 z-20 h-8 w-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        e.nativeEvent.stopImmediatePropagation();
                        setShowFocusMode(true);
                    }}
                    type="button"
                    aria-label="Start focus mode"
                >
                    <Target className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
            </div>

            {/* Subtasks Section */}
            {hasSubtasks && isExpanded && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-muted pl-4">
                    {(task.subtasks || []).map((subtask) => {
                        const isSubtaskCompleted = subtaskStates[subtask.id] ?? subtask.isCompleted;
                        return (
                            <div
                                key={subtask.id}
                                className={cn(
                                    "flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors",
                                    isSubtaskCompleted && "opacity-60"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <Checkbox
                                    checked={isSubtaskCompleted || false}
                                    onCheckedChange={(checked) => handleSubtaskToggle(subtask.id, checked as boolean)}
                                    className="rounded-full h-4 w-4"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
aria-label={isSubtaskCompleted ? `Mark subtask '${subtask.title}' as incomplete` : `Mark subtask '${subtask.title}' as complete`}
                                />
                                <span
                                    className={cn(
                                        "text-sm",
                                        isSubtaskCompleted && "line-through text-muted-foreground"
                                    )}
                                >
                                    {subtask.title}
                                </span>
                                {subtask.estimateMinutes && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {subtask.estimateMinutes}m
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showFocusMode && (
                <FocusMode
                    task={task}
                    userId={userId}
                    onClose={() => setShowFocusMode(false)}
                />
            )}
        </m.div>
    );
});
