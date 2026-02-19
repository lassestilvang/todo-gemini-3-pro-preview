"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import type {
  DateClickData,
  DateSelectData,
  EventDropData,
  EventResizeDoneData,
  EventReceiveData,
} from "@fullcalendar/react";
import { Draggable } from "@fullcalendar/react/interaction";
import { useSearchParams } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { Calendar3Main } from "@/components/calendar3/Calendar3Main";
import { Calendar3TaskColumn } from "@/components/calendar3/Calendar3TaskColumn";
import { CalendarQuickCreateDialog } from "@/components/calendar2/CalendarQuickCreateDialog";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import type { Task } from "@/lib/types";
import { getTaskDueDate } from "@/components/calendar2/utils/task-to-event";
import { Switch } from "@/components/ui/switch";

interface Calendar3ClientProps {
  initialTasks: Task[];
  initialLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string; position?: number }>;
}

function partitionTasks(tasks: Task[]) {
  const active: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.isCompleted) completed.push(task);
    else active.push(task);
  }

  return { active, completed };
}

export function Calendar3Client(props: Calendar3ClientProps) {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center p-8">Loading calendar...</div>}>
      <Calendar3ClientInner {...props} />
    </Suspense>
  )
}

function Calendar3ClientInner({ initialTasks, initialLists }: Calendar3ClientProps) {
  const { tasks: taskMap, setTasks } = useTaskStore();
  const { lists: listMap, setLists } = useListStore();
  const { dispatch } = useSync();
  const { userId } = useUser();
  const searchParams = useSearchParams();

  const tasks = useMemo(() => {
    const storeTasks = Object.values(taskMap) as Task[];
    return storeTasks.length > 0 ? storeTasks : initialTasks;
  }, [taskMap, initialTasks]);

  const lists = useMemo(() => {
    const storeLists = Object.values(listMap);
    return storeLists.length > 0 ? storeLists : initialLists;
  }, [listMap, initialLists]);

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

  const sortedLists = useMemo(() => {
    return lists.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [lists]);

  const listIdParam = searchParams.get("listId");
  const parsedListId = listIdParam ? Number(listIdParam) : null;
  const selectedList = useMemo(() => {
    if (sortedLists.length === 0) return null;
    if (parsedListId !== null && !Number.isNaN(parsedListId)) {
      const found = sortedLists.find((list) => list.id === parsedListId);
      if (found) return found;
    }
    return sortedLists[0];
  }, [parsedListId, sortedLists]);

  const selectedListId = selectedList?.id ?? null;
  const selectedListTitle = selectedList?.name ?? "Inbox";

  const [unscheduledOnly, setUnscheduledOnly] = useState(false);

  const selectedListTasks = useMemo(() => {
    return tasks.filter((task) => {
      const listId = task.listId ?? null;
      if (selectedListId === null) {
        if (listId !== null) return false;
      } else if (listId !== selectedListId) {
        return false;
      }

      if (unscheduledOnly) {
        return getTaskDueDate(task) === null;
      }

      return true;
    });
  }, [tasks, selectedListId, unscheduledOnly]);

  const todayTasks = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    return tasks.filter((task) => {
      const dueDate = getTaskDueDate(task);
      if (!dueDate) return false;
      return dueDate >= todayStart && dueDate <= todayEnd;
    });
  }, [tasks]);

  const { active: listActive, completed: listCompleted } = useMemo(
    () => partitionTasks(selectedListTasks),
    [selectedListTasks]
  );
  const { active: todayActive, completed: todayCompleted } = useMemo(
    () => partitionTasks(todayTasks),
    [todayTasks]
  );

  const listDragContainerRef = useRef<HTMLDivElement | null>(null);
  const todayDragContainerRef = useRef<HTMLDivElement | null>(null);
  const listDraggableRef = useRef<Draggable | null>(null);
  const todayDraggableRef = useRef<Draggable | null>(null);

  const buildEventData = useCallback((el: HTMLElement) => {
    const taskId = Number(el.getAttribute("data-task-id"));
    const title = el.getAttribute("data-task-title") || "Task";
    const duration = Number(el.getAttribute("data-task-duration")) || 30;
    const listIdAttr = el.getAttribute("data-task-list-id");
    const listId = listIdAttr ? Number(listIdAttr) : null;
    const listColor = el.getAttribute("data-task-color") || undefined;

    return {
      id: `task:${taskId}`,
      title,
      duration: { minutes: duration },
      backgroundColor: listColor,
      borderColor: listColor,
      extendedProps: {
        taskId,
        listId,
      },
    };
  }, []);

  useEffect(() => {
    if (!listDragContainerRef.current || listDraggableRef.current) return;
    listDraggableRef.current = new Draggable(listDragContainerRef.current, {
      itemSelector: "[data-task-draggable]",
      eventData: buildEventData,
    });
    return () => {
      listDraggableRef.current?.destroy();
      listDraggableRef.current = null;
    };
  }, [buildEventData]);

  useEffect(() => {
    if (!todayDragContainerRef.current || todayDraggableRef.current) return;
    todayDraggableRef.current = new Draggable(todayDragContainerRef.current, {
      itemSelector: "[data-task-draggable]",
      eventData: buildEventData,
    });
    return () => {
      todayDraggableRef.current?.destroy();
      todayDraggableRef.current = null;
    };
  }, [buildEventData]);

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

  const handleEventReceive = useCallback((info: EventReceiveData) => {
    const taskId = Number(info.event.extendedProps.taskId);
    if (!taskId || !userId) {
      info.event.remove();
      return;
    }

    const existing = taskMap[taskId];
    if (!existing) {
      info.event.remove();
      return;
    }

    const start = info.event.start;
    if (!start) {
      info.event.remove();
      return;
    }

    const newDueDate = info.event.allDay ? startOfDay(start) : start;

    let estimateMinutes = existing.estimateMinutes;
    if (!info.event.allDay && (!estimateMinutes || estimateMinutes <= 0)) {
      const end = info.event.end;
      if (end) {
        estimateMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      } else {
        estimateMinutes = 30;
      }
    }

    useTaskStore.getState().upsertTask({
      ...existing,
      dueDate: newDueDate,
      estimateMinutes,
    });

    dispatch("updateTask", taskId, userId, {
      dueDate: newDueDate,
      estimateMinutes,
      expectedUpdatedAt: existing.updatedAt ?? null,
    });

    info.event.remove();
  }, [dispatch, taskMap, userId]);

  const handleDateClick = useCallback((info: DateClickData) => {
    openQuickCreate(info.date);
  }, [openQuickCreate]);

  const handleSelect = useCallback((info: DateSelectData) => {
    openQuickCreate(info.start);
  }, [openQuickCreate]);

  return (
    <div className="flex h-full min-h-0 border rounded-lg overflow-hidden bg-background shadow-sm">
      <Calendar3TaskColumn
        title={selectedListTitle}
        subtitle="Selected List"
        list={selectedList}
        tasks={listActive}
        completedTasks={listCompleted}
        userId={userId}
        listId={selectedListId}
        showListInfo={false}
        emptyState="No tasks in this list."
        dragContainerRef={listDragContainerRef}
        headerAction={(
          <label htmlFor="calendar3-unscheduled" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              id="calendar3-unscheduled"
              checked={unscheduledOnly}
              onCheckedChange={(checked) => setUnscheduledOnly(Boolean(checked))}
            />
            Unscheduled
          </label>
        )}
      />

      <Calendar3TaskColumn
        title="Today"
        subtitle="Due Today"
        tasks={todayActive}
        completedTasks={todayCompleted}
        userId={userId}
        defaultDueDate={new Date()}
        showListInfo
        emptyState="No tasks due today."
        dragContainerRef={todayDragContainerRef}
      />

      <div className="flex-1 min-h-0 p-4">
        <Calendar3Main
          tasks={tasks}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onEventReceive={handleEventReceive}
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
