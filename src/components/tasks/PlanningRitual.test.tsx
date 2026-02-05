import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { PlanningRitual } from "./PlanningRitual";
import React from "react";
import { sqliteConnection } from "@/db";
import { setMockAuthUser } from "@/test/mocks";
// Mocks should be targeted and not leak to other tests

describe("PlanningRitual", () => {
    beforeEach(async () => {
        setMockAuthUser({
            id: "test_user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
        });
        sqliteConnection.run("INSERT OR IGNORE INTO users (id, email, is_initialized) VALUES ('test_user_123', 'test@example.com', 1)");
    });

    afterEach(() => {
        cleanup();
    });

    it("should step through morning ritual", async () => {
        render(<PlanningRitual type="morning" open={true} onOpenChange={() => { }} userId="test_user_123" />);

        expect(screen.getByText(/Morning Planning Ritual/i)).toBeDefined();

        fireEvent.click(screen.getByText(/Set Priorities/i));

        await waitFor(() => {
            expect(screen.getByText(/What are your top 3 priorities/i)).toBeDefined();
        });

        fireEvent.click(screen.getByText(/Start Your Day/i));
    });

    it("should step through evening ritual", async () => {
        render(<PlanningRitual type="evening" open={true} onOpenChange={() => { }} userId="test_user_123" />);

        expect(screen.getByText(/Evening Review/i)).toBeDefined();

        fireEvent.click(screen.getByText(/Reflect on Your Day/i));

        await waitFor(() => {
            expect(screen.getByText(/Daily Reflection/i)).toBeDefined();
        });

        fireEvent.click(screen.getByText(/Finish Day/i));
    });

    it("should handle empty tasks", () => {
        render(<PlanningRitual type="morning" open={true} onOpenChange={() => { }} userId="test_user_123" />);
        expect(screen.getByText(/Morning Planning Ritual/i)).toBeDefined();
    });
});
