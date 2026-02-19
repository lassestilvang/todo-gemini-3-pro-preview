"use client";

import { useSyncExternalStore } from "react";
import { TaskListSkeleton } from "./TaskListSkeleton";

const layoutValues = new Set(["list", "board", "calendar"] as const);
type TaskListSkeletonVariant = "list" | "board" | "calendar";

interface TaskListSkeletonFallbackProps {
    viewId: string;
    compact?: boolean;
}

function normalizeLayout(value: string | null): TaskListSkeletonVariant | null {
    if (!value) return null;
    if (layoutValues.has(value as TaskListSkeletonVariant)) {
        return value as TaskListSkeletonVariant;
    }
    return null;
}

function readLayout(storageKey: string): TaskListSkeletonVariant {
    if (typeof window === "undefined") return "list";
    const stored = normalizeLayout(window.localStorage.getItem(storageKey));
    return stored ?? "list";
}

export function TaskListSkeletonFallback({ viewId, compact = false }: TaskListSkeletonFallbackProps) {
    const storageKey = `tg:view-layout:${viewId}`;
    const variant = useSyncExternalStore<TaskListSkeletonVariant>(
        (onStoreChange) => {
            if (typeof window === "undefined") {
                return () => {};
            }

            const handleStorage = (event: StorageEvent) => {
                if (event.key === storageKey) {
                    onStoreChange();
                }
            };

            window.addEventListener("storage", handleStorage);
            return () => window.removeEventListener("storage", handleStorage);
        },
        () => readLayout(storageKey),
        () => "list"
    );

    return <TaskListSkeleton variant={variant} compact={compact} />;
}
