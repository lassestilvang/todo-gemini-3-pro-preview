
import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";
import { ActionType, actionRegistry } from "@/lib/sync/registry";

interface TaskListPeriodSectionProps {
    precision: string;
    label: string;
    tasks: Task[];
    collapsed: boolean;
    onToggle: () => void;
    listId?: number | null;
    userId?: string;
    onEdit: (task: Task) => void;
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export function TaskListPeriodSection({
    precision,
    label,
    tasks,
    collapsed,
    onToggle,
    listId,
    userId,
    onEdit,
    dispatch,
    now,
    isClient,
    performanceMode,
    userPreferences
}: TaskListPeriodSectionProps) {
    const sectionId = `period-${precision}-tasks`;

    return (
        <div className="rounded-lg border bg-muted/5">
            <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3"
                aria-expanded={!collapsed}
                aria-controls={sectionId}
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            collapsed && "-rotate-90"
                        )}
                    />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
                        {tasks.length}
                    </span>
                </div>
            </button>
            {!collapsed && (
                <div id={sectionId} className="px-4 pb-3 space-y-2">
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            showListInfo={!listId}
                            userId={userId}
                            disableAnimations={true}
                            dispatch={dispatch}
                            onEdit={onEdit}
                            now={now}
                            isClient={isClient}
                            performanceMode={performanceMode}
                            userPreferences={userPreferences}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
