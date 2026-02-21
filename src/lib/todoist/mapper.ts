import type { tasks } from "@/db";
import { applyListLabelMapping, resolveTodoistTaskListId } from "./mapping";
import { normalizeTodoistPriority, toTodoistPriority } from "./service";
import type { Task, AddTaskArgs } from "@doist/todoist-api-typescript";
import type { TodoistMappingState } from "./mapping";

type LocalTask = typeof tasks.$inferSelect;

type LocalTaskWithLabels = LocalTask & {
    labelNames?: string[];
};

function parseTodoistTimestamp(value: string | null | undefined) {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
        return null;
    }
    return parsed;
}

function parseTodoistDateOnly(value: string | null | undefined) {
    if (!value) {
        return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }
    return parsed;
}

function hasLocalTimeComponent(date: Date) {
    return date.getHours() !== 0 ||
        date.getMinutes() !== 0 ||
        date.getSeconds() !== 0 ||
        date.getMilliseconds() !== 0;
}

function formatLocalDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseTodoistDueDate(task: Task) {
    const dueDateTime = parseTodoistTimestamp(task.due?.datetime ?? null);
    if (dueDateTime) {
        return { dueDate: dueDateTime, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    if (!task.due?.date) {
        return { dueDate: null as Date | null, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    const dueDate = parseTodoistDateOnly(task.due.date);
    if (!dueDate) {
        return { dueDate: null as Date | null, dueDatePrecision: null as LocalTask["dueDatePrecision"] };
    }

    return {
        dueDate,
        dueDatePrecision: "day" as LocalTask["dueDatePrecision"],
    };
}

function parseTodoistDeadline(task: Task) {
    if (!task.deadline?.date) {
        return null;
    }
    return parseTodoistDateOnly(task.deadline.date);
}

function parseTodoistDurationMinutes(task: Task) {
    if (!task.duration) {
        return null;
    }
    if (task.duration.unit === "minute") {
        return task.duration.amount;
    }
    if (task.duration.unit === "day") {
        return task.duration.amount * 24 * 60;
    }
    return null;
}

export function mapTodoistTaskToLocal(
    task: Task,
    mappings: TodoistMappingState
): Partial<LocalTask> {
    const { dueDate, dueDatePrecision } = parseTodoistDueDate(task);
    const listId = resolveTodoistTaskListId(task, mappings);
    const completedAt = task.checked
        ? (parseTodoistTimestamp(task.completedAt) ?? new Date())
        : null;

    return {
        title: task.content,
        description: task.description ?? null,
        isCompleted: task.checked ?? false,
        completedAt,
        listId,
        priority: normalizeTodoistPriority(task.priority),
        dueDate,
        dueDatePrecision,
        deadline: parseTodoistDeadline(task),
        estimateMinutes: parseTodoistDurationMinutes(task),
        isRecurring: task.due?.isRecurring ?? false,
        recurringRule: task.due?.isRecurring ? task.due.string ?? null : null,
        parentId: null,
        createdAt: parseTodoistTimestamp(task.addedAt) ?? undefined,
    };
}

export function mapLocalTaskToTodoist(
    task: LocalTaskWithLabels,
    mappings: TodoistMappingState,
    options?: {
        labelIds?: number[];
        labelIdToExternal?: Map<number, string>;
        externalLabelToName?: Map<string, string>;
    }
): AddTaskArgs {
    const mapping = applyListLabelMapping(task.listId ?? null, mappings);
    const labelIds = options?.labelIds ?? [];
    const labelMap = options?.labelIdToExternal;
    const externalLabelToName = options?.externalLabelToName;
    const mappedLabels = labelMap
        ? labelIds
            .map((labelId) => labelMap.get(labelId) ?? null)
            .filter((labelId): labelId is string => Boolean(labelId))
        : undefined;
    // Preserve explicit task labels and append list-scoping label mapping when needed.
    // This prevents scoped tasks from dropping out of label-based sync.
    const combinedLabels = new Set<string>();
    if (mapping.labelIds) {
        for (const labelId of mapping.labelIds) {
            combinedLabels.add(labelId);
        }
    }
    if (mappedLabels) {
        for (const labelId of mappedLabels) {
            combinedLabels.add(labelId);
        }
    }
    const labels = combinedLabels.size > 0
        ? Array.from(
            new Set(
                Array.from(combinedLabels).map((externalId) => externalLabelToName?.get(externalId) ?? externalId)
            )
        )
        : undefined;
    const iso = task.dueDate ? task.dueDate.toISOString() : null;
    const hasTime = task.dueDate ? hasLocalTimeComponent(task.dueDate) : false;
    const dueDate = task.dueDate ? formatLocalDateOnly(task.dueDate) : undefined;
    const deadlineDate = task.deadline ? formatLocalDateOnly(task.deadline) : undefined;
    const durationMinutes = typeof task.estimateMinutes === "number" && task.estimateMinutes > 0
        ? Math.round(task.estimateMinutes)
        : undefined;

    return {
        content: task.title,
        description: task.description ?? undefined,
        projectId: mapping.projectId,
        labels,
        priority: toTodoistPriority(task.priority ?? "none"),
        dueDate: hasTime ? undefined : dueDate,
        dueDatetime: hasTime ? iso ?? undefined : undefined,
        dueString: task.isRecurring && task.recurringRule ? task.recurringRule : undefined,
        deadlineDate,
        duration: durationMinutes,
        durationUnit: durationMinutes ? "minute" : undefined,
        parentId: undefined,
    };
}
