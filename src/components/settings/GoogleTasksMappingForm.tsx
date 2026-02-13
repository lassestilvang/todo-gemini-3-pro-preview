"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGoogleTasksMappingData, setGoogleTasksListMappings } from "@/lib/actions/google-tasks";

export function GoogleTasksMappingForm() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [tasklists, setTasklists] = useState<{ id: string; title: string }[]>([]);
    const [lists, setLists] = useState<{ id: number; name: string }[]>([]);
    const [listMappings, setListMappings] = useState<Record<string, number | null>>({});

    useEffect(() => {
        const load = async () => {
            const result = await getGoogleTasksMappingData();
            if (!result.success) {
                setStatus(result.error ?? "Failed to load Google Tasks mapping data.");
                setLoading(false);
                return;
            }

            setTasklists(result.tasklists ?? []);
            setLists(result.lists ?? []);

            const mapping: Record<string, number | null> = {};
            for (const tasklist of result.tasklists ?? []) {
                const match = result.listMappings?.find((item) => item.tasklistId === tasklist.id);
                mapping[tasklist.id] = match?.listId ?? null;
            }
            setListMappings(mapping);
            setLoading(false);
        };

        load();
    }, []);

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => a.name.localeCompare(b.name));
    }, [lists]);

    const sortedTasklists = useMemo(() => {
        return [...tasklists].sort((a, b) => a.title.localeCompare(b.title));
    }, [tasklists]);

    const handleSave = async () => {
        setStatus(null);
        const payload = tasklists.map((tasklist) => ({
            tasklistId: tasklist.id,
            listId: listMappings[tasklist.id] ?? null,
        }));

        const result = await setGoogleTasksListMappings(payload);
        if (!result.success) {
            setStatus(result.error ?? "Failed to save mappings.");
            return;
        }

        setStatus("Mappings saved.");
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading mappings...</p>;
    }

    if (tasklists.length === 0) {
        return <p className="text-sm text-muted-foreground">No Google tasklists available.</p>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold">Tasklist to List Mapping</h4>
                <p className="text-xs text-muted-foreground">
                    Choose which Google tasklists should sync to local lists.
                </p>
            </div>
            <div className="space-y-3">
                {sortedTasklists.map((tasklist) => (
                    <div key={tasklist.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="w-full md:w-56 text-sm text-muted-foreground">{tasklist.title}</div>
                        <Select
                            value={listMappings[tasklist.id] ? String(listMappings[tasklist.id]) : "none"}
                            onValueChange={(value) => {
                                setListMappings((prev) => ({
                                    ...prev,
                                    [tasklist.id]: value === "none" ? null : Number(value),
                                }));
                            }}
                        >
                            <SelectTrigger className="w-full md:w-60">
                                <SelectValue placeholder="Select list" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {sortedLists.map((list) => (
                                    <SelectItem key={list.id} value={String(list.id)}>
                                        {list.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-3">
                <Button onClick={handleSave}>Save Mappings</Button>
                {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
            </div>
        </div>
    );
}
