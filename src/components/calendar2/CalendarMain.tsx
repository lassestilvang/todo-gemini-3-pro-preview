"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import { useMemo, type ComponentProps } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@/components/providers/UserProvider";
import { isSystem24Hour } from "@/lib/time-utils";
import type { Task } from "@/lib/types";
import { getTaskDueDate, taskToEvent } from "@/components/calendar2/utils/task-to-event";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

interface CalendarMainProps {
  tasks: Task[];
  visibleListIds: Set<number | null>;
  onEventDrop: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["eventDrop"]>>[0]) => void;
  onEventResize: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["eventResize"]>>[0]) => void;
  onDateClick: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["dateClick"]>>[0]) => void;
  onSelect: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["select"]>>[0]) => void;
  onExternalDrop?: (taskId: number, date: Date, allDay: boolean) => void;
}

export function CalendarMain({
  tasks,
  visibleListIds,
  onEventDrop,
  onEventResize,
  onDateClick,
  onSelect,
  onExternalDrop,
}: CalendarMainProps) {
  const { resolvedTheme } = useTheme();
  const { getWeekStartDay, use24HourClock } = useUser();

  const use24h = use24HourClock ?? isSystem24Hour();

  const events = useMemo(() => {
    const visible = visibleListIds;
    return tasks
      .filter((task) => {
        const dueDate = getTaskDueDate(task);
        if (!dueDate) return false;
        const listId =
          task.listId === null || task.listId === undefined
            ? null
            : Number(task.listId);
        return visible.has(listId);
      })
      .map(taskToEvent)
      .filter(Boolean);
  }, [tasks, visibleListIds]);

  return (
    <div className="flex-1 min-h-0" data-color-scheme={resolvedTheme === "dark" ? "dark" : "light"}>
      <FullCalendar
        plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridThreeDay"
        views={{
          timeGridThreeDay: {
            type: "timeGrid",
            duration: { days: 3 },
          },
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridThreeDay,timeGridWeek,dayGridMonth",
        }}
        height="100%"
        expandRows
        editable
        selectable
        selectMirror
        dayMaxEvents={4}
        nowIndicator
        allDaySlot
        droppable
        firstDay={getWeekStartDay()}
        events={events as any}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        dateClick={onDateClick}
        select={onSelect}
        eventReceive={(info) => {
          const taskId = Number(info.event.extendedProps.taskId);
          const start = info.event.start;
          const allDay = info.event.allDay;
          info.event.remove();
          if (taskId && start && onExternalDrop) {
            onExternalDrop(taskId, start, allDay);
          }
        }}
        eventDurationEditable
        eventResizableFromStart
        defaultTimedEventDuration="00:30:00"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: !use24h }}
        {...({ slotLabelFormat: { hour: "numeric", minute: "2-digit", hour12: !use24h } } as Record<string, unknown>)}
      />
    </div>
  );
}
