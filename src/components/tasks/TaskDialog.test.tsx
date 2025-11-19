import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TaskDialog } from "./TaskDialog";
import React from "react";

// Mock all actions
const mockCreateTask = mock(() => Promise.resolve());
const mockUpdateTask = mock(() => Promise.resolve());
const mockDeleteTask = mock(() => Promise.resolve());
const mockGetLists = mock(() => Promise.resolve([]));
const mockGetLabels = mock(() => Promise.resolve([]));
const mockGetSubtasks = mock(() => Promise.resolve([]));
const mockCreateSubtask = mock(() => Promise.resolve());
const mockUpdateSubtask = mock(() => Promise.resolve());
const mockDeleteSubtask = mock(() => Promise.resolve());
const mockGetReminders = mock(() => Promise.resolve([]));
const mockCreateReminder = mock(() => Promise.resolve());
const mockDeleteReminder = mock(() => Promise.resolve());
const mockGetTaskLogs = mock(() => Promise.resolve([]));

mock.module("@/lib/actions", () => ({
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    getLists: mockGetLists,
    getLabels: mockGetLabels,
    getSubtasks: mockGetSubtasks,
    createSubtask: mockCreateSubtask,
    updateSubtask: mockUpdateSubtask,
    deleteSubtask: mockDeleteSubtask,
    getReminders: mockGetReminders,
    createReminder: mockCreateReminder,
    deleteReminder: mockDeleteReminder,
    getTaskLogs: mockGetTaskLogs
}));

const sampleTask = {
    id: 1,
    title: "Existing Task",
    description: "Description",
    priority: "medium" as const,
    listId: 1,
    dueDate: null,
    deadline: null,
    isRecurring: false,
    recurringRule: null,
    labels: []
};

describe("TaskDialog", () => {
    beforeEach(() => {
        mockCreateTask.mockClear();
        mockUpdateTask.mockClear();
        mockDeleteTask.mockClear();
        mockGetLists.mockClear();
        mockGetLabels.mockClear();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render in create mode", async () => {
        render(<TaskDialog open={true} />);
        expect(screen.getByText("New Task")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Task Title")).toBeInTheDocument();
    });

    it("should render in edit mode", async () => {
        render(<TaskDialog open={true} task={sampleTask} />);
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    });

    it("should create task on submit", async () => {
        render(<TaskDialog open={true} />);

        fireEvent.change(screen.getByPlaceholderText("Task Title"), { target: { value: "New Task" } });
        fireEvent.click(screen.getByText("Save"));

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalledTimes(1);
            expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
                title: "New Task"
            }));
        });
    });

    it("should update task on submit", async () => {
        render(<TaskDialog open={true} task={sampleTask} />);

        fireEvent.change(screen.getByDisplayValue("Existing Task"), { target: { value: "Updated Task" } });
        fireEvent.click(screen.getByText("Save"));

        await waitFor(() => {
            expect(mockUpdateTask).toHaveBeenCalledTimes(1);
            expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
                title: "Updated Task"
            }));
        });
    });

    it("should delete task", async () => {
        // Mock confirm dialog
        global.confirm = () => true;

        render(<TaskDialog open={true} task={sampleTask} />);

        fireEvent.click(screen.getByText("Delete"));

        await waitFor(() => {
            expect(mockDeleteTask).toHaveBeenCalledWith(1);
        });
    });
});
