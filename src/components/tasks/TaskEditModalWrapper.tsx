"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
    deadline: Date | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

export function TaskEditModalWrapper() {
    const searchParams = useSearchParams();
    const taskIdParam = searchParams.get("taskId");
    const router = useRouter();
    const [task, setTask] = useState<TaskType | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("taskId");
        router.push(`?${params.toString()}`);
    }, [searchParams, router]);

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsOpen(false);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTask(null);
        }
    }, [taskIdParam, handleClose]);

    if (!task || !isOpen) return null;

    return (
        <TaskDialog
            task={task}
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
        />
    );
}
