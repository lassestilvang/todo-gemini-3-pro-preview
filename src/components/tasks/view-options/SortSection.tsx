
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewSettings } from "@/lib/view-settings";

interface SortSectionProps {
    viewId: string;
    groupBy: ViewSettings["groupBy"];
    sortBy: ViewSettings["sortBy"];
    expanded: boolean;
    onToggle: () => void;
    onUpdate: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => void;
}

export function SortSection({
    viewId, groupBy, sortBy, expanded, onToggle, onUpdate
}: SortSectionProps) {
    return (
        <div>
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls="sort-options"
                className="flex items-center justify-between w-full text-sm font-medium rounded-sm focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
            >
                Sort
                {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>
            {expanded && (
                <div id="sort-options" className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Grouping</span>
                        <Select
                            value={groupBy}
                            onValueChange={(value) => onUpdate("groupBy", value as ViewSettings["groupBy"])}
                        >
                            <SelectTrigger className="w-[140px]" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="dueDate">Due Date</SelectItem>
                                <SelectItem value="priority">Priority</SelectItem>
                                {!viewId.startsWith("label-") && (
                                    <SelectItem value="label">Label</SelectItem>
                                )}
                                {!viewId.startsWith("list-") && (
                                    <SelectItem value="list">List</SelectItem>
                                )}
                                <SelectItem value="estimate">Estimate</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sorting</span>
                        <Select
                            value={sortBy}
                            onValueChange={(value) => onUpdate("sortBy", value as ViewSettings["sortBy"])}
                        >
                            <SelectTrigger className="w-[140px]" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="dueDate">Due Date</SelectItem>
                                <SelectItem value="priority">Priority</SelectItem>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="created">Created</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    );
}
