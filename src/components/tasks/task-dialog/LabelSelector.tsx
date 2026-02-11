import { memo, useMemo, createElement } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getLabelIcon } from "@/lib/icons";

export type LabelType = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

interface LabelSelectorProps {
    labels: LabelType[];
    selectedLabelIds: number[];
    onToggle: (id: number) => void;
}

// PERF: Memoized component to prevent re-rendering the entire label list
// when other form fields (like title) change.
// For lists with 50+ labels, this saves significant reconciliation time.
export const LabelSelector = memo(function LabelSelector({
    labels,
    selectedLabelIds,
    onToggle
}: LabelSelectorProps) {
    // PERF: Create a Set for O(1) lookups instead of O(N) array includes.
    const selectedSet = useMemo(() => new Set(selectedLabelIds), [selectedLabelIds]);

    return (
        <div className="flex flex-wrap gap-2 border rounded-md p-2 max-h-[100px] overflow-y-auto">
            {labels.map(label => (
                <div key={label.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={`label-${label.id}`}
                        checked={selectedSet.has(label.id)}
                        onCheckedChange={() => onToggle(label.id)}
                    />
                    <Label
                        htmlFor={`label-${label.id}`}
                        className="cursor-pointer flex items-center gap-1.5"
                        style={{ color: label.color || '#000000' }}
                    >
                        {createElement(getLabelIcon(label.icon), { className: "h-4 w-4" })}
                        {label.name}
                    </Label>
                </div>
            ))}
            {labels.length === 0 && <span className="text-muted-foreground text-sm">No labels available</span>}
        </div>
    );
});
