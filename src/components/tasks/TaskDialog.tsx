"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Focus, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FocusMode } from "./FocusMode";
import { TaskDetailsTab } from "./task-dialog/TaskDetailsTab";
import { TaskDependenciesTab } from "./task-dialog/TaskDependenciesTab";
import { TaskActivityTab } from "./task-dialog/TaskActivityTab";

import { useTaskForm, TaskType } from "./hooks/useTaskForm";
import { useTaskData } from "./hooks/useTaskData";

interface TaskDialogProps {
    task?: TaskType;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    defaultListId?: number;
    defaultLabelIds?: number[];
    defaultDueDate?: Date | string;
    userId?: string;
    initialTitle?: string;
    initialPriority?: "none" | "low" | "medium" | "high";
    initialEnergyLevel?: "high" | "medium" | "low";
    initialContext?: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
    initialDueDatePrecision?: "day" | "week" | "month" | "year";
}

/**
 * Dialog for creating or editing a task.
 * Refactored to use custom hooks for state and data management.
 */
export function TaskDialog({ task, open, onOpenChange, trigger, defaultListId, defaultLabelIds, defaultDueDate, userId, initialTitle, initialPriority, initialEnergyLevel, initialContext, initialDueDatePrecision }: TaskDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    const formKey = effectiveOpen ? (task ? `edit-${task.id}` : "create") : "closed";

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden top-[50%] translate-y-[-50%] sm:top-[10%] sm:translate-y-0 max-h-[90vh]">
                {effectiveOpen && (
                    <TaskForm
                        key={formKey}
                        task={task}
                        defaultListId={defaultListId}
                        defaultLabelIds={defaultLabelIds}
                        defaultDueDate={defaultDueDate}
                        initialTitle={initialTitle}
                        initialPriority={initialPriority}
                        initialEnergyLevel={initialEnergyLevel}
                        initialContext={initialContext}
                        initialDueDatePrecision={initialDueDatePrecision}
                        userId={userId}
                        onClose={() => setEffectiveOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function TaskForm({ task, defaultListId, defaultLabelIds, defaultDueDate, userId, onClose, initialTitle, initialPriority, initialEnergyLevel, initialContext, initialDueDatePrecision }: {
    task?: TaskType,
    defaultListId?: number,
    defaultLabelIds?: number[],
    defaultDueDate?: Date | string,
    userId?: string,
    onClose: () => void,
    initialTitle?: string;
    initialPriority?: "none" | "low" | "medium" | "high";
    initialEnergyLevel?: "high" | "medium" | "low";
    initialContext?: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
    initialDueDatePrecision?: "day" | "week" | "month" | "year";
}) {
    // Form State
    const {
        title, setTitle,
        description, setDescription,
        icon, setIcon,
        priority, setPriority,
        listId, setListId,
        dueDate, setDueDate,
        dueDatePrecision, setDueDatePrecision,
        deadline, setDeadline,
        selectedLabelIds,
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
        isSaving,
        isDeleting
    } = useTaskForm({ task, defaultListId, defaultLabelIds, defaultDueDate, userId, onClose, initialTitle, initialPriority, initialEnergyLevel, initialContext, initialDueDatePrecision });

    // Data State (Subtasks, Reminders, Logs, etc.)
    const {
        lists, labels,
        subtasks, newSubtask, setNewSubtask,
        reminders, logs, newReminderDate, setNewReminderDate,
        blockers, blockerSearchOpen, setBlockerSearchOpen, searchResults, searchQuery, setSearchQuery,
        handleAddSubtask, handleToggleSubtask, handleDeleteSubtask, handleOnAiConfirm,
        handleAddReminder, handleDeleteReminder,
        handleAddBlocker, handleRemoveBlocker
    } = useTaskData({ taskId: task?.id, isEdit, userId });

    const [focusModeOpen, setFocusModeOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
                <DialogDescription className="sr-only">
                    {isEdit ? "Edit the details of your task" : "Create a new task to track your work"}
                </DialogDescription>
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
                        icon={icon} setIcon={setIcon}
                        listId={listId} setListId={setListId} lists={lists}
                        priority={priority} setPriority={setPriority}
                        energyLevel={energyLevel} setEnergyLevel={setEnergyLevel}
                        context={context} setContext={setContext}
                        dueDate={dueDate} setDueDate={setDueDate}
                        dueDatePrecision={dueDatePrecision} setDueDatePrecision={setDueDatePrecision}
                        deadline={deadline} setDeadline={setDeadline}
                        isRecurring={isRecurring} setIsRecurring={setIsRecurring}
                        recurringRule={recurringRule} setRecurringRule={setRecurringRule}
                        isHabit={isHabit} setIsHabit={setIsHabit}
                        estimateMinutes={estimateMinutes} setEstimateMinutes={setEstimateMinutes}
                        subtasks={subtasks} newSubtask={newSubtask} setNewSubtask={setNewSubtask}
                        handleAddSubtask={handleAddSubtask} handleToggleSubtask={handleToggleSubtask} handleDeleteSubtask={handleDeleteSubtask}
                        onAiConfirm={handleOnAiConfirm}
                        labels={labels} selectedLabelIds={selectedLabelIds} toggleLabel={toggleLabel}
                        reminders={reminders} newReminderDate={newReminderDate} setNewReminderDate={setNewReminderDate}
                        handleAddReminder={handleAddReminder} handleDeleteReminder={handleDeleteReminder}
                        handleSubmit={handleSubmit}
                        userId={userId}
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
                        <Button type="button" variant="outline" onClick={() => setFocusModeOpen(true)} className="gap-2" disabled={isSaving || isDeleting}>
                            <Focus className="h-4 w-4" />
                            Focus
                        </Button>
                        <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="destructive" disabled={isSaving || isDeleting}>
                                    Delete
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Confirm Deletion</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Are you sure? This action cannot be undone.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                                        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Confirm Delete
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                ) : <div></div>}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isSaving || isDeleting}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </div>
            </DialogFooter>

            {isEdit && task && focusModeOpen && (
                <FocusMode
                    task={{
                        id: task.id,
                        title: title, // Use current form title
                        description: description,
                        priority: priority
                    }}
                    userId={userId}
                    onClose={() => setFocusModeOpen(false)}
                />
            )}
        </div >
    );
}
