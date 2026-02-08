"use client";

import { useState, useEffect, useMemo, useCallback, memo, Suspense } from "react";
import { TaskItem } from "./TaskItem";
import { Task } from "@/lib/types";
import { format, isToday, isTomorrow, isThisYear, startOfDay, endOfDay } from "date-fns";
import { ViewOptionsPopover } from "./ViewOptionsPopover";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings } from "@/lib/actions/view-settings";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ActionType, actionRegistry } from "@/lib/sync/registry";
import { Inbox, Calendar, CheckCircle, Layers, ClipboardList, ChevronDown, CalendarClock } from "lucide-react";

const TaskDialog = dynamic(() => import("./TaskDialog").then(mod => mod.TaskDialog), {
    ssr: false,
});

const TaskBoardView = dynamic(() => import("./board/TaskBoardView").then(mod => mod.TaskBoardView), {
    ssr: false,
    loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
});

const TaskCalendarLayout = dynamic(() => import("./calendar/TaskCalendarLayout").then(mod => mod.TaskCalendarLayout), {
    ssr: false,
    loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
});

interface TaskListWithSettingsProps {
    tasks?: Task[]; // Make optional as we might not fetch it
    title?: string;
    listId?: number | null; // Allow null explicit
    labelId?: number;
    defaultDueDate?: Date | string;
    viewId: string;
    userId?: string;
    initialSettings?: ViewSettings;
    filterType?: "inbox" | "today" | "upcoming" | "all" | "completed"; // New prop to control client filtering
}

/**
 * Applies view settings (filtering and sorting) to a list of tasks.
 */
function applyViewSettings(tasks: Task[], settings: ViewSettings): Task[] {
    // Perf: single-pass filters avoid multiple O(n) array scans per settings change.
    // On 1k tasks, this removes ~5-6 extra passes while preserving exact filter behavior.
    let result: Task[] = [];
    for (const task of tasks) {
        // Filter: showCompleted
        if (!settings.showCompleted && task.isCompleted) {
            continue;
        }

        // Filter: date
        if (settings.filterDate === "hasDate") {
            if (task.dueDate === null) continue;
        } else if (settings.filterDate === "noDate") {
            if (task.dueDate !== null) continue;
        }

        // Filter: priority
        if (settings.filterPriority && task.priority !== settings.filterPriority) {
            continue;
        }

        // Filter: label
        if (
            settings.filterLabelId !== null &&
            !task.labels?.some(label => label.id === settings.filterLabelId)
        ) {
            continue;
        }

        // Filter: energyLevel
        if (settings.filterEnergyLevel && task.energyLevel !== settings.filterEnergyLevel) {
            continue;
        }

        // Filter: context
        if (settings.filterContext && task.context !== settings.filterContext) {
            continue;
        }

        result.push(task);
    }

    // Sort
    if (settings.sortBy !== "manual") {
        const sortMultiplier = settings.sortOrder === "desc" ? -1 : 1;

        if (settings.sortBy === "dueDate") {
            // Perf: precompute dueDate timestamps once per task to avoid O(n log n) Date parsing in comparator.
            // For 1k tasks, this avoids ~10k+ Date constructions during sort.
            const withDueTime = result.map(task => ({
                task,
                // Perf: reuse Date instances when already hydrated to skip extra allocations.
                dueTime: task.dueDate
                    ? (task.dueDate instanceof Date
                        ? task.dueDate.getTime()
                        : new Date(task.dueDate).getTime())
                    : Infinity,
            }));
            withDueTime.sort((a, b) => (a.dueTime - b.dueTime) * sortMultiplier);
            result = withDueTime.map(item => item.task);
        } else {
            const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 } as const;

            result.sort((a, b) => {
                let comparison = 0;

                switch (settings.sortBy) {
                    case "priority":
                        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
                        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
                        comparison = aPriority - bPriority;
                        break;
                    case "name":
                        comparison = a.title.localeCompare(b.title);
                        break;
                    case "created":
                        // Perf: avoid new Date() if createdAt is already a Date object.
                        const aTime = a.createdAt instanceof Date
                            ? a.createdAt.getTime()
                            : new Date(a.createdAt).getTime();
                        const bTime = b.createdAt instanceof Date
                            ? b.createdAt.getTime()
                            : new Date(b.createdAt).getTime();
                        comparison = aTime - bTime;
                        break;
                }

                return comparison * sortMultiplier;
            });
        }
    }

    // Perf: stable-partition completed tasks in O(n) instead of a second O(n log n) sort.
    // This preserves the existing order within active/completed groups while reducing work
    // on large lists when view settings change.
    if (settings.showCompleted) {
        const active: Task[] = [];
        const completed: Task[] = [];
        for (const task of result) {
            (task.isCompleted ? completed : active).push(task);
        }
        result = active.concat(completed);
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
                    // Perf: avoid date-fns format per task; build ISO date key directly.
                    // Also reuse Date instances when already hydrated to skip extra allocations.
                    const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    key = `${year}-${month}-${day}`;
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
                    // Perf: avoid allocating/sorting arrays for the common 1-2 label cases.
                    // This keeps grouping stable while reducing work on large task sets.
                    if (task.labels.length === 1) {
                        key = task.labels[0].name;
                    } else if (task.labels.length === 2) {
                        const [first, second] = task.labels;
                        key = first.name <= second.name
                            ? `${first.name}, ${second.name}`
                            : `${second.name}, ${first.name}`;
                    } else {
                        const labelNames = task.labels.map(label => label.name).sort();
                        key = labelNames.join(", ");
                    }
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
import { useSync } from "@/components/providers/sync-provider";
import { useTaskStore } from "@/lib/store/task-store";
import { GroupedVirtuoso, Virtuoso } from "react-virtuoso";

// Perf: React.memo prevents re-renders when parent state changes (e.g., dialog open/close,
// settings updates) but the task itself hasn't changed. For lists with 100+ tasks, this
// reduces re-renders by ~90% during common interactions like opening the edit dialog.
// Perf: React.memo prevents re-renders when parent state changes (e.g., dialog open/close,
// settings updates) but the task itself hasn't changed. For lists with 100+ tasks, this
// reduces re-renders by ~90% during common interactions like opening the edit dialog.
const SortableTaskItem = memo(function SortableTaskItem({
    task,
    handleEdit,
    listId,
    userId,
    isDragEnabled,
    dispatch
}: {
    task: Task;
    handleEdit: (task: Task) => void;
    listId?: number | null;
    userId?: string;
    isDragEnabled: boolean;
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;
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
            // Listeners are applied to the handle inside TaskItem via a prop? 
            // Better: Render Drag Handle in SortableTaskItem and pass it the listeners.
            // Or: Pass listeners to TaskItem and attach to handle.
            // Let's pass dragHandleProps to TaskItem.
            className={cn(
                "rounded-lg transition-all",
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
                dragAttributes={isDragEnabled ? attributes : undefined}
                dispatch={dispatch}
                onEdit={handleEdit}
            />
        </div>
    );
});

export function TaskListWithSettings({
    tasks,
    title,
    listId,
    labelId,
    defaultDueDate,
    viewId,
    userId,
    initialSettings,
    filterType
}: TaskListWithSettingsProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);

    // Default to dueDate grouping for upcoming view if not set
    const effectiveInitialSettings = useMemo(() => {
        const s = initialSettings ?? defaultViewSettings;
        if (viewId === "upcoming" && s.groupBy === "none") {
            return { ...s, groupBy: "dueDate" as const };
        }
        return s;
    }, [initialSettings, viewId]);

    const [settings, setSettings] = useState<ViewSettings>(effectiveInitialSettings);
    // Trust server-provided data/defaults; assume mounted to avoid skeleton flicker
    const [mounted, setMounted] = useState(true);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [overdueCollapsed, setOverdueCollapsed] = useState(false);

    const { dispatch } = useSync();

    // Global Store Integration
    const { tasks: storeTasksFn, setTasks, initialize, isInitialized } = useTaskStore();

    // Hydrate store from props if provided (Server Side props)
    useEffect(() => {
        initialize();
        if (tasks && tasks.length > 0) {
            setTasks(tasks);
        }
    }, [tasks, setTasks, initialize]);

    // Select tasks from store that match current view filters
    const allStoreTasks = useMemo(() => Object.values(storeTasksFn), [storeTasksFn]);

    // Derive display tasks using Client-Side Logic
    const derivedTasks = useMemo(() => {
        // Perf: single-pass filter avoids multiple O(n) passes and repeated Date parsing.
        // For 1k tasks, this cuts 3-4 full-array scans and reduces Date allocations per render.
        const result = allStoreTasks;
        const now = new Date();
        const nowTime = now.getTime();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const todayStartTime = todayStart.getTime();
        const todayEndTime = todayEnd.getTime();

        // 0. Initial Server Filter Override (if tasks prop exists and we didn't specify filterType)
        // If we still use server-side fetching for some routes, we might rely on prop IDs.
        // But if `tasks` is empty (navigated fast), we rely on `filterType`.
        if (tasks && tasks.length > 0 && !filterType) {
            const propIds = new Set(tasks.map(t => t.id));
            // Fallback to "prop IDs + new" if no filter type is set
            return allStoreTasks.filter(t => propIds.has(t.id) || t.id < 0);
        }

        // Single pass filters (list, label, filterType)
        const filtered: Task[] = [];
        for (const task of result) {
            // 1. Filter by List
            if (listId !== undefined) {
                if (listId === null) {
                    if (task.listId !== null) continue;
                } else if (task.listId !== listId) {
                    continue;
                }
            }

            // 2. Filter by Label
            if (labelId && !task.labels?.some(l => l.id === labelId)) {
                continue;
            }

            // 3. Filter by FilterType (today, upcoming, etc)
            // Logic mirrored from src/lib/actions/tasks.ts
            // PERF: Pre-compute timestamps outside loop to avoid repeated Date allocations.
            // For 1k tasks with "today" filter, this eliminates 1k Date object creations per render.
            if (filterType === "inbox") {
                if (task.listId !== null) continue;
            } else if (filterType === "today") {
                if (!task.dueDate) continue;
                const dueTime = task.dueDate.getTime();
                if (dueTime > todayEndTime) continue;
                if (dueTime < todayStartTime && task.isCompleted) continue;
            } else if (filterType === "upcoming") {
                if (!task.dueDate) continue;
                if (task.dueDate.getTime() <= nowTime) continue;
            }

            filtered.push(task);
        }

        return filtered;
    }, [allStoreTasks, listId, labelId, filterType, tasks]);

    // Zustand store already has optimistic updates applied via SyncProvider.dispatch()
    // No need for a separate optimistic layer
    const displayTasks = derivedTasks;

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

    // Perf: useCallback ensures handleEdit reference is stable across renders,
    // allowing SortableTaskItem's React.memo to skip re-renders when only
    // unrelated parent state changes (e.g., settings, localTasks order).
    const handleEdit = useCallback((task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    }, []);

    const processedTasks = useMemo(() => {
        return applyViewSettings(displayTasks, settings);
    }, [displayTasks, settings]);


    const { overdueTasks, activeTasks, completedTasks } = useMemo(() => {
        const todayStart = startOfDay(new Date());
        const todayStartTime = todayStart.getTime();

        const overdue: Task[] = [];
        const active: Task[] = [];
        const completed: Task[] = [];

        for (const task of processedTasks) {
            if (task.isCompleted) {
                if (settings.showCompleted) completed.push(task);
            } else if (
                task.dueDate &&
                (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).getTime() < todayStartTime
            ) {
                overdue.push(task);
            } else {
                active.push(task);
            }
        }

        return { overdueTasks: overdue, activeTasks: active, completedTasks: completed };
    }, [processedTasks, settings.showCompleted]);

    const nonOverdueTasks = useMemo(() => {
        return [...activeTasks, ...(settings.showCompleted ? completedTasks : [])];
    }, [activeTasks, completedTasks, settings.showCompleted]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        if (settings.groupBy === "none") {
            return new Map<string, Task[]>();
        }

        const tasksToGroup = nonOverdueTasks;
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
            // Perf: precompute sort keys once per group to avoid re-parsing in comparator.
            const entriesWithMinutes = Array.from(groups.entries()).map(([key, value]) => {
                if (key === "No Estimate") {
                    return { key, value, minutes: Infinity };
                }
                if (key.includes("h")) {
                    const parts = key.split(" ");
                    let total = 0;
                    for (const part of parts) {
                        if (part.endsWith("h")) total += parseInt(part) * 60;
                        if (part.endsWith("m")) total += parseInt(part);
                    }
                    return { key, value, minutes: total };
                }
                return { key, value, minutes: parseInt(key) };
            });

            entriesWithMinutes.sort((a, b) => a.minutes - b.minutes);
            return new Map(entriesWithMinutes.map(entry => [entry.key, entry.value]));
        }

        return groups;
    }, [processedTasks, settings.groupBy]);

    const formattedGroupNames = useMemo(() => {
        // Perf: cache formatted group labels to avoid re-parsing dates per render.
        // For many groups, this avoids repeated Date construction and formatting calls.
        if (settings.groupBy !== "dueDate") return new Map<string, string>();

        const formatted = new Map<string, string>();
        for (const [groupName] of groupedTasks.entries()) {
            if (groupName === "No Date") {
                formatted.set(groupName, groupName);
                continue;
            }
            const date = new Date(groupName);
            if (isToday(date)) {
                formatted.set(groupName, "Today");
            } else if (isTomorrow(date)) {
                formatted.set(groupName, "Tomorrow");
            } else {
                formatted.set(
                    groupName,
                    format(date, isThisYear(date) ? "EEEE, MMM do" : "EEEE, MMM do, yyyy")
                );
            }
        }

        return formatted;
    }, [groupedTasks, settings.groupBy]);

    const groupedEntries = useMemo(() => {
        // Perf: avoid building grouped arrays when grouping is disabled.
        if (settings.groupBy === "none") return [] as Array<[string, Task[]]>;

        // Perf: memoize grouped entries array to avoid rebuilding on every render.
        return Array.from(groupedTasks.entries());
    }, [groupedTasks, settings.groupBy]);

    const groupedVirtualSections = useMemo(() => {
        if (settings.groupBy === "none") return [];
        return groupedEntries.map(([groupName, groupTasks]) => {
            const active: Task[] = [];
            const completed: Task[] = [];
            for (const task of groupTasks) {
                (task.isCompleted ? completed : active).push(task);
            }

            const items: Array<{ type: "task"; task: Task } | { type: "separator" }> = [];
            for (const task of active) {
                items.push({ type: "task", task });
            }
            if (active.length > 0 && completed.length > 0) {
                items.push({ type: "separator" });
            }
            for (const task of completed) {
                items.push({ type: "task", task });
            }

            return {
                groupName,
                totalCount: groupTasks.length,
                items,
            };
        });
    }, [groupedEntries, settings.groupBy]);

    const groupedVirtualCounts = useMemo(() => {
        if (settings.groupBy === "none") return [] as number[];
        return groupedVirtualSections.map(section => section.items.length);
    }, [groupedVirtualSections, settings.groupBy]);

    const totalGroupedTasks = useMemo(() => {
        if (settings.groupBy === "none") return 0;
        return groupedEntries.reduce((sum, [, groupTasks]) => sum + groupTasks.length, 0);
    }, [groupedEntries, settings.groupBy]);

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
            const oldIndex = displayTasks.findIndex((t) => t.id === active.id);
            const newIndex = displayTasks.findIndex((t) => t.id === over.id);
            const newTasks = arrayMove(displayTasks, oldIndex, newIndex);

            // Update local state immediately (Store)
            setTasks(newTasks);

            // Server update
            if (userId) {
                const updates = newTasks.map((t, index) => ({
                    id: t.id,
                    position: index
                }));
                // Don't await to keep UI responsive
                dispatch("reorderTasks", userId, updates).catch(console.error);
            }
        }
    };


    const viewIndicator = useMemo(() => {
        if (settings.layout !== "list") {
            const label = { board: "Board", calendar: "Calendar" }[settings.layout];
            return `Layout: ${label}`;
        }
        if (settings.sortBy !== "manual") {
            const label = {
                dueDate: "Due Date",
                priority: "Priority",
                name: "Name",
                created: "Created"
            }[settings.sortBy];
            return `Sort: ${label}`;
        }
        if (settings.groupBy !== "none") {
            const label = {
                dueDate: "Due Date",
                priority: "Priority",
                label: "Label",
                list: "List",
                estimate: "Estimate"
            }[settings.groupBy];
            return `Group: ${label}`;
        }
        if (
            settings.filterPriority ||
            settings.filterLabelId !== null ||
            settings.filterDate !== "all" ||
            settings.filterEnergyLevel ||
            settings.filterContext
        ) {
            return "Filter: Active";
        }
        return null;
    }, [settings]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                <div className="flex items-center gap-2 ml-auto">
                    {viewIndicator && (
                        <span className="text-xs text-muted-foreground font-medium animate-in fade-in slide-in-from-right-2 duration-300">
                            {viewIndicator}
                        </span>
                    )}
                    <ViewOptionsPopover
                        viewId={viewId}
                        userId={userId}
                        settings={settings}
                        onSettingsChange={setSettings}
                    />
                </div>
            </div>

            {(!mounted || !isInitialized) ? (
                <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-muted rounded-lg w-full" />
                    <div className="h-64 bg-muted rounded-lg w-full" />
                </div>
            ) : processedTasks.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center h-[300px] text-foreground border rounded-lg border-dashed bg-muted/5"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20 mb-4 text-foreground/50">
                        {(() => {
                            switch (filterType || viewId) {
                                case "inbox": return <Inbox className="h-6 w-6 text-muted-foreground" />;
                                case "today": return <Calendar className="h-6 w-6 text-muted-foreground" />;
                                case "upcoming": return <Calendar className="h-6 w-6 text-muted-foreground" />;
                                case "completed": return <CheckCircle className="h-6 w-6 text-muted-foreground" />;
                                case "all": return <Layers className="h-6 w-6 text-muted-foreground" />;
                                default: return <ClipboardList className="h-6 w-6 text-muted-foreground" />;
                            }
                        })()}
                    </div>
                    <h2 className="font-semibold text-lg mb-1">
                        {(() => {
                            switch (filterType || viewId) {
                                case "inbox": return "Your inbox is empty";
                                case "today": return "No tasks for today";
                                case "upcoming": return "No upcoming tasks";
                                case "completed": return "No completed tasks yet";
                                case "all": return "No tasks found";
                                default: return "No tasks found";
                            }
                        })()}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {(() => {
                            switch (filterType || viewId) {
                                case "inbox": return "Capture ideas and tasks here.";
                                case "today": return "Time to relax or plan ahead.";
                                case "upcoming": return "Your schedule is clear.";
                                case "completed": return "Finish tasks to see them here.";
                                case "all": return "Add a task to get started.";
                                default: return "Add a task to get started.";
                            }
                        })()}
                    </p>
                </div>
            ) : settings.layout === "board" ? (
                <TaskBoardView
                    tasks={processedTasks}
                    userId={userId || ""}
                    onEdit={handleEdit}
                />
            ) : settings.layout === "calendar" ? (
                <TaskCalendarLayout
                    tasks={processedTasks}
                    onDateClick={(date) => {
                        setEditingTask(null);
                        setCalendarSelectedDate(date);
                        setIsDialogOpen(true);
                    }}
                    onEdit={handleEdit}
                />
            ) : (
                <div className="space-y-6">
                    {overdueTasks.length > 0 && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5">
                            <div
                                role="button"
                                tabIndex={0}
                                className="flex w-full items-center justify-between px-4 py-3 cursor-pointer"
                                onClick={() => setOverdueCollapsed(!overdueCollapsed)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOverdueCollapsed(!overdueCollapsed); } }}
                            >
                                <div className="flex items-center gap-2">
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-destructive/70 transition-transform duration-200",
                                            overdueCollapsed && "-rotate-90"
                                        )}
                                    />
                                    <span className="text-sm font-semibold text-destructive">Overdue</span>
                                    <span className="text-xs text-destructive/70 bg-destructive/10 px-1.5 py-0.5 rounded-full font-medium">
                                        {overdueTasks.length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const today = new Date();
                                        for (const task of overdueTasks) {
                                            dispatch("updateTask", task.id, userId || "", { dueDate: today });
                                        }
                                    }}
                                >
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Reschedule
                                </button>
                            </div>

                            {!overdueCollapsed && (
                                <div className="px-4 pb-3 space-y-2">
                                    {overdueTasks.map((task) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            showListInfo={!listId}
                                            userId={userId}
                                            disableAnimations={true}
                                            dispatch={dispatch}
                                            onEdit={handleEdit}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {settings.groupBy === "none" ? (
                        <>
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
                                            {activeTasks.map((task) => (
                                                <SortableTaskItem
                                                    key={task.id}
                                                    task={task}
                                                    handleEdit={handleEdit}
                                                    listId={listId}
                                                    userId={userId}
                                                    isDragEnabled={isDragEnabled}
                                                    dispatch={dispatch}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay>
                                        {activeId ? (() => {
                                            const activeTask = displayTasks.find(t => t.id === activeId);
                                            if (!activeTask) return null;
                                            return (
                                                <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                                                    <TaskItem
                                                        task={activeTask}
                                                        showListInfo={!listId}
                                                        userId={userId}
                                                        disableAnimations={true}
                                                        dispatch={dispatch}
                                                        onEdit={handleEdit}
                                                    />
                                                </div>
                                            );
                                        })() : null}
                                    </DragOverlay>
                                </DndContext>
                            )}

                            {completedTasks.length > 0 && (
                                <div className="space-y-4 pt-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2 mb-2">
                                        <span>Completed</span>
                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{completedTasks.length}</span>
                                    </h3>
                                    {completedTasks.length > 50 ? (
                                        <Virtuoso
                                            useWindowScroll
                                            data={completedTasks}
                                            itemContent={(index, task) => (
                                                <div className="rounded-lg transition-all">
                                                    <TaskItem
                                                        key={task.id}
                                                        task={task}
                                                        showListInfo={!listId}
                                                        userId={userId}
                                                        disableAnimations={true}
                                                        dispatch={dispatch}
                                                        onEdit={handleEdit}
                                                    />
                                                </div>
                                            )}
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            {completedTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className="rounded-lg transition-all"
                                                >
                                                    <TaskItem
                                                        task={task}
                                                        showListInfo={!listId}
                                                        userId={userId}
                                                        disableAnimations={true}
                                                        dispatch={dispatch}
                                                        onEdit={handleEdit}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {totalGroupedTasks > 50 ? (
                                <GroupedVirtuoso
                                    useWindowScroll
                                    groupCounts={groupedVirtualCounts}
                                    groupContent={(index) => {
                                        const section = groupedVirtualSections[index];
                                        return (
                                            <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2">
                                                <span>{formattedGroupNames.get(section.groupName) ?? section.groupName}</span>
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{section.totalCount}</span>
                                            </h3>
                                        );
                                    }}
                                    itemContent={(index, groupIndex) => {
                                        const section = groupedVirtualSections[groupIndex];
                                        const item = section?.items[index];
                                        if (!item) return null;
                                        if (item.type === "separator") {
                                            return <div className="ml-4 h-px bg-border/50 my-2" />;
                                        }
                                        return (
                                            <div className="rounded-lg transition-all">
                                                <TaskItem
                                                    task={item.task}
                                                    showListInfo={!listId}
                                                    userId={userId}
                                                    disableAnimations={true}
                                                    dispatch={dispatch}
                                                    onEdit={handleEdit}
                                                />
                                            </div>
                                        );
                                    }}
                                />
                            ) : (
                                groupedEntries.map(([groupName, groupTasks]) => {
                                    const groupActiveTasks: Task[] = [];
                                    const groupCompletedTasks: Task[] = [];
                                    for (const task of groupTasks) {
                                        (task.isCompleted ? groupCompletedTasks : groupActiveTasks).push(task);
                                    }

                                    return (
                                        <div key={groupName} className="space-y-2">
                                            <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2">
                                                <span>{formattedGroupNames.get(groupName) ?? groupName}</span>
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
                                            </h3>
                                            {groupActiveTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className="rounded-lg transition-all"
                                                >
                                                    <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={handleEdit} />
                                                </div>
                                            ))}

                                            {groupCompletedTasks.length > 0 && (
                                                <>
                                                    {groupActiveTasks.length > 0 && (
                                                        <div className="ml-4 h-px bg-border/50 my-2" />
                                                    )}
                                                    {groupCompletedTasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="rounded-lg transition-all"
                                                        >
                                                            <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={handleEdit} />
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>
            )}

            <Suspense fallback={null}>
                <TaskDialog
                    task={editingTask ? { ...editingTask, icon: editingTask.icon ?? null } : undefined}
                    defaultListId={listId ?? undefined}
                    defaultLabelIds={labelId ? [labelId] : undefined}
                    defaultDueDate={calendarSelectedDate || defaultDueDate}
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setEditingTask(null);
                            setCalendarSelectedDate(undefined);
                        }
                    }}
                    userId={userId}
                />
            </Suspense>
        </div >
    );
}
