"use client";

import { useState, useEffect, useMemo } from "react";
import { TaskItem, Task } from "./TaskItem";
import { TaskDialog } from "./TaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ViewOptionsPopover } from "./ViewOptionsPopover";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings } from "@/lib/actions";

interface TaskListWithSettingsProps {
    tasks: Task[];
    title?: string;
    listId?: number;
    labelId?: number;
    defaultDueDate?: Date | string;
    viewId: string;
    userId?: string;
}

/**
 * Applies view settings (filtering and sorting) to a list of tasks.
 */
function applyViewSettings(tasks: Task[], settings: ViewSettings): Task[] {
    let result = [...tasks];

    // Filter: showCompleted
    if (!settings.showCompleted) {
        result = result.filter(task => !task.isCompleted);
    }

    // Filter: date
    if (settings.filterDate === "hasDate") {
        result = result.filter(task => task.dueDate !== null);
    } else if (settings.filterDate === "noDate") {
        result = result.filter(task => task.dueDate === null);
    }

    // Filter: priority
    if (settings.filterPriority) {
        result = result.filter(task => task.priority === settings.filterPriority);
    }

    // Filter: label
    if (settings.filterLabelId !== null) {
        result = result.filter(task =>
            task.labels?.some(label => label.id === settings.filterLabelId)
        );
    }

    // Sort
    if (settings.sortBy !== "manual") {
        result.sort((a, b) => {
            let comparison = 0;

            switch (settings.sortBy) {
                case "dueDate":
                    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    comparison = aDate - bDate;
                    break;
                case "priority":
                    const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
                    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
                    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
                    comparison = aPriority - bPriority;
                    break;
                case "name":
                    comparison = a.title.localeCompare(b.title);
                    break;
            }

            return settings.sortOrder === "desc" ? -comparison : comparison;
        });
    }

    return result;
}

/**
 * Groups tasks by the specified grouping key.
 */
function groupTasks(tasks: Task[], groupBy: ViewSettings["groupBy"]): Map<string, Task[]> {
    const groups = new Map<string, Task[]>();

    if (groupBy === "none") {
        groups.set("", tasks);
        return groups;
    }

    for (const task of tasks) {
        let key = "";

        switch (groupBy) {
            case "dueDate":
                if (task.dueDate) {
                    const date = new Date(task.dueDate);
                    key = date.toLocaleDateString();
                } else {
                    key = "No Date";
                }
                break;
            case "priority":
                key = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "None";
                break;
            case "label":
                if (task.labels && task.labels.length > 0) {
                    key = task.labels.map(l => l.name).join(", ");
                } else {
                    key = "No Label";
                }
                break;
        }

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(task);
    }

    return groups;
}

export function TaskListWithSettings({
    tasks,
    title,
    listId,
    labelId,
    defaultDueDate,
    viewId,
    userId
}: TaskListWithSettingsProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [settings, setSettings] = useState<ViewSettings>(defaultViewSettings);

    // Load initial settings
    useEffect(() => {
        async function loadSettings() {
            if (!userId) return;
            const savedSettings = await getViewSettings(userId, viewId);
            if (savedSettings) {
                setSettings({
                    layout: savedSettings.layout || defaultViewSettings.layout,
                    showCompleted: savedSettings.showCompleted ?? defaultViewSettings.showCompleted,
                    groupBy: savedSettings.groupBy || defaultViewSettings.groupBy,
                    sortBy: savedSettings.sortBy || defaultViewSettings.sortBy,
                    sortOrder: savedSettings.sortOrder || defaultViewSettings.sortOrder,
                    filterDate: savedSettings.filterDate || defaultViewSettings.filterDate,
                    filterPriority: savedSettings.filterPriority,
                    filterLabelId: savedSettings.filterLabelId,
                });
            }
        }
        loadSettings();
    }, [viewId, userId]);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingTask(null);
        setIsDialogOpen(true);
    };

    // Apply filtering and sorting
    const processedTasks = useMemo(() => {
        return applyViewSettings(tasks, settings);
    }, [tasks, settings]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        return groupTasks(processedTasks, settings.groupBy);
    }, [processedTasks, settings.groupBy]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                <div className="flex items-center gap-2">
                    <ViewOptionsPopover
                        viewId={viewId}
                        userId={userId}
                        onSettingsChange={setSettings}
                    />
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                </div>
            </div>

            {processedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border rounded-lg border-dashed">
                    <p>No tasks found</p>
                    <Button variant="link" onClick={handleAdd}>Create one?</Button>
                </div>
            ) : settings.groupBy === "none" ? (
                <div className="space-y-2">
                    {processedTasks.map((task) => (
                        <div key={task.id} onClick={() => handleEdit(task)} className="cursor-pointer">
                            <TaskItem task={task} showListInfo={!listId} userId={userId} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(groupedTasks.entries()).map(([groupName, groupTasks]) => (
                        <div key={groupName} className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                                {groupName} ({groupTasks.length})
                            </h3>
                            {groupTasks.map((task) => (
                                <div key={task.id} onClick={() => handleEdit(task)} className="cursor-pointer">
                                    <TaskItem task={task} showListInfo={!listId} userId={userId} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <TaskDialog
                task={editingTask ?? undefined}
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
