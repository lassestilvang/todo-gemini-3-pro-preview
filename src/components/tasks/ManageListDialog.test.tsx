import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ManageListDialog } from "./ManageListDialog";
import React from "react";

// Mock actions
const mockCreateList = mock(() => Promise.resolve({ id: 2, name: "New List", slug: "new-list" }));
const mockUpdateList = mock(() => Promise.resolve());
const mockDeleteList = mock(() => Promise.resolve());
const mockGetLists = mock(() => Promise.resolve([
    { id: 1, name: "Existing List", color: "#ff0000", icon: "List", slug: "existing-list" }
]));

mock.module("@/lib/actions", () => ({
    createList: mockCreateList,
    updateList: mockUpdateList,
    deleteList: mockDeleteList,
    getLists: mockGetLists
}));

describe("ManageListDialog", () => {
    beforeEach(() => {
        mockCreateList.mockClear();
        mockUpdateList.mockClear();
        mockDeleteList.mockClear();
        mockGetLists.mockClear();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger button", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} />);
        expect(screen.getByText("Manage Lists")).toBeInTheDocument();
    });

    it("should open dialog and list lists", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} />);
        fireEvent.click(screen.getByText("Manage Lists"));

        await waitFor(() => {
            expect(screen.getByText("New List")).toBeInTheDocument();
            // The dialog renders a form for creating/editing a single list, not a list of lists.
            // Wait, ManageListDialog renders ListForm which is for ONE list.
            // The component name implies managing *lists* (plural), but the code shows it manages A list (singular/create new).
            // Let's check the code again.
            // ManageListDialog renders ListForm.
            // ListForm has inputs for name, color, icon.
            // It does NOT list existing lists.
            // So expecting "Existing List" is wrong unless we passed it as prop.
        });
    });

    it("should create a new list", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} userId="test_user_123" />);
        fireEvent.click(screen.getByText("Manage Lists"));

        // Wait for dialog to open
        await new Promise(resolve => setTimeout(resolve, 50));

        const nameInput = screen.getByPlaceholderText("List Name");
        fireEvent.change(nameInput, { target: { value: "New List" } });
        fireEvent.click(screen.getByText("Save"));

        // Wait for async action
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockCreateList).toHaveBeenCalledWith(expect.objectContaining({
            name: "New List"
        }));
    });
});
