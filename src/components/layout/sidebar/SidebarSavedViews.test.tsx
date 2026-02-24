
import { describe, it, expect, mock, afterEach, beforeAll, beforeEach, spyOn } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { mockUsePathname } from "@/test/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let SidebarSavedViews: typeof import("./SidebarSavedViews").SidebarSavedViews;

// Mock actions using spyOn instead of mock.module to prevent leakage
import * as actions from "@/lib/actions";

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe("SidebarSavedViews", () => {
    beforeAll(async () => {
        ({ SidebarSavedViews } = await import("./SidebarSavedViews"));
    });

    beforeEach(() => {
        mockUsePathname.mockReturnValue("/views/1");
        spyOn(actions, "getSavedViews").mockResolvedValue([]);
        spyOn(actions, "deleteSavedView").mockResolvedValue({ success: true });
    });

    afterEach(() => {
        cleanup();
        mock.restore();
    });

    it("should render saved views", async () => {
        const queryClient = createTestQueryClient();
        spyOn(actions, "getSavedViews").mockResolvedValue([
            { id: 1, name: "My View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
            { id: 2, name: "Other View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
        ]);

        render(
            <QueryClientProvider client={queryClient}>
                <SidebarSavedViews userId="user-1" />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("My View")).toBeInTheDocument();
            expect(screen.getByText("Other View")).toBeInTheDocument();
        });
    });

    it("should have aria-current='page' on the active view link", async () => {
        const queryClient = createTestQueryClient();
        spyOn(actions, "getSavedViews").mockResolvedValue([
            { id: 1, name: "My View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
            { id: 2, name: "Other View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
        ]);

        render(
            <QueryClientProvider client={queryClient}>
                <SidebarSavedViews userId="user-1" />
            </QueryClientProvider>
        );

        await waitFor(() => {
            const activeLink = screen.getByRole("link", { name: /My View/i });
            expect(activeLink).toHaveAttribute("aria-current", "page");

            const inactiveLink = screen.getByRole("link", { name: /Other View/i });
            expect(inactiveLink).not.toHaveAttribute("aria-current");
        });
    });

    it("should have aria-label on delete buttons", async () => {
        const queryClient = createTestQueryClient();
        spyOn(actions, "getSavedViews").mockResolvedValue([
            { id: 1, name: "My View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
            { id: 2, name: "Other View", filter: {}, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
        ]);

        render(
            <QueryClientProvider client={queryClient}>
                <SidebarSavedViews userId="user-1" />
            </QueryClientProvider>
        );

        await waitFor(() => {
            const deleteButtons = screen.getAllByLabelText(/Delete view/i);
            expect(deleteButtons).toHaveLength(2);
            expect(deleteButtons[0]).toBeInTheDocument();
        });
    });
});
