"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import type { DateClickData, DateSelectData, EventDropData, EventResizeDoneData } from "@fullcalendar/react";
import { CalendarMain } from "@/components/calendar2/CalendarMain";
import { CalendarSidebar } from "@/components/calendar2/CalendarSidebar";
import { CalendarPlanningLayout } from "@/components/calendar2/CalendarPlanningLayout";
import { UnplannedColumn } from "@/components/calendar2/UnplannedColumn";
import { TodayColumn } from "@/components/calendar2/TodayColumn";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { startOfDay, isToday } from "date-fns";
import type { Task } from "@/lib/types";

interface Calendar2ClientProps {
  initialTasks: Task[];
  initialLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
}

function normalizeDate(d: Date | string | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}

export function Calendar2Client({ initialTasks, initialLists }: Calendar2ClientProps) {
  const { tasks: taskMap, setTasks } = useTaskStore();
  const { lists: listMap, setLists } = useListStore();
  const { dispatch } = useSync();
  const { userId } = useUser();

  const tasks = useMemo(() => {
    const storeTasks = Object.values(taskMap) as Task[];
    return storeTasks.length > 0 ? storeTasks : initialTasks;
  }, [taskMap, initialTasks]);

  const lists = useMemo(() => {
    const storeLists = Object.values(listMap);
    return storeLists.length > 0 ? storeLists : initialLists;
  }, [listMap, initialLists]);

  type UIState = {
    visibleListIds: Set<number | null>;
    selectedListId: number | null;
    quickCreateOpen: boolean;
    quickCreateDate: Date | undefined;
    editingTask: Task | null;
  };

  type UIAction =
    | { type: "TOGGLE_LIST"; payload: number | null }
    | { type: "SET_ALL_LISTS"; payload: number[] }
    | { type: "CLEAR_ALL_LISTS" }
    | { type: "SET_SELECTED_LIST"; payload: number | null }
    | { type: "SET_QUICK_CREATE"; payload: { open: boolean, date?: Date } }
    | { type: "SET_EDITING_TASK"; payload: Task | null };

  const [uiState, dispatchUI] = React.useReducer(
    (state: UIState, action: UIAction): UIState => {
      switch (action.type) {
        case "TOGGLE_LIST": {
          const next = new Set(state.visibleListIds);
          if (next.has(action.payload)) {
            next.delete(action.payload);
          } else {
            next.add(action.payload);
          }
          return { ...state, visibleListIds: next };
        }
        case "SET_ALL_LISTS":
          return { ...state, visibleListIds: new Set([null, ...action.payload]) };
        case "CLEAR_ALL_LISTS":
          return { ...state, visibleListIds: new Set() };
        case "SET_SELECTED_LIST": return { ...state, selectedListId: action.payload };
        case "SET_QUICK_CREATE": return { ...state, quickCreateOpen: action.payload.open, quickCreateDate: action.payload.date !== undefined ? action.payload.date : state.quickCreateDate };
        case "SET_EDITING_TASK": return { ...state, editingTask: action.payload };
        default: return state;
      }
    },
    {
      visibleListIds: new Set([null, ...initialLists.map((list) => list.id)]),
      selectedListId: null,
      quickCreateOpen: false,
      quickCreateDate: undefined,
      editingTask: null,
    }
  );

  const { visibleListIds, selectedListId, quickCreateOpen, quickCreateDate, editingTask } = uiState;

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

  const toggleList = useCallback((listId: number | null) => {
    dispatchUI({ type: "TOGGLE_LIST", payload: listId });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      dispatchUI({ type: "SET_ALL_LISTS", payload: lists.map((list) => list.id) });
    } else {
      dispatchUI({ type: "CLEAR_ALL_LISTS" });
    }
  }, [lists]);

  const selectedListName = useMemo(() => {
    if (selectedListId === null) return "Inbox";
    const list = lists.find((l) => l.id === selectedListId);
    return list?.name ?? "Inbox";
  }, [selectedListId, lists]);

  // --- Task selectors ---
  const unplannedTasks = useMemo(() => {
    return tasks.filter((t) => {
      const listId = t.listId === undefined ? null : t.listId;
      return listId === selectedListId && !normalizeDate(t.dueDate) && !t.isCompleted;
    });
  }, [tasks, selectedListId]);

  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const d = normalizeDate(t.dueDate);
        return d && isToday(d) && !t.isCompleted;
      })
      .sort((a, b) => {
        const da = normalizeDate(a.dueDate)!;
        const db = normalizeDate(b.dueDate)!;
        return da.getTime() - db.getTime();
      });
  }, [tasks]);

  const todayDoneTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = normalizeDate(t.dueDate);
      return d && isToday(d) && t.isCompleted;
    });
  }, [tasks]);

  // --- Quick create dialog ---

  const openQuickCreate = useCallback((date: Date) => {
    dispatchUI({ type: "SET_QUICK_CREATE", payload: { open: true, date } });
  }, []);

  // --- Task edit dialog ---

  const handleEditTask = useCallback((task: Task) => {
    dispatchUI({ type: "SET_EDITING_TASK", payload: task });
  }, []);

  // --- Event handlers ---
  const handleEventDrop = useCallback((info: EventDropData) => {
    const taskId = Number(info.event.extendedProps.taskId);
    if (!taskId || !userId) return;

    const existing = taskMap[taskId];
    if (!existing) return;

    const newDueDate = info.event.start ?? null;

    useTaskStore.getState().upsertTask({
      ...existing,
      dueDate: newDueDate,
    });

    dispatch("updateTask", taskId, userId, {
      dueDate: newDueDate,
      expectedUpdatedAt: existing.updatedAt ?? null,
    });
  }, [dispatch, taskMap, userId]);

  const handleEventResize = useCallback((info: EventResizeDoneData) => {
    const taskId = Number(info.event.extendedProps.taskId);
    if (!taskId || !userId) return;

    const existing = taskMap[taskId];
    if (!existing) return;

    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;

    const estimateMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    useTaskStore.getState().upsertTask({
      ...existing,
      estimateMinutes,
    });

    dispatch("updateTask", taskId, userId, {
      estimateMinutes,
      expectedUpdatedAt: existing.updatedAt ?? null,
    });
  }, [dispatch, taskMap, userId]);

  const handleDateClick = useCallback((info: DateClickData) => {
    openQuickCreate(info.date);
  }, [openQuickCreate]);

  const handleSelect = useCallback((info: DateSelectData) => {
    openQuickCreate(info.start);
  }, [openQuickCreate]);

  const handleExternalDrop = useCallback((taskId: number, date: Date, allDay: boolean) => {
    if (!userId) return;

    const existing = taskMap[taskId];
    if (!existing) return;

    const newDueDate = allDay ? startOfDay(date) : date;

    useTaskStore.getState().upsertTask({
      ...existing,
      dueDate: newDueDate,
    });

    dispatch("updateTask", taskId, userId, {
      dueDate: newDueDate,
      expectedUpdatedAt: existing.updatedAt ?? null,
    });
  }, [dispatch, taskMap, userId]);

  return (
    <div className="flex h-full min-h-0">
      <CalendarSidebar
        lists={lists}
        visibleListIds={visibleListIds}
        onToggleList={toggleList}
        onToggleAll={toggleAll}
        selectedListId={selectedListId}
        onSelectList={(id) => dispatchUI({ type: "SET_SELECTED_LIST", payload: id })}
      />

      <div className="flex-1 min-h-0 min-w-0">
        <CalendarPlanningLayout
          left={
            <UnplannedColumn
              tasks={unplannedTasks}
              listName={selectedListName}
              onEditTask={handleEditTask}
            />
          }
          middle={
            <TodayColumn
              tasks={todayTasks}
              doneTasks={todayDoneTasks}
              onEditTask={handleEditTask}
            />
          }
          right={
            <CalendarMain
              tasks={tasks}
              visibleListIds={visibleListIds}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onDateClick={handleDateClick}
              onSelect={handleSelect}
              onExternalDrop={handleExternalDrop}
            />
          }
        />
      </div>

      <CalendarQuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={(open) => dispatchUI({ type: "SET_QUICK_CREATE", payload: { open } })}
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
        onOpenChange={(open) => {
          if (!open) dispatchUI({ type: "SET_EDITING_TASK", payload: null });
        }}
        userId={userId}
      />
    </div>
  );
}
