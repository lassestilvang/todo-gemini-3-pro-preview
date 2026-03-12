
"use client";

import React, { useCallback, useEffect, useMemo, useReducer } from "react";
import { CalendarSidebar } from "@/components/calendar2/CalendarSidebar";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { addMinutes, isSameDay } from "date-fns";
import type { Task } from "@/lib/types";
import { CalendarLayout } from "./layout/CalendarLayout";

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

    useEffect(() => {
        if (Object.keys(taskMap).length === 0 && initialTasks.length > 0) setTasks(initialTasks);
    }, [initialTasks, setTasks, taskMap]);

    useEffect(() => {
        if (Object.keys(listMap).length === 0 && initialLists.length > 0) setLists(initialLists);
    }, [initialLists, listMap, setLists]);

    const tasks = useMemo(() => Object.values(taskMap).length > 0 ? Object.values(taskMap) as Task[] : initialTasks, [taskMap, initialTasks]);
    const lists = useMemo(() => Object.values(listMap).length > 0 ? Object.values(listMap) : initialLists, [listMap, initialLists]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [uiState, dispatchUI] = useReducer((state: any, action: any) => {
        switch (action.type) {
            case "TOGGLE_LIST": {
                const next = new Set(state.visibleListIds);
                if (next.has(action.payload)) next.delete(action.payload);
                else next.add(action.payload);
                return { ...state, visibleListIds: next };
            }
            case "SET_ALL_LISTS": return { ...state, visibleListIds: new Set([null, ...action.payload]) };
            case "CLEAR_ALL_LISTS": return { ...state, visibleListIds: new Set() };
            case "SET_SELECTED_LIST": return { ...state, selectedListId: action.payload };
            case "SET_QUICK_CREATE": return { ...state, quickCreateOpen: action.payload.open, quickCreateDate: action.payload.date !== undefined ? action.payload.date : state.quickCreateDate };
            case "SET_EDITING_TASK": return { ...state, editingTask: action.payload };
            default: return state;
        }
    }, {
        visibleListIds: new Set([null, ...initialLists.map((list) => list.id)]),
        selectedListId: null,
        quickCreateOpen: false,
        quickCreateDate: undefined,
        editingTask: null,
    });

    const { visibleListIds, selectedListId, quickCreateOpen, quickCreateDate, editingTask } = uiState;

    const unplannedTasks = useMemo(() => tasks.filter(t => !t.isCompleted && !t.dueDate && (selectedListId === null || t.listId === selectedListId)), [tasks, selectedListId]);
    // ⚡ Bolt Opt: Consolidated 2 separate O(N) filters into a single O(N) pass.
    // Both share the same dependency array `[tasks]` and identical date conditions.
    const { todayTasks, todayDoneTasks } = useMemo(() => {
        const now = new Date();
        const active: Task[] = [];
        const done: Task[] = [];

        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            if (t.dueDate && isSameDay(normalizeDate(t.dueDate)!, now)) {
                if (t.isCompleted) {
                    done.push(t);
                } else {
                    active.push(t);
                }
            }
        }

        return { todayTasks: active, todayDoneTasks: done };
    }, [tasks]);

    // ⚡ Bolt Opt: Replaced O(N*M) lists.find inside map with an O(1) Map lookup
    // This reduces the complexity from O(events * lists) to O(events + lists)
    const listMapById = useMemo(() => {
        const map = new Map<number, typeof lists[0]>();
        for (const list of lists) {
            map.set(list.id, list);
        }
        return map;
    }, [lists]);

    const events = useMemo(() => {
        // ⚡ Bolt Opt: Replaced .filter().map() chain with a single O(N) loop
        // Reduces object allocations and garbage collection overhead
        const result = [];
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            if (t.isCompleted || !t.dueDate || !visibleListIds.has(t.listId ?? null)) continue;

            const start = normalizeDate(t.dueDate)!;
const color = (t.listId != null ? listMapById.get(t.listId)?.color : undefined) ?? "#71717a";
            result.push({
                id: String(t.id),
                title: t.title,
                start: start.toISOString(),
                end: t.estimateMinutes ? addMinutes(start, t.estimateMinutes).toISOString() : undefined,
                backgroundColor: color,
                borderColor: color,
                extendedProps: { taskId: t.id },
                allDay: !t.estimateMinutes,
            });
        }
        return result;
    }, [tasks, visibleListIds, listMapById]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventAction = useCallback((id: number, updates: any) => {
        const existing = taskMap[id];
        if (!existing || !userId) return;
        upsertTask({ ...existing, ...updates });
        dispatch("updateTask", id, userId, { ...updates, expectedUpdatedAt: existing.updatedAt ?? null });
    }, [dispatch, taskMap, userId, upsertTask]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventDrop = useCallback((info: any) => handleEventAction(Number(info.event.extendedProps.taskId), { dueDate: info.event.start }), [handleEventAction]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventResize = useCallback((info: any) => {
        const mins = Math.max(1, Math.round((info.event.end.getTime() - info.event.start.getTime()) / 60000));
        handleEventAction(Number(info.event.extendedProps.taskId), { estimateMinutes: mins });
    }, [handleEventAction]);

    const selectedListName = useMemo(() => selectedListId === null ? "Unplanned" : listMapById.get(selectedListId)?.name || "Unplanned", [selectedListId, listMapById]);

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            <CalendarSidebar
                lists={lists} visibleListIds={visibleListIds}
                onToggleList={id => dispatchUI({ type: "TOGGLE_LIST", payload: id })}
                onToggleAll={chk => dispatchUI({ type: chk ? "SET_ALL_LISTS" : "CLEAR_ALL_LISTS", payload: lists.map(l => l.id) })}
                selectedListId={selectedListId} onSelectList={id => dispatchUI({ type: "SET_SELECTED_LIST", payload: id })}
            />
            <CalendarLayout
                unplannedTasks={unplannedTasks} todayTasks={todayTasks} todayDoneTasks={todayDoneTasks}
                events={events} selectedListName={selectedListName}
                onEditTask={t => dispatchUI({ type: "SET_EDITING_TASK", payload: t })}
                onDateClick={info => dispatchUI({ type: "SET_QUICK_CREATE", payload: { open: true, date: info.date } })}
                onEventClick={info => dispatchUI({ type: "SET_EDITING_TASK", payload: taskMap[Number(info.event.extendedProps.taskId)] })}
                onEventDrop={handleEventDrop} onEventResize={handleEventResize}
                onEventReceive={info => { info.revert(); handleEventAction(Number(info.event.extendedProps.taskId), { dueDate: info.event.start }); }}
            />
            <CalendarQuickCreateDialog
                open={quickCreateOpen} onOpenChange={o => dispatchUI({ type: "SET_QUICK_CREATE", payload: { open: o } })}
                defaultDueDate={quickCreateDate} userId={userId}
            />
            <TaskDialog
                task={editingTask ? { ...editingTask, dueDate: normalizeDate(editingTask.dueDate), deadline: normalizeDate(editingTask.deadline) } : undefined}
                open={!!editingTask} onOpenChange={o => !o && dispatchUI({ type: "SET_EDITING_TASK", payload: null })}
                userId={userId}
            />
        </div>
    );
}
