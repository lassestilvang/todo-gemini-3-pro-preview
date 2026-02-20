
import React, { useMemo, createElement } from "react";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLabelIcon } from "@/lib/icons";
import { LabelSelector } from "../LabelSelector";

interface TaskLabelsSectionProps {
    labels: Array<{ id: number; name: string; color: string | null; icon: string | null; }>;
    selectedLabelIds: number[];
    toggleLabel: (id: number) => void;
}

export function TaskLabelsSection({
    labels, selectedLabelIds, toggleLabel
}: TaskLabelsSectionProps) {
    const labelById = useMemo(() => {
        return new Map(labels.map((label) => [label.id, label]));
    }, [labels]);

    return (
        <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedLabelIds.map((id) => {
                    const label = labelById.get(id);
                    if (!label) return null;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => toggleLabel(id)}
                            className={cn(
                                badgeVariants({ variant: "secondary" }),
                                "cursor-pointer hover:!bg-destructive hover:!text-destructive-foreground select-none"
                            )}
                            style={{ backgroundColor: (label.color || '#000000') + '20', color: label.color || '#000000' }}
                            aria-label={`Remove label ${label.name}`}
                        >
                            {createElement(getLabelIcon(label.icon), { className: "h-3 w-3 mr-1" })}
                            {label.name}
                            <X className="ml-1 h-3 w-3" />
                        </button>
                    );
                })}
            </div>
            <LabelSelector
                labels={labels}
                selectedLabelIds={selectedLabelIds}
                onToggle={toggleLabel}
            />
        </div>
    );
}
