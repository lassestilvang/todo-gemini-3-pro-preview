import { TodoistClient } from "./client";
import type { Task as TodoistTask, Label as TodoistLabel } from "@doist/todoist-api-typescript";
import type { Project as TodoistProject } from "./mapping";

export type TodoistProjectMapping = {
    projectId: string;
    listId: number | null;
};

export type TodoistLabelMapping = {
    labelId: string;
    listId: number | null;
};

export type TodoistMappings = {
    projects: TodoistProjectMapping[];
    labels: TodoistLabelMapping[];
};

export type TodoistSettingsSnapshot = {
    projects: TodoistProject[];
    labels: TodoistLabel[];
    tasks: TodoistTask[];
};

export function createTodoistClient(token: string) {
    return new TodoistClient(token);
}

export async function fetchTodoistSnapshot(client: TodoistClient): Promise<TodoistSettingsSnapshot> {
    const [projects, labels, tasks] = await Promise.all([
        client.getProjects(),
        client.getLabels(),
        client.getTasks().then(res => res.results),
    ]);

    return {
        projects: projects.results ?? [],
        labels: labels.results ?? [],
        tasks: tasks,
    };
}

export function normalizeTodoistPriority(priority: number | undefined | null) {
    if (!priority) {
        return "none" as const;
    }

    switch (priority) {
        case 4:
            return "high" as const;
        case 3:
            return "medium" as const;
        case 2:
            return "low" as const;
        default:
            return "none" as const;
    }
}

export function toTodoistPriority(priority: "none" | "low" | "medium" | "high" | null | undefined) {
    switch (priority) {
        case "high":
            return 4;
        case "medium":
            return 3;
        case "low":
            return 2;
        default:
            return 1;
    }
}
