import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import React from "react";

describe("DropdownMenu", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
        expect(screen.getByText("Open Menu")).toBeInTheDocument();
    });

    it("should open content when trigger is clicked", async () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        const trigger = screen.getByText("Open Menu");
        fireEvent.pointerDown(trigger);
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(screen.getByText("Item 1")).toBeInTheDocument();
        });
    });
});
