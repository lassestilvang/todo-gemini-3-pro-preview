import { Task } from "@/lib/types";
import {
  startOfDay,
  addDays,
  endOfWeek,
  addWeeks,
  isSameDay,
  isSameWeek,
} from "date-fns";
import { isDueOverdue } from "@/lib/due-utils";

export type BoardGroupMode = "priority" | "dueDate" | "status";

export interface BoardColumn {
  id: string;
  title: string;
  color?: string;
}

export function getBoardColumns(mode: BoardGroupMode): BoardColumn[] {
  switch (mode) {
    case "priority":
      return [
        { id: "high", title: "High", color: "red" },
        { id: "medium", title: "Medium", color: "yellow" },
        { id: "low", title: "Low", color: "blue" },
        { id: "none", title: "No Priority", color: "gray" },
      ];
    case "dueDate":
      return [
        { id: "overdue", title: "Overdue", color: "red" },
        { id: "today", title: "Today", color: "orange" },
        { id: "tomorrow", title: "Tomorrow", color: "yellow" },
        { id: "this_week", title: "This Week", color: "blue" },
        { id: "later", title: "Later", color: "gray" },
        { id: "no_date", title: "No Date", color: "gray" },
      ];
    case "status":
      return [
        { id: "todo", title: "To Do", color: "blue" },
        { id: "done", title: "Done", color: "green" },
      ];
  }
}

export function getTaskColumnId(
  task: Task,
  mode: BoardGroupMode,
  now: Date = new Date(),
  tomorrow?: Date
): string {
  switch (mode) {
    case "priority":
      return task.priority || "none";
    case "dueDate": {
      if (!task.dueDate) return "no_date";
      const date =
        task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
      // Use hoisted now parameter to prevent O(N) object allocations
      if (isDueOverdue({ dueDate: date, dueDatePrecision: task.dueDatePrecision ?? null }, now, false)) return "overdue";

      const tm = tomorrow || addDays(now, 1);
      if (isSameDay(date, now)) return "today";
      if (isSameDay(date, tm)) return "tomorrow";
      if (isSameWeek(date, now, { weekStartsOn: 1 })) return "this_week";
      return "later";
    }
    case "status":
      return task.isCompleted ? "done" : "todo";
  }
}

export function getPatchForDrop(
  mode: BoardGroupMode,
  toColumnId: string
): Partial<{
  priority: "none" | "low" | "medium" | "high";
  dueDate: Date | null;
  dueDatePrecision: "day" | "week" | "month" | "year" | null;
  isCompleted: boolean;
}> {
  switch (mode) {
    case "priority":
      return { priority: toColumnId as "none" | "low" | "medium" | "high" };
    case "dueDate": {
      const now = new Date();
      switch (toColumnId) {
        case "overdue":
        case "today":
          return { dueDate: startOfDay(now), dueDatePrecision: null };
        case "tomorrow":
          return { dueDate: startOfDay(addDays(now, 1)), dueDatePrecision: null };
        case "this_week":
          return { dueDate: endOfWeek(now, { weekStartsOn: 1 }), dueDatePrecision: "week" };
        case "later":
          return { dueDate: startOfDay(addWeeks(now, 1)), dueDatePrecision: null };
        case "no_date":
          return { dueDate: null, dueDatePrecision: null };
        default:
          return {};
      }
    }
    case "status":
      return { isCompleted: toColumnId === "done" };
  }
}

export function groupTasksByColumn(
  tasks: Task[],
  mode: BoardGroupMode,
  columns: BoardColumn[],
  now: Date = new Date()
): Map<string, Task[]> {
  // ⚡ Bolt Opt: Hoist date-fns date boundaries to prevent recalculation inside the loop
  const isDueDate = mode === "dueDate";
  const tomorrow = isDueDate ? addDays(now, 1) : undefined;

  const groups = new Map<string, Task[]>();
  for (const col of columns) {
    groups.set(col.id, []);
  }

  for (const task of tasks) {
    const colId = getTaskColumnId(task, mode, now, tomorrow);
    const group = groups.get(colId);
    if (group) {
      group.push(task);
    } else {
      const firstCol = columns[0];
      if (firstCol) groups.get(firstCol.id)?.push(task);
    }
  }
  return groups;
}
