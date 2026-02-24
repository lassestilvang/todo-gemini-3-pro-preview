import { describe, it, expect, mock, beforeEach, afterEach, beforeAll, spyOn } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { setMockAuthUser, DEFAULT_MOCK_USER, mockUseTaskStore } from "@/test/mocks";
import React from "react";
import * as ViewOptionsPopoverModule from "./ViewOptionsPopover";

let TaskListWithSettings: typeof import("./TaskListWithSettings").TaskListWithSettings;

describe("TaskListWithSettings", () => {
    beforeAll(async () => {
        // Mock ViewOptionsPopover before importing the component under test
        // However, since it's a child component, we can spy on it if the import is live.
        // But if TaskListWithSettings imports it directly, the binding might be fixed.
        // In Bun/ESM, we might need to rely on mock.module if spyOn doesn't work on the import.
        // BUT, let's try spyOn first.
        ({ TaskListWithSettings } = await import("./TaskListWithSettings"));
    });

    beforeEach(() => {
        setMockAuthUser(DEFAULT_MOCK_USER);
        mockUseTaskStore.mockReturnValue({
            tasks: {},
            setTasks: mock(() => {}),
            initialize: mock(() => {}),
            isInitialized: true,
            subtaskIndex: {},
            replaceTasks: mock(() => {}),
            upsertTasks: mock(() => {}),
            upsertTask: mock(() => {}),
            deleteTasks: mock(() => {}),
            deleteTask: mock(() => {}),
            updateSubtaskCompletion: mock(() => {}),
            getTaskBySubtaskId: mock(() => undefined),
        });

        // Spy on the component
        spyOn(ViewOptionsPopoverModule, "ViewOptionsPopover").mockReturnValue(<div>View Options</div>);
    });

    afterEach(() => {
        cleanup();
        mockUseTaskStore.mockRestore();
        mock.restore(); // Restores all spies
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
