
"use client";

import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { AiBreakdownDialog } from "../AiBreakdownDialog";
import { ParsedSubtask } from "@/lib/smart-scheduler";
import { useUser } from "@/components/providers/UserProvider";
import { DuePrecision } from "@/lib/due-utils";

// Extracted Components
import { TaskHeaderSection } from "./details/TaskHeaderSection";
import { TaskClassificationSection } from "./details/TaskClassificationSection";
import { TaskSchedulingSection } from "./details/TaskSchedulingSection";
import { TaskRecurringSection } from "./details/TaskRecurringSection";
import { TaskSubtasksSection } from "./details/TaskSubtasksSection";
import { TaskLabelsSection } from "./details/TaskLabelsSection";
import { TaskRemindersSection } from "./details/TaskRemindersSection";

// Types
type ListType = { id: number; name: string; color: string | null; icon: string | null; };
type LabelType = { id: number; name: string; color: string | null; icon: string | null; };
type SubtaskType = { id: number; title: string; isCompleted: boolean | null; };
type ReminderType = { id: number; remindAt: Date; };

interface TaskDetailsTabProps {
    isEdit: boolean;
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    icon: string | null;
    setIcon: (v: string | null) => void;
    listId: string;
    setListId: (v: string) => void;
    lists: ListType[];
    priority: "none" | "low" | "medium" | "high";
    setPriority: (v: "none" | "low" | "medium" | "high") => void;
    energyLevel: "high" | "medium" | "low" | "none";
    setEnergyLevel: (v: "high" | "medium" | "low" | "none") => void;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none";
    setContext: (v: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none") => void;
    dueDate: Date | undefined;
    setDueDate: (v: Date | undefined) => void;
    dueDatePrecision: DuePrecision;
    setDueDatePrecision: (v: DuePrecision) => void;
    deadline: Date | undefined;
    setDeadline: (v: Date | undefined) => void;
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    recurringRule: string;
    setRecurringRule: (v: string) => void;
    isHabit: boolean;
    setIsHabit: (v: boolean) => void;
    // Subtasks
    subtasks: SubtaskType[];
    newSubtask: string;
    setNewSubtask: (v: string) => void;
    handleAddSubtask: () => void;
    handleToggleSubtask: (id: number, checked: boolean) => void;
    handleDeleteSubtask: (id: number) => void;
    onAiConfirm: (subtasks: ParsedSubtask[]) => void;
    // Labels
    labels: LabelType[];
    selectedLabelIds: number[];
    toggleLabel: (id: number) => void;
    // Reminders
    reminders: ReminderType[];
    newReminderDate: Date | undefined;
    setNewReminderDate: (v: Date | undefined) => void;
    handleAddReminder: (date?: Date) => void;
    handleDeleteReminder: (id: number) => void;
    // Time Estimate
    estimateMinutes: number | null;
    setEstimateMinutes: (v: number | null) => void;
    // Form submission
    handleSubmit: (e: React.FormEvent) => void;
    userId?: string;
}

export function TaskDetailsTab({
    isEdit,
    title, setTitle,
    description, setDescription,
    icon, setIcon,
    listId, setListId, lists,
    priority, setPriority,
    energyLevel, setEnergyLevel,
    context, setContext,
    dueDate, setDueDate,
    dueDatePrecision, setDueDatePrecision,
    deadline, setDeadline,
    isRecurring, setIsRecurring,
    recurringRule, setRecurringRule,
    isHabit, setIsHabit,
    subtasks, newSubtask, setNewSubtask, handleAddSubtask, handleToggleSubtask, handleDeleteSubtask, onAiConfirm,
    labels, selectedLabelIds, toggleLabel,
    reminders, newReminderDate, setNewReminderDate, handleAddReminder, handleDeleteReminder,
    estimateMinutes, setEstimateMinutes,
    handleSubmit,
    userId
}: TaskDetailsTabProps) {
    const [aiBreakdownOpen, setAiBreakdownOpen] = useState(false);
    const { weekStartsOnMonday } = useUser();

    return (
        <TabsContent value="details">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <TaskHeaderSection
                    title={title} setTitle={setTitle}
                    description={description} setDescription={setDescription}
                    icon={icon} setIcon={setIcon}
                    userId={userId}
                />

                <TaskClassificationSection
                    listId={listId} setListId={setListId} lists={lists}
                    priority={priority} setPriority={setPriority}
                    energyLevel={energyLevel} setEnergyLevel={setEnergyLevel}
                    context={context} setContext={setContext}
                    estimateMinutes={estimateMinutes} setEstimateMinutes={setEstimateMinutes}
                />

                <TaskSchedulingSection
                    dueDate={dueDate} setDueDate={setDueDate}
                    dueDatePrecision={dueDatePrecision} setDueDatePrecision={setDueDatePrecision}
                    deadline={deadline} setDeadline={setDeadline}
                    weekStartsOnMonday={weekStartsOnMonday}
                />

                <TaskRecurringSection
                    isRecurring={isRecurring} setIsRecurring={setIsRecurring}
                    recurringRule={recurringRule} setRecurringRule={setRecurringRule}
                    isHabit={isHabit} setIsHabit={setIsHabit}
                />

                <TaskSubtasksSection
                    isEdit={isEdit}
                    subtasks={subtasks} newSubtask={newSubtask} setNewSubtask={setNewSubtask}
                    handleAddSubtask={handleAddSubtask} handleToggleSubtask={handleToggleSubtask}
                    handleDeleteSubtask={handleDeleteSubtask} setAiBreakdownOpen={setAiBreakdownOpen}
                />

                <AiBreakdownDialog
                    open={aiBreakdownOpen}
                    onOpenChange={setAiBreakdownOpen}
                    taskTitle={title}
                    onConfirm={(subs) => {
                        onAiConfirm(subs);
                        setAiBreakdownOpen(false);
                    }}
                />

                <TaskLabelsSection
                    labels={labels}
                    selectedLabelIds={selectedLabelIds}
                    toggleLabel={toggleLabel}
                />

                <TaskRemindersSection
                    isEdit={isEdit}
                    dueDate={dueDate} dueDatePrecision={dueDatePrecision}
                    weekStartsOnMonday={weekStartsOnMonday}
                    reminders={reminders}
                    newReminderDate={newReminderDate} setNewReminderDate={setNewReminderDate}
                    handleAddReminder={handleAddReminder} handleDeleteReminder={handleDeleteReminder}
                />
            </form>
        </TabsContent>
    );
}
