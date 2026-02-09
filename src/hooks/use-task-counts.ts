import { useMemo } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { addDays, startOfDay } from "date-fns";
import type { Task } from "@/lib/types";

export interface TaskCounts {
    total: number;
    inbox: number;
    today: number;
    upcoming: number;
    listCounts: Record<number, number>;
    labelCounts: Record<number, number>;
}

const EMPTY_TASKS: Record<number, Task> = Object.freeze({});
const EMPTY_COUNTS: TaskCounts = Object.freeze({
    total: 0,
    inbox: 0,
    today: 0,
    upcoming: 0,
    listCounts: {},
    labelCounts: {},
});

export function useTaskCounts(enabled: boolean = true): TaskCounts {
    const tasks = useTaskStore(state => (enabled ? state.tasks : EMPTY_TASKS));

    return useMemo(() => {
        if (!enabled) {
            return EMPTY_COUNTS;
        }

        const counts: TaskCounts = {
            total: 0,
            inbox: 0,
            today: 0,
            upcoming: 0,
            listCounts: {},
            labelCounts: {},
        };

        const now = new Date();
        const nowTime = now.getTime();
        const todayStart = startOfDay(now).getTime();
        const tomorrowStart = addDays(new Date(todayStart), 1).getTime();

        Object.values(tasks).forEach(task => {
            // Only count incomplete tasks
            if (task.isCompleted) return;

            counts.total++;

            // Inbox (no list)
            if (!task.listId) {
                counts.inbox++;
            }

            // List Counts
            if (task.listId) {
                counts.listCounts[task.listId] = (counts.listCounts[task.listId] || 0) + 1;
            }

            // Label Counts
            if (task.labels && Array.isArray(task.labels)) {
                task.labels.forEach(label => {
                    counts.labelCounts[label.id] = (counts.labelCounts[label.id] || 0) + 1;
                });
            }

            // Date Checks
            if (task.dueDate) {
                // Perf: avoid per-task date-fns helpers by comparing timestamps once.
                // This removes extra Date allocations and reduces helper calls for large lists.
                const dueTime = typeof task.dueDate === "string"
                    ? Date.parse(task.dueDate)
                    : task.dueDate.getTime();

                if (!Number.isNaN(dueTime)) {
                    if (dueTime >= todayStart && dueTime < tomorrowStart) {
                        counts.today++;
                    } else if (dueTime > nowTime) {
                        // Note: 'Upcoming' typically means everything in the future,
                        // or sometimes specifically "next 7 days".
                        // Based on typical todo apps, Upcoming usually means "Scheduled for future".
                        // Let's count strictly future dates.
                        counts.upcoming++;
                    }
                }
            }
        });

        return counts;
    }, [tasks, enabled]);
}
