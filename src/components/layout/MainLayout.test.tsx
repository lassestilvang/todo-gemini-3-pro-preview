import { describe, it, expect, afterEach, mock, beforeAll } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { setMockAuthUser } from "@/test/mocks";

mock.module("@/components/gamification/XPBar", () => ({
    XPBar: () => <div data-testid="xp-bar">XP Bar</div>
}));

mock.module("@/components/tasks/TaskEditModalWrapper", () => ({
    TaskEditModalWrapper: () => <div data-testid="task-edit-modal">Task Edit Modal</div>
}));

mock.module("@/components/KeyboardShortcuts", () => ({
    KeyboardShortcuts: () => null
}));

mock.module("@/components/tasks/ZenOverlay", () => ({
    ZenOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="zen-overlay">{children}</div>
}));

mock.module("@/components/layout/OnboardingTour", () => ({
    OnboardingTour: () => null
}));

mock.module("@/components/tasks/QuickCapture", () => ({
    QuickCapture: () => <div data-testid="quick-capture">Quick Capture</div>
}));

mock.module("./SidebarDataLoader", () => ({
    SidebarDataLoader: () => <div data-testid="sidebar-data-loader">Inbox</div>
}));

mock.module("@/components/sync/SyncStatus", () => ({
    SyncStatus: () => <div data-testid="sync-status">Sync Status</div>
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
let MainLayout!: typeof import("./MainLayout").MainLayout;

beforeAll(async () => {
    const layoutModule = await import("./MainLayout");
    MainLayout = layoutModule.MainLayout;
});

describe("MainLayout", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render layout with children", async () => {
        setMockAuthUser({
            id: "test_user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
        });
        // MainLayout is an async component, so we need to await it
        const Component = await MainLayout({ children: <div data-testid="child">Child Content</div> });
        render(Component);

        await waitFor(() => {
            expect(screen.getAllByTestId("sidebar-data-loader").length).toBeGreaterThan(0);
            expect(screen.getAllByTestId("child").length).toBeGreaterThanOrEqual(1);
            expect(screen.getByTestId("task-edit-modal")).toBeInTheDocument();
        });


    });
});
