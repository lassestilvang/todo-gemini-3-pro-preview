
import React from "react";
import { Search, History, CheckCircle2, List, Tag, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ActivityLogFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    typeFilter: string;
    setTypeFilter: (type: string) => void;
    dateRange: { from: Date | undefined; to: Date | undefined };
    setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
    setDatePreset: (preset: "today" | "yesterday" | "week" | "month" | "all") => void;
    formatDateRangeLabel: () => string;
}

export function ActivityLogFilters({
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    dateRange,
    setDateRange,
    setDatePreset,
    formatDateRangeLabel,
}: ActivityLogFiltersProps) {
    return (
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
    );
}
