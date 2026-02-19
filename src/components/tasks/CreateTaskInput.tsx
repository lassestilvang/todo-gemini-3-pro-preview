"use client";

import { useRef, useReducer } from "react";
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

// --- Reducer definition ---
type State = {
    title: string;
    dueDate: Date | undefined;
    dueDatePrecision: "day" | "week" | "month" | "year";
    dueDateSource: "default" | "nlp" | "manual" | "none";
    priority: "none" | "low" | "medium" | "high";
    energyLevel: "high" | "medium" | "low" | undefined;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined;
    isExpanded: boolean;
    isAiLoading: boolean;
    isSubmitting: boolean;
    isDialogOpen: boolean;
    isCalendarOpen: boolean;
    isPriorityOpen: boolean;
    icon: string | undefined;
};

type Action =
    | { type: "SET_TITLE"; payload: string; parsed?: ReturnType<typeof parseNaturalLanguage> }
    | { type: "SET_DUE_DATE"; payload: { date?: Date; source: "default" | "nlp" | "manual" | "none"; precision?: "day" | "week" | "month" | "year" } }
    | { type: "SET_PRIORITY"; payload: "none" | "low" | "medium" | "high" }
    | { type: "SET_ENERGY_LEVEL"; payload: "high" | "medium" | "low" | undefined }
    | { type: "SET_CONTEXT"; payload: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined }
    | { type: "SET_UI_STATE"; payload: Partial<Pick<State, "isExpanded" | "isAiLoading" | "isSubmitting" | "isDialogOpen" | "isCalendarOpen" | "isPriorityOpen">> }
    | { type: "SET_ICON"; payload: string | undefined }
    | { type: "RESET"; payload?: { defaultDueDate?: Date | string } };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_TITLE": {
            const updates: Partial<State> = { title: action.payload };
            if (action.parsed && action.payload.trim()) {
                const { priority, dueDate, dueDatePrecision, energyLevel, context } = action.parsed;
                if (priority && state.priority === "none") updates.priority = priority;
                if (dueDate && state.dueDateSource !== "manual") {
                    updates.dueDate = dueDate;
                    updates.dueDatePrecision = dueDatePrecision ?? "day";
                    updates.dueDateSource = "nlp";
                }
                if (energyLevel && !state.energyLevel) updates.energyLevel = energyLevel;
                if (context && !state.context) updates.context = context;
            }
            return { ...state, ...updates };
        }
        case "SET_DUE_DATE":
            return {
                ...state,
                dueDate: action.payload.date,
                dueDateSource: action.payload.source,
                dueDatePrecision: action.payload.precision ?? state.dueDatePrecision,
            };
        case "SET_PRIORITY":
            return { ...state, priority: action.payload };
        case "SET_ENERGY_LEVEL":
            return { ...state, energyLevel: action.payload };
        case "SET_CONTEXT":
            return { ...state, context: action.payload };
        case "SET_UI_STATE":
            return { ...state, ...action.payload };
        case "SET_ICON":
            return { ...state, icon: action.payload };
        case "RESET": {
            const defaultDueDate = action.payload?.defaultDueDate ? new Date(action.payload.defaultDueDate) : undefined;
            return {
                ...state,
                title: "",
                dueDate: defaultDueDate,
                dueDateSource: defaultDueDate ? "default" : "none",
                dueDatePrecision: "day",
                priority: "none",
                energyLevel: undefined,
                context: undefined,
                icon: undefined,
                isExpanded: false,
                isSubmitting: false,
            };
        }
        default:
            return state;
    }
}

export function CreateTaskInput({ listId, defaultDueDate, userId, defaultLabelIds }: { listId?: number, defaultDueDate?: Date | string, userId: string, defaultLabelIds?: number[] }) {
    const { dispatch } = useSync();
    const { weekStartsOnMonday } = useUser();

    const [state, dispatchState] = useReducer(reducer, {
        title: "",
        dueDate: defaultDueDate ? new Date(defaultDueDate) : undefined,
        dueDatePrecision: "day",
        dueDateSource: defaultDueDate ? "default" : "none",
        priority: "none",
        energyLevel: undefined,
        context: undefined,
        isExpanded: false,
        isAiLoading: false,
        isSubmitting: false,
        isDialogOpen: false,
        isCalendarOpen: false,
        isPriorityOpen: false,
        icon: undefined,
    });

    // Destructure for ease of use in render
    const {
        title, dueDate, dueDatePrecision, priority, energyLevel,
        context, isExpanded, isAiLoading, isSubmitting, isDialogOpen,
        isCalendarOpen, isPriorityOpen, icon
    } = state;

    const isClient = useIsClient();
    const inputRef = useRef<HTMLInputElement>(null);

    const updateTitle = (nextTitle: string) => {
        const parsed = nextTitle.trim() ? parseNaturalLanguage(nextTitle, { weekStartsOnMonday: weekStartsOnMonday ?? false }) : undefined;
        dispatchState({ type: "SET_TITLE", payload: nextTitle, parsed });
    };

    const handleAiEnhance = async () => {
        if (!title.trim()) return;
        dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: true } });
        const result = await extractDeadline(title).catch(() => null);
        if (!result) {
            toast.error("Failed to extract deadline. Check API key.");
            dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: false } });
            return;
        }

        if (result.date) {
            dispatchState({ type: "SET_DUE_DATE", payload: { date: result.date, source: "nlp" } });
            toast.success(`Deadline detected: ${format(result.date, "MMM d")}`);
        } else {
            toast.info("No deadline found in text.");
        }

        dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: false } });
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

        dispatchState({ type: "SET_UI_STATE", payload: { isSubmitting: true } });
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

        if (!createResult) {
            toast.error("Failed to create task");
            dispatchState({ type: "SET_UI_STATE", payload: { isSubmitting: false } });
            return;
        }

        dispatchState({ type: "RESET", payload: { defaultDueDate: defaultDueDate as Date | undefined } });
        toast.success("Task created");
    };

    const handleFullDetails = () => {
        dispatchState({ type: "SET_UI_STATE", payload: { isDialogOpen: true } });
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
                            onFocus={() => dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: true } })}
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
                                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_PRIORITY", payload: "none" }); inputRef.current?.focus(); }} label="Remove priority" />
                                </Badge>
                            )}
                            {dueDate && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <Calendar className="h-3 w-3" />
                                    {dueDatePrecision === "day"
                                        ? format(dueDate, "MMM d")
                                        : formatDuePeriod({ dueDate, dueDatePrecision })}
                                    <BadgeRemoveButton onClick={() => {
                                        dispatchState({ type: "SET_DUE_DATE", payload: { date: undefined, source: "none" } });
                                        inputRef.current?.focus();
                                    }} label="Remove due date" />
                                </Badge>
                            )}
                            {energyLevel && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <Zap className="h-3 w-3" />
                                    {energyLevel}
                                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_ENERGY_LEVEL", payload: undefined }); inputRef.current?.focus(); }} label="Remove energy level" />
                                </Badge>
                            )}
                            {context && (
                                <Badge variant="outline" className="text-xs gap-1 pr-1.5">
                                    <MapPin className="h-3 w-3" />
                                    {context}
                                    <BadgeRemoveButton onClick={() => { dispatchState({ type: "SET_CONTEXT", payload: undefined }); inputRef.current?.focus(); }} label="Remove context" />
                                </Badge>
                            )}
                        </div>
                    )}

                    {isExpanded && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20 rounded-b-lg">
                            <div className="flex items-center gap-2">
                                <Popover open={isCalendarOpen} onOpenChange={(open) => dispatchState({ type: "SET_UI_STATE", payload: { isCalendarOpen: open } })}>
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
                                                dispatchState({ type: "SET_DUE_DATE", payload: { date: date || undefined, source: "manual", precision: "day" } });
                                                dispatchState({ type: "SET_UI_STATE", payload: { isCalendarOpen: false } });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover open={isPriorityOpen} onOpenChange={(open) => dispatchState({ type: "SET_UI_STATE", payload: { isPriorityOpen: open } })}>
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
                                                        dispatchState({ type: "SET_PRIORITY", payload: p as Task["priority"] });
                                                        dispatchState({ type: "SET_UI_STATE", payload: { isPriorityOpen: false } });
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
                                    onChange={(i) => dispatchState({ type: "SET_ICON", payload: i })}
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
                                        onClick={() => dispatchState({ type: "SET_ICON", payload: undefined })}
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
                                    dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: true } });
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
                                <Button type="button" variant="ghost" size="sm" onClick={() => dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: false } })}>
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
                    dispatchState({ type: "SET_UI_STATE", payload: { isDialogOpen: open } });
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
