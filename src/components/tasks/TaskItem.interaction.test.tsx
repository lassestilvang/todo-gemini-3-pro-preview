import { render, screen, fireEvent } from "@testing-library/react";
import { TaskItem } from "./TaskItem";
import { Task } from "@/lib/types";
import { jest, describe, it, expect, beforeEach, afterEach } from "bun:test";

// Mock minimal task
const mockTask: Task = {
    id: 1,
    title: "Test Task",
    isCompleted: false,
    priority: "medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "user1",
    subtasks: [],
    labels: [],
    blockedByCount: 0,
    listId: null,
};

describe("TaskItem Interaction", () => {
    const originalGetSelection = window.getSelection;

    beforeEach(() => {
        // Reset selection before each test
        window.getSelection = jest.fn().mockReturnValue({
            toString: () => ""
        });
    });

    afterEach(() => {
        window.getSelection = originalGetSelection;
    });

    it("calls onEdit when the row is clicked", () => {
        const handleEdit = jest.fn();
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const row = screen.getByTestId("task-item");

        expect(row.className).toContain("cursor-pointer");

        fireEvent.click(row);

        expect(handleEdit).toHaveBeenCalledWith(mockTask);
    });

    it("does not trigger onEdit when clicking checkbox", () => {
        const handleEdit = jest.fn();
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const checkbox = screen.getByRole("checkbox"); // This finds the button/input with role checkbox

        fireEvent.click(checkbox);

        expect(handleEdit).not.toHaveBeenCalled();
    });

    it("does not trigger onEdit when text is selected", () => {
        const handleEdit = jest.fn();
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const row = screen.getByTestId("task-item");

        // Simulate text selection
        window.getSelection = jest.fn().mockReturnValue({
            toString: () => "Some text"
        });

        fireEvent.click(row);

        expect(handleEdit).not.toHaveBeenCalled();
    });

    it("does not have cursor-pointer if onEdit is not provided", () => {
        render(<TaskItem task={mockTask} />);
        const row = screen.getByTestId("task-item");
        expect(row.className).not.toContain("cursor-pointer");
        expect(row.className).toContain("cursor-default");
    });
});
