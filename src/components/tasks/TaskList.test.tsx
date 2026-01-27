import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { TaskList } from "./TaskList";
import React from "react";

describe("TaskList", () => {
    afterEach(() => {
        cleanup();
    });

    const mockTasks = [
        {
            id: 1,
            title: "Task 1",
            isCompleted: false,
            priority: "low" as const,
        },
        {
            id: 2,
            title: "Task 2",
            isCompleted: true,
            priority: "high" as const,
        },
    ];

    it("should render tasks", () => {
        // @ts-expect-error - Tasks don't need all fields for rendering
        render(<TaskList tasks={mockTasks} userId="test_user_123" />);
        expect(screen.getByText("Task 1")).toBeDefined();
        expect(screen.getByText("Task 2")).toBeDefined();
    });

    it("should show empty state when no tasks", () => {
        render(<TaskList tasks={[]} title="Empty List" userId="test_user_123" />);
        expect(screen.getByText(/No tasks found/i)).toBeDefined();
    });

    it("should render title when provided", () => {
        // @ts-expect-error - Tasks don't need all fields for rendering
        render(<TaskList tasks={[]} title="My Tasks" userId="test_user_123" />);
        expect(screen.getByText("My Tasks")).toBeDefined();
    });
});
