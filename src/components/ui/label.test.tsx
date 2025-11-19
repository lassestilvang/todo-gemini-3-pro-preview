import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Label } from "./label";
import React from "react";

describe("Label", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Label htmlFor="email">Email</Label>);
        const label = screen.getByText("Email");
        expect(label).toBeInTheDocument();
        expect(label).toHaveAttribute("for", "email");
    });

    it("should apply custom classes", () => {
        render(<Label className="custom-class">Custom</Label>);
        const label = screen.getByText("Custom");
        expect(label.className).toContain("custom-class");
    });
});
