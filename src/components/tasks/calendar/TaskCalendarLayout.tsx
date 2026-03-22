
"use client";

import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths } from "date-fns";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const { tasksByDate, periodTasks } = useMemo(() => {
    const map = new Map<number, { tasks: Task[]; completedCount: number }>();
    const period: Task[] = [];

    for (const task of tasks) {
      if (!task.dueDate) continue;

      if (task.dueDatePrecision && task.dueDatePrecision !== "day") {
        period.push(task);
        continue;
      }

      // ⚡ Bolt Opt: Manually calculate timestamp without startOfDay (avoids redundant Date allocations inside loop)
      const d = task.dueDate;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const entry = map.get(key) || { tasks: [], completedCount: 0 };
      entry.tasks.push(task);
      if (task.isCompleted) entry.completedCount++;
      map.set(key, entry);
    }
    return { tasksByDate: map, periodTasks: period };
  }, [tasks]);

  const daysWithMeta = useMemo(() => {
    // ⚡ Bolt Opt: Manually calculate timestamps without startOfDay (which allocates Dates)
    const now = new Date();
    const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return days.map(day => {
      const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      return {
        day,
        key,
        isCurrentMonth: day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear(),
        isTodayDate: key === todayKey,
        label: day.getDate(),
      };
    });
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
          calendarDenseTooltipThreshold={calendarDenseTooltipThreshold ?? undefined}
          calendarUseNativeTooltipsOnDenseDays={calendarUseNativeTooltipsOnDenseDays ?? undefined}
          onDateClick={onDateClick}
          onEdit={onEdit}
        />
      </TooltipProvider>
      <PeriodTasksSection tasks={periodTasks} onEdit={onEdit} />
    </div>
  );
}
