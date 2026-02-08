/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { getQueue, addToQueueBatch, removeFromQueue, removeFromQueueBatch, updateActionStatus, updateActionStatusBatch, getDB } from "@/lib/sync/db";
import { PendingAction, SyncStatus, ConflictInfo } from "@/lib/sync/types";
import { actionRegistry, ActionType } from "@/lib/sync/registry";
import { toast } from "sonner";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { ConflictDialog } from "@/components/sync/ConflictDialog";
import { useQueryClient } from "@tanstack/react-query";

interface SyncContextType {
    pendingActions: PendingAction[];
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<any>;
    status: SyncStatus;
    isOnline: boolean;
    conflicts: ConflictInfo[];
    resolveConflict: (actionId: string, resolution: 'local' | 'server' | 'merge', mergedData?: unknown) => Promise<void>;
    retryAction: (actionId: string) => Promise<void>;
    dismissAction: (actionId: string) => Promise<void>;
    retryAllFailed: () => Promise<void>;
    dismissAllFailed: () => Promise<void>;
    syncNow: () => void;
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
    const queryClient = useQueryClient();
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [status, setStatus] = useState<SyncStatus>('online');
    const [isOnline, setIsOnline] = useState(true);
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
    const MAX_PENDING_QUEUE = 100;
    const FLUSH_IDLE_TIMEOUT_MS = 200;
    const processingRef = useRef(false);
    const processQueueRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const flushActionsRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const pendingQueueRef = useRef<PendingAction[]>([]);
    const flushTimerRef = useRef<any>(null);
    const flushIdleRef = useRef<any>(null);

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

        processingRef.current = true;

        let queue: PendingAction[];
        try {
            queue = await getQueue();
        } catch (error) {
            console.error("Failed to fetch sync queue:", error);
            processingRef.current = false;
            return;
        }

        if (queue.length === 0) {
            processingRef.current = false;
            return;
        }

        setStatus('syncing');

        const completedIds: string[] = [];
        const statusUpdates: Array<{ id: string; status: PendingAction['status']; error?: string }> = [];
        const taskUpserts: any[] = [];
        const taskDeletes: number[] = [];
        const listUpserts: any[] = [];
        const listDeletes: number[] = [];
        const labelUpserts: any[] = [];
        const labelDeletes: number[] = [];
        const conflictUpdates: ConflictInfo[] = [];
        try {
            // Process sequentially
            for (const action of queue) {
                const fn = actionRegistry[action.type as ActionType];
                if (!fn) {
                    console.error(`Unknown action type: ${action.type}`);
                    completedIds.push(action.id);
                    continue;
                }

                try {
                    // Perf: batch status updates to avoid per-action IDB writes.
                    statusUpdates.push({ id: action.id, status: 'processing' });

                    // Execute Server Action
                    const result = await (fn as (...args: any[]) => Promise<any>)(...(action.payload as any[]));

                    // If this action created a temp ID, we need to fix up future actions
                    if (action.tempId && result && result.id) {
                        await fixupQueueIds(action.tempId, result.id);

                        // Fixup the store: Remove temp ID, Add real ID
                        if (action.type === 'createTask') {
                            taskDeletes.push(action.tempId);
                            taskUpserts.push(result);
                        } else if (action.type === 'createList') {
                            listDeletes.push(action.tempId);
                            listUpserts.push(result);
                        } else if (action.type === 'createLabel') {
                            labelDeletes.push(action.tempId);
                            labelUpserts.push(result);
                        }
                    } else if (result) {
                        // Generic update to store
                        const payload = action.payload as any[];
                        if (action.type === 'deleteTask') {
                            taskDeletes.push(payload[0]);
                        } else if (action.type === 'deleteList') {
                            listDeletes.push(payload[0]);
                        } else if (action.type === 'deleteLabel') {
                            labelDeletes.push(payload[0]);
                        } else if (action.type.includes('Task') && typeof result === 'object' && 'id' in result) {
                            taskUpserts.push(result);
                        } else if (action.type.includes('List') && typeof result === 'object' && 'id' in result) {
                            listUpserts.push(result);
                        } else if (action.type.includes('Label') && typeof result === 'object' && 'id' in result) {
                            labelUpserts.push(result);
                        }
                    }

                    // Invalidate user stats on completion toggle to update XP/Streak immediately
                    if (action.type === 'toggleTaskCompletion') {
                        const payload = action.payload as any[];
                        const userId = payload[1];
                        if (userId) {
                            queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
                        }
                    }

                    completedIds.push(action.id);

                } catch (error: unknown) {
                    console.error(`Failed to process action ${action.id}:`, error);

                    // Check if it's a conflict error (from ActionResult)
                    const err = error as any;
                    const isConflict = err?.code === 'CONFLICT' ||
                        (typeof err === 'object' && err?.error?.code === 'CONFLICT');

                    if (isConflict) {
                        const serverData = err?.serverData || err?.error?.details?.serverData;
                        const payload = action.payload as any[];
                        conflictUpdates.push({
                            actionId: action.id,
                            actionType: action.type,
                            serverData: serverData ? (typeof serverData === 'string' ? JSON.parse(serverData) : serverData) : null,
                            localData: payload[2], // For updateTask, payload is [id, userId, data]
                            timestamp: Date.now(),
                        });
                        // Mark as conflict, don't block queue
                        statusUpdates.push({ id: action.id, status: 'failed', error: 'CONFLICT' });
                        continue; // Skip to next action instead of breaking
                    }

                    // If network error, stop processing and retry later
                    // If logical error (400/500), maybe remove or stash?
                    statusUpdates.push({ id: action.id, status: 'failed', error: String(error) });

                    // Stop processing on error to preserve order if dependency exists
                    break;
                }
            }
        } finally {
            if (taskUpserts.length > 0) {
                // Perf: batch store updates to reduce React render churn during sync drains.
                useTaskStore.getState().upsertTasks(taskUpserts);
            }
            if (taskDeletes.length > 0) {
                useTaskStore.getState().deleteTasks(taskDeletes);
            }
            if (listUpserts.length > 0) {
                useListStore.getState().upsertLists(listUpserts);
            }
            if (listDeletes.length > 0) {
                useListStore.getState().deleteLists(listDeletes);
            }
            if (labelUpserts.length > 0) {
                useLabelStore.getState().upsertLabels(labelUpserts);
            }
            if (labelDeletes.length > 0) {
                useLabelStore.getState().deleteLabels(labelDeletes);
            }
            if (conflictUpdates.length > 0) {
                // Perf: batch conflict updates to avoid per-action dialog state churn.
                setConflicts(prev => [...prev, ...conflictUpdates]);
            }
            if (completedIds.length > 0) {
                // Perf: batch IDB deletes to reduce per-action transaction overhead when draining the queue.
                await removeFromQueueBatch(completedIds);
            }
            if (statusUpdates.length > 0) {
                await updateActionStatusBatch(statusUpdates);
            }
            if (completedIds.length > 0 || statusUpdates.length > 0) {
                // Perf: refresh pendingActions once after batch updates to avoid per-action state churn.
                setPendingActions(await getQueue());
            }
            processingRef.current = false;
            setStatus('online');
        }
    }, [fixupQueueIds, queryClient]);

    // Initial load
    useEffect(() => {
        const handlePageExit = () => {
            // Perf: flush queued actions before the page is hidden/unloaded.
            void flushActionsRef.current?.();
        };
        window.addEventListener('pagehide', handlePageExit);
        window.addEventListener('beforeunload', handlePageExit);

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
            window.removeEventListener('pagehide', handlePageExit);
            window.removeEventListener('beforeunload', handlePageExit);
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

    const flushQueuedActions = useCallback(async () => {
        const queued = pendingQueueRef.current;
        if (queued.length === 0) return;
        pendingQueueRef.current = [];

        if (flushTimerRef.current !== null) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
        if (flushIdleRef.current !== null && 'cancelIdleCallback' in window) {
            (window as any).cancelIdleCallback(flushIdleRef.current);
            flushIdleRef.current = null;
        }

        // Perf: batch IDB writes + state updates for rapid dispatch bursts.
        await addToQueueBatch(queued);
        setPendingActions(prev => [...prev, ...queued]);
    }, []);

    flushActionsRef.current = flushQueuedActions;

    const scheduleFlush = useCallback(() => {
        if (pendingQueueRef.current.length >= MAX_PENDING_QUEUE) {
            void flushQueuedActions();
            return;
        }

        if (flushTimerRef.current !== null || flushIdleRef.current !== null) return;

        if ('requestIdleCallback' in window) {
            flushIdleRef.current = (window as any).requestIdleCallback(() => {
                flushIdleRef.current = null;
                void flushQueuedActions();
            }, { timeout: FLUSH_IDLE_TIMEOUT_MS });
            return;
        }

        flushTimerRef.current = setTimeout(async () => {
            flushTimerRef.current = null;
            await flushQueuedActions();
        }, 50);
    }, [flushQueuedActions]);

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

        // Perf: batch queue writes/state updates when many actions are dispatched rapidly.
        pendingQueueRef.current.push(action);
        scheduleFlush();

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
                // Perf: update only the targeted subtask instead of mapping the entire array.
                // Expected impact: reduces allocations and speeds up rapid subtask toggles.
                taskStore.updateSubtaskCompletion(id, isCompleted);
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
    }, [processQueue, scheduleFlush]);

    const retryAction = useCallback(async (actionId: string) => {
        await updateActionStatus(actionId, 'pending');
        setPendingActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'pending' as const, error: undefined } : a));
        processQueue();
    }, [processQueue]);

    const dismissAction = useCallback(async (actionId: string) => {
        await removeFromQueue(actionId);
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
    }, []);

    const retryAllFailed = useCallback(async () => {
        const failedIds = pendingActions.filter(a => a.status === 'failed').map(a => a.id);
        if (failedIds.length === 0) return;
        await updateActionStatusBatch(failedIds.map(id => ({ id, status: 'pending' as const })));
        setPendingActions(prev => prev.map(a => a.status === 'failed' ? { ...a, status: 'pending' as const, error: undefined } : a));
        processQueue();
    }, [pendingActions, processQueue]);

    const dismissAllFailed = useCallback(async () => {
        const failedIds = pendingActions.filter(a => a.status === 'failed').map(a => a.id);
        if (failedIds.length === 0) return;
        await removeFromQueueBatch(failedIds);
        setPendingActions(prev => prev.filter(a => a.status !== 'failed'));
    }, [pendingActions]);

    const value = useMemo(() => ({
        pendingActions,
        dispatch,
        status,
        isOnline,
        conflicts,
        resolveConflict,
        retryAction,
        dismissAction,
        retryAllFailed,
        dismissAllFailed,
        syncNow: processQueue,
    }), [pendingActions, dispatch, status, isOnline, conflicts, resolveConflict, retryAction, dismissAction, retryAllFailed, dismissAllFailed, processQueue]);

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
