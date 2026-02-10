import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { TaskListWithSettings } from "./TaskListWithSettings";
import { setMockAuthUser, DEFAULT_MOCK_USER } from "@/test/mocks";
import React from "react";

// Mock store
const mockUseTaskStore = mock(() => ({
    tasks: {},
    setTasks: () => {},
    initialize: () => {},
    isInitialized: true,
}));

mock.module("@/lib/store/task-store", () => ({
    useTaskStore: mockUseTaskStore
}));

// Mock sync
mock.module("@/components/providers/sync-provider", () => ({
    useSync: () => ({ dispatch: () => Promise.resolve() })
}));

// Mock view options popover
mock.module("./ViewOptionsPopover", () => ({
    ViewOptionsPopover: () => <div>View Options</div>
}));

describe("TaskListWithSettings", () => {
    beforeEach(() => {
        setMockAuthUser(DEFAULT_MOCK_USER);
    });

    afterEach(() => {
        cleanup();
        mock.restore();
    });

    it("should render inbox empty state", () => {
        render(<TaskListWithSettings tasks={[]} viewId="inbox" filterType="inbox" userId={DEFAULT_MOCK_USER.id} />);
        expect(screen.getByText("Your inbox is empty")).toBeDefined();
        expect(screen.getByText("Capture ideas and tasks here.")).toBeDefined();
    });

    it("should render today empty state", () => {
        render(<TaskListWithSettings tasks={[]} viewId="today" filterType="today" userId={DEFAULT_MOCK_USER.id} />);
        expect(screen.getByText("No tasks for today")).toBeDefined();
    });

    it("should render default empty state", () => {
        render(<TaskListWithSettings tasks={[]} viewId="custom" userId={DEFAULT_MOCK_USER.id} />);
        expect(screen.getByText("No tasks found")).toBeDefined();
        expect(screen.getByText("Add a task to get started.")).toBeDefined();
    });
});
