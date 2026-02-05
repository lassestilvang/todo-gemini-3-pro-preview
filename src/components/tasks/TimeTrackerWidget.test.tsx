import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TimeTrackerWidget } from "./TimeTrackerWidget";
import React from "react";

// Mock server actions
const mockStartTimeEntry = mock(() => Promise.resolve({ success: true, data: { id: 100 } }));
const mockStopTimeEntry = mock(() => Promise.resolve({ success: true, data: { id: 100 } }));
const mockGetActiveTimeEntry = mock(() => Promise.resolve({ success: true, data: null }));

mock.module("@/lib/actions", () => ({
    startTimeEntry: mockStartTimeEntry,
    stopTimeEntry: mockStopTimeEntry,
    getActiveTimeEntry: mockGetActiveTimeEntry,
}));

describe("TimeTrackerWidget", () => {
    beforeEach(() => {
        mockStartTimeEntry.mockClear();
        mockStopTimeEntry.mockClear();
        mockGetActiveTimeEntry.mockClear();
        // Default to no active entry
        mockGetActiveTimeEntry.mockResolvedValue({ success: true, data: null });
    });

    afterEach(() => {
        cleanup();
    });

    it("should render start button with accessible label", async () => {
        render(<TimeTrackerWidget taskId={1} estimateMinutes={60} userId="user1" />);

        // Wait for active entry check
        await waitFor(() => {
            expect(mockGetActiveTimeEntry).toHaveBeenCalled();
        });

        const startButton = screen.getByRole("button", { name: /start timer/i });
        expect(startButton).toBeInTheDocument();
    });

    it("should render stop button with accessible label when tracking", async () => {
        // Mock active entry
        mockGetActiveTimeEntry.mockResolvedValue({
            success: true,
            data: { id: 100, startedAt: new Date(Date.now() - 1000).toISOString() }
        });

        render(<TimeTrackerWidget taskId={1} estimateMinutes={60} userId="user1" />);

        await waitFor(() => {
            expect(screen.getByText(/0:01/)).toBeInTheDocument();
        });

        const stopButton = screen.getByRole("button", { name: /stop timer/i });
        expect(stopButton).toBeInTheDocument();
    });

    it("should render edit button with accessible label", async () => {
        const handleEdit = mock(() => {});
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
