
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X, SlidersHorizontal, ChevronUp, ChevronDown, FolderOpen, Tag, AlertCircle, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchFilters {
    listId?: number | null;
    labelId?: number;
    priority?: "none" | "low" | "medium" | "high";
    status?: "all" | "completed" | "active";
    sort?: "relevance" | "created" | "due" | "priority";
    sortOrder?: "asc" | "desc";
}

interface SearchFiltersPanelProps {
    filters: SearchFilters;
    showFilters: boolean;
    onToggleFilters: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateFilter: (key: keyof SearchFilters, value: any) => void;
    onClearFilters: () => void;
    allLists: Array<{ id: number; name: string }>;
    allLabels: Array<{ id: number; name: string }>;
}

export function SearchFiltersPanel({
    filters,
    showFilters,
    onToggleFilters,
    onUpdateFilter,
    onClearFilters,
    allLists,
    allLabels
}: SearchFiltersPanelProps) {
    const hasActiveFilters =
        filters.listId !== undefined ||
        filters.labelId !== undefined ||
        filters.priority !== undefined ||
        (filters.status && filters.status !== "all") ||
        (filters.sort && filters.sort !== "relevance");

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleFilters}
                    className={cn(hasActiveFilters && "border-primary text-primary")}
                >
                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                    Filters
                    {showFilters ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                </Button>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground">
                        Clear all
                    </Button>
                )}

                {filters.listId !== undefined && filters.listId !== null && (
                    <Badge variant="secondary" className="gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {allLists.find((l) => l.id === filters.listId)?.name ?? "List"}
                        <button onClick={() => onUpdateFilter("listId", undefined)} className="ml-1 hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.labelId && (
                    <Badge variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {allLabels.find((l) => l.id === filters.labelId)?.name ?? "Label"}
                        <button onClick={() => onUpdateFilter("labelId", undefined)} className="ml-1 hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.priority && (
                    <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {filters.priority}
                        <button onClick={() => onUpdateFilter("priority", undefined)} className="ml-1 hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.status && filters.status !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                        {filters.status === "completed" ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        {filters.status}
                        <button onClick={() => onUpdateFilter("status", undefined)} className="ml-1 hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-card">
                    <FilterSelect
                        label="List"
                        value={filters.listId != null ? String(filters.listId) : "all"}
                        onValueChange={(v) => onUpdateFilter("listId", v === "all" ? undefined : Number(v))}
                        options={[{ label: "All lists", value: "all" }, ...allLists.map(l => ({ label: l.name, value: String(l.id) }))]}
                    />
                    <FilterSelect
                        label="Label"
                        value={filters.labelId ? String(filters.labelId) : "all"}
                        onValueChange={(v) => onUpdateFilter("labelId", v === "all" ? undefined : Number(v))}
                        options={[{ label: "All labels", value: "all" }, ...allLabels.map(l => ({ label: l.name, value: String(l.id) }))]}
                    />
                    <FilterSelect
                        label="Priority"
                        value={filters.priority ?? "all"}
                        onValueChange={(v) => onUpdateFilter("priority", v === "all" ? undefined : v)}
                        options={[
                            { label: "Any priority", value: "all" },
                            { label: "High", value: "high" },
                            { label: "Medium", value: "medium" },
                            { label: "Low", value: "low" },
                            { label: "None", value: "none" }
                        ]}
                    />
                    <FilterSelect
                        label="Status"
                        value={filters.status ?? "all"}
                        onValueChange={(v) => onUpdateFilter("status", v)}
                        options={[
                            { label: "All", value: "all" },
                            { label: "Active", value: "active" },
                            { label: "Completed", value: "completed" }
                        ]}
                    />
                    <FilterSelect
                        label="Sort by"
                        value={filters.sort ?? "relevance"}
                        onValueChange={(v) => onUpdateFilter("sort", v)}
                        options={[
                            { label: "Relevance", value: "relevance" },
                            { label: "Created date", value: "created" },
                            { label: "Due date", value: "due" },
                            { label: "Priority", value: "priority" }
                        ]}
                    />
                    <FilterSelect
                        label="Order"
                        value={filters.sortOrder ?? "desc"}
                        onValueChange={(v) => onUpdateFilter("sortOrder", v)}
                        options={[
                            { label: "Newest first", value: "desc" },
                            { label: "Oldest first", value: "asc" }
                        ]}
                    />
                </div>
            )}
        </div>
    );
}

function FilterSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (v: string) => void; options: Array<{ label: string; value: string }> }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
