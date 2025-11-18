"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateTask, deleteTask, getTasks, getTask } from "@/lib/actions";
// I need a way to fetch a single task. I'll add getTask to actions.
// For now I'll assume I can pass the task or fetch it.

export function TaskDetailSheet() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get("taskId");
    const [isOpen, setIsOpen] = useState(false);
    const [task, setTask] = useState<any>(null); // TODO: Type
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (taskId) {
            setIsOpen(true);
            setIsLoading(true);
            getTask(Number(taskId)).then((t) => {
                setTask(t);
                setIsLoading(false);
            });
        } else {
            setIsOpen(false);
            setTask(null);
        }
    }, [taskId]);

    const handleClose = () => {
        setIsOpen(false);
        const params = new URLSearchParams(searchParams);
        params.delete("taskId");
        router.push(`?${params.toString()}`);
    };

    const handleSave = async () => {
        if (!task) return;
        await updateTask(task.id, {
            title: task.title,
            description: task.description,
            // TODO: Add other fields
        });
        handleClose();
    };

    const handleDelete = async () => {
        if (!task) return;
        if (confirm("Are you sure you want to delete this task?")) {
            await deleteTask(task.id);
            handleClose();
        }
    };

    if (!taskId) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Task Details</SheetTitle>
                </SheetHeader>
                {isLoading ? (
                    <div className="py-10 text-center">Loading...</div>
                ) : task ? (
                    <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={task.title}
                                onChange={(e) => setTask({ ...task, title: e.target.value })}
                                placeholder="Task title"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                value={task.description || ""}
                                onChange={(e) => setTask({ ...task, description: e.target.value })}
                                placeholder="Add a description..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="destructive" size="sm" onClick={handleDelete}>Delete Task</Button>
                            <Button size="sm" onClick={handleSave}>Save Changes</Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center">Task not found</div>
                )}
            </SheetContent>
        </Sheet>
    );
}
