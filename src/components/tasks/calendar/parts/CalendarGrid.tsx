
import React from "react";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Task } from "@/lib/types";
import { getEffectiveCalendarDenseTooltipThreshold } from "@/components/providers/UserProvider";

interface CalendarGridProps {
    weekdayHeaders: string[];
    daysWithMeta: any[];
    tasksByDate: Map<number, { tasks: Task[]; completedCount: number }>;
    calendarDenseTooltipThreshold?: number | null;
    calendarUseNativeTooltipsOnDenseDays?: boolean;
    onDateClick: (date: Date) => void;
    onEdit: (task: Task) => void;
}

export function CalendarGrid({
    weekdayHeaders, daysWithMeta, tasksByDate, calendarDenseTooltipThreshold, calendarUseNativeTooltipsOnDenseDays, onDateClick, onEdit
}: CalendarGridProps) {
    return (
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-background shadow-sm">
            <div className="grid grid-cols-7 border-b bg-muted/40">
                {weekdayHeaders.map((day) => (
                    <div key={day} className="py-1.5 text-center text-xs font-medium text-muted-foreground">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {daysWithMeta.map(({ day, key, isCurrentMonth, isTodayDate, label }, dayIdx) => {
                    const entry = tasksByDate.get(key);
                    const dayTasks = entry?.tasks ?? [];
                    const completedCount = entry?.completedCount ?? 0;
                    const tooltipThreshold = getEffectiveCalendarDenseTooltipThreshold(calendarDenseTooltipThreshold ?? null, 6);
                    const useNativeTooltip = calendarUseNativeTooltipsOnDenseDays === false ? false : dayTasks.length > tooltipThreshold;

                    return (
                        <div key={day.toString()} className={cn(
                            "group min-h-[70px] sm:min-h-[80px] border-b border-r p-1.5 transition-colors hover:bg-muted/20 flex flex-col gap-0.5 relative",
                            !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                            dayIdx % 7 === 6 && "border-r-0",
                        )}>
                            <div className="flex justify-between items-start">
                                <span className={cn("text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full", isTodayDate && "bg-primary text-primary-foreground")}>{label}</span>
                                {dayTasks.length > 0 ? (
                                    <span className="text-[9px] text-muted-foreground font-medium">{completedCount}/{dayTasks.length}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDateClick(day); }}
                                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto max-h-[60px] sm:max-h-[80px] scrollbar-hide">
                                {dayTasks.map((task) => {
                                    const taskBadge = (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                                            className={cn(
                                                "w-full text-left text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 border cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow",
                                                task.isCompleted ? "bg-muted text-muted-foreground line-through border-transparent" : "bg-background border-l-2 shadow-sm",
                                                !task.isCompleted && task.priority === "high" && "border-l-red-500",
                                                !task.isCompleted && task.priority === "medium" && "border-l-yellow-500",
                                                !task.isCompleted && task.priority === "low" && "border-l-blue-500",
                                                !task.isCompleted && (task.priority === "none" || !task.priority) && "border-l-gray-300",
                                            )}
                                            title={useNativeTooltip ? task.title : undefined}
                                        >
                                            {task.isCompleted ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <Circle className="h-2.5 w-2.5 shrink-0" />}
                                            <span className="truncate">{task.title}</span>
                                        </button>
                                    );

                                    if (useNativeTooltip) return <div key={task.id}>{taskBadge}</div>;
                                    return (
                                        <Tooltip key={task.id}>
                                            <TooltipTrigger asChild>{taskBadge}</TooltipTrigger>
                                            <TooltipContent>
                                                <p>{task.title}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{task.priority} Priority • {task.energyLevel || "No Energy"}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>

                            {dayTasks.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDateClick(day); }}
                                    className="absolute bottom-1 right-1 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-primary hover:bg-primary/10 transition-colors"
                                >
                                    <Plus className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
