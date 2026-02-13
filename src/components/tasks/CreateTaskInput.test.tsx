import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";

// Mock MUST happen before components are imported
const mockCreateTask = mock(() => Promise.resolve({ success: true, data: { id: 1 } }));

// Mocks should be targeted and not leak to other tests

// Local UI Mocks
mock.module("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-testid="dialog-root" data-open={open}>{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
}));

mock.module("@/components/ui/tooltip", () => ({
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

mock.module("@/components/providers/sync-provider", () => ({
    SyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSync: () => ({
        dispatch: mock((type: string, ...args: unknown[]) => {
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

    it("should clear input when clear button is clicked", async () => {
        const user = userEvent.setup();
        render(<CreateTaskInput userId="test_user_123" />);
        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type something
        await user.type(input, "Something");
        expect((input as HTMLInputElement).value).toBe("Something");

        // Click clear button
        const clearButton = await screen.findByLabelText("Clear task title");
        await user.click(clearButton);

        // Expect empty
        expect((input as HTMLInputElement).value).toBe("");

        // Expect input to be focused
        expect(document.activeElement).toBe(input);
    });

    it("should open syntax guide when keyboard icon is clicked", async () => {
        const user = userEvent.setup();
        render(<CreateTaskInput userId="test_user_123" />);
        const input = screen.getByPlaceholderText(/Add a task/i);

        // Expand input
        await user.click(input);

        // Find and click syntax guide button
        const guideButton = await screen.findByLabelText("Smart syntax guide");
        await user.click(guideButton);

        // Check content
        await waitFor(() => {
            expect(screen.getByText("Smart Syntax")).toBeDefined();
            expect(screen.getByText("!high")).toBeDefined();
        });
    });

    it("should append syntax when badge is clicked", async () => {
        const user = userEvent.setup();
        render(<CreateTaskInput userId="test_user_123" />);
        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type something
        await user.click(input);
        await user.type(input, "Buy milk");
        expect((input as HTMLInputElement).value).toBe("Buy milk");

        // Open syntax guide
        const guideButton = await screen.findByLabelText("Smart syntax guide");
        await user.click(guideButton);

        // Find !high badge and click it
        // We use findByText because the popover might animate or need a tick
        const highBadge = await screen.findByText("!high");
        await user.click(highBadge);

        // Expect input to have appended text with a trailing space
        expect((input as HTMLInputElement).value).toBe("Buy milk !high ");
    });

    it("should submit task when Cmd+Enter is pressed", async () => {
        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type task title
        await user.click(input);
        await user.type(input, "Keyboard Task");

        // Press Cmd+Enter
        await user.keyboard('{Meta>}{Enter}{/Meta}');

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalled();
        });
    });

    it("should submit task when Ctrl+Enter is pressed", async () => {
        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type task title
        await user.click(input);
        await user.type(input, "Ctrl Task");

        // Press Ctrl+Enter
        await user.keyboard('{Control>}{Enter}{/Control}');

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalled();
        });
    });

    it("should show loading state during submission", async () => {
        // Override mock to add delay
        mockCreateTask.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: { id: 1 } }), 100)));

        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);
        await user.type(input, "Loading Task");

        const submitBtn = screen.getByTestId("add-task-button");
        await user.click(submitBtn);

        // Should be disabled immediately (due to isSubmitting)
        expect(submitBtn).toBeDisabled();

        // Wait for dispatch to complete
        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalled();
        });

        // After completion, title is cleared
        await waitFor(() => {
             expect((input as HTMLInputElement).value).toBe("");
        });

        expect(submitBtn).toBeDisabled();
    });
});
