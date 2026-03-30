
import React from "react";
import { ChevronDown, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";
import { ActionType, actionRegistry } from "@/lib/sync/registry";

interface TaskListOverdueSectionProps {
    overdueTasks: Task[];
    overdueCollapsed: boolean;
    onToggle: () => void;
    onReschedule: () => void;
    listId?: number | null;
    userId?: string;
    onEdit: (task: Task) => void;
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export const TaskListOverdueSection = React.memo(function TaskListOverdueSection({
    overdueTasks,
    overdueCollapsed,
    onToggle,
    onReschedule,
    listId,
    userId,
    onEdit,
    dispatch,
    now,
    isClient,
    performanceMode,
    userPreferences
}: TaskListOverdueSectionProps) {
    if (overdueTasks.length === 0) return null;

    return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5">
            <div
                className={cn(
                    "flex w-full items-center justify-between px-4 py-3 cursor-pointer",
                    overdueCollapsed ? "rounded-lg" : "rounded-t-lg"
                )}
                onClick={onToggle}
            >
                <button
                    type="button"
                    aria-expanded={!overdueCollapsed}
                    aria-label={`Toggle overdue section, ${overdueTasks.length} tasks`}
                    className="flex items-center gap-2 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-destructive rounded-md"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-destructive/70 transition-transform duration-200",
                            overdueCollapsed && "-rotate-90"
                        )}
                    />
                    <span className="text-sm font-semibold text-destructive">Overdue</span>
                    <span className="text-xs text-destructive/70 bg-destructive/10 px-1.5 py-0.5 rounded-full font-medium">
                        {overdueTasks.length}
                    </span>
                </button>
                <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReschedule();
                    }}
                >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Reschedule
                </button>
            </div>

            {!overdueCollapsed && (
                <div className="px-4 pb-3 space-y-2">
                    {overdueTasks.map((task) => (
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
});
