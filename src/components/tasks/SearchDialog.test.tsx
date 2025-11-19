import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { SearchDialog } from "./SearchDialog";
import React from "react";

// Mock actions
const mockSearchTasks = mock(() => Promise.resolve([]));
mock.module("@/lib/actions", () => ({
    searchTasks: mockSearchTasks
}));

// Mock useRouter
const mockPush = mock();
mock.module("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush
    })
}));

describe("SearchDialog", () => {
    beforeEach(() => {
        mockSearchTasks.mockClear();
        mockPush.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render trigger button", () => {
        render(<SearchDialog />);
        expect(screen.getByText("Search tasks...")).toBeInTheDocument();
    });

    it("should open dialog on click", () => {
        render(<SearchDialog />);
        fireEvent.click(screen.getByText("Search tasks..."));
        expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });

    it("should search tasks on input", async () => {
        mockSearchTasks.mockResolvedValue([
            { id: 1, title: "Found Task", description: "Description" }
        ]);

        render(<SearchDialog />);
        fireEvent.click(screen.getByText("Search tasks..."));

        const input = screen.getByPlaceholderText("Type a command or search...");
        fireEvent.change(input, { target: { value: "Found" } });

        await waitFor(() => {
            expect(mockSearchTasks).toHaveBeenCalledWith("Found");
            expect(screen.getByText("Found Task")).toBeInTheDocument();
        });
    });

    it("should navigate on selection", async () => {
        mockSearchTasks.mockResolvedValue([
            { id: 1, title: "Found Task", description: "Description" }
        ]);

        render(<SearchDialog />);
        fireEvent.click(screen.getByText("Search tasks..."));

        const input = screen.getByPlaceholderText("Type a command or search...");
        fireEvent.change(input, { target: { value: "Found" } });

        await waitFor(() => {
            expect(screen.getByText("Found Task")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Found Task"));
        expect(mockPush).toHaveBeenCalledWith("?taskId=1");
    });
});
