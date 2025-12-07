import { useState, FormEvent } from "react";
import { createTask, updateTask, deleteTask } from "@/lib/actions";

export type TaskType = {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    deadline: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

interface UseTaskFormProps {
    task?: TaskType;
    defaultListId?: number;
    defaultLabelIds?: number[];
    defaultDueDate?: Date | string;
    onClose: () => void;
}

/**
 * Hook to manage the form state for creating and editing tasks.
 * Handles form validation, submission, and state changes for all task fields.
 * 
 * @param task - Optional existing task to edit
 * @param defaultListId - Default list ID to select if creating a new task
 * @param defaultLabelIds - Default label IDs to select if creating a new task
 * @param defaultDueDate - Default due date to select if creating a new task
 * @param onClose - Callback to close the dialog after successful submission
 */
export function useTaskForm({ task, defaultListId, defaultLabelIds, defaultDueDate, onClose }: UseTaskFormProps) {
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">(task?.priority || "none");
    const [listId, setListId] = useState<string>(task?.listId?.toString() || defaultListId?.toString() || "inbox");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        task
            ? (task.dueDate ? new Date(task.dueDate) : undefined)
            : (defaultDueDate ? new Date(defaultDueDate) : undefined)
    );
    const [deadline, setDeadline] = useState<Date | undefined>(task?.deadline ? new Date(task.deadline) : undefined);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(task?.labels?.map((l) => l.id) || defaultLabelIds || []);
    const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | "none">(task?.energyLevel || "none");
    const [context, setContext] = useState<"computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none">(task?.context || "none");

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
    const [recurringRule, setRecurringRule] = useState(task?.recurringRule || "FREQ=DAILY");

    // Habit state
    const [isHabit, setIsHabit] = useState(task?.isHabit || false);

    const isEdit = !!task;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                title,
                description,
                priority,
                listId: listId === "inbox" ? null : parseInt(listId),
                dueDate,
                deadline,
                labelIds: selectedLabelIds,
                isRecurring,
                recurringRule: isRecurring ? recurringRule : null,
                energyLevel: energyLevel === "none" ? null : energyLevel,
                context: context === "none" ? null : context,
                isHabit: isRecurring ? isHabit : false,
            };

            if (isEdit && task) {
                await updateTask(task.id, data);
            } else {
                await createTask(data);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save task:", error);
        }
    };

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    const handleDelete = async () => {
        if (!isEdit || !task) return;
        if (confirm("Are you sure you want to delete this task?")) {
            await deleteTask(task.id);
            onClose();
        }
    };

    return {
        title, setTitle,
        description, setDescription,
        priority, setPriority,
        listId, setListId,
        dueDate, setDueDate,
        deadline, setDeadline,
        selectedLabelIds, setSelectedLabelIds,
        energyLevel, setEnergyLevel,
        context, setContext,
        isRecurring, setIsRecurring,
        recurringRule, setRecurringRule,
        isHabit, setIsHabit,
        handleSubmit,
        handleDelete,
        toggleLabel,
        isEdit
    };
}
