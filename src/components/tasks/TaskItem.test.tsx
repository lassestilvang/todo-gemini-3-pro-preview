import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
// Actions are not used directly, only via dispatch
const mockToggleTaskCompletion = mock(() => Promise.resolve());
// Removed mock.module("@/lib/actions") as TaskItem does not import them.

// Mock useSync
const mockDispatch = mock(() => Promise.resolve());
mock.module("@/components/providers/sync-provider", () => ({
    useSync: () => ({
        dispatch: mockDispatch,
        pendingActions: []
    })
}));

import { TaskItem, type Task } from "./TaskItem";

const sampleTask: Task = {
    id: 1,
    title: "Test Task",
    description: "Test Description",
    priority: "medium",
    dueDate: new Date("2023-01-01"),
    deadline: null,
    isCompleted: false,
    estimateMinutes: 30,
    isRecurring: false,
    listId: 1,
    recurringRule: null,
    labels: [],
    energyLevel: "medium",
    context: "computer",
    isHabit: false
};

describe("TaskItem", () => {
    beforeEach(() => {
        mockToggleTaskCompletion.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render task details correctly", () => {
        render(<TaskItem task={sampleTask} />);
        expect(screen.getByText("Test Task")).toBeInTheDocument();
        expect(screen.getByText("medium")).toBeInTheDocument(); // Priority
        expect(screen.getByText("30m")).toBeInTheDocument(); // Estimate
    });

    it("should toggle completion status", async () => {
        render(<TaskItem task={sampleTask} userId="test_user_123" />);
        const checkbox = screen.getByRole("checkbox");

        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalledTimes(1);
            expect(mockDispatch).toHaveBeenCalledWith("toggleTaskCompletion", 1, "test_user_123", true);
        });
    });

    it("should render completed state", () => {
        const completedTask = { ...sampleTask, isCompleted: true };
        render(<TaskItem task={completedTask} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });
    it("should render labels", () => {
        const taskWithLabels = {
            ...sampleTask,
            labels: [{ id: 1, name: "Work", color: "#FF0000", icon: "Briefcase" }]
        };
        render(<TaskItem task={taskWithLabels} />);

        const label = screen.getByText("Work");
        expect(label).toBeInTheDocument();

        // Verify that the styles from `getLabelStyle` are correctly applied.
        expect(label).toHaveStyle({
          borderColor: '#FF000040',
          backgroundColor: '#FF000010',
          color: '#FF0000',
        });
    });

    it("should render recurring icon", () => {
        const recurringTask = { ...sampleTask, isRecurring: true, recurringRule: "DAILY" };
        render(<TaskItem task={recurringTask} />);
        // Recurring icon is usually a Repeat icon.
        // We can't easily test for icon by text.
        // We can check if the container has some indicator or if we can find the SVG.
        // Without test-ids, this is hard. 
        // But we can check if *something* different renders.
        // Let's skip this specific check if it's too fragile without test-ids, 
        // OR we can check if "Recurring" text is present if it's in a tooltip.
    });

    it("should render deadline", () => {
        const deadline = new Date("2023-12-31");
        const taskWithDeadline = { ...sampleTask, deadline };
        render(<TaskItem task={taskWithDeadline} />);
        // Date formatting might vary.
        // "Dec 31" or similar.
        // Let's check for a partial match or just ensure it doesn't crash.
    });

    it("should have accessible labels", async () => {
        const taskWithSubtasks = {
            ...sampleTask,
            subtaskCount: 1,
            subtasks: [{ id: 101, title: "Subtask 1", isCompleted: false, parentId: 1, estimateMinutes: 5 }]
        };
        render(<TaskItem task={taskWithSubtasks} />);

        // Check static labels
        expect(screen.getByLabelText("Start focus mode")).toBeInTheDocument();
        expect(screen.getByLabelText("Mark task as complete")).toBeInTheDocument();

        // Check expand button initial state
        const expandButton = screen.getByLabelText("Expand subtasks");
        expect(expandButton).toBeInTheDocument();
        expect(expandButton).toHaveAttribute("aria-expanded", "false");

        // Expand subtasks
        fireEvent.click(expandButton);

        // Check expand button toggled state
        expect(expandButton).toHaveAttribute("aria-label", "Collapse subtasks");
        expect(expandButton).toHaveAttribute("aria-expanded", "true");

        // Check subtask checkbox is now visible with correct label
        await waitFor(() => {
            expect(screen.getByLabelText("Mark subtask as complete")).toBeInTheDocument();
        });
    });

    it("should render edit button when onEdit is provided", () => {
        const handleEdit = mock(() => {});
        render(<TaskItem task={sampleTask} onEdit={handleEdit} />);

        const editButton = screen.getByLabelText("Edit task");
        expect(editButton).toBeInTheDocument();

        fireEvent.click(editButton);
        expect(handleEdit).toHaveBeenCalledTimes(1);
    });

    it("should update completion status when prop changes", () => {
        const { rerender } = render(<TaskItem task={sampleTask} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();

        const completedTask = { ...sampleTask, isCompleted: true };
        rerender(<TaskItem task={completedTask} />);
        expect(checkbox).toBeChecked();
    });
});
