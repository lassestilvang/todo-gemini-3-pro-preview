"use client";

import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getEffectiveCalendarDenseTooltipThreshold,
  useUser,
} from "@/components/providers/UserProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Task } from "@/lib/types";
import { formatDuePeriod, type DuePrecision } from "@/lib/due-utils";

interface TaskCalendarLayoutProps {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEdit: (task: Task) => void;
}

export function TaskCalendarLayout({
  tasks,
  onDateClick,
  onEdit,
}: TaskCalendarLayoutProps) {
  const {
    getWeekStartDay,
    calendarUseNativeTooltipsOnDenseDays,
    calendarDenseTooltipThreshold,
  } = useUser();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const weekStartsOn = getWeekStartDay();
  const weekOptions = { weekStartsOn };

  const startDate = startOfWeek(startOfMonth(currentMonth), weekOptions);
  const endDate = endOfWeek(endOfMonth(currentMonth), weekOptions);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = useCallback(
    () => setCurrentMonth((m) => addMonths(m, 1)),
    [],
  );
  const prevMonth = useCallback(
    () => setCurrentMonth((m) => subMonths(m, 1)),
    [],
  );
  const goToToday = useCallback(() => setCurrentMonth(new Date()), []);

  const weekdayHeaders =
    weekStartsOn === 1
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const tasksByDate = useMemo(() => {
    const map = new Map<
      number,
      { tasks: Task[]; completedCount: number }
    >();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (task.dueDatePrecision && task.dueDatePrecision !== "day") continue;
      const dateKey = startOfDay(
        task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
      ).getTime();
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
  }, [tasks]);

  const periodTasks = useMemo(() => {
    return tasks.filter((task) => task.dueDate && task.dueDatePrecision && task.dueDatePrecision !== "day");
  }, [tasks]);

  const daysWithMeta = useMemo(() => {
    const todayKey = startOfDay(new Date()).getTime();
    const currentMonthValue = currentMonth.getMonth();
    const currentMonthYear = currentMonth.getFullYear();

    return days.map((day) => {
      const key = startOfDay(day).getTime();
      return {
        day,
        key,
        isCurrentMonth:
          day.getMonth() === currentMonthValue &&
          day.getFullYear() === currentMonthYear,
        isTodayDate: key === todayKey,
        label: day.getDate(),
      };
    });
  }, [currentMonth, days]);

  return (
    <div className="flex flex-col min-h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <div className="flex items-center rounded-md border bg-background shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-7 px-2 text-xs font-medium"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            High
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Med
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Low
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-background shadow-sm">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {weekdayHeaders.map((day) => (
            <div
              key={day}
              className="py-1.5 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <TooltipProvider>
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {daysWithMeta.map(
              ({ day, key, isCurrentMonth, isTodayDate, label }, dayIdx) => {
                const entry = tasksByDate.get(key);
                const dayTasks = entry?.tasks ?? [];
                const completedCount = entry?.completedCount ?? 0;
                const tooltipThreshold =
                  getEffectiveCalendarDenseTooltipThreshold(
                    calendarDenseTooltipThreshold,
                    6,
                  );
                const useNativeTooltip =
                  calendarUseNativeTooltipsOnDenseDays === false
                    ? false
                    : dayTasks.length > tooltipThreshold;

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "group min-h-[70px] sm:min-h-[80px] border-b border-r p-1.5 transition-colors hover:bg-muted/20 flex flex-col gap-0.5 relative",
                      !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                      dayIdx % 7 === 6 && "border-r-0",
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={cn(
                          "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                          isTodayDate && "bg-primary text-primary-foreground",
                        )}
                      >
                        {label}
                      </span>
                      {dayTasks.length > 0 ? (
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {completedCount}/{dayTasks.length}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateClick(day);
                          }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(task);
                            }}
                            className={cn(
                              "w-full text-left text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 border cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow",
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
                            title={useNativeTooltip ? task.title : undefined}
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <Circle className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span className="truncate">{task.title}</span>
                          </button>
                        );

                        if (useNativeTooltip) {
                          return <div key={task.id}>{taskBadge}</div>;
                        }

                        return (
                          <Tooltip key={task.id}>
                            <TooltipTrigger asChild>{taskBadge}</TooltipTrigger>
                            <TooltipContent>
                              <p>{task.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {task.priority} Priority •{" "}
                                {task.energyLevel || "No Energy"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {dayTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateClick(day);
                        }}
                        className="absolute bottom-1 right-1 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </TooltipProvider>
        {periodTasks.length > 0 && (
          <div className="mt-6 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold">Sometime This Period</h4>
                <p className="text-xs text-muted-foreground">
                  Tasks scheduled for a week, month, or year
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {periodTasks.length} total
              </span>
            </div>
            <div className="space-y-2">
              {periodTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onEdit(task)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:shadow-sm",
                    task.isCompleted && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{task.title}</span>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuePeriod({
                        dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                        dueDatePrecision: task.dueDatePrecision as DuePrecision,
                      })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
