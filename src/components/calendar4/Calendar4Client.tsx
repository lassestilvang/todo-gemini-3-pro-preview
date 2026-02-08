"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { EventCalendar } from "@/components/calendar4/event-calendar";
import { CalendarSidebar } from "@/components/calendar2/CalendarSidebar";
import { UnplannedColumn } from "./UnplannedColumn";
import { TodayColumn } from "./TodayColumn";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { addMinutes, startOfDay, isSameDay, isToday } from "date-fns";
import type { Task } from "@/lib/types";

interface Calendar4ClientProps {
    initialTasks: Task[];
    initialLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
}

function normalizeDate(d: Date | string | null): Date | null {
    if (!d) return null;
    return d instanceof Date ? d : new Date(d);
}

export function Calendar4Client({ initialTasks, initialLists }: Calendar4ClientProps) {
    const { tasks: taskMap, setTasks, upsertTask } = useTaskStore();
    const { lists: listMap, setLists } = useListStore();
    const { dispatch } = useSync();
    const { userId } = useUser();

    // --- Initial Data Sync ---
    useEffect(() => {
        if (Object.keys(taskMap).length === 0 && initialTasks.length > 0) {
            setTasks(initialTasks);
        }
    }, [initialTasks, setTasks, taskMap]);

    useEffect(() => {
        if (Object.keys(listMap).length === 0 && initialLists.length > 0) {
            setLists(initialLists);
        }
    }, [initialLists, listMap, setLists]);

    const tasks = useMemo(() => {
        const storeTasks = Object.values(taskMap) as Task[];
        return storeTasks.length > 0 ? storeTasks : initialTasks;
    }, [taskMap, initialTasks]);

    const lists = useMemo(() => {
        const storeLists = Object.values(listMap);
        return storeLists.length > 0 ? storeLists : initialLists;
    }, [listMap, initialLists]);

    // --- List Visibility ---
    const [visibleListIds, setVisibleListIds] = useState<Set<number | null>>(new Set([null]));
    const listVisibilityInitialized = useRef(false);

    useEffect(() => {
        if (listVisibilityInitialized.current) return;
        if (lists.length === 0) return;
        setVisibleListIds(new Set([null, ...lists.map((list) => list.id)]));
        listVisibilityInitialized.current = true;
    }, [lists]);

    const toggleList = useCallback((listId: number | null) => {
        setVisibleListIds((prev) => {
            const next = new Set(prev);
            if (next.has(listId)) next.delete(listId);
            else next.add(listId);
            return next;
        });
    }, []);

    const toggleAll = useCallback((checked: boolean) => {
        setVisibleListIds(checked ? new Set([null, ...lists.map((l) => l.id)]) : new Set());
    }, [lists]);

    const [selectedListId, setSelectedListId] = useState<number | null>(null);

    // --- Task Filtering ---
    const unplannedTasks = useMemo(() => {
        return tasks.filter(t => !t.isCompleted && !t.dueDate && (selectedListId === null || t.listId === selectedListId));
    }, [tasks, selectedListId]);

    const todayTasks = useMemo(() => {
        const now = new Date();
        return tasks.filter(t => {
            const d = normalizeDate(t.dueDate);
            return !t.isCompleted && d && isSameDay(d, now);
        });
    }, [tasks]);

    const todayDoneTasks = useMemo(() => {
        const now = new Date();
        return tasks.filter(t => {
            const d = normalizeDate(t.dueDate);
            return t.isCompleted && d && isSameDay(d, now);
        });
    }, [tasks]);

    // --- Event Mapping ---
    const events = useMemo(() => {
        return tasks
            .filter((t) => !t.isCompleted && visibleListIds.has(t.listId ?? null) && t.dueDate)
            .map((t) => {
                const start = normalizeDate(t.dueDate)!;
                let end = start;
                if (t.estimateMinutes) {
                    end = addMinutes(start, t.estimateMinutes);
                }

                const list = lists.find((l) => l.id === t.listId);
                const color = list?.color ?? "#71717a"; // Default gray

                return {
                    id: String(t.id),
                    title: t.title,
                    start: start.toISOString(),
                    end: t.estimateMinutes ? end.toISOString() : undefined,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: { taskId: t.id },
                    allDay: !t.estimateMinutes,
                };
            });
    }, [tasks, visibleListIds, lists]);

    // --- Handlers ---
    const handleEventDrop = useCallback((info: any) => {
        const taskId = Number(info.event.extendedProps.taskId);
        if (!taskId || !userId) return;

        const existing = taskMap[taskId];
        if (!existing) return;

        const newDueDate = info.event.start;
        if (!newDueDate) return;

        upsertTask({ ...existing, dueDate: newDueDate });
        dispatch("updateTask", taskId, userId, { dueDate: newDueDate, expectedUpdatedAt: existing.updatedAt ?? null });
    }, [dispatch, taskMap, userId, upsertTask]);

    const handleEventResize = useCallback((info: any) => {
        const taskId = Number(info.event.extendedProps.taskId);
        if (!taskId || !userId) return;

        const existing = taskMap[taskId];
        if (!existing) return;

        const start = info.event.start;
        const end = info.event.end;
        if (!start || !end) return;

        const estimateMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

        upsertTask({ ...existing, estimateMinutes });
        dispatch("updateTask", taskId, userId, { estimateMinutes, expectedUpdatedAt: existing.updatedAt ?? null });
    }, [dispatch, taskMap, userId, upsertTask]);

    const handleEventReceive = useCallback((info: any) => {
        const taskId = Number(info.event.extendedProps.taskId);
        if (!taskId || !userId) return;

        const existing = taskMap[taskId];
        // If task is internal drag (shouldn't happen with droppable=true + external, but good to check)
        // Actually eventReceive is for external events.

        // We need to remove the temporary element fullcalendar creates? 
        // No, FullCalendar handles the DOM. We just update state.
        // But wait, if we update state, the event will come back via `events` prop.
        // We should ensure we remove the event that FullCalendar added locally?
        // info.revert() removes the element if we want to manage it purely via state. 
        // Usually with React + FullCalendar managed events, we revert and let state update rendering.
        info.revert();

        if (!existing) return;

        const newDueDate = info.event.start;
        if (!newDueDate) return;

        // If dropped on all-day slot, it might not have time.
        // Check info.view.type or info.event.allDay

        upsertTask({ ...existing, dueDate: newDueDate });
        dispatch("updateTask", taskId, userId, { dueDate: newDueDate, expectedUpdatedAt: existing.updatedAt ?? null });
    }, [dispatch, taskMap, userId, upsertTask]);


    // --- Quick Create ---
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [quickCreateDate, setQuickCreateDate] = useState<Date | undefined>(undefined);

    const handleDateClick = useCallback((info: any) => {
        setQuickCreateDate(info.date);
        setQuickCreateOpen(true);
    }, []);

    // --- Edit Task ---
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const handleEventClick = useCallback((info: any) => {
        const taskId = Number(info.event.extendedProps.taskId);
        const task = taskMap[taskId];
        if (task) setEditingTask(task);
    }, [taskMap]);

    const selectedListName = useMemo(() => {
        if (!selectedListId) return "Unplanned";
        const list = lists.find(l => l.id === selectedListId);
        return list ? list.name : "Unplanned";
    }, [selectedListId, lists]);

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            <CalendarSidebar
                lists={lists}
                visibleListIds={visibleListIds}
                onToggleList={toggleList}
                onToggleAll={toggleAll}
                selectedListId={selectedListId}
                onSelectList={setSelectedListId}
            />

            {/* 3-Column Layout Container */}
            <div className="flex-1 flex min-w-0">
                {/* Column 1: Unplanned */}
                <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-background/50">
                    <UnplannedColumn
                        tasks={unplannedTasks}
                        listName={selectedListName}
                        onEditTask={setEditingTask}
                    />
                </div>

                {/* Column 2: Today */}
                <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-background/50">
                    <TodayColumn
                        tasks={todayTasks}
                        doneTasks={todayDoneTasks}
                        onEditTask={setEditingTask}
                    />
                </div>

                {/* Column 3: Calendar */}
                <div className="flex-1 min-w-0 flex flex-col bg-background">
                    <EventCalendar
                        height="100%"
                        initialView="timeGridWeek" // Default to week view as per screenshot usually? Or Month. Let's keep Month or switch to timeGridWeek as it fits drag-drop better for time assignment.
                        // Screenshot showed "Jan 2024 3W" -> looks like a week view.
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                        }}
                        events={events}
                        editable={true}
                        droppable={true}
                        selectable={true}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        eventResize={handleEventResize}
                        eventReceive={handleEventReceive}
                        availableViews={['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']}
                    />
                </div>
            </div>

            <CalendarQuickCreateDialog
                open={quickCreateOpen}
                onOpenChange={setQuickCreateOpen}
                defaultDueDate={quickCreateDate}
                userId={userId}
            />

            <TaskDialog
                task={editingTask ? {
                    id: editingTask.id,
                    title: editingTask.title,
                    description: editingTask.description,
                    icon: editingTask.icon ?? null,
                    priority: editingTask.priority,
                    listId: editingTask.listId,
                    dueDate: normalizeDate(editingTask.dueDate),
                    deadline: normalizeDate(editingTask.deadline),
                    isRecurring: editingTask.isRecurring,
                    recurringRule: editingTask.recurringRule,
                    energyLevel: editingTask.energyLevel,
                    context: editingTask.context,
                    isHabit: editingTask.isHabit,
                    estimateMinutes: editingTask.estimateMinutes,
                    labels: editingTask.labels,
                } : undefined}
                open={!!editingTask}
                onOpenChange={(open) => !open && setEditingTask(null)}
                userId={userId}
            />
        </div>
    );
}
