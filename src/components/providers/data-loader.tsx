"use client";

import { useEffect, useCallback, useRef } from "react";
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";
import { isDataStale, setAllLastFetched } from "@/lib/sync/db";
import { DATA_REFRESH_EVENT } from "@/lib/sync/events";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function DataLoader({ userId }: { userId?: string }) {
    const taskStore = useTaskStore();
    const listStore = useListStore();
    const labelStore = useLabelStore();
    const initializeTasks = taskStore.initialize;
    const initializeLists = listStore.initialize;
    const initializeLabels = labelStore.initialize;
    const replaceTasks = taskStore.replaceTasks ?? taskStore.setTasks;
    const replaceLists = listStore.replaceLists ?? listStore.setLists;
    const replaceLabels = labelStore.replaceLabels ?? labelStore.setLabels;
    const isFetchingRef = useRef(false);
    const isInitializedRef = useRef(false);

    const fetchFreshData = useCallback(async (force: boolean = false) => {
        if (!userId || isFetchingRef.current) return;
        
        if (!force) {
            const stale = await isDataStale('tasks', STALE_THRESHOLD_MS);
            if (!stale) return;
        }

        isFetchingRef.current = true;
        const freshData = await Promise.all([
            getTasks(userId, undefined, 'all', undefined, true),
            getLists(userId),
            getLabels(userId),
        ]).catch((e) => {
            console.error("Failed to fetch fresh data", e);
            return null;
        });

        if (!freshData) {
            isFetchingRef.current = false;
            return;
        }

        const [tasksResult, lists, labels] = freshData;
        if (!tasksResult.success) {
            console.error(tasksResult.error.message);
            replaceTasks([]);
            replaceLists(lists);
            replaceLabels(labels);
            isFetchingRef.current = false;
            return;
        }

        replaceTasks(tasksResult.data);
        replaceLists(lists);
        replaceLabels(labels);
        await setAllLastFetched().catch((e) => {
            console.error("Failed to update fetch timestamps", e);
        });
        isFetchingRef.current = false;
    }, [userId, replaceTasks, replaceLists, replaceLabels]);

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
        const handleDataRefresh = () => {
            fetchFreshData(true);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        window.addEventListener(DATA_REFRESH_EVENT, handleDataRefresh);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener(DATA_REFRESH_EVENT, handleDataRefresh);
        };
    }, [userId, fetchFreshData]);

    return null;
}
