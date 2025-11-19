import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import React from "react";

describe("Popover", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(
            <Popover>
                <PopoverTrigger>Open Popover</PopoverTrigger>
                <PopoverContent>Popover Content</PopoverContent>
            </Popover>
        );
        expect(screen.getByText("Open Popover")).toBeInTheDocument();
    });

    it("should open content when trigger is clicked", async () => {
        render(
            <Popover>
                <PopoverTrigger>Open Popover</PopoverTrigger>
                <PopoverContent>Popover Content</PopoverContent>
            </Popover>
        );

        fireEvent.click(screen.getByText("Open Popover"));

        await waitFor(() => {
            expect(screen.getByText("Popover Content")).toBeInTheDocument();
        });
    });
});
