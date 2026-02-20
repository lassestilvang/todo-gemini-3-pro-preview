
import { useTaskStore } from "@/lib/store/task-store";
import { useListStore } from "@/lib/store/list-store";
import { useLabelStore } from "@/lib/store/label-store";
import { ActionType } from "./registry";

export function applyOptimisticUpdate(
    type: ActionType,
    args: unknown[],
    tempId: number | undefined
) {
    const taskStore = useTaskStore.getState();
    const listStore = useListStore.getState();
    const labelStore = useLabelStore.getState();
    const payload = args as any;

    if (type === 'createTask') {
        const data = payload[0];
        taskStore.upsertTask({
            id: tempId!,
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            deadline: data.deadline ? new Date(data.deadline) : null,
            isCompleted: false,
            position: 0,
            subtasks: [],
            subtaskCount: 0,
            completedSubtaskCount: 0,
            labels: [],
            priority: data.priority || "none",
            title: data.title
        } as any);
        return;
    }

    if (type === 'updateTask') {
        const [id, , data] = payload;
        const existing = taskStore.tasks[id];
        if (existing) {
            taskStore.upsertTask({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteTask') {
        taskStore.deleteTask(payload[0]);
        return;
    }

    if (type === 'toggleTaskCompletion') {
        const [id, , isCompleted] = payload;
        const existing = taskStore.tasks[id];
        if (existing) {
            taskStore.upsertTask({ ...existing, isCompleted });
        }
        return;
    }

    if (type === 'updateSubtask') {
        const [id, , isCompleted] = payload;
        taskStore.updateSubtaskCompletion(id, isCompleted);
        return;
    }

    if (type === 'createList') {
        const data = payload[0];
        listStore.upsertList({
            id: tempId!,
            name: data.name,
            color: data.color || null,
            icon: data.icon || null,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            position: data.position || 0,
        });
        return;
    }

    if (type === 'updateList') {
        const [id, , data] = payload;
        const existing = listStore.lists[id];
        if (existing) {
            listStore.upsertList({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteList') {
        listStore.deleteList(payload[0]);
        return;
    }

    if (type === 'createLabel') {
        const data = payload[0];
        labelStore.upsertLabel({
            id: tempId!,
            name: data.name,
            color: data.color || null,
            icon: data.icon || null,
            position: data.position || 0,
        });
        return;
    }

    if (type === 'updateLabel') {
        const [id, , data] = payload;
        const existing = labelStore.labels[id];
        if (existing) {
            labelStore.upsertLabel({ ...existing, ...data });
        }
        return;
    }

    if (type === 'deleteLabel') {
        labelStore.deleteLabel(payload[0]);
    }
}
