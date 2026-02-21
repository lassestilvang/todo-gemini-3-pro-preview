import { create } from 'zustand';
import { Task } from '@/lib/types';
import { deleteTaskFromCache, getCachedTasks, replaceTasksInCache, saveTaskToCache, saveTasksToCache } from '@/lib/sync/db';

interface TaskState {
    tasks: Record<number, Task>;
    // Perf: subtaskId → taskId index for O(1) lookups instead of O(n) find().
    // When updating a subtask, we need to find its parent task quickly.
    subtaskIndex: Record<number, number>;
    isInitialized: boolean;
    initialize: () => Promise<void>;
    setTasks: (tasks: Task[]) => void;
    replaceTasks: (tasks: Task[]) => void;
    upsertTasks: (tasks: Task[]) => void;
    upsertTask: (task: Task) => void;
    deleteTasks: (ids: number[]) => void;
    deleteTask: (id: number) => void;
    updateSubtaskCompletion: (subtaskId: number, isCompleted: boolean) => void;
    getTaskBySubtaskId: (subtaskId: number) => Task | undefined;
}

// Perf: Helper to build subtask index from a task map
function buildSubtaskIndex(tasks: Record<number, Task>): Record<number, number> {
    const index: Record<number, number> = {};
    for (const taskId in tasks) {
        const task = tasks[taskId];
        if (task.subtasks) {
            for (const subtask of task.subtasks) {
                index[subtask.id] = task.id;
            }
        }
    }
    return index;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: {},
    subtaskIndex: {},
    isInitialized: false,

    initialize: async () => {
        if (get().isInitialized) return;

        try {
            const cached = await getCachedTasks();
            const cachedMap: Record<number, Task> = {};
            cached.forEach((t: Task) => {
                cachedMap[t.id] = t;
            });

            const mergedTasks = { ...cachedMap, ...get().tasks };
            set({
                // Merge: prefer state.tasks (SSR/fresh) over cachedMap (stale IDB)
                tasks: mergedTasks,
                subtaskIndex: buildSubtaskIndex(mergedTasks),
                isInitialized: true,
            });
        } catch (e) {
            console.error("Failed to load tasks from cache", e);
            set({ isInitialized: true });
        }
    },

    setTasks: (newTasks: Task[]) => {
        set(state => {
            const updatedTasks = { ...state.tasks };
            const updatedIndex = { ...state.subtaskIndex };
            newTasks.forEach(t => {
                updatedTasks[t.id] = t;
                // Perf: incrementally update subtask index
                if (t.subtasks) {
                    for (const subtask of t.subtasks) {
                        updatedIndex[subtask.id] = t.id;
                    }
                }
            });
            return { tasks: updatedTasks, subtaskIndex: updatedIndex };
        });

        // Persist to IDB in background (upsert individual tasks or batch)
        saveTasksToCache(newTasks).catch(console.error);
    },

    replaceTasks: (newTasks: Task[]) => {
        const replacement: Record<number, Task> = {};
        newTasks.forEach((task) => {
            replacement[task.id] = task;
        });
        set({
            tasks: replacement,
            subtaskIndex: buildSubtaskIndex(replacement),
        });
        replaceTasksInCache(newTasks).catch(console.error);
    },

    upsertTasks: (tasks: Task[]) => {
        if (tasks.length === 0) return;
        // Perf: batch upserts to reduce Zustand set() calls during sync drains.
        set(state => {
            const updatedTasks = { ...state.tasks };
            const updatedIndex = { ...state.subtaskIndex };
            tasks.forEach(task => {
                updatedTasks[task.id] = task;
                // Perf: incrementally update subtask index
                if (task.subtasks) {
                    for (const subtask of task.subtasks) {
                        updatedIndex[subtask.id] = task.id;
                    }
                }
            });
            return { tasks: updatedTasks, subtaskIndex: updatedIndex };
        });
        saveTasksToCache(tasks).catch(console.error);
    },

    upsertTask: (task: Task) => {
        // Update State
        set(state => {
            const updatedIndex = { ...state.subtaskIndex };
            // Perf: incrementally update subtask index
            if (task.subtasks) {
                for (const subtask of task.subtasks) {
                    updatedIndex[subtask.id] = task.id;
                }
            }
            return {
                tasks: { ...state.tasks, [task.id]: task },
                subtaskIndex: updatedIndex
            };
        });
        // Persist
        saveTaskToCache(task).catch(console.error);
    },

    deleteTasks: (ids: number[]) => {
        if (ids.length === 0) return;
        // Perf: batch deletes to reduce Zustand set() calls during sync drains.
        set(state => {
            const newTasks = { ...state.tasks };
            const updatedIndex = { ...state.subtaskIndex };
            ids.forEach(id => {
                // Perf: clean up subtask index entries for deleted tasks
                const task = newTasks[id];
                if (task?.subtasks) {
                    for (const subtask of task.subtasks) {
                        delete updatedIndex[subtask.id];
                    }
                }
                delete newTasks[id];
            });
            return { tasks: newTasks, subtaskIndex: updatedIndex };
        });
        Promise.all(ids.map(id => deleteTaskFromCache(id))).catch(console.error);
    },

    deleteTask: (id: number) => {
        set(state => {
            const newTasks = { ...state.tasks };
            const updatedIndex = { ...state.subtaskIndex };
            // Perf: clean up subtask index entries for deleted task
            const task = newTasks[id];
            if (task?.subtasks) {
                for (const subtask of task.subtasks) {
                    delete updatedIndex[subtask.id];
                }
            }
            delete newTasks[id];
            return { tasks: newTasks, subtaskIndex: updatedIndex };
        });
        deleteTaskFromCache(id).catch(console.error);
    },

    updateSubtaskCompletion: (subtaskId: number, isCompleted: boolean) => {
        // Perf: avoid mapping every subtask on each toggle; update only the changed subtask.
        // Expected impact: fewer allocations and faster updates for tasks with many subtasks.
        set(state => {
            const taskId = state.subtaskIndex[subtaskId];
            if (taskId === undefined) return state;
            const task = state.tasks[taskId];
            const subtasks = task?.subtasks;
            if (!task || !subtasks || subtasks.length === 0) return state;

            let index = -1;
            for (let i = 0; i < subtasks.length; i += 1) {
                if (subtasks[i].id === subtaskId) {
                    index = i;
                    break;
                }
            }
            if (index === -1) return state;

            const existingSubtask = subtasks[index];
            if (existingSubtask.isCompleted === isCompleted) return state;

            const updatedSubtasks = subtasks.slice();
            updatedSubtasks[index] = { ...existingSubtask, isCompleted };

            const completedSubtaskCount = task.completedSubtaskCount ?? 0;
            const delta = isCompleted ? 1 : -1;
            const nextCompletedCount = Math.max(0, completedSubtaskCount + delta);

            return {
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...task,
                        subtasks: updatedSubtasks,
                        completedSubtaskCount: nextCompletedCount,
                    }
                },
                subtaskIndex: state.subtaskIndex
            };
        });
    },

    // Perf: O(1) lookup for finding a task by subtask ID instead of O(n) find()
    getTaskBySubtaskId: (subtaskId: number) => {
        const state = get();
        const taskId = state.subtaskIndex[subtaskId];
        return taskId !== undefined ? state.tasks[taskId] : undefined;
    }
}));
