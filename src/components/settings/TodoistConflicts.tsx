"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTodoistConflicts, resolveTodoistConflict } from "@/lib/actions/todoist";
import { formatTodoistConflictPayload } from "@/lib/todoist/conflict-ui";

export function TodoistConflicts() {
    const [conflicts, setConflicts] = useState<Array<{ id: number; localPayload: string | null; externalPayload: string | null }>>([]);
    const [status, setStatus] = useState<string | null>(null);

    const load = async () => {
        const result = await getTodoistConflicts();
        if (!result.success) {
            setStatus(result.error ?? "Failed to load conflicts.");
            return;
        }
        setConflicts(result.conflicts ?? []);
    };

    useEffect(() => {
        load();
    }, []);

    const handleResolve = async (conflictId: number, resolution: "local" | "remote") => {
        const result = await resolveTodoistConflict(conflictId, resolution);
        if (!result.success) {
            setStatus(result.error ?? "Failed to resolve conflict.");
            return;
        }
        setStatus("Conflict resolved.");
        await load();
    };

    if (conflicts.length === 0) {
        return null;
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
            {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </div>
    );
}
