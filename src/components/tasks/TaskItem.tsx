"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock, Repeat, AlertCircle, Lock } from "lucide-react";
import { toggleTaskCompletion } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";


// Define a type for the task prop based on the schema or a shared type
// For now, I'll define a simplified interface matching the schema
export interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    deadline: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
    isRecurring: boolean | null;
    listId: number | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
    blockedByCount?: number;
}

interface TaskItemProps {
    task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
    const [isCompleted, setIsCompleted] = useState(task.isCompleted || false);

    const handleToggle = async (checked: boolean) => {
        if (task.blockedByCount && task.blockedByCount > 0 && checked) {
            alert("This task is blocked by other tasks. Complete them first!");
            return;
        }
        setIsCompleted(checked);

        if (checked) {
            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.7 },
                    colors: ['#5b21b6', '#7c3aed', '#a78bfa'] // Purple theme
                });
            });
        }

        await toggleTaskCompletion(task.id, checked);
    };

    const priorityColors = {
        high: "text-red-500",
        medium: "text-orange-500",
        low: "text-blue-500",
        none: "text-gray-400",
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
    const isDeadlineExceeded = task.deadline && new Date(task.deadline) < new Date() && !isCompleted;
    const isBlocked = (task.blockedByCount || 0) > 0;

    return (
        <div
            className={cn(
                "group flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/40 transition-all duration-200 cursor-pointer hover:shadow-sm bg-card",
                isCompleted && "opacity-60 bg-muted/30",
                isBlocked && !isCompleted && "bg-orange-50/50 border-orange-100"
            )}
        >
            <Checkbox
                checked={isCompleted}
                onCheckedChange={handleToggle}
                disabled={isBlocked && !isCompleted}
                className={cn(
                    "rounded-full h-5 w-5 transition-all",
                    isCompleted ? "data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground" : "",
                    isBlocked && !isCompleted ? "opacity-50 cursor-not-allowed" : ""
                )}
                onClick={(e) => e.stopPropagation()}
            />

            <div className="flex-1 min-w-0">
                <div className={cn("font-medium truncate text-sm transition-all flex items-center gap-2", isCompleted && "line-through text-muted-foreground")}>
                    {task.title}
                    {isBlocked && !isCompleted && (
                        <Lock className="h-3 w-3 text-orange-500" />
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    {isBlocked && !isCompleted && (
                        <div className="flex items-center gap-1 text-orange-500 font-medium">
                            <Lock className="h-3 w-3" />
                            Blocked
                        </div>
                    )}
                    {task.dueDate && (
                        <div className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}>
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate, "MMM d")}
                        </div>
                    )}
                    {task.deadline && (
                        <div className={cn("flex items-center gap-1", isDeadlineExceeded ? "text-red-600 font-bold" : "text-orange-500")}>
                            <AlertCircle className="h-3 w-3" />
                            {format(task.deadline, "MMM d")}
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
                    {task.energyLevel && (
                        <div className="flex items-center gap-1">
                            {task.energyLevel === "high" && "🔋"}
                            {task.energyLevel === "medium" && "🔌"}
                            {task.energyLevel === "low" && "🪫"}
                        </div>
                    )}
                    {task.context && (
                        <div className="flex items-center gap-1">
                            {task.context === "computer" && "💻"}
                            {task.context === "phone" && "📱"}
                            {task.context === "errands" && "🏃"}
                            {task.context === "meeting" && "👥"}
                            {task.context === "home" && "🏠"}
                            {task.context === "anywhere" && "🌍"}
                        </div>
                    )}
                </div>
                {task.labels && task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {task.labels.map(label => (
                            <Badge
                                key={label.id}
                                variant="outline"
                                style={{
                                    borderColor: (label.color || '#000000') + '40',
                                    backgroundColor: (label.color || '#000000') + '10',
                                    color: label.color || '#000000'
                                }}
                                className="text-[10px] px-1.5 py-0 h-5 font-normal border"
                            >
                                {label.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
