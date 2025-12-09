"use client";

import { motion } from "framer-motion";

import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock, Repeat, AlertCircle, Lock, ChevronDown, GitBranch } from "lucide-react";
import { toggleTaskCompletion, updateSubtask } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusMode } from "./FocusMode";
import { Target } from "lucide-react";
import { playSuccessSound } from "@/lib/audio";


import { createElement } from "react";
import { getListIcon, getLabelIcon } from "@/lib/icons";

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
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    deadline: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
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
}

export function TaskItem({ task, showListInfo = true, userId }: TaskItemProps) {
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
            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.7 },
                    colors: ['#5b21b6', '#7c3aed', '#a78bfa'] // Purple theme
                });
            });
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

    const priorityColors = {
        high: "text-red-500",
        medium: "text-orange-500",
        low: "text-blue-500",
        none: "text-gray-400",
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
    const isDeadlineExceeded = task.deadline && new Date(task.deadline) < new Date() && !isCompleted;
    const isBlocked = (task.blockedByCount || 0) > 0;
    const [showFocusMode, setShowFocusMode] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2" // Add margin bottom here to separate items when animating
        >
            <div
                className={cn(
                    "group flex items-center gap-3 rounded-lg border p-4 hover:bg-accent/40 transition-all duration-200 cursor-pointer hover:shadow-sm bg-card card relative",
                    isCompleted && "opacity-60 bg-muted/30",
                    isBlocked && !isCompleted && "bg-orange-50/50 border-orange-100"
                )}
                data-testid="task-item"
                data-task-id={task.id}
                data-task-completed={isCompleted}
            >
                {/* Expand/Collapse Button */}
                {hasSubtasks ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="flex items-center justify-center w-5 h-5 -ml-1 rounded hover:bg-muted transition-colors"
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

                <Checkbox
                    checked={isCompleted}
                    onCheckedChange={handleToggle}
                    disabled={isBlocked && !isCompleted}
                    className={cn(
                        "rounded-full h-5 w-5 transition-all",
                        isCompleted ? "data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground" : "",
                        isBlocked && !isCompleted ? "opacity-50 cursor-not-allowed" : ""
                    )}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="task-checkbox"
                />

                <div className="flex-1 min-w-0">
                    <div className={cn("font-medium truncate text-sm transition-all flex items-center gap-2", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                        {isBlocked && !isCompleted && (
                            <Lock className="h-3 w-3 text-orange-500" />
                        )}
                        {showListInfo && task.listName && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full ml-auto">
                                {createElement(getListIcon(task.listIcon || null), {
                                    className: "w-3 h-3",
                                    style: { color: task.listColor || 'currentColor' }
                                })}
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
                                        {format(task.dueDate, "HH:mm")}
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
                                        {format(task.deadline, "HH:mm")}
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
                        {task.estimateMinutes && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimateMinutes}m
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
                                    {createElement(getLabelIcon(label.icon), { className: "h-3 w-3" })}
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
                        e.nativeEvent.stopImmediatePropagation();
                        setShowFocusMode(true);
                    }}
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
                            >
                                <Checkbox
                                    checked={isSubtaskCompleted || false}
                                    onCheckedChange={(checked) => handleSubtaskToggle(subtask.id, checked as boolean)}
                                    className="rounded-full h-4 w-4"
                                    onClick={(e) => e.stopPropagation()}
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
        </motion.div>
    );
}
