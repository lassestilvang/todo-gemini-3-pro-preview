import { describe, it, expect, beforeEach } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useTaskCounts } from "./use-task-counts";
import { useTaskStore } from "@/lib/store/task-store";
import { addDays, subDays } from "date-fns";
import type { Task } from "@/lib/types";

// Mock store
const setStore = (tasks: Partial<Task>[]) => {
    useTaskStore.setState({
        tasks: tasks.reduce((acc, t) => ({ ...acc, [t.id!]: t }), {}),
        isInitialized: true
    });
};

describe("useTaskCounts", () => {
    beforeEach(() => {
        useTaskStore.setState({ tasks: {}, isInitialized: false });
    });

    it("should return zeros for empty store", () => {
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

    it("should count tasks correctly", () => {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const yesterday = subDays(today, 1);

        setStore([
            // Inbox task
            { id: 1, title: "Inbox Task", isCompleted: false, listId: null },
            // Inbox completed (should ignore)
            { id: 2, title: "Done Task", isCompleted: true, listId: null },
            // List task
            { id: 3, title: "List Task", isCompleted: false, listId: 10 },
            // Label task
            { id: 4, title: "Label Task", isCompleted: false, listId: null, labels: [{ id: 5, name: "Tag" }] },
            // Today task
            { id: 6, title: "Today Task", isCompleted: false, listId: null, dueDate: today },
            // Upcoming task
            { id: 7, title: "Future Task", isCompleted: false, listId: null, dueDate: tomorrow },
            // Overdue task (should not be upcoming, but counts as total)
            { id: 8, title: "Past Task", isCompleted: false, listId: null, dueDate: yesterday },
        ]);

        const { result } = renderHook(() => useTaskCounts());

        // Total active: 1, 3, 4, 6, 7, 8 = 6 tasks
        expect(result.current.total).toBe(6);

        // Inbox: 1, 4, 6, 7, 8 (all have listId null) = 5
        expect(result.current.inbox).toBe(5);

        // List 10: Task 3
        expect(result.current.listCounts[10]).toBe(1);

        // Label 5: Task 4
        expect(result.current.labelCounts[5]).toBe(1);

        // Today: Task 6
        expect(result.current.today).toBe(1);

        // Upcoming: Task 7
        expect(result.current.upcoming).toBe(1);
    });

    it("should handle mixed list and labels", () => {
        setStore([
            {
                id: 1,
                title: "Complex Task",
                isCompleted: false,
                listId: 99,
                labels: [{ id: 100, name: "L1" }, { id: 101, name: "L2" }]
            }
        ]);

        const { result } = renderHook(() => useTaskCounts());
        expect(result.current.listCounts[99]).toBe(1);
        expect(result.current.labelCounts[100]).toBe(1);
        expect(result.current.labelCounts[101]).toBe(1);
    });
});
