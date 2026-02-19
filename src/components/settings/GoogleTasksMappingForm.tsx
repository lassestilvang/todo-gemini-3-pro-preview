"use client";

import React, { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGoogleTasksMappingData, setGoogleTasksListMappings } from "@/lib/actions/google-tasks";

export function GoogleTasksMappingForm() {
    type UIState = {
        loading: boolean;
        status: string | null;
        tasklists: { id: string; title: string }[];
        lists: { id: number; name: string }[];
        listMappings: Record<string, number | null>;
    };

    type UIAction =
        | { type: "FETCH_START" }
        | { type: "FETCH_SUCCESS"; payload: { tasklists: { id: string; title: string }[]; lists: { id: number; name: string }[]; listMappings: Record<string, number | null> } }
        | { type: "FETCH_ERROR"; payload: string }
        | { type: "SET_STATUS"; payload: string | null }
        | { type: "UPDATE_MAPPING"; payload: { tasklistId: string; listId: number | null } };

    const [uiState, dispatchUI] = React.useReducer(
        (state: UIState, action: UIAction): UIState => {
            switch (action.type) {
                case "FETCH_START":
                    return { ...state, loading: true, status: null };
                case "FETCH_SUCCESS":
                    return {
                        ...state,
                        loading: false,
                        tasklists: action.payload.tasklists,
                        lists: action.payload.lists,
                        listMappings: action.payload.listMappings,
                    };
                case "FETCH_ERROR":
                    return { ...state, loading: false, status: action.payload };
                case "SET_STATUS":
                    return { ...state, status: action.payload };
                case "UPDATE_MAPPING":
                    return {
                        ...state,
                        listMappings: {
                            ...state.listMappings,
                            [action.payload.tasklistId]: action.payload.listId,
                        },
                    };
                default:
                    return state;
            }
        },
        {
            loading: true,
            status: null,
            tasklists: [],
            lists: [],
            listMappings: {},
        }
    );

    const { loading, status, tasklists, lists, listMappings } = uiState;

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            dispatchUI({ type: "FETCH_START" });
            const result = await getGoogleTasksMappingData();
            if (!isMounted) return;

            if (!result.success) {
                dispatchUI({ type: "FETCH_ERROR", payload: result.error ?? "Failed to load Google Tasks mapping data." });
                return;
            }

            const mapping: Record<string, number | null> = {};
            for (const tasklist of result.tasklists ?? []) {
                const match = result.listMappings?.find((item) => item.tasklistId === tasklist.id);
                mapping[tasklist.id] = match?.listId ?? null;
            }

            dispatchUI({
                type: "FETCH_SUCCESS",
                payload: {
                    tasklists: result.tasklists ?? [],
                    lists: result.lists ?? [],
                    listMappings: mapping,
                },
            });
        };

        load();
        return () => { isMounted = false; };
    }, []);

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => a.name.localeCompare(b.name));
    }, [lists]);

    const sortedTasklists = useMemo(() => {
        return [...tasklists].sort((a, b) => a.title.localeCompare(b.title));
    }, [tasklists]);

    const handleSave = async () => {
        dispatchUI({ type: "SET_STATUS", payload: null });
        const payload = tasklists.map((tasklist) => ({
            tasklistId: tasklist.id,
            listId: listMappings[tasklist.id] ?? null,
        }));

        const result = await setGoogleTasksListMappings(payload);
        if (!result.success) {
            dispatchUI({ type: "FETCH_ERROR", payload: result.error ?? "Failed to save mappings." });
            return;
        }

        dispatchUI({ type: "SET_STATUS", payload: "Mappings saved." });
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
                                dispatchUI({
                                    type: "UPDATE_MAPPING",
                                    payload: {
                                        tasklistId: tasklist.id,
                                        listId: value === "none" ? null : Number(value),
                                    },
                                });
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
