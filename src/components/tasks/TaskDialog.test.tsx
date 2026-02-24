import { describe, it, expect, afterEach, mock, beforeEach, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TaskDialog } from "./TaskDialog";
import React from "react";
import { setMockAuthUser } from "@/test/mocks";
import * as syncProvider from "@/components/providers/sync-provider";

// Mock UI components are now handled globally in src/test/setup.tsx via src/test/mocks-ui.tsx

describe("TaskDialog", () => {
    let dispatchSpy: ReturnType<typeof mock>;

    beforeEach(() => {
        // Mock global confirm
        global.confirm = mock(() => true);

        // Spy on useSync hook
        const mockDispatch = mock(() => Promise.resolve({ success: true, data: { id: 1 } }));
        dispatchSpy = mockDispatch;

        spyOn(syncProvider, "useSync").mockReturnValue({
            isOnline: true,
            lastSynced: new Date(),
            sync: mock(() => Promise.resolve()),
            pendingCount: 0,
            dispatch: mockDispatch,
        });

        // Set mock user so setup.tsx auth mock works
        setMockAuthUser({
            id: "test_user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
        });
    });

    afterEach(() => {
        mock.restore();
        cleanup();
    });

    const sampleTask = {
        id: 1,
        title: "Sample Task",
        description: "Sample Description",
        priority: "high" as const,
        userId: "test_user_123",
        isCompleted: false,
        icon: null,
        listId: null,
        dueDate: null,
        deadline: null,
        isRecurring: false,
        recurringRule: null,
        energyLevel: null,
        context: null,
        isHabit: false,
    };

    it("should render in create mode", async () => {
        render(<TaskDialog open={true} userId="test_user_123" />);
        await waitFor(() => {
            expect(screen.getByPlaceholderText("Task Title")).toBeDefined();
        });
    });

    it("should call createTask on save via dispatch", async () => {
        render(<TaskDialog open={true} userId="test_user_123" />);

        const input = screen.getByPlaceholderText("Task Title");
        fireEvent.change(input, { target: { value: "New Task" } });

        const saveButton = screen.getByRole("button", { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(dispatchSpy).toHaveBeenCalledWith("createTask", expect.anything());
        }, { timeout: 3000 });
    });

    it("should call deleteTask on delete via dispatch", async () => {
        // @ts-expect-error - Task object is simplified for testing
        render(<TaskDialog open={true} task={sampleTask} userId="test_user_123" />);

        const deleteBtn = screen.getByText("Delete");
        fireEvent.click(deleteBtn);

        const confirmBtn = await screen.findByText("Confirm Delete");
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(dispatchSpy).toHaveBeenCalledWith("deleteTask", 1, "test_user_123");
        }, { timeout: 3000 });
    });
});
