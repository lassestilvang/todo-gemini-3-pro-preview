"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
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
import { useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { formatTimePreference } from "@/lib/time-utils";
import { GroupedVirtuoso } from "react-virtuoso";


import { ActivityLogFilters } from "./ActivityLogFilters";
import { ActivityLogItem } from "./ActivityLogItem";
import { ActivityLogEmpty } from "./ActivityLogEmpty";
import { ActivityLogHeader } from "./ActivityLogHeader";

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

export function ActivityLogContent(props: ActivityLogContentProps) {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                Loading activity log...
            </div>
        }>
            <ActivityLogInner {...props} />
        </Suspense>
    );
}

function ActivityLogInner({ initialLogs, use24h }: ActivityLogContentProps) {
    const router = useRouter();
    const searchParams = useNextSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
    const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    });
    const lastUrlRef = useRef<string | null>(null);

    const updateUrl = useCallback((query: string, type: string, from?: Date, to?: Date) => {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (type !== "all") params.set("type", type);
        if (from) params.set("from", format(from, "yyyy-MM-dd"));
        if (to) params.set("to", format(to, "yyyy-MM-dd"));

        const newUrl = params.toString() ? `/activity?${params.toString()}` : "/activity";

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
            <ActivityLogFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                setDatePreset={setDatePreset}
                formatDateRangeLabel={formatDateRangeLabel}
            />

            <div className="flex-1 min-h-0">
                {initialLogs.length === 0 ? (
                    <ActivityLogEmpty
                        searchQuery={searchQuery}
                        typeFilter={typeFilter}
                        onClearFilters={() => {
                            setSearchQuery("");
                            setTypeFilter("all");
                        }}
                    />
                ) : (
                    <GroupedVirtuoso
                        style={{ height: "100%" }}
                        groupCounts={groupCounts}
                        className="pb-12"
                        groupContent={(groupIndex) => {
                            const date = groupedEntries[groupIndex]?.date;
                            return <ActivityLogHeader date={date} />;
                        }}
                        itemContent={(index, groupIndex) => {
                            const log = groupedEntries[groupIndex]?.logs[index];
                            if (!log) return null;
                            return <ActivityLogItem log={log} use24h={use24h} />;
                        }}
                    />
                )}
            </div>
        </div>
    );
}

