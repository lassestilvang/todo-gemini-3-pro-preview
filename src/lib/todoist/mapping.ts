import type {
  PersonalProject,
  WorkspaceProject,
  Task,
} from "@doist/todoist-api-typescript";
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
  localLists: { id: number }[],
): TodoistProjectAssignment[] {
  return projects.map((project, index) => ({
    projectId: project.id,
    listId: localLists[index]?.id ?? null,
  }));
}

export function resolveTodoistTaskListId(
  task: Task,
  mappings: TodoistMappingState,
): number | null {
  // ⚡ Bolt Opt: Replace O(N) Array.find with for...of to avoid callback overhead in hot mapping loop
  for (const mapping of mappings.projects) {
    if (mapping.projectId === task.projectId && mapping.listId) {
      return mapping.listId;
    }
  }

  if (!task.labels?.length) {
    return null;
  }

  for (const labelId of task.labels) {
    // ⚡ Bolt Opt: Replace O(N) Array.find with for...of to avoid callback overhead in hot mapping loop
    for (const mapping of mappings.labels) {
      if (mapping.labelId === labelId && mapping.listId) {
        return mapping.listId;
      }
    }
  }

  return null;
}

export function applyListLabelMapping(
  listId: number | null,
  mappings: TodoistMappingState,
): { projectId?: string; labelIds?: string[] } {
  if (!listId) {
    return {};
  }

  // ⚡ Bolt Opt: Replace O(N) Array.find with for...of to avoid callback overhead in hot mapping loop
  for (const mapping of mappings.projects) {
    if (mapping.listId === listId) {
      return { projectId: mapping.projectId };
    }
  }

  // ⚡ Bolt Opt: Replace O(N) Array.find with for...of to avoid callback overhead in hot mapping loop
  for (const mapping of mappings.labels) {
    if (mapping.listId === listId) {
      return { labelIds: [mapping.labelId] };
    }
  }

  return {};
}
