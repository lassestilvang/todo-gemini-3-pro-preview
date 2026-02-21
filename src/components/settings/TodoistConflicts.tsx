"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getTodoistConflicts, resolveTodoistConflict } from "@/lib/actions/todoist";
import { formatTodoistConflictPayload } from "@/lib/todoist/conflict-ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestDataRefresh } from "@/lib/sync/events";

export function TodoistConflicts() {
    const [status, setStatus] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const conflictsQuery = useQuery({
        queryKey: ["todoistConflicts"],
        queryFn: async () => {
            const result = await getTodoistConflicts();
            if (!result.success) {
                throw new Error(result.error ?? "Failed to load conflicts.");
            }
            return result.conflicts ?? [];
        },
    });
    const conflicts = conflictsQuery.data ?? [];
    const statusMessage = status ?? (conflictsQuery.error instanceof Error ? conflictsQuery.error.message : null);

    const handleResolve = async (conflictId: number, resolution: "local" | "remote") => {
        const result = await resolveTodoistConflict(conflictId, resolution);
        if (!result.success) {
            setStatus(result.error ?? "Failed to resolve conflict.");
            return;
        }
        setStatus("Conflict resolved.");
        requestDataRefresh();
        await queryClient.invalidateQueries({ queryKey: ["todoistConflicts"] });
    };

    if (conflicts.length === 0) {
        return statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null;
    }

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold">Sync Conflicts</h4>
                <p className="text-xs text-muted-foreground">
                    Resolve conflicts one by one. Choose which side should win.
                </p>
            </div>
            <div className="space-y-4">
                {conflicts.map((conflict) => {
                    const local = formatTodoistConflictPayload(conflict.localPayload);
                    const remote = formatTodoistConflictPayload(conflict.externalPayload);
                    return (
                    <div key={conflict.id} className="rounded-lg border border-border p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">Local</p>
                                <div className="mt-2 rounded bg-muted p-3 text-xs">
                                    <p className="font-semibold text-foreground">{local.title || "(No title)"}</p>
                                    {local.description ? (
                                        <p className="mt-1 text-muted-foreground">{local.description}</p>
                                    ) : null}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">Todoist</p>
                                <div className="mt-2 rounded bg-muted p-3 text-xs">
                                    <p className="font-semibold text-foreground">{remote.title || "(No title)"}</p>
                                    {remote.description ? (
                                        <p className="mt-1 text-muted-foreground">{remote.description}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleResolve(conflict.id, "local")}>Use Local</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleResolve(conflict.id, "remote")}>Use Todoist</Button>
                        </div>
                    </div>
                )})}
            </div>
            {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
        </div>
    );
}
