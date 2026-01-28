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
    dispatch: (type: ActionType, ...args: any[]) => Promise<any>;
    status: SyncStatus;
    isOnline: boolean;
    conflicts: ConflictInfo[];
    resolveConflict: (actionId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
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
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
    const processingRef = useRef(false);
    const processQueueRef = useRef<(() => Promise<void>) | undefined>(undefined);

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
            processQueueRef.current?.();
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
                        if (action.type === 'deleteTask') {
                            useTaskStore.getState().deleteTask(action.payload[0]);
                        } else if (action.type === 'deleteList') {
                            useListStore.getState().deleteList(action.payload[0]);
                        } else if (action.type === 'deleteLabel') {
                            useLabelStore.getState().deleteLabel(action.payload[0]);
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

                } catch (error: any) {
                    console.error(`Failed to process action ${action.id}:`, error);
                    
                    // Check if it's a conflict error (from ActionResult)
                    const isConflict = error?.code === 'CONFLICT' || 
                                       (typeof error === 'object' && error?.error?.code === 'CONFLICT');
                    
                    if (isConflict) {
                        const serverData = error?.serverData || error?.error?.details?.serverData;
                        setConflicts(prev => [...prev, {
                            actionId: action.id,
                            actionType: action.type,
                            serverData: serverData ? (typeof serverData === 'string' ? JSON.parse(serverData) : serverData) : null,
                            localData: action.payload[2], // For updateTask, payload is [id, userId, data]
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
    };

    // Keep ref updated with latest processQueue to avoid stale closures in event listeners
    processQueueRef.current = processQueue;

    const resolveConflict = useCallback(async (
        actionId: string, 
        resolution: 'local' | 'server' | 'merge',
        mergedData?: any
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
                useTaskStore.getState().upsertTask(conflict.serverData);
            }
        } else if (resolution === 'local') {
            // Retry with force flag (remove expectedUpdatedAt check)
            const newPayload = [...action.payload];
            if (newPayload[2] && typeof newPayload[2] === 'object') {
                delete newPayload[2].expectedUpdatedAt;
            }
            action.payload = newPayload;
            await updateActionStatus(actionId, 'pending');
            processQueueRef.current?.();
        } else if (resolution === 'merge' && mergedData) {
            // Update payload with merged data and retry
            action.payload[2] = { ...action.payload[2], ...mergedData };
            delete action.payload[2].expectedUpdatedAt;
            await updateActionStatus(actionId, 'pending');
            processQueueRef.current?.();
        }

        setConflicts(prev => prev.filter(c => c.actionId !== actionId));
    }, [pendingActions, conflicts]);

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
        const taskStore = useTaskStore.getState();
        const listStore = useListStore.getState();
        const labelStore = useLabelStore.getState();
        try {
            if (type === 'createTask') {
                const data = args[0];
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
                const [id, , data] = args;
                const existing = taskStore.tasks[id];
                if (existing) {
                    // Add expectedUpdatedAt for conflict detection
                    if (existing.updatedAt) {
                        args[2] = { ...data, expectedUpdatedAt: existing.updatedAt };
                        action.payload = args;
                    }
                    taskStore.upsertTask({ ...existing, ...data });
                }
            } else if (type === 'deleteTask') {
                taskStore.deleteTask(args[0]);
            } else if (type === 'toggleTaskCompletion') {
                const [id, , isCompleted] = args;
                const existing = taskStore.tasks[id];
                if (existing) {
                    taskStore.upsertTask({ ...existing, isCompleted });
                }
            } else if (type === 'updateSubtask') {
                const [id, , isCompleted] = args;
                const task = Object.values(taskStore.tasks).find((t: any) => t.subtasks?.some((s: any) => s.id === id));
                if (task) {
                    const newSubtasks = task.subtasks!.map((s: any) => s.id === id ? { ...s, isCompleted } : s);
                    taskStore.upsertTask({ ...task, subtasks: newSubtasks });
                }
            } else if (type === 'createList') {
                const data = args[0];
                listStore.upsertList({
                    id: tempId!,
                    name: data.name,
                    color: data.color || null,
                    icon: data.icon || null,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
                    position: data.position || 0,
                });
            } else if (type === 'updateList') {
                const [id, , data] = args;
                const existing = listStore.lists[id];
                if (existing) {
                    listStore.upsertList({ ...existing, ...data });
                }
            } else if (type === 'deleteList') {
                listStore.deleteList(args[0]);
            } else if (type === 'createLabel') {
                const data = args[0];
                labelStore.upsertLabel({
                    id: tempId!,
                    name: data.name,
                    color: data.color || null,
                    icon: data.icon || null,
                    position: data.position || 0,
                });
            } else if (type === 'updateLabel') {
                const [id, , data] = args;
                const existing = labelStore.labels[id];
                if (existing) {
                    labelStore.upsertLabel({ ...existing, ...data });
                }
            } else if (type === 'deleteLabel') {
                labelStore.deleteLabel(args[0]);
            }
        } catch (e) { console.error("Optimistic store update failed", e); }

        // Attempt Sync
        if (navigator.onLine) {
            processQueue();
        }

        return { id: tempId, ...args[0] }; // Approximate optimistic result
    }, []);

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
