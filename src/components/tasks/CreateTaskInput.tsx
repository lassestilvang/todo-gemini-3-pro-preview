"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Flag, Zap, MapPin, Smile, X } from "lucide-react";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { createTask } from "@/lib/actions";
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


export function CreateTaskInput({ listId, defaultDueDate, userId, defaultLabelIds }: { listId?: number, defaultDueDate?: Date | string, userId: string, defaultLabelIds?: number[] }) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        defaultDueDate ? new Date(defaultDueDate) : undefined
    );
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">("none");
    const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | undefined>(undefined);
    const [context, setContext] = useState<"computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [icon, setIcon] = useState<string | undefined>(undefined);

    // Parse natural language input - intentionally only depends on title
    useEffect(() => {
        if (title.trim()) {
            const parsed = parseNaturalLanguage(title);
            if (parsed.priority && priority === "none") setPriority(parsed.priority);
            if (parsed.dueDate && !dueDate) setDueDate(parsed.dueDate);
            if (parsed.energyLevel && !energyLevel) setEnergyLevel(parsed.energyLevel);
            if (parsed.context && !context) setContext(parsed.context);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title]);

    const handleAiEnhance = async () => {
        if (!title.trim()) return;
        setIsAiLoading(true);
        try {
            const result = await extractDeadline(title);
            if (result?.date) {
                setDueDate(result.date);
                toast.success(`Deadline detected: ${format(result.date, "MMM d")}`);
            } else {
                toast.info("No deadline found in text.");
            }
        } catch {
            toast.error("Failed to extract deadline. Check API key.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim()) return;

        // Parse again for final submission to get clean title
        const parsed = parseNaturalLanguage(title);

        if (!userId) {
            toast.error("Unable to create task: missing user ID");
            return;
        }
        await createTask({
            userId,
            title: parsed.title || title,
            listId: listId || null,
            priority: priority !== "none" ? priority : (parsed.priority || "none"),
            energyLevel: energyLevel || parsed.energyLevel || null,
            context: context || parsed.context || null,
            dueDate: dueDate || parsed.dueDate || null,
            labelIds: defaultLabelIds,
            icon: icon || null,
        });

        setTitle("");
        setDueDate(defaultDueDate ? new Date(defaultDueDate) : undefined);
        setPriority("none");
        setEnergyLevel(undefined);
        setContext(undefined);
        setIcon(undefined);
        setIsExpanded(false);
    };

    const handleFullDetails = () => {
        setIsDialogOpen(true);
        // We don't clear the input here, we wait for the dialog to handle it or user to cancel
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
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder="Add a task... (try 'Buy milk tomorrow !high @errands')"
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-lg py-6"
                        data-testid="task-input"
                        aria-label="Create new task"
                    />

                    {/* Preview Badges */}
                    {title.trim() && (priority !== "none" || dueDate || energyLevel || context) && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {priority !== "none" && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Flag className="h-3 w-3" />
                                    {priority}
                                </Badge>
                            )}
                            {dueDate && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(dueDate, "MMM d")}
                                </Badge>
                            )}
                            {energyLevel && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Zap className="h-3 w-3" />
                                    {energyLevel}
                                </Badge>
                            )}
                            {context && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {context}
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
                                            {dueDate ? format(dueDate, "MMM d") : "Due Date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={(date) => {
                                                setDueDate(date);
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
                                    setTitle(prev => prev ? `${prev} ${text}` : text);
                                    setIsExpanded(true);
                                }} />
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
                                <Button type="submit" size="sm" disabled={!title.trim() || !userId} data-testid="add-task-button">
                                    Add Task
                                </Button>
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
