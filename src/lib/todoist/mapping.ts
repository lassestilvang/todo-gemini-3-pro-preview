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

// ⚡ Bolt Opt: Precomputed lookup maps with WeakMap caching for O(1) task resolution instead of O(N*M)
const mappingCache = new WeakMap<TodoistMappingState, {
    projectByProjectId: Map<string, TodoistProjectAssignment>;
    labelByLabelId: Map<string, TodoistLabelAssignment>;
    projectByListId: Map<number, TodoistProjectAssignment>;
    labelByListId: Map<number, TodoistLabelAssignment>;
}>();

function getCachedMaps(mappings: TodoistMappingState) {
    let cache = mappingCache.get(mappings);
    if (!cache) {
        cache = {
            projectByProjectId: new Map(mappings.projects.map(p => [p.projectId, p])),
            labelByLabelId: new Map(mappings.labels.map(l => [l.labelId, l])),
            projectByListId: new Map(mappings.projects.filter(p => p.listId !== null).map(p => [p.listId!, p])),
            labelByListId: new Map(mappings.labels.filter(l => l.listId !== null).map(l => [l.listId!, l])),
        };
        mappingCache.set(mappings, cache);
    }
    return cache;
}

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
    const maps = getCachedMaps(mappings);
    const projectMatch = maps.projectByProjectId.get(task.projectId);
    if (projectMatch?.listId) {
        return projectMatch.listId;
    }
  }

  if (!task.labels?.length) {
    return null;
  }

    for (const labelId of task.labels) {
        const labelMatch = maps.labelByLabelId.get(labelId);
        if (labelMatch?.listId) {
            return labelMatch.listId;
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

    const maps = getCachedMaps(mappings);

    const projectMatch = maps.projectByListId.get(listId);
    if (projectMatch) {
        return { projectId: projectMatch.projectId };
    }
  }

    const labelMatch = maps.labelByListId.get(listId);
    if (labelMatch) {
        return { labelIds: [labelMatch.labelId] };
    }
  }

  return {};
}
