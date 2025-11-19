import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Input } from "./input";
import React from "react";

describe("Input", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText("Enter text");
        expect(input).toBeInTheDocument();
    });

    it("should handle text entry", () => {
        render(<Input />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Hello" } });
        expect(input).toHaveValue("Hello");
    });

    it("should be disabled when disabled prop is passed", () => {
        render(<Input disabled />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    it("should apply custom classes", () => {
        render(<Input className="custom-class" />);
        const input = screen.getByRole("textbox");
        expect(input.className).toContain("custom-class");
    });
});
