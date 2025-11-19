import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TaskItem, type Task } from "./TaskItem";
import React from "react";

// Mock the actions
const mockToggleTaskCompletion = mock(() => Promise.resolve());
mock.module("@/lib/actions", () => ({
    toggleTaskCompletion: mockToggleTaskCompletion
}));

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
    labels: []
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

    it("should toggle completion status", () => {
        render(<TaskItem task={sampleTask} />);
        const checkbox = screen.getByRole("checkbox");

        fireEvent.click(checkbox);

        expect(mockToggleTaskCompletion).toHaveBeenCalledTimes(1);
        expect(mockToggleTaskCompletion).toHaveBeenCalledWith(1, true);
    });

    it("should render completed state", () => {
        const completedTask = { ...sampleTask, isCompleted: true };
        render(<TaskItem task={completedTask} />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });
});
