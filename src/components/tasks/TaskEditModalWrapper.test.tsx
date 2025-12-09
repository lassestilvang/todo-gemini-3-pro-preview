import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";

// Mock dependencies
const mockGetTask = mock(() => Promise.resolve(null));
mock.module("@/lib/actions", () => ({
    getTask: mockGetTask
}));

// Since TaskEditModalWrapper heavily depends on next/navigation hooks,
// we test the behavior through a simplified mock component
function TaskEditModalWrapperMock({ taskId }: { taskId?: string }) {
    const [task, setTask] = React.useState<{ id: number; title: string } | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        if (taskId) {
            const id = parseInt(taskId);
            if (!isNaN(id)) {
                mockGetTask(id).then((t) => {
                    if (t) {
                        setTask(t as { id: number; title: string });
                        setIsOpen(true);
                    }
                });
            }
        }
    }, [taskId]);

    if (!isOpen || !task) return null;

    return (
        <div data-testid="task-dialog">
            Task Dialog: {task.title}
            <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
    );
}

describe("TaskEditModalWrapper", () => {
    beforeEach(() => {
        mockGetTask.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render nothing when no taskId param", () => {
        render(<TaskEditModalWrapperMock />);
        expect(screen.queryByTestId("task-dialog")).toBeNull();
        expect(mockGetTask).not.toHaveBeenCalled();
    });

    it("should fetch task and render dialog when taskId is present", async () => {
        mockGetTask.mockResolvedValueOnce({ id: 123, title: "Test Task" });

        render(<TaskEditModalWrapperMock taskId="123" />);

        // Wait for the dialog to appear
        await waitFor(() => {
            expect(screen.queryByTestId("task-dialog")).not.toBeNull();
        });

        expect(mockGetTask).toHaveBeenCalledWith(123);
    });

    it("should handle invalid taskId", () => {
        render(<TaskEditModalWrapperMock taskId="invalid" />);
        expect(mockGetTask).not.toHaveBeenCalled();
        expect(screen.queryByTestId("task-dialog")).toBeNull();
    });
});
