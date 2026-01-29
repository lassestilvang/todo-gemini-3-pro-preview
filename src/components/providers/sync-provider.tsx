"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { getQueue, addToQueue, removeFromQueue, updateActionStatus, getDB } from "@/lib/sync/db";
import { PendingAction, SyncStatus, ConflictInfo } from "@/lib/sync/types";
import { actionRegistry, ActionType } from "@/lib/sync/registry";
import { toast } from "sonner";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { ConflictDialog } from "@/components/sync/ConflictDialog";

interface SyncContextType {
    pendingActions: PendingAction[];
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<any>;
    status: SyncStatus;
    isOnline: boolean;
    conflicts: ConflictInfo[];
    resolveConflict: (actionId: string, resolution: 'local' | 'server' | 'merge', mergedData?: unknown) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync must be used within a SyncProvider");
    return context;
};

function replaceIdsInPayload(payload: unknown, oldId: number, newId: number): unknown {
    if (payload === oldId) return newId;
    if (Array.isArray(payload)) return payload.map(item => replaceIdsInPayload(item, oldId, newId));
    if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;
        const newObj: Record<string, unknown> = {};
        for (const key in obj) {
            newObj[key] = replaceIdsInPayload(obj[key], oldId, newId);
        }
        return newObj;
    }
    return payload;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [status, setStatus] = useState<SyncStatus>('online');
    const [isOnline, setIsOnline] = useState(true);
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
    const processingRef = useRef(false);
    const processQueueRef = useRef<(() => Promise<void>) | undefined>(undefined);

    const fixupQueueIds = useCallback(async (oldId: number, newId: number) => {
        const dbCurrent = await getDB();
        const queue = await getQueue();

        for (const action of queue) {
            // Check if this action uses the old ID
            const newPayload = replaceIdsInPayload(action.payload, oldId, newId);
            if (JSON.stringify(newPayload) !== JSON.stringify(action.payload)) {
                action.payload = newPayload as any[];
                await dbCurrent.put('queue', action);
            }
        }

        // Refresh local state
        setPendingActions(await getQueue());
    }, []);

    const processQueue = useCallback(async () => {
        if (processingRef.current || !navigator.onLine) return;

        const queue = await getQueue();
        if (queue.length === 0) return;

        processingRef.current = true;
        setStatus('syncing');

        try {
            // Process sequentially
            for (const action of queue) {
                const fn = actionRegistry[action.type as ActionType];
                if (!fn) {
                    console.error(`Unknown action type: ${action.type}`);
                    await removeFromQueue(action.id);
                    continue;
                }

                try {
                    await updateActionStatus(action.id, 'processing');

                    // Execute Server Action
                    const result = await (fn as (...args: any[]) => Promise<any>)(...(action.payload as any[]));

                    // If this action created a temp ID, we need to fix up future actions
                    if (action.tempId && result && result.id) {
                        await fixupQueueIds(action.tempId, result.id);

                        // Fixup the store: Remove temp ID, Add real ID
                        if (action.type === 'createTask') {
                            const store = useTaskStore.getState();
                            store.deleteTask(action.tempId);
                            store.upsertTask(result);
                        } else if (action.type === 'createList') {
                            const store = useListStore.getState();
                            store.deleteList(action.tempId);
                            store.upsertList(result);
                        } else if (action.type === 'createLabel') {
                            const store = useLabelStore.getState();
                            store.deleteLabel(action.tempId);
                            store.upsertLabel(result);
                        }
                    } else if (result) {
                        // Generic update to store
                        const payload = action.payload as any[];
                        if (action.type === 'deleteTask') {
                            useTaskStore.getState().deleteTask(payload[0]);
                        } else if (action.type === 'deleteList') {
                            useListStore.getState().deleteList(payload[0]);
                        } else if (action.type === 'deleteLabel') {
                            useLabelStore.getState().deleteLabel(payload[0]);
                        } else if (action.type.includes('Task') && typeof result === 'object' && 'id' in result) {
                            useTaskStore.getState().upsertTask(result);
                        } else if (action.type.includes('List') && typeof result === 'object' && 'id' in result) {
                            useListStore.getState().upsertList(result);
                        } else if (action.type.includes('Label') && typeof result === 'object' && 'id' in result) {
                            useLabelStore.getState().upsertLabel(result);
                        }
                    }

                    await removeFromQueue(action.id);
                    setPendingActions(prev => prev.filter(p => p.id !== action.id));

                } catch (error: unknown) {
                    console.error(`Failed to process action ${action.id}:`, error);

                    // Check if it's a conflict error (from ActionResult)
                    const err = error as any;
                    const isConflict = err?.code === 'CONFLICT' ||
                        (typeof err === 'object' && err?.error?.code === 'CONFLICT');

                    if (isConflict) {
                        const serverData = err?.serverData || err?.error?.details?.serverData;
                        const payload = action.payload as any[];
                        setConflicts(prev => [...prev, {
                            actionId: action.id,
                            actionType: action.type,
                            serverData: serverData ? (typeof serverData === 'string' ? JSON.parse(serverData) : serverData) : null,
                            localData: payload[2], // For updateTask, payload is [id, userId, data]
                            timestamp: Date.now(),
                        }]);
                        // Mark as conflict, don't block queue
                        await updateActionStatus(action.id, 'failed', 'CONFLICT');
                        continue; // Skip to next action instead of breaking
                    }

                    // If network error, stop processing and retry later
                    // If logical error (400/500), maybe remove or stash?
                    await updateActionStatus(action.id, 'failed', String(error));

                    // Stop processing on error to preserve order if dependency exists
                    break;
                }
            }
        } finally {
            processingRef.current = false;
            setStatus('online');
        }
    }, [fixupQueueIds]);

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
    }, [processQueue]);

    // Also try to process queue on mount if online
    useEffect(() => {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline, processQueue]);

    // Keep ref updated with latest processQueue to avoid stale closures in event listeners
    processQueueRef.current = processQueue;

    const resolveConflict = useCallback(async (
        actionId: string,
        resolution: 'local' | 'server' | 'merge',
        mergedData?: unknown
    ) => {
        const action = pendingActions.find(a => a.id === actionId);
        if (!action) return;

        if (resolution === 'server') {
            // Discard local changes, use server data
            await removeFromQueue(actionId);
            setPendingActions(prev => prev.filter(p => p.id !== actionId));
            // Update store with server data
            const conflict = conflicts.find(c => c.actionId === actionId);
            if (conflict?.serverData && action.type.includes('Task')) {
                useTaskStore.getState().upsertTask(conflict.serverData as any);
            }
        } else if (resolution === 'local') {
            // Retry with force flag (remove expectedUpdatedAt check)
            const newPayload = [...(action.payload as any[])];
            if (newPayload[2] && typeof newPayload[2] === 'object') {
                delete (newPayload[2] as any).expectedUpdatedAt;
            }
            action.payload = newPayload;
            await updateActionStatus(actionId, 'pending');
            processQueue();
        } else if (resolution === 'merge' && mergedData) {
            // Update payload with merged data and retry
            const payload = action.payload as any[];
            payload[2] = { ...payload[2], ...(mergedData as any) };
            delete payload[2].expectedUpdatedAt;
            action.payload = payload;
            await updateActionStatus(actionId, 'pending');
            processQueue();
        }

        setConflicts(prev => prev.filter(c => c.actionId !== actionId));
    }, [pendingActions, conflicts, processQueue]);

    const dispatch = useCallback(async <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => {
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
        const taskStore = useTaskStore.getState();
        const listStore = useListStore.getState();
        const labelStore = useLabelStore.getState();
        try {
            const a = args as any;
            if (type === 'createTask') {
                const data = a[0];
                taskStore.upsertTask({
                    id: tempId!,
                    ...data,
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
                const [id, , data] = a;
                const existing = taskStore.tasks[id];
                if (existing) {
                    // Add expectedUpdatedAt for conflict detection
                    if (existing.updatedAt) {
                        a[2] = { ...data, expectedUpdatedAt: existing.updatedAt };
                        action.payload = a;
                    }
                    taskStore.upsertTask({ ...existing, ...data });
                }
            } else if (type === 'deleteTask') {
                taskStore.deleteTask(a[0]);
            } else if (type === 'toggleTaskCompletion') {
                const [id, , isCompleted] = a;
                const existing = taskStore.tasks[id];
                if (existing) {
                    taskStore.upsertTask({ ...existing, isCompleted });
                }
            } else if (type === 'updateSubtask') {
                const [id, , isCompleted] = a;
                const task = Object.values(taskStore.tasks).find((t: any) => t.subtasks?.some((s: any) => s.id === id));
                if (task) {
                    const newSubtasks = task.subtasks!.map((s: any) => s.id === id ? { ...s, isCompleted } : s);
                    taskStore.upsertTask({ ...task, subtasks: newSubtasks });
                }
            } else if (type === 'createList') {
                const data = a[0];
                listStore.upsertList({
                    id: tempId!,
                    name: data.name,
                    color: data.color || null,
                    icon: data.icon || null,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
                    position: data.position || 0,
                });
            } else if (type === 'updateList') {
                const [id, , data] = a;
                const existing = listStore.lists[id];
                if (existing) {
                    listStore.upsertList({ ...existing, ...data });
                }
            } else if (type === 'deleteList') {
                listStore.deleteList(a[0]);
            } else if (type === 'createLabel') {
                const data = a[0];
                labelStore.upsertLabel({
                    id: tempId!,
                    name: data.name,
                    color: data.color || null,
                    icon: data.icon || null,
                    position: data.position || 0,
                });
            } else if (type === 'updateLabel') {
                const [id, , data] = a;
                const existing = labelStore.labels[id];
                if (existing) {
                    labelStore.upsertLabel({ ...existing, ...data });
                }
            } else if (type === 'deleteLabel') {
                labelStore.deleteLabel(a[0]);
            }
        } catch (e) { console.error("Optimistic store update failed", e); }

        // Attempt Sync
        if (navigator.onLine) {
            processQueue();
        }

        return { id: tempId, ...(args[0] as any) }; // Approximate optimistic result
    }, [processQueue]);

    const value = useMemo(() => ({
        pendingActions,
        dispatch,
        status,
        isOnline,
        conflicts,
        resolveConflict,
    }), [pendingActions, dispatch, status, isOnline, conflicts, resolveConflict]);

    const currentConflict = conflicts.length > 0 ? conflicts[0] : null;

    const handleConflictClose = useCallback(() => {
        if (currentConflict) {
            setConflicts(prev => prev.filter(c => c.actionId !== currentConflict.actionId));
        }
    }, [currentConflict]);

    return (
        <SyncContext.Provider value={value}>
            {children}
            <ConflictDialog
                conflict={currentConflict}
                onResolve={resolveConflict}
                onClose={handleConflictClose}
            />
        </SyncContext.Provider>
    );
}
