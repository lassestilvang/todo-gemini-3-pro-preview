"use client";

import React, { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTodoistMappingData, setTodoistLabelMappings, setTodoistProjectMappings, syncTodoistNow } from "@/lib/actions/todoist";

export function TodoistMappingForm() {
    type UIState = {
        loading: boolean;
        status: string | null;
        projects: { id: string; name: string }[];
        labels: { id: string; name: string }[];
        lists: { id: number; name: string }[];
        projectMappings: Record<string, number | null>;
        labelMappings: Record<string, number | null>;
        isSaving: boolean;
    };

    type UIAction =
        | { type: "FETCH_START" }
        | { type: "FETCH_SUCCESS"; payload: { projects: { id: string; name: string }[]; labels: { id: string; name: string }[]; lists: { id: number; name: string }[]; projectMappings: Record<string, number | null>; labelMappings: Record<string, number | null> } }
        | { type: "FETCH_ERROR"; payload: string }
        | { type: "SET_STATUS"; payload: string | null }
        | { type: "UPDATE_PROJECT_MAPPING"; payload: { projectId: string; listId: number | null } }
        | { type: "UPDATE_LABEL_MAPPING"; payload: { labelId: string; listId: number | null } }
        | { type: "SAVE_START" }
        | { type: "SAVE_END" };

    const [uiState, dispatchUI] = React.useReducer(
        (state: UIState, action: UIAction): UIState => {
            switch (action.type) {
                case "FETCH_START":
                    return { ...state, loading: true, status: null };
                case "FETCH_SUCCESS":
                    return {
                        ...state,
                        loading: false,
                        projects: action.payload.projects,
                        labels: action.payload.labels,
                        lists: action.payload.lists,
                        projectMappings: action.payload.projectMappings,
                        labelMappings: action.payload.labelMappings,
                    };
                case "FETCH_ERROR":
                    return { ...state, loading: false, status: action.payload };
                case "SET_STATUS":
                    return { ...state, status: action.payload };
                case "UPDATE_PROJECT_MAPPING":
                    return {
                        ...state,
                        projectMappings: {
                            ...state.projectMappings,
                            [action.payload.projectId]: action.payload.listId,
                        },
                    };
                case "UPDATE_LABEL_MAPPING":
                    return {
                        ...state,
                        labelMappings: {
                            ...state.labelMappings,
                            [action.payload.labelId]: action.payload.listId,
                        },
                    };
                case "SAVE_START":
                    return { ...state, isSaving: true, status: "Saving mappings and syncing..." };
                case "SAVE_END":
                    return { ...state, isSaving: false };
                default:
                    return state;
            }
        },
        {
            loading: true,
            status: null,
            projects: [],
            labels: [],
            lists: [],
            projectMappings: {},
            labelMappings: {},
            isSaving: false,
        }
    );

    const { loading, status, projects, labels, lists, projectMappings, labelMappings, isSaving } = uiState;

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            dispatchUI({ type: "FETCH_START" });
            const result = await getTodoistMappingData();
            if (!isMounted) return;

            if (!result.success) {
                dispatchUI({ type: "FETCH_ERROR", payload: result.error ?? "Failed to load Todoist mapping data." });
                return;
            }

            const projectMap: Record<string, number | null> = {};
            for (const project of result.projects ?? []) {
                const match = result.projectMappings?.find((mapping) => mapping.projectId === project.id);
                projectMap[project.id] = match?.listId ?? null;
            }

            const labelMap: Record<string, number | null> = {};
            for (const label of result.labels ?? []) {
                const match = result.labelMappings?.find((mapping) => mapping.labelId === label.id);
                labelMap[label.id] = match?.listId ?? null;
            }

            dispatchUI({
                type: "FETCH_SUCCESS",
                payload: {
                    projects: result.projects ?? [],
                    labels: result.labels ?? [],
                    lists: result.lists ?? [],
                    projectMappings: projectMap,
                    labelMappings: labelMap,
                },
            });
        };

        load();
        return () => { isMounted = false; };
    }, []);

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => a.name.localeCompare(b.name));
    }, [lists]);

    const handleSave = async () => {
        dispatchUI({ type: "SAVE_START" });
        const projectPayload = projects.map((project) => ({
            projectId: project.id,
            listId: projectMappings[project.id] ?? null,
        }));
        const labelPayload = labels.map((label) => ({
            labelId: label.id,
            listId: labelMappings[label.id] ?? null,
        }));

        const [projectResult, labelResult] = await Promise.all([
            setTodoistProjectMappings(projectPayload),
            setTodoistLabelMappings(labelPayload),
        ]);

        if (!projectResult.success || !labelResult.success) {
            dispatchUI({ type: "FETCH_ERROR", payload: projectResult.error ?? labelResult.error ?? "Failed to save mappings." });
            dispatchUI({ type: "SAVE_END" });
            return;
        }
        const syncResult = await syncTodoistNow();
        dispatchUI({
            type: "SET_STATUS",
            payload: syncResult.success
                ? "Mappings saved and synced."
                : `Mappings saved, but sync failed: ${syncResult.error ?? "Unknown sync error."}`,
        });
        dispatchUI({ type: "SAVE_END" });
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading mappings...</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-semibold">Project to List Mapping</h4>
                <p className="text-xs text-muted-foreground">
                    Map the existing Todoist projects to local lists. Only mapped projects sync.
                </p>
                <div className="mt-4 space-y-3">
                    {projects.map((project) => (
                        <div key={project.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="w-full md:w-48 text-sm text-muted-foreground">{project.name}</div>
                            <Select
                                value={projectMappings[project.id] ? String(projectMappings[project.id]) : "none"}
                                onValueChange={(value) => {
                                    dispatchUI({
                                        type: "UPDATE_PROJECT_MAPPING",
                                        payload: {
                                            projectId: project.id,
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
            </div>
            <div>
                <h4 className="text-sm font-semibold">Extra List to Label Mapping</h4>
                <p className="text-xs text-muted-foreground">
                    Map additional local lists to Todoist labels for sync beyond 5 projects.
                    Only mapped labels sync.
                </p>
                <div className="mt-4 space-y-3">
                    {labels.slice(0, 10).map((label) => (
                        <div key={label.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="w-full md:w-48 text-sm text-muted-foreground">{label.name}</div>
                            <Select
                                value={labelMappings[label.id] ? String(labelMappings[label.id]) : "none"}
                                onValueChange={(value) => {
                                    dispatchUI({
                                        type: "UPDATE_LABEL_MAPPING",
                                        payload: {
                                            labelId: label.id,
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
            </div>
            <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Mappings"}
                </Button>
                {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
            </div>
        </div>
    );
}
