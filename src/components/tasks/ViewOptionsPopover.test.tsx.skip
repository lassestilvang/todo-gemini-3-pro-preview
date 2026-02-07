import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ViewOptionsPopover } from "./ViewOptionsPopover";
import React from "react";

// Mock server actions
// Note: sonner is mocked globally in src/test/setup.tsx

mock.module("@/lib/actions/labels", () => ({
    getLabels: mock(async () => []),
}));

mock.module("@/lib/actions/view-settings", () => ({
    saveViewSettings: mock(async () => ({ success: true })),
    resetViewSettings: mock(async () => ({ success: true })),
}));

mock.module("@/lib/actions/views", () => ({
    createSavedView: mock(async () => ({ success: true, data: { id: 1 } })),
}));

describe("ViewOptionsPopover", () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        viewId: "test-view",
        userId: "user-123",
        settings: {
            layout: "list",
            showCompleted: true,
            groupBy: "none",
            sortBy: "manual",
            sortOrder: "asc",
            filterDate: "all",
        },
        onSettingsChange: mock(() => {}),
    };

    it("renders the trigger button", async () => {
        render(<ViewOptionsPopover {...defaultProps} />);
        expect(screen.getByRole("button", { name: /view/i })).toBeDefined();
    });

    it("opens popover and shows layout options with correct aria roles", async () => {
        render(<ViewOptionsPopover {...defaultProps} />);
        const trigger = screen.getByRole("button", { name: /view/i });
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(screen.getByRole("radiogroup", { name: /layout view/i })).toBeDefined();
        });

        const listLayout = screen.getByRole("radio", { name: /list layout/i });
        expect(listLayout).toBeDefined();
        expect(listLayout.getAttribute("aria-checked")).toBe("true");

        const boardLayout = screen.getByRole("radio", { name: /board layout/i });
        expect(boardLayout).toBeDefined();
        expect(boardLayout.getAttribute("aria-checked")).toBe("false");
        // Check disabled state
        expect(boardLayout.hasAttribute("disabled")).toBe(true);
    });

    it("shows sort and filter sections with aria-expanded", async () => {
        render(<ViewOptionsPopover {...defaultProps} />);
        const trigger = screen.getByRole("button", { name: /view/i });
        fireEvent.click(trigger);

        await waitFor(() => {
             expect(screen.getByText("Sort")).toBeDefined();
             expect(screen.getByText("Filter")).toBeDefined();
        });

        const sortToggle = screen.getByText("Sort").closest("button");
        expect(sortToggle).toBeDefined();
        expect(sortToggle?.getAttribute("aria-expanded")).toBe("true");
        expect(sortToggle?.getAttribute("aria-controls")).toBe("sort-options");

        const filterToggle = screen.getByText("Filter").closest("button");
        expect(filterToggle).toBeDefined();
        expect(filterToggle?.getAttribute("aria-expanded")).toBe("true");
        expect(filterToggle?.getAttribute("aria-controls")).toBe("filter-options");
    });

    it("renders save view input with aria-label", async () => {
        render(<ViewOptionsPopover {...defaultProps} />);
        const trigger = screen.getByRole("button", { name: /view/i });
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(screen.getByLabelText("View name")).toBeDefined();
        });

        const input = screen.getByLabelText("View name");
        expect(input).toBeDefined();
    });
});
