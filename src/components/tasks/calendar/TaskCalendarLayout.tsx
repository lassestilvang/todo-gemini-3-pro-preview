
"use client";

import { useState, useMemo, useCallback } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, startOfDay } from "date-fns";
import { useUser } from "@/components/providers/UserProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type Task } from "@/lib/types";

// Extracted Parts
import { CalendarHeader } from "./parts/CalendarHeader";
import { CalendarGrid } from "./parts/CalendarGrid";
import { PeriodTasksSection } from "./parts/PeriodTasksSection";

interface TaskCalendarLayoutProps {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEdit: (task: Task) => void;
}

export function TaskCalendarLayout({ tasks, onDateClick, onEdit }: TaskCalendarLayoutProps) {
  const { getWeekStartDay, calendarUseNativeTooltipsOnDenseDays, calendarDenseTooltipThreshold } = useUser();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weekStartsOn = getWeekStartDay();
  const weekOptions = { weekStartsOn };

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), weekOptions),
    end: endOfWeek(endOfMonth(currentMonth), weekOptions)
  }), [currentMonth, weekOptions]);

  const weekdayHeaders = useMemo(() =>
    weekStartsOn === 1
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    [weekStartsOn]);

  const tasksByDate = useMemo(() => {
    const map = new Map<number, { tasks: Task[]; completedCount: number }>();
    tasks.forEach(task => {
      if (!task.dueDate || (task.dueDatePrecision && task.dueDatePrecision !== "day")) return;
      const key = startOfDay(new Date(task.dueDate)).getTime();
      const entry = map.get(key) || { tasks: [], completedCount: 0 };
      entry.tasks.push(task);
      if (task.isCompleted) entry.completedCount++;
      map.set(key, entry);
    });
    return map;
  }, [tasks]);

  const periodTasks = useMemo(() => tasks.filter(t => t.dueDate && t.dueDatePrecision && t.dueDatePrecision !== "day"), [tasks]);

  const daysWithMeta = useMemo(() => {
    const todayKey = startOfDay(new Date()).getTime();
    return days.map(day => ({
      day,
      key: startOfDay(day).getTime(),
      isCurrentMonth: day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear(),
      isTodayDate: startOfDay(day).getTime() === todayKey,
      label: day.getDate(),
    }));
  }, [currentMonth, days]);

  return (
    <div className="flex flex-col min-h-[500px]">
      <CalendarHeader
        currentMonth={currentMonth}
        onPrev={() => setCurrentMonth(m => subMonths(m, 1))}
        onNext={() => setCurrentMonth(m => addMonths(m, 1))}
        onToday={() => setCurrentMonth(new Date())}
      />
      <TooltipProvider>
        <CalendarGrid
          weekdayHeaders={weekdayHeaders}
          daysWithMeta={daysWithMeta}
          tasksByDate={tasksByDate}
          calendarDenseTooltipThreshold={calendarDenseTooltipThreshold}
          calendarUseNativeTooltipsOnDenseDays={calendarUseNativeTooltipsOnDenseDays}
          onDateClick={onDateClick}
          onEdit={onEdit}
        />
      </TooltipProvider>
      <PeriodTasksSection tasks={periodTasks} onEdit={onEdit} />
    </div>
  );
}
