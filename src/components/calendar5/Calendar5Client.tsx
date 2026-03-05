"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMinutes } from "date-fns";
import { Scheduler, type CalendarEvent, type CalendarFilterItem, type ViewType } from "calendarkit-pro";
import { useTheme } from "next-themes";
import type { Task } from "@/lib/types";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Calendar5UnscheduledColumn } from "./Calendar5UnscheduledColumn";

const UNASSIGNED_CALENDAR_ID = "unassigned";
const FALLBACK_COLOR = "#71717a";
const VIEW_STORAGE_KEY = "calendar5:view";
const LISTS_STORAGE_KEY = "calendar5:lists";

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

  const { resolvedTheme } = useTheme();

  const [view, setView] = useState<ViewType>("month");
  const [date, setDate] = useState<Date>(new Date());
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultDueDate, setCreateDefaultDueDate] = useState<Date | undefined>(undefined);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [activeCalendarIds, setActiveCalendarIds] = useState<Set<string>>(() => {
    try {
      const stored = window.localStorage.getItem(LISTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch {
      // ignore
    }
    return new Set([UNASSIGNED_CALENDAR_ID, ...initialLists.map((list) => String(list.id))]);
  });

  const seenCalendarIdsRef = useRef<Set<string>>(
    new Set([UNASSIGNED_CALENDAR_ID, ...initialLists.map((list) => String(list.id))])
  );

  useEffect(() => {
    const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (
      storedView === "month" ||
      storedView === "week" ||
      storedView === "day" ||
      storedView === "agenda" ||
      storedView === "resource"
    ) {
      setView(storedView);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(Array.from(activeCalendarIds)));
  }, [activeCalendarIds]);

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
      const next = new Set<string>();
      for (const id of availableCalendarIds) {
        const seen = seenCalendarIdsRef.current.has(id);
        if (prev.has(id) || !seen) {
          next.add(id);
        }
        seenCalendarIdsRef.current.add(id);
      }

      if (next.size === 0 && availableCalendarIds.length > 0) {
        next.add(availableCalendarIds[0]);
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

  const defaultCreateListId = useMemo(() => {
    const activeListIds = Array.from(activeCalendarIds).filter((id) => id !== UNASSIGNED_CALENDAR_ID);
    if (activeListIds.length !== 1) {
      return undefined;
    }

    const parsed = Number(activeListIds[0]);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [activeCalendarIds]);

  const handleCreateTask = useCallback(() => {
    setCreateDefaultDueDate(new Date(date));
    setCreateDialogOpen(true);
  }, [date]);

  const handleCalendarToggle = useCallback((calendarId: string, active: boolean) => {
    setActiveCalendarIds((prev) => {
      if (!active && prev.size === 1 && prev.has(calendarId)) {
        return prev;
      }

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
      setCreateDialogOpen(false);
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

  const handleExternalDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);

      try {
        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        const data = JSON.parse(dataStr);
        const taskId = Number(data.taskId);

        if (Number.isNaN(taskId) || !userId) return;

        const existing = taskMap[taskId];
        if (!existing) return;

        // Try to derive the dropped time from the DroppableCell element under the mouse
        // In calendarkit-pro, the droppable cells have IDs which are the ISO timestamps they represent
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        let dropDate: Date | null = null;

        if (elementUnderMouse) {
          // Traverse up to find the closest element with a valid date-like ID or specific attribute
          const cell = elementUnderMouse.closest('[id*="T"][id*="Z"]');
          if (cell && cell.id) {
            const parsedDate = new Date(cell.id);
            if (!Number.isNaN(parsedDate.getTime())) {
              dropDate = parsedDate;
            }
          }
        }

        // If we couldn't resolve a precise time slot, just use current time or round down
        if (!dropDate) {
          const now = new Date();
          now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0); // round to nearest 15
          dropDate = now;
        }

        const updates: { dueDate: Date; estimateMinutes?: number } = {
          dueDate: dropDate,
        };

        upsertTask({ ...existing, ...updates });
        dispatch("updateTask", taskId, userId, {
          ...updates,
          expectedUpdatedAt: existing.updatedAt ?? null,
        });

      } catch (err) {
        console.error("Failed to parse drop data", err);
      }
    },
    [dispatch, taskMap, upsertTask, userId]
  );

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* Unscheduled Sidebar */}
      <Calendar5UnscheduledColumn
        tasks={tasks}
        onEditTask={(t) => setEditingTaskId(t.id)}
        selectedListId={defaultCreateListId}
      />

      {/* Main Calendar Window */}
      <div
        className="flex-1 min-w-0 flex flex-col p-4 pl-0"
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleExternalDrop}
      >
        <div className={`h-full min-h-0 overflow-hidden rounded-2xl border transition-colors ${isDraggingOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border shadow-sm"}`}>
          <Scheduler
            events={events}
            calendars={calendarFilters}
            view={view}
            onViewChange={setView}
            date={date}
            onDateChange={setDate}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            onCalendarToggle={handleCalendarToggle}
            newEventButton={{
              label: "New Task",
              onClick: handleCreateTask,
            }}
            isDarkMode={resolvedTheme === "dark"}
            hideLanguageSelector
            hideDarkModeToggle
            language="en"
            className="h-full"
          />
        </div>

        <TaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          defaultDueDate={createDefaultDueDate}
          defaultListId={defaultCreateListId}
          userId={userId}
        />

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
      </div>
    </div>
  );
}
