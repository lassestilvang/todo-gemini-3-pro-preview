"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock, Repeat } from "lucide-react";
import { toggleTaskCompletion } from "@/lib/actions";


// Define a type for the task prop based on the schema or a shared type
// For now, I'll define a simplified interface matching the schema
export interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
    isRecurring: boolean | null;
    listId: number | null;
    recurringRule: string | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
}

interface TaskItemProps {
    task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
    const [isCompleted, setIsCompleted] = useState(task.isCompleted || false);

    const handleToggle = async (checked: boolean) => {
        setIsCompleted(checked);
        await toggleTaskCompletion(task.id, checked);
    };

    const priorityColors = {
        high: "text-red-500",
        medium: "text-orange-500",
        low: "text-blue-500",
        none: "text-gray-400",
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

    return (
        <div
            className={cn(
                "group flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/40 transition-all duration-200 cursor-pointer hover:shadow-sm bg-card",
                isCompleted && "opacity-60 bg-muted/30"
            )}
        >
            <Checkbox
                checked={isCompleted}
                onCheckedChange={handleToggle}
                className={cn("rounded-full h-5 w-5 transition-all", isCompleted ? "data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground" : "")}
                onClick={(e) => e.stopPropagation()}
            />

            <div className="flex-1 min-w-0">
                <div className={cn("font-medium truncate text-sm transition-all", isCompleted && "line-through text-muted-foreground")}>
                    {task.title}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    {task.dueDate && (
                        <div className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}>
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate, "MMM d")}
                        </div>
                    )}
                    {task.priority && task.priority !== "none" && (
                        <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                            <Flag className="h-3 w-3" />
                            <span className="capitalize">{task.priority}</span>
                        </div>
                    )}
                    {task.estimateMinutes && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimateMinutes}m
                        </div>
                    )}
                    {task.isRecurring && (
                        <div className="flex items-center gap-1 text-blue-500">
                            <Repeat className="h-3 w-3" />
                            <span>Recurring</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
