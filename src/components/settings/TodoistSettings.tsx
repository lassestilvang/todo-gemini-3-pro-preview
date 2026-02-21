"use client";

import { useState } from "react";
import { connectTodoist, disconnectTodoist, rotateTodoistTokens, syncTodoistNow, getTodoistStatus } from "@/lib/actions/todoist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TodoistMappingForm } from "@/components/settings/TodoistMappingForm";
import { TodoistConflicts } from "@/components/settings/TodoistConflicts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestDataRefresh } from "@/lib/sync/events";

export function TodoistSettings() {
    const [token, setToken] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const queryClient = useQueryClient();
    const statusQuery = useQuery({
        queryKey: ["todoistStatus"],
        queryFn: async () => {
            const result = await getTodoistStatus();
            if (!result.success) {
                throw new Error(result.error ?? "Failed to load Todoist status.");
            }
            return result.connected ?? false;
        },
    });
    const isConnected = statusQuery.data ?? false;
    const isLoading = isActionLoading || statusQuery.isFetching;
    const statusMessage =
        status ??
        (statusQuery.error instanceof Error ? statusQuery.error.message : null);

    const handleConnect = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await connectTodoist(token);
        if (!result.success) {
            setStatus(result.error ?? "Failed to connect Todoist.");
        } else {
            setToken("");
            queryClient.setQueryData(["todoistStatus"], true);
            setStatus("Todoist connected.");
        }
        setIsActionLoading(false);
    };

    const handleDisconnect = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await disconnectTodoist();
        if (result.success) {
            queryClient.setQueryData(["todoistStatus"], false);
            setStatus("Todoist disconnected.");
        } else {
            setStatus(result.error ?? "Failed to disconnect.");
        }
        setIsActionLoading(false);
    };

    const handleSync = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await syncTodoistNow();
        if (result.success) {
            setStatus("Sync completed.");
            requestDataRefresh();
        } else {
            setStatus(result.error ?? "Sync failed.");
        }
        setIsActionLoading(false);
    };

    const handleRotate = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await rotateTodoistTokens();
        if (result.success) {
            setStatus("Tokens rotated.");
        } else {
            setStatus(result.error ?? "Token rotation failed.");
        }
        setIsActionLoading(false);
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">Todoist Sync</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect your Todoist account with a personal API token to enable two-way sync.
                    </p>
                </div>
                {!isConnected ? (
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Paste your Todoist API token"
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                            disabled={isLoading}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleConnect} disabled={!token || isLoading}>
                                Connect Todoist
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={handleSync} disabled={isLoading}>
                            {isActionLoading && !status && !statusQuery.isFetching ? "Syncing..." : "Sync Now"}
                        </Button>
                        <Button variant="secondary" onClick={handleRotate} disabled={isLoading}>
                            Rotate Tokens
                        </Button>
                        <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                            Disconnect
                        </Button>
                    </div>
                )}
                {isConnected ? <TodoistMappingForm /> : null}
                {isConnected ? <TodoistConflicts /> : null}
                {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
            </div>
        </Card>
    );
}
