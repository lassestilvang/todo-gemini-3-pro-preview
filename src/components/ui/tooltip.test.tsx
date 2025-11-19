import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import React from "react";

describe("Tooltip", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render trigger", () => {
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
        expect(screen.getByText("Hover me")).toBeInTheDocument();
    });

    // Note: Testing tooltip visibility usually requires waiting for delays and handling pointer events which can be flaky in happy-dom.
    // We'll stick to basic rendering for now.
});
