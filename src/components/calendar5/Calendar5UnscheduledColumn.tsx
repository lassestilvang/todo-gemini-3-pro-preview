"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/types";
import { DraggableTaskRow } from "@/components/calendar4/DraggableTaskRow";

interface UnscheduledColumnProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    selectedListId?: number | null;
}

export function Calendar5UnscheduledColumn({ tasks, onEditTask, selectedListId }: UnscheduledColumnProps) {
    const unscheduledTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (t.isCompleted || t.dueDate) return false;
            if (selectedListId !== undefined && selectedListId !== null) {
                return t.listId === selectedListId;
            }
            return true;
        });
    }, [tasks, selectedListId]);

    return (
        <div className="flex flex-col h-full min-h-0 w-[300px] bg-card/30 border-r shrink-0">
            <div className="px-4 py-3 border-b shrink-0 bg-background/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold tracking-tight">Unscheduled</h2>
                    <span className="text-[11px] text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded-full">
                        {unscheduledTasks.length}
                    </span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1">Drag onto calendar to schedule</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {unscheduledTasks.length === 0 ? (
                    <div className="flex items-center justify-center pt-8 text-xs text-muted-foreground/60">
                        No unscheduled tasks
                    </div>
                ) : (
                    unscheduledTasks.map((task) => (
                        <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => {
                                // Setup native HTML5 drag data payload
                                e.dataTransfer.setData("application/json", JSON.stringify({
                                    taskId: task.id,
                                    durationMinutes: task.estimateMinutes || 30
                                }));
                                // Make the ghost image look decent (optional)
                                e.dataTransfer.effectAllowed = "move";
                            }}
                        >
                            <DraggableTaskRow task={task} onEdit={onEditTask} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
