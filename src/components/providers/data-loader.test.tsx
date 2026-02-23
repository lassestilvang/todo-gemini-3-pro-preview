import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { DATA_REFRESH_EVENT } from "@/lib/sync/events";

const mockInitializeTasks = mock(async () => {});
const mockInitializeLists = mock(async () => {});
const mockInitializeLabels = mock(async () => {});
const mockReplaceTasks = mock(() => {});
const mockReplaceLists = mock(() => {});
const mockReplaceLabels = mock(() => {});
const mockSetTasks = mock(() => {});
const mockSetLists = mock(() => {});
const mockSetLabels = mock(() => {});

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
const mockIsDataStale = mock(async () => false);
const mockSetAllLastFetched = mock(async () => {});

import * as taskActions from "@/lib/actions/tasks";
import * as listActions from "@/lib/actions/lists";
import * as labelActions from "@/lib/actions/labels";

mock.module("@/lib/store/task-store", () => ({
    useTaskStore: () => ({
        initialize: mockInitializeTasks,
        replaceTasks: mockReplaceTasks,
        setTasks: mockSetTasks,
    }),
}));

mock.module("@/lib/store/list-store", () => ({
    useListStore: () => ({
        initialize: mockInitializeLists,
        replaceLists: mockReplaceLists,
        setLists: mockSetLists,
    }),
}));

mock.module("@/lib/store/label-store", () => ({
    useLabelStore: () => ({
        initialize: mockInitializeLabels,
        replaceLabels: mockReplaceLabels,
        setLabels: mockSetLabels,
    }),
}));

mock.module("@/lib/sync/db", () => ({
    isDataStale: mockIsDataStale,
    setAllLastFetched: mockSetAllLastFetched,
}));

import { DataLoader } from "./data-loader";

describe("DataLoader", () => {
    beforeEach(() => {
        mockInitializeTasks.mockClear();
        mockInitializeLists.mockClear();
        mockInitializeLabels.mockClear();
        mockReplaceTasks.mockClear();
        mockReplaceLists.mockClear();
        mockReplaceLabels.mockClear();
        mockSetTasks.mockClear();
        mockSetLists.mockClear();
        mockSetLabels.mockClear();
        mockGetTasks.mockClear();
        mockGetLists.mockClear();
        mockGetLabels.mockClear();
        mockIsDataStale.mockClear();
        mockSetAllLastFetched.mockClear();

        spyOn(taskActions, "getTasks").mockImplementation(mockGetTasks);
        spyOn(listActions, "getLists").mockImplementation(mockGetLists);
        spyOn(labelActions, "getLabels").mockImplementation(mockGetLabels);
    });

    afterEach(() => {
        cleanup();
        mock.restore();
    });

    it("uses full replacement methods after initial fetch", async () => {
        render(<DataLoader userId="user_1" />);

        await waitFor(() => {
            expect(mockReplaceTasks).toHaveBeenCalledTimes(1);
            expect(mockReplaceLists).toHaveBeenCalledTimes(1);
            expect(mockReplaceLabels).toHaveBeenCalledTimes(1);
        });

        expect(mockSetTasks).toHaveBeenCalledTimes(0);
        expect(mockSetLists).toHaveBeenCalledTimes(0);
        expect(mockSetLabels).toHaveBeenCalledTimes(0);
        expect(mockSetAllLastFetched).toHaveBeenCalledTimes(1);
    });

    it("forces a fresh fetch when sync refresh event is dispatched", async () => {
        render(<DataLoader userId="user_1" />);

        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            window.dispatchEvent(new Event(DATA_REFRESH_EVENT));
        });

        await waitFor(() => {
            expect(mockGetTasks).toHaveBeenCalledTimes(2);
        });
    });
});
