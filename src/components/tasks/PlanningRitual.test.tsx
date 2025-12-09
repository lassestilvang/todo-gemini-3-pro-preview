import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { PlanningRitual } from "./PlanningRitual";
import React from "react";

// Mock actions
const mockGetTasks = mock(() => Promise.resolve([
    { id: 1, title: "Task 1", isCompleted: false, priority: "high" },
    { id: 2, title: "Task 2", isCompleted: true, priority: "medium" }
]));

mock.module("@/lib/actions", () => ({
    getTasks: mockGetTasks
}));

describe("PlanningRitual", () => {
    const mockUserId = "test_user_123";

    beforeEach(() => {
        mockGetTasks.mockClear();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render morning ritual", async () => {
        render(<PlanningRitual open={true} onOpenChange={() => { }} type="morning" userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Morning Planning Ritual")).toBeInTheDocument();
            expect(screen.getByText("Today's Tasks (2)")).toBeInTheDocument();
            expect(screen.getByText("Task 1")).toBeInTheDocument();
        });
    });

    it("should render evening ritual", async () => {
        render(<PlanningRitual open={true} onOpenChange={() => { }} type="evening" userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Evening Review")).toBeInTheDocument();
            expect(screen.getByText("1 / 2")).toBeInTheDocument(); // Progress
        });
    });

    it("should step through morning ritual", async () => {
        render(<PlanningRitual open={true} onOpenChange={() => { }} type="morning" userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Set Priorities")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Set Priorities"));

        await waitFor(() => {
            expect(screen.getByText("What are your top 3 priorities today?")).toBeInTheDocument();
        });

        const inputs = screen.getAllByPlaceholderText(/priority.../);
        fireEvent.change(inputs[0], { target: { value: "Priority 1" } });

        fireEvent.click(screen.getByText("Start Your Day! 🚀"));
    });

    it("should step through evening ritual", async () => {
        render(<PlanningRitual open={true} onOpenChange={() => { }} type="evening" userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Reflect on Your Day")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Reflect on Your Day"));

        await waitFor(() => {
            expect(screen.getByText("Daily Reflection")).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText(/What went well today?/);
        fireEvent.change(textarea, { target: { value: "Good day" } });

        fireEvent.click(screen.getByText("Finish Day 🌙"));
    });

    it("should handle empty tasks", async () => {
        mockGetTasks.mockResolvedValueOnce([]);
        render(<PlanningRitual open={true} onOpenChange={() => { }} type="morning" userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No tasks scheduled for today")).toBeInTheDocument();
        });
    });
});
