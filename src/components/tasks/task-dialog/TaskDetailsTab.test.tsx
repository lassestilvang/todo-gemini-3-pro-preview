import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TaskDetailsTab } from "./TaskDetailsTab";
import React from "react";

// Mocks for UI components to isolate the test
mock.module("@/components/ui/input", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Input: (props: any) => <input {...props} data-testid="input" />,
}));
mock.module("@/components/ui/textarea", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Textarea: (props: any) => <textarea {...props} data-testid="textarea" />,
}));
mock.module("@/components/ui/select", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Select: ({ children }: any) => <div>{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelectTrigger: ({ children }: any) => <button>{children}</button>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelectValue: ({ children, placeholder }: any) => <span>{children || placeholder}</span>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelectContent: ({ children }: any) => <div>{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelectItem: ({ children }: any) => <div>{children}</div>,
}));
mock.module("@/components/ui/date-picker", () => ({
    DatePicker: () => <div data-testid="date-picker" />,
}));
mock.module("@/components/ui/time-picker", () => ({
    TimePicker: () => <div data-testid="time-picker" />,
}));
mock.module("@/components/ui/checkbox", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Checkbox: (props: any) => <input type="checkbox" {...props} data-testid="checkbox" />,
}));
mock.module("@/components/ui/button", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Button: (props: any) => <button {...props} />,
}));
mock.module("@/components/ui/icon-picker", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IconPicker: ({ trigger }: any) => <div>{trigger}</div>,
}));
mock.module("@/components/ui/resolved-icon", () => ({
    ResolvedIcon: () => <div data-testid="resolved-icon" />,
}));
mock.module("../AiBreakdownDialog", () => ({
    AiBreakdownDialog: () => <div data-testid="ai-breakdown-dialog" />,
}));
mock.module("../TimeEstimateInput", () => ({
    TimeEstimateInput: () => <div data-testid="time-estimate-input" />,
}));

mock.module("@/components/ui/tabs", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TabsContent: ({ children }: any) => <div>{children}</div>,
}));

describe("TaskDetailsTab Accessibility", () => {
    const mockProps = {
        isEdit: true,
        title: "Test Task",
        setTitle: mock(),
        description: "Test Description",
        setDescription: mock(),
        icon: null,
        setIcon: mock(),
        listId: "inbox",
        setListId: mock(),
        lists: [],
        priority: "none" as const,
        setPriority: mock(),
        energyLevel: "none" as const,
        setEnergyLevel: mock(),
        context: "none" as const,
        setContext: mock(),
        dueDate: undefined,
        setDueDate: mock(),
        deadline: undefined,
        setDeadline: mock(),
        isRecurring: false,
        setIsRecurring: mock(),
        recurringRule: "",
        setRecurringRule: mock(),
        isHabit: false,
        setIsHabit: mock(),
        subtasks: [
            { id: 1, title: "Subtask 1", isCompleted: false },
            { id: 2, title: "Subtask 2", isCompleted: true },
        ],
        newSubtask: "",
        setNewSubtask: mock(),
        handleAddSubtask: mock(),
        handleToggleSubtask: mock(),
        handleDeleteSubtask: mock(),
        onAiConfirm: mock(),
        labels: [],
        selectedLabelIds: [],
        toggleLabel: mock(),
        reminders: [
            { id: 1, remindAt: new Date("2023-01-01T12:00:00") },
        ],
        newReminderDate: undefined,
        setNewReminderDate: mock(),
        handleAddReminder: mock(),
        handleDeleteReminder: mock(),
        estimateMinutes: null,
        setEstimateMinutes: mock(),
        handleSubmit: mock(),
        userId: "user123",
    };

    it("should have accessible labels for subtask actions", () => {
        render(<TaskDetailsTab {...mockProps} />);

        // Find buttons by their expected new aria-labels
        expect(screen.getByLabelText("Delete subtask Subtask 1")).toBeDefined();
        expect(screen.getByLabelText("Delete subtask Subtask 2")).toBeDefined();
    });

    it("should have accessible labels for adding subtasks", () => {
        render(<TaskDetailsTab {...mockProps} />);
        expect(screen.getByLabelText("Add subtask")).toBeDefined();
        expect(screen.getByLabelText("New subtask title")).toBeDefined();
    });

    it("should have accessible labels for reminder actions", () => {
        render(<TaskDetailsTab {...mockProps} />);

        // Check delete reminder button
        // Since the date formatting might vary depending on locale/mock,
        // we'll look for a generic label or one that matches the date format in the component
        // The component uses format(reminder.remindAt, "PPP p")
        // "January 1st, 2023 at 12:00 PM" roughly

        // For now, let's just assert we can find *a* delete reminder button with *some* label containing "Delete reminder"
        const buttons = screen.getAllByLabelText(/Delete reminder/i);
        expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have accessible label for adding reminders", () => {
        render(<TaskDetailsTab {...mockProps} />);
        // The 'Add' button has text "Add", so it might not need aria-label,
        // but our plan said we'd add it. Let's check if we can find it by label "Add reminder"
        expect(screen.getByLabelText("Add reminder")).toBeDefined();
    });
});
