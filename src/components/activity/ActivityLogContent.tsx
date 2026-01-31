"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format, isToday, isYesterday, subDays, startOfDay, endOfDay } from "date-fns";
import {
    Search,
    CheckCircle2,
    Plus,
    Pencil,
    Trash2,
    List,
    Tag,
    Clock,
    ArrowUpRight,
    History,
    Calendar as CalendarIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatTimePreference } from "@/lib/time-utils";
import { GroupedVirtuoso } from "react-virtuoso";


export type LogType = ActivityLogEntry;

interface ActivityLogEntry {
    id: number;
    taskId: number | null;
    taskTitle: string | null;
    listId: number | null;
    listName: string | null;
    listSlug: string | null;
    labelId: number | null;
    labelName: string | null;
    action: string;
    details: string | null;
    createdAt: Date;
}

interface ActivityLogContentProps {
    initialLogs: ActivityLogEntry[];
    userId: string;
    use24h: boolean | null;
}

export function ActivityLogContent({ initialLogs, use24h }: ActivityLogContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
    const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    });
    const lastUrlRef = useRef<string | null>(null);

    // Update URL when filters change (only if URL actually changed)
    const updateUrl = useCallback((query: string, type: string, from?: Date, to?: Date) => {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (type !== "all") params.set("type", type);
        if (from) params.set("from", format(from, "yyyy-MM-dd"));
        if (to) params.set("to", format(to, "yyyy-MM-dd"));

        const newUrl = params.toString() ? `/activity?${params.toString()}` : "/activity";

        // Only navigate if URL actually changed
        if (lastUrlRef.current !== newUrl) {
            lastUrlRef.current = newUrl;
            router.replace(newUrl);
        }
    }, [router]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateUrl(searchQuery, typeFilter, dateRange.from, dateRange.to);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, typeFilter, dateRange, updateUrl]);

    const setDatePreset = (preset: "today" | "yesterday" | "week" | "month" | "all") => {
        const today = new Date();
        switch (preset) {
            case "today":
                setDateRange({ from: startOfDay(today), to: endOfDay(today) });
                break;
            case "yesterday":
                const yesterday = subDays(today, 1);
                setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
                break;
            case "week":
                setDateRange({ from: subDays(today, 7), to: today });
                break;
            case "month":
                setDateRange({ from: subDays(today, 30), to: today });
                break;
            case "all":
                setDateRange({ from: undefined, to: undefined });
                break;
        }
    };

    const getActionIcon = (action: string) => {
        if (action.includes("completed")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (action.includes("created")) return <Plus className="h-4 w-4 text-blue-500" />;
        if (action.includes("updated")) return <Pencil className="h-4 w-4 text-amber-500" />;
        if (action.includes("deleted")) return <Trash2 className="h-4 w-4 text-red-500" />;
        return <History className="h-4 w-4 text-slate-500" />;
    };

    const getActionBadge = (action: string) => {
        const type = action.split("_")[0];
        switch (type) {
            case "task": return <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Task</Badge>;
            case "list": return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5 bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">List</Badge>;
            case "label": return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5 bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Label</Badge>;
            default: return <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Activity</Badge>;
        }
    };

    // Perf: build stable group order + counts once to feed virtualization.
    // This avoids re-grouping work during filter interactions and enables windowed rendering.
    const groupedEntries = useMemo(() => {
        const groups: Record<string, ActivityLogEntry[]> = {};
        const order: string[] = [];
        for (const log of initialLogs) {
            const dateKey = format(new Date(log.createdAt), "yyyy-MM-dd");
            if (!groups[dateKey]) {
                groups[dateKey] = [];
                order.push(dateKey);
            }
            groups[dateKey].push(log);
        }
        return order.map(date => ({ date, logs: groups[date] }));
    }, [initialLogs]);

    const groupCounts = useMemo(() => {
        return groupedEntries.map(entry => entry.logs.length);
    }, [groupedEntries]);

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return "Today";
        if (isYesterday(date)) return "Yesterday";
        return format(date, "EEEE, MMMM do");
    };

    const formatDateRangeLabel = () => {
        if (!dateRange.from && !dateRange.to) return "All time";
        if (dateRange.from && !dateRange.to) return `From ${format(dateRange.from, "MMM d")}`;
        if (!dateRange.from && dateRange.to) return `Until ${format(dateRange.to, "MMM d")}`;
        if (dateRange.from && dateRange.to) {
            if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
                return format(dateRange.from, "MMM d");
            }
            return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
        }
        return "Select dates";
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto w-full">
            <div className="flex flex-col gap-4 mb-8 px-4 sm:px-0">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        A detailed history of everything that&apos;s happened in your planner.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search activity..."
                            className="pl-9 bg-card/50 border-muted"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[160px] bg-card/50 border-muted">
                            <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <span className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-slate-500" />
                                    All Types
                                </span>
                            </SelectItem>
                            <SelectItem value="task">
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Tasks
                                </span>
                            </SelectItem>
                            <SelectItem value="list">
                                <span className="flex items-center gap-2">
                                    <List className="h-4 w-4 text-blue-500" />
                                    Lists
                                </span>
                            </SelectItem>
                            <SelectItem value="label">
                                <span className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-purple-500" />
                                    Labels
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-auto min-w-[160px] justify-start bg-card/50 border-muted font-normal">
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {formatDateRangeLabel()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <div className="flex flex-col">
                                <div className="flex gap-1 p-2 border-b">
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDatePreset("today")}>Today</Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDatePreset("yesterday")}>Yesterday</Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDatePreset("week")}>7 days</Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDatePreset("month")}>30 days</Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDatePreset("all")}>All</Button>
                                </div>
                                <Calendar
                                    mode="range"
                                    selected={{ from: dateRange.from, to: dateRange.to }}
                                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                    numberOfMonths={1}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {initialLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                            <History className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-bold">No activity found</h2>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                            {searchQuery || typeFilter !== "all"
                                ? "Try adjusting your filters to find what you&apos;re looking for."
                                : "Activities will show up here as you use the app."}
                        </p>
                        {(searchQuery || typeFilter !== "all") && (
                            <Button
                                variant="ghost"
                                className="mt-4"
                                onClick={() => {
                                    setSearchQuery("");
                                    setTypeFilter("all");
                                }}
                            >
                                Clear all filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <GroupedVirtuoso
                        style={{ height: "100%" }}
                        groupCounts={groupCounts}
                        className="pb-12"
                        // Perf: virtualize large activity logs to keep DOM and paint cost bounded.
                        groupContent={(groupIndex) => {
                            const date = groupedEntries[groupIndex]?.date;
                            return (
                                <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2 px-4 mb-4 -mx-4 border-y border-muted/20">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                                        {date ? formatDateHeader(date) : ""}
                                    </h3>
                                </div>
                            );
                        }}
                        itemContent={(index, groupIndex) => {
                            const log = groupedEntries[groupIndex]?.logs[index];
                            if (!log) return null;
                            return (
                                <div className="space-y-1 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/30">
                                    <div
                                        className="group relative flex items-start gap-4 p-3 rounded-xl hover:bg-muted/40 transition-all duration-200"
                                    >
                                        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-transform group-hover:scale-110">
                                            {getActionIcon(log.action)}
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="font-semibold text-sm capitalize truncate pr-1">
                                                        {log.action.replace(/_/g, " ")}
                                                    </span>
                                                    {getActionBadge(log.action)}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground bg-muted/30 py-1 px-2 rounded-full">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimePreference(new Date(log.createdAt), use24h)}
                                                </div>
                                            </div>

                                            <div className="mt-1 flex items-center gap-2">
                                                {log.taskTitle && (
                                                    <Link
                                                        href={`/activity?taskId=${log.taskId}`}
                                                        className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                                        <span className="font-medium">{log.taskTitle}</span>
                                                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </Link>
                                                )}
                                                {log.listName && (
                                                    <Link
                                                        href={`/lists/${log.listId}`}
                                                        className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                                                    >
                                                        <List className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                                        <span className="font-medium">{log.listName}</span>
                                                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </Link>
                                                )}
                                                {log.labelName && (
                                                    <Link
                                                        href={`/labels/${log.labelId}`}
                                                        className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                                                    >
                                                        <Tag className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                                        <span className="font-medium">{log.labelName}</span>
                                                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </Link>
                                                )}
                                            </div>

                                            {log.details && (
                                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed italic bg-muted/10 p-2 rounded-lg border border-muted/5">
                                                    {log.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                )}
            </div>
        </div>
    );
}
