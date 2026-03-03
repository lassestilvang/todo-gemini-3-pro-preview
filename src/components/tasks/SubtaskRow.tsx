
import React, { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SubtaskRowProps {
    subtask: {
        id: number;
        title: string;
        estimateMinutes?: number | null;
        isCompleted?: boolean | null;
    };
    isCompleted: boolean;
    onToggle: (subtaskId: number, checked: boolean) => void;
}

export const SubtaskRow = memo(function SubtaskRow({ subtask, isCompleted, onToggle }: SubtaskRowProps) {
    return (
        <div
            onClick={() => onToggle(subtask.id, !isCompleted)}
            className={cn(
                "flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                isCompleted && "opacity-60"
            )}
        >
            <Checkbox
                checked={isCompleted || false}
                onCheckedChange={(checked) => onToggle(subtask.id, checked as boolean)}
                className="rounded-full h-4 w-4"
                onClick={(e) => {
                    e.stopPropagation();
                    // Stop propagation to prevent the parent row's onClick from firing as well,
                    // which would cause a double-toggle effect.
                }}
                aria-label={isCompleted ? "Mark subtask as incomplete" : "Mark subtask as complete"}
            />
            <span
                className={cn(
                    "text-sm select-none",
                    isCompleted && "line-through text-muted-foreground"
                )}
            >
                {subtask.title}
            </span>
            {subtask.estimateMinutes && (
                <span className="text-xs text-muted-foreground ml-auto">
                    {subtask.estimateMinutes}m
                </span>
            )}
        </div>
    );
});
