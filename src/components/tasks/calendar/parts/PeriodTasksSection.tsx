
import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    formatDuePeriod,
    type DuePrecision,
} from "@/lib/due-utils";
import { Task } from "@/lib/types";

interface PeriodTasksSectionProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
}

export function PeriodTasksSection({ tasks, onEdit }: PeriodTasksSectionProps) {
    if (tasks.length === 0) return null;

    return (
        <div className="mt-6 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="text-sm font-semibold">Sometime This Period</h4>
                    <p className="text-xs text-muted-foreground">
                        Tasks scheduled for a week, month, or year
                    </p>
                </div>
                <span className="text-xs text-muted-foreground">
                    {tasks.length} total
                </span>
            </div>
            <div className="space-y-2">
                {tasks.map((task) => (
                    <button
                        key={task.id}
                        type="button"
                        onClick={() => onEdit(task)}
                        className={cn(
                            "w-full flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:shadow-sm",
                            task.isCompleted && "opacity-60"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {task.isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate">{task.title}</span>
                        </div>
                        {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                                {formatDuePeriod({
                                    dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                                    dueDatePrecision: task.dueDatePrecision as DuePrecision,
                                })}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
