"use client";

import { useMemo, useState } from "react";
import { useSync } from "@/components/providers/sync-provider";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Loader2, AlertCircle, RotateCcw, X, RefreshCw, Trash2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PendingAction } from "@/lib/sync/types";

const ACTION_LABELS: Record<string, string> = {
    createTask: "Create task",
    updateTask: "Update task",
    deleteTask: "Delete task",
    toggleTaskCompletion: "Toggle task",
    reorderTasks: "Reorder tasks",
    updateSubtask: "Update subtask",
    createList: "Create list",
    updateList: "Update list",
    deleteList: "Delete list",
    reorderLists: "Reorder lists",
    createLabel: "Create label",
    updateLabel: "Update label",
    deleteLabel: "Delete label",
    reorderLabels: "Reorder labels",
};

function formatActionLabel(type: string): string {
    return ACTION_LABELS[type] || type;
}

function formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function ActionItem({ action, onRetry, onDismiss }: {
    action: PendingAction;
    onRetry: (id: string) => void;
    onDismiss: (id: string) => void;
}) {
    const isFailed = action.status === "failed";
    const isProcessing = action.status === "processing";

    return (
        <div className={cn(
            "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
            isFailed && "bg-destructive/10"
        )}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {isFailed && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
                    {isProcessing && <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />}
                    {action.status === "pending" && <Cloud className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <span className="font-medium truncate">{formatActionLabel(action.type)}</span>
                    <span className="text-muted-foreground shrink-0">{formatTimestamp(action.timestamp)}</span>
                </div>
                {isFailed && action.error && (
                    <p className="text-destructive/80 mt-0.5 pl-4.5 break-words">{action.error}</p>
                )}
                {isFailed && (
                    <div className="flex items-center gap-1.5 mt-1 pl-4.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onRetry(action.id)}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => onDismiss(action.id)}
                        >
                            <X className="h-3 w-3 mr-1" />
                            Dismiss
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function SyncStatus() {
    const { status, isOnline, pendingActions, retryAction, dismissAction, retryAllFailed, dismissAllFailed, syncNow } = useSync();
    const [open, setOpen] = useState(false);

    const { pendingCount, failedCount } = useMemo(() => {
        let pending = 0;
        let failed = 0;
        for (const action of pendingActions) {
            if (action.status === 'pending') pending++;
            else if (action.status === 'failed') failed++;
        }
        return { pendingCount: pending, failedCount: failed };
    }, [pendingActions]);

    const statusInfo = useMemo(() => {
        if (!isOnline) {
            return {
                icon: CloudOff,
                label: "Offline",
                description: pendingCount > 0
                    ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} saved locally`
                    : "Changes will sync when back online",
                className: "text-amber-500",
            };
        }

        if (failedCount > 0) {
            return {
                icon: AlertCircle,
                label: "Sync error",
                description: `${failedCount} action${failedCount !== 1 ? 's' : ''} failed to sync`,
                className: "text-destructive",
            };
        }

        if (status === 'syncing') {
            return {
                icon: Loader2,
                label: "Syncing",
                description: `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}...`,
                className: "text-blue-500 animate-spin",
            };
        }

        if (pendingCount > 0) {
            return {
                icon: Cloud,
                label: "Pending",
                description: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending`,
                className: "text-muted-foreground",
            };
        }

        return {
            icon: Cloud,
            label: "Synced",
            description: "All changes saved",
            className: "text-green-500",
        };
    }, [isOnline, failedCount, status, pendingCount]);

    const { icon: Icon, label, className } = statusInfo;

    if (isOnline && status === 'online' && pendingCount === 0 && failedCount === 0) {
        return null;
    }

    const failedActions = pendingActions.filter(a => a.status === 'failed');
    const pendingActionsList = pendingActions.filter(a => a.status === 'pending' || a.status === 'processing');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                        "bg-background/80 backdrop-blur-sm border shadow-sm",
                        "hover:bg-accent"
                    )}
                    role="status"
                    aria-label={`${label}: Click to view sync details`}
                >
                    <Icon className={cn("h-3.5 w-3.5", className)} />
                    <span className="hidden sm:inline">{label}</span>
                    {(pendingCount > 0 || failedCount > 0) && (
                        <span className="text-muted-foreground">
                            ({failedCount > 0 ? failedCount : pendingCount})
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-96 p-0">
                <div className="px-3 py-2 border-b">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", className)} />
                        <span className="font-semibold text-sm">{label}</span>
                    </div>
                </div>
                <ScrollArea className="max-h-64">
                    <div className="p-1.5 space-y-0.5">
                        {failedActions.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
                                    <span className="text-xs font-medium text-destructive">
                                        Failed ({failedActions.length})
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1.5 text-xs"
                                            onClick={() => retryAllFailed()}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Retry all
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1.5 text-xs text-muted-foreground"
                                            onClick={() => dismissAllFailed()}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                {failedActions.map(action => (
                                    <ActionItem
                                        key={action.id}
                                        action={action}
                                        onRetry={retryAction}
                                        onDismiss={dismissAction}
                                    />
                                ))}
                            </>
                        )}
                        {pendingActionsList.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Pending ({pendingActionsList.length})
                                    </span>
                                    {isOnline && status !== 'syncing' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1.5 text-xs"
                                            onClick={() => syncNow()}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Sync now
                                        </Button>
                                    )}
                                </div>
                                {pendingActionsList.map(action => (
                                    <ActionItem
                                        key={action.id}
                                        action={action}
                                        onRetry={retryAction}
                                        onDismiss={dismissAction}
                                    />
                                ))}
                            </>
                        )}
                        {failedActions.length === 0 && pendingActionsList.length === 0 && (
                            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                                {!isOnline ? "You are offline. Changes will sync when back online." : "No pending actions"}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
