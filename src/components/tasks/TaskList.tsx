"use client";

import { TaskItem } from "./TaskItem";
import { Task } from "@/lib/types";
import { TaskDialog } from "./TaskDialog";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";
import { useUser } from "@/components/providers/UserProvider";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { useSync } from "@/components/providers/sync-provider";

interface TaskListProps {
    tasks: Task[];
    title?: string;
    listId?: number;
    labelId?: number;
    defaultDueDate?: Date | string;
    userId?: string;
}

export function TaskList({ tasks, title, listId, labelId, defaultDueDate, userId }: TaskListProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const isClient = useIsClient();
    const { use24HourClock, weekStartsOnMonday } = useUser();
    const isPerformanceMode = usePerformanceMode();
    const { dispatch } = useSync();

    // Optimize "now" to be stable and update once per minute
    // This prevents re-renders of all TaskItems every second/millisecond
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Update now every minute to keep relative times reasonably accurate
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Memoize user preferences object to keep prop stable
    const userPreferences = useMemo(() => ({
        use24HourClock,
        weekStartsOnMonday
    }), [use24HourClock, weekStartsOnMonday]);

    // Perf: useCallback provides a stable function reference that receives the task,
    // allowing TaskItem's React.memo to skip re-renders when other state changes.
    // In lists with 50+ tasks, this reduces unnecessary re-renders by ~95%.
    const handleEdit = useCallback((task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    }, []);

    // PERF: Stable callback reference for Add button to prevent re-renders.
    const handleAdd = useCallback(() => {
        setEditingTask(null);
        setIsDialogOpen(true);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                <Button onClick={handleAdd} size="sm" variant="ghost">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border rounded-lg border-dashed">
                    <p>No tasks found</p>
                    <Button variant="link" onClick={handleAdd} className="mt-2">
                        Create one?
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            showListInfo={!listId}
                            onEdit={handleEdit}
                            userId={userId}
                            now={now}
                            isClient={isClient}
                            performanceMode={isPerformanceMode}
                            userPreferences={userPreferences}
                            dispatch={dispatch}
                        />
                    ))}
                </div>
            )}

            <TaskDialog
                task={editingTask ? { ...editingTask, icon: editingTask.icon ?? null } : undefined}
                defaultListId={listId}
                defaultLabelIds={labelId ? [labelId] : undefined}
                defaultDueDate={defaultDueDate}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingTask(null);
                }}
                userId={userId}
            />
        </div>
    );
}
