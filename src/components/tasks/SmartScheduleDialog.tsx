"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateSmartSchedule, applyScheduleSuggestion, type ScheduleSuggestion } from "@/lib/smart-scheduler";
import { Loader2, Sparkles, Calendar, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface SmartScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SmartScheduleDialog({ open, onOpenChange }: SmartScheduleDialogProps) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
    const [step, setStep] = useState<"start" | "review">("start");

    const handleGenerate = async () => {
        setLoading(true);
        const results = await generateSmartSchedule().catch(() => null);
        if (!results) {
            toast.error("Failed to generate schedule. Please check your API key.");
            setLoading(false);
            return;
        }

        if (results.length === 0) {
            toast.info("No unscheduled tasks found to schedule!");
            onOpenChange(false);
        } else {
            setSuggestions(results);
            setStep("review");
        }

        setLoading(false);
    };

    const handleApply = async (suggestion: ScheduleSuggestion) => {
        try {
            await applyScheduleSuggestion(suggestion.taskId, suggestion.suggestedDate);
            setSuggestions(prev => prev.filter(s => s.taskId !== suggestion.taskId));
            toast.success("Task scheduled!");

            if (suggestions.length <= 1) {
                onOpenChange(false);
                setStep("start");
            }
        } catch {
            toast.error("Failed to apply schedule.");
        }
    };

    const handleReject = (taskId: number) => {
        setSuggestions(prev => prev.filter(s => s.taskId !== taskId));
        if (suggestions.length <= 1) {
            onOpenChange(false);
            setStep("start");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        AI Smart Scheduling
                    </DialogTitle>
                    <DialogDescription>
                        Let Gemini analyze your unscheduled tasks and propose an optimal schedule.
                    </DialogDescription>
                </DialogHeader>

                {step === "start" ? (
                    <div className="py-8 text-center space-y-4">
                        <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                            <Sparkles className="h-8 w-8 text-purple-500" />
                        </div>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            We&apos;ll look at your unscheduled tasks, priorities, and energy levels to create a balanced plan for the week.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {suggestions.map((suggestion) => (
                            <div key={suggestion.taskId} className="border rounded-lg p-4 space-y-3 bg-card">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">{suggestion.taskTitle}</h4>
                                        <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                                    </div>
                                    <div className="flex items-center text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                        {Math.round(suggestion.confidence * 100)}% match
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center text-sm">
                                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {format(new Date(suggestion.suggestedDate), "EEEE, MMM d 'at' HH:mm")}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReject(suggestion.taskId)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            aria-label="Reject suggestion"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApply(suggestion)}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            <Check className="mr-2 h-4 w-4" />
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    {step === "start" && (
                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing tasks...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Schedule
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
