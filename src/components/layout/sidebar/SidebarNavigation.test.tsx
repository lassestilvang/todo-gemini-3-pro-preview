import { describe, it, expect, mock, afterEach, beforeEach, beforeAll } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { mockUsePathname, mockUseTaskCounts } from "@/test/mocks";

let SidebarNavigation: typeof import("./SidebarNavigation").SidebarNavigation;

describe("SidebarNavigation", () => {
    beforeAll(async () => {
        ({ SidebarNavigation } = await import("./SidebarNavigation"));
    });

    beforeEach(() => {
        mockUsePathname.mockReturnValue("/inbox");
        mockUseTaskCounts.mockReturnValue({
            inbox: 5,
            today: 0,
            upcoming: 0,
            total: 10,
            listCounts: {},
            labelCounts: {},
        });
    });

    afterEach(() => {
        cleanup();
        mockUseTaskCounts.mockClear();
    });

    it("should render navigation links", () => {
        render(<SidebarNavigation />);
        expect(screen.getByText("Inbox")).toBeInTheDocument();
        expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should show task counts", () => {
        render(<SidebarNavigation />);
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should have aria-current='page' on the active link", () => {
        render(<SidebarNavigation />);
        const inboxLink = screen.getByRole("link", { name: /Inbox/i });
        expect(inboxLink).toHaveAttribute("aria-current", "page");

        const todayLink = screen.getByRole("link", { name: /Today/i });
        expect(todayLink).not.toHaveAttribute("aria-current");
    });
});
