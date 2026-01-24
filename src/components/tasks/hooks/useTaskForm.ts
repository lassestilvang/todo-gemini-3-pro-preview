import { useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import type { ActionResult, ActionError } from "@/lib/action-result";

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
    initialPriority?: "none" | "low" | "medium" | "high";
    initialEnergyLevel?: "high" | "medium" | "low";
    initialContext?: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
}

/**
 * Helper to check if a result is an ActionResult
 */
function isActionResult<T>(result: unknown): result is ActionResult<T> {
    return (
        typeof result === "object" &&
        result !== null &&
        "success" in result &&
        typeof (result as ActionResult<T>).success === "boolean"
    );
}

/**
 * Handle ActionResult or legacy error patterns
 */
function handleActionError(
    error: ActionError,
    router: ReturnType<typeof useRouter>,
    setFieldErrors: (errors: Record<string, string>) => void
): void {
    // Handle field-level validation errors
    if (error.code === "VALIDATION_ERROR" && error.details) {
        setFieldErrors(error.details);
    }

    // Handle authentication errors - redirect to login
    if (error.code === "UNAUTHORIZED") {
        toast.error("Session expired. Please log in again.");
        router.push("/login?message=session_expired");
        return;
    }

    // Show error toast
    toast.error(error.message);
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
export function useTaskForm({ task, defaultListId, defaultLabelIds, defaultDueDate, userId, onClose, initialTitle, initialPriority, initialEnergyLevel, initialContext }: UseTaskFormProps) {
    const router = useRouter();

    const [title, setTitle] = useState(task?.title || initialTitle || "");
    const [description, setDescription] = useState(task?.description || "");
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">(task?.priority || initialPriority || "none");
    const [listId, setListId] = useState<string>(task?.listId?.toString() || defaultListId?.toString() || "inbox");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        task
            ? (task.dueDate ? new Date(task.dueDate) : undefined)
            : (defaultDueDate ? new Date(defaultDueDate) : undefined)
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

    const isEdit = !!task;

    // Clear field errors when user modifies input
    const clearFieldError = useCallback((field: string) => {
        setFieldErrors(prev => {
            if (prev[field]) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                estimateMinutes,
            };

            let result: unknown;
            if (isEdit && task) {
                result = await updateTask(task.id, userId, data);
            } else {
                result = await createTask({ ...data, userId });
            }

            // Handle ActionResult pattern (when server actions are updated)
            if (isActionResult(result)) {
                if (!result.success) {
                    handleActionError(result.error, router, setFieldErrors);
                    setIsSubmitting(false);
                    return;
                }
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

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

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
                const result = await deleteTask(task.id, userId);

                // Handle ActionResult pattern (when server actions are updated)
                if (isActionResult(result)) {
                    if (!result.success) {
                        handleActionError(result.error, router, setFieldErrors);
                        setIsSubmitting(false);
                        return;
                    }
                }

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
