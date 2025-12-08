import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ManageLabelDialog } from "./ManageLabelDialog";
import React from "react";

// Mock actions
const mockCreateLabel = mock(() => Promise.resolve());
const mockUpdateLabel = mock(() => Promise.resolve());
const mockDeleteLabel = mock(() => Promise.resolve());
const mockGetLabels = mock(() => Promise.resolve([
    { id: 1, name: "Existing Label", color: "#ff0000", icon: "Tag" }
]));

mock.module("@/lib/actions", () => ({
    createLabel: mockCreateLabel,
    updateLabel: mockUpdateLabel,
    deleteLabel: mockDeleteLabel,
    getLabels: mockGetLabels
}));

describe("ManageLabelDialog", () => {
    beforeEach(() => {
        mockCreateLabel.mockClear();
        mockUpdateLabel.mockClear();
        mockDeleteLabel.mockClear();
        mockGetLabels.mockClear();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger button", async () => {
        render(<ManageLabelDialog trigger={<button>Manage Labels</button>} />);
        expect(screen.getByText("Manage Labels")).toBeInTheDocument();
    });

    it("should open create dialog", async () => {
        render(<ManageLabelDialog trigger={<button>Manage Labels</button>} />);
        fireEvent.click(screen.getByText("Manage Labels"));

        // Wait for dialog to open
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(screen.getByText("New Label")).toBeInTheDocument();
    });

    it("should create a new label", async () => {
        render(<ManageLabelDialog trigger={<button>Manage Labels</button>} userId="test_user_123" />);
        fireEvent.click(screen.getByText("Manage Labels"));

        // Wait for dialog to open
        await new Promise(resolve => setTimeout(resolve, 50));

        fireEvent.change(screen.getByPlaceholderText("Label Name"), { target: { value: "New Label" } });
        fireEvent.click(screen.getByText("Save"));

        // Wait for async action
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockCreateLabel).toHaveBeenCalledWith(expect.objectContaining({
            name: "New Label"
        }));
    });

    it("should delete a label", async () => {
        // Mock confirm
        global.confirm = () => true;
        const label = { id: 1, name: "Existing Label", color: "#ff0000", icon: "Tag" };

        render(<ManageLabelDialog label={label} open={true} userId="test_user_123" />);

        // Wait for dialog to render
        await new Promise(resolve => setTimeout(resolve, 50));

        fireEvent.click(screen.getByText("Delete"));

        // Wait for async action
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockDeleteLabel).toHaveBeenCalledWith(1, "test_user_123");
    });
});
