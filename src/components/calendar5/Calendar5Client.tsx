"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMinutes } from "date-fns";
import { Scheduler, type CalendarEvent, type CalendarFilterItem, type ViewType } from "calendarkit-pro";
import type { Task } from "@/lib/types";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { TaskDialog } from "@/components/tasks/TaskDialog";

const UNASSIGNED_CALENDAR_ID = "unassigned";
const FALLBACK_COLOR = "#71717a";

type CalendarList = {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  slug: string;
  position?: number;
};

interface Calendar5ClientProps {
  initialTasks: Task[];
  initialLists: CalendarList[];
}

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const nextDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function getCalendarId(listId: number | null | undefined) {
  return listId == null ? UNASSIGNED_CALENDAR_ID : String(listId);
}

export function Calendar5Client({ initialTasks, initialLists }: Calendar5ClientProps) {
  const { tasks: taskMap, setTasks, upsertTask } = useTaskStore();
  const { lists: listMap, setLists } = useListStore();
  const { dispatch } = useSync();
  const { userId } = useUser();

  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState<Date>(new Date());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [activeCalendarIds, setActiveCalendarIds] = useState<Set<string>>(
    () => new Set([UNASSIGNED_CALENDAR_ID, ...initialLists.map((list) => String(list.id))])
  );

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

  const tasks = useMemo(
    () => (Object.values(taskMap).length > 0 ? (Object.values(taskMap) as Task[]) : initialTasks),
    [taskMap, initialTasks]
  );

  const lists = useMemo(
    () => (Object.values(listMap).length > 0 ? Object.values(listMap) : initialLists),
    [listMap, initialLists]
  );

  const availableCalendarIds = useMemo(
    () => [UNASSIGNED_CALENDAR_ID, ...lists.map((list) => String(list.id))],
    [lists]
  );

  useEffect(() => {
    setActiveCalendarIds((prev) => {
      if (prev.size === 0) {
        return new Set(availableCalendarIds);
      }

      const next = new Set<string>();
      for (const id of availableCalendarIds) {
        if (prev.has(id)) {
          next.add(id);
        }
      }

      for (const id of availableCalendarIds) {
        if (!prev.has(id)) {
          next.add(id);
        }
      }

      return next;
    });
  }, [availableCalendarIds]);

  const listMapById = useMemo(() => {
    const nextMap = new Map<number, CalendarList>();
    for (const list of lists) {
      nextMap.set(list.id, list);
    }
    return nextMap;
  }, [lists]);

  const calendarFilters = useMemo<CalendarFilterItem[]>(
    () => [
      {
        id: UNASSIGNED_CALENDAR_ID,
        label: "Unassigned",
        color: FALLBACK_COLOR,
        active: activeCalendarIds.has(UNASSIGNED_CALENDAR_ID),
      },
      ...lists.map((list) => ({
        id: String(list.id),
        label: list.name,
        color: list.color ?? FALLBACK_COLOR,
        active: activeCalendarIds.has(String(list.id)),
      })),
    ],
    [activeCalendarIds, lists]
  );

  const events = useMemo<CalendarEvent[]>(
    () =>
      tasks
        .filter((task) => !task.isCompleted && task.dueDate)
        .flatMap((task) => {
          const start = normalizeDate(task.dueDate);
          if (!start) {
            return [];
          }

          const calendarId = getCalendarId(task.listId);
          if (!activeCalendarIds.has(calendarId)) {
            return [];
          }

          const minutes = task.estimateMinutes && task.estimateMinutes > 0 ? task.estimateMinutes : 30;
          const listColor = task.listId != null ? listMapById.get(task.listId)?.color : null;

          return [
            {
              id: String(task.id),
              title: task.title,
              start,
              end: addMinutes(start, minutes),
              allDay: !task.estimateMinutes,
              color: listColor ?? FALLBACK_COLOR,
              calendarId,
              taskId: task.id,
            },
          ];
        }),
    [activeCalendarIds, listMapById, tasks]
  );

  const editingTask = useMemo(() => {
    if (editingTaskId === null) {
      return null;
    }

    return taskMap[editingTaskId] ?? tasks.find((task) => task.id === editingTaskId) ?? null;
  }, [editingTaskId, taskMap, tasks]);

  const handleCalendarToggle = useCallback((calendarId: string, active: boolean) => {
    setActiveCalendarIds((prev) => {
      const next = new Set(prev);
      if (active) {
        next.add(calendarId);
      } else {
        next.delete(calendarId);
      }
      return next;
    });
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    const taskId = Number(event.id);
    if (!Number.isNaN(taskId)) {
      setEditingTaskId(taskId);
    }
  }, []);

  const handleEventDrop = useCallback(
    (event: CalendarEvent, start: Date, end: Date) => {
      const taskId = Number(event.id);
      if (Number.isNaN(taskId) || !userId) {
        return;
      }

      const existing = taskMap[taskId];
      if (!existing) {
        return;
      }

      const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      const updates: { dueDate: Date; estimateMinutes?: number } = {
        dueDate: start,
      };

      if (existing.estimateMinutes != null) {
        updates.estimateMinutes = durationMinutes;
      }

      upsertTask({ ...existing, ...updates });
      dispatch("updateTask", taskId, userId, {
        ...updates,
        expectedUpdatedAt: existing.updatedAt ?? null,
      });
    },
    [dispatch, taskMap, upsertTask, userId]
  );

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden rounded-xl border bg-background">
        <Scheduler
          events={events}
          calendars={calendarFilters}
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onCalendarToggle={handleCalendarToggle}
          hideLanguageSelector
          hideDarkModeToggle
          language="en"
          className="h-full"
        />
      </div>

      <TaskDialog
        task={
          editingTask
            ? {
                ...editingTask,
                icon: editingTask.icon ?? null,
                dueDate: normalizeDate(editingTask.dueDate),
                deadline: normalizeDate(editingTask.deadline),
              }
            : undefined
        }
        open={!!editingTask}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingTaskId(null);
          }
        }}
        userId={userId}
      />
    </>
  );
}
