import { describe, it, expect, afterEach, mock, beforeEach, spyOn } from "bun:test";

// Mock MUST happen before components are imported
const mockCreateTask = mock();

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
    let consoleErrorSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        mockCreateTask.mockReset();
        mockCreateTask.mockImplementation(() => Promise.resolve({ success: true, data: { id: 1 } }));

        consoleErrorSpy = spyOn(console, "error").mockImplementation(() => undefined);

        setMockAuthUser({
            id: "test_user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        cleanup();
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

    it("should remove badge when X button is clicked", async () => {
        const user = userEvent.setup();
        render(<CreateTaskInput userId="test_user_123" />);
        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type something with priority syntax
        await user.click(input);
        await user.type(input, "Buy milk !high");

        // Wait for badge to appear
        await waitFor(() => {
            expect(screen.getByText("high")).toBeDefined();
        });

        // Find remove button and click it
        const removeButton = await screen.findByLabelText("Remove priority");
        await user.click(removeButton);

        // Expect badge to be gone
        await waitFor(() => {
            expect(screen.queryByText("high", { selector: "[data-slot='badge']" })).toBeNull();
        });

        // Expect input to be focused
        expect(document.activeElement).toBe(input);
    });

    it("should not submit removed metadata from raw syntax", async () => {
        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);

        await user.click(input);
        await user.type(input, "Buy milk !high");

        const removeButton = await screen.findByLabelText("Remove priority");
        await user.click(removeButton);

        const addButton = screen.getByRole("button", { name: /Add Task/i });
        await user.click(addButton);

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalled();
        });

        const payload = mockCreateTask.mock.calls[0]?.[0] as { title: string; priority: string };
        expect(payload.title).toBe("Buy milk");
        expect(payload.priority).toBe("none");
    });

    it.each([
        { keyName: "Cmd", key: "{Meta>}{Enter}{/Meta}", taskName: "Keyboard Task" },
        { keyName: "Ctrl", key: "{Control>}{Enter}{/Control}", taskName: "Ctrl Task" },
    ])("should submit task when $keyName+Enter is pressed", async ({ key, taskName }) => {
        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);

        // Type task title
        await user.click(input);
        await user.type(input, taskName);

        // Press key combination
        await user.keyboard(key);

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

    it("should recover after failed submission", async () => {
        mockCreateTask.mockImplementationOnce(() => {
            throw new Error("network error");
        });

        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);
        await user.type(input, "Failed Task");

        const submitBtn = screen.getByTestId("add-task-button");
        await user.click(submitBtn);

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(submitBtn).toBeEnabled();
        });

        expect((input as HTMLInputElement).value).toBe("Failed Task");
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should ignore Cmd/Ctrl+Enter while a submission is in progress", async () => {
        mockCreateTask.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: { id: 1 } }), 100)));

        const user = userEvent.setup();
        render(
            <SyncProvider>
                <CreateTaskInput userId="test_user_123" />
            </SyncProvider>
        );

        const input = screen.getByPlaceholderText(/Add a task/i);
        await user.type(input, "No Duplicate Task");

        await user.keyboard("{Control>}{Enter}{/Control}");
        await user.keyboard("{Control>}{Enter}{/Control}");

        await waitFor(() => {
            expect(mockCreateTask).toHaveBeenCalledTimes(1);
        });
    });
});
