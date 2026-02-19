"use client";

import { useCallback, memo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Flag, Clock, GripVertical } from "lucide-react";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { useTaskStore } from "@/lib/store/task-store";
import { formatTimePreference } from "@/lib/time-utils";
import { getLabelStyle } from "@/lib/style-utils";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { playSuccessSound } from "@/lib/audio";
import type { Task } from "@/lib/types";

interface DraggableTaskRowProps {
    task: Task;
    showTime?: boolean;
    onEdit?: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
    high: "text-red-500",
    medium: "text-orange-500",
    low: "text-blue-500",
    none: "text-muted-foreground",
};

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const DraggableTaskRow = memo(function DraggableTaskRow({
    task,
    showTime = false,
    onEdit,
}: DraggableTaskRowProps) {
    const isCompleted = task.isCompleted || false;
    const { dispatch } = useSync();
    const { userId, use24HourClock } = useUser();

    const handleToggle = useCallback(
        async (checked: boolean) => {
            if (!userId) return;

            if (checked) {
                playSuccessSound();
            }

            const existing = useTaskStore.getState().tasks[task.id];
            if (existing) {
                useTaskStore.getState().upsertTask({
                    ...existing,
                    isCompleted: checked,
                });
            }

            dispatch("toggleTaskCompletion", task.id, userId, checked);
        },
        [dispatch, task.id, userId]
    );

    const dueDate = task.dueDate
        ? task.dueDate instanceof Date
            ? task.dueDate
            : new Date(task.dueDate)
        : null;

    const hasTime = dueDate
        ? dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0
        : false;

    const isOverdue = dueDate && !isCompleted && dueDate < new Date();

    return (
        <div
            className={cn(
                "fc-external-task group flex items-start gap-2.5 px-2.5 py-2 rounded-md",
                "hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing",
                isCompleted && "opacity-40"
            )}
            data-task-id={task.id}
            data-task-title={task.icon ? `${task.icon} ${task.title}` : task.title}
            data-duration={task.estimateMinutes || 30}
            data-list-color={task.listColor || ""}
            onClick={() => onEdit?.(task)}
        >
            <div className="flex items-center gap-2 pt-0.5 shrink-0">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Checkbox
                    checked={isCompleted}
                    onCheckedChange={handleToggle}
                    className={cn(
                        "rounded-full h-[18px] w-[18px] border-[1.5px]",
                        isCompleted
                            ? "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                            : "border-muted-foreground/30"
                    )}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {showTime && hasTime && dueDate && (
                        <span className={cn(
                            "inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold tabular-nums shrink-0",
                            isOverdue
                                ? "bg-red-500/15 text-red-400"
                                : "bg-muted text-foreground/80"
                        )}>
                            {formatTimePreference(dueDate, use24HourClock)}
                        </span>
                    )}
                    {showTime && !hasTime && dueDate && isOverdue && (
                        <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold bg-red-500/15 text-red-400 shrink-0">
                            {format(dueDate, "MMM d")}
                        </span>
                    )}
                    <span className={cn(
                        "text-sm leading-snug truncate",
                        isCompleted && "line-through text-muted-foreground"
                    )}>
                        {task.icon && <span className="mr-1">{task.icon}</span>}
                        {task.title}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {task.priority && task.priority !== "none" && (
                        <Flag className={cn("h-3 w-3", priorityColors[task.priority])} />
                    )}

                    {task.estimateMinutes && (
                        <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDuration(task.estimateMinutes)}
                        </span>
                    )}

                    {task.listName && (
                        <span className="flex items-center gap-1 truncate">
                            <ResolvedIcon icon={task.listIcon || null} className="w-3 h-3 shrink-0" color={task.listColor} />
                            <span className="truncate">{task.listName}</span>
                        </span>
                    )}
                </div>

                {task.labels && task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {task.labels.map((label) => (
                            <Badge
                                key={label.id}
                                variant="outline"
                                style={getLabelStyle(label.color)}
                                className="text-[9px] px-1 py-0 h-[14px] font-normal leading-none"
                            >
                                {label.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
