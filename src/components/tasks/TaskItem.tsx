"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock } from "lucide-react";
import { toggleTaskCompletion } from "@/lib/actions";
import { useRouter } from "next/navigation";

// Define a type for the task prop based on the schema or a shared type
// For now, I'll define a simplified interface matching the schema
interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
}

interface TaskItemProps {
    task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
    const [isCompleted, setIsCompleted] = useState(task.isCompleted || false);
    const router = useRouter();

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

    return (
        <div
            className={cn(
                "group flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer",
                isCompleted && "opacity-50"
            )}
            onClick={() => router.push(`?taskId=${task.id}`)}
        >
            <Checkbox
                checked={isCompleted}
                onCheckedChange={handleToggle}
                className="rounded-full"
                onClick={(e) => e.stopPropagation()}
            />

            <div className="flex-1 min-w-0">
                <div className={cn("font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
                    {task.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {task.dueDate && (
                        <div className={cn("flex items-center gap-1", task.dueDate < new Date() && !isCompleted ? "text-red-500" : "")}>
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
                </div>
            </div>
        </div>
    );
}
