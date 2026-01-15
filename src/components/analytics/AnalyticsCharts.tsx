"use client";

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from "recharts";
import { cn } from "@/lib/utils";

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
    energyStats: { high: number; medium: number; low: number };
    energyCompleted: { high: number; medium: number; low: number };
    productivityByDay: number[];
    heatmapData: Array<{ date: string; count: number; level: number }>;
}

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
    const priorityData = [
        { name: "High", value: data.priorityDist.high, color: "#ef4444" },
        { name: "Medium", value: data.priorityDist.medium, color: "#f59e0b" },
        { name: "Low", value: data.priorityDist.low, color: "#3b82f6" },
        { name: "None", value: data.priorityDist.none, color: "#6b7280" },
    ];

    const energyEfficiency = [
        {
            name: "High Energy",
            tasks: data.energyStats.high,
            completed: data.energyCompleted.high,
            rate: data.energyStats.high > 0 ? Math.round((data.energyCompleted.high / data.energyStats.high) * 100) : 0
        },
        {
            name: "Medium Energy",
            tasks: data.energyStats.medium,
            completed: data.energyCompleted.medium,
            rate: data.energyStats.medium > 0 ? Math.round((data.energyCompleted.medium / data.energyStats.medium) * 100) : 0
        },
        {
            name: "Low Energy",
            tasks: data.energyStats.low,
            completed: data.energyCompleted.low,
            rate: data.energyStats.low > 0 ? Math.round((data.energyCompleted.low / data.energyStats.low) * 100) : 0
        },
    ];

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayData = data.productivityByDay.map((val, i) => ({
        day: days[i],
        completed: val,
    }));

    const mostProductiveDayIndex = data.productivityByDay.indexOf(Math.max(...data.productivityByDay));
    const mostProductiveDay = days[mostProductiveDayIndex];

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    {data.heatmapData.map((d, i) => (
                        <div
                            key={i}
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
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
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
        </div>
    );
}
