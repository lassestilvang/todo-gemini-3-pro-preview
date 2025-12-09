import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the auth module before importing the component
// This prevents the auth module from loading next/cache
const mockSignOut = mock(() => Promise.resolve());
mock.module("@/lib/auth", () => ({
    signOut: mockSignOut,
}));

import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
    beforeEach(() => {
        mockSignOut.mockClear();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("returns null when user is null", () => {
        const { container } = render(<UserProfile user={null} />);
        expect(container.firstChild).toBeNull();
    });

    it("displays user full name when firstName and lastName are available", () => {
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: "John",
            lastName: "Doe",
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);
        expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("displays email as fallback when name is not available", () => {
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: null,
            lastName: null,
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("displays firstName only when lastName is not available", () => {
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: "John",
            lastName: null,
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);
        expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("displays initials in avatar fallback with full name", () => {
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: "John",
            lastName: "Doe",
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);
        expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("displays first letter of email as initials when name not available", () => {
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: null,
            lastName: null,
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);
        expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("triggers sign-out action when sign out is clicked", async () => {
        const testUser = userEvent.setup();
        const userData = {
            id: "user_123",
            email: "john@example.com",
            firstName: "John",
            lastName: "Doe",
            avatarUrl: null,
        };

        render(<UserProfile user={userData} />);

        // Open dropdown using userEvent
        const triggerButton = screen.getByRole("button");
        await testUser.click(triggerButton);

        // Wait for dropdown to appear and click sign out
        const signOutItem = await screen.findByRole("menuitem", { name: /sign out/i });
        await testUser.click(signOutItem);

        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalled();
        });
    });
});
