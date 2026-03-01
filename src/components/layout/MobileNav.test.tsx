import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MobileNav } from "./MobileNav";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("MobileNav", () => {
    it("should render and have accessible tooltip", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <MobileNav>
                    <div data-testid="nav-content">Nav Content</div>
                </MobileNav>
            </TooltipProvider>
        );

        const toggleBtn = screen.getByRole("button", { name: /toggle menu/i });
        expect(toggleBtn).toBeInTheDocument();

        // Check tooltip text is rendered somewhere (mocked or hidden)
        expect(screen.getByText("Open Navigation Menu")).toBeInTheDocument();
    });
});
