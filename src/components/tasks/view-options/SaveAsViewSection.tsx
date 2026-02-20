
import React from "react";
import { Button } from "@/components/ui/button";

interface SaveAsViewSectionProps {
    viewName: string;
    isSaving: boolean;
    onViewNameChange: (name: string) => void;
    onSave: () => void;
}

export function SaveAsViewSection({
    viewName, isSaving, onViewNameChange, onSave
}: SaveAsViewSectionProps) {
    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Save as new view</div>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="View name..."
                    value={viewName}
                    onChange={(e) => onViewNameChange(e.target.value)}
                    aria-label="View name"
                    className="flex-1 px-2 py-1 text-xs border rounded bg-background"
                />
                <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={onSave}
                    disabled={!viewName.trim() || isSaving}
                >
                    {isSaving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    );
}
