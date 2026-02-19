"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { rescheduleOverdueTasks, RescheduleSuggestion } from "@/lib/ai-actions";
import { applyScheduleSuggestion } from "@/lib/smart-scheduler";
import { formatDuePeriod, type DuePrecision } from "@/lib/due-utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function RescheduleButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<RescheduleSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const handleCheck = async () => {
        setIsLoading(true);
        const result = await rescheduleOverdueTasks().catch((error) => {
            console.error(error);
            toast.error("Failed to check schedule.");
            return null;
        });

        if (result) {
            if (result.length > 0) {
                setSuggestions(result);
                setIsOpen(true);
            } else {
                toast.info("No overdue tasks found or AI couldn't help.");
            }
        }

            setIsLoading(false);
    };

    const handleApply = async () => {
        setIsLoading(true);
        const applyResult = await suggestions.reduce<Promise<boolean>>(async (accPromise, suggestion) => {
            const acc = await accPromise;
            if (!acc) return false;

            const ok = await applyScheduleSuggestion(
                suggestion.taskId,
                new Date(suggestion.suggestedDate),
                suggestion.dueDatePrecision ?? null
            )
                .then(() => true)
                .catch((error) => {
                    console.error(error);
                    return false;
                });

            return ok;
        }, Promise.resolve(true));

        if (applyResult) {
            toast.success(`Rescheduled ${suggestions.length} tasks!`);
            setIsOpen(false);
        } else {
            toast.error("Failed to apply changes.");
        }

        setIsLoading(false);
    };

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                            onClick={handleCheck}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CalendarClock className="mr-2 h-4 w-4" />
                            )}
                            I&apos;m Behind!
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Catch up on overdue tasks</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reschedule Overdue Tasks</DialogTitle>
                        <DialogDescription>
                            AI found {suggestions.length} overdue tasks and suggests the following schedule:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 my-4 max-h-[60vh] overflow-y-auto">
                        {suggestions.map((s) => (
                            <div key={s.taskId} className="flex justify-between items-center p-3 border rounded-md bg-muted/50">
                                <div>
                                    <div className="font-medium">{s.taskTitle}</div>
                                    <div className="text-xs text-muted-foreground">{s.reason}</div>
                                </div>
                                <div className="text-sm font-bold text-primary">
                                    {s.dueDatePrecision && s.dueDatePrecision !== "day"
                                        ? formatDuePeriod({
                                            dueDate: new Date(s.suggestedDate),
                                            dueDatePrecision: s.dueDatePrecision as DuePrecision,
                                        })
                                        : format(new Date(s.suggestedDate), "MMM d")}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleApply} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Apply New Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
