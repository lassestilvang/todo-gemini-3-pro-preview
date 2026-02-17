import { describe, it, expect, afterEach, mock, beforeEach, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TaskDialog } from "./TaskDialog";
import React from "react";
import { setMockAuthUser } from "@/test/mocks";
import * as syncProvider from "@/components/providers/sync-provider";

// Mock server actions
mock.module("@/lib/actions/lists", () => ({
    getLists: mock(() => Promise.resolve([
        { id: 1, name: "Inbox", color: null, icon: "list" },
        { id: 2, name: "Work", color: "#ff0000", icon: "briefcase" }
    ]))
}));

mock.module("@/lib/actions/labels", () => ({
    getLabels: mock(() => Promise.resolve([
        { id: 1, name: "Urgent", color: "#ff0000", icon: "alert-circle" },
        { id: 2, name: "Home", color: "#00ff00", icon: "home" }
    ]))
}));

mock.module("@/lib/actions/tasks", () => ({
    getSubtasks: mock(() => Promise.resolve({ success: true, data: [] })),
    createSubtask: mock(() => Promise.resolve({ success: true, data: {} })),
    updateSubtask: mock(() => Promise.resolve({ success: true, data: {} })),
    deleteSubtask: mock(() => Promise.resolve({ success: true, data: {} })),
    searchTasks: mock(() => Promise.resolve({ success: true, data: [] }))
}));

mock.module("@/lib/actions/reminders", () => ({
    getReminders: mock(() => Promise.resolve([])),
    createReminder: mock(() => Promise.resolve({})),
    deleteReminder: mock(() => Promise.resolve({}))
}));

mock.module("@/lib/actions/logs", () => ({
    getTaskLogs: mock(() => Promise.resolve([]))
}));

mock.module("@/lib/actions/dependencies", () => ({
    getBlockers: mock(() => Promise.resolve([])),
    addDependency: mock(() => Promise.resolve({})),
    removeDependency: mock(() => Promise.resolve({}))
}));


// Local UI Mocks to avoid Portals issues in Happy-dom
mock.module("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-testid="dialog-root" data-open={open}>{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
}));

mock.module("@/components/ui/popover", () => ({
    Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-testid="popover-root" data-open={open}>{children}</div>,
    PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
    PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
}));

mock.module("@/components/ui/select", () => ({
    Select: ({ children, value }: { children: React.ReactNode; value?: string }) => <div data-testid="select-root" data-value={value}>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    SelectValue: ({ children, placeholder }: { children?: React.ReactNode; placeholder?: string }) => <span>{children || placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-testid={`select-item-${value}`} role="option" aria-selected="false">{children}</div>,
}));

mock.module("@/components/ui/icon-picker", () => ({
    IconPicker: ({ value, onChange, trigger }: { value: string | null; onChange: (v: string) => void; trigger: React.ReactNode }) => (
        <div data-testid="icon-picker">
            {trigger}
            <input
                data-testid="icon-picker-input"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
}));

describe("TaskDialog Interaction", () => {
    let dispatchSpy: ReturnType<typeof mock>;

    beforeEach(() => {
        // Mock global confirm
        global.confirm = mock(() => true);

        // Spy on useSync hook
        const mockDispatch = mock(() => Promise.resolve({ success: true, data: { id: 1 } }));
        dispatchSpy = mockDispatch;

        spyOn(syncProvider, "useSync").mockReturnValue({
            isOnline: true,
            lastSynced: new Date(),
            sync: mock(() => Promise.resolve()),
            pendingCount: 0,
            dispatch: mockDispatch,
        });

        // Set mock user so setup.tsx auth mock works
        setMockAuthUser({
            id: "test_user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("should render removable label as a button with correct aria-label", async () => {
        // Render TaskDialog with a pre-selected label (ID 1: Urgent)
        render(
            <TaskDialog
                open={true}
                userId="test_user_123"
                defaultLabelIds={[1]}
            />
        );

        // Wait for data to load (lists and labels)
        await waitFor(() => {
            expect(screen.getByPlaceholderText("Task Title")).toBeDefined();
        });

        // The label should be rendered. We expect to find the "Urgent" label button.
        // It should have aria-label "Remove label Urgent"
        const removeButton = await screen.findByLabelText("Remove label Urgent");

        expect(removeButton).toBeDefined();
        expect(removeButton.tagName).toBe("BUTTON");
        expect(removeButton.getAttribute("type")).toBe("button");

        // Optional: Check class names contain the hover override
        // Note: checking class strings is brittle but confirms our specific fix
        expect(removeButton.className).toContain("hover:!bg-destructive");
    });
});
