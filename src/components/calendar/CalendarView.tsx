"use client";

import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Task {
    id: number;
    title: string;
    dueDate: Date | null;
    isCompleted: boolean;
    priority: "none" | "low" | "medium" | "high";
    energyLevel?: string | null;
}

interface CalendarViewProps {
    tasks: Task[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const startDate = startOfWeek(startOfMonth(currentMonth));
    const endDate = endOfWeek(endOfMonth(currentMonth));

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today);
    };

    // Filter tasks for the calendar view (only those with due dates)
    const calendarTasks = tasks.filter(t => t.dueDate);

    const getTasksForDay = (date: Date) => {
        return calendarTasks.filter(task =>
            task.dueDate && isSameDay(new Date(task.dueDate), date)
        );
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "bg-red-500";
            case "medium": return "bg-yellow-500";
            case "low": return "bg-blue-500";
            default: return "bg-gray-400";
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center rounded-md border bg-background shadow-sm">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-2 text-xs font-medium">
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>High</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div>Med</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Low</div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-background shadow-sm">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b bg-muted/40">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {days.map((day, dayIdx) => {
                        const dayTasks = getTasksForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "min-h-[100px] border-b border-r p-2 transition-colors hover:bg-muted/20 cursor-pointer flex flex-col gap-1",
                                    !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                    isSelected && "bg-primary/5 ring-1 ring-inset ring-primary",
                                    dayIdx % 7 === 6 && "border-r-0" // Remove right border for last column
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span
                                        className={cn(
                                            "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                            isTodayDate && "bg-primary text-primary-foreground",
                                            !isTodayDate && isSelected && "text-primary"
                                        )}
                                    >
                                        {format(day, "d")}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {dayTasks.filter(t => t.isCompleted).length}/{dayTasks.length}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                    {dayTasks.map((task) => (
                                        <TooltipProvider key={task.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 border",
                                                            task.isCompleted
                                                                ? "bg-muted text-muted-foreground line-through border-transparent"
                                                                : "bg-background border-l-2 shadow-sm",
                                                            !task.isCompleted && task.priority === "high" && "border-l-red-500",
                                                            !task.isCompleted && task.priority === "medium" && "border-l-yellow-500",
                                                            !task.isCompleted && task.priority === "low" && "border-l-blue-500",
                                                            !task.isCompleted && task.priority === "none" && "border-l-gray-300"
                                                        )}
                                                    >
                                                        {task.isCompleted ? (
                                                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                                        ) : (
                                                            <Circle className="h-2.5 w-2.5 shrink-0" />
                                                        )}
                                                        <span className="truncate">{task.title}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{task.title}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        {task.priority} Priority • {task.energyLevel || "No Energy"}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
