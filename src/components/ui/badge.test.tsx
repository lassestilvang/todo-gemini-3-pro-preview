import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Badge } from "./badge";
import React from "react";

describe("Badge", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Badge>New</Badge>);
        const badge = screen.getByText("New");
        expect(badge).toBeInTheDocument();
    });

    it("should apply variant classes", () => {
        render(<Badge variant="destructive">Error</Badge>);
        const badge = screen.getByText("Error");
        expect(badge.className).toContain("bg-destructive");
    });

    it("should apply custom classes", () => {
        render(<Badge className="custom-class">Custom</Badge>);
        const badge = screen.getByText("Custom");
        expect(badge.className).toContain("custom-class");
    });
});
