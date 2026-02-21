import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ManageLabelDialog } from "./ManageLabelDialog";
import React from "react";

describe("ManageLabelDialog", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render trigger button", async () => {
        render(<ManageLabelDialog trigger={<button>Manage Labels</button>} />);
        expect(screen.getByText(/Manage Labels/i)).toBeDefined();
    });

    it("should open create dialog", async () => {
        render(<ManageLabelDialog trigger={<button>Manage Labels</button>} />);
        fireEvent.click(screen.getByText(/Manage Labels/i));

        await waitFor(() => {
            expect(screen.getByText(/Labels/i) || screen.getByText(/New Label/i)).toBeDefined();
        });
    });

    it("should show in-app delete confirmation for existing labels", async () => {
        render(
            <ManageLabelDialog
                open={true}
                onOpenChange={() => { }}
                userId="test_user_123"
                label={{ id: 1, name: "Important", color: "#ef4444", icon: "hash", description: null }}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("button", { name: "Delete Label" })).toBeInTheDocument();
    });
});
