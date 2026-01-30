import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";

// Mock MUST happen before components are imported
const mockCreateTask = mock(() => Promise.resolve({ success: true, data: { id: 1 } }));

mock.module("@/lib/actions", () => ({
    getLists: mock(() => Promise.resolve([])),
    getLabels: mock(() => Promise.resolve([])),
    createTask: mockCreateTask,
}));

// Local UI Mocks
mock.module("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: any) => <div data-testid="dialog-root" data-open={open}>{children}</div>,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogTrigger: ({ children, asChild }: any) => asChild ? children : <button>{children}</button>,
}));

mock.module("@/components/providers/sync-provider", () => ({
    SyncProvider: ({ children }: any) => <>{children}</>,
    useSync: () => ({
        dispatch: mock((type: string, ...args: any[]) => {
            if (type === 'createTask') {
                return mockCreateTask(...args);
            }
            return Promise.resolve({ success: true, data: { id: 1 } });
        }),
        isOnline: true,
        status: 'online',
        pendingActions: [],
        conflicts: [],
        resolveConflict: mock(() => Promise.resolve()),
    }),
}));

import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTaskInput } from "./CreateTaskInput";
import React from "react";
import { SyncProvider } from "@/components/providers/sync-provider";
import { setMockAuthUser } from "@/test/mocks";

describe("CreateTaskInput", () => {
    beforeEach(() => {
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
        mockCreateTask.mockClear();
    });

    it("should render input", () => {
        render(<CreateTaskInput userId="test_user_123" />);
        expect(screen.getByPlaceholderText(/Add a task/i)).toBeDefined();
    });

    it("should expand on focus", async () => {
        const user = userEvent.setup();
        render(<CreateTaskInput userId="test_user_123" />);
        const input = screen.getByPlaceholderText(/Add a task/i);
        await user.click(input);

        await waitFor(() => {
            expect(screen.getByText("Add Task")).toBeDefined();
        });
    });

    it("should create task on submit", async () => {
        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type into input
        await user.click(input);
        await user.type(input, "New Task");

        // Ensure value is set
        await waitFor(() => {
            expect((input as HTMLInputElement).value).toBe("New Task");
        });

        // Click Add Task button
        const addButton = screen.getByRole("button", { name: /Add Task/i });
        await user.click(addButton);

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalled();
        }, { timeout: 3000 });
    });
});
