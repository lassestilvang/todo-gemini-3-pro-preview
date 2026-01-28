import {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    reorderTasks,
    updateSubtask
} from '@/lib/actions/tasks';
import {
    createList,
    updateList,
    deleteList,
    reorderLists
} from '@/lib/actions/lists';
import {
    createLabel,
    updateLabel,
    deleteLabel,
    reorderLabels
} from '@/lib/actions/labels';

// Map of action names to their implementation
export const actionRegistry: Record<string, (...args: any[]) => Promise<any>> = {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    reorderTasks,
    updateSubtask,
    createList,
    updateList,
    deleteList,
    reorderLists,
    createLabel,
    updateLabel,
    deleteLabel,
    reorderLabels,
};

export type ActionType = keyof typeof actionRegistry;
