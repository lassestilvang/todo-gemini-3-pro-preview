import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TimeTrackerWidget } from "./TimeTrackerWidget";
import React from "react";

// Mocks should be targeted and not leak to other tests

import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { db } from "@/db";
import { timeEntries, tasks } from "@/db/schema-sqlite";
import { setMockAuthUser } from "@/test/mocks";

describe("TimeTrackerWidget", () => {
    const userId = "user1";
    const taskId = 1;

    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
        await createTestUser(userId, `${userId}@example.com`);
        setMockAuthUser({ id: userId, email: `${userId}@example.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

        // Insert a task to satisfy foreign key
        await db.insert(tasks).values({
            id: taskId,
            userId,
            title: "Test Task",
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("should render start button with accessible label", async () => {
        render(<TimeTrackerWidget taskId={taskId} estimateMinutes={60} userId={userId} />);

        const startButton = await screen.findByRole("button", { name: /start timer/i });
        expect(startButton).toBeInTheDocument();
    });

    it("should render stop button with accessible label when tracking", async () => {
        // Insert active entry into DB
        await db.insert(timeEntries).values({
            id: 100,
            taskId,
            userId,
            startedAt: new Date(Date.now() - 2000), // 2 seconds ago to safely ensure > 1s elapsed
        });

        render(<TimeTrackerWidget taskId={taskId} estimateMinutes={60} userId={userId} />);

        // Wait for the stop button to appear (implies tracking state is recognized)
        await waitFor(() => {
            const stopButton = screen.getByRole("button", { name: /stop timer/i });
            expect(stopButton).toBeInTheDocument();
        });

        // Optional: Verify time displayed is reasonable (at least 0:01 or 0:02)
        expect(screen.getByText(/0:0[1-9]/)).toBeInTheDocument();
    });

    it("should render edit button with accessible label", async () => {
        const handleEdit = mock(() => { });
        render(<TimeTrackerWidget taskId={1} estimateMinutes={60} userId="user1" onEditClick={handleEdit} />);

        const editButton = screen.getByRole("button", { name: /edit time entry/i });
        expect(editButton).toBeInTheDocument();
    });

    it("should render collapse button with accessible label in compact mode when expanded", async () => {
        render(<TimeTrackerWidget taskId={1} estimateMinutes={60} userId="user1" compact={true} />);

        // Click to expand
        const expandButton = screen.getByRole("button"); // The compact button (might need specific selector if no label yet)
        fireEvent.click(expandButton);

        const collapseButton = screen.getByRole("button", { name: /collapse timer/i });
        expect(collapseButton).toBeInTheDocument();
    });
});
