import { describe, it, expect, afterEach, mock, beforeEach, spyOn } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { setMockAuthUser } from "@/test/mocks";
import { MainLayout } from "./MainLayout";
import * as XPBarModule from "@/components/gamification/XPBar";
import * as TaskEditModalWrapperModule from "@/components/tasks/TaskEditModalWrapper";
import * as KeyboardShortcutsModule from "@/components/KeyboardShortcuts";
import * as ZenOverlayModule from "@/components/tasks/ZenOverlay";
import * as OnboardingTourModule from "@/components/layout/OnboardingTour";
import * as QuickCaptureModule from "@/components/tasks/QuickCapture";
import * as SidebarDataLoaderModule from "./SidebarDataLoader";
import * as SyncStatusModule from "@/components/sync/SyncStatus";
import * as AppSidebarModule from "./AppSidebar";

describe("MainLayout", () => {
    beforeEach(() => {
        spyOn(XPBarModule, "XPBar").mockReturnValue(<div data-testid="xp-bar">XP Bar</div>);
        spyOn(TaskEditModalWrapperModule, "TaskEditModalWrapper").mockReturnValue(<div data-testid="task-edit-modal">Task Edit Modal</div>);
        spyOn(KeyboardShortcutsModule, "KeyboardShortcuts").mockReturnValue(null);
        spyOn(ZenOverlayModule, "ZenOverlay").mockImplementation(({ children }: { children: React.ReactNode }) => <div data-testid="zen-overlay">{children}</div>);
        spyOn(OnboardingTourModule, "OnboardingTour").mockReturnValue(null);
        spyOn(QuickCaptureModule, "QuickCapture").mockReturnValue(<div data-testid="quick-capture">Quick Capture</div>);
        spyOn(SidebarDataLoaderModule, "SidebarDataLoader").mockReturnValue(<div data-testid="sidebar-data-loader">Inbox</div>);
        spyOn(SyncStatusModule, "SyncStatus").mockReturnValue(<div data-testid="sync-status">Sync Status</div>);
        spyOn(AppSidebarModule, "AppSidebar").mockImplementation(({ lists, labels }: { lists: unknown[]; labels: unknown[] }) => (
            <div data-testid="app-sidebar">
                <span>Inbox</span>
                <span>Lists: {(lists as unknown[]).length}</span>
                <span>Labels: {(labels as unknown[]).length}</span>
            </div>
        ));
    });

    afterEach(() => {
        cleanup();
        mock.restore();
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
        });
    });
});
