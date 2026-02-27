
"use client";

import { m } from "framer-motion";
import React, { useState, useCallback, memo } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Calendar, Flag, Clock, Repeat, AlertCircle, Lock, ChevronDown, GitBranch, GripVertical, Pencil, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FocusMode } from "./FocusMode";
import { playSuccessSound } from "@/lib/audio";
import { formatTimePreference, formatFriendlyDate, formatDateShort } from "@/lib/time-utils";
import { formatDuePeriod, isDueOverdue, type DuePrecision } from "@/lib/due-utils";
import { getLabelStyle } from "@/lib/style-utils";
import type { DraggableSyntheticListeners, DraggableAttributes } from "@dnd-kit/core";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import confetti from "canvas-confetti";
import { Task } from "@/lib/types";
import { ActionType, actionRegistry } from "@/lib/sync/registry";
import { SubtaskRow } from "./SubtaskRow";
import { areTaskPropsEqual, formatDuration, priorityColors, energyLabels, energyEmojis, contextLabels, contextEmojis } from "./task-item-utils";
import { useOptionalSyncActions } from "@/components/providers/sync-provider";

export interface TaskItemProps {
    task: Task;
    showListInfo?: boolean;
    userId?: string;
    disableAnimations?: boolean;
    dragHandleProps?: DraggableSyntheticListeners;
    dragAttributes?: DraggableAttributes;
    dispatch?: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;
    onEdit?: (task: Task) => void;
    // Perf: Pass these as props to avoid hooks and context consumption in every item
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export const TaskItem = memo(function TaskItem({
    task,
    showListInfo = true,
    userId,
    disableAnimations = false,
    dragHandleProps,
    dragAttributes,
    dispatch: dispatchProp,
    onEdit,
    now: propNow,
    isClient: propIsClient,
    performanceMode: propPerformanceMode,
    userPreferences
}: TaskItemProps) {
    const isCompleted = task.isCompleted || false;
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFocusMode, setShowFocusMode] = useState(false);

    const hasSubtasks = (task.subtaskCount || 0) > 0;
    const completedCount = task.completedSubtaskCount || 0;
    const totalCount = task.subtaskCount || 0;

    const syncActions = useOptionalSyncActions();
    const dispatch = dispatchProp ?? syncActions?.dispatch;

    const handleSubtaskToggle = useCallback(async (subtaskId: number, checked: boolean) => {
        if (!userId || !dispatch) return;
        dispatch("updateSubtask", subtaskId, userId, checked);
    }, [dispatch, userId]);

    const isClient = propIsClient ?? false;
    const isPerformanceMode = propPerformanceMode ?? false;
    const resolvedPerformanceMode = isClient && isPerformanceMode;

    const { use24HourClock, weekStartsOnMonday } = userPreferences ?? { use24HourClock: false, weekStartsOnMonday: false };
    const now = propNow ?? (isClient ? new Date() : new Date(0));

    const handleToggle = async (checked: boolean) => {
        if (task.blockedByCount && task.blockedByCount > 0 && checked) {
            alert("This task is blocked by other tasks. Complete them first!");
            return;
        }

        if (checked) {
            if (!isPerformanceMode) {
                confetti({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.7 },
                    colors: ['#5b21b6', '#7c3aed', '#a78bfa']
                });
            }
            playSuccessSound();
        }

        if (!userId || !dispatch) return;
        dispatch("toggleTaskCompletion", task.id, userId, checked);
    };
    const nowTime = now.getTime();

    let isOverdue = false;
    if (task.dueDate && !isCompleted) {
        isOverdue = isDueOverdue(
            { dueDate: task.dueDate, dueDatePrecision: task.dueDatePrecision ?? null },
            now,
            weekStartsOnMonday ?? false
        );
    }

    const periodPrecision = task.dueDatePrecision && task.dueDatePrecision !== "day" ? task.dueDatePrecision : null;
    const periodLabel = task.dueDate && periodPrecision ? formatDuePeriod({ dueDate: task.dueDate, dueDatePrecision: periodPrecision as DuePrecision }) : null;
    const periodBadge = periodPrecision ? periodPrecision[0] : null;

    const tooltipDate = task.dueDate ? format(task.dueDate, "eeee, MMMM do, yyyy") : "";
    const tooltipTime = task.dueDate && (task.dueDate.getHours() !== 0 || task.dueDate.getMinutes() !== 0)
        ? ` at ${formatTimePreference(task.dueDate, use24HourClock)}`
        : "";
    const tooltipContent = periodLabel
        ? `Due: ${periodLabel}`
        : `Due: ${tooltipDate}${tooltipTime}`;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isDeadlineExceeded = task.deadline && task.deadline.getTime() < nowTime && !isCompleted;
    const isBlocked = (task.blockedByCount || 0) > 0;

    const effectiveDisableAnimations = disableAnimations || resolvedPerformanceMode;

    return (
        <m.div
            layout={!effectiveDisableAnimations ? true : undefined}
            initial={!effectiveDisableAnimations ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
            animate={!effectiveDisableAnimations ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            exit={!effectiveDisableAnimations ? { opacity: 0, height: 0 } : undefined}
            className="mb-2"
        >
            <div
                className={cn(
                    "group flex items-center gap-3 rounded-lg border p-4 hover:bg-accent/40 transition-all duration-200 hover:shadow-sm bg-card card relative",
                    onEdit ? "cursor-pointer" : "cursor-default",
                    isCompleted && "opacity-60 bg-muted/30",
                    isBlocked && !isCompleted && "bg-orange-50/50 border-orange-100",
                    disableAnimations && "cursor-default"
                )}
                role="button"
                data-testid="task-item"
                tabIndex={0}
                aria-label={onEdit ? `Edit task ${task.title}` : task.title}
                onClick={(e) => {
                    if (window.getSelection()?.toString()) return;
                    if ((e.target as HTMLElement).closest('button, [role="checkbox"], a, input')) return;
                    if ((e.target as HTMLElement).closest('[data-subtask-area="true"]')) return;
                    if (onEdit) onEdit(task);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        if ((e.target as HTMLElement).closest('button, [role="checkbox"], a, input')) return;
                        if ((e.target as HTMLElement).closest('[data-subtask-area="true"]')) return;
                        e.preventDefault();
                        if (onEdit) onEdit(task);
                    }
                }}
            >
                {disableAnimations && (
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors -ml-2 -mr-1 rounded" {...dragHandleProps} {...dragAttributes}>
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                {hasSubtasks ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="flex items-center justify-center w-5 h-5 -ml-1 rounded hover:bg-muted transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                    >
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !isExpanded && "-rotate-90")} />
                    </button>
                ) : (
                    <div className="w-5 h-5 -ml-1" />
                )}

                <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Checkbox
                        checked={isCompleted}
                        onCheckedChange={handleToggle}
                        disabled={isBlocked && !isCompleted}
                        data-testid="task-checkbox"
                        className={cn("rounded-full h-5 w-5 transition-all border-2", isCompleted ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : "border-muted-foreground/30")}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Mark task as complete"
                    />
                </m.div>

                <div className="flex-1 min-w-0">
                    <div className={cn("font-medium truncate text-sm transition-all flex items-center gap-2", isCompleted && "text-muted-foreground")}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(task); }}
                            className="relative inline-flex items-center gap-2 max-w-full bg-transparent border-none p-0 hover:underline focus:underline focus:outline-none text-left appearance-none"
                            disabled={!onEdit}
                        >
                            {task.icon && <ResolvedIcon icon={task.icon} className="h-4 w-4 text-muted-foreground" />}
                            <span className="truncate">{task.title}</span>
                            {isCompleted && <div className="absolute left-0 top-1/2 h-[1.5px] bg-muted-foreground/50 w-full pointer-events-none" />}
                        </button>
                        {isBlocked && !isCompleted && <Lock className="h-3 w-3 text-orange-500" />}
                        {showListInfo && task.listName && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full ml-auto">
                                <ResolvedIcon icon={task.listIcon || null} className="w-3 h-3" color={task.listColor} />
                                <span>{task.listName}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                        {hasSubtasks && (
                            <div className="flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                <span>{completedCount}/{totalCount}</span>
                            </div>
                        )}
                        {task.dueDate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}
                                        aria-label={tooltipContent}
                                        tabIndex={0}
                                    >
                                        <Calendar className="h-3 w-3" />
                                        {periodLabel ? (
                                            <><span>{periodLabel}</span><Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 uppercase tracking-wide">{periodBadge}</Badge></>
                                        ) : (
                                            // ⚡ Bolt Opt: Use manual formatting instead of date-fns format() (~30x faster)
                                            <><span>{isClient ? formatFriendlyDate(task.dueDate, "MMM d") : formatDateShort(task.dueDate)}</span>
                                                {(task.dueDate.getHours() !== 0 || task.dueDate.getMinutes() !== 0) && <span>{formatTimePreference(task.dueDate, use24HourClock)}</span>}</>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{tooltipContent}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {task.priority && task.priority !== "none" && (
                            <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                                <Flag className="h-3 w-3" />
                                <span className="capitalize">{task.priority}</span>
                            </div>
                        )}
                        {(task.estimateMinutes || task.actualMinutes) && (
                            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all bg-muted/80 text-muted-foreground ring-1 ring-border/50")}>
                                <Clock className="h-3.5 w-3.5" />
                                {task.actualMinutes ? (
                                    <div className="flex items-center gap-1"><span className="font-semibold">{formatDuration(task.actualMinutes)}</span>{task.estimateMinutes && <><span className="text-muted-foreground/60">/</span><span className="opacity-70">{formatDuration(task.estimateMinutes)}</span></>}</div>
                                ) : (
                                    <span className="font-semibold">{formatDuration(task.estimateMinutes!)}</span>
                                )}
                            </div>
                        )}
                        {task.isRecurring && <div className="flex items-center gap-1 text-blue-500"><Repeat className="h-3 w-3" /><span>Recurring</span></div>}
                        {task.energyLevel && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-help"
                                        aria-label={energyLabels[task.energyLevel]}
                                        tabIndex={0}
                                    >
                                        {energyEmojis[task.energyLevel]}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{energyLabels[task.energyLevel]}</p></TooltipContent>
                            </Tooltip>
                        )}
                        {task.context && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-help"
                                        aria-label={contextLabels[task.context] || "Context"}
                                        tabIndex={0}
                                    >
                                        {contextEmojis[task.context]}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{contextLabels[task.context] || "Context"}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {task.labels.map(label => (
                                <Badge key={label.id} variant="outline" style={getLabelStyle(label.color)} className="text-[10px] px-1.5 py-0 h-5 font-normal border flex items-center gap-1">
                                    <ResolvedIcon icon={label.icon} className="h-3 w-3" color={label.color} />
                                    {label.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    {onEdit && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(task); }} type="button" aria-label="Edit task" data-testid="edit-task-button">
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit task</p></TooltipContent>
                        </Tooltip>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowFocusMode(true); }} type="button" aria-label="Start focus mode" data-testid="start-focus-button">
                                <Target className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Start focus mode</p></TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {hasSubtasks && isExpanded && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-muted pl-4" data-subtask-area="true">
                    {(task.subtasks || []).map((subtask) => (
                        <SubtaskRow key={subtask.id} subtask={subtask} isCompleted={subtask.isCompleted || false} onToggle={handleSubtaskToggle} />
                    ))}
                </div>
            )}

            {showFocusMode && <FocusMode task={task} userId={userId} onClose={() => setShowFocusMode(false)} />}
        </m.div>
    );
}, areTaskPropsEqual);
