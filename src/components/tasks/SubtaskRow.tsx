
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
                    // We don't preventDefault here because it stops the checkbox from toggling visually
                    // However, since we have an onClick on the parent, we must ensure we don't trigger double toggles.
                    // But standard Checkbox behavior is to toggle on click.
                    // If we click checkbox, it fires onClick (stopPropagation) AND onCheckedChange.
                    // If we click div, it fires div onClick.
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
