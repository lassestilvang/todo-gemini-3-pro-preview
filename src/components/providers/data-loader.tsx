"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { getTasks } from "@/lib/actions/tasks";

export function DataLoader({ userId }: { userId?: string }) {
    const { initialize, setTasks } = useTaskStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!userId) return;

        // Background fetch of all tasks to warm the cache
        // We need a server action that returns ALL tasks for this user, not just filtered.
        // We reuse `getTasks` but we need to check if it supports 'all'?
        // Existing `getTasks` takes Partial<Task> filters.

        async function loadAll() {
            try {
                const result = await getTasks(userId!, undefined, 'all', undefined, true);
                setTasks(result);
            } catch (e) {
                console.error("Failed to load tasks", e);
            }
        }

        loadAll();
    }, [userId, setTasks]);

    return null;
}
