import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SubtaskRow } from "./SubtaskRow";
import React from "react";

// Mock the Checkbox component since it might have internal logic we don't need to test fully here
// and to avoid issues with Radix primitives in test environment if not fully polyfilled.
mock.module("@/components/ui/checkbox", () => ({
    Checkbox: ({ checked, onCheckedChange, onClick, ...props }: React.ComponentProps<"button"> & { checked?: boolean, onCheckedChange?: (c: boolean) => void }) => (
        <button
            role="checkbox"
            aria-checked={checked}
            onClick={(e) => {
                if (onClick) onClick(e);
                if (onCheckedChange) onCheckedChange(!checked);
            }}
            {...props}
        />
    )
}));

describe("SubtaskRow Interaction", () => {
    afterEach(() => {
        cleanup();
    });

    it("toggles subtask when clicking the row", () => {
        const onToggle = mock((_id: number, _checked: boolean) => {});
        const subtask = {
            id: 1,
            title: "Test Subtask",
            isCompleted: false
        };

        render(
            <SubtaskRow
                subtask={subtask}
                isCompleted={false}
                onToggle={onToggle}
            />
        );

        // Find the text element
        const textElement = screen.getByText("Test Subtask");

        // Click the text element (which is inside the row)
        fireEvent.click(textElement);

        // Expect onToggle to be called
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith(1, true);
    });

    it("toggles subtask when clicking the checkbox directly", () => {
        const onToggle = mock((_id: number, _checked: boolean) => {});
        const subtask = {
            id: 1,
            title: "Test Subtask",
            isCompleted: false
        };

        render(
            <SubtaskRow
                subtask={subtask}
                isCompleted={false}
                onToggle={onToggle}
            />
        );

        // Find the checkbox
        const checkbox = screen.getByRole("checkbox");

        // Click the checkbox
        fireEvent.click(checkbox);

        // Expect onToggle to be called
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith(1, true);
    });

    it("toggles subtask when pressing Enter on the row", () => {
        const onToggle = mock((_id: number, _checked: boolean) => {});
        const subtask = {
            id: 1,
            title: "Test Subtask",
            isCompleted: false
        };

        render(
            <SubtaskRow
                subtask={subtask}
                isCompleted={false}
                onToggle={onToggle}
            />
        );

        const row = screen.getByRole("button", { name: /Test Subtask/i });

        fireEvent.keyDown(row, { key: "Enter", code: "Enter" });

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith(1, true);
    });

    it("toggles subtask when pressing Space on the row", () => {
        const onToggle = mock((_id: number, _checked: boolean) => {});
        const subtask = {
            id: 1,
            title: "Test Subtask",
            isCompleted: true
        };

        render(
            <SubtaskRow
                subtask={subtask}
                isCompleted={true}
                onToggle={onToggle}
            />
        );

        const row = screen.getByRole("button", { name: /Test Subtask/i, hidden: true }).closest('div[role="button"]') || screen.getByRole("button", { hidden: true });

        fireEvent.keyDown(row, { key: " ", code: "Space" });

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith(1, false);
    });
});
