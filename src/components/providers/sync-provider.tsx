/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-doctor/no-cascading-set-state */
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

export const useOptionalSync = () => useContext(SyncContext);

import { useSyncManager } from "@/lib/sync/useSyncManager";

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
        syncNow,
    }), [pendingActions, dispatch, status, isOnline, conflicts, resolveConflict, retryAction, dismissAction, retryAllFailed, dismissAllFailed, syncNow]);

    const currentConflict = conflicts.length > 0 ? conflicts[0] : null;

    const handleConflictClose = useCallback(() => {
        if (currentConflict) {
            setConflicts(prev => prev.filter(c => c.actionId !== currentConflict.actionId));
        }
    }, [currentConflict, setConflicts]);

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
