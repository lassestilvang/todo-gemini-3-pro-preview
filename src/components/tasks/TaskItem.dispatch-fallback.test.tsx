import type React from "react";
import { describe, it, expect, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Task } from "@/lib/types";

const fallbackDispatch = mock(() => Promise.resolve({ success: true, data: null }));

mock.module("@/components/providers/sync-provider", () => ({
    useSync: () => ({ dispatch: fallbackDispatch }),
    useOptionalSync: () => ({ dispatch: fallbackDispatch }),
    SyncProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
    it("uses sync provider dispatch when dispatch prop is omitted", async () => {
        render(<TaskItem task={task} userId="user-1" />);

        fireEvent.click(screen.getByRole("checkbox"));

        await waitFor(() => {
            expect(fallbackDispatch).toHaveBeenCalledWith("toggleTaskCompletion", 99, "user-1", true);
        });
    });
});
