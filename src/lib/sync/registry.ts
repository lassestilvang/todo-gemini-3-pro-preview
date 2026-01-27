import {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    reorderTasks,
    updateSubtask
} from '@/lib/actions/tasks';

// Map of action names to their implementation
export const actionRegistry: Record<string, (...args: any[]) => Promise<any>> = {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    reorderTasks,
    updateSubtask,
    // Add others as needed
};

export type ActionType = keyof typeof actionRegistry;
