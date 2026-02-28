import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { create } from "zustand";
import { addDays, subDays } from "date-fns";
import type { Task } from "@/lib/types";
import { resetGlobalStoreMocks, mockUseTaskStore } from "@/test/mocks";

type TaskState = {
    tasks: Record<number, Task>;
    replaceTasks: (tasks: Task[]) => void;
    initialize: () => Promise<void>;
};

let taskStoreHook = create<TaskState>((set) => ({
    tasks: {},
    replaceTasks: (tasks: Task[]) => {
        const map: Record<number, Task> = {};
        for (const t of tasks) map[t.id] = t;
        set({ tasks: map });
    },
    initialize: async () => {},
}));

function resetIsolatedTaskStore() {
    taskStoreHook = create<TaskState>((set) => ({
        tasks: {},
        replaceTasks: (tasks: Task[]) => {
            const map: Record<number, Task> = {};
            for (const t of tasks) map[t.id] = t;
            set({ tasks: map });
        },
        initialize: async () => {},
    }));
    mock.module("@/lib/store/task-store", () => ({
        useTaskStore: taskStoreHook,
    }));
}

describe("useTaskCounts", () => {
    beforeEach(() => {
        resetIsolatedTaskStore();
    });

    afterEach(() => {
        resetGlobalStoreMocks();
        mock.module("@/lib/store/task-store", () => ({
            useTaskStore: mockUseTaskStore,
        }));
    });

    it("should return zeros for empty store", async () => {
        const { useTaskCounts } = await import(`./use-task-counts?case=iso-${Date.now()}`);
        const { result } = renderHook(() => useTaskCounts());
        expect(result.current).toEqual({
            total: 0,
            inbox: 0,
            today: 0,
            upcoming: 0,
            listCounts: {},
            labelCounts: {}
        });
    });

    it("should count tasks correctly", async () => {
        const { useTaskCounts } = await import(`./use-task-counts?case=iso-${Date.now()}`);
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const yesterday = subDays(today, 1);

        const tasks: Partial<Task>[] = [
            { id: 1, title: "Inbox Task", isCompleted: false, listId: null },
            { id: 2, title: "Done Task", isCompleted: true, listId: null },
            { id: 3, title: "List Task", isCompleted: false, listId: 10 },
            { id: 4, title: "Label Task", isCompleted: false, listId: null, labels: [{ id: 5, name: "Tag" }] },
            { id: 6, title: "Today Task", isCompleted: false, listId: null, dueDate: today },
            { id: 7, title: "Future Task", isCompleted: false, listId: null, dueDate: tomorrow },
            { id: 8, title: "Past Task", isCompleted: false, listId: null, dueDate: yesterday },
        ];

        taskStoreHook.getState().replaceTasks(tasks as Task[]);
        const { result } = renderHook(() => useTaskCounts());

        await waitFor(() => {
            expect(result.current.total).toBe(6);
        });

        expect(result.current.inbox).toBe(5);
        expect(result.current.listCounts[10]).toBe(1);
        expect(result.current.labelCounts[5]).toBe(1);
        expect(result.current.today).toBe(1);
        expect(result.current.upcoming).toBe(1);
    });

    it("should handle mixed list and labels", async () => {
        const { useTaskCounts } = await import(`./use-task-counts?case=iso-${Date.now()}`);
        const tasks: Partial<Task>[] = [{
            id: 1,
            title: "Complex Task",
            isCompleted: false,
            listId: 99,
            labels: [{ id: 100, name: "L1" }, { id: 101, name: "L2" }]
        }];

        taskStoreHook.getState().replaceTasks(tasks as Task[]);
        const { result } = renderHook(() => useTaskCounts());
        await waitFor(() => {
            expect(result.current.listCounts[99]).toBe(1);
            expect(result.current.labelCounts[100]).toBe(1);
            expect(result.current.labelCounts[101]).toBe(1);
        });
    });
});
