
import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";
import { ActionType, actionRegistry } from "@/lib/sync/registry";

interface SortableTaskItemProps {
    task: Task;
    handleEdit: (task: Task) => void;
    listId?: number | null;
    userId?: string;
    isDragEnabled: boolean;
    dispatch: <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;
}

export const SortableTaskItem = memo(function SortableTaskItem({
    task,
    handleEdit,
    listId,
    userId,
    isDragEnabled,
    dispatch
}: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: task.id,
        disabled: !isDragEnabled
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? "none" : transition,
        zIndex: isDragging ? 50 : 0,
        position: "relative" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "rounded-lg transition-all",
                isDragging ? "opacity-0" : ""
            )}
        >
            <TaskItem
                task={task}
                showListInfo={!listId}
                userId={userId}
                disableAnimations={isDragEnabled}
                dragHandleProps={isDragEnabled ? listeners : undefined}
                dragAttributes={isDragEnabled ? attributes : undefined}
                dispatch={dispatch}
                onEdit={handleEdit}
            />
        </div>
    );
});
