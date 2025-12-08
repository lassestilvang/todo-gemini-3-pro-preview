import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the auth module before importing the component
// This prevents the auth module from loading next/cache
const mockSignOut = mock(() => Promise.resolve());
mock.module("@/lib/auth", () => ({
    signOut: mockSignOut,
}));

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
        const user = {
            id: "user_123",
            email: "john@example.com",
            firstName: "John",
            lastName: "Doe",
            avatarUrl: null,
        };

        render(<UserProfile user={user} />);

        // Click the trigger button to open dropdown
        const triggerButton = screen.getByRole("button");
        fireEvent.pointerDown(triggerButton);
        fireEvent.click(triggerButton);

        // Wait for dropdown to open
        await new Promise(resolve => setTimeout(resolve, 100));

        const signOutItem = screen.getByText("Sign Out");
        fireEvent.click(signOutItem);

        expect(mockSignOut).toHaveBeenCalled();
    });
});
