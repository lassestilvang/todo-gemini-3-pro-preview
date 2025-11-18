"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTask } from "@/lib/actions";
import { TaskDialog } from "./TaskDialog";

type TaskType = {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

export function TaskEditModalWrapper() {
    const searchParams = useSearchParams();
    const taskIdParam = searchParams.get("taskId");
    const router = useRouter();
    const [task, setTask] = useState<TaskType | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (taskIdParam) {
            const taskId = parseInt(taskIdParam);
            if (!isNaN(taskId)) {
                getTask(taskId).then((t) => {
                    if (t) {
                        // Ensure the type matches by casting or validating
                        // The getTask return type is mostly compatible, but we need to be careful with nulls
                        setTask(t as unknown as TaskType);
                        setIsOpen(true);
                    } else {
                        handleClose();
                    }
                });
            }
        } else {
            setIsOpen(false);
            setTask(null);
        }
    }, [taskIdParam]);

    const handleClose = () => {
        setIsOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("taskId");
        router.push(`?${params.toString()}`);
    };

    if (!task || !isOpen) return null;

    return (
        <TaskDialog
            task={task}
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
        />
    );
}
