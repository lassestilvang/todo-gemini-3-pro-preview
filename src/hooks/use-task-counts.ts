import { useMemo } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { isToday, isFuture, parseISO, startOfDay } from "date-fns";

export interface TaskCounts {
    total: number;
    inbox: number;
    today: number;
    upcoming: number;
    listCounts: Record<number, number>;
    labelCounts: Record<number, number>;
}

export function useTaskCounts(): TaskCounts {
    const tasks = useTaskStore(state => state.tasks);

    return useMemo(() => {
        const counts: TaskCounts = {
            total: 0,
            inbox: 0,
            today: 0,
            upcoming: 0,
            listCounts: {},
            labelCounts: {},
        };

        const now = new Date();
        const todayStart = startOfDay(now);

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
                const date = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;

                if (isToday(date)) {
                    counts.today++;
                } else if (isFuture(date)) {
                    // Note: 'Upcoming' typically means everything in the future, 
                    // or sometimes specifically "next 7 days". 
                    // Based on typical todo apps, Upcoming usually means "Scheduled for future".
                    // Let's count strictly future dates.
                    counts.upcoming++;
                }
            }
        });

        return counts;
    }, [tasks]);
}
