"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { disconnectGoogleTasks, getGoogleTasksStatus, syncGoogleTasksNow } from "@/lib/actions/google-tasks";
import { GoogleTasksConflicts } from "@/components/settings/GoogleTasksConflicts";

export function GoogleTasksSettings() {
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const loadStatus = async () => {
        const result = await getGoogleTasksStatus();
        if (!result.success) {
            setStatus(result.error ?? "Failed to load Google Tasks status.");
            return;
        }
        setIsConnected(result.connected ?? false);
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const handleDisconnect = async () => {
        setIsLoading(true);
        setStatus(null);
        const result = await disconnectGoogleTasks();
        if (result.success) {
            setIsConnected(false);
            setStatus("Google Tasks disconnected.");
        } else {
            setStatus(result.error ?? "Failed to disconnect.");
        }
        setIsLoading(false);
    };

    const handleSync = async () => {
        setIsLoading(true);
        setStatus(null);
        const result = await syncGoogleTasksNow();
        if (result.success) {
            setStatus("Sync completed.");
        } else {
            setStatus(result.error ?? "Sync failed.");
        }
        setIsLoading(false);
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
                <GoogleTasksConflicts />
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </div>
        </Card>
    );
}
