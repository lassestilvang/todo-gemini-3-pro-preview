import type { tasks } from "@/db";
import { applyListLabelMapping, resolveTodoistTaskListId } from "./mapping";
import { toTodoistPriority } from "./service";
import type { TodoistCreateTaskPayload, TodoistTask } from "./types";
import type { TodoistMappingState } from "./mapping";

type LocalTask = typeof tasks.$inferSelect;

type LocalTaskWithLabels = LocalTask & {
    labelNames?: string[];
};

function parseTodoistDueDate(task: TodoistTask) {
    if (!task.due?.date) {
        return { dueDate: null as Date | null, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    const dueDate = new Date(task.due.date);
    const hasTimeComponent = task.due.date.includes("T");

    return {
        dueDate,
        dueDatePrecision: hasTimeComponent ? null : "day",
    };
}

export function mapTodoistTaskToLocal(
    task: TodoistTask,
    mappings: TodoistMappingState
): Partial<LocalTask> {
    const { dueDate, dueDatePrecision } = parseTodoistDueDate(task);

    return {
        title: task.content,
        description: task.description ?? null,
        isCompleted: task.is_completed ?? false,
        completedAt: task.is_completed ? new Date() : null,
        listId: resolveTodoistTaskListId(task, mappings),
        dueDate,
        dueDatePrecision,
        isRecurring: task.due?.is_recurring ?? false,
        recurringRule: task.due?.is_recurring ? task.due.string ?? null : null,
        parentId: null,
    };
}

export function mapLocalTaskToTodoist(
    task: LocalTaskWithLabels,
    mappings: TodoistMappingState
): TodoistCreateTaskPayload {
    const mapping = applyListLabelMapping(task.listId ?? null, mappings);
    const iso = task.dueDate ? task.dueDate.toISOString() : null;
    const hasTime = iso ? !iso.endsWith("T00:00:00.000Z") : false;
    const dueDate = task.dueDate ? task.dueDate.toISOString().split("T")[0] : undefined;

    return {
        content: task.title,
        description: task.description ?? undefined,
        project_id: mapping.projectId,
        labels: mapping.labelIds,
        priority: toTodoistPriority(task.priority ?? "none"),
        due_date: hasTime ? undefined : dueDate,
        due_datetime: hasTime ? iso ?? undefined : undefined,
        due_string: task.isRecurring && task.recurringRule ? task.recurringRule : undefined,
        parent_id: task.parentId ?? undefined,
    };
}
