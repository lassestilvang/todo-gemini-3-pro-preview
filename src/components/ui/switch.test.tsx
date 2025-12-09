import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Switch } from "./switch";
import React from "react";

describe("Switch", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Switch />);
        const switchEl = screen.getByRole("switch");
        expect(switchEl).toBeInTheDocument();
    });

    it("should be unchecked by default", () => {
        render(<Switch />);
        const switchEl = screen.getByRole("switch");
        expect(switchEl).toHaveAttribute("data-state", "unchecked");
    });

    it("should be checked when checked prop is true", () => {
        render(<Switch checked />);
        const switchEl = screen.getByRole("switch");
        expect(switchEl).toHaveAttribute("data-state", "checked");
    });

    it("should toggle on click", () => {
        let checked = false;
        const handleChange = (value: boolean) => {
            checked = value;
        };
        render(<Switch onCheckedChange={handleChange} />);
        const switchEl = screen.getByRole("switch");
        fireEvent.click(switchEl);
        expect(checked).toBe(true);
    });

    it("should be disabled when disabled prop is passed", () => {
        render(<Switch disabled />);
        const switchEl = screen.getByRole("switch");
        expect(switchEl).toBeDisabled();
    });

    it("should apply custom className", () => {
        render(<Switch className="custom-class" />);
        const switchEl = screen.getByRole("switch");
        expect(switchEl.className).toContain("custom-class");
    });
});
