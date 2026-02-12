import type { tasks } from "@/db";
import type { GoogleTask } from "./types";

type LocalTask = typeof tasks.$inferSelect;

type LocalTaskWithLabels = LocalTask & {
    labelNames?: string[];
};

function parseGoogleDueDate(task: GoogleTask) {
    if (!task.due) {
        return { dueDate: null as Date | null, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    const dueDate = new Date(task.due);
    const hasTimeComponent = !task.due.endsWith("T00:00:00.000Z");

    return {
        dueDate,
        dueDatePrecision: (hasTimeComponent ? null : "day") as LocalTask["dueDatePrecision"],
    };
}

export function mapGoogleTaskToLocal(task: GoogleTask, listId: number | null): Partial<LocalTask> {
    const { dueDate, dueDatePrecision } = parseGoogleDueDate(task);

    return {
        title: task.title,
        description: task.notes ?? null,
        isCompleted: task.status === "completed",
        completedAt: task.status === "completed" ? new Date(task.completed ?? Date.now()) : null,
        listId,
        dueDate,
        dueDatePrecision,
        isRecurring: false,
        recurringRule: null,
        parentId: null,
    };
}

export function mapLocalTaskToGoogle(task: LocalTaskWithLabels): Partial<GoogleTask> {
    const iso = task.dueDate ? task.dueDate.toISOString() : undefined;
    const hasTime = iso ? !iso.endsWith("T00:00:00.000Z") : false;
    const dueValue = iso ? (hasTime ? iso : iso.split("T")[0] + "T00:00:00.000Z") : undefined;

    return {
        title: task.title,
        notes: task.description ?? undefined,
        status: task.isCompleted ? "completed" : "needsAction",
        completed: task.isCompleted ? (task.completedAt ?? new Date()).toISOString() : undefined,
        due: dueValue,
    };
}
