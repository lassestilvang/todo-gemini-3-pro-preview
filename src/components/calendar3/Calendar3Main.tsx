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

interface Calendar3MainProps {
  tasks: Task[];
  onEventDrop: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["eventDrop"]>>[0]) => void;
  onEventResize: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["eventResize"]>>[0]) => void;
  onDateClick: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["dateClick"]>>[0]) => void;
  onSelect: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["select"]>>[0]) => void;
  onEventReceive: (arg: Parameters<NonNullable<ComponentProps<typeof FullCalendar>["eventReceive"]>>[0]) => void;
}

export function Calendar3Main({
  tasks,
  onEventDrop,
  onEventResize,
  onDateClick,
  onSelect,
  onEventReceive,
}: Calendar3MainProps) {
  const { resolvedTheme } = useTheme();
  const { getWeekStartDay, use24HourClock } = useUser();

  const use24h = use24HourClock ?? isSystem24Hour();

  const events = useMemo(() => {
    return tasks
      .filter((task) => Boolean(getTaskDueDate(task)))
      .map(taskToEvent)
      .filter(Boolean);
  }, [tasks]);

  return (
    <div className="flex-1 min-h-0" data-color-scheme={resolvedTheme === "dark" ? "dark" : "light"}>
      <FullCalendar
        plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        contentHeight="auto"
        expandRows
        editable
        selectable
        selectMirror
        droppable
        dropAccept="[data-task-draggable]"
        dayMaxEvents={4}
        nowIndicator
        firstDay={getWeekStartDay()}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events={events as any}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        eventReceive={onEventReceive}
        dateClick={onDateClick}
        select={onSelect}
        eventDurationEditable
        eventResizableFromStart
        defaultTimedEventDuration="00:30:00"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: !use24h }}

        {...({ slotLabelFormat: { hour: "numeric", minute: "2-digit", hour12: !use24h } } as Record<string, unknown>)}
      />
    </div>
  );
}
