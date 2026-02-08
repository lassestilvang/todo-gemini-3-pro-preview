"use client";

import { useEffect, useMemo, useState } from "react";
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

export function TaskListSkeletonFallback({ viewId, compact = false }: TaskListSkeletonFallbackProps) {
    const storageKey = useMemo(() => `tg:view-layout:${viewId}`, [viewId]);
    const [variant, setVariant] = useState<TaskListSkeletonVariant>(() => {
        if (typeof window === "undefined") return "list";
        try {
            return normalizeLayout(window.localStorage.getItem(storageKey)) ?? "list";
        } catch {
            return "list";
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = normalizeLayout(window.localStorage.getItem(storageKey));
            if (stored && stored !== variant) {
                setVariant(stored);
            }
        } catch {
            // Ignore storage errors
        }
    }, [storageKey, variant]);

    return <TaskListSkeleton variant={variant} compact={compact} />;
}
