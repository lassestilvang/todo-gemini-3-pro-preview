export interface Subtask {
    id: number;
    parentId: number | null;
    title: string;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
}

export interface Task {
    id: number;
    title: string;
    description: string | null;
    icon?: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    deadline: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
    position: number;
    actualMinutes: number | null;
    isRecurring: boolean | null;
    listId: number | null;
    listName?: string | null;
    listColor?: string | null;
    listIcon?: string | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
    isHabit: boolean | null;
    labels?: Array<{ id: number; name: string; color: string | null; icon: string | null }>;
    blockedByCount?: number;
    subtasks?: Subtask[];
    subtaskCount?: number;
    completedSubtaskCount?: number;
    updatedAt?: Date | string | null;
    createdAt: Date | string; // Made required as per schema
}
