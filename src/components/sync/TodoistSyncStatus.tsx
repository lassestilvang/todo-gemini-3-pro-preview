"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { getTodoistSyncInfo, syncTodoistNow } from "@/lib/actions/todoist";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDateValue(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
        return null;
    }
    return parsed;
}

function formatRelativeTimestamp(value: Date | string | null | undefined) {
    const parsed = parseDateValue(value);
    if (!parsed) {
        return "Never";
    }
    const diff = Date.now() - parsed.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatAbsoluteTimestamp(value: Date | string | null | undefined) {
    const parsed = parseDateValue(value);
    if (!parsed) {
        return "Never";
    }
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(parsed);
}

export function TodoistSyncStatus() {
    const queryClient = useQueryClient();
    const syncInfoQuery = useQuery({
        queryKey: ["todoistSyncInfo"],
        queryFn: async () => {
            const result = await getTodoistSyncInfo();
            if (!result.success) {
                throw new Error(result.error ?? "Failed to load Todoist sync status.");
            }
            return result;
        },
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data?.connected) {
                return 60_000;
            }
            if (data.syncStatus === "syncing") {
                return 4_000;
            }
            return 20_000;
        },
        refetchOnWindowFocus: true,
    });

    const syncNowMutation = useMutation({
        mutationFn: async () => {
            const result = await syncTodoistNow();
            if (!result.success) {
                throw new Error(result.error ?? "Todoist sync failed.");
            }
            return result;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["todoistSyncInfo"] });
        },
    });

    const queryErrorMessage = syncInfoQuery.error instanceof Error
        ? syncInfoQuery.error.message
        : "Unable to load Todoist sync status.";
    const mutationErrorMessage = syncNowMutation.error instanceof Error
        ? syncNowMutation.error.message
        : null;
    const connected = syncInfoQuery.data?.connected ?? false;

    if (syncInfoQuery.isPending && !syncInfoQuery.data) {
        return null;
    }

    if (!connected && !syncInfoQuery.isError) {
        return null;
    }

    const syncStatus = syncInfoQuery.data?.syncStatus ?? "idle";
    const conflictCount = syncInfoQuery.data?.conflictCount ?? 0;
    const syncError = syncInfoQuery.data?.error ?? null;
    const hasSyncError = Boolean(syncError) || syncStatus === "error";
    const hasIssues = hasSyncError || conflictCount > 0;
    const isSyncing = syncStatus === "syncing" || syncNowMutation.isPending;
    const statusMessage = syncInfoQuery.isError
        ? "Todoist unavailable"
        : isSyncing
            ? "Todoist syncing"
            : hasSyncError
                ? "Todoist error"
                : conflictCount > 0
                    ? `Todoist issues (${conflictCount})`
                    : "Todoist synced";

    const statusMeta = syncInfoQuery.isError
        ? { icon: AlertCircle, className: "text-destructive", pulse: false }
        : isSyncing
            ? { icon: Loader2, className: "text-blue-500", pulse: true }
            : hasIssues
                ? { icon: TriangleAlert, className: "text-amber-500", pulse: false }
                : { icon: CheckCircle2, className: "text-green-500", pulse: false };

    const Icon = statusMeta.icon;
    const lastSyncedAt = syncInfoQuery.data?.lastSyncedAt ?? null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                        "bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent"
                    )}
                    role="status"
                    aria-label={`${statusMessage}: click to open Todoist sync details`}
                >
                    <Icon className={cn("h-3.5 w-3.5", statusMeta.className, statusMeta.pulse && "animate-spin")} />
                    <span className="hidden sm:inline">{statusMessage}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-80 p-0">
                <div className="border-b px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", statusMeta.className, statusMeta.pulse && "animate-spin")} />
                        <span className="text-sm font-semibold">{statusMessage}</span>
                    </div>
                </div>
                <div className="space-y-3 px-3 py-3 text-xs">
                    <div>
                        <p className="text-muted-foreground">Last synced</p>
                        <p className="font-medium">{formatRelativeTimestamp(lastSyncedAt)}</p>
                        <p className="text-muted-foreground">{formatAbsoluteTimestamp(lastSyncedAt)}</p>
                    </div>

                    {syncInfoQuery.isError ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                            {queryErrorMessage}
                        </div>
                    ) : null}

                    {!syncInfoQuery.isError && hasSyncError ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                            {syncError ?? "Todoist sync encountered an error."}
                        </div>
                    ) : null}

                    {mutationErrorMessage ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                            {mutationErrorMessage}
                        </div>
                    ) : null}

                    {conflictCount > 0 ? (
                        <div className="rounded-md border border-amber-300/40 bg-amber-50/60 p-2 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            {conflictCount} pending conflict{conflictCount === 1 ? "" : "s"}. Resolve in Todoist settings.
                        </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => syncNowMutation.mutate()}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Syncing
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Sync now
                                </>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => syncInfoQuery.refetch()}
                        >
                            Refresh
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" asChild>
                            <Link href="/settings">Settings</Link>
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
