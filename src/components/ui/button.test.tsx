import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Button } from "./button";
import React from "react";

describe("Button", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole("button", { name: /click me/i });
        expect(button).toBeInTheDocument();
    });

    it("should handle click events", () => {
        let clicked = false;
        const handleClick = () => {
            clicked = true;
        };
        render(<Button onClick={handleClick}>Click me</Button>);
        const button = screen.getByRole("button", { name: /click me/i });
        fireEvent.click(button);
        expect(clicked).toBe(true);
    });

    it("should apply variant classes", () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByRole("button", { name: /delete/i });
        expect(button.className).toContain("bg-destructive");
    });

    it("should be disabled when disabled prop is passed", () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole("button", { name: /disabled/i });
        expect(button).toBeDisabled();
    });
});
