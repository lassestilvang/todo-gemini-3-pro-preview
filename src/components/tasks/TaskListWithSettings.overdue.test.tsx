import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { setMockAuthUser, DEFAULT_MOCK_USER, mockUseTaskStore } from "@/test/mocks";
import React from "react";
import { Task } from "@/lib/types";
import { addDays, subDays } from "date-fns";
import { TaskListWithSettings } from "./TaskListWithSettings";
import * as ViewOptionsPopoverModule from "./ViewOptionsPopover";

// Mock store state
let storeTasks: Record<number, Task> = {};

describe("TaskListWithSettings Overdue Logic", () => {
    beforeEach(() => {
        cleanup();
        setMockAuthUser(DEFAULT_MOCK_USER);
        storeTasks = {}; // Reset store

        mockUseTaskStore.mockImplementation(() => ({
            tasks: storeTasks,
            setTasks: (newTasks: Task[]) => {
                const next: Record<number, Task> = { ...storeTasks };
                newTasks.forEach(t => next[t.id] = t);
                storeTasks = next;
            },
            initialize: mock(() => Promise.resolve()),
            isInitialized: true,
            replaceTasks: mock(() => {}),
            upsertTasks: mock(() => {}),
            upsertTask: mock(() => {}),
            deleteTasks: mock(() => {}),
            deleteTask: mock(() => {}),
            updateSubtaskCompletion: mock(() => {}),
            getTaskBySubtaskId: mock(() => undefined),
            subtaskIndex: {},
        }));

        spyOn(ViewOptionsPopoverModule, "ViewOptionsPopover").mockReturnValue(<div>View Options</div>);
    });

    afterEach(() => {
        cleanup();
        mockUseTaskStore.mockRestore();
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
