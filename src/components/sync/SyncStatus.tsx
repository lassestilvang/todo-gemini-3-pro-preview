"use client";

import { useMemo } from "react";
import { useSync } from "@/components/providers/sync-provider";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncStatus() {
    const { status, isOnline, pendingActions } = useSync();

    // PERF: Memoize counts to avoid filtering the pendingActions array twice on every render.
    // In apps with many pending actions (e.g., offline mode with 50+ queued changes),
    // this reduces redundant array iterations from O(2n) to O(n) per render.
    const { pendingCount, failedCount } = useMemo(() => {
        let pending = 0;
        let failed = 0;
        for (const action of pendingActions) {
            if (action.status === 'pending') pending++;
            else if (action.status === 'failed') failed++;
        }
        return { pendingCount: pending, failedCount: failed };
    }, [pendingActions]);

    const getStatusInfo = () => {
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
    };

    const { icon: Icon, label, description, className } = getStatusInfo();

    // Don't show indicator when everything is synced and online
    if (isOnline && status === 'online' && pendingCount === 0 && failedCount === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-default",
                            "bg-background/80 backdrop-blur-sm border shadow-sm"
                        )}
                        role="status"
                        aria-label={`${label}: ${description}`}
                    >
                        <Icon className={cn("h-3.5 w-3.5", className)} />
                        <span className="hidden sm:inline">{label}</span>
                        {pendingCount > 0 && (
                            <span className="text-muted-foreground">({pendingCount})</span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>{description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
