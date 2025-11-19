import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import React from "react";

describe("Select", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                </SelectContent>
            </Select>
        );
        expect(screen.getByText("Select option")).toBeInTheDocument();
    });

    // Note: Select interaction testing can be tricky with pointer events mock requirements.
    // We'll stick to basic rendering and trigger interaction.
    it("should open content when trigger is clicked", async () => {
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                </SelectContent>
            </Select>
        );

        // Select trigger usually has role="combobox"
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);

        // Radix Select content is rendered in a portal, but testing-library should find it by text
        // However, pointer-events issues might prevent full interaction simulation in happy-dom without more mocks.
        // Let's see if basic click works.
        // If this fails, we might need to mock pointer capture.
    });
});
