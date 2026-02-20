
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useReducer } from "react";
import dynamic from "next/dynamic";
import { format, isToday, isTomorrow, isThisYear } from "date-fns";

import { Task } from "@/lib/types";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings } from "@/lib/actions/view-settings";
import { useUser } from "@/components/providers/UserProvider";
import { useTaskStore } from "@/lib/store/task-store";
import { useSync } from "@/components/providers/sync-provider";
import { useIsClient } from "@/hooks/use-is-client";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { TaskListSkeleton } from "./TaskListSkeleton";
import { TaskItem } from "./TaskItem";
import { SortableTaskItem } from "./list/SortableTaskItem";
import { TaskListEmptyState } from "./list/TaskListEmptyState";
import { TaskListOverdueSection } from "./list/TaskListOverdueSection";
import { TaskListPeriodSection } from "./list/TaskListPeriodSection";
import { useTaskListView, PeriodPrecision } from "@/hooks/use-task-list-view";

// Extracted Components
import { ListHeader } from "./list/ListHeader";
import { CompletedTasksSection } from "./list/CompletedTasksSection";
import { GroupedListView } from "./list/GroupedListView";

const TaskDialog = dynamic(() => import("./TaskDialog").then(mod => mod.TaskDialog), { ssr: false });
const TaskBoardView = dynamic(() => import("./board/TaskBoardView").then(mod => mod.TaskBoardView), { ssr: false, loading: () => <TaskListSkeleton variant="board" compact /> });
const TaskCalendarLayout = dynamic(() => import("./calendar/TaskCalendarLayout").then(mod => mod.TaskCalendarLayout), { ssr: false, loading: () => <TaskListSkeleton variant="calendar" compact /> });

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface TaskListWithSettingsProps {
    tasks?: Task[];
    title?: string;
    listId?: number | null;
    labelId?: number;
    defaultDueDate?: Date | string;
    viewId: string;
    userId?: string;
    initialSettings?: ViewSettings;
    filterType?: "inbox" | "today" | "upcoming" | "all" | "completed";
}

function uiReducer(state: any, action: any) {
    switch (action.type) {
        case "SET_EDITING_TASK": return { ...state, editingTask: action.payload, isDialogOpen: true };
        case "SET_DIALOG_OPEN": return { ...state, isDialogOpen: action.payload };
        case "SET_CALENDAR_DATE": return { ...state, calendarSelectedDate: action.payload, isDialogOpen: true };
        case "SET_ACTIVE_ID": return { ...state, activeId: action.payload };
        case "TOGGLE_OVERDUE": return { ...state, overdueCollapsed: !state.overdueCollapsed };
        case "TOGGLE_PERIOD": return { ...state, periodCollapsed: { ...state.periodCollapsed, [action.payload]: !state.periodCollapsed[action.payload] } };
        case "CLOSE_DIALOG": return { ...state, isDialogOpen: false, editingTask: state.editingTask, calendarSelectedDate: undefined };
        case "CLEAR_TASK": return { ...state, editingTask: null };
        default: return state;
    }
}

export function TaskListWithSettings({ tasks, title, listId, labelId, defaultDueDate, viewId, userId, initialSettings, filterType }: TaskListWithSettingsProps) {
    const [uiState, dispatchUI] = useReducer(uiReducer, {
        editingTask: null, isDialogOpen: false, calendarSelectedDate: undefined,
        activeId: null, overdueCollapsed: false, periodCollapsed: { week: false, month: false, year: false }
    });
    const { editingTask, isDialogOpen, calendarSelectedDate, activeId, overdueCollapsed, periodCollapsed } = uiState;
    const { weekStartsOnMonday, use24HourClock } = useUser();
    const { dispatch } = useSync();
    const { tasks: storeTasksFn, setTasks, initialize, isInitialized } = useTaskStore();

    const isClient = useIsClient();
    const isPerformanceMode = usePerformanceMode();
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const userPreferences = useMemo(() => ({
        use24HourClock,
        weekStartsOnMonday
    }), [use24HourClock, weekStartsOnMonday]);

    const [settings, setSettings] = useState<ViewSettings>(initialSettings ?? (viewId === "upcoming" ? { ...defaultViewSettings, groupBy: "dueDate" } : defaultViewSettings));

    useEffect(() => { initialize(); if (tasks?.length) setTasks(tasks); }, [tasks, setTasks, initialize]);

    const { processedTasks, listTasks, periodSections, overdueTasks, activeTasks, completedTasks, groupedEntries, nonOverdueTasks, derivedTasks } = useTaskListView({
        allStoreTasks: Object.values(storeTasksFn), listId, labelId, filterType, tasksFromProps: tasks, weekStartsOnMonday: weekStartsOnMonday ?? undefined, settings
    });

    useEffect(() => {
        if (initialSettings || !userId) return;
        getViewSettings(userId, viewId).then(s => s && setSettings(prev => ({ ...prev, ...(s as any) })));
    }, [viewId, userId, initialSettings]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const isDragEnabled = settings.sortBy === "manual" && settings.groupBy === "none" && !!userId;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        dispatchUI({ type: "SET_ACTIVE_ID", payload: null });
        if (over && active.id !== over.id && userId) {
            const oldIndex = derivedTasks.findIndex(t => t.id === active.id);
            const newIndex = derivedTasks.findIndex(t => t.id === over.id);
            const newTasks = arrayMove(derivedTasks, oldIndex, newIndex);
            setTasks(newTasks);
            dispatch("reorderTasks", userId, newTasks.map((t, i) => ({ id: t.id, position: i }))).catch(console.error);
        }
    };

    const formattedGroupNames = useMemo(() => {
        const map = new Map<string, string>();
        if (settings.groupBy !== "dueDate") return map;
        groupedEntries.forEach(([groupName]) => {
            if (groupName === "No Date") return map.set(groupName, groupName);
            if (!groupName.includes(":")) {
                const d = new Date(groupName);
                return map.set(groupName, isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, isThisYear(d) ? "EEEE, MMM do" : "EEEE, MMM do, yyyy"));
            }
            const [p, iso] = groupName.split(":");
            const formatStr = ({ month: "LLLL yyyy", year: "yyyy", week: "'Week of' MMM d" } as any)[p] || "MMM d";
            map.set(groupName, format(new Date(iso), formatStr));
        });
        return map;
    }, [groupedEntries, settings.groupBy]);

    const groupedVirtualSections = useMemo(() => settings.groupBy === "none" ? [] : groupedEntries.map(([groupName, gTasks]) => {
        const active: Task[] = [], completed: Task[] = [];
        gTasks.forEach(t => (t.isCompleted ? completed : active).push(t));
        const items: ({ type: "task"; task: Task } | { type: "separator" })[] = active.map(t => ({ type: "task" as const, task: t }));
        if (active.length && completed.length) items.push({ type: "separator" });
        completed.forEach(t => items.push({ type: "task", task: t }));
        return { groupName, totalCount: gTasks.length, items };
    }), [groupedEntries, settings.groupBy]);

    const viewIndicator = useMemo(() => {
        if (settings.layout !== "list") return `Layout: ${settings.layout.charAt(0).toUpperCase() + settings.layout.slice(1)}`;
        if (settings.sortBy !== "manual") return `Sort: ${settings.sortBy.split(/(?=[A-Z])/).join(" ")}`;
        if (settings.groupBy !== "none") return `Group: ${settings.groupBy.split(/(?=[A-Z])/).join(" ")}`;
        return (settings.filterPriority || settings.filterLabelId !== null || settings.filterDate !== "all") ? "Filter: Active" : null;
    }, [settings]);

    if (!isInitialized) return <TaskListSkeleton variant={settings.layout} compact />;
    if ((settings.layout === "list" ? listTasks.length === 0 && periodSections.length === 0 : processedTasks.length === 0)) return <TaskListEmptyState filterType={filterType} viewId={viewId} />;

    return (
        <div className="space-y-4">
            <ListHeader title={title} viewId={viewId} userId={userId} viewIndicator={viewIndicator} settings={settings} onSettingsChange={setSettings} />

            {settings.layout === "board" ? <TaskBoardView tasks={processedTasks} userId={userId || ""} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} /> :
                settings.layout === "calendar" ? <TaskCalendarLayout tasks={processedTasks} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} onDateClick={d => dispatchUI({ type: "SET_CALENDAR_DATE", payload: d })} /> : (
                    <div className="space-y-6">
                        <TaskListOverdueSection overdueTasks={overdueTasks} overdueCollapsed={overdueCollapsed} onToggle={() => dispatchUI({ type: "TOGGLE_OVERDUE" })} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} listId={listId} userId={userId} dispatch={dispatch} onReschedule={() => overdueTasks.forEach(t => dispatch("updateTask", t.id, userId || "", { dueDate: new Date(), dueDatePrecision: null }))} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} />
                        {settings.groupBy === "none" ? (
                            <>
                                {activeTasks.length > 0 && (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => dispatchUI({ type: "SET_ACTIVE_ID", payload: e.active.id })} onDragEnd={handleDragEnd} onDragCancel={() => dispatchUI({ type: "SET_ACTIVE_ID", payload: null })} modifiers={[restrictToVerticalAxis]}>
                                        <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy} disabled={!isDragEnabled}>
                                            <div className="space-y-2">{activeTasks.map(t => <SortableTaskItem key={t.id} task={t} handleEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} listId={listId} userId={userId} isDragEnabled={isDragEnabled} dispatch={dispatch} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} />)}</div>
                                        </SortableContext>
                                        <DragOverlay>{activeId ? <div className="opacity-90 rotate-2 scale-105 cursor-grabbing"><TaskItem task={derivedTasks.find(t => t.id === activeId)!} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} /></div> : null}</DragOverlay>
                                    </DndContext>
                                )}
                                <CompletedTasksSection tasks={completedTasks} listId={listId} userId={userId} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} dispatch={dispatch} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} />
                            </>
                        ) : <GroupedListView groupedEntries={groupedEntries} groupedVirtualSections={groupedVirtualSections} formattedGroupNames={formattedGroupNames} listId={listId} userId={userId} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} dispatch={dispatch} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} />}
                        {periodSections.length > 0 && <div className="space-y-3 pt-2">{listTasks.length === 0 && <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">No tasks specifically for today.</div>}{periodSections.map(s => <TaskListPeriodSection key={s.precision} precision={s.precision} label={s.label} tasks={s.tasks} collapsed={periodCollapsed[s.precision]} onToggle={() => dispatchUI({ type: "TOGGLE_PERIOD", payload: s.precision })} listId={listId} userId={userId} onEdit={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })} dispatch={dispatch} now={now} isClient={isClient} performanceMode={isPerformanceMode} userPreferences={userPreferences} />)}</div>}
                    </div>
                )}
            <Suspense fallback={null}>
                <TaskDialog task={editingTask ? { ...editingTask, icon: editingTask.icon ?? null } : undefined} defaultListId={listId ?? undefined} defaultLabelIds={labelId ? [labelId] : undefined} defaultDueDate={calendarSelectedDate || defaultDueDate} open={isDialogOpen} onOpenChange={o => { dispatchUI({ type: "SET_DIALOG_OPEN", payload: o }); if (!o) { setTimeout(() => dispatchUI({ type: "CLEAR_TASK" }), 300); } }} userId={userId} />
            </Suspense>
        </div>
    );
}
