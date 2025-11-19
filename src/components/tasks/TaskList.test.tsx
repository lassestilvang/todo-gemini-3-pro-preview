import { describe, it, expect, afterEach, mock } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TaskList } from "./TaskList";
import { Task } from "./TaskItem";
import React from "react";

// Mock actions used by children
const mockToggleTaskCompletion = mock(() => Promise.resolve());
const mockGetLists = mock(() => Promise.resolve([]));
const mockGetLabels = mock(() => Promise.resolve([]));
const mockGetSubtasks = mock(() => Promise.resolve([]));
const mockGetReminders = mock(() => Promise.resolve([]));
const mockGetTaskLogs = mock(() => Promise.resolve([]));

mock.module("@/lib/actions", () => ({
    toggleTaskCompletion: mockToggleTaskCompletion,
    getLists: mockGetLists,
    getLabels: mockGetLabels,
    getSubtasks: mockGetSubtasks,
    getReminders: mockGetReminders,
    getTaskLogs: mockGetTaskLogs,
    createTask: mock(() => Promise.resolve()),
    updateTask: mock(() => Promise.resolve()),
    deleteTask: mock(() => Promise.resolve()),
    createSubtask: mock(() => Promise.resolve()),
    updateSubtask: mock(() => Promise.resolve()),
    deleteSubtask: mock(() => Promise.resolve()),
    createReminder: mock(() => Promise.resolve()),
    deleteReminder: mock(() => Promise.resolve())
}));

const sampleTasks: Task[] = [
    {
        id: 1,
        title: "Task 1",
        description: null,
        priority: "high",
        dueDate: null,
        deadline: null,
        isCompleted: false,
        estimateMinutes: null,
        isRecurring: false,
        listId: 1,
        recurringRule: null,
        labels: []
    },
    {
        id: 2,
        title: "Task 2",
        description: null,
        priority: "low",
        dueDate: null,
        deadline: null,
        isCompleted: true,
        estimateMinutes: null,
        isRecurring: false,
        listId: 1,
        recurringRule: null,
        labels: []
    }
];

describe("TaskList", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render tasks", () => {
        render(<TaskList tasks={sampleTasks} title="My Tasks" />);
        expect(screen.getByText("My Tasks")).toBeInTheDocument();
        expect(screen.getByText("Task 1")).toBeInTheDocument();
        expect(screen.getByText("Task 2")).toBeInTheDocument();
    });

    it("should render empty state when no tasks", () => {
        render(<TaskList tasks={[]} />);
        expect(screen.getByText("No tasks found")).toBeInTheDocument();
        expect(screen.getByText("Create one?")).toBeInTheDocument();
    });

    it("should open dialog on add task click", async () => {
        render(<TaskList tasks={sampleTasks} />);
        fireEvent.click(screen.getByText("Add Task"));
        expect(screen.getByText("New Task")).toBeInTheDocument();
    });

    it("should open dialog on empty state create click", async () => {
        render(<TaskList tasks={[]} />);
        fireEvent.click(screen.getByText("Create one?"));
        expect(screen.getByText("New Task")).toBeInTheDocument();
    });
});
