"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import { useMemo, useCallback } from "react";
import { getTask } from "@/lib/actions";
import { isSuccess } from "@/lib/action-result";
import dynamic from "next/dynamic";
const TaskDialog = dynamic(() => import("./TaskDialog").then(mod => mod.TaskDialog), { ssr: false });
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

type TaskType = {
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    dueDatePrecision?: "day" | "week" | "month" | "year" | null;
    deadline: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null; icon: string | null }>;
};

interface TaskEditModalWrapperProps {
    userId: string;
}

function TaskEditModalWrapperContent({ userId }: TaskEditModalWrapperProps) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const searchParams = useMemo(() => new URLSearchParams(search), [search]);
    const taskIdParam = searchParams.get("taskId");
    const createParam = searchParams.get("create");
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

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

    const taskId = useMemo(() => {
        if (!taskIdParam) return null;
        const parsed = Number.parseInt(taskIdParam, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }, [taskIdParam]);

    const { data: task, isLoading } = useQuery({
        queryKey: ["task-dialog", userId, taskId],
        enabled: taskId !== null,
        queryFn: async () => {
            if (taskId === null) return null;
            const result = await getTask(taskId, userId);
            if (isSuccess(result) && result.data) {
                return result.data as unknown as TaskType;
            }
            return null;
        },
    });

    const isOpen = createParam === "true" || taskId !== null;

    if (!isOpen) return null;
    if (taskId !== null && !isLoading && !task) return null;

    return (
        <TaskDialog
            task={task || undefined}
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
            defaultListId={defaultListId}
            defaultLabelIds={defaultLabelIds}
        />
    );
}

export function TaskEditModalWrapper(props: TaskEditModalWrapperProps) {
    return (
        <Suspense fallback={null}>
            <TaskEditModalWrapperContent {...props} />
        </Suspense>
    );
}
