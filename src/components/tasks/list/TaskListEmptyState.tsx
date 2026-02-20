
import React from "react";
import { Inbox, Calendar, CheckCircle, Layers, ClipboardList } from "lucide-react";

interface TaskListEmptyStateProps {
    filterType?: string;
    viewId: string;
}

const EMPTY_STATES = {
    inbox: {
        icon: Inbox,
        title: "Your inbox is empty",
        description: "Capture ideas and tasks here.",
    },
    today: {
        icon: Calendar,
        title: "No tasks for today",
        description: "Time to relax or plan ahead.",
    },
    upcoming: {
        icon: Calendar,
        title: "No upcoming tasks",
        description: "Your schedule is clear.",
    },
    completed: {
        icon: CheckCircle,
        title: "No completed tasks yet",
        description: "Finish tasks to see them here.",
    },
    all: {
        icon: Layers,
        title: "No tasks found",
        description: "Add a task to get started.",
    },
    default: {
        icon: ClipboardList,
        title: "No tasks found",
        description: "Add a task to get started.",
    }
} as const;

export function TaskListEmptyState({ filterType, viewId }: TaskListEmptyStateProps) {
    const type = (filterType || viewId) as keyof typeof EMPTY_STATES;
    const config = EMPTY_STATES[type] || EMPTY_STATES.default;
    const Icon = config.icon;

    return (
        <div
            className="flex flex-col items-center justify-center h-[300px] text-foreground border rounded-lg border-dashed bg-muted/5"
            role="status"
            aria-live="polite"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20 mb-4 text-foreground/50">
                <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-semibold text-lg mb-1">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
    );
}
