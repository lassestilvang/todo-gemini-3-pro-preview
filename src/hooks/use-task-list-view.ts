
import { useMemo } from "react";
import { Task } from "@/lib/types";
import { ViewSettings } from "@/lib/view-settings";
import { startOfDay, endOfDay } from "date-fns";
import { DuePrecision, getDueRange, isInCurrentPeriod } from "@/lib/due-utils";
import { applyViewSettings, groupTasks } from "@/lib/task-view-utils";

interface UseTaskListViewProps {
    allStoreTasks: Task[];
    listId?: number | null;
    labelId?: number;
    filterType?: string;
    tasksFromProps?: Task[];
    weekStartsOnMonday?: boolean;
    settings: ViewSettings;
}

export type PeriodPrecision = Exclude<DuePrecision, "day">;

export function useTaskListView({
    allStoreTasks,
    listId,
    labelId,
    filterType,
    tasksFromProps,
    weekStartsOnMonday,
    settings
}: UseTaskListViewProps) {
    const derivedTasks = useMemo(() => {
        const now = new Date();
        const nowTime = now.getTime();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const todayStartTime = todayStart.getTime();
        const todayEndTime = todayEnd.getTime();

        const weekAnchor = startOfDay(new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - (weekStartsOnMonday ? 1 : 0)));
        const monthAnchor = startOfDay(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
        const yearAnchor = startOfDay(new Date(todayStart.getFullYear(), 0, 1));

        if (tasksFromProps && tasksFromProps.length > 0 && !filterType) {
            const propIds = new Set(tasksFromProps.map(t => t.id));
            return allStoreTasks.filter(t => propIds.has(t.id) || t.id < 0);
        }

        const filtered: Task[] = [];
        for (const task of allStoreTasks) {
            if (listId !== undefined) {
                if (listId === null) {
                    if (task.listId !== null) continue;
                } else if (task.listId !== listId) continue;
            }

            if (labelId && !task.labels?.some(l => l.id === labelId)) continue;

            if (filterType === "inbox") {
                if (task.listId !== null) continue;
            } else if (filterType === "today") {
                if (!task.dueDate) continue;
                const precision = task.dueDatePrecision ?? "day";
                if (precision === "day") {
                    const dueTime = (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).getTime();
                    if (dueTime > todayEndTime) continue;
                    if (dueTime < todayStartTime && task.isCompleted) continue;
                } else {
                    const inPeriod = getDueRange(task.dueDate, precision as DuePrecision, weekStartsOnMonday ?? false);
                    if (!(todayStart.getTime() >= inPeriod.start.getTime() && todayStart.getTime() < inPeriod.endExclusive.getTime())) continue;
                }
            } else if (filterType === "upcoming") {
                if (!task.dueDate) continue;
                const precision = task.dueDatePrecision ?? "day";
                const dueTime = (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).getTime();
                if (precision === "day") {
                    if (dueTime <= nowTime) continue;
                } else if (precision === "week") {
                    if (dueTime <= weekAnchor.getTime()) continue;
                } else if (precision === "month") {
                    if (dueTime <= monthAnchor.getTime()) continue;
                } else if (precision === "year") {
                    if (dueTime <= yearAnchor.getTime()) continue;
                }
            }
            filtered.push(task);
        }
        return filtered;
    }, [allStoreTasks, listId, labelId, filterType, tasksFromProps, weekStartsOnMonday]);

    const processedTasks = useMemo(() => {
        return applyViewSettings(derivedTasks, settings);
    }, [derivedTasks, settings]);

    const { listTasks, periodSections } = useMemo(() => {
        if (filterType !== "today" || settings.layout !== "list") {
            return { listTasks: processedTasks, periodSections: [] };
        }

        const sectionsMap = new Map<PeriodPrecision, Task[]>();
        const listTasks: Task[] = [];
        const today = new Date();

        for (const task of processedTasks) {
            const precision = (task.dueDatePrecision ?? "day") as DuePrecision;
            if (precision === "day" || !task.dueDate) {
                listTasks.push(task);
                continue;
            }

            const inPeriod = isInCurrentPeriod(
                { dueDate: task.dueDate, dueDatePrecision: precision },
                today,
                weekStartsOnMonday ?? false
            );

            if (!inPeriod) {
                listTasks.push(task);
                continue;
            }

            const key = precision as PeriodPrecision;
            const existing = sectionsMap.get(key) ?? [];
            existing.push(task);
            sectionsMap.set(key, existing);
        }

        const periodSections = (["week", "month", "year"] as PeriodPrecision[])
            .map((precision) => {
                const tasks = sectionsMap.get(precision);
                if (!tasks || tasks.length === 0) return null;
                const labels = { week: "This Week", month: "This Month", year: "This Year" };
                return { precision, label: labels[precision], tasks };
            })
            .filter(Boolean) as Array<{ precision: PeriodPrecision; label: string; tasks: Task[] }>;

        return { listTasks, periodSections };
    }, [processedTasks, filterType, settings.layout, weekStartsOnMonday]);

    const { overdueTasks, activeTasks, completedTasks } = useMemo(() => {
        const todayStart = startOfDay(new Date());
        const todayStartTime = todayStart.getTime();

        const overdue: Task[] = [];
        const active: Task[] = [];
        const completed: Task[] = [];

        for (const task of listTasks) {
            if (task.isCompleted) {
                if (settings.showCompleted) completed.push(task);
            } else if (task.dueDate) {
                const precision = task.dueDatePrecision ?? "day";
                let isOverdue = false;

                if (precision === "day") {
                    isOverdue = (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).getTime() < todayStartTime;
                } else {
                    const dueData = { dueDate: task.dueDate, dueDatePrecision: precision as DuePrecision };
                    const now = new Date();
                    const period = getDueRange(dueData.dueDate, dueData.dueDatePrecision, weekStartsOnMonday ?? false);
                    isOverdue = now.getTime() >= period.endExclusive.getTime();
                }

                if (isOverdue) overdue.push(task);
                else active.push(task);
            } else {
                active.push(task);
            }
        }

        return { overdueTasks: overdue, activeTasks: active, completedTasks: completed };
    }, [listTasks, settings.showCompleted, weekStartsOnMonday]);

    const nonOverdueTasks = useMemo(() => {
        return [...activeTasks, ...(settings.showCompleted ? completedTasks : [])];
    }, [activeTasks, completedTasks, settings.showCompleted]);

    const groupedEntries = useMemo(() => {
        if (settings.groupBy === "none") return [];
        const groups = groupTasks(nonOverdueTasks, settings.groupBy);

        let entries = Array.from(groups.entries());
        if (settings.groupBy === "dueDate") {
            entries.sort((a, b) => {
                if (a[0] === "No Date") return 1;
                if (b[0] === "No Date") return -1;
                return a[0].localeCompare(b[0]);
            });
        } else if (settings.groupBy === "estimate") {
            const getMins = (key: string) => {
                if (key === "No Estimate") return Infinity;
                if (key.includes("h")) {
                    const parts = key.split(" ");
                    let total = 0;
                    for (const part of parts) {
                        if (part.endsWith("h")) total += parseInt(part) * 60;
                        if (part.endsWith("m")) total += parseInt(part);
                    }
                    return total;
                }
                return parseInt(key);
            };
            entries.sort((a, b) => getMins(a[0]) - getMins(b[0]));
        }
        return entries;
    }, [nonOverdueTasks, settings.groupBy]);

    return {
        derivedTasks,
        processedTasks,
        listTasks,
        periodSections,
        overdueTasks,
        activeTasks,
        completedTasks,
        groupedEntries,
        nonOverdueTasks
    };
}
