import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { SmartScheduleDialog } from "./SmartScheduleDialog";
import * as smartScheduler from "@/lib/smart-scheduler";
import { toast } from "sonner";

// Mock dependencies
mock.module("@/lib/smart-scheduler", () => ({
    generateSmartSchedule: mock(),
    applyScheduleSuggestion: mock()
}));

mock.module("sonner", () => ({
    toast: {
        success: mock(),
        error: mock(),
        info: mock()
    }
}));

type MockFn = ReturnType<typeof mock> & {
    mockClear: () => void;
    mockResolvedValue: (value: unknown) => void;
    mockRejectedValue: (value: unknown) => void;
    mockReturnValue: (value: unknown) => void;
};

describe("SmartScheduleDialog", () => {
    const mockOnOpenChange = mock();
    const mockGenerateSmartSchedule = smartScheduler.generateSmartSchedule as unknown as MockFn;
    const mockApplyScheduleSuggestion = smartScheduler.applyScheduleSuggestion as unknown as MockFn;

    beforeEach(() => {
        mockOnOpenChange.mockClear();
        mockGenerateSmartSchedule.mockClear();
        mockApplyScheduleSuggestion.mockClear();
        // Reset toast mocks
        (toast.success as unknown as MockFn).mockClear();
        (toast.error as unknown as MockFn).mockClear();
        (toast.info as unknown as MockFn).mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render start screen when opened", () => {
        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);
        expect(screen.getByText("AI Smart Scheduling")).toBeDefined();
        expect(screen.getByText("Generate Schedule")).toBeDefined();
    });

    it("should handle generation loading state", async () => {
        mockGenerateSmartSchedule.mockReturnValue(new Promise(() => { })); // Never resolves
        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        fireEvent.click(screen.getByText("Generate Schedule"));

        expect(screen.getByText("Analyzing tasks...")).toBeDefined();
        const button = screen.getByRole("button", { name: /Analyzing tasks/i });
        expect(button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true").toBe(true);
    });

    it("should display suggestions after generation", async () => {
        const suggestions = [
            {
                taskId: 1,
                taskTitle: "Task 1",
                suggestedDate: new Date("2023-10-27T10:00:00"),
                reason: "High priority",
                confidence: 0.9
            }
        ];
        mockGenerateSmartSchedule.mockResolvedValue(suggestions);

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        fireEvent.click(screen.getByText("Generate Schedule"));

        await waitFor(() => {
            expect(screen.getByText("Task 1")).toBeDefined();
            expect(screen.getByText("High priority")).toBeDefined();
            expect(screen.getByText("90% match")).toBeDefined();
        });
    });

    it("should handle empty suggestions", async () => {
        mockGenerateSmartSchedule.mockResolvedValue([]);

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        fireEvent.click(screen.getByText("Generate Schedule"));

        // Wait for async action to complete
        await waitFor(() => {
            expect(toast.info).toHaveBeenCalledWith("No unscheduled tasks found to schedule!");
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should handle generation error", async () => {
        mockGenerateSmartSchedule.mockRejectedValue(new Error("API Error"));

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        fireEvent.click(screen.getByText("Generate Schedule"));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to generate schedule. Please check your API key.");
        });
    });

    it("should apply suggestion", async () => {
        const suggestions = [
            {
                taskId: 1,
                taskTitle: "Task 1",
                suggestedDate: new Date("2023-10-27T10:00:00"),
                reason: "High priority",
                confidence: 0.9
            }
        ];
        mockGenerateSmartSchedule.mockResolvedValue(suggestions);
        mockApplyScheduleSuggestion.mockResolvedValue(undefined);

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        // Generate first
        fireEvent.click(screen.getByText("Generate Schedule"));

        // Wait for Accept button to appear
        await waitFor(() => {
            expect(screen.getByText("Accept")).toBeDefined();
        });

        // Apply
        fireEvent.click(screen.getByText("Accept"));

        // Wait for the apply action to complete
        await waitFor(() => {
            expect(mockApplyScheduleSuggestion).toHaveBeenCalledWith(1, suggestions[0].suggestedDate);
        });
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("Task scheduled!");
        });
    });

    it("should reject suggestion", async () => {
        const suggestions = [
            {
                taskId: 1,
                taskTitle: "Task 1",
                suggestedDate: new Date("2023-10-27T10:00:00"),
                reason: "High priority",
                confidence: 0.9
            }
        ];
        mockGenerateSmartSchedule.mockResolvedValue(suggestions);

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);

        // Generate first
        fireEvent.click(screen.getByText("Generate Schedule"));
        await new Promise(resolve => setTimeout(resolve, 100));

        // Reject - find button with red text
        const buttons = screen.getAllByRole("button");
        const rejectBtn = buttons.find(b => b.className.includes("text-red-500"));

        if (rejectBtn) {
            fireEvent.click(rejectBtn);
        } else {
            throw new Error("Reject button not found");
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockApplyScheduleSuggestion).not.toHaveBeenCalled();
    });
});
