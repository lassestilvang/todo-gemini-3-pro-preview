import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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
        // Mock pointer capture methods which are required for Radix UI Select
        if (!Element.prototype.setPointerCapture) {
            Element.prototype.setPointerCapture = () => {};
        }
        if (!Element.prototype.releasePointerCapture) {
            Element.prototype.releasePointerCapture = () => {};
        }
        if (!Element.prototype.hasPointerCapture) {
            Element.prototype.hasPointerCapture = () => false;
        }

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

        const trigger = screen.getByRole("combobox");

        await React.act(async () => {
            // Radix Select uses pointerdown/pointerup, so plain click might not be enough in some environments
            fireEvent.pointerDown(trigger, { button: 0 });
            fireEvent.click(trigger);
        });

        // Radix Select content is rendered in a portal. Using findByRole handles the waiting logic.
        expect(await screen.findByRole("option", { name: "Option 1" }, { timeout: 30000 })).toBeInTheDocument();
    }, 40000);
});
