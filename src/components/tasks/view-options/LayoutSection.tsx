
import React from "react";
import { List, LayoutGrid, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewSettings } from "@/lib/view-settings";

interface LayoutSectionProps {
    layout: ViewSettings["layout"];
    onUpdate: (layout: ViewSettings["layout"]) => void;
}

export function LayoutSection({ layout, onUpdate }: LayoutSectionProps) {
    const options = [
        { id: "list", label: "List", icon: List },
        { id: "board", label: "Board", icon: LayoutGrid },
        { id: "calendar", label: "Calendar", icon: Calendar },
    ] as const;

    return (
        <div>
            <div className="text-sm font-medium mb-3">Layout</div>
            <div className="flex gap-2" role="radiogroup" aria-label="Layout view">
                {options.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => onUpdate(id as ViewSettings["layout"])}
                        role="radio"
                        aria-checked={layout === id}
                        aria-label={`${label} layout`}
                        className={cn(
                            "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                            layout === id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent"
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
