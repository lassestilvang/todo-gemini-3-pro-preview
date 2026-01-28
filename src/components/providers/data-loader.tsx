"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { getTasks } from "@/lib/actions/tasks";

export function DataLoader({ userId }: { userId?: string }) {
    const { initialize, setTasks } = useTaskStore();

    useEffect(() => {
        if (!userId) return;

        async function loadAll() {
            try {
                // Await initialize to ensure IDB cache is merged before fresh fetch
                await initialize();
                const result = await getTasks(userId!, undefined, 'all', undefined, true);
                setTasks(result);
            } catch (e) {
                console.error("Failed to load tasks", e);
            }
        }

        loadAll();
    }, [userId, initialize, setTasks]);

    return null;
}
