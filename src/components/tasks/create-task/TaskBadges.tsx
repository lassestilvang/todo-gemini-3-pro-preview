
import React from "react";
import { Calendar, Flag, Zap, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatDuePeriod } from "@/lib/due-utils";
import { State, Action } from "@/lib/tasks/create-task-reducer";

interface TaskBadgesProps {
    state: State;
    dispatchState: React.Dispatch<Action>;
    onRemoveFocus: () => void;
}

function BadgeRemoveButton({ onClick, label }: { onClick: () => void, label: string }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
            aria-label={label}
        >
            <X className="h-3 w-3 text-muted-foreground" />
        </button>
    );
}

export function TaskBadges({ state, dispatchState, onRemoveFocus }: TaskBadgesProps) {
    const { priority, dueDate, dueDatePrecision, energyLevel, context } = state;

    if (priority === "none" && !dueDate && !energyLevel && !context) {
        return null;
    }

    return (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {priority !== "none" && (
                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                    <Flag className="h-3 w-3" />
                    {priority}
                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_PRIORITY", payload: "none" }); onRemoveFocus(); }} label="Remove priority" />
                </Badge>
            )}
            {dueDate && (
                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                    <Calendar className="h-3 w-3" />
                    {dueDatePrecision === "day"
                        ? format(dueDate, "MMM d")
                        : formatDuePeriod({ dueDate, dueDatePrecision })}
                    <BadgeRemoveButton onClick={() => {
                        dispatchState({ type: "SET_DUE_DATE", payload: { date: undefined, source: "none" } });
                        onRemoveFocus();
                    }} label="Remove due date" />
                </Badge>
            )}
            {energyLevel && (
                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                    <Zap className="h-3 w-3" />
                    {energyLevel}
                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_ENERGY_LEVEL", payload: undefined }); onRemoveFocus(); }} label="Remove energy level" />
                </Badge>
            )}
            {context && (
                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                    <MapPin className="h-3 w-3" />
                    {context}
                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_CONTEXT", payload: undefined }); onRemoveFocus(); }} label="Remove context" />
                </Badge>
            )}
        </div>
    );
}
