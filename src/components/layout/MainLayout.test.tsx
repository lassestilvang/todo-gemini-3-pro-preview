import { describe, it, expect, afterEach, mock, beforeAll } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock actions
const mockGetLists = mock(() => Promise.resolve([]));
const mockGetLabels = mock(() => Promise.resolve([]));

mock.module("@/lib/actions", () => ({
    getLists: mockGetLists,
    getLabels: mockGetLabels,
    getUserStats: mock(() => Promise.resolve({ xp: 0, level: 1 }))
}));

mock.module("@/lib/auth", () => ({
    getCurrentUser: mock(() => Promise.resolve({ id: "test-user", email: "test@example.com" }))
}));

mock.module("@/components/gamification/XPBar", () => ({
    XPBar: () => <div data-testid="xp-bar">XP Bar</div>
}));

mock.module("@/components/tasks/TaskEditModalWrapper", () => ({
    TaskEditModalWrapper: () => <div data-testid="task-edit-modal">Task Edit Modal</div>
}));

mock.module("@/components/KeyboardShortcuts", () => ({
    KeyboardShortcuts: () => null
}));

// Mock AppSidebar to avoid next/navigation dependency
mock.module("./AppSidebar", () => ({
    AppSidebar: ({ lists, labels }: { lists: unknown[]; labels: unknown[] }) => (
        <div data-testid="app-sidebar">
            <span>Inbox</span>
            <span>Lists: {(lists as unknown[]).length}</span>
            <span>Labels: {(labels as unknown[]).length}</span>
        </div>
    )
}));

// Import component after mocks are set up
let MainLayout: typeof import("./MainLayout").MainLayout;

beforeAll(async () => {
    const layoutModule = await import("./MainLayout");
    MainLayout = layoutModule.MainLayout;
});

describe("MainLayout", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render layout with children", async () => {
        // MainLayout is an async component, so we need to await it
        const Component = await MainLayout({ children: <div data-testid="child">Child Content</div> });
        render(Component);

        expect(screen.getByText("Inbox")).toBeInTheDocument(); // From mocked AppSidebar
        expect(screen.getByTestId("child")).toBeInTheDocument();
        expect(screen.getByTestId("task-edit-modal")).toBeInTheDocument();

        expect(mockGetLists).toHaveBeenCalled();
        expect(mockGetLabels).toHaveBeenCalled();
    });
});
