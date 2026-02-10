import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TaskDetailsTab } from "./TaskDetailsTab";
import { Tabs } from "@/components/ui/tabs";
import React from "react";

// Helper to wrap component in Tabs context
const renderWithTabs = (ui: React.ReactNode) => {
    return render(
        <Tabs defaultValue="details">
            {ui}
        </Tabs>
    );
};

// We rely on the real UI components.
// IconPicker and other components are used directly to avoid mock leakage and ensure integration works.
// setup.tsx handles global environment mocks (PointerEvent, etc.).

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
        renderWithTabs(<TaskDetailsTab {...mockProps} />);

        // Find buttons by their expected new aria-labels
        expect(screen.getByLabelText("Delete subtask Subtask 1")).toBeDefined();
        expect(screen.getByLabelText("Delete subtask Subtask 2")).toBeDefined();
    });

    it("should have accessible labels for adding subtasks", () => {
        renderWithTabs(<TaskDetailsTab {...mockProps} />);
        expect(screen.getByLabelText("Add subtask")).toBeDefined();
        expect(screen.getByLabelText("New subtask title")).toBeDefined();
    });

    it("should have accessible labels for reminder actions", () => {
        renderWithTabs(<TaskDetailsTab {...mockProps} />);

        // Check delete reminder button
        // The component uses format(reminder.remindAt, "PPP p")
        const buttons = screen.getAllByLabelText(/Delete reminder/i);
        expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have accessible label for adding reminders", () => {
        renderWithTabs(<TaskDetailsTab {...mockProps} />);
        expect(screen.getByLabelText("Add reminder")).toBeDefined();
    });
});
