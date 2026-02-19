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

function useSyncLock(isOnline: boolean, tabIdRef: React.MutableRefObject<string>) {
    const SYNC_LOCK_KEY = "todo-gemini-sync-lock";
    const SYNC_LOCK_TTL_MS = 10000;
    const lockIntervalRef = useRef<number | null>(null);

    const readSyncLock = useCallback((): { owner: string; expiresAt: number } | null => {
        const raw = localStorage.getItem(SYNC_LOCK_KEY);
        if (!raw || raw.startsWith("{")) {
            // Legacy JSON format is ignored and replaced with the compact format.
            return null;
        }

        const separator = raw.lastIndexOf(":");
        if (separator <= 0) return null;

        const owner = raw.slice(0, separator);
        const expiresAt = Number(raw.slice(separator + 1));
        if (!owner || !Number.isFinite(expiresAt)) return null;

        return { owner, expiresAt };
    }, [SYNC_LOCK_KEY]);

    const writeSyncLock = useCallback((owner: string, expiresAt: number) => {
        localStorage.setItem(SYNC_LOCK_KEY, `${owner}:${expiresAt}`);
    }, [SYNC_LOCK_KEY]);

    const ensureSyncLock = useCallback(() => {
        const now = Date.now();
        const current = readSyncLock();
        const owner = tabIdRef.current;
        if (!current || current.expiresAt < now || current.owner === owner) {
            writeSyncLock(owner, now + SYNC_LOCK_TTL_MS);
            return true;
        }
        return current.owner === owner;
    }, [readSyncLock, writeSyncLock, SYNC_LOCK_TTL_MS, tabIdRef]);

    const releaseLock = useCallback(() => {
        const current = readSyncLock();
        if (current?.owner === tabIdRef.current) {
            localStorage.removeItem(SYNC_LOCK_KEY);
        }
    }, [readSyncLock, tabIdRef, SYNC_LOCK_KEY]);

    useEffect(() => {
        if (!isOnline) {
            if (lockIntervalRef.current !== null) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
            return;
        }

        const ownerId = tabIdRef.current;

        const refreshLock = () => {
            const now = Date.now();
            const current = readSyncLock();
            if (!current || current.expiresAt < now || current.owner === ownerId) {
                writeSyncLock(ownerId, now + SYNC_LOCK_TTL_MS);
            }
        };

        refreshLock();

        lockIntervalRef.current = window.setInterval(refreshLock, Math.floor(SYNC_LOCK_TTL_MS / 2));

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                refreshLock();
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === SYNC_LOCK_KEY) {
                refreshLock();
            }
        };

        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("storage", handleStorage);

        return () => {
            if (lockIntervalRef.current !== null) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("storage", handleStorage);
            releaseLock();
        };
    }, [isOnline, readSyncLock, writeSyncLock, SYNC_LOCK_TTL_MS, releaseLock, SYNC_LOCK_KEY, tabIdRef]);

    return { ensureSyncLock, readSyncLock, releaseLock };
}

function useQueueFlush(params: {
    setPendingActions: React.Dispatch<React.SetStateAction<PendingAction[]>>;
    flushActionsRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
    maxPendingQueue: number;
    flushIdleTimeoutMs: number;
}) {
    const { setPendingActions, flushActionsRef, maxPendingQueue, flushIdleTimeoutMs } = params;
    const pendingQueueRef = useRef<PendingAction[]>([]);
    const flushTimerRef = useRef<any>(null);
    const flushIdleRef = useRef<any>(null);

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

        await addToQueueBatch(queued);
        setPendingActions(prev => [...prev, ...queued]);
    }, [setPendingActions]);

    useEffect(() => {
        flushActionsRef.current = flushQueuedActions;
    }, [flushActionsRef, flushQueuedActions]);

    const scheduleFlush = useCallback(() => {
        if (pendingQueueRef.current.length >= maxPendingQueue) {
            void flushQueuedActions();
            return;
        }

        if (flushTimerRef.current !== null || flushIdleRef.current !== null) return;

        if ('requestIdleCallback' in window) {
            flushIdleRef.current = (window as any).requestIdleCallback(() => {
                flushIdleRef.current = null;
                void flushQueuedActions();
            }, { timeout: flushIdleTimeoutMs });
            return;
        }

        flushTimerRef.current = setTimeout(async () => {
            flushTimerRef.current = null;
            await flushQueuedActions();
        }, 50);
    }, [flushQueuedActions, maxPendingQueue, flushIdleTimeoutMs, pendingQueueRef]);

    return { pendingQueueRef, flushQueuedActions, scheduleFlush };
}

function applyOptimisticUpdate(
    type: ActionType,
    args: unknown[],
    tempId: number | undefined
) {
    const taskStore = useTaskStore.getState();
    const listStore = useListStore.getState();
    const labelStore = useLabelStore.getState();
    const payload = args as any;

    if (type === 'createTask') {
        const data = payload[0];
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
        return;
    }

    if (type === 'updateTask') {
        const [id, , data] = payload;
        const existing = taskStore.tasks[id];
        if (existing) {
            taskStore.upsertTask({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteTask') {
        taskStore.deleteTask(payload[0]);
        return;
    }

    if (type === 'toggleTaskCompletion') {
        const [id, , isCompleted] = payload;
        const existing = taskStore.tasks[id];
        if (existing) {
            taskStore.upsertTask({ ...existing, isCompleted });
        }
        return;
    }

    if (type === 'updateSubtask') {
        const [id, , isCompleted] = payload;
        taskStore.updateSubtaskCompletion(id, isCompleted);
        return;
    }

    if (type === 'createList') {
        const data = payload[0];
        listStore.upsertList({
            id: tempId!,
            name: data.name,
            color: data.color || null,
            icon: data.icon || null,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            position: data.position || 0,
        });
        return;
    }

    if (type === 'updateList') {
        const [id, , data] = payload;
        const existing = listStore.lists[id];
        if (existing) {
            listStore.upsertList({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteList') {
        listStore.deleteList(payload[0]);
        return;
    }

    if (type === 'createLabel') {
        const data = payload[0];
        labelStore.upsertLabel({
            id: tempId!,
            name: data.name,
            color: data.color || null,
            icon: data.icon || null,
            position: data.position || 0,
        });
        return;
    }

    if (type === 'updateLabel') {
        const [id, , data] = payload;
        const existing = labelStore.labels[id];
        if (existing) {
            labelStore.upsertLabel({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteLabel') {
        labelStore.deleteLabel(payload[0]);
    }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [status, setStatus] = useState<SyncStatus>('online');
    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined" ? true : navigator.onLine
    );
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
    const MAX_PENDING_QUEUE = 100;
    const FLUSH_IDLE_TIMEOUT_MS = 200;
    const processingRef = useRef(false);
    const processQueueRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const flushActionsRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const tabIdRef = useRef(uuidv4());
    const { ensureSyncLock, releaseLock } = useSyncLock(isOnline, tabIdRef);
    const { pendingQueueRef, flushQueuedActions, scheduleFlush } = useQueueFlush({
        setPendingActions,
        flushActionsRef,
        maxPendingQueue: MAX_PENDING_QUEUE,
        flushIdleTimeoutMs: FLUSH_IDLE_TIMEOUT_MS,
    });

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
        if (!ensureSyncLock()) return;

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
        const handleActionError = (action: PendingAction, error: unknown): "continue" | "break" => {
            console.error(`Failed to process action ${action.id}:`, error);

            const err = error as any;
            const isConflict = err?.code === 'CONFLICT' ||
                (typeof err === 'object' && err?.error?.code === 'CONFLICT');

            if (isConflict) {
                const serverData = err?.details?.serverData || err?.serverData || err?.error?.details?.serverData;
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
                return "continue";
            }

            const errorMessage = err?.message || String(error);
            statusUpdates.push({ id: action.id, status: 'failed', error: errorMessage });
            return "break";
        };

        // Process sequentially
        for (const action of queue) {
            const fn = actionRegistry[action.type as ActionType];
            if (!fn) {
                console.error(`Unknown action type: ${action.type}`);
                completedIds.push(action.id);
                continue;
            }

            // Perf: batch status updates to avoid per-action IDB writes.
            statusUpdates.push({ id: action.id, status: 'processing' });

            const execution = await (fn as (...args: any[]) => Promise<any>)(...(action.payload as any[]))
                .then((actionResult) => ({ ok: true as const, actionResult }))
                .catch((error: unknown) => ({ ok: false as const, error }));

            if (!execution.ok) {
                const outcome = handleActionError(action, execution.error);
                if (outcome === "continue") {
                    continue;
                }
                break;
            }

            const actionResult = execution.actionResult;

            // If it's an ActionResult (wrapped with withErrorHandling), handle success/failure
            let result: any;
            if (actionResult && typeof actionResult === 'object' && 'success' in actionResult) {
                if (!actionResult.success) {
                    const outcome = handleActionError(action, actionResult.error);
                    if (outcome === "continue") {
                        continue;
                    }
                    break;
                }
                result = actionResult.data;
            } else {
                // Support legacy raw actions if any are added back
                result = actionResult;
            }

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
        }

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
    }, [ensureSyncLock, fixupQueueIds, queryClient]);

    // Initial load
    useEffect(() => {
        const handlePageExit = () => {
            void flushActionsRef.current?.();
            releaseLock();
        };
        window.addEventListener('pagehide', handlePageExit);
        window.addEventListener('beforeunload', handlePageExit);

        const loadQueue = async () => {
            const queue = await getQueue();
            setPendingActions(queue);
        };
        loadQueue();
        setTimeout(() => {
            if (navigator.onLine) {
                processQueueRef.current?.();
            }
        }, 0);

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
    }, [processQueue, releaseLock]);

    // Keep ref updated with latest processQueue to avoid stale closures in event listeners
    useEffect(() => {
        processQueueRef.current = processQueue;
    }, [processQueue]);

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
            // Use a random signed 32-bit integer for temp ID (negative) to avoid overflow
            // Range: -1 to -2,147,483,647. Safe range is roughly 2 billion.
            // Using a max of 2,000,000,000 just to be safe and clean.
            tempId = -Math.floor(Math.random() * 2000000000) - 1;
            // console.log(`[SyncProvider] Generated tempId: ${tempId} for ${type}`);
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
        const payload = args as any;
        if (type === 'updateTask') {
            const [taskId, , data] = payload;
            const existing = useTaskStore.getState().tasks[taskId];
            if (existing && existing.updatedAt) {
                payload[2] = { ...data, expectedUpdatedAt: existing.updatedAt };
                action.payload = payload;
            }
        }
        await Promise.resolve()
            .then(() => {
                applyOptimisticUpdate(type, payload, tempId);
            })
            .catch((error) => {
                console.error("Optimistic store update failed", error);
            });

        // Attempt Sync — flush pending writes to IndexedDB first so processQueue sees them
        if (navigator.onLine) {
            await flushQueuedActions();
            processQueue();
        }

        return { id: tempId, ...(args[0] as any) }; // Approximate optimistic result
    }, [processQueue, scheduleFlush, flushQueuedActions, pendingQueueRef]);

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
