import { describe, it, expect, afterEach, mock, beforeEach, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TaskDialog } from "./TaskDialog";
import React from "react";
import { setMockAuthUser } from "@/test/mocks";
import * as syncProvider from "@/components/providers/sync-provider";

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
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-testid={`select-item-${value}`} role="option">{children}</div>,
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

describe("TaskDialog", () => {
    let dispatchSpy: any;

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
            dispatch: mockDispatch as any,
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

    const sampleTask = {
        id: 1,
        title: "Sample Task",
        description: "Sample Description",
        priority: "high" as const,
        userId: "test_user_123",
        isCompleted: false,
        icon: null,
        listId: null,
        dueDate: null,
        deadline: null,
        isRecurring: false,
        recurringRule: null,
        energyLevel: null,
        context: null,
        isHabit: false,
    };

    it("should render in create mode", async () => {
        render(<TaskDialog open={true} userId="test_user_123" />);
        await waitFor(() => {
            expect(screen.getByPlaceholderText("Task Title")).toBeDefined();
        });
    });

    it("should call createTask on save via dispatch", async () => {
        render(<TaskDialog open={true} userId="test_user_123" />);

        const input = screen.getByPlaceholderText("Task Title");
        fireEvent.change(input, { target: { value: "New Task" } });

        const saveButton = screen.getByRole("button", { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(dispatchSpy).toHaveBeenCalledWith("createTask", expect.anything());
        }, { timeout: 3000 });
    });

    it("should call deleteTask on delete via dispatch", async () => {
        // @ts-expect-error - Task object is simplified for testing
        render(<TaskDialog open={true} task={sampleTask} userId="test_user_123" />);

        const deleteBtn = screen.getByText("Delete");
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(dispatchSpy).toHaveBeenCalledWith("deleteTask", 1, "test_user_123");
        }, { timeout: 3000 });
    });
});
