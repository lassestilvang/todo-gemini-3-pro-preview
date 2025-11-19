import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Toggle } from "./toggle";
import React from "react";

describe("Toggle", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Toggle>Bold</Toggle>);
        const toggle = screen.getByText("Bold");
        expect(toggle).toBeInTheDocument();
    });

    it("should handle click", () => {
        let pressed = false;
        const handlePressedChange = (val: boolean) => {
            pressed = val;
        };
        render(<Toggle onPressedChange={handlePressedChange}>Bold</Toggle>);
        const toggle = screen.getByRole("button");
        fireEvent.click(toggle);
        expect(pressed).toBe(true);
    });

    it("should show pressed state", () => {
        render(<Toggle pressed>Bold</Toggle>);
        const toggle = screen.getByRole("button");
        expect(toggle).toHaveAttribute("aria-pressed", "true");
    });
});
