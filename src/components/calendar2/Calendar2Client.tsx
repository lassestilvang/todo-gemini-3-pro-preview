"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // --- List visibility (for calendar filtering) ---
  const [visibleListIds, setVisibleListIds] = useState<Set<number | null>>(
    () => new Set([null])
  );
  const listVisibilityInitialized = useRef(false);

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

  useEffect(() => {
    if (listVisibilityInitialized.current) return;
    if (lists.length === 0) return;
    setVisibleListIds(new Set([null, ...lists.map((list) => list.id)]));
    listVisibilityInitialized.current = true;
  }, [lists]);

  const toggleList = useCallback((listId: number | null) => {
    setVisibleListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setVisibleListIds(new Set([null, ...lists.map((list) => list.id)]));
    } else {
      setVisibleListIds(new Set());
    }
  }, [lists]);

  // --- Selected list for left column ---
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

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
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | undefined>(undefined);

  const openQuickCreate = useCallback((date: Date) => {
    setQuickCreateDate(date);
    setQuickCreateOpen(true);
  }, []);

  // --- Task edit dialog ---
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
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
        onSelectList={setSelectedListId}
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
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        userId={userId}
      />
    </div>
  );
}
