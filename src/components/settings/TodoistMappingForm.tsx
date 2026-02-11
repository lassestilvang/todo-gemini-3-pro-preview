"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTodoistMappingData, setTodoistLabelMappings, setTodoistProjectMappings } from "@/lib/actions/todoist";

export function TodoistMappingForm() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [labels, setLabels] = useState<{ id: string; name: string }[]>([]);
    const [lists, setLists] = useState<{ id: number; name: string }[]>([]);
    const [projectMappings, setProjectMappings] = useState<Record<string, number | null>>({});
    const [labelMappings, setLabelMappings] = useState<Record<string, number | null>>({});

    useEffect(() => {
        const load = async () => {
            const result = await getTodoistMappingData();
            if (!result.success) {
                setStatus(result.error ?? "Failed to load Todoist mapping data.");
                setLoading(false);
                return;
            }

            setProjects(result.projects ?? []);
            setLabels(result.labels ?? []);
            setLists(result.lists ?? []);

            const projectMap: Record<string, number | null> = {};
            for (const project of result.projects ?? []) {
                const match = result.projectMappings?.find((mapping) => mapping.projectId === project.id);
                projectMap[project.id] = match?.listId ?? null;
            }
            setProjectMappings(projectMap);

            const labelMap: Record<string, number | null> = {};
            for (const label of result.labels ?? []) {
                const match = result.labelMappings?.find((mapping) => mapping.labelId === label.id);
                labelMap[label.id] = match?.listId ?? null;
            }
            setLabelMappings(labelMap);

            setLoading(false);
        };

        load();
    }, []);

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => a.name.localeCompare(b.name));
    }, [lists]);

    const handleSave = async () => {
        setStatus(null);
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
            setStatus(projectResult.error ?? labelResult.error ?? "Failed to save mappings.");
            return;
        }

        setStatus("Mappings saved.");
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading mappings...</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-semibold">Project to List Mapping</h4>
                <p className="text-xs text-muted-foreground">
                    Map the existing Todoist projects to local lists. Only 5 projects are supported.
                </p>
                <div className="mt-4 space-y-3">
                    {projects.map((project) => (
                        <div key={project.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="w-full md:w-48 text-sm text-muted-foreground">{project.name}</div>
                            <Select
                                value={projectMappings[project.id] ? String(projectMappings[project.id]) : "none"}
                                onValueChange={(value) => {
                                    setProjectMappings((prev) => ({
                                        ...prev,
                                        [project.id]: value === "none" ? null : Number(value),
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
            </div>
            <div>
                <h4 className="text-sm font-semibold">Extra List to Label Mapping</h4>
                <p className="text-xs text-muted-foreground">
                    Map additional local lists to Todoist labels for sync beyond 5 projects.
                </p>
                <div className="mt-4 space-y-3">
                    {labels.slice(0, 10).map((label) => (
                        <div key={label.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="w-full md:w-48 text-sm text-muted-foreground">{label.name}</div>
                            <Select
                                value={labelMappings[label.id] ? String(labelMappings[label.id]) : "none"}
                                onValueChange={(value) => {
                                    setLabelMappings((prev) => ({
                                        ...prev,
                                        [label.id]: value === "none" ? null : Number(value),
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
            </div>
            <div className="flex items-center gap-3">
                <Button onClick={handleSave}>Save Mappings</Button>
                {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
            </div>
        </div>
    );
}
