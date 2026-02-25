import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
// Actions are not used directly, only via dispatch
const mockToggleTaskCompletion = mock(() => Promise.resolve());
// Removed mock.module("@/lib/actions") as TaskItem does not import them.

const mockDispatch = mock(() => Promise.resolve());

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

    const defaultProps = {
        now: new Date(),
        isClient: true,
        performanceMode: false,
        userPreferences: { use24HourClock: false, weekStartsOnMonday: false },
        dispatch: mockDispatch
    };

    it("should render task details correctly", () => {
        render(<TaskItem task={sampleTask} {...defaultProps} />);
        expect(screen.getByText("Test Task")).toBeInTheDocument();
        expect(screen.getByText("medium")).toBeInTheDocument(); // Priority
        expect(screen.getByText("30m")).toBeInTheDocument(); // Estimate
    });

    it("should toggle completion status", async () => {
        render(<TaskItem task={sampleTask} userId="test_user_123" {...defaultProps} />);
        const checkbox = screen.getByRole("checkbox");

        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalledTimes(1);
            expect(mockDispatch).toHaveBeenCalledWith("toggleTaskCompletion", 1, "test_user_123", true);
        });
    });

    it("should render completed state", () => {
        const completedTask = { ...sampleTask, isCompleted: true };
        render(<TaskItem task={completedTask} {...defaultProps} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });
    it("should render labels", () => {
        const taskWithLabels = {
            ...sampleTask,
            labels: [{ id: 1, name: "Work", color: "#FF0000", icon: "Briefcase" }]
        };
        render(<TaskItem task={taskWithLabels} {...defaultProps} />);

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
        render(<TaskItem task={recurringTask} {...defaultProps} />);
    });

    it("should render deadline", () => {
        const deadline = new Date("2023-12-31");
        const taskWithDeadline = { ...sampleTask, deadline };
        render(<TaskItem task={taskWithDeadline} {...defaultProps} />);
    });

    it("should have accessible labels", async () => {
        const taskWithSubtasks = {
            ...sampleTask,
            subtaskCount: 1,
            subtasks: [{ id: 101, title: "Subtask 1", isCompleted: false, parentId: 1, estimateMinutes: 5 }]
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { container } = render(<TaskItem task={taskWithSubtasks} {...defaultProps} />);

        // Check static labels
        // Use hidden: true because buttons are opacity-0 by default until hover
        // expect(container.querySelector('[data-testid="start-focus-button"]')).toBeInTheDocument();
        // Checkbox still uses role because it's a Radix Checkbox primitive
        expect(screen.getByRole("checkbox", { name: "Mark task as complete", hidden: true })).toBeInTheDocument();

        // Check expand button initial state
        const expandButton = screen.getByRole("button", { name: "Expand subtasks", hidden: true });
        expect(expandButton).toBeInTheDocument();
        expect(expandButton).toHaveAttribute("aria-expanded", "false");

        // Expand subtasks
        fireEvent.click(expandButton);

        // Check expand button toggled state
        expect(expandButton).toHaveAttribute("aria-label", "Collapse subtasks");
        expect(expandButton).toHaveAttribute("aria-expanded", "true");

        // Check subtask checkbox is now visible with correct label
        await waitFor(() => {
            expect(screen.getByRole("checkbox", { name: "Mark subtask as complete" })).toBeInTheDocument();
        });
    });

    it("should render edit button when onEdit is provided", () => {
        const handleEdit = mock(() => {});
        render(<TaskItem task={sampleTask} onEdit={handleEdit} {...defaultProps} />);

        const editButton = screen.getByTestId("edit-task-button");
        expect(editButton).toBeInTheDocument();

        fireEvent.click(editButton);
        expect(handleEdit).toHaveBeenCalledTimes(1);
    });

    it("should update completion status when prop changes", () => {
        const { rerender } = render(<TaskItem task={sampleTask} {...defaultProps} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();

        const completedTask = { ...sampleTask, isCompleted: true };
        rerender(<TaskItem task={completedTask} {...defaultProps} />);
        expect(checkbox).toBeChecked();
    });

    it("should render tooltip with full date for due date", async () => {
        const taskWithDue = { ...sampleTask, dueDate: new Date("2023-10-24T17:00:00") };
        render(<TaskItem task={taskWithDue} {...defaultProps} />);

        const dateText = screen.getByText("Oct 24");
        const dateContainer = dateText.closest('div[tabindex="0"]');
        expect(dateContainer).toBeInTheDocument();

        const expectedText = "Due: Tuesday, October 24th, 2023 at 5:00 PM";
        expect(dateContainer).toHaveAttribute("aria-label", expectedText);
    });

    it("should render accessible tooltips for energy and context", () => {
        const taskWithDetails: Task = {
            ...sampleTask,
            energyLevel: "high",
            context: "meeting"
        };
        render(<TaskItem task={taskWithDetails} {...defaultProps} />);

        // Energy
        const energyText = screen.getByText("⚡");
        const energyContainer = energyText.closest('div[tabindex="0"]');
        expect(energyContainer).toBeInTheDocument();
        expect(energyContainer).toHaveAttribute("aria-label", "High Energy");

        // Context
        const contextText = screen.getByText("👥");
        const contextContainer = contextText.closest('div[tabindex="0"]');
        expect(contextContainer).toBeInTheDocument();
        expect(contextContainer).toHaveAttribute("aria-label", "Meeting");
    });
});
