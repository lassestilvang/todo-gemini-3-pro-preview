"use client";

import { useState, useMemo } from "react";
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
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/providers/UserProvider";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTaskStore } from "@/lib/store/task-store";
import { useEffect } from "react";
import { type Task } from "@/lib/types";

// Internal interface for the calendar display logic
interface CalendarTask {
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
  const { tasks: storeTasks, initialize, isInitialized } = useTaskStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Use props if provided (SSR), otherwise fallback to store (Client Hydration)
  const displayTasks = useMemo((): CalendarTask[] => {
    const sourceTasks = (tasks && tasks.length > 0) ? tasks : Object.values(storeTasks);
    // Map tasks to CalendarTask interface to ensure boolean completion and typed priority
    return sourceTasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      isCompleted: !!t.isCompleted, // Ensure boolean
      priority: (t.priority ?? "none") as "none" | "low" | "medium" | "high",
      energyLevel: t.energyLevel ?? null // Ensure string | null
    }));
  }, [tasks, storeTasks]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { getWeekStartDay } = useUser();

  const weekStartsOn = getWeekStartDay();
  const weekOptions = { weekStartsOn };

  const startDate = startOfWeek(startOfMonth(currentMonth), weekOptions);
  const endDate = endOfWeek(endOfMonth(currentMonth), weekOptions);

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

  // Generate weekday headers dynamically based on week start
  const weekdayHeaders =
    weekStartsOn === 1
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Pre-compute task lookup map by date string for O(1) access per day.
  // Without this, each of the 35-42 calendar cells would iterate all tasks O(n),
  // resulting in O(n*days) complexity. This reduces it to O(n) total preprocessing.
  const tasksByDate = useMemo(() => {
    const map = new Map<
      string,
      { tasks: CalendarTask[]; completedCount: number }
    >();
    for (const task of displayTasks) {
      if (!task.dueDate) continue;
      const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
      const existing = map.get(dateKey);
      if (existing) {
        existing.tasks.push(task);
        if (task.isCompleted) {
          existing.completedCount += 1;
        }
      } else {
        map.set(dateKey, {
          tasks: [task],
          completedCount: task.isCompleted ? 1 : 0,
        });
      }
    }
    return map;
  }, [displayTasks]);

  const getTaskSummaryForDay = (date: Date) => {
    // PERF: Return tasks + completed count in O(1) to avoid per-day filtering.
    return (
      tasksByDate.get(format(date, "yyyy-MM-dd")) || {
        tasks: [],
        completedCount: 0,
      }
    );
  };

  if (!isInitialized && tasks.length === 0) {
    return <div className="flex-1 min-h-0 w-full animate-pulse bg-muted rounded-lg" />;
  }

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
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-8 px-2 text-xs font-medium"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>High
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>Med
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>Low
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-background shadow-sm">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {weekdayHeaders.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {days.map((day, dayIdx) => {
            const { tasks: dayTasks, completedCount } =
              getTaskSummaryForDay(day);
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
                  dayIdx % 7 === 6 && "border-r-0", // Remove right border for last column
                )}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={cn(
                      "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                      isTodayDate && "bg-primary text-primary-foreground",
                      !isTodayDate && isSelected && "text-primary",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {completedCount}/{dayTasks.length}
                    </span>
                  )}
                </div>

                {/* PERF: TooltipProvider wraps all tasks to avoid per-item context instantiation.
                                    Moving it outside the .map() reduces React context overhead from O(n) to O(1). */}
                <TooltipProvider>
                  <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                    {dayTasks.map((task) => (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 border",
                              task.isCompleted
                                ? "bg-muted text-muted-foreground line-through border-transparent"
                                : "bg-background border-l-2 shadow-sm",
                              !task.isCompleted &&
                              task.priority === "high" &&
                              "border-l-red-500",
                              !task.isCompleted &&
                              task.priority === "medium" &&
                              "border-l-yellow-500",
                              !task.isCompleted &&
                              task.priority === "low" &&
                              "border-l-blue-500",
                              !task.isCompleted &&
                              task.priority === "none" &&
                              "border-l-gray-300",
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
                            {task.priority} Priority •{" "}
                            {task.energyLevel || "No Energy"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
