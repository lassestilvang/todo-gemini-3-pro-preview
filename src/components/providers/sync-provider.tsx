/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getQueue, addToQueueBatch, removeFromQueue, removeFromQueueBatch, updateActionStatus, updateActionStatusBatch, getDB } from "@/lib/sync/db";
import { PendingAction, SyncStatus, ConflictInfo } from "@/lib/sync/types";
import { actionRegistry, ActionType } from "@/lib/sync/registry";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from "sonner";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useTaskStore } from "@/lib/store/task-store";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useListStore } from "@/lib/store/list-store";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useLabelStore } from "@/lib/store/label-store";
import { ConflictDialog } from "@/components/sync/ConflictDialog";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useQueryClient } from "@tanstack/react-query";
import { useSyncManager } from "@/lib/sync/useSyncManager";

interface SyncStateContextType {
    pendingActions: PendingAction[];
    status: SyncStatus;
    isOnline: boolean;
    conflicts: ConflictInfo[];
}

interface SyncActionsContextType {
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<any>;
    resolveConflict: (actionId: string, resolution: 'local' | 'server' | 'merge', mergedData?: unknown) => Promise<void>;
    retryAction: (actionId: string) => Promise<void>;
    dismissAction: (actionId: string) => Promise<void>;
    retryAllFailed: () => Promise<void>;
    dismissAllFailed: () => Promise<void>;
    syncNow: () => void;
}

const SyncStateContext = createContext<SyncStateContextType | null>(null);
const SyncActionsContext = createContext<SyncActionsContextType | null>(null);

export const useSyncState = () => {
    const context = useContext(SyncStateContext);
    if (!context) throw new Error("useSyncState must be used within a SyncProvider");
    return context;
};

export const useSyncActions = () => {
    const context = useContext(SyncActionsContext);
    if (!context) throw new Error("useSyncActions must be used within a SyncProvider");
    return context;
};

export const useOptionalSyncActions = () => {
    return useContext(SyncActionsContext);
};

export const useSync = () => {
    const state = useContext(SyncStateContext);
    const actions = useContext(SyncActionsContext);

    if (!state || !actions) throw new Error("useSync must be used within a SyncProvider");

    return { ...state, ...actions };
};

export const useOptionalSync = () => {
    const state = useContext(SyncStateContext);
    const actions = useContext(SyncActionsContext);

    if (!state || !actions) return null;

    return { ...state, ...actions };
};

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const {
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
        syncNow,
    } = useSyncManager();

    const stateValue = useMemo(() => ({
        pendingActions,
        status,
        isOnline,
        conflicts,
    }), [pendingActions, status, isOnline, conflicts]);

    const actionsValue = useMemo(() => ({
        dispatch,
        resolveConflict,
        retryAction,
        dismissAction,
        retryAllFailed,
        dismissAllFailed,
        syncNow,
    }), [dispatch, resolveConflict, retryAction, dismissAction, retryAllFailed, dismissAllFailed, syncNow]);

    const currentConflict = conflicts.length > 0 ? conflicts[0] : null;

    const handleConflictClose = useCallback(() => {
        if (currentConflict) {
            setConflicts(prev => prev.filter(c => c.actionId !== currentConflict.actionId));
        }
    }, [currentConflict, setConflicts]);

    return (
        <SyncActionsContext.Provider value={actionsValue}>
            <SyncStateContext.Provider value={stateValue}>
                {children}
                <ConflictDialog
                    conflict={currentConflict}
                    onResolve={resolveConflict}
                    onClose={handleConflictClose}
                />
            </SyncStateContext.Provider>
        </SyncActionsContext.Provider>
    );
}
