import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { FocusMode } from "./FocusMode";

// Mock dependencies
mock.module("canvas-confetti", () => ({
    default: mock(() => Promise.resolve())
}));

mock.module("sonner", () => ({
    toast: {
        success: mock(),
        error: mock(),
        info: mock()
    }
}));

// Mock actions
const mockUpdateTask = mock(() => Promise.resolve());
mock.module("@/lib/actions", () => ({
    updateTask: mockUpdateTask
}));

describe("FocusMode", () => {
    const mockTask = {
        id: 1,
        title: "Test Task",
        description: "Test Description",
        priority: "high"
    };
    const mockUserId = "test_user_123";
    const mockOnClose = mock();

    beforeEach(() => {
        mockOnClose.mockClear();
        mockUpdateTask.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render task details", () => {
        render(<FocusMode task={mockTask} userId={mockUserId} onClose={mockOnClose} />);
        expect(screen.getByText("Test Task")).toBeDefined();
        expect(screen.getByText("Test Description")).toBeDefined();
        expect(screen.getByText("Focus Mode")).toBeDefined();
        expect(screen.getByText("25:00")).toBeDefined();
    });

    it("should toggle timer on play/pause click", async () => {
        render(<FocusMode task={mockTask} userId={mockUserId} onClose={mockOnClose} />);

        const startBtn = screen.getByLabelText("Start Timer");
        fireEvent.click(startBtn);

        expect(screen.getByText("Stay focused. You got this!")).toBeDefined();
        expect(screen.getByLabelText("Pause Timer")).toBeDefined();

        const pauseBtn = screen.getByLabelText("Pause Timer");
        fireEvent.click(pauseBtn);
        expect(screen.getByText("Ready to start?")).toBeDefined();
    });

    it("should reset timer", () => {
        render(<FocusMode task={mockTask} userId={mockUserId} onClose={mockOnClose} />);

        // Start timer
        fireEvent.click(screen.getByLabelText("Start Timer"));

        // Reset
        fireEvent.click(screen.getByLabelText("Reset Timer"));
        expect(screen.getByText("25:00")).toBeDefined();
        expect(screen.getByText("Ready to start?")).toBeDefined();
    });

    it("should complete task", async () => {
        render(<FocusMode task={mockTask} userId={mockUserId} onClose={mockOnClose} />);

        await act(async () => {
            fireEvent.click(screen.getByLabelText("Complete Task"));
            // Allow promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(mockUpdateTask).toHaveBeenCalledWith(1, mockUserId, { isCompleted: true });
    });

    it("should close on minimize click", () => {
        render(<FocusMode task={mockTask} userId={mockUserId} onClose={mockOnClose} />);
        fireEvent.click(screen.getByLabelText("Minimize Focus Mode"));
        expect(mockOnClose).toHaveBeenCalled();
    });
});
