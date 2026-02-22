
import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { SidebarSavedViews } from "./SidebarSavedViews";

// Mock next/navigation
mock.module("next/navigation", () => ({
    usePathname: () => "/views/1",
    useRouter: () => ({ push: () => {} }),
}));

// Mock react-query
mock.module("@tanstack/react-query", () => ({
    useQuery: () => ({
        data: [
            { id: 1, name: "My View" },
            { id: 2, name: "Other View" },
        ],
        isLoading: false,
    }),
    useMutation: () => ({
        mutate: () => {},
    }),
    useQueryClient: () => ({
        invalidateQueries: () => {},
    }),
}));

// Mock actions
mock.module("@/lib/actions", () => ({
    getSavedViews: () => Promise.resolve([]),
    deleteSavedView: () => Promise.resolve({ success: true }),
}));

describe("SidebarSavedViews", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render saved views", () => {
        render(<SidebarSavedViews userId="user-1" />);
        expect(screen.getByText("My View")).toBeInTheDocument();
        expect(screen.getByText("Other View")).toBeInTheDocument();
    });

    it("should have aria-current='page' on the active view link", () => {
        render(<SidebarSavedViews userId="user-1" />);
        const activeLink = screen.getByRole("link", { name: /My View/i });
        expect(activeLink).toHaveAttribute("aria-current", "page");

        const inactiveLink = screen.getByRole("link", { name: /Other View/i });
        expect(inactiveLink).not.toHaveAttribute("aria-current");
    });

    it("should have aria-label on delete buttons", () => {
        render(<SidebarSavedViews userId="user-1" />);
        const deleteButtons = screen.getAllByLabelText("Delete view");
        expect(deleteButtons).toHaveLength(2);
        expect(deleteButtons[0]).toBeInTheDocument();
    });
});
