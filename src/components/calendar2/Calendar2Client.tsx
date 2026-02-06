"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateClickData, DateSelectData, EventDropData, EventResizeDoneData } from "@fullcalendar/react";
import { CalendarMain } from "@/components/calendar2/CalendarMain";
import { CalendarSidebar } from "@/components/calendar2/CalendarSidebar";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import type { Task } from "@/lib/types";

interface Calendar2ClientProps {
  initialTasks: Task[];
  initialLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
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

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | undefined>(undefined);

  const openQuickCreate = useCallback((date: Date) => {
    setQuickCreateDate(date);
    setQuickCreateOpen(true);
  }, []);

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

  return (
    <div className="flex h-full min-h-0 border rounded-lg overflow-hidden bg-background shadow-sm">
      <CalendarSidebar
        lists={lists}
        visibleListIds={visibleListIds}
        onToggleList={toggleList}
        onToggleAll={toggleAll}
      />

      <div className="flex-1 min-h-0 p-4">
        <CalendarMain
          tasks={tasks}
          visibleListIds={visibleListIds}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onDateClick={handleDateClick}
          onSelect={handleSelect}
        />
      </div>

      <CalendarQuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultDueDate={quickCreateDate}
        userId={userId}
      />
    </div>
  );
}
