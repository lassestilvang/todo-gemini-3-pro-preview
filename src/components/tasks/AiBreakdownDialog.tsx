"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { generateSubtasks, ParsedSubtask } from "@/lib/smart-scheduler";
import { Loader2, Sparkles } from "lucide-react";

interface AiBreakdownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskTitle: string;
    onConfirm: (subtasks: ParsedSubtask[]) => void;
}

export function AiBreakdownDialog({ open, onOpenChange, taskTitle, onConfirm }: AiBreakdownDialogProps) {
    const [suggestions, setSuggestions] = useState<ParsedSubtask[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loadingState, setLoadingState] = useState<string>("");

    // Track if we should be loading based on open state and taskTitle
    const shouldLoad = open && taskTitle;
    const loadingKey = shouldLoad ? taskTitle : "";
    const isLoading = shouldLoad && loadingState !== loadingKey && suggestions.length === 0;

    // Generate AI suggestions when dialog opens
    useEffect(() => {
        let isMounted = true;

        if (shouldLoad && loadingState !== loadingKey) {
            generateSubtasks(taskTitle)
                .then(subs => {
                    if (isMounted) {
                        setSuggestions(subs);
                        // Select all by default
                        setSelected(new Set(subs.map((_, i) => i)));
                        setLoadingState(loadingKey);
                    }
                })
                .catch(err => {
                    console.error("Failed to generate subtasks:", err);
                    if (isMounted) {
                        setLoadingState(loadingKey); // Mark as loaded even if failed
                    }
                });
        }

        // Clean up when dialog closes
        if (!open) {
            setSuggestions([]);
        }

        return () => {
            isMounted = false;
        };
    }, [shouldLoad, loadingKey, loadingState, open, taskTitle]); // Added dependencies

    const handleToggle = (index: number) => {
        const newSelected = new Set(selected);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelected(newSelected);
    };

    const handleConfirm = () => {
        const selectedSubtasks = suggestions.filter((_, i) => selected.has(i));
        onConfirm(selectedSubtasks);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        AI Task Breakdown
                    </DialogTitle>
                    <DialogDescription>
                        Suggested subtasks for &quot;{taskTitle}&quot;
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            <p className="text-sm text-muted-foreground">Generating subtasks...</p>
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
                                <span>Select subtasks to add:</span>
                                <div>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 mr-4"
                                        onClick={() => setSelected(new Set(suggestions.map((_, i) => i)))}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0"
                                        onClick={() => setSelected(new Set())}
                                    >
                                        Deselect All
                                    </Button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {suggestions.map((sub, i) => (
                                    <div key={i} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                                        <Checkbox
                                            id={`sub-${i}`}
                                            checked={selected.has(i)}
                                            onCheckedChange={() => handleToggle(i)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <label
                                                htmlFor={`sub-${i}`}
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                {sub.title}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Est: {sub.estimateMinutes} min
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No suggestions generated. Try a more specific task title.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selected.size === 0 || !!isLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Add {selected.size} Subtasks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
