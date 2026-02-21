import type { PersonalProject, WorkspaceProject, Task } from "@doist/todoist-api-typescript";
export type Project = PersonalProject | WorkspaceProject;

export type TodoistProjectAssignment = {
    projectId: string;
    listId: number | null;
};

export type TodoistLabelAssignment = {
    labelId: string;
    listId: number | null;
};

export type TodoistMappingState = {
    projects: TodoistProjectAssignment[];
    labels: TodoistLabelAssignment[];
};

export function buildDefaultProjectAssignments(
    projects: Project[],
    localLists: { id: number }[]
): TodoistProjectAssignment[] {
    return projects.map((project, index) => ({
        projectId: project.id,
        listId: localLists[index]?.id ?? null,
    }));
}

export function resolveTodoistTaskListId(
    task: Task,
    mappings: TodoistMappingState
): number | null {
    const projectMatch = mappings.projects.find((mapping) => mapping.projectId === task.projectId);
    if (projectMatch?.listId) {
        return projectMatch.listId;
    }

    if (!task.labels?.length) {
        return null;
    }

    for (const labelId of task.labels) {
        const labelMatch = mappings.labels.find((mapping) => mapping.labelId === labelId);
        if (labelMatch?.listId) {
            return labelMatch.listId;
        }
    }

    return null;
}

export function applyListLabelMapping(
    listId: number | null,
    mappings: TodoistMappingState
): { projectId?: string; labelIds?: string[] } {
    if (!listId) {
        return {};
    }

    const projectMatch = mappings.projects.find((mapping) => mapping.listId === listId);
    if (projectMatch) {
        return { projectId: projectMatch.projectId };
    }

    const labelMatch = mappings.labels.find((mapping) => mapping.listId === listId);
    if (labelMatch) {
        return { labelIds: [labelMatch.labelId] };
    }

    return {};
}
