"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { TaskItem, Task } from "./TaskItem";
import { format, isToday, isTomorrow, isThisYear } from "date-fns";
import { ViewOptionsPopover } from "./ViewOptionsPopover";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings } from "@/lib/actions/view-settings";
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

    // Always sort completed tasks to the bottom to match visual split
    result.sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return 0;
        return a.isCompleted ? 1 : -1;
    });

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
                    // Use ISO date as key for sorting groups later, but we'll format it for display
                    key = format(date, "yyyy-MM-dd");
                } else {
                    key = "No Date";
                }
                break;
            case "priority":
                key = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "None";
                break;
            case "label":
                if (task.labels && task.labels.length > 0) {
                    // Start a new group for each label? Or cominbation?
                    // Typically "Group by Label" duplicates tasks or picks primary. 
                    // Let's pick the first one or join them.
                    // Joining them creates too many unique groups.
                    // Duplicating tasks is complex for ID tracking.
                    // Let's use the first label for now or a primary label if we had one.
                    // Or "Labels: A, B"
                    key = task.labels.map(l => l.name).sort().join(", ");
                } else {
                    key = "No Label";
                }
                break;
            case "list":
                key = task.listName || "Inbox";
                break;
            case "estimate":
                if (task.estimateMinutes) {
                    // Group by exact minutes or ranges? 
                    // Let's try flexible ranges if there are many, but for now exact string
                    const mins = task.estimateMinutes;
                    if (mins < 60) key = `${mins} m`;
                    else {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        key = m > 0 ? `${h}h ${m} m` : `${h} h`;
                    }
                } else {
                    key = "No Estimate";
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

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { reorderTasks } from "@/lib/actions/tasks";

// Sortable Task Component
function SortableTaskItem({
    task,
    handleEdit,
    listId,
    userId,
    isDragEnabled
}: {
    task: Task;
    handleEdit: (task: Task) => void;
    index: number;
    listId?: number;
    userId?: string;
    isDragEnabled: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: task.id,
        disabled: !isDragEnabled
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? "none" : transition,
        zIndex: isDragging ? 50 : 0,
        position: "relative" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            // Listeners are applied to the handle inside TaskItem via a prop? 
            // Better: Render Drag Handle in SortableTaskItem and pass it the listeners.
            // Or: Pass listeners to TaskItem and attach to handle.
            // Let's pass dragHandleProps to TaskItem.
            onClick={(e) => {
                if (e.defaultPrevented) return;
                handleEdit(task);
            }}
            className={cn(
                "cursor-pointer rounded-lg transition-all",
                isDragging ? "opacity-0" : ""
            )}
        >
            {/* If drag is enabled, we need to handle touch-action to prevent scrolling when dragging?
                Actually dnd-kit handles touch-action: none on the draggable element.
                But we want the whole card draggable?
                If we want the whole card draggable, attributes/listeners go on the container.
                But text selection might be an issue.
                Usually it's better to have a drag handle or long press.
                But requirements say "drag-and-drop tasks", often implies whole row.
                Lets keep it simple: whole row draggable.
             */}
            <TaskItem
                task={task}
                showListInfo={!listId}
                userId={userId}
                disableAnimations={isDragEnabled}
                dragHandleProps={isDragEnabled ? listeners : undefined}
            />
        </div>
    );
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

    // Default to dueDate grouping for upcoming view if not set
    const effectiveInitialSettings = useMemo(() => {
        const s = initialSettings ?? defaultViewSettings;
        if (viewId === "upcoming" && s.groupBy === "none") {
            return { ...s, groupBy: "dueDate" as const };
        }
        return s;
    }, [initialSettings, viewId]);

    const [settings, setSettings] = useState<ViewSettings>(effectiveInitialSettings);
    // If we have initialSettings, we don't need to wait for client-side fetch, so we are "mounted" (ready)
    const [mounted, setMounted] = useState(!!initialSettings);
    const [activeId, setActiveId] = useState<number | null>(null);

    // Local state for tasks to support optimistic UI updates during drag
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    // Sync local tasks with props when they change (and not dragging)
    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

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
                    filterEnergyLevel: savedSettings.filterEnergyLevel,
                    filterContext: savedSettings.filterContext,
                });
            }
        }
        loadSettings();
    }, [viewId, userId, initialSettings]);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const processedTasks = useMemo(() => {
        return applyViewSettings(localTasks, settings);
    }, [localTasks, settings]);

    // Filter completed tasks out if they shouldn't be shown
    const visibleTasks = useMemo(() => {
        if (!settings.showCompleted) {
            return processedTasks.filter(t => !t.isCompleted);
        }
        return processedTasks;
    }, [processedTasks, settings.showCompleted]);

    const { activeTasks, completedTasks } = useMemo(() => {
        // If sorting by manual, we might want to keep the order even for completed tasks?
        // But usually completed tasks are moved to the bottom.
        if (!settings.showCompleted) {
            return { activeTasks: processedTasks, completedTasks: [] };
        }
        return {
            activeTasks: processedTasks.filter(t => !t.isCompleted),
            completedTasks: processedTasks.filter(t => t.isCompleted)
        };
    }, [processedTasks, settings.showCompleted]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        const tasksToGroup = settings.groupBy === "none" ? activeTasks : visibleTasks;
        const groups = groupTasks(tasksToGroup, settings.groupBy);

        // Sort groups by date if grouping by dueDate
        if (settings.groupBy === "dueDate") {
            return new Map(Array.from(groups.entries()).sort((a, b) => {
                if (a[0] === "No Date") return 1;
                if (b[0] === "No Date") return -1;
                return a[0].localeCompare(b[0]);
            }));
        }

        // Sort groups by estimate (minutes)
        if (settings.groupBy === "estimate") {
            const parseMinutes = (s: string) => {
                if (s === "No Estimate") return Infinity;
                if (s.includes("h")) {
                    const parts = s.split(" ");
                    let total = 0;
                    for (const part of parts) {
                        if (part.endsWith("h")) total += parseInt(part) * 60;
                        if (part.endsWith("m")) total += parseInt(part);
                    }
                    return total;
                }
                return parseInt(s);
            };

            return new Map(Array.from(groups.entries()).sort((a, b) => {
                const mA = parseMinutes(a[0]);
                const mB = parseMinutes(b[0]);
                return mA - mB;
            }));
        }

        return groups;
    }, [activeTasks, visibleTasks, settings.groupBy]);

    const formatGroupName = (name: string, type: ViewSettings["groupBy"]) => {
        if (type !== "dueDate" || name === "No Date") return name;
        const date = new Date(name);
        if (isToday(date)) return "Today";
        if (isTomorrow(date)) return "Tomorrow";
        return format(date, isThisYear(date) ? "EEEE, MMM do" : "EEEE, MMM do, yyyy");
    };

    // Drag and Drop Logic
    const isDragEnabled = settings.sortBy === "manual" && settings.groupBy === "none" && !!userId;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = localTasks.findIndex((t) => t.id === active.id);
            const newIndex = localTasks.findIndex((t) => t.id === over.id);
            const newTasks = arrayMove(localTasks, oldIndex, newIndex);

            // Update local state immediately
            setLocalTasks(newTasks);

            // Server update
            if (userId) {
                const updates = newTasks.map((t, index) => ({
                    id: t.id,
                    position: index
                }));
                // Don't await to keep UI responsive
                reorderTasks(userId, updates).catch(console.error);
            }
        }
    };


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
                <div className="flex items-center gap-2 ml-auto">
                    <ViewOptionsPopover
                        viewId={viewId}
                        userId={userId}
                        onSettingsChange={setSettings}
                    />
                </div>
            </div>

            {processedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border rounded-lg border-dashed">
                    <p>No tasks found</p>
                </div>
            ) : settings.groupBy === "none" ? (
                <div className="space-y-6">
                    {/* Active Tasks */}
                    {activeTasks.length > 0 && (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragCancel={handleDragCancel}
                            modifiers={[restrictToVerticalAxis]}
                        >
                            <SortableContext
                                items={activeTasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                                disabled={!isDragEnabled}
                            >
                                <div className="space-y-2">
                                    {activeTasks.map((task, index) => (
                                        <SortableTaskItem
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            handleEdit={handleEdit}
                                            listId={listId}
                                            userId={userId}
                                            isDragEnabled={isDragEnabled}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                            <DragOverlay>
                                {activeId ? (
                                    <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                                        <TaskItem
                                            task={localTasks.find(t => t.id === activeId)!}
                                            showListInfo={!listId}
                                            userId={userId}
                                            disableAnimations={true}
                                        />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}

                    {/* Completed Tasks with Sticky Header */}
                    {completedTasks.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2 mb-2">
                                <span>Completed</span>
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{completedTasks.length}</span>
                            </h3>
                            <div className="space-y-2">
                                {completedTasks.map((task) => {
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={(e) => {
                                                if (e.defaultPrevented) return;
                                                handleEdit(task);
                                            }}
                                            className="cursor-pointer rounded-lg transition-all"
                                        >
                                            <TaskItem
                                                task={task}
                                                showListInfo={!listId}
                                                userId={userId}
                                                disableAnimations={true}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(groupedTasks.entries()).map(([groupName, groupTasks]) => {
                        const groupActiveTasks = groupTasks.filter(t => !t.isCompleted);
                        const groupCompletedTasks = groupTasks.filter(t => t.isCompleted);

                        return (
                            <div key={groupName} className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2">
                                    <span>{formatGroupName(groupName, settings.groupBy)}</span>
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
                                </h3>
                                {groupActiveTasks.map((task) => {
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={(e) => {
                                                if (e.defaultPrevented) return;
                                                handleEdit(task);
                                            }}
                                            className="cursor-pointer rounded-lg transition-all"
                                        >
                                            <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} />
                                        </div>
                                    );
                                })}

                                {groupCompletedTasks.length > 0 && (
                                    <>
                                        {groupActiveTasks.length > 0 && (
                                            <div className="ml-4 h-px bg-border/50 my-2" />
                                        )}
                                        {groupCompletedTasks.map((task) => {
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={(e) => {
                                                        if (e.defaultPrevented) return;
                                                        handleEdit(task);
                                                    }}
                                                    className="cursor-pointer rounded-lg transition-all"
                                                >
                                                    <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} />
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )
            }

            <Suspense fallback={null}>
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
            </Suspense>
        </div >
    );
}
