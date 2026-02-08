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
import { withErrorHandling } from '@/lib/action-result';

// Map of action names to their implementation
export const actionRegistry = {
    createTask: withErrorHandling(createTask),
    updateTask: withErrorHandling(updateTask),
    deleteTask: withErrorHandling(deleteTask),
    toggleTaskCompletion: withErrorHandling(toggleTaskCompletion),
    reorderTasks: withErrorHandling(reorderTasks),
    updateSubtask: withErrorHandling(updateSubtask),
    createList: withErrorHandling(createList),
    updateList: withErrorHandling(updateList),
    deleteList: withErrorHandling(deleteList),
    reorderLists: withErrorHandling(reorderLists),
    createLabel: withErrorHandling(createLabel),
    updateLabel: withErrorHandling(updateLabel),
    deleteLabel: withErrorHandling(deleteLabel),
    reorderLabels: withErrorHandling(reorderLabels),
} as const;

export type ActionType = keyof typeof actionRegistry;
