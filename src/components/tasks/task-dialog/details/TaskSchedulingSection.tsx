
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDuePeriod, normalizeDueAnchor, type DuePrecision } from "@/lib/due-utils";

interface TaskSchedulingSectionProps {
    dueDate: Date | undefined;
    setDueDate: (v: Date | undefined) => void;
    dueDatePrecision: DuePrecision;
    setDueDatePrecision: (v: DuePrecision) => void;
    deadline: Date | undefined;
    setDeadline: (v: Date | undefined) => void;
    weekStartsOnMonday?: boolean;
}

export function TaskSchedulingSection({
    dueDate, setDueDate,
    dueDatePrecision, setDueDatePrecision,
    deadline, setDeadline,
    weekStartsOnMonday
}: TaskSchedulingSectionProps) {
    const [precisionMenuOpen, setPrecisionMenuOpen] = useState(false);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const weekStartsOn = weekStartsOnMonday ? 1 : 0;

    const duePrecisionLabel = {
        day: "Specific Date",
        week: "Week",
        month: "Month",
        year: "Year",
    } as const;

    const precisionOptions: Array<{ value: DuePrecision; label: string; helper: string }> = [
        { value: "day", label: "Specific Date", helper: "Exact day + time" },
        { value: "week", label: "Week", helper: "Sometime this week" },
        { value: "month", label: "Month", helper: "Any day in month" },
        { value: "year", label: "Year", helper: "Long-term goal" },
    ];

    const normalizedDueDate = dueDate
        ? normalizeDueAnchor(dueDate, dueDatePrecision, weekStartsOnMonday ?? false)
        : undefined;

    const handlePrecisionChange = (value: DuePrecision) => {
        setDueDatePrecision(value);
        if (dueDate) {
            setDueDate(normalizeDueAnchor(dueDate, value, weekStartsOnMonday ?? false));
        }
    };

    const handleMonthSelect = (monthIndex: number) => {
        const base = dueDate ?? new Date();
        const next = new Date(base.getFullYear(), monthIndex, 1);
        setDueDate(normalizeDueAnchor(next, "month", weekStartsOnMonday ?? false));
        setMonthPickerOpen(false);
    };

    const handleYearSelect = (yearValue: number) => {
        const next = new Date(yearValue, 0, 1);
        setDueDate(normalizeDueAnchor(next, "year", weekStartsOnMonday ?? false));
    };

    const yearOptions = Array.from({ length: 8 }, (_, idx) => {
        const baseYear = (dueDate ?? new Date()).getFullYear();
        return baseYear - 2 + idx;
    });

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover open={precisionMenuOpen} onOpenChange={setPrecisionMenuOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-medium">{duePrecisionLabel[dueDatePrecision]}</span>
                                <span className="text-xs text-muted-foreground">Choose how precise the date should be</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[300px] p-2">
                        <div className="grid gap-1">
                            {precisionOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition",
                                        dueDatePrecision === option.value
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted"
                                    )}
                                    onClick={() => {
                                        handlePrecisionChange(option.value);
                                        setPrecisionMenuOpen(false);
                                    }}
                                >
                                    <div>
                                        <p className="text-sm font-medium">{option.label}</p>
                                        <p className="text-xs text-muted-foreground">{option.helper}</p>
                                    </div>
                                    {dueDatePrecision === option.value && (
                                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Preview</span>
                        {normalizedDueDate ? (
                            <span className="font-medium text-foreground">{formatDuePeriod({ dueDate: normalizedDueDate, dueDatePrecision })}</span>
                        ) : (
                            <span className="italic">No date selected</span>
                        )}
                    </div>

                    {dueDatePrecision === "day" && (
                        <div className="grid grid-cols-2 gap-2">
                            <DatePicker date={dueDate} setDate={(d) => {
                                if (d) {
                                    const existingHours = dueDate?.getHours();
                                    const existingMinutes = dueDate?.getMinutes();
                                    if (existingHours !== undefined && existingMinutes !== undefined &&
                                        !(existingHours === 0 && existingMinutes === 0)) {
                                        d.setHours(existingHours, existingMinutes, 0, 0);
                                    }
                                }
                                setDueDate(d);
                            }} />
                            <TimePicker
                                time={dueDate && (dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0)
                                    ? `${dueDate.getHours().toString().padStart(2, "0")}:${dueDate.getMinutes().toString().padStart(2, "0")}`
                                    : undefined}
                                setTime={(t) => {
                                    if (t && dueDate) {
                                        const [hours, minutes] = t.split(":").map(Number);
                                        const newDate = new Date(dueDate);
                                        newDate.setHours(hours, minutes, 0, 0);
                                        setDueDate(newDate);
                                    } else if (!t && dueDate) {
                                        const newDate = new Date(dueDate);
                                        newDate.setHours(0, 0, 0, 0);
                                        setDueDate(newDate);
                                    }
                                }}
                                placeholder="Time"
                                disabled={!dueDate}
                            />
                        </div>
                    )}

                    {dueDatePrecision === "week" && (
                        <CalendarComponent
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => {
                                if (!date) {
                                    setDueDate(undefined);
                                    return;
                                }
                                setDueDate(normalizeDueAnchor(date, "week", weekStartsOnMonday ?? false));
                            }}
                            weekStartsOn={weekStartsOn}
                            initialFocus
                            className="bg-background rounded-lg border"
                        />
                    )}

                    {dueDatePrecision === "month" && (
                        <div className="space-y-2">
                            <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" className="w-full justify-between">
                                        <span>
                                            {normalizedDueDate
                                                ? format(normalizedDueDate, "LLLL yyyy")
                                                : "Pick a month"}
                                        </span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-[260px]">
                                    <div className="grid grid-cols-3 gap-2">
                                        {Array.from({ length: 12 }, (_, idx) => {
                                            const label = format(new Date(2020, idx, 1), "LLL");
                                            return (
                                                <Button
                                                    key={label}
                                                    type="button"
                                                    variant={normalizedDueDate?.getMonth() === idx ? "default" : "ghost"}
                                                    className="h-9"
                                                    onClick={() => handleMonthSelect(idx)}
                                                >
                                                    {label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Tabs
                                value={String(normalizedDueDate?.getFullYear() ?? new Date().getFullYear())}
                                onValueChange={(value) => handleYearSelect(parseInt(value, 10))}
                            >
                                <TabsList className="grid grid-cols-4">
                                    {yearOptions.map((year) => (
                                        <TabsTrigger key={year} value={String(year)}>
                                            {year}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    )}

                    {dueDatePrecision === "year" && (
                        <div className="grid grid-cols-4 gap-2">
                            {yearOptions.map((year) => (
                                <Button
                                    key={year}
                                    type="button"
                                    variant={normalizedDueDate?.getFullYear() === year ? "default" : "outline"}
                                    onClick={() => handleYearSelect(year)}
                                >
                                    {year}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-2">
                <Label>Deadline</Label>
                <div className="grid grid-cols-2 gap-2">
                    <DatePicker date={deadline} setDate={(d) => {
                        if (d) {
                            const existingHours = deadline?.getHours();
                            const existingMinutes = deadline?.getMinutes();
                            if (existingHours !== undefined && existingMinutes !== undefined &&
                                !(existingHours === 0 && existingMinutes === 0)) {
                                d.setHours(existingHours, existingMinutes, 0, 0);
                            }
                        }
                        setDeadline(d);
                    }} />
                    <TimePicker
                        time={deadline && (deadline.getHours() !== 0 || deadline.getMinutes() !== 0)
                            ? `${deadline.getHours().toString().padStart(2, "0")}:${deadline.getMinutes().toString().padStart(2, "0")}`
                            : undefined}
                        setTime={(t) => {
                            if (t && deadline) {
                                const [hours, minutes] = t.split(":").map(Number);
                                const newDate = new Date(deadline);
                                newDate.setHours(hours, minutes, 0, 0);
                                setDeadline(newDate);
                            } else if (!t && deadline) {
                                const newDate = new Date(deadline);
                                newDate.setHours(0, 0, 0, 0);
                                setDeadline(newDate);
                            }
                        }}
                        placeholder="Time"
                        disabled={!deadline}
                    />
                </div>
            </div>
        </div>
    );
}
