import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Checkbox } from "./checkbox";
import React from "react";

describe("Checkbox", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Checkbox />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
    });

    it("should handle checked state", () => {
        render(<Checkbox checked />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });

    it("should handle toggle interaction", () => {
        // Note: Radix UI Checkbox interaction might be tricky to test with simple fireEvent
        // We'll test if the click handler is called
        let checked = false;
        const handleCheckedChange = (val: boolean) => {
            checked = val;
        };
        render(<Checkbox onCheckedChange={handleCheckedChange} />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        expect(checked).toBe(true);
    });

    it("should be disabled when disabled prop is passed", () => {
        render(<Checkbox disabled />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeDisabled();
    });
});
