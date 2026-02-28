import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { SmartScheduleDialog } from "./SmartScheduleDialog";
import * as smartScheduler from "@/lib/smart-scheduler";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";

describe("SmartScheduleDialog", () => {
    const mockOnOpenChange = mock();
    let mockGenerateSmartSchedule: ReturnType<typeof spyOn>;
    let mockApplyScheduleSuggestion: ReturnType<typeof spyOn>;
    let mockToastSuccess: ReturnType<typeof spyOn>;
    let mockToastError: ReturnType<typeof spyOn>;
    let mockToastInfo: ReturnType<typeof spyOn>;

    beforeEach(() => {
        mockOnOpenChange.mockClear();

        // Spy on smart-scheduler functions
        mockGenerateSmartSchedule = spyOn(smartScheduler, "generateSmartSchedule").mockImplementation(() => Promise.resolve([]));
        mockApplyScheduleSuggestion = spyOn(smartScheduler, "applyScheduleSuggestion").mockImplementation(() => Promise.resolve());

        // Spy on toast functions
        mockToastSuccess = spyOn(toast, "success").mockImplementation(() => { return "" as string | number; });
        mockToastError = spyOn(toast, "error").mockImplementation(() => { return "" as string | number; });
        mockToastInfo = spyOn(toast, "info").mockImplementation(() => { return "" as string | number; });
    });

    afterEach(() => {
        mock.restore();
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
        const user = userEvent.setup();

        await user.click(screen.getByText("Generate Schedule"));

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
        const user = userEvent.setup();

        await user.click(screen.getByText("Generate Schedule"));

        await waitFor(() => {
            expect(screen.getByText("Task 1")).toBeDefined();
            expect(screen.getByText("High priority")).toBeDefined();
            expect(screen.getByText("90% match")).toBeDefined();
        });
    });

    it("should handle empty suggestions", async () => {
        mockGenerateSmartSchedule.mockResolvedValue([]);

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);
        const user = userEvent.setup();

        await user.click(screen.getByText("Generate Schedule"));

        // Wait for async action to complete
        await waitFor(() => {
            expect(mockToastInfo).toHaveBeenCalledWith("No unscheduled tasks found to schedule!");
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should handle generation error", async () => {
        mockGenerateSmartSchedule.mockRejectedValue(new Error("API Error"));

        render(<SmartScheduleDialog open={true} onOpenChange={mockOnOpenChange} />);
        const user = userEvent.setup();

        await user.click(screen.getByText("Generate Schedule"));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("Failed to generate schedule. Please check your API key.");
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
        const user = userEvent.setup();

        // Generate first
        await user.click(screen.getByText("Generate Schedule"));

        // Wait for Accept button to appear
        await waitFor(() => {
            expect(screen.getByText("Accept")).toBeDefined();
        });

        // Apply
        await user.click(screen.getByText("Accept"));

        // Wait for the apply action to complete
        await waitFor(() => {
            expect(mockApplyScheduleSuggestion).toHaveBeenCalledWith(1, suggestions[0].suggestedDate);
        });
        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("Task scheduled!");
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
        const user = userEvent.setup();

        // Generate first
        await user.click(screen.getByText("Generate Schedule"));

        const rejectBtn = await screen.findByRole("button", { name: "Reject suggestion" });

        await user.click(rejectBtn);

        await waitFor(() => {
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });

        expect(mockApplyScheduleSuggestion).not.toHaveBeenCalled();
    });
});
