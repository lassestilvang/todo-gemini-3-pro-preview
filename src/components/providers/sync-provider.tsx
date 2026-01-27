"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getQueue, addToQueue, removeFromQueue, updateActionStatus, getDB } from "@/lib/sync/db";
import { PendingAction, SyncStatus } from "@/lib/sync/types";
import { actionRegistry, ActionType } from "@/lib/sync/registry";
import { toast } from "sonner";
import { useTaskStore } from "@/lib/store/task-store";

interface SyncContextType {
    pendingActions: PendingAction[];
    dispatch: (type: ActionType, ...args: any[]) => Promise<any>;
    status: SyncStatus;
    isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync must be used within a SyncProvider");
    return context;
};

function replaceIdsInPayload(payload: any, oldId: number, newId: number): any {
    if (payload === oldId) return newId;
    if (Array.isArray(payload)) return payload.map(item => replaceIdsInPayload(item, oldId, newId));
    if (typeof payload === 'object' && payload !== null) {
        const newObj: any = {};
        for (const key in payload) {
            newObj[key] = replaceIdsInPayload(payload[key], oldId, newId);
        }
        return newObj;
    }
    return payload;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [status, setStatus] = useState<SyncStatus>('online');
    const [isOnline, setIsOnline] = useState(true);
    const processingRef = useRef(false);

    // Initial load
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const loadQueue = async () => {
            const queue = await getQueue();
            setPendingActions(queue);
        };
        loadQueue();

        const handleOnline = () => {
            setIsOnline(true);
            setStatus('online');
            toast.success("Back online");
            processQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setStatus('offline');
            toast.message("You are offline. Changes saved locally.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Also try to process queue on mount if online
    useEffect(() => {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline]);

    const fixupQueueIds = async (oldId: number, newId: number) => {
        const db = await getDB();
        const queue = await getQueue();

        for (const action of queue) {
            // Check if this action uses the old ID
            const newPayload = replaceIdsInPayload(action.payload, oldId, newId);
            if (JSON.stringify(newPayload) !== JSON.stringify(action.payload)) {
                action.payload = newPayload;
                await db.put('queue', action);
            }
        }

        // Refresh local state
        setPendingActions(await getQueue());
    };

    const processQueue = async () => {
        if (processingRef.current || !navigator.onLine) return;

        const queue = await getQueue();
        if (queue.length === 0) return;

        processingRef.current = true;
        setStatus('syncing');

        try {
            // Process sequentially
            for (const action of queue) {
                const fn = actionRegistry[action.type];
                if (!fn) {
                    console.error(`Unknown action type: ${action.type}`);
                    await removeFromQueue(action.id);
                    continue;
                }

                try {
                    await updateActionStatus(action.id, 'processing');

                    // Execute Server Action
                    const result = await fn(...action.payload);

                    // If this action created a temp ID, we need to fix up future actions
                    if (action.tempId && result && result.id) {
                        await fixupQueueIds(action.tempId, result.id);

                        // Fixup the store: Remove temp ID task, Add real ID task
                        const store = useTaskStore.getState();
                        store.deleteTask(action.tempId);
                        store.upsertTask(result);
                    } else if (result) {
                        // Generic update to store if result is a task
                        const store = useTaskStore.getState();
                        if (action.type === 'deleteTask') {
                            store.deleteTask(action.payload[0]);
                        } else if (result && typeof result === 'object' && 'id' in result) {
                            store.upsertTask(result);
                        }
                    }

                    await removeFromQueue(action.id);
                    setPendingActions(prev => prev.filter(p => p.id !== action.id));

                } catch (error) {
                    console.error(`Failed to process action ${action.id}:`, error);
                    // If network error, stop processing and retry later
                    // If logical error (400/500), maybe remove or stash?
                    // For now, we assume network errors mostly.
                    // But if it's a validation error, we should probably remove it to unblock component.
                    // TODO: meaningful error handling logic
                    await updateActionStatus(action.id, 'failed', String(error));

                    // Stop processing on error to preserve order if dependency exists
                    // But if it's a persistent error, we block everything.
                    // Simple strategy: If it's network-like (fetch failed), stop.
                    // If it's logic, remove.

                    // For now, stop to be safe.
                    break;
                }
            }
        } finally {
            processingRef.current = false;
            setStatus('online');
        }
    };

    const dispatch = useCallback(async (type: ActionType, ...args: any[]) => {
        const id = uuidv4();

        // Check if this is a creation action that needs a temp ID
        let tempId: number | undefined;
        if (type === 'createTask' || type === 'createList' || type === 'createLabel') {
            // Assuming the first arg is the data object
            // We assign a negative ID to the payloads that need it so the UI can use it
            // But usually the component creates the object with temp ID *before* calling dispatch?
            // Actually, the `args` here are what the server expects (without ID usually).

            // Wait, for `createTask`, the server action takes `data`.
            // We usually want to return the optimistic result immediately.
            // So we should generate a temp ID here and attach it to the action record.
            tempId = -Date.now();
        }

        const action: PendingAction = {
            id,
            type,
            payload: args,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
            tempId
        };

        // Add to IDB
        await addToQueue(action);

        // Update Local State
        setPendingActions(prev => [...prev, action]);

        // Optimistic Update to Global Store
        const store = useTaskStore.getState();
        try {
            if (type === 'createTask') {
                const data = args[0];
                store.upsertTask({
                    id: tempId!,
                    ...data,
                    // safe defaults
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    deadline: data.deadline ? new Date(data.deadline) : null,
                    isCompleted: false,
                    position: 0,
                    subtasks: [],
                    subtaskCount: 0,
                    completedSubtaskCount: 0,
                    labels: [],
                    priority: data.priority || "none",
                    title: data.title
                } as any);
            } else if (type === 'updateTask') {
                const [id, , data] = args;
                const existing = store.tasks[id];
                if (existing) {
                    store.upsertTask({ ...existing, ...data });
                }
            } else if (type === 'deleteTask') {
                store.deleteTask(args[0]);
            } else if (type === 'toggleTaskCompletion') {
                const [id, , isCompleted] = args;
                const existing = store.tasks[id];
                if (existing) {
                    store.upsertTask({ ...existing, isCompleted });
                }
            } else if (type === 'updateSubtask') {
                const [id, , isCompleted] = args;
                // Find task containing subtask - this is expensive O(N) but fine for client
                const task = Object.values(store.tasks).find((t: any) => t.subtasks?.some((s: any) => s.id === id));
                if (task) {
                    const newSubtasks = task.subtasks!.map((s: any) => s.id === id ? { ...s, isCompleted } : s);
                    store.upsertTask({ ...task, subtasks: newSubtasks });
                }
            }
        } catch (e) { console.error("Optimistic store update failed", e); }

        // Attempt Sync
        if (navigator.onLine) {
            processQueue();
        }

        return { id: tempId, ...args[0] }; // Approximate optimistic result
    }, []);

    return (
        <SyncContext.Provider value={{
            pendingActions,
            dispatch,
            status,
            isOnline
        }}>
            {children}
        </SyncContext.Provider>
    );
}
