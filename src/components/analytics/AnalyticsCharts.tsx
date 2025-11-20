"use client";

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-3xl font-bold">{data.summary.totalTasks}</p>
                </div>
                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{data.summary.completedTasks}</p>
                </div>
                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-3xl font-bold text-blue-600">{data.summary.completionRate}%</p>
                </div>
                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Avg Time</p>
                    <p className="text-3xl font-bold">{data.summary.avgActual}m</p>
                    {data.summary.avgEstimate > 0 && (
                        <p className="text-xs text-muted-foreground">Est: {data.summary.avgEstimate}m</p>
                    )}
                </div>
            </div>

            {/* Tasks Over Time */}
            <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Tasks Over Time (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.tasksOverTime}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" />
                        <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Distribution */}
                <div className="border rounded-lg p-6">
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
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Energy Level Completion Rate */}
                <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Energy Level Completion Rate</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={energyEfficiency}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="rate" fill="#8b5cf6" name="Completion %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights */}
            <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <h3 className="text-lg font-semibold mb-4">📊 Insights</h3>
                <div className="space-y-2 text-sm">
                    {data.summary.completionRate >= 70 && (
                        <p>✨ Great job! You&apos;re completing {data.summary.completionRate}% of your tasks.</p>
                    )}
                    {data.summary.completionRate < 50 && (
                        <p>💪 Your completion rate is {data.summary.completionRate}%. Consider breaking tasks into smaller chunks.</p>
                    )}
                    {energyEfficiency[0].rate > 0 && (
                        <p>🔋 High energy tasks have a {energyEfficiency[0].rate}% completion rate.</p>
                    )}
                    {data.summary.avgActual > data.summary.avgEstimate && data.summary.avgEstimate > 0 && (
                        <p>⏱️ Tasks take {Math.round(((data.summary.avgActual - data.summary.avgEstimate) / data.summary.avgEstimate) * 100)}% longer than estimated on average.</p>
                    )}
                    {data.summary.avgActual < data.summary.avgEstimate && data.summary.avgEstimate > 0 && (
                        <p>🚀 You&apos;re completing tasks faster than estimated! Great efficiency.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
