import { useState, useEffect, useCallback } from "react";
import {
    getLists,
    getLabels,
    getSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    getReminders,
    getTaskLogs,
    createReminder,
    deleteReminder,
    getBlockers,
    addDependency,
    removeDependency,
    searchTasks
} from "@/lib/actions";
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
}

/**
 * Hook to manage data fetching and side effects for task related entities.
 * Manages lists, labels, subtasks, reminders, logs, and blockers.
 * 
 * @param taskId - ID of the task to fetch data for (if editing)
 * @param isEdit - Boolean indicating if the form is in edit mode
 */
export function useTaskData({ taskId, isEdit }: UseTaskDataProps) {
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
        if (taskId) {
            const subs = await getSubtasks(taskId);
            setSubtasks(subs);
        }
    }, [taskId]);

    const fetchRemindersAndLogs = useCallback(async () => {
        if (taskId) {
            const [fetchedReminders, fetchedLogs] = await Promise.all([
                getReminders(taskId),
                getTaskLogs(taskId)
            ]);
            setReminders(fetchedReminders);
            setLogs(fetchedLogs);
        }
    }, [taskId]);

    const fetchBlockers = useCallback(async () => {
        if (taskId) {
            const fetchedBlockers = await getBlockers(taskId);
            setBlockers(fetchedBlockers);
        }
    }, [taskId]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            const [fetchedLists, fetchedLabels] = await Promise.all([
                getLists(),
                getLabels()
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
    }, [isEdit, taskId, fetchSubtasks, fetchRemindersAndLogs, fetchBlockers]);

    // Search tasks for blockers
    useEffect(() => {
        if (searchQuery.length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                const results = await searchTasks(searchQuery);
                const filtered = results.filter(t => t.id !== taskId); // Exclude self
                setSearchResults(filtered);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, taskId]);

    // --- Actions ---

    const handleAddSubtask = async () => {
        if (!newSubtask.trim() || !taskId) return;
        await createSubtask(taskId, newSubtask);
        setNewSubtask("");
        fetchSubtasks();
    };

    const handleToggleSubtask = async (id: number, checked: boolean) => {
        await updateSubtask(id, checked);
        fetchSubtasks();
    };

    const handleDeleteSubtask = async (id: number) => {
        await deleteSubtask(id);
        fetchSubtasks();
    };

    const handleOnAiConfirm = async (aiSubtasks: ParsedSubtask[]) => {
        if (!taskId) return;
        for (const sub of aiSubtasks) {
            await createSubtask(taskId, sub.title, sub.estimateMinutes);
        }
        fetchSubtasks();
    };

    const handleAddReminder = async () => {
        if (!newReminderDate || !taskId) return;
        await createReminder(taskId, newReminderDate);
        setNewReminderDate(undefined);
        fetchRemindersAndLogs();
    };

    const handleDeleteReminder = async (id: number) => {
        await deleteReminder(id);
        fetchRemindersAndLogs();
    };

    const handleAddBlocker = async (blockerId: number) => {
        if (!taskId) return;
        try {
            await addDependency(taskId, blockerId);
            fetchBlockers();
            setBlockerSearchOpen(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to add dependency:", error);
            alert("Failed to add dependency. Check for circular dependencies.");
        }
    };

    const handleRemoveBlocker = async (blockerId: number) => {
        if (!taskId) return;
        await removeDependency(taskId, blockerId);
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
