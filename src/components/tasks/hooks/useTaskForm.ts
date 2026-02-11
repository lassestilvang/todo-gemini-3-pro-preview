import { useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSync } from "@/components/providers/sync-provider";


export type TaskType = {
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    dueDatePrecision?: "day" | "week" | "month" | "year" | null;
    deadline: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    estimateMinutes?: number | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

interface UseTaskFormProps {
    task?: TaskType;
    defaultListId?: number;
    defaultLabelIds?: number[];
    defaultDueDate?: Date | string;
    userId?: string;
    onClose: () => void;
    // Initial values for new task
    initialTitle?: string;
    initialIcon?: string;
    initialPriority?: "none" | "low" | "medium" | "high";
    initialEnergyLevel?: "high" | "medium" | "low";
    initialContext?: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
    initialDueDatePrecision?: "day" | "week" | "month" | "year";
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
export function useTaskForm({ task, defaultListId, defaultLabelIds, defaultDueDate, userId, onClose, initialTitle, initialIcon, initialPriority, initialEnergyLevel, initialContext, initialDueDatePrecision }: UseTaskFormProps) {
    const router = useRouter();

    const [title, setTitle] = useState(task?.title || initialTitle || "");
    const [description, setDescription] = useState(task?.description || "");
    const [icon, setIcon] = useState<string | null>(task?.icon || initialIcon || null);
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">(task?.priority || initialPriority || "none");
    const [listId, setListId] = useState<string>(task?.listId?.toString() || defaultListId?.toString() || "inbox");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        task
            ? (task.dueDate ? new Date(task.dueDate) : undefined)
            : (defaultDueDate ? new Date(defaultDueDate) : undefined)
    );
    const [dueDatePrecision, setDueDatePrecision] = useState<"day" | "week" | "month" | "year">(
        task?.dueDatePrecision || initialDueDatePrecision || "day"
    );
    const [deadline, setDeadline] = useState<Date | undefined>(task?.deadline ? new Date(task.deadline) : undefined);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(task?.labels?.map((l) => l.id) || defaultLabelIds || []);
    const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | "none">(task?.energyLevel || initialEnergyLevel || "none");
    const [context, setContext] = useState<"computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none">(task?.context || initialContext || "none");

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
    const [recurringRule, setRecurringRule] = useState(task?.recurringRule || "FREQ=DAILY");

    // Habit state
    const [isHabit, setIsHabit] = useState(task?.isHabit || false);

    // Time estimate state
    const [estimateMinutes, setEstimateMinutes] = useState<number | null>(task?.estimateMinutes || null);

    // Error handling state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const { dispatch } = useSync();

    const isEdit = !!task;

    // Clear field errors when user modifies input
    const clearFieldError = useCallback((field: string) => {
        setFieldErrors(prev => {
            if (prev[field]) {

                const { [field]: _removed, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setFieldErrors({});

        // Client-side validation
        if (!title.trim()) {
            setFieldErrors({ title: "Title is required" });
            toast.error("Please enter a task title");
            return;
        }

        if (!userId) {
            toast.error("Unable to save task. Please try logging in again.");
            router.push("/login?message=session_expired");
            return;
        }

        setIsSubmitting(true);

        try {
            const data = {
                title,
                description,
                icon,
                priority,
                listId: listId === "inbox" ? null : parseInt(listId),
                dueDate,
                dueDatePrecision: dueDate ? dueDatePrecision : null,
                deadline,
                labelIds: selectedLabelIds,
                isRecurring,
                recurringRule: isRecurring ? recurringRule : null,
                energyLevel: energyLevel === "none" ? null : energyLevel,
                context: context === "none" ? null : context,
                isHabit: isRecurring ? isHabit : false,
                estimateMinutes,
            };

            if (isEdit && task) {
                dispatch("updateTask", task.id, userId, data);
            } else {
                dispatch("createTask", { ...data, userId });
            }

            // Success - close dialog
            toast.success(isEdit ? "Task updated" : "Task created");
            onClose();
        } catch (error) {
            console.error("Failed to save task:", error);
            toast.error("Failed to save task. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleLabel = useCallback((labelId: number) => {
        setSelectedLabelIds((prev) => {
            const next = new Set(prev);
            if (next.has(labelId)) {
                next.delete(labelId);
            } else {
                next.add(labelId);
            }
            return Array.from(next);
        });
    }, []);

    const handleDelete = async () => {
        if (!isEdit || !task) return;
        if (!userId) {
            toast.error("Unable to delete task. Please try logging in again.");
            router.push("/login?message=session_expired");
            return;
        }
        if (confirm("Are you sure you want to delete this task?")) {
            setIsSubmitting(true);
            try {
                dispatch("deleteTask", task.id, userId);

                toast.success("Task deleted");
                onClose();
            } catch (error) {
                console.error("Failed to delete task:", error);
                toast.error("Failed to delete task. Please try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Wrap setters to clear field errors on change
    const setTitleWithClear = useCallback((value: string) => {
        setTitle(value);
        clearFieldError("title");
    }, [clearFieldError]);

    return {
        title, setTitle: setTitleWithClear,
        description, setDescription,
        icon, setIcon,
        priority, setPriority,
        listId, setListId,
        dueDate, setDueDate,
        dueDatePrecision, setDueDatePrecision,
        deadline, setDeadline,
        selectedLabelIds, setSelectedLabelIds,
        energyLevel, setEnergyLevel,
        context, setContext,
        isRecurring, setIsRecurring,
        recurringRule, setRecurringRule,
        isHabit, setIsHabit,
        estimateMinutes, setEstimateMinutes,
        handleSubmit,
        handleDelete,
        toggleLabel,
        isEdit,
        // Error handling state
        isSubmitting,
        fieldErrors,
        clearFieldError,
    };
}
