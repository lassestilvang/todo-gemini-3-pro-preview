"use client";

import { useMemo, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import type {
    BarChart as RechartsBarChart,
    BarProps,
    LineChart as RechartsLineChart,
    LineProps,
    PieChart as RechartsPieChart,
    PieProps,
    CellProps,
    XAxisProps,
    YAxisProps,
    TooltipProps,
    LegendProps,
    ResponsiveContainerProps,
    RadarProps,
    RadarChart as RechartsRadarChart,
    PolarGridProps,
    PolarAngleAxisProps,
    PolarRadiusAxisProps
} from "recharts";

type BarChartProps = ComponentProps<typeof RechartsBarChart>;
type LineChartProps = ComponentProps<typeof RechartsLineChart>;
type PieChartProps = ComponentProps<typeof RechartsPieChart>;
type RadarChartProps = ComponentProps<typeof RechartsRadarChart>;

const BarChart = dynamic<BarChartProps>(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic<BarProps>(() => import("recharts").then(m => m.Bar), { ssr: false });
const LineChart = dynamic<LineChartProps>(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic<LineProps>(() => import("recharts").then(m => m.Line), { ssr: false });
const PieChart = dynamic<PieChartProps>(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic<PieProps>(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic<CellProps>(() => import("recharts").then(m => m.Cell), { ssr: false });
const XAxis = dynamic<XAxisProps>(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic<YAxisProps>(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic<TooltipProps<number | undefined, any>>(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic<LegendProps>(() => import("recharts").then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic<ResponsiveContainerProps>(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const Radar = dynamic<RadarProps>(() => import("recharts").then(m => m.Radar), { ssr: false });
const RadarChart = dynamic<RadarChartProps>(() => import("recharts").then(m => m.RadarChart), { ssr: false });
const PolarGrid = dynamic<PolarGridProps>(() => import("recharts").then(m => m.PolarGrid), { ssr: false });
const PolarAngleAxis = dynamic<PolarAngleAxisProps>(() => import("recharts").then(m => m.PolarAngleAxis), { ssr: false });
const PolarRadiusAxis = dynamic<PolarRadiusAxisProps>(() => import("recharts").then(m => m.PolarRadiusAxis), { ssr: false });
import { cn } from "@/lib/utils";
import React from "react";

interface AnalyticsData {
    summary: {
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
        avgEstimate: number;
        avgActual: number;
    };
    tasksOverTime: Array<{ date: string; created: number; completed: number }>;
    priorityDist: { high: number; medium: number; low: number; none: number };
    duePrecisionDist: { day: number; week: number; month: number; year: number; none: number };
    energyStats: { high: number; medium: number; low: number };
    energyCompleted: { high: number; medium: number; low: number };
    productivityByDay: number[];
    heatmapData: Array<{ date: string; count: number; level: number }>;
    timeTracking?: {
        totalTrackedMinutes: number;
        totalEstimatedMinutes: number;
        accuracyPercent: number;
        entriesCount: number;
        dailyTracked: Array<{ date: string; minutes: number; formatted: string }>;
    };
}

// ⚡ Bolt Opt: Memoize analytics charts to prevent re-renders when parent page updates unrelated state.
// Since analytics data is expensive to compute and render (multiple recharts components), this avoids
// unnecessary re-calculations and DOM updates when other page sections (filters, tabs) change.
export const AnalyticsCharts = React.memo(function AnalyticsCharts({ data }: { data: AnalyticsData }) {
    // PERF: Memoize expensive chart data transformations to avoid recalculating on every render.
    // For analytics pages with multiple charts, this reduces redundant array operations
    // and prevents unnecessary re-renders of child chart components.
    const { priorityData, dayData, mostProductiveDay } = useMemo(() => {
        const priority = [
            { name: "High", value: data.priorityDist.high, color: "#ef4444" },
            { name: "Medium", value: data.priorityDist.medium, color: "#f59e0b" },
            { name: "Low", value: data.priorityDist.low, color: "#3b82f6" },
            { name: "None", value: data.priorityDist.none, color: "#6b7280" },
        ];

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayDataArray = data.productivityByDay.map((val, i) => ({
            day: days[i],
            completed: val,
        }));

        // PERF: Find max value in a single pass instead of spreading array into Math.max
        // which creates unnecessary intermediate array copies.
        let maxValue = -Infinity;
        let maxIndex = 0;
        for (let i = 0; i < data.productivityByDay.length; i++) {
            if (data.productivityByDay[i] > maxValue) {
                maxValue = data.productivityByDay[i];
                maxIndex = i;
            }
        }
        const mostProductiveDayValue = days[maxIndex];

        return {
            priorityData: priority,
            dayData: dayDataArray,
            mostProductiveDay: mostProductiveDayValue,
        };
    }, [data.priorityDist, data.productivityByDay]);

    const periodTasks = data.duePrecisionDist.week
        + data.duePrecisionDist.month
        + data.duePrecisionDist.year;
    const scheduledTasks = data.summary.totalTasks - data.duePrecisionDist.none;
    const periodPercent = scheduledTasks > 0
        ? Math.round((periodTasks / scheduledTasks) * 100)
        : 0;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-3xl font-bold">{data.summary.totalTasks}</p>
                </div>
                <div className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{data.summary.completedTasks}</p>
                </div>
                <div className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-3xl font-bold text-blue-600">{data.summary.completionRate}%</p>
                </div>
                <div className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm text-muted-foreground">Period Tasks</p>
                    <p className="text-3xl font-bold">{periodTasks}</p>
                    {scheduledTasks > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {periodPercent}% of scheduled tasks
                        </p>
                    )}
                </div>
                <div className="border rounded-lg p-4 bg-card shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm text-muted-foreground">Avg Time</p>
                    <p className="text-3xl font-bold">{data.summary.avgActual}m</p>
                    {data.summary.avgEstimate > 0 && (
                        <p className="text-xs text-muted-foreground">Est: {data.summary.avgEstimate}m</p>
                    )}
                </div>
            </div>

            {/* Heatmap Section */}
            <div className="border rounded-lg p-6 bg-card shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Productivity Heatmap (Last 90 Days)</h3>
                <div className="flex flex-wrap gap-1">
                    {data.heatmapData.map((d) => (
                        <div
                            key={d.date}
                            className={cn(
                                "w-3 h-3 rounded-[2px] transition-colors",
                                d.level === 0 && "bg-muted/30",
                                d.level === 1 && "bg-green-200 dark:bg-green-900/40",
                                d.level === 2 && "bg-green-400 dark:bg-green-700/60",
                                d.level === 3 && "bg-green-500 dark:bg-green-500/80",
                                d.level === 4 && "bg-green-700 dark:bg-green-300"
                            )}
                            title={`${d.date}: ${d.count} tasks`}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-[1px] bg-muted/30" />
                        <div className="w-2 h-2 rounded-[1px] bg-green-200 dark:bg-green-900/40" />
                        <div className="w-2 h-2 rounded-[1px] bg-green-400 dark:bg-green-700/60" />
                        <div className="w-2 h-2 rounded-[1px] bg-green-500 dark:bg-green-500/80" />
                        <div className="w-2 h-2 rounded-[1px] bg-green-700 dark:bg-green-300" />
                    </div>
                    <span>More</span>
                </div>
            </div>

            {/* Tasks Over Time */}
            <div className="border rounded-lg p-6 bg-card shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Tasks Over Time (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.tasksOverTime}>
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line type="monotone" data-testid="created-line" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} name="Created" />
                        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Distribution */}
                <div className="border rounded-lg p-6 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={priorityData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name ?? "Unknown"}: ${entry.value ?? 0}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {priorityData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Day of Week Radar */}
                <div className="border rounded-lg p-6 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Productivity by Day</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dayData}>
                            <PolarGrid stroke="#888888" strokeOpacity={0.2} />
                            <PolarAngleAxis dataKey="day" stroke="#888888" fontSize={12} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#888888" fontSize={10} axisLine={false} tickLine={false} tick={false} />
                            <Radar name="Completed Tasks" dataKey="completed" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights */}
            <div className="border rounded-lg p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border-indigo-500/20 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-500 rounded-lg text-white">📊</span>
                    Productivity Insights
                </h3>
                <div className="space-y-3 text-sm">
                    {data.summary.completionRate >= 70 && (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <p>✨ Great job! You&apos;re completing <span className="font-bold text-green-600">{data.summary.completionRate}%</span> of your tasks.</p>
                        </div>
                    )}
                    {data.summary.completionRate < 50 && (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <p>💪 Your completion rate is {data.summary.completionRate}%. Consider breaking tasks into smaller chunks.</p>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <p>📅 Your most productive day is <span className="font-bold text-indigo-500">{mostProductiveDay}</span>.</p>
                    </div>
                    {data.summary.avgActual > data.summary.avgEstimate && data.summary.avgEstimate > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <p>⏱️ Tasks take <span className="font-bold text-red-600">{Math.round(((data.summary.avgActual - data.summary.avgEstimate) / data.summary.avgEstimate) * 100)}%</span> longer than estimated.</p>
                        </div>
                    )}
                    {data.summary.avgActual < data.summary.avgEstimate && data.summary.avgEstimate > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <p>🚀 You&apos;re completing tasks <span className="font-bold text-blue-600">{Math.round(((data.summary.avgEstimate - data.summary.avgActual) / data.summary.avgEstimate) * 100)}%</span> faster than estimated!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Time Tracking Chart */}
            {data.timeTracking && data.timeTracking.entriesCount > 0 && (
                <div className="border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">⏱️ Time Tracking</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200 dark:border-blue-800">
                            <p className="text-2xl font-bold text-blue-600">
                                {Math.floor(data.timeTracking.totalTrackedMinutes / 60)}h {data.timeTracking.totalTrackedMinutes % 60}m
                            </p>
                            <p className="text-xs text-muted-foreground">Total Tracked</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800">
                            <p className="text-2xl font-bold text-purple-600">
                                {Math.floor(data.timeTracking.totalEstimatedMinutes / 60)}h {data.timeTracking.totalEstimatedMinutes % 60}m
                            </p>
                            <p className="text-xs text-muted-foreground">Total Estimated</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800">
                            <p className={cn(
                                "text-2xl font-bold",
                                data.timeTracking.accuracyPercent > 100 ? "text-red-600" : "text-emerald-600"
                            )}>
                                {data.timeTracking.accuracyPercent}%
                            </p>
                            <p className="text-xs text-muted-foreground">Time Accuracy</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800">
                            <p className="text-2xl font-bold text-amber-600">{data.timeTracking.entriesCount}</p>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                    </div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Daily Time Tracked (Last 7 Days)</h4>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.timeTracking.dailyTracked}>
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${Math.floor(v / 60)}h`} />
                                <Tooltip
                                    formatter={(value: number | undefined) => [
                                        value ? `${Math.floor(value / 60)}h ${value % 60}m` : "0h 0m",
                                        "Time Tracked"
                                    ]}
                                />
                                <Bar dataKey="minutes" fill="url(#timeGradient)" radius={[4, 4, 0, 0]} />
                                <defs>
                                    <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
});
