"use client";

import { useContext, useMemo, useState } from "react";
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
import { QueryClient, QueryClientContext, QueryClientProvider, useQuery } from "@tanstack/react-query";

interface AiBreakdownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskTitle: string;
    onConfirm: (subtasks: ParsedSubtask[]) => void;
}

function AiBreakdownDialogContent({ open, onOpenChange, taskTitle, onConfirm }: AiBreakdownDialogProps) {
    const [excluded, setExcluded] = useState<Set<number>>(new Set());
    const shouldLoad = open && !!taskTitle.trim();
    const suggestionsQuery = useQuery<ParsedSubtask[]>({
        queryKey: ["ai-breakdown", taskTitle],
        enabled: shouldLoad,
        queryFn: async () => {
            const subtasks = await generateSubtasks(taskTitle);
            return subtasks;
        },
    });
    const suggestions = shouldLoad ? (suggestionsQuery.data ?? []) : [];
    const isLoading = shouldLoad && suggestionsQuery.isLoading;
    const selectedCount = useMemo(
        () => suggestions.reduce((count, _, i) => (excluded.has(i) ? count : count + 1), 0),
        [excluded, suggestions]
    );

    const handleToggle = (index: number) => {
        const newExcluded = new Set(excluded);
        if (newExcluded.has(index)) {
            newExcluded.delete(index);
        } else {
            newExcluded.add(index);
        }
        setExcluded(newExcluded);
    };

    const handleConfirm = () => {
        const selectedSubtasks = suggestions.filter((_, i) => !excluded.has(i));
        onConfirm(selectedSubtasks);
    };

    const handleDialogOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setExcluded(new Set());
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
                                        onClick={() => setExcluded(new Set())}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0"
                                        onClick={() => setExcluded(new Set(suggestions.map((_, i) => i)))}
                                    >
                                        Deselect All
                                    </Button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {suggestions.map((sub, i) => (
                                    <div key={`${sub.title}-${sub.estimateMinutes}`} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                                        <Checkbox
                                            id={`sub-${i}`}
                                            checked={!excluded.has(i)}
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
                        disabled={selectedCount === 0 || !!isLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Add {selectedCount} Subtasks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AiBreakdownDialog(props: AiBreakdownDialogProps) {
    const existingQueryClient = useContext(QueryClientContext);
    const [fallbackQueryClient] = useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
    );

    if (existingQueryClient) {
        return <AiBreakdownDialogContent {...props} />;
    }

    return (
        <QueryClientProvider client={fallbackQueryClient}>
            <AiBreakdownDialogContent {...props} />
        </QueryClientProvider>
    );
}
