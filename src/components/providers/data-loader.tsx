"use client";

import { useEffect, useCallback, useRef } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";
import { isDataStale, setAllLastFetched } from "@/lib/sync/db";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function DataLoader({ userId }: { userId?: string }) {
    const { initialize: initializeTasks, setTasks } = useTaskStore();
    const { initialize: initializeLists, setLists } = useListStore();
    const { initialize: initializeLabels, setLabels } = useLabelStore();
    const isFetchingRef = useRef(false);
    const isInitializedRef = useRef(false);

    const fetchFreshData = useCallback(async (force: boolean = false) => {
        if (!userId || isFetchingRef.current) return;
        
        if (!force) {
            const stale = await isDataStale('tasks', STALE_THRESHOLD_MS);
            if (!stale) return;
        }

        isFetchingRef.current = true;
        try {
            const [tasks, lists, labels] = await Promise.all([
                getTasks(userId, undefined, 'all', undefined, true),
                getLists(userId),
                getLabels(userId),
            ]);

            setTasks(tasks);
            setLists(lists);
            setLabels(labels);
            await setAllLastFetched();
        } catch (e) {
            console.error("Failed to fetch fresh data", e);
        } finally {
            isFetchingRef.current = false;
        }
    }, [userId, setTasks, setLists, setLabels]);

    useEffect(() => {
        if (!userId || isInitializedRef.current) return;
        isInitializedRef.current = true;

        async function loadAll() {
            try {
                await Promise.all([
                    initializeTasks(),
                    initializeLists(),
                    initializeLabels(),
                ]);

                await fetchFreshData(true);
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }

        loadAll();
    }, [userId, initializeTasks, initializeLists, initializeLabels, fetchFreshData]);

    useEffect(() => {
        if (!userId) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchFreshData();
            }
        };

        const handleOnline = () => {
            fetchFreshData();
        };

        const handleFocus = () => {
            fetchFreshData();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
        };
    }, [userId, fetchFreshData]);

    return null;
}
