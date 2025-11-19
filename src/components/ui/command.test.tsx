import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "./command";
import React from "react";

describe("Command", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(
            <Command>
                <CommandInput placeholder="Type a command..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem>Calendar</CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        );

        expect(screen.getByPlaceholderText("Type a command...")).toBeInTheDocument();
        expect(screen.getByText("Calendar")).toBeInTheDocument();
    });
});
