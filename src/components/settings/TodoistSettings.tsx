"use client";

import { useState } from "react";
import { connectTodoist, disconnectTodoist, syncTodoistNow } from "@/lib/actions/todoist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TodoistMappingForm } from "@/components/settings/TodoistMappingForm";

export function TodoistSettings() {
    const [token, setToken] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        setIsLoading(true);
        setStatus(null);
        const result = await connectTodoist(token);
        if (!result.success) {
            setStatus(result.error ?? "Failed to connect Todoist.");
        } else {
            setToken("");
            setStatus("Todoist connected.");
        }
        setIsLoading(false);
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        setStatus(null);
        const result = await disconnectTodoist();
        setStatus(result.success ? "Todoist disconnected." : result.error ?? "Failed to disconnect.");
        setIsLoading(false);
    };

    const handleSync = async () => {
        setIsLoading(true);
        setStatus(null);
        const result = await syncTodoistNow();
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
                    <h3 className="text-lg font-semibold">Todoist Sync</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect your Todoist account with a personal API token to enable two-way sync.
                    </p>
                </div>
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
                        <Button variant="secondary" onClick={handleSync} disabled={isLoading}>
                            Sync Now
                        </Button>
                        <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                            Disconnect
                        </Button>
                    </div>
                </div>
                <TodoistMappingForm />
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </div>
        </Card>
    );
}
