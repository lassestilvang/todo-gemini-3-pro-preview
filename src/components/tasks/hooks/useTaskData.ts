import { useState, useEffect, useCallback } from "react";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";
import {
    getSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    searchTasks
} from "@/lib/actions/tasks";
import { getReminders, createReminder, deleteReminder } from "@/lib/actions/reminders";
import { getTaskLogs } from "@/lib/actions/logs";
import { getBlockers, addDependency, removeDependency } from "@/lib/actions/dependencies";
import { ParsedSubtask } from "@/lib/smart-scheduler";

// Re-using types from TaskDialog (we should move these to a types file eventually)
export type ListType = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

export type LabelType = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

export type SubtaskType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

export type ReminderType = {
    id: number;
    remindAt: Date;
};

export type LogType = {
    id: number;
    action: string;
    details: string | null;
    createdAt: Date;
};

export type BlockerType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

interface UseTaskDataProps {
    taskId?: number;
    isEdit: boolean;
    userId?: string;
}

/**
 * Hook to manage data fetching and side effects for task related entities.
 * Manages lists, labels, subtasks, reminders, logs, and blockers.
 * 
 * @param taskId - ID of the task to fetch data for (if editing)
 * @param isEdit - Boolean indicating if the form is in edit mode
 */
export function useTaskData({ taskId, isEdit, userId }: UseTaskDataProps) {
    const [lists, setLists] = useState<ListType[]>([]);
    const [labels, setLabels] = useState<LabelType[]>([]);

    // Subtasks
    const [subtasks, setSubtasks] = useState<SubtaskType[]>([]);
    const [newSubtask, setNewSubtask] = useState("");

    // Reminders & Logs
    const [reminders, setReminders] = useState<ReminderType[]>([]);
    const [logs, setLogs] = useState<LogType[]>([]);
    const [newReminderDate, setNewReminderDate] = useState<Date | undefined>();

    // Dependencies
    const [blockers, setBlockers] = useState<BlockerType[]>([]);
    const [blockerSearchOpen, setBlockerSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<BlockerType[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchSubtasks = useCallback(async () => {
        if (taskId && userId) {
            const result = await getSubtasks(taskId, userId);
            if (!result.success) {
                console.error(result.error.message);
                setSubtasks([]);
                return;
            }
            setSubtasks(result.data);
        }
    }, [taskId, userId]);

    const fetchRemindersAndLogs = useCallback(async () => {
        if (taskId && userId) {
            const [fetchedReminders, fetchedLogs] = await Promise.all([
                getReminders(taskId, userId),
                getTaskLogs(taskId)
            ]);
            setReminders(fetchedReminders);
            setLogs(fetchedLogs);
        }
    }, [taskId, userId]);

    const fetchBlockers = useCallback(async () => {
        if (taskId && userId) {
            const fetchedBlockers = await getBlockers(userId, taskId);
            setBlockers(fetchedBlockers);
        }
    }, [taskId, userId]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            const [fetchedLists, fetchedLabels] = await Promise.all([
                getLists(userId),
                getLabels(userId)
            ]);
            setLists(fetchedLists);
            setLabels(fetchedLabels);

            if (isEdit && taskId) {
                fetchSubtasks();
                fetchRemindersAndLogs();
                fetchBlockers();
            }
        };
        fetchData();
    }, [isEdit, taskId, userId, fetchSubtasks, fetchRemindersAndLogs, fetchBlockers]);

    // Search tasks for blockers
    useEffect(() => {
        if (searchQuery.length > 1 && userId) {
            const delayDebounceFn = setTimeout(async () => {
                const result = await searchTasks(userId, searchQuery);
                if (!result.success) {
                    console.error(result.error.message);
                    setSearchResults([]);
                    return;
                }
                const filtered = result.data.filter(t => t.id !== taskId); // Exclude self
                setSearchResults(filtered);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, taskId, userId]);

    // --- Actions ---

    const handleAddSubtask = async () => {
        if (!newSubtask.trim() || !taskId || !userId) return;
        const result = await createSubtask(taskId, userId, newSubtask);
        if (!result.success) {
            console.error(result.error.message);
            return;
        }
        setNewSubtask("");
        fetchSubtasks();
    };

    const handleToggleSubtask = async (id: number, checked: boolean) => {
        if (!userId) return;
        const result = await updateSubtask(id, userId, checked);
        if (!result.success) {
            console.error(result.error.message);
            return;
        }
        fetchSubtasks();
    };

    const handleDeleteSubtask = async (id: number) => {
        if (!userId) return;
        const result = await deleteSubtask(id, userId);
        if (!result.success) {
            console.error(result.error.message);
            return;
        }
        fetchSubtasks();
    };

    const handleOnAiConfirm = async (aiSubtasks: ParsedSubtask[]) => {
        if (!taskId || !userId) return;
        // Perf: create subtasks in parallel to avoid serial roundtrips per item.
        // This reduces AI-import latency from O(n) sequential awaits to ~1 RTT for n subtasks.
        const results = await Promise.all(
            aiSubtasks.map(sub =>
                createSubtask(taskId, userId, sub.title, sub.estimateMinutes)
            )
        );
        if (results.some((result) => !result.success)) {
            console.error("Failed to create one or more subtasks");
            return;
        }
        fetchSubtasks();
    };

    const handleAddReminder = async (date?: Date) => {
        const reminderDate = date ?? newReminderDate;
        if (!reminderDate || !taskId || !userId) return;
        await createReminder(userId, taskId, reminderDate);
        setNewReminderDate(undefined);
        fetchRemindersAndLogs();
    };

    const handleDeleteReminder = async (id: number) => {
        if (!userId) return;
        await deleteReminder(userId, id);
        fetchRemindersAndLogs();
    };

    const handleAddBlocker = async (blockerId: number) => {
        if (!taskId || !userId) return;
        try {
            await addDependency(userId, taskId, blockerId);
            fetchBlockers();
            setBlockerSearchOpen(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to add dependency:", error);
            alert("Failed to add dependency. Check for circular dependencies.");
        }
    };

    const handleRemoveBlocker = async (blockerId: number) => {
        if (!taskId || !userId) return;
        await removeDependency(userId, taskId, blockerId);
        fetchBlockers();
    };

    return {
        lists, labels,
        subtasks, newSubtask, setNewSubtask,
        reminders, logs, newReminderDate, setNewReminderDate,
        blockers, blockerSearchOpen, setBlockerSearchOpen, searchResults, searchQuery, setSearchQuery,
        handleAddSubtask, handleToggleSubtask, handleDeleteSubtask, handleOnAiConfirm,
        handleAddReminder, handleDeleteReminder,
        handleAddBlocker, handleRemoveBlocker
    };
}
