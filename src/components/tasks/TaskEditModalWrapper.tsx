"use client";

import { useSearchParams, useRouter, usePathname, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getTask } from "@/lib/actions";
import dynamic from "next/dynamic";
const TaskDialog = dynamic(() => import("./TaskDialog").then(mod => mod.TaskDialog), { ssr: false });
import { Suspense } from "react";

type TaskType = {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    deadline: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

interface TaskEditModalWrapperProps {
    userId: string;
}

export function TaskEditModalWrapper({ userId }: TaskEditModalWrapperProps) {
    const searchParams = useSearchParams();
    const taskIdParam = searchParams.get("taskId");
    const createParam = searchParams.get("create");
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const [task, setTask] = useState<TaskType | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Determine default list/label from URL
    let defaultListId: number | undefined = undefined;
    let defaultLabelIds: number[] | undefined = undefined;

    if (pathname.startsWith("/lists/") && params.id) {
        const id = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
        if (!isNaN(id)) defaultListId = id;
    } else if (pathname.startsWith("/labels/") && params.id) {
        const id = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
        if (!isNaN(id)) defaultLabelIds = [id];
    } else if (pathname === "/inbox") {
        // Inbox doesn't have an ID usually, but if we map it to listId=null or similar.
        // If we want "Inbox" selected, we usually don't need to pass defaultListId as it defaults to inbox.
        // But if we want to be explicit:
        // defaultListId = undefined; // defaults to 'inbox' string in useTaskForm
    }

    const handleClose = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("taskId");
        params.delete("create");
        router.push(`${pathname}?${params.toString()}`);
    }, [searchParams, router, pathname]);

    useEffect(() => {
        if (taskIdParam) {
            const taskId = parseInt(taskIdParam);
            if (!isNaN(taskId)) {
                getTask(taskId, userId).then((t) => {
                    if (t) {
                        setTask(t as unknown as TaskType);
                        setIsOpen(true);
                    } else {
                        handleClose();
                    }
                });
            }
        } else if (createParam === "true") {
            setTask(null);
            setIsOpen(true);
        } else {
            setTask(null);
            setIsOpen(false);
        }
    }, [taskIdParam, createParam, handleClose, userId]);

    if (!isOpen) return null;

    return (
        <Suspense fallback={null}>
            <TaskDialog
                task={task || undefined}
                open={isOpen}
                onOpenChange={(open) => !open && handleClose()}
                defaultListId={defaultListId}
                defaultLabelIds={defaultLabelIds}
            />
        </Suspense>
    );
}
