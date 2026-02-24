import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { DATA_REFRESH_EVENT } from "@/lib/sync/events";
import { mockUseTaskStore, mockUseListStore, mockUseLabelStore } from "@/test/mocks";
import * as syncDb from "@/lib/sync/db";
import * as taskActions from "@/lib/actions/tasks";
import * as listActions from "@/lib/actions/lists";
import * as labelActions from "@/lib/actions/labels";
import { DataLoader } from "./data-loader";

const mockGetTasks = mock(async () => ({
    success: true as const,
    data: [{ id: 1, title: "Todoist task", completed: false }],
}));
const mockGetLists = mock(async () => [
    { id: 1, name: "Inbox", color: null, icon: null, slug: "inbox" },
]);
const mockGetLabels = mock(async () => [
    { id: 1, name: "test", color: null, icon: null },
]);

describe("DataLoader", () => {
    beforeEach(() => {
        // Reset global mocks
        mockUseTaskStore.mockClear();
        mockUseListStore.mockClear();
        mockUseLabelStore.mockClear();

        // Configure default return values
        mockUseTaskStore.mockReturnValue({
            initialize: mock(() => Promise.resolve()),
            replaceTasks: mock(() => {}),
            setTasks: mock(() => {}),
        });
        mockUseListStore.mockReturnValue({
            initialize: mock(() => Promise.resolve()),
            replaceLists: mock(() => {}),
            setLists: mock(() => {}),
        });
        mockUseLabelStore.mockReturnValue({
            initialize: mock(() => Promise.resolve()),
            replaceLabels: mock(() => {}),
            setLabels: mock(() => {}),
        });

        mockGetTasks.mockClear();
        mockGetLists.mockClear();
        mockGetLabels.mockClear();

        spyOn(taskActions, "getTasks").mockImplementation(mockGetTasks);
        spyOn(listActions, "getLists").mockImplementation(mockGetLists);
        spyOn(labelActions, "getLabels").mockImplementation(mockGetLabels);
        
        // Mock sync/db methods
        spyOn(syncDb, "isDataStale").mockResolvedValue(false);
        spyOn(syncDb, "setAllLastFetched").mockResolvedValue();
    });

    afterEach(() => {
        cleanup();
        mock.restore();
        mockUseTaskStore.mockRestore();
        mockUseListStore.mockRestore();
        mockUseLabelStore.mockRestore();
    });

    it("fetches and replaces data on mount", async () => {
        render(<DataLoader userId="user_1" />);

        const { replaceTasks } = mockUseTaskStore();
        const { replaceLists } = mockUseListStore();
        const { replaceLabels } = mockUseLabelStore();

        await waitFor(() => {
            expect(replaceTasks).toHaveBeenCalledTimes(1);
            expect(replaceLists).toHaveBeenCalledTimes(1);
            expect(replaceLabels).toHaveBeenCalledTimes(1);
        });

        expect(syncDb.setAllLastFetched).toHaveBeenCalledTimes(1);
    });

    it("does not fetch if data is not stale on visibility change", async () => {
        render(<DataLoader userId="user_1" />);
        
        // Wait for initial fetch
        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });
        
        mockGetTasks.mockClear();
        // isDataStale is false by default in beforeEach

        await act(async () => {
             // Simulate visibility change
            Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Should NOT have called getTasks again because it's not stale
        // We wait a bit to ensure it didn't happen (negative assertion is tricky with async, 
        // but since we waited for the event loop in act, it should be fine)
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(mockGetTasks).not.toHaveBeenCalled();
    });

    it("fetches if data is stale on visibility change", async () => {
        render(<DataLoader userId="user_1" />);

        // Wait for initial fetch
        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });

        mockGetTasks.mockClear();
        // Make it stale
        spyOn(syncDb, "isDataStale").mockResolvedValue(true);

        await act(async () => {
            Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });
    });

    it("forces a fresh fetch when sync refresh event is dispatched", async () => {
        render(<DataLoader userId="user_1" />);

        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });

        mockGetTasks.mockClear();

        await act(async () => {
            window.dispatchEvent(new Event(DATA_REFRESH_EVENT));
        });

        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });
    });
});
