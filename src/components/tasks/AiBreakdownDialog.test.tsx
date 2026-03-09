import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiBreakdownDialog } from "./AiBreakdownDialog";
import * as smartScheduler from "@/lib/smart-scheduler";

describe("AiBreakdownDialog", () => {
    const onOpenChange = mock();
    const onConfirm = mock();

    beforeEach(() => {
        onOpenChange.mockClear();
        onConfirm.mockClear();
    });

    afterEach(() => {
        mock.restore();
        cleanup();
    });

    it("counts selected subtasks from current suggestions when stale excluded indices exist", async () => {
        const generateSubtasksSpy = spyOn(smartScheduler, "generateSubtasks")
            .mockResolvedValueOnce([
                { title: "First", estimateMinutes: 10 },
                { title: "Second", estimateMinutes: 15 },
                { title: "Third", estimateMinutes: 20 },
            ])
            .mockResolvedValueOnce([
                { title: "Only one", estimateMinutes: 10 },
            ]);

        const user = userEvent.setup();
        const { rerender } = render(
            <AiBreakdownDialog
                open={true}
                onOpenChange={onOpenChange}
                taskTitle="initial title"
                onConfirm={onConfirm}
            />
        );

        await waitFor(() => {
            expect(screen.getByText("First")).toBeDefined();
        });

        await user.click(screen.getByLabelText("Third"));
        expect(screen.getByRole("button", { name: "Add 2 Subtasks" })).toBeDefined();

        rerender(
            <AiBreakdownDialog
                open={true}
                onOpenChange={onOpenChange}
                taskTitle="updated title"
                onConfirm={onConfirm}
            />
        );

        await waitFor(() => {
            expect(screen.getByText("Only one")).toBeDefined();
        });

        const addButton = screen.getByRole("button", { name: "Add 1 Subtasks" });
        expect(addButton.hasAttribute("disabled") || addButton.getAttribute("aria-disabled") === "true").toBe(false);
        expect(generateSubtasksSpy).toHaveBeenCalledTimes(2);
    });
});
