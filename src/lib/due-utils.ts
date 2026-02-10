import {
    addDays,
    addMonths,
    addYears,
    endOfDay,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
} from "date-fns";

export type DuePrecision = "day" | "week" | "month" | "year";

export const DUE_PRECISIONS: DuePrecision[] = ["day", "week", "month", "year"];

export function normalizeDueAnchor(
    date: Date,
    precision: DuePrecision,
    weekStartsOnMonday: boolean
): Date {
    const weekStartsOn = weekStartsOnMonday ? 1 : 0;

    switch (precision) {
        case "week":
            return startOfWeek(date, { weekStartsOn });
        case "month":
            return startOfMonth(date);
        case "year":
            return startOfYear(date);
        case "day":
        default:
            return startOfDay(date);
    }
}

export function getDueRange(
    anchor: Date,
    precision: DuePrecision,
    weekStartsOnMonday: boolean
): { start: Date; endExclusive: Date } {
    const start = normalizeDueAnchor(anchor, precision, weekStartsOnMonday);
    let endExclusive: Date;

    switch (precision) {
        case "week":
            endExclusive = addDays(start, 7);
            break;
        case "month":
            endExclusive = addMonths(start, 1);
            break;
        case "year":
            endExclusive = addYears(start, 1);
            break;
        case "day":
        default:
            endExclusive = addDays(start, 1);
            break;
    }

    return { start, endExclusive };
}

export function formatDuePeriod(task: {
    dueDate: Date;
    dueDatePrecision?: DuePrecision | null;
}): string {
    const precision = task.dueDatePrecision ?? "day";

    switch (precision) {
        case "week":
            return `Week of ${task.dueDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            })}`;
        case "month":
            return task.dueDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
            });
        case "year":
            return task.dueDate.toLocaleDateString(undefined, {
                year: "numeric",
            });
        case "day":
        default:
            return task.dueDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            });
    }
}

export function isDueOverdue(
    task: { dueDate?: Date | null; dueDatePrecision?: DuePrecision | null },
    now: Date,
    weekStartsOnMonday: boolean
): boolean {
    if (!task.dueDate) return false;
    const precision = task.dueDatePrecision ?? "day";
    if (precision === "day") {
        return task.dueDate.getTime() < startOfDay(now).getTime();
    }

    const { endExclusive } = getDueRange(task.dueDate, precision, weekStartsOnMonday);
    return endExclusive.getTime() <= startOfDay(now).getTime();
}

export function isInCurrentPeriod(
    task: { dueDate?: Date | null; dueDatePrecision?: DuePrecision | null },
    now: Date,
    weekStartsOnMonday: boolean
): boolean {
    if (!task.dueDate) return false;
    const precision = task.dueDatePrecision ?? "day";
    if (precision === "day") {
        return startOfDay(task.dueDate).getTime() === startOfDay(now).getTime();
    }

    const { start, endExclusive } = getDueRange(task.dueDate, precision, weekStartsOnMonday);
    const nowTime = startOfDay(now).getTime();
    return nowTime >= start.getTime() && nowTime < endExclusive.getTime();
}

export function coerceDuePrecision(
    dueDate: Date | null | undefined,
    precision: DuePrecision | null | undefined
): DuePrecision | null {
    if (!dueDate) return null;
    if (!precision || precision === "day") return null;
    return precision;
}

export function toEndOfDuePeriod(
    task: { dueDate: Date; dueDatePrecision?: DuePrecision | null },
    weekStartsOnMonday: boolean
): Date {
    const precision = task.dueDatePrecision ?? "day";
    if (precision === "day") {
        return endOfDay(task.dueDate);
    }
    const { endExclusive } = getDueRange(task.dueDate, precision, weekStartsOnMonday);
    return new Date(endExclusive.getTime() - 1);
}
