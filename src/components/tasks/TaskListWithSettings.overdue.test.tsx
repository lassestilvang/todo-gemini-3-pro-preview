import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { setMockAuthUser, DEFAULT_MOCK_USER } from "@/test/mocks";
import React from "react";
import { Task } from "@/lib/types";
import { addDays, subDays } from "date-fns";

let TaskListWithSettings: typeof import("./TaskListWithSettings").TaskListWithSettings;

// Mock store state
let storeTasks: Record<number, Task> = {};

const mockUseTaskStore = mock(() => ({
    tasks: storeTasks,
    setTasks: (newTasks: Task[]) => {
        const next: Record<number, Task> = { ...storeTasks };
        newTasks.forEach(t => next[t.id] = t);
        storeTasks = next;
    },
    initialize: () => {},
    isInitialized: true,
}));

mock.module("@/lib/store/task-store", () => ({
    useTaskStore: mockUseTaskStore
}));

// Mock next/dynamic
mock.module("next/dynamic", () => ({
    __esModule: true,
    default: () => {
        const DynamicComponent = () => null;
        DynamicComponent.displayName = "DynamicComponentMock";
        return DynamicComponent;
    },
}));

// Mock sync
mock.module("@/components/providers/sync-provider", () => ({
    useSync: () => ({ dispatch: () => Promise.resolve() })
}));

// Mock view options popover
mock.module("./ViewOptionsPopover", () => ({
    ViewOptionsPopover: () => <div>View Options</div>
}));

describe("TaskListWithSettings Overdue Logic", () => {
    beforeAll(async () => {
        ({ TaskListWithSettings } = await import("./TaskListWithSettings"));
    });

    beforeEach(() => {
        setMockAuthUser(DEFAULT_MOCK_USER);
        storeTasks = {}; // Reset store
    });

    afterEach(() => {
        cleanup();
    });

    afterAll(() => {
        mock.restore();
    });

    it("should categorize past due tasks as Overdue", async () => {
        const today = new Date();
        const yesterday = subDays(today, 1);
        const tomorrow = addDays(today, 1);

        const tasks: Task[] = [
            {
                id: 1,
                title: "Overdue Task",
                isCompleted: false,
                dueDate: yesterday,
                dueDatePrecision: "day",
                listId: 1,
                priority: "high",
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: DEFAULT_MOCK_USER.id,
            } as Task,
            {
                id: 2,
                title: "Active Task",
                isCompleted: false,
                dueDate: tomorrow,
                dueDatePrecision: "day",
                listId: 1,
                priority: "medium",
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: DEFAULT_MOCK_USER.id,
            } as Task
        ];

        // Pre-populate store
        const tasksMap: Record<number, Task> = {};
        tasks.forEach(t => tasksMap[t.id] = t);
        storeTasks = tasksMap;

        render(<TaskListWithSettings tasks={tasks} viewId="custom" userId={DEFAULT_MOCK_USER.id} />);

        // Use findByText to wait for re-render if any, or just getByText if immediate
        expect(await screen.findByText("Overdue")).toBeDefined();
        expect(await screen.findByText("Overdue Task")).toBeDefined();
        expect(await screen.findByText("Active Task")).toBeDefined();
    });

    it("should NOT show Overdue section if no overdue tasks", async () => {
        const today = new Date();
        const tomorrow = addDays(today, 1);

        const tasks: Task[] = [
            {
                id: 2,
                title: "Active Task",
                isCompleted: false,
                dueDate: tomorrow,
                dueDatePrecision: "day",
                listId: 1,
                priority: "medium",
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: DEFAULT_MOCK_USER.id,
            } as Task
        ];

        // Pre-populate store
        const tasksMap: Record<number, Task> = {};
        tasks.forEach(t => tasksMap[t.id] = t);
        storeTasks = tasksMap;

        render(<TaskListWithSettings tasks={tasks} viewId="custom" userId={DEFAULT_MOCK_USER.id} />);

        expect(await screen.findByText("Active Task")).toBeDefined();
        expect(screen.queryByText("Overdue")).toBeNull();
    });
});
