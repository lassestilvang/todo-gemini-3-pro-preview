"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Flag, Zap, MapPin, Smile, X, Keyboard } from "lucide-react";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseNaturalLanguage } from "@/lib/nlp-parser";
import { Badge } from "@/components/ui/badge";
import { extractDeadline } from "@/lib/smart-scheduler";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceInput } from "./VoiceInput";
import { TaskDialog } from "./TaskDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFriendlyDate } from "@/lib/time-utils";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { formatDuePeriod } from "@/lib/due-utils";
import { useIsClient } from "@/hooks/use-is-client";

function BadgeRemoveButton({ onClick, label }: { onClick: () => void, label: string }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
            aria-label={label}
        >
            <X className="h-3 w-3 text-muted-foreground" />
        </button>
    );
}

export function CreateTaskInput({ listId, defaultDueDate, userId, defaultLabelIds }: { listId?: number, defaultDueDate?: Date | string, userId: string, defaultLabelIds?: number[] }) {
    const { dispatch } = useSync();
    const { weekStartsOnMonday } = useUser();
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        defaultDueDate ? new Date(defaultDueDate) : undefined
    );
    const [dueDatePrecision, setDueDatePrecision] = useState<"day" | "week" | "month" | "year">("day");
    const [dueDateSource, setDueDateSource] = useState<"default" | "nlp" | "manual" | "none">(
        defaultDueDate ? "default" : "none"
    );
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">("none");
    const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | undefined>(undefined);
    const [context, setContext] = useState<"computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [icon, setIcon] = useState<string | undefined>(undefined);
    const isClient = useIsClient();
    const inputRef = useRef<HTMLInputElement>(null);

    const updateTitle = (nextTitle: string) => {
        setTitle(nextTitle);
        if (!nextTitle.trim()) return;
        const parsed = parseNaturalLanguage(nextTitle, { weekStartsOnMonday: weekStartsOnMonday ?? false });
        if (parsed.priority && priority === "none") setPriority(parsed.priority);
        if (parsed.dueDate && dueDateSource !== "manual") {
            setDueDate(parsed.dueDate);
            setDueDatePrecision(parsed.dueDatePrecision ?? "day");
            setDueDateSource("nlp");
        }
        if (parsed.energyLevel && !energyLevel) setEnergyLevel(parsed.energyLevel);
        if (parsed.context && !context) setContext(parsed.context);
    };

    const handleAiEnhance = async () => {
        if (!title.trim()) return;
        setIsAiLoading(true);
        const result = await extractDeadline(title).catch(() => null);
        if (!result) {
            toast.error("Failed to extract deadline. Check API key.");
            setIsAiLoading(false);
            return;
        }

        if (result.date) {
            setDueDate(result.date);
            toast.success(`Deadline detected: ${format(result.date, "MMM d")}`);
        } else {
            toast.info("No deadline found in text.");
        }

        setIsAiLoading(false);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim()) return;

        // Parse again for final submission to get clean title
        const parsed = parseNaturalLanguage(title, { weekStartsOnMonday: weekStartsOnMonday ?? false });

        if (!userId) {
            toast.error("Unable to create task: missing user ID");
            return;
        }

        setIsSubmitting(true);
        const createResult = await Promise.resolve()
            .then(() => dispatch('createTask', {
                userId,
                title: parsed.title || title,
                listId: listId || null,
                priority,
                energyLevel: energyLevel || null,
                context: context || null,
                dueDate: dueDate || null,
                dueDatePrecision: dueDate ? dueDatePrecision : null,
                labelIds: defaultLabelIds,
                icon: icon || null,
            }))
            .then(
                () => true,
                (error) => {
                    console.error("Failed to create task:", error);
                    return false;
                }
            );
        setIsSubmitting(false);

        if (!createResult) {
            toast.error("Failed to create task");
            return;
        }

        setTitle("");
        setDueDate(defaultDueDate ? new Date(defaultDueDate) : undefined);
        setDueDateSource(defaultDueDate ? "default" : "none");
        setDueDatePrecision("day");
        setPriority("none");
        setEnergyLevel(undefined);
        setContext(undefined);
        setIcon(undefined);
        setIsExpanded(false);

        // Optional: toast can be handled by the optimistic update logic if desired,
        // but a reassuring message here is fine too.
        toast.success("Task created");
    };

    const handleFullDetails = () => {
        setIsDialogOpen(true);
        // We don't clear the input here, we wait for the dialog to handle it or user to cancel
    };

    const handleClear = () => {
        updateTitle("");
        inputRef.current?.focus();
    };

    const insertSyntax = (text: string) => {
        const trimmed = title.trimEnd();
        updateTitle(trimmed ? `${trimmed} ${text} ` : `${text} `);
        inputRef.current?.focus();
    };

    return (
        <div className="mb-6">
            <div
                className={cn(
                    "relative rounded-lg border bg-background shadow-sm transition-all",
                    isExpanded ? "ring-2 ring-primary" : "hover:border-primary/50"
                )}
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="relative w-full">
                        <Input
                            ref={inputRef}
                            value={title}
                            onChange={(e) => updateTitle(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            onKeyDown={(e) => {
                                if (isSubmitting) return;

                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder="Add a task... (try 'Buy milk tomorrow !high @errands')"
                            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-lg py-6 pr-10"
                            data-testid="task-input"
                            aria-label="Create new task"
                        />
                        {title && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={handleClear}
                                aria-label="Clear task title"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Preview Badges */}
                    {title.trim() && (priority !== "none" || dueDate || energyLevel || context) && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {priority !== "none" && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <Flag className="h-3 w-3" />
                                    {priority}
                                    <BadgeRemoveButton onClick={() => { setPriority("none"); inputRef.current?.focus(); }} label="Remove priority" />
                                </Badge>
                            )}
                            {dueDate && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <Calendar className="h-3 w-3" />
                                    {dueDatePrecision === "day"
                                        ? format(dueDate, "MMM d")
                                        : formatDuePeriod({ dueDate, dueDatePrecision })}
                                    <BadgeRemoveButton onClick={() => {
                                        setDueDate(undefined);
                                        setDueDateSource("none");
                                        inputRef.current?.focus();
                                    }} label="Remove due date" />
                                </Badge>
                            )}
                            {energyLevel && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <Zap className="h-3 w-3" />
                                    {energyLevel}
                                    <BadgeRemoveButton onClick={() => { setEnergyLevel(undefined); inputRef.current?.focus(); }} label="Remove energy level" />
                                </Badge>
                            )}
                            {context && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <MapPin className="h-3 w-3" />
                                    {context}
                                    <BadgeRemoveButton onClick={() => { setContext(undefined); inputRef.current?.focus(); }} label="Remove context" />
                                </Badge>
                            )}
                        </div>
                    )}

                    {isExpanded && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20 rounded-b-lg">
                            <div className="flex items-center gap-2">
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn(dueDate && "text-primary")}>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {dueDate ? (isClient ? formatFriendlyDate(dueDate, "MMM d") : format(dueDate, "MMM d")) : "Due Date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={(date) => {
                                                setDueDate(date);
                                                setDueDateSource("manual");
                                                setIsCalendarOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover open={isPriorityOpen} onOpenChange={setIsPriorityOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn(priority !== "none" && "text-primary")}>
                                            <Flag className="mr-2 h-4 w-4" />
                                            {priority === "none" ? "Priority" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-2">
                                        <div className="grid gap-1">
                                            {["none", "low", "medium", "high"].map((p) => (
                                                <Button
                                                    key={p}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="justify-start"
                                                    onClick={() => {
                                                        setPriority(p as "none" | "low" | "medium" | "high");
                                                        setIsPriorityOpen(false);
                                                    }}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex items-center gap-2">
                                <IconPicker
                                    value={icon}
                                    onChange={setIcon}
                                    userId={userId}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(icon && "text-primary")}
                                        >
                                            {icon ? (
                                                <ResolvedIcon icon={icon} className="mr-2 h-4 w-4" />
                                            ) : (
                                                <Smile className="mr-2 h-4 w-4" />
                                            )}
                                            Icon
                                        </Button>
                                    }
                                />
                                {icon && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIcon(undefined)}
                                        title="Remove icon"
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Remove icon</span>
                                    </Button>
                                )}


                            </div>

                            <div className="flex items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleAiEnhance}
                                            disabled={isAiLoading || !title.trim()}
                                            className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                                        >
                                            {isAiLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                            <span className="ml-2 sr-only">AI Detect</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Auto-detect details from text</p>
                                    </TooltipContent>
                                </Tooltip>
                                <VoiceInput onTranscript={(text) => {
                                    updateTitle(title ? `${title} ${text}` : text);
                                    setIsExpanded(true);
                                }} />
                                <Popover>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    aria-label="Smart syntax guide"
                                                >
                                                    <Keyboard className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Smart Syntax Guide</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="w-80">
                                        <div className="grid gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-medium leading-none">Smart Syntax</h4>
                                                <p className="text-sm text-muted-foreground">Type or click these to quickly set properties.</p>
                                            </div>
                                            <div className="grid gap-2">
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="text-sm font-medium">Priority</span>
                                                    <div className="col-span-2 text-sm font-mono text-muted-foreground flex gap-1">
                                                        {["!high", "!m", "!low"].map(s => (
                                                            <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                                                <button type="button" onClick={() => insertSyntax(s)}>{s}</button>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="text-sm font-medium">Context</span>
                                                    <div className="col-span-2 text-sm font-mono text-muted-foreground flex flex-wrap gap-1">
                                                        {["@work", "@home"].map(s => (
                                                            <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                                                <button type="button" onClick={() => insertSyntax(s)}>{s}</button>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="text-sm font-medium">Date</span>
                                                    <div className="col-span-2 text-sm font-mono text-muted-foreground flex flex-wrap gap-1">
                                                        {["today", "tomorrow", "next fri"].map(s => (
                                                            <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                                                <button type="button" onClick={() => insertSyntax(s)}>{s}</button>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleFullDetails}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Full Details
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                                    Cancel
                                </Button>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {/* Wrap in span to allow tooltip on disabled button */}
                                        <span tabIndex={0} className="inline-block">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={!title.trim() || !userId || isSubmitting}
                                                data-testid="add-task-button"
                                                className="w-full"
                                            >
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Add Task
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Add Task (⌘Enter)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <TaskDialog
                initialTitle={title}
                initialPriority={priority !== "none" ? priority : undefined}
                initialEnergyLevel={energyLevel}
                initialContext={context}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        // Dialog closed
                    } else {
                        // Dialog opened
                    }
                }}
                defaultListId={listId}
                defaultDueDate={dueDate}
                userId={userId}
            />
        </div>
    );
}
