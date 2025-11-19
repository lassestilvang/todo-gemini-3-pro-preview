import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { Separator } from "./separator";
import React from "react";

describe("Separator", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Separator />);
        // Radix Separator with decorative=true (default) has role="none"
        // We query by the data-slot attribute we added in the component
        const separator = document.querySelector('[data-slot="separator"]');
        expect(separator).toBeInTheDocument();
    });

    it("should apply orientation class", () => {
        render(<Separator orientation="vertical" />);
        const separator = document.querySelector('[data-slot="separator"]');
        expect(separator).toHaveAttribute("data-orientation", "vertical");
    });
});
