"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { TaskItem, Task } from "./TaskItem";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ViewOptionsPopover } from "./ViewOptionsPopover";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings } from "@/lib/actions";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const TaskDialog = dynamic(() => import("./TaskDialog").then(mod => mod.TaskDialog), {
    ssr: false,
});

interface TaskListWithSettingsProps {
    tasks: Task[];
    title?: string;
    listId?: number;
    labelId?: number;
    defaultDueDate?: Date | string;
    viewId: string;
    userId?: string;
    initialSettings?: ViewSettings;
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

    // Filter: energyLevel
    if (settings.filterEnergyLevel) {
        result = result.filter(task => task.energyLevel === settings.filterEnergyLevel);
    }

    // Filter: context
    if (settings.filterContext) {
        result = result.filter(task => task.context === settings.filterContext);
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
    userId,
    initialSettings
}: TaskListWithSettingsProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [settings, setSettings] = useState<ViewSettings>(initialSettings ?? defaultViewSettings);
    // If we have initialSettings, we don't need to wait for client-side fetch, so we are "mounted" (ready)
    const [mounted, setMounted] = useState(!!initialSettings);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Load initial settings only if not provided
    useEffect(() => {
        if (initialSettings) {
            setMounted(true);
            return;
        }

        setMounted(true);
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
                    filterEnergyLevel: savedSettings.filterEnergyLevel as any,
                    filterContext: savedSettings.filterContext as any,
                });
            }
        }
        loadSettings();
    }, [viewId, userId, initialSettings]);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingTask(null);
        setIsDialogOpen(true);
    };

    const processedTasks = useMemo(() => {
        return applyViewSettings(tasks, settings);
    }, [tasks, settings]);

    // Handle J/K Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            if (processedTasks.length === 0) return;

            if (e.key === "j") {
                setFocusedIndex(prev => Math.min(processedTasks.length - 1, prev + 1));
            } else if (e.key === "k") {
                setFocusedIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === "Enter" && focusedIndex >= 0) {
                handleEdit(processedTasks[focusedIndex]);
            } else if (e.key === "x" && focusedIndex >= 0) {
                // Future: Toggle completion directly if possible, or leave for now
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [processedTasks, focusedIndex, userId]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        return groupTasks(processedTasks, settings.groupBy);
    }, [processedTasks, settings.groupBy]);

    if (!mounted) {
        return <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-muted rounded-lg w-full" />
            <div className="h-64 bg-muted rounded-lg w-full" />
        </div>;
    }

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
                    {processedTasks.map((task, index) => (
                        <div
                            key={task.id}
                            onClick={() => handleEdit(task)}
                            className={cn(
                                "cursor-pointer rounded-lg transition-all",
                                focusedIndex === index && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background"
                            )}
                        >
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
                            {groupTasks.map((task) => {
                                const globalIndex = processedTasks.findIndex(t => t.id === task.id);
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => handleEdit(task)}
                                        className={cn(
                                            "cursor-pointer rounded-lg transition-all",
                                            focusedIndex === globalIndex && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background"
                                        )}
                                    >
                                        <TaskItem task={task} showListInfo={!listId} userId={userId} />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            <Suspense fallback={null}>
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
            </Suspense>
        </div>
    );
}
