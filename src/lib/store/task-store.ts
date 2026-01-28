import { create } from 'zustand';
import { Task } from '@/lib/types';
import { getCachedTasks, saveTaskToCache, saveTasksToCache, deleteTaskFromCache } from '@/lib/sync/db';

interface TaskState {
    tasks: Record<number, Task>;
    isInitialized: boolean;
    initialize: () => Promise<void>;
    setTasks: (tasks: Task[]) => void;
    upsertTask: (task: Task) => void;
    deleteTask: (id: number) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: {},
    isInitialized: false,

    initialize: async () => {
        if (get().isInitialized) return;

        try {
            const cached = await getCachedTasks();
            const cachedMap: Record<number, Task> = {};
            cached.forEach((t: any) => {
                cachedMap[t.id] = t;
            });

            set(state => ({
                // Merge: prefer state.tasks (SSR/fresh) over cachedMap (stale IDB)
                tasks: { ...cachedMap, ...state.tasks },
                isInitialized: true,
            }));
        } catch (e) {
            console.error("Failed to load tasks from cache", e);
            set({ isInitialized: true });
        }
    },

    setTasks: (newTasks: Task[]) => {
        set(state => {
            const updatedTasks = { ...state.tasks };
            newTasks.forEach(t => {
                updatedTasks[t.id] = t;
            });
            return { tasks: updatedTasks };
        });

        // Persist to IDB in background (upsert individual tasks or batch)
        saveTasksToCache(newTasks).catch(console.error);
    },

    upsertTask: (task: Task) => {
        // Update State
        set(state => ({
            tasks: { ...state.tasks, [task.id]: task }
        }));
        // Persist
        saveTaskToCache(task).catch(console.error);
    },

    deleteTask: (id: number) => {
        set(state => {
            const newTasks = { ...state.tasks };
            delete newTasks[id];
            return { tasks: newTasks };
        });
        deleteTaskFromCache(id).catch(console.error);
    }
}));
