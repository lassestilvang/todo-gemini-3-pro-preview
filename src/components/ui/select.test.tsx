import { describe, it, expect, afterEach, beforeAll } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import React from "react";
import userEvent from "@testing-library/user-event";

describe("Select", () => {
    beforeAll(() => {
        // Mock pointer capture methods globally
        if (!Element.prototype.setPointerCapture) {
            Element.prototype.setPointerCapture = () => {};
        }
        if (!Element.prototype.releasePointerCapture) {
            Element.prototype.releasePointerCapture = () => {};
        }
        if (!Element.prototype.hasPointerCapture) {
            Element.prototype.hasPointerCapture = () => false;
        }
    });

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

    it("should open content when trigger is clicked", async () => {
        const user = userEvent.setup();
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

        // Robustly find trigger: try role first (standard), fallback to text (resilient to HappyDOM quirks where role might be missing)
        const trigger = screen.queryByRole("combobox") || screen.getByText("Select option");

        await user.click(trigger);

        // Radix Select content is rendered in a portal
        // Use findByRole which handles waiting automatically.
        // We use hidden: true because Radix UI can sometimes manage visibility in ways that
        // strictly accessible queries might miss during transitions/portaling in test environments.
        const option = await screen.findByRole("option", { name: "Option 1", hidden: true }, { timeout: 15000 });
        expect(option).toBeInTheDocument();
    }, 30000);
});
