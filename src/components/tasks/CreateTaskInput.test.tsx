import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CreateTaskInput } from "./CreateTaskInput";
import React from "react";

// Mock the actions
const mockCreateTask = mock(() => Promise.resolve());
mock.module("@/lib/actions", () => ({
    createTask: mockCreateTask
}));

describe("CreateTaskInput", () => {
    beforeEach(() => {
        mockCreateTask.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render input", () => {
        render(<CreateTaskInput />);
        expect(screen.getByPlaceholderText(/Add a task/i)).toBeInTheDocument();
    });

    it("should expand on focus", () => {
        render(<CreateTaskInput />);
        const input = screen.getByPlaceholderText(/Add a task/i);
        fireEvent.focus(input);
        expect(screen.getByText("Add Task")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should create task on submit", async () => {
        render(<CreateTaskInput />);
        const input = screen.getByPlaceholderText(/Add a task/i);

        // Focus to expand
        fireEvent.focus(input);

        // Type title
        fireEvent.change(input, { target: { value: "New Task" } });

        // Click Add Task
        const addButton = screen.getByText("Add Task");
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalledTimes(1);
            expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
                title: "New Task",
                priority: "none"
            }));
        });
    });

    it("should not create task if title is empty", async () => {
        render(<CreateTaskInput />);
        const input = screen.getByPlaceholderText(/Add a task/i);
        fireEvent.focus(input);

        const addButton = screen.getByText("Add Task");
        // Button should be disabled
        expect(addButton).toBeDisabled();

        fireEvent.click(addButton);
        expect(mockCreateTask).not.toHaveBeenCalled();
    });
});
