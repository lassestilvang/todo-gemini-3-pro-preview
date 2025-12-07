"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createTask, updateTask, deleteTask, getLists, getLabels, createSubtask, updateSubtask, deleteSubtask, getSubtasks, createReminder, deleteReminder, getReminders, getTaskLogs, addDependency, removeDependency, getBlockers, searchTasks } from "@/lib/actions";
import { Focus, FocusIcon } from "lucide-react";
import { ParsedSubtask } from "@/lib/smart-scheduler";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FocusMode } from "./FocusMode";
import { TaskDetailsTab } from "./task-dialog/TaskDetailsTab";
import { TaskDependenciesTab } from "./task-dialog/TaskDependenciesTab";
import { TaskActivityTab } from "./task-dialog/TaskActivityTab";

type TaskType = {
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

type ReminderType = {
    id: number;
    remindAt: Date;
};

type LogType = {
    id: number;
    action: string;
    details: string | null;
    createdAt: Date;
};

type ListType = {
    id: number;
    name: string;
    color: string | null;
};

type LabelType = {
    id: number;
    name: string;
    color: string | null;
};

type SubtaskType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

type BlockerType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

interface TaskDialogProps {
    task?: TaskType;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    defaultListId?: number;
}

export function TaskDialog({ task, open, onOpenChange, trigger, defaultListId }: TaskDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    const formKey = effectiveOpen ? (task ? `edit-${task.id}` : "create") : "closed";

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <TaskForm
                    key={formKey}
                    task={task}
                    defaultListId={defaultListId}
                    onClose={() => setEffectiveOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function TaskForm({ task, defaultListId, onClose }: { task?: TaskType, defaultListId?: number, onClose: () => void }) {
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">(task?.priority || "none");
    const [listId, setListId] = useState<string>(task?.listId?.toString() || defaultListId?.toString() || "inbox");
    const [dueDate, setDueDate] = useState<Date | undefined>(task?.dueDate ? new Date(task.dueDate) : undefined);
    const [deadline, setDeadline] = useState<Date | undefined>(task?.deadline ? new Date(task.deadline) : undefined);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(task?.labels?.map((l) => l.id) || []);
    const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | "none">(task?.energyLevel || "none");
    const [context, setContext] = useState<"computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none">(task?.context || "none");

    const [lists, setLists] = useState<ListType[]>([]);
    const [labels, setLabels] = useState<LabelType[]>([]);

    // Reminders & Logs
    const [reminders, setReminders] = useState<ReminderType[]>([]);
    const [logs, setLogs] = useState<LogType[]>([]);
    const [newReminderDate, setNewReminderDate] = useState<Date | undefined>();

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
    const [recurringRule, setRecurringRule] = useState(task?.recurringRule || "FREQ=DAILY");

    // Habit state
    const [isHabit, setIsHabit] = useState(task?.isHabit || false);

    // Subtasks state
    const [subtasks, setSubtasks] = useState<SubtaskType[]>([]);
    const [newSubtask, setNewSubtask] = useState("");

    // Focus mode state
    const [focusModeOpen, setFocusModeOpen] = useState(false);

    // Dependencies state
    const [blockers, setBlockers] = useState<BlockerType[]>([]);
    const [blockerSearchOpen, setBlockerSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<BlockerType[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const isEdit = !!task;

    const fetchBlockers = useCallback(async () => {
        if (task?.id) {
            const fetchedBlockers = await getBlockers(task.id);
            setBlockers(fetchedBlockers);
        }
    }, [task]);

    // Search tasks for blockers
    useEffect(() => {
        if (searchQuery.length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                const results = await searchTasks(searchQuery);
                const filtered = results.filter(t => t.id !== task?.id); // Exclude self
                setSearchResults(filtered);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, task?.id]);

    const fetchSubtasks = useCallback(async () => {
        if (task?.id) {
            const subs = await getSubtasks(task.id);
            setSubtasks(subs);
        }
    }, [task]);

    const fetchRemindersAndLogs = useCallback(async () => {
        if (task?.id) {
            const [fetchedReminders, fetchedLogs] = await Promise.all([
                getReminders(task.id),
                getTaskLogs(task.id)
            ]);
            setReminders(fetchedReminders);
            setLogs(fetchedLogs);
        }
    }, [task]);

    useEffect(() => {
        const fetchData = async () => {
            const [fetchedLists, fetchedLabels] = await Promise.all([
                getLists(),
                getLabels()
            ]);
            setLists(fetchedLists);
            setLabels(fetchedLabels);

            if (isEdit) {
                fetchSubtasks();
                fetchRemindersAndLogs();
                fetchBlockers();
            }
        };
        fetchData();
    }, [isEdit, task?.id, fetchSubtasks, fetchRemindersAndLogs, fetchBlockers]);

    const handleAddSubtask = async () => {
        if (!newSubtask.trim() || !task?.id) return;
        await createSubtask(task.id, newSubtask);
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

    const handleOnAiConfirm = async (subtasks: ParsedSubtask[]) => {
        if (!task?.id) return;
        for (const sub of subtasks) {
            await createSubtask(task.id, sub.title, sub.estimateMinutes);
        }
        fetchSubtasks();
    };

    const handleAddReminder = async () => {
        if (!newReminderDate || !task?.id) return;
        await createReminder(task.id, newReminderDate);
        setNewReminderDate(undefined);
        fetchRemindersAndLogs();
    };

    const handleDeleteReminder = async (id: number) => {
        await deleteReminder(id);
        fetchRemindersAndLogs();
    };

    const handleAddBlocker = async (blockerId: number) => {
        if (!task?.id) return;
        try {
            await addDependency(task.id, blockerId);
            fetchBlockers();
            setBlockerSearchOpen(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to add dependency:", error);
            alert("Failed to add dependency. Check for circular dependencies.");
        }
    };

    const handleRemoveBlocker = async (blockerId: number) => {
        if (!task?.id) return;
        await removeDependency(task.id, blockerId);
        fetchBlockers();
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

            if (isEdit) {
                await updateTask(task.id, data);
            } else {
                await createTask(data);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save task:", error);
        }
    };

    const handleDelete = async () => {
        if (!isEdit) return;
        if (confirm("Are you sure you want to delete this task?")) {
            await deleteTask(task.id);
            onClose();
        }
    };

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    return (
        <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="dependencies" disabled={!isEdit}>Dependencies</TabsTrigger>
                        <TabsTrigger value="activity" disabled={!isEdit}>Activity</TabsTrigger>
                    </TabsList>

                    <TaskDetailsTab
                        isEdit={isEdit}
                        title={title} setTitle={setTitle}
                        description={description} setDescription={setDescription}
                        listId={listId} setListId={setListId} lists={lists}
                        priority={priority} setPriority={setPriority}
                        energyLevel={energyLevel} setEnergyLevel={setEnergyLevel}
                        context={context} setContext={setContext}
                        dueDate={dueDate} setDueDate={setDueDate}
                        deadline={deadline} setDeadline={setDeadline}
                        isRecurring={isRecurring} setIsRecurring={setIsRecurring}
                        recurringRule={recurringRule} setRecurringRule={setRecurringRule}
                        isHabit={isHabit} setIsHabit={setIsHabit}
                        subtasks={subtasks} newSubtask={newSubtask} setNewSubtask={setNewSubtask}
                        handleAddSubtask={handleAddSubtask} handleToggleSubtask={handleToggleSubtask} handleDeleteSubtask={handleDeleteSubtask}
                        onAiConfirm={handleOnAiConfirm}
                        labels={labels} selectedLabelIds={selectedLabelIds} toggleLabel={toggleLabel}
                        reminders={reminders} newReminderDate={newReminderDate} setNewReminderDate={setNewReminderDate}
                        handleAddReminder={handleAddReminder} handleDeleteReminder={handleDeleteReminder}
                        handleSubmit={handleSubmit}
                    />

                    <TaskDependenciesTab
                        blockers={blockers}
                        searchResults={searchResults}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        blockerSearchOpen={blockerSearchOpen}
                        setBlockerSearchOpen={setBlockerSearchOpen}
                        handleAddBlocker={handleAddBlocker}
                        handleRemoveBlocker={handleRemoveBlocker}
                    />

                    <TaskActivityTab logs={logs} />
                </Tabs>
            </div >

            <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex justify-between sm:justify-between">
                {isEdit ? (
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setFocusModeOpen(true)} className="gap-2">
                            <Focus className="h-4 w-4" />
                            Focus
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                ) : <div></div>}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="task-form">Save</Button>
                </div>
            </DialogFooter>

            {isEdit && task && focusModeOpen && (
                <FocusMode
                    task={{
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        priority: task.priority
                    }}
                    onClose={() => setFocusModeOpen(false)}
                />
            )}
        </div >
    );
}
