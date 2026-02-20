
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSubtasksSectionProps {
    isEdit: boolean;
    subtasks: Array<{ id: number; title: string; isCompleted: boolean | null; }>;
    newSubtask: string;
    setNewSubtask: (v: string) => void;
    handleAddSubtask: () => void;
    handleToggleSubtask: (id: number, checked: boolean) => void;
    handleDeleteSubtask: (id: number) => void;
    setAiBreakdownOpen: (v: boolean) => void;
}

export function TaskSubtasksSection({
    isEdit,
    subtasks, newSubtask, setNewSubtask, handleAddSubtask, handleToggleSubtask, handleDeleteSubtask,
    setAiBreakdownOpen
}: TaskSubtasksSectionProps) {
    if (!isEdit) return null;

    return (
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
    );
}
