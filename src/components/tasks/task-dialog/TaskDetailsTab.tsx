"use client";

import { useMemo, useState, createElement } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, Sparkles, ChevronDown } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AiBreakdownDialog } from "../AiBreakdownDialog";
import { ParsedSubtask } from "@/lib/smart-scheduler";

import { getListIcon, getLabelIcon } from "@/lib/icons";
import { Smile } from "lucide-react";
import { TimeEstimateInput } from "../TimeEstimateInput";
import { IconPicker } from "@/components/ui/icon-picker";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { LabelSelector } from "./LabelSelector";
import { formatDuePeriod, getDueRange, normalizeDueAnchor, type DuePrecision } from "@/lib/due-utils";
import { useUser } from "@/components/providers/UserProvider";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Types
type ListType = { id: number; name: string; color: string | null; icon: string | null; };
type LabelType = { id: number; name: string; color: string | null; icon: string | null; };
type SubtaskType = { id: number; title: string; isCompleted: boolean | null; };
type ReminderType = { id: number; remindAt: Date; };

interface TaskDetailsTabProps {
    isEdit: boolean;
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    icon: string | null;
    setIcon: (v: string | null) => void;
    listId: string;
    setListId: (v: string) => void;
    lists: ListType[];
    priority: "none" | "low" | "medium" | "high";
    setPriority: (v: "none" | "low" | "medium" | "high") => void;
    energyLevel: "high" | "medium" | "low" | "none";
    setEnergyLevel: (v: "high" | "medium" | "low" | "none") => void;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none";
    setContext: (v: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none") => void;
    dueDate: Date | undefined;
    setDueDate: (v: Date | undefined) => void;
    dueDatePrecision: DuePrecision;
    setDueDatePrecision: (v: DuePrecision) => void;
    deadline: Date | undefined;
    setDeadline: (v: Date | undefined) => void;
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    recurringRule: string;
    setRecurringRule: (v: string) => void;
    isHabit: boolean;
    setIsHabit: (v: boolean) => void;
    // Subtasks
    subtasks: SubtaskType[];
    newSubtask: string;
    setNewSubtask: (v: string) => void;
    handleAddSubtask: () => void;
    handleToggleSubtask: (id: number, checked: boolean) => void;
    handleDeleteSubtask: (id: number) => void;
    onAiConfirm: (subtasks: ParsedSubtask[]) => void;
    // Labels
    labels: LabelType[];
    selectedLabelIds: number[];
    toggleLabel: (id: number) => void;
    // Reminders
    reminders: ReminderType[];
    newReminderDate: Date | undefined;
    setNewReminderDate: (v: Date | undefined) => void;
    handleAddReminder: (date?: Date) => void;
    handleDeleteReminder: (id: number) => void;
    // Time Estimate
    estimateMinutes: number | null;
    setEstimateMinutes: (v: number | null) => void;
    // Form submission
    handleSubmit: (e: React.FormEvent) => void;
    userId?: string;
}

export function TaskDetailsTab({
    isEdit,
    title, setTitle,
    description, setDescription,
    icon, setIcon,
    listId, setListId, lists,
    priority, setPriority,
    energyLevel, setEnergyLevel,
    context, setContext,
    dueDate, setDueDate,
    dueDatePrecision, setDueDatePrecision,
    deadline, setDeadline,
    isRecurring, setIsRecurring,
    recurringRule, setRecurringRule,
    isHabit, setIsHabit,
    subtasks, newSubtask, setNewSubtask, handleAddSubtask, handleToggleSubtask, handleDeleteSubtask, onAiConfirm,
    labels, selectedLabelIds, toggleLabel,
    reminders, newReminderDate, setNewReminderDate, handleAddReminder, handleDeleteReminder,
    estimateMinutes, setEstimateMinutes,
    handleSubmit,
    userId // Missing in destructuring
}: TaskDetailsTabProps) {
    const [aiBreakdownOpen, setAiBreakdownOpen] = useState(false);
    const { weekStartsOnMonday } = useUser();
    const weekStartsOn = weekStartsOnMonday ? 1 : 0;
    const [precisionMenuOpen, setPrecisionMenuOpen] = useState(false);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);

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

    const reminderRange = useMemo(() => {
        if (!dueDate || dueDatePrecision === "day") return null;
        return getDueRange(dueDate, dueDatePrecision, weekStartsOnMonday ?? false);
    }, [dueDate, dueDatePrecision, weekStartsOnMonday]);

    const effectiveReminderDate = useMemo(() => {
        if (!isEdit || !reminderRange) return newReminderDate;
        if (!newReminderDate) return reminderRange.start;
        const time = newReminderDate.getTime();
        if (time < reminderRange.start.getTime() || time >= reminderRange.endExclusive.getTime()) {
            return reminderRange.start;
        }
        return newReminderDate;
    }, [isEdit, newReminderDate, reminderRange]);

    const reminderDisabled = reminderRange
        ? (date: Date) =>
            date.getTime() < reminderRange.start.getTime()
            || date.getTime() >= reminderRange.endExclusive.getTime()
        : undefined;

    const reminderRangeLabel = reminderRange
        ? `${format(reminderRange.start, "PPP")} – ${format(subDays(reminderRange.endExclusive, 1), "PPP")}`
        : null;
    const reminderToDate = reminderRange
        ? subDays(reminderRange.endExclusive, 1)
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

    // Performance: memoize lookup maps to avoid repeated O(n) finds during render.
    const listById = useMemo(() => {
        return new Map(lists.map((list) => [list.id.toString(), list]));
    }, [lists]);
    const labelById = useMemo(() => {
        return new Map(labels.map((label) => [label.id, label]));
    }, [labels]);

    // List rendering helper to show selected value with icon.
    const selectedList = listById.get(listId);

    return (
        <TabsContent value="details">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Title & Icon</Label>
                    <div className="flex gap-2">
                        <IconPicker
                            value={icon}
                            onChange={setIcon}
                            userId={userId}
                            trigger={
                                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
                                    {icon ? (
                                        <ResolvedIcon icon={icon} className="h-4 w-4" />
                                    ) : (
                                        <Smile className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            }
                        />
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task Title"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="min-h-[100px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>List</Label>
                        <Select value={listId} onValueChange={setListId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select List">
                                    {listId === "inbox" ? (
                                        <div className="flex items-center gap-2">
                                            {createElement(getListIcon("list"), { className: "h-4 w-4" })}
                                            Inbox
                                        </div>
                                    ) : selectedList ? (
                                        <div className="flex items-center gap-2">
                                            {createElement(getListIcon(selectedList.icon), {
                                                style: { color: selectedList.color || 'currentColor' },
                                                className: "h-4 w-4"
                                            })}
                                            {selectedList.name}
                                        </div>
                                    ) : "Select List"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inbox">
                                    <div className="flex items-center gap-2">
                                        {createElement(getListIcon("list"), { className: "h-4 w-4" })}
                                        Inbox
                                    </div>
                                </SelectItem>
                                {lists.map(list => (
                                    <SelectItem key={list.id} value={list.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            {createElement(getListIcon(list.icon), {
                                                style: { color: list.color || 'currentColor' },
                                                className: "h-4 w-4"
                                            })}
                                            {list.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={(value) => setPriority(value as "none" | "low" | "medium" | "high")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Energy Level</Label>
                        <Select value={energyLevel} onValueChange={(value) => setEnergyLevel(value as "high" | "medium" | "low" | "none")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Energy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="high">🔋 High</SelectItem>
                                <SelectItem value="medium">🔌 Medium</SelectItem>
                                <SelectItem value="low">🪫 Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Context</Label>
                        <Select value={context} onValueChange={(value) => setContext(value as "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Context" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="computer">💻 Computer</SelectItem>
                                <SelectItem value="phone">📱 Phone</SelectItem>
                                <SelectItem value="errands">🏃 Errands</SelectItem>
                                <SelectItem value="meeting">👥 Meeting</SelectItem>
                                <SelectItem value="home">🏠 Home</SelectItem>
                                <SelectItem value="anywhere">🌍 Anywhere</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Time Estimate Section */}
                <div className="space-y-2">
                    <Label>Time Estimate</Label>
                    <TimeEstimateInput
                        value={estimateMinutes}
                        onChange={setEstimateMinutes}
                    />
                </div>

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
                                            // Preserve existing time when changing date (only if time was explicitly set)
                                            const existingHours = dueDate?.getHours();
                                            const existingMinutes = dueDate?.getMinutes();
                                            // Only preserve time if it's not midnight (indicating time was set)
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
                                                // Clear time - keep date but reset to midnight
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
                                    // Preserve existing time when changing date (only if time was explicitly set)
                                    const existingHours = deadline?.getHours();
                                    const existingMinutes = deadline?.getMinutes();
                                    // Only preserve time if it's not midnight (indicating time was set)
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
                                        // Clear time - keep date but reset to midnight
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

                <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <Checkbox
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={(checked) => setIsRecurring(!!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor="recurring"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Recurring Task
                        </Label>
                    </div>
                    {isRecurring && (
                        <Select value={recurringRule} onValueChange={setRecurringRule}>
                            <SelectTrigger className="w-[180px] ml-auto h-8">
                                <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREQ=DAILY">Daily</SelectItem>
                                <SelectItem value="FREQ=WEEKLY">Weekly</SelectItem>
                                <SelectItem value="FREQ=MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {isRecurring && (
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-blue-500/5">
                        <Checkbox
                            id="habit"
                            checked={isHabit}
                            onCheckedChange={(checked) => setIsHabit(!!checked)}
                        />
                        <div className="grid gap-1.5 leading-none flex-1">
                            <Label
                                htmlFor="habit"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                🔥 Track as Habit
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Build streaks and see completion heatmap
                            </p>
                        </div>
                    </div>
                )}

                {isEdit && (
                    <div className="space-y-2">
                        <Label>Subtasks</Label>
                        <div className="space-y-2">
                            {subtasks.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 group">
                                    <Checkbox
                                        checked={sub.isCompleted || false}
                                        onCheckedChange={(c) => handleToggleSubtask(sub.id, !!c)}
                                        aria-label={`Mark subtask ${sub.title} as ${sub.isCompleted ? "incomplete" : "complete"}`}
                                    />
                                    <span className={cn("flex-1 text-sm", sub.isCompleted && "line-through text-muted-foreground")}>
                                        {sub.title}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                        onClick={() => handleDeleteSubtask(sub.id)}
                                        aria-label={`Delete subtask ${sub.title}`}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    placeholder="Add a subtask..."
                                    className="h-8 text-sm"
                                    aria-label="New subtask title"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSubtask();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleAddSubtask}
                                    aria-label="Add subtask"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                                    onClick={() => setAiBreakdownOpen(true)}
                                >
                                    <Sparkles className="mr-2 h-3 w-3" />
                                    Break Down with AI
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <AiBreakdownDialog
                    open={aiBreakdownOpen}
                    onOpenChange={setAiBreakdownOpen}
                    taskTitle={title}
                    onConfirm={(subs) => {
                        onAiConfirm(subs);
                        setAiBreakdownOpen(false);
                    }}
                />

                <div className="space-y-2">
                    <Label>Labels</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLabelIds.map((id) => {
                            const label = labelById.get(id);
                            if (!label) return null;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => toggleLabel(id)}
                                    className={cn(
                                        badgeVariants({ variant: "secondary" }),
                                        "cursor-pointer hover:!bg-destructive hover:!text-destructive-foreground select-none"
                                    )}
                                    style={{ backgroundColor: (label.color || '#000000') + '20', color: label.color || '#000000' }}
                                    aria-label={`Remove label ${label.name}`}
                                >
                                    {createElement(getLabelIcon(label.icon), { className: "h-3 w-3 mr-1" })}
                                    {label.name}
                                    <X className="ml-1 h-3 w-3" />
                                </button>
                            );
                        })}
                    </div>
                    <LabelSelector
                        labels={labels}
                        selectedLabelIds={selectedLabelIds}
                        onToggle={toggleLabel}
                    />
                </div>

                {isEdit && (
                    <div className="space-y-2 border-t pt-4 mt-4">
                        <Label>Reminders</Label>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                                <DatePicker
                                    date={effectiveReminderDate}
                                    setDate={setNewReminderDate}
                                    disabled={reminderDisabled}
                                    fromDate={reminderRange?.start}
                                    toDate={reminderToDate}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={() => handleAddReminder(effectiveReminderDate)}
                                size="sm"
                                disabled={!effectiveReminderDate}
                                aria-label="Add reminder"
                            >
                                Add reminder
                            </Button>
                        </div>
                        {reminderRangeLabel && (
                            <p className="text-xs text-muted-foreground">
                                Choose a date within {reminderRangeLabel}. Default is the first day of the period.
                            </p>
                        )}
                        <div className="space-y-2">
                            {reminders.map(reminder => (
                                <div key={reminder.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                                    <span>{format(reminder.remindAt, "PPP p")}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteReminder(reminder.id)}
                                        className="h-6 w-6"
                                        aria-label={`Delete reminder for ${format(reminder.remindAt, "PPP p")}`}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {reminders.length === 0 && <p className="text-sm text-muted-foreground">No reminders set.</p>}
                        </div>
                    </div>
                )}
            </form>
        </TabsContent>
    );
}
