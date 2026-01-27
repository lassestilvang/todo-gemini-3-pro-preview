import { useMemo } from "react";
import { Task } from "@/lib/types";
import { useSync } from "@/components/providers/sync-provider";

/**
 * @deprecated Use Zustand store directly instead. Optimistic updates are now
 * applied in SyncProvider.dispatch() to the global task store, eliminating
 * the need for this hook. This avoids duplicate state and O(A×N) re-computation.
 * 
 * Will be removed in a future version.
 */
export function useOptimisticTasks(serverTasks: Task[]) {
    const { pendingActions } = useSync();

    return useMemo(() => {
        let tasks = [...serverTasks];

        // Apply actions in order
        for (const action of pendingActions) {
            try {
                // If the action failed, do we still apply it?
                // Yes, until we clear it or it's resolved. "Pending" is optimistic.
                // If it failed and we are editing it, we might want to keep it?
                // For now, assume we always apply.

                switch (action.type) {
                    case "createTask": {
                        // Payload: [data: InsertTask & { labelIds? }]
                        const data = action.payload[0] as any;

                        const newTask: Task = {
                            id: action.tempId!,
                            title: data.title,
                            description: data.description ?? null,
                            icon: data.icon ?? null,
                            priority: data.priority ?? "none",
                            dueDate: data.dueDate ? new Date(data.dueDate) : null,
                            deadline: data.deadline ? new Date(data.deadline) : null,
                            isCompleted: false,
                            estimateMinutes: data.estimateMinutes ?? null,
                            position: 0,
                            actualMinutes: null,
                            isRecurring: data.isRecurring ?? false,
                            listId: data.listId ?? null,
                            listName: null,
                            listColor: null,
                            listIcon: null,
                            recurringRule: data.recurringRule ?? null,
                            energyLevel: data.energyLevel ?? null,
                            context: data.context ?? null,
                            isHabit: data.isHabit ?? false,
                            labels: [],
                            blockedByCount: 0,
                            subtasks: [],
                            subtaskCount: 0,
                            completedSubtaskCount: 0,
                        };
                        tasks.unshift(newTask);
                        break;
                    }
                    case "updateTask": {
                        // Payload: [id, userId, data]
                        const [id, , data] = action.payload;
                        tasks = tasks.map(t => {
                            if (t.id === id) {
                                const updates = { ...data };
                                if (updates.dueDate && typeof updates.dueDate === 'string') updates.dueDate = new Date(updates.dueDate);
                                if (updates.deadline && typeof updates.deadline === 'string') updates.deadline = new Date(updates.deadline);
                                return { ...t, ...updates };
                            }
                            return t;
                        });
                        break;
                    }
                    case "deleteTask": {
                        // Payload: [id, userId]
                        const [id] = action.payload;
                        tasks = tasks.filter(t => t.id !== id);
                        break;
                    }
                    case "toggleTaskCompletion": {
                        // Payload: [id, userId, isCompleted]
                        const [id, , isCompleted] = action.payload;
                        tasks = tasks.map(t => {
                            if (t.id === id) {
                                return { ...t, isCompleted };
                            }
                            return t;
                        });
                        break;
                    }
                    case "reorderTasks": {
                        // Payload: [userId, updates]
                        const [, updates] = action.payload;
                        const posMap = new Map(updates.map((u: any) => [u.id, u.position]));
                        tasks = tasks.map(t => ({
                            ...t,
                            position: posMap.has(t.id) ? (posMap.get(t.id) as number) : t.position
                        }));
                        tasks.sort((a, b) => a.position - b.position);
                        break;
                    }
                    case "updateSubtask": {
                        const [id, , isCompleted] = action.payload;
                        tasks = tasks.map(t => {
                            if (t.subtasks?.some(s => s.id === id)) {
                                const newSubtasks = t.subtasks.map(s => s.id === id ? { ...s, isCompleted } : s);
                                const completedCount = newSubtasks.filter(s => s.isCompleted).length;
                                return {
                                    ...t,
                                    subtasks: newSubtasks,
                                    completedSubtaskCount: completedCount
                                };
                            }
                            return t;
                        });
                        break;
                    }
                }
            } catch (e) {
                console.error("Failed to apply optimistic update for action", action.type, e);
            }
        }

        return tasks;
    }, [serverTasks, pendingActions]);
}
