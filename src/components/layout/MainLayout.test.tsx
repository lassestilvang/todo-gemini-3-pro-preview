
import { describe, it, expect, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { MainLayout } from "./MainLayout";
import React from "react";

// Mock actions
const mockGetLists = mock(() => Promise.resolve([]));
const mockGetLabels = mock(() => Promise.resolve([]));

mock.module("@/lib/actions", () => ({
    getLists: mockGetLists,
    getLabels: mockGetLabels
}));

// Mock navigation
mock.module("next/navigation", () => ({
    usePathname: () => "/inbox",
    useRouter: () => ({ push: mock() })
}));

// Mock children
// We don't mock AppSidebar to avoid affecting AppSidebar.test.tsx
// Instead we ensure its dependencies are met (like next/navigation above)

mock.module("@/components/tasks/TaskEditModalWrapper", () => ({
    TaskEditModalWrapper: () => <div data-testid="task-edit-modal">Task Edit Modal</div>
}));

describe("MainLayout", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render layout with children", async () => {
        // MainLayout is an async component, so we need to await it or handle it specially.
        // However, React Testing Library doesn't support async components directly in render().
        // We might need to unwrap it or test it as a function.

        // For unit testing an async server component, we can call it as a function
        const Component = await MainLayout({ children: <div data-testid="child">Child Content</div> });
        render(Component);

        expect(screen.getByText("Inbox")).toBeInTheDocument(); // From AppSidebar
        expect(screen.getByTestId("child")).toBeInTheDocument();
        expect(screen.getByTestId("task-edit-modal")).toBeInTheDocument();

        expect(mockGetLists).toHaveBeenCalled();
        expect(mockGetLabels).toHaveBeenCalled();
    });
});
