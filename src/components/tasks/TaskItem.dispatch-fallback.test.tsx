import type React from "react";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import type { Task } from "@/lib/types";
import { mockDispatch, mockUseOptionalSyncActions, mockUseSync, mockUseSyncActions } from "@/test/mocks";

// Re-apply mock.module locally using global mocks to ensure it takes effect
// This avoids creating new mock instances (leakage) while fixing module resolution
// mock.module("@/components/providers/sync-provider", () => ({
//    useSync: mockUseSync,
//    useSyncActions: mockUseSyncActions,
//    useOptionalSyncActions: mockUseOptionalSyncActions
// }));

const { TaskItem } = await import("./TaskItem");

const task: Task = {
    id: 99,
    title: "Habit task",
    isCompleted: false,
    priority: "none",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "user-1",
    labels: [],
    subtasks: [],
    listId: null,
};

describe("TaskItem dispatch fallback", () => {
    beforeEach(() => {
        mockDispatch.mockClear();
        mockUseOptionalSyncActions.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("uses sync provider dispatch when dispatch prop is omitted", async () => {
        // Ensure the mock returns what we expect
        mockUseOptionalSyncActions.mockReturnValue({ dispatch: mockDispatch });

        render(<TaskItem task={task} userId="user-1" />);

        expect(mockUseOptionalSyncActions).toHaveBeenCalled();
        
        fireEvent.click(screen.getByRole("checkbox"));

        await waitFor(() => {
            expect(mockDispatch).toHaveBeenCalledWith("toggleTaskCompletion", 99, "user-1", true);
        });
    });
});
