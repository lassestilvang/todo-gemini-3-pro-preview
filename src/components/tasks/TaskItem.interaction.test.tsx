import { render, screen, fireEvent } from "@testing-library/react";
import { TaskItem } from "./TaskItem";
import { Task } from "@/lib/types";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

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
        // @ts-expect-error - Mocking read-only window.getSelection
        window.getSelection = mock(() => ({
            toString: () => "",
            anchorNode: null,
            focusNode: null,
            isCollapsed: true,
            rangeCount: 0,
            getRangeAt: () => null,
            removeAllRanges: () => {},
            addRange: () => {},
            removeRange: () => {},
            containsNode: () => false,
            selectAllChildren: () => {},
            extend: () => {},
            collapse: () => {},
            collapseToStart: () => {},
            collapseToEnd: () => {},
            deleteFromDocument: () => {},
            type: "None",
        }));
    });

    afterEach(() => {
        window.getSelection = originalGetSelection;
    });

    it("calls onEdit when the row is clicked", () => {
        const handleEdit = mock(() => {});
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const row = screen.getByTestId("task-item");

        expect(row.className).toContain("cursor-pointer");

        fireEvent.click(row);

        expect(handleEdit).toHaveBeenCalledWith(mockTask);
    });

    it("does not trigger onEdit when clicking checkbox", () => {
        const handleEdit = mock(() => {});
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const checkbox = screen.getByRole("checkbox"); // This finds the button/input with role checkbox

        fireEvent.click(checkbox);

        expect(handleEdit).not.toHaveBeenCalled();
    });

    it("does not trigger onEdit when text is selected", () => {
        const handleEdit = mock(() => {});
        render(<TaskItem task={mockTask} onEdit={handleEdit} />);

        const row = screen.getByTestId("task-item");

        // Simulate text selection
        // @ts-expect-error - Mocking read-only window.getSelection
        window.getSelection = mock(() => ({
            toString: () => "Some text",
            anchorNode: null,
            focusNode: null,
            isCollapsed: false,
            rangeCount: 1,
            getRangeAt: () => null,
            removeAllRanges: () => {},
            addRange: () => {},
            removeRange: () => {},
            containsNode: () => false,
            selectAllChildren: () => {},
            extend: () => {},
            collapse: () => {},
            collapseToStart: () => {},
            collapseToEnd: () => {},
            deleteFromDocument: () => {},
            type: "Range",
        }));

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
