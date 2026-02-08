"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { EventCalendar } from "@/components/calendar4/event-calendar";
import { CalendarSidebar } from "@/components/calendar2/CalendarSidebar";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { addMinutes, startOfDay } from "date-fns";
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
                    allDay: !t.estimateMinutes, // If no duration, treat as all day (or specific logic)
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
        if (!newDueDate) return; // Should not happen

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

    // --- Quick Create ---
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [quickCreateDate, setQuickCreateDate] = useState<Date | undefined>(undefined);

    const handleDateClick = useCallback((info: any) => {
        // In v7 DateClickArg might have different structure, checking docs implied standard interactions
        // Assuming standard fullcalendar interaction plugin
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

    return (
        <div className="flex h-screen bg-background">
            <CalendarSidebar
                lists={lists}
                visibleListIds={visibleListIds}
                onToggleList={toggleList}
                onToggleAll={toggleAll}
                selectedListId={selectedListId}
                onSelectList={setSelectedListId}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <EventCalendar
                    height="100%"
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                    }}
                    events={events}
                    editable={true}
                    droppable={true}
                    selectable={true}
                    dateClick={handleDateClick} // Requires interaction plugin
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventResize}
                    // Add Shadcn specific props or custom views if needed
                    availableViews={['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']}
                />
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
