"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapData {
    date: string;
    count: number;
}

interface CompletionHeatmapProps {
    data: HeatmapData[];
}

// ⚡ Bolt Opt: Memoize heatmap to prevent re-renders when parent analytics page updates unrelated state.
// Since heatmap data only changes when task completion history changes, this avoids expensive
// date calculations and DOM updates when other analytics sections (charts, stats) re-render.
export const CompletionHeatmap = React.memo(function CompletionHeatmap({ data }: CompletionHeatmapProps) {
    const today = startOfDay(new Date());
    const daysToShow = 140; // ~20 weeks
    const startDate = subDays(today, daysToShow);

    const heatmapDays = eachDayOfInterval({
        start: startDate,
        end: today,
    });

    // PERF: Build a Map for O(1) lookups instead of O(n) Array.find() per day.
    // For 140 days with 100 data points, this reduces lookups from O(14,000) to O(140).
    const dataMap = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const item of data) {
            map.set(item.date, item.count);
        }
        return map;
    }, [data]);

    const getCountForDate = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return dataMap.get(dateStr) ?? 0;
    };

    const getColorClass = (count: number) => {
        if (count === 0) return "bg-muted/30";
        if (count < 3) return "bg-indigo-200 dark:bg-indigo-900/40";
        if (count < 5) return "bg-indigo-400 dark:bg-indigo-700/60";
        if (count < 8) return "bg-indigo-600 dark:bg-indigo-500/80";
        return "bg-indigo-800 dark:bg-indigo-400";
    };

    // Group days by week
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    heatmapDays.forEach((day) => {
        currentWeek.push(day);
        if (day.getDay() === 6 || isSameDay(day, today)) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <div className="flex flex-col gap-2 p-4 bg-card border rounded-xl shadow-sm overflow-x-auto">
            <h3 className="text-sm font-semibold mb-2">Activity Map</h3>
            <div className="flex gap-1">
                <TooltipProvider>
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {week.map((day) => {
                                const count = getCountForDate(day);
                                return (
                                    <Tooltip key={day.toISOString()}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "w-3 h-3 rounded-sm transition-all hover:scale-125",
                                                    getColorClass(count)
                                                )}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">
                                                <span className="font-bold">{count} tasks</span> on {format(day, "MMM d, yyyy")}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ))}
                </TooltipProvider>
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground">
                <div className="flex gap-4">
                    <span>Less</span>
                    <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 rounded-sm bg-muted/30" />
                        <div className="w-2 h-2 rounded-sm bg-indigo-200 dark:bg-indigo-900/40" />
                        <div className="w-2 h-2 rounded-sm bg-indigo-400 dark:bg-indigo-700/60" />
                        <div className="w-2 h-2 rounded-sm bg-indigo-600 dark:bg-indigo-500/80" />
                        <div className="w-2 h-2 rounded-sm bg-indigo-800 dark:bg-indigo-400" />
                    </div>
                    <span>More</span>
                </div>
                <span>Last 20 weeks</span>
            </div>
        </div>
    );
});
