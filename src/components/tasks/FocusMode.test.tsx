import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { FocusMode } from "./FocusMode";
import { db, tasks } from "@/db";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { eq } from "drizzle-orm";

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

describe("FocusMode", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
        setMockAuthUser({ id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User", profilePictureUrl: null });
    });

    afterEach(() => {
        cleanup();
    });

    it("should render task details", async () => {
        render(
            <FocusMode
                task={{ id: 1, title: "Focus Task", description: "Desc", priority: "high" }}
                userId="user-1"
                onClose={() => { }}
            />
        );
        expect(screen.getByText("Focus Task")).toBeInTheDocument();
        expect(screen.getByText("Desc")).toBeInTheDocument();
        expect(screen.getByText("Focus Mode")).toBeInTheDocument();
        expect(screen.getByText("25:00")).toBeInTheDocument();
    });

    it("should toggle timer on play/pause click", async () => {
        render(<FocusMode task={{ id: 1, title: "Focus Task", description: "Desc", priority: "high" }} userId="user-1" onClose={() => { }} />);

        const startBtn = screen.getByLabelText("Start Timer");
        fireEvent.click(startBtn);

        expect(screen.getByText("Stay focused. You got this!")).toBeDefined();
        expect(screen.getByLabelText("Pause Timer")).toBeDefined();

        const pauseBtn = screen.getByLabelText("Pause Timer");
        fireEvent.click(pauseBtn);
        expect(screen.getByText("Ready to start?")).toBeDefined();
    });

    it("should reset timer", () => {
        render(<FocusMode task={{ id: 1, title: "Focus Task", description: "Desc", priority: "high" }} userId="user-1" onClose={() => { }} />);

        // Start timer
        fireEvent.click(screen.getByLabelText("Start Timer"));

        // Reset
        fireEvent.click(screen.getByLabelText("Reset Timer"));
        expect(screen.getByText("25:00")).toBeInTheDocument();
        expect(screen.getByText("Ready to start?")).toBeInTheDocument();
    });

    it("should complete task", async () => {
        await db.insert(tasks).values({
            id: 2, title: "Task To Complete", isCompleted: false, listId: 1, userId: "user-1"
        } as any);

        const onClose = mock();
        render(<FocusMode task={{ id: 2, title: "Task To Complete", description: "Desc", priority: "high" }} userId="user-1" onClose={onClose} />);

        await act(async () => {
            fireEvent.click(screen.getByLabelText("Complete Task"));
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Verify DB update
        const task = await db.select().from(tasks).where(eq(tasks.id, 2));
        expect(task[0].isCompleted).toBe(true);
        expect(onClose).toHaveBeenCalled();
    });

    it("should close on minimize click", () => {
        const onClose = mock();
        render(<FocusMode task={{ id: 1, title: "Focus Task", description: "Desc", priority: "high" }} userId="user-1" onClose={onClose} />);
        fireEvent.click(screen.getByLabelText("Minimize Focus Mode"));
        expect(onClose).toHaveBeenCalled();
    });
});
