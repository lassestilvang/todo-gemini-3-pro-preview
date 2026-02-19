"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { disconnectGoogleTasks, getGoogleTasksStatus, syncGoogleTasksNow } from "@/lib/actions/google-tasks";
import { GoogleTasksConflicts } from "@/components/settings/GoogleTasksConflicts";
import { GoogleTasksMappingForm } from "@/components/settings/GoogleTasksMappingForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function GoogleTasksSettings() {
    const [status, setStatus] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const queryClient = useQueryClient();
    const statusQuery = useQuery({
        queryKey: ["googleTasksStatus"],
        queryFn: async () => {
            const result = await getGoogleTasksStatus();
            if (!result.success) {
                throw new Error(result.error ?? "Failed to load Google Tasks status.");
            }
            return result.connected ?? false;
        },
    });
    const isConnected = statusQuery.data ?? false;
    const isLoading = isActionLoading || statusQuery.isFetching;
    const statusMessage =
        status ??
        (statusQuery.error instanceof Error ? statusQuery.error.message : null);

    const handleDisconnect = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await disconnectGoogleTasks();
        if (result.success) {
            queryClient.setQueryData(["googleTasksStatus"], false);
            setStatus("Google Tasks disconnected.");
        } else {
            setStatus(result.error ?? "Failed to disconnect.");
        }
        setIsActionLoading(false);
    };

    const handleSync = async () => {
        setIsActionLoading(true);
        setStatus(null);
        const result = await syncGoogleTasksNow();
        if (result.success) {
            setStatus("Sync completed.");
        } else {
            setStatus(result.error ?? "Sync failed.");
        }
        setIsActionLoading(false);
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">Google Tasks Sync</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect your Google account to enable two-way sync with Google Tasks.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild disabled={isLoading || isConnected}>
                        <Link href="/api/google-tasks/auth/start">Connect Google Tasks</Link>
                    </Button>
                    <Button variant="secondary" onClick={handleSync} disabled={isLoading || !isConnected}>
                        Sync Now
                    </Button>
                    <Button variant="outline" onClick={handleDisconnect} disabled={isLoading || !isConnected}>
                        Disconnect
                    </Button>
                </div>
                {isConnected ? <GoogleTasksMappingForm /> : null}
                <GoogleTasksConflicts />
                {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
            </div>
        </Card>
    );
}
