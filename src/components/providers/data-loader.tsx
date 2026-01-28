"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";

export function DataLoader({ userId }: { userId?: string }) {
    const { initialize: initializeTasks, setTasks } = useTaskStore();
    const { initialize: initializeLists, setLists } = useListStore();
    const { initialize: initializeLabels, setLabels } = useLabelStore();

    useEffect(() => {
        if (!userId) return;

        async function loadAll() {
            try {
                await Promise.all([
                    initializeTasks(),
                    initializeLists(),
                    initializeLabels(),
                ]);

                const [tasks, lists, labels] = await Promise.all([
                    getTasks(userId!, undefined, 'all', undefined, true),
                    getLists(userId!),
                    getLabels(userId!),
                ]);

                setTasks(tasks);
                setLists(lists);
                setLabels(labels);
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }

        loadAll();
    }, [userId, initializeTasks, initializeLists, initializeLabels, setTasks, setLists, setLabels]);

    return null;
}
