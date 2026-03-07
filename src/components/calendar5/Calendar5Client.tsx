"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMinutes, addDays, startOfWeek } from "date-fns";
import { enUS, enGB } from "date-fns/locale";
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
  const { userId, getWeekStartDay, use24HourClock } = useUser();

  const calendarLocale = useMemo(() => {
    const baseLocale = use24HourClock ? enGB : enUS;
    return {
      ...baseLocale,
      is24Hour: use24HourClock,
      options: {
        ...baseLocale.options,
        weekStartsOn: getWeekStartDay(),
      },
    };
  }, [use24HourClock, getWeekStartDay]);

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

  const handleTimeSlotClick = useCallback((slotDate: Date) => {
    setCreateDefaultDueDate(slotDate);
    setCreateDialogOpen(true);
  }, []);

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

  const clearExternalDragHighlights = () => {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-drag-over]').forEach(el => {
        el.removeAttribute('data-drag-over');
      });
    }
  };

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
        estimateMinutes: durationMinutes,
      };

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
      clearExternalDragHighlights();

      const calendarWrapper = e.currentTarget.querySelector('.calendar-main-wrapper');
      if (calendarWrapper) {
        calendarWrapper.classList.remove('border-primary', 'ring-2', 'ring-primary/20', 'bg-primary/5');
        calendarWrapper.classList.add('border-border', 'shadow-sm');
      }

      try {
        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        const data = JSON.parse(dataStr);
        const taskId = Number(data.taskId);

        if (Number.isNaN(taskId) || !userId) return;

        const existing = taskMap[taskId];
        if (!existing) return;

        // Try to derive the dropped time from the cell in Month View
        const elementUnderMouse = e.target as Element;
        let dropDate: Date | null = null;

        if (elementUnderMouse) {
          // Attempt 1: Month View uses DroppableCell with ID or data-date
          const cell = elementUnderMouse.closest('[id*="T"][id*="Z"], [data-date]');
          if (cell) {
            const dateStr = cell.getAttribute('data-date') || cell.id;
            if (dateStr) {
              const parsedDate = new Date(dateStr);
              if (!Number.isNaN(parsedDate.getTime())) {
                dropDate = parsedDate;
              }
            }
          }

          // Attempt 2: Geographic math for Week and Day views
          if (!dropDate) {
            if (view === "week") {
              const weekGrid = elementUnderMouse.closest('.grid-cols-7');
              const timeLabels = weekGrid?.previousElementSibling;
              if (weekGrid && timeLabels && timeLabels.classList.contains('w-16')) {
                const rect = weekGrid.getBoundingClientRect();
                const dayIndex = Math.floor((e.clientX - rect.left) / (rect.width / 7));
                const hourHeight = 60; // 60px per hour in WeekView.tsx
                const yPos = e.clientY - rect.top;
                const hours = yPos / hourHeight;

                const start = startOfWeek(date, { weekStartsOn: getWeekStartDay() });
                const dropDay = addDays(start, Math.max(0, Math.min(6, dayIndex)));

                const dropMinutes = Math.floor(hours * 60);
                dropDate = new Date(dropDay);
                dropDate.setHours(0, Math.floor(dropMinutes / 15) * 15, 0, 0);
              }
            } else if (view === "day") {
              // The day column contains the events and has no grid-cols-7
              const dayGrid = elementUnderMouse.closest('.relative.flex-1');
              if (dayGrid) {
                const rect = dayGrid.getBoundingClientRect();
                const hourHeight = 80; // 80px per hour in DayView.tsx
                const yPos = e.clientY - rect.top;
                const hours = yPos / hourHeight;
                const dropMinutes = Math.floor(hours * 60);
                dropDate = new Date(date);
                dropDate.setHours(0, Math.floor(dropMinutes / 15) * 15, 0, 0);
              }
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
    [dispatch, taskMap, upsertTask, userId, date, getWeekStartDay, view]
  );

  const handleExternalDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const calendarWrapper = e.currentTarget.querySelector('.calendar-main-wrapper');
    if (calendarWrapper && !calendarWrapper.classList.contains('border-primary')) {
      calendarWrapper.classList.remove('border-border', 'shadow-sm');
      calendarWrapper.classList.add('border-primary', 'ring-2', 'ring-primary/20', 'bg-primary/5');
    }

    const elementUnderMouse = e.target as Element;
    if (!elementUnderMouse) return;

    const targetCell = elementUnderMouse.closest('[data-date]');

    // Clear previous highlights that aren't the current target
    document.querySelectorAll('[data-drag-over]').forEach(el => {
      if (el !== targetCell) {
        el.removeAttribute('data-drag-over');
      }
    });

    // Highlight new target safely (using data attribute to avoid Next.js className hydration conflict)
    if (targetCell && !targetCell.hasAttribute('data-drag-over')) {
      targetCell.setAttribute('data-drag-over', 'true');
    }
  }, []);

  const handleExternalDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear main calendar highlight if leaving the main wrapper bounds
    const wrapper = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!wrapper.contains(relatedTarget)) {
      clearExternalDragHighlights();
      const calendarWrapper = wrapper.querySelector('.calendar-main-wrapper');
      if (calendarWrapper) {
        calendarWrapper.classList.remove('border-primary', 'ring-2', 'ring-primary/20', 'bg-primary/5');
        calendarWrapper.classList.add('border-border', 'shadow-sm');
      }
    }
  }, []);

  return (
    <div className="calendar-v5-wrapper flex h-full min-h-0 bg-background">
      {/* Unscheduled Sidebar */}
      <Calendar5UnscheduledColumn
        tasks={tasks}
        onEditTask={(t) => setEditingTaskId(t.id)}
        selectedListId={defaultCreateListId}
      />

      {/* Main Calendar Window */}
      <div
        className="flex-1 min-w-0 flex flex-col p-4 pl-0"
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
      >
        <div className="calendar-main-wrapper h-full min-h-0 overflow-hidden rounded-2xl border transition-colors border-border shadow-sm">
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
            // @ts-ignore - 'onEventResize' is supported by calendarkit-pro but missing from types
            onEventResize={(event: CalendarEvent, newStart: Date, newEnd: Date) => handleEventDrop(event, newStart, newEnd)}
            onCalendarToggle={handleCalendarToggle}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - 'onTimeSlotClick' is supported internally by calendarkit-pro but missing from types
            onTimeSlotClick={handleTimeSlotClick}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - 'locale' is supported but may conflict if types are outdated
            locale={calendarLocale}
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
