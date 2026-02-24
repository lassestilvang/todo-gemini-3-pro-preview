
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Task } from "@/lib/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TaskItemProps } from "./TaskItem";

/**
 * Format minutes to human-readable duration
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const priorityColors = {
    high: "text-red-500",
    medium: "text-orange-500",
    low: "text-blue-500",
    none: "text-gray-400",
} as const;

export const energyLabels = {
    high: "High Energy",
    medium: "Medium Energy",
    low: "Low Energy",
} as const;

export const contextLabels = {
    computer: "Computer",
    phone: "Phone",
    errands: "Errands",
    meeting: "Meeting",
    home: "Home",
    anywhere: "Anywhere",
} as const;

/**
 * Custom comparison for TaskItem memoization.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function areTaskPropsEqual(prev: any, next: any) {
    if (prev.userId !== next.userId) return false;
    if (prev.showListInfo !== next.showListInfo) return false;
    if (prev.disableAnimations !== next.disableAnimations) return false;
    if (prev.onEdit !== next.onEdit) return false;
    if (prev.dispatch !== next.dispatch) return false;
    if (prev.dragHandleProps !== next.dragHandleProps) return false;

    // Compare new props
    if (prev.isClient !== next.isClient) return false;
    if (prev.performanceMode !== next.performanceMode) return false;
    if (prev.now?.getTime() !== next.now?.getTime()) return false;

    // Compare userPreferences (shallow)
    if (prev.userPreferences !== next.userPreferences) {
        if (!prev.userPreferences || !next.userPreferences) return false;
        if (prev.userPreferences.use24HourClock !== next.userPreferences.use24HourClock) return false;
        if (prev.userPreferences.weekStartsOnMonday !== next.userPreferences.weekStartsOnMonday) return false;
    }

    const p = prev.task;
    const n = next.task;

    if (p === n) return true;
    if (p.id !== n.id) return false;
    if (p.title !== n.title) return false;
    if (p.isCompleted !== n.isCompleted) return false;

    const pUpdated = p.updatedAt instanceof Date ? p.updatedAt.getTime() : new Date(p.updatedAt || 0).getTime();
    const nUpdated = n.updatedAt instanceof Date ? n.updatedAt.getTime() : new Date(n.updatedAt || 0).getTime();
    if (pUpdated !== nUpdated) return false;

    if (p.subtaskCount !== n.subtaskCount) return false;
    if (p.completedSubtaskCount !== n.completedSubtaskCount) return false;
    if (p.blockedByCount !== n.blockedByCount) return false;

    if (p.listName !== n.listName) return false;
    if (p.listColor !== n.listColor) return false;
    if (p.listIcon !== n.listIcon) return false;

    if (p.priority !== n.priority) return false;
    if (p.icon !== n.icon) return false;
    if (p.estimateMinutes !== n.estimateMinutes) return false;
    if (p.actualMinutes !== n.actualMinutes) return false;
    if (p.isRecurring !== n.isRecurring) return false;

    // Check if energyLevel or context changed (Fix for memoization bug)
    if (p.energyLevel !== n.energyLevel) return false;
    if (p.context !== n.context) return false;

    const pDue = p.dueDate instanceof Date ? p.dueDate.getTime() : (p.dueDate ? new Date(p.dueDate).getTime() : null);
    const nDue = n.dueDate instanceof Date ? n.dueDate.getTime() : (n.dueDate ? new Date(n.dueDate).getTime() : null);
    if (pDue !== nDue) return false;
    if ((p.dueDatePrecision ?? "day") !== (n.dueDatePrecision ?? "day")) return false;

    const pLabels = p.labels || [];
    const nLabels = n.labels || [];
    if (pLabels.length !== nLabels.length) return false;
    for (let i = 0; i < pLabels.length; i++) {
        if (pLabels[i].id !== nLabels[i].id) return false;
        if (pLabels[i].name !== nLabels[i].name) return false;
        if (pLabels[i].color !== nLabels[i].color) return false;
        if (pLabels[i].icon !== nLabels[i].icon) return false;
    }

    const pSubtasks = p.subtasks || [];
    const nSubtasks = n.subtasks || [];
    if (pSubtasks.length !== nSubtasks.length) return false;
    for (let i = 0; i < pSubtasks.length; i++) {
        if (pSubtasks[i].id !== nSubtasks[i].id) return false;
        if (pSubtasks[i].title !== nSubtasks[i].title) return false;
        if (pSubtasks[i].isCompleted !== nSubtasks[i].isCompleted) return false;
        if (pSubtasks[i].estimateMinutes !== nSubtasks[i].estimateMinutes) return false;
    }

    return true;
}
