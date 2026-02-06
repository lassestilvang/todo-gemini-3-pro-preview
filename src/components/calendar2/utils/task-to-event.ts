import type { Task } from "@/lib/types";
import type { EventInput } from "@fullcalendar/react";
import { addMinutes } from "date-fns";

function normalizeDate(value: Date | string | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function hasTimeComponent(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

export function taskToEvent(task: Task): EventInput | null {
  const dueDate = normalizeDate(task.dueDate);
  if (!dueDate) return null;

  const isAllDay = !hasTimeComponent(dueDate);
  const hasEstimate = typeof task.estimateMinutes === "number" && task.estimateMinutes > 0;

  return {
    id: `task:${task.id}`,
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    start: dueDate,
    end: !isAllDay && hasEstimate ? addMinutes(dueDate, task.estimateMinutes!) : undefined,
    allDay: isAllDay,
    backgroundColor: task.listColor || undefined,
    borderColor: task.listColor || undefined,
    classNames: [
      task.isCompleted ? "calendar-event-completed" : "",
      `priority-${task.priority || "none"}`,
    ].filter(Boolean),
    extendedProps: {
      taskId: task.id,
      listId: task.listId, // null = Inbox
      listName: task.listName,
      listColor: task.listColor,
      listIcon: task.listIcon,
      priority: task.priority,
      isCompleted: task.isCompleted,
      estimateMinutes: task.estimateMinutes,
      deadline: task.deadline,
      labels: task.labels,
      energyLevel: task.energyLevel,
      context: task.context,
      isRecurring: task.isRecurring,
      recurringRule: task.recurringRule,
      description: task.description,
      updatedAt: task.updatedAt,
    },
  };
}

export function getTaskDueDate(task: Task): Date | null {
  return normalizeDate(task.dueDate);
}
