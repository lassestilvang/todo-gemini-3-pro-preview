import type { tasks } from "@/db";
import { applyListLabelMapping, resolveTodoistTaskListId } from "./mapping";
import { toTodoistPriority } from "./service";
import type { Task, AddTaskArgs } from "@doist/todoist-api-typescript";
import type { TodoistMappingState } from "./mapping";

type LocalTask = typeof tasks.$inferSelect;

type LocalTaskWithLabels = LocalTask & {
    labelNames?: string[];
};

function parseTodoistDueDate(task: Task) {
    if (!task.due?.date) {
        return { dueDate: null as Date | null, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    const dueDate = new Date(task.due.date);
    const hasTimeComponent = task.due.date.includes("T");

    return {
        dueDate,
        dueDatePrecision: (hasTimeComponent ? null : "day") as LocalTask["dueDatePrecision"],
    };
}

export function mapTodoistTaskToLocal(
    task: Task,
    mappings: TodoistMappingState
): Partial<LocalTask> {
    const { dueDate, dueDatePrecision } = parseTodoistDueDate(task);
    const listId = resolveTodoistTaskListId(task, mappings);

    return {
        title: task.content,
        description: task.description ?? null,
        isCompleted: task.checked ?? false,
        completedAt: task.checked ? new Date() : null,
        listId,
        dueDate,
        dueDatePrecision,
        isRecurring: task.due?.isRecurring ?? false,
        recurringRule: task.due?.isRecurring ? task.due.string ?? null : null,
        parentId: null,
    };
}

export function mapLocalTaskToTodoist(
    task: LocalTaskWithLabels,
    mappings: TodoistMappingState,
    options?: {
        labelIds?: number[];
        labelIdToExternal?: Map<number, string>;
    }
): AddTaskArgs {
    const mapping = applyListLabelMapping(task.listId ?? null, mappings);
    const labelIds = options?.labelIds ?? [];
    const labelMap = options?.labelIdToExternal;
    const mappedLabels = labelMap
        ? labelIds
            .map((labelId) => labelMap.get(labelId) ?? null)
            .filter((labelId): labelId is string => Boolean(labelId))
        : undefined;
    const labels = mappedLabels && mappedLabels.length > 0
        ? mappedLabels
        : mapping.labelIds;
    const iso = task.dueDate ? task.dueDate.toISOString() : null;
    const hasTime = iso ? !iso.endsWith("T00:00:00.000Z") : false;
    const dueDate = task.dueDate ? task.dueDate.toISOString().split("T")[0] : undefined;

    return {
        content: task.title,
        description: task.description ?? undefined,
        projectId: mapping.projectId,
        labels,
        priority: toTodoistPriority(task.priority ?? "none"),
        dueDate: hasTime ? undefined : dueDate,
        dueDatetime: hasTime ? iso ?? undefined : undefined,
        dueString: task.isRecurring && task.recurringRule ? task.recurringRule : undefined,
        parentId: undefined,
    };
}
