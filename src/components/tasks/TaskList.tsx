"use client";

import { TaskItem, Task } from "./TaskItem";
import { TaskDialog } from "./TaskDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TaskListProps {
    tasks: Task[];
    title?: string;
    listId?: number;
    labelId?: number;
}

export function TaskList({ tasks, title, listId, labelId }: TaskListProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingTask(null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                <Button onClick={handleAdd} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border rounded-lg border-dashed">
                    <p>No tasks found</p>
                    <Button variant="link" onClick={handleAdd}>Create one?</Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div key={task.id} onClick={() => handleEdit(task)} className="cursor-pointer">
                            <TaskItem task={task} />
                        </div>
                    ))}
                </div>
            )}

            <TaskDialog
                task={editingTask ?? undefined}
                defaultListId={listId}
                defaultLabelIds={labelId ? [labelId] : undefined}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingTask(null);
                }}
            />
        </div>
    );
}
