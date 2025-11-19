import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Textarea } from "./textarea";
import React from "react";

describe("Textarea", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Textarea placeholder="Type here" />);
        const textarea = screen.getByPlaceholderText("Type here");
        expect(textarea).toBeInTheDocument();
    });

    it("should handle text entry", () => {
        render(<Textarea />);
        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Hello World" } });
        expect(textarea).toHaveValue("Hello World");
    });

    it("should be disabled when disabled prop is passed", () => {
        render(<Textarea disabled />);
        const textarea = screen.getByRole("textbox");
        expect(textarea).toBeDisabled();
    });
});
