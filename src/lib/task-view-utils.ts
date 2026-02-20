
import { Task } from "@/lib/types";
import { ViewSettings } from "@/lib/view-settings";
import { DuePrecision } from "@/lib/due-utils";

/**
 * Applies view settings (filtering and sorting) to a list of tasks.
 */
export function applyViewSettings(tasks: Task[], settings: ViewSettings): Task[] {
    let result: Task[] = [];
    for (const task of tasks) {
        if (!settings.showCompleted && task.isCompleted) continue;
        if (settings.filterDate === "hasDate" && task.dueDate === null) continue;
        if (settings.filterDate === "noDate" && task.dueDate !== null) continue;
        if (settings.filterPriority && task.priority !== settings.filterPriority) continue;
        if (settings.filterLabelId !== null && !task.labels?.some(label => label.id === settings.filterLabelId)) continue;
        if (settings.filterEnergyLevel && task.energyLevel !== settings.filterEnergyLevel) continue;
        if (settings.filterContext && task.context !== settings.filterContext) continue;
        result.push(task);
    }

    if (settings.sortBy !== "manual") {
        const sortMultiplier = settings.sortOrder === "desc" ? -1 : 1;
        if (settings.sortBy === "dueDate") {
            const withDueTime = result.map(task => ({
                task,
                dueTime: task.dueDate
                    ? (task.dueDate instanceof Date ? task.dueDate.getTime() : new Date(task.dueDate).getTime())
                    : Infinity,
            }));
            withDueTime.sort((a, b) => (a.dueTime - b.dueTime) * sortMultiplier);
            result = withDueTime.map(item => item.task);
        } else {
            const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 } as const;
            result.sort((a, b) => {
                let comparison = 0;
                switch (settings.sortBy) {
                    case "priority":
                        comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3);
                        break;
                    case "name":
                        comparison = a.title.localeCompare(b.title);
                        break;
                    case "created":
                        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                        comparison = aTime - bTime;
                        break;
                }
                return comparison * sortMultiplier;
            });
        }
    }

    if (settings.showCompleted) {
        const active: Task[] = [];
        const completed: Task[] = [];
        for (const task of result) {
            (task.isCompleted ? completed : active).push(task);
        }
        result = active.concat(completed);
    }
    return result;
}

/**
 * Groups tasks by the specified grouping key.
 */
export function groupTasks(tasks: Task[], groupBy: ViewSettings["groupBy"]): Map<string, Task[]> {
    const groups = new Map<string, Task[]>();
    if (groupBy === "none") {
        groups.set("", tasks);
        return groups;
    }

    for (const task of tasks) {
        let key = "";
        switch (groupBy) {
            case "dueDate":
                if (task.dueDate) {
                    if (task.dueDatePrecision && task.dueDatePrecision !== "day") {
                        key = `${task.dueDatePrecision}:${(task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).toISOString()}`;
                    } else {
                        const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    }
                } else key = "No Date";
                break;
            case "priority":
                key = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "None";
                break;
            case "label":
                if (task.labels && task.labels.length > 0) {
                    if (task.labels.length === 1) key = task.labels[0].name;
                    else {
                        const labelNames = task.labels.map(l => l.name).sort();
                        key = labelNames.join(", ");
                    }
                } else key = "No Label";
                break;
            case "list":
                key = task.listName || "Inbox";
                break;
            case "estimate":
                if (task.estimateMinutes) {
                    const mins = task.estimateMinutes;
                    if (mins < 60) key = `${mins} m`;
                    else {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        key = m > 0 ? `${h}h ${m} m` : `${h} h`;
                    }
                } else key = "No Estimate";
                break;
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(task);
    }
    return groups;
}
