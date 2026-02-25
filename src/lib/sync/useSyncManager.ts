
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getQueue,
    removeFromQueue,
    removeFromQueueBatch,
    updateActionStatus,
    updateActionStatusBatch,
    getDB
} from "./db";
import { PendingAction, SyncStatus, ConflictInfo } from "./types";
import { actionRegistry, ActionType } from "./registry";
import { replaceIdsInPayload } from "./utils";
import { applyOptimisticUpdate } from "./optimistic";
import { useSyncLock } from "./useSyncLock";
import { useQueueFlush } from "./useQueueFlush";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";

export function useSyncManager() {
    const queryClient = useQueryClient();
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [status, setStatus] = useState<SyncStatus>('online');
    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined" ? true : navigator.onLine
    );
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

    // Refs for stable callbacks
    const pendingActionsRef = useRef(pendingActions);
    const conflictsRef = useRef(conflicts);

    useEffect(() => {
        pendingActionsRef.current = pendingActions;
        conflictsRef.current = conflicts;
    }, [pendingActions, conflicts]);

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
            const newPayload = replaceIdsInPayload(action.payload, oldId, newId);
            if (JSON.stringify(newPayload) !== JSON.stringify(action.payload)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                action.payload = newPayload as any[];
                await dbCurrent.put('queue', action);
            }
        }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskUpserts: any[] = [];
        const taskDeletes: number[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listUpserts: any[] = [];
        const listDeletes: number[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const labelUpserts: any[] = [];
        const labelDeletes: number[] = [];
        const conflictUpdates: ConflictInfo[] = [];

        const handleActionError = (action: PendingAction, error: unknown): "continue" | "break" => {
            console.error(`Failed to process action ${action.id}:`, error);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            const isConflict = err?.code === 'CONFLICT' ||
                (typeof err === 'object' && err?.error?.code === 'CONFLICT');

            if (isConflict) {
                const serverData = err?.details?.serverData || err?.serverData || err?.error?.details?.serverData;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = action.payload as any[];
                conflictUpdates.push({
                    actionId: action.id,
                    actionType: action.type,
                    serverData: serverData ? (typeof serverData === 'string' ? JSON.parse(serverData) : serverData) : null,
                    localData: payload[2],
                    timestamp: Date.now(),
                });
                statusUpdates.push({ id: action.id, status: 'failed', error: 'CONFLICT' });
                return "continue";
            }

            const errorMessage = err?.message || String(error);
            statusUpdates.push({ id: action.id, status: 'failed', error: errorMessage });
            return "break";
        };

        for (const action of queue) {
            const fn = actionRegistry[action.type as ActionType];
            if (!fn) {
                console.error(`Unknown action type: ${action.type}`);
                completedIds.push(action.id);
                continue;
            }

            statusUpdates.push({ id: action.id, status: 'processing' });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const execution = await (fn as (...args: any[]) => Promise<any>)(...(action.payload as any[]))
                .then((actionResult) => ({ ok: true as const, actionResult }))
                .catch((error: unknown) => ({ ok: false as const, error }));

            if (!execution.ok) {
                const outcome = handleActionError(action, execution.error);
                if (outcome === "continue") continue;
                break;
            }

            const actionResult = execution.actionResult;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let result: any;
            if (actionResult && typeof actionResult === 'object' && 'success' in actionResult) {
                if (!actionResult.success) {
                    const outcome = handleActionError(action, actionResult.error);
                    if (outcome === "continue") continue;
                    break;
                }
                result = actionResult.data;
            } else {
                result = actionResult;
            }

            if (action.tempId && result && result.id) {
                await fixupQueueIds(action.tempId, result.id);
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            if (action.type === 'toggleTaskCompletion') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = action.payload as any[];
                const userId = payload[1];
                if (userId) {
                    queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
                }
            }

            completedIds.push(action.id);
        }

        if (taskUpserts.length > 0) useTaskStore.getState().upsertTasks(taskUpserts);
        if (taskDeletes.length > 0) useTaskStore.getState().deleteTasks(taskDeletes);
        if (listUpserts.length > 0) useListStore.getState().upsertLists(listUpserts);
        if (listDeletes.length > 0) useListStore.getState().deleteLists(listDeletes);
        if (labelUpserts.length > 0) useLabelStore.getState().upsertLabels(labelUpserts);
        if (labelDeletes.length > 0) useLabelStore.getState().deleteLabels(labelDeletes);

        if (conflictUpdates.length > 0) {
            setConflicts(prev => [...prev, ...conflictUpdates]);
        }
        if (completedIds.length > 0) {
            await removeFromQueueBatch(completedIds);
        }
        if (statusUpdates.length > 0) {
            await updateActionStatusBatch(statusUpdates);
        }
        if (completedIds.length > 0 || statusUpdates.length > 0) {
            setPendingActions(await getQueue());
        }

        processingRef.current = false;
        setStatus('online');
    }, [ensureSyncLock, fixupQueueIds, queryClient]);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        setStatus('online');
        toast.success("Back online");
        processQueueRef.current?.();
    }, []);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setStatus('offline');
        toast.message("You are offline. Changes saved locally.");
    }, []);

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

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('pagehide', handlePageExit);
            window.removeEventListener('beforeunload', handlePageExit);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline, releaseLock]);

    useEffect(() => {
        processQueueRef.current = processQueue;
    }, [processQueue]);

    const resolveConflict = useCallback(async (
        actionId: string,
        resolution: 'local' | 'server' | 'merge',
        mergedData?: unknown
    ) => {
        const action = pendingActionsRef.current.find(a => a.id === actionId);
        if (!action) return;

        if (resolution === 'server') {
            await removeFromQueue(actionId);
            setPendingActions(prev => prev.filter(p => p.id !== actionId));
            const conflict = conflictsRef.current.find(c => c.actionId === actionId);
            if (conflict?.serverData && action.type.includes('Task')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                useTaskStore.getState().upsertTask(conflict.serverData as any);
            }
        } else if (resolution === 'local') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newPayload = [...(action.payload as any[])];
            if (newPayload[2] && typeof newPayload[2] === 'object') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (newPayload[2] as any).expectedUpdatedAt;
            }
            action.payload = newPayload;
            await updateActionStatus(actionId, 'pending');
            void processQueue();
        } else if (resolution === 'merge' && mergedData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload = action.payload as any[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload[2] = { ...payload[2], ...(mergedData as any) };
            delete payload[2].expectedUpdatedAt;
            action.payload = payload;
            await updateActionStatus(actionId, 'pending');
            void processQueue();
        }

        setConflicts(prev => prev.filter(c => c.actionId !== actionId));
    }, [processQueue]);

    const dispatch = useCallback(async <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => {
        const id = uuidv4();
        let tempId: number | undefined;
        if (type === 'createTask' || type === 'createList' || type === 'createLabel') {
            tempId = -Math.floor(Math.random() * 2000000000) - 1;
        }

        const action: PendingAction = {
            id,
            type,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload: args as any[],
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
            tempId
        };

        pendingQueueRef.current.push(action);
        scheduleFlush();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = args as any;
        if (type === 'updateTask') {
            const [taskId, , data] = payload;
            const existing = useTaskStore.getState().tasks[taskId];
            if (existing && existing.updatedAt) {
                payload[2] = { ...data, expectedUpdatedAt: existing.updatedAt };
                action.payload = payload;
            }
        }

        try {
            applyOptimisticUpdate(type, payload, tempId);
        } catch (error) {
            console.error("Optimistic store update failed", error);
        }

        if (navigator.onLine) {
            await flushQueuedActions();
            void processQueue();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { id: tempId, ...(args[0] as any) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processQueue, scheduleFlush, flushQueuedActions]);

    const retryAction = useCallback(async (actionId: string) => {
        await updateActionStatus(actionId, 'pending');
        setPendingActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'pending' as const, error: undefined } : a));
        void processQueue();
    }, [processQueue]);

    const dismissAction = useCallback(async (actionId: string) => {
        await removeFromQueue(actionId);
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
    }, []);

    const retryAllFailed = useCallback(async () => {
        const failedIds = pendingActionsRef.current.filter(a => a.status === 'failed').map(a => a.id);
        if (failedIds.length === 0) return;
        await updateActionStatusBatch(failedIds.map(id => ({ id, status: 'pending' as const })));
        setPendingActions(prev => prev.map(a => failedIds.includes(a.id) ? { ...a, status: 'pending' as const, error: undefined } : a));
        void processQueue();
    }, [processQueue]);

    const dismissAllFailed = useCallback(async () => {
        const failedIds = pendingActionsRef.current.filter(a => a.status === 'failed').map(a => a.id);
        if (failedIds.length === 0) return;
        await removeFromQueueBatch(failedIds);
        setPendingActions(prev => prev.filter(a => a.status !== 'failed'));
    }, []);

    return {
        pendingActions,
        dispatch,
        status,
        isOnline,
        conflicts,
        setConflicts,
        resolveConflict,
        retryAction,
        dismissAction,
        retryAllFailed,
        dismissAllFailed,
        syncNow: processQueue,
    };
}
