import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanningRitual } from "./PlanningRitual";
import React from "react";
import { sqliteConnection } from "@/db";
import { setMockAuthUser } from "@/test/mocks";
import { mock } from "bun:test";
// Mocks should be targeted and not leak to other tests

mock.module("@/lib/actions", () => ({
    getTasks: mock(() => Promise.resolve([]))
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

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
        const user = userEvent.setup();
        render(<PlanningRitual type="morning" open={true} onOpenChange={() => { }} userId="test_user_123" />);
        await act(async () => {
            await flushPromises();
        });

        expect(screen.getByText(/Morning Planning Ritual/i)).toBeDefined();

        await user.click(screen.getByText(/Set Priorities/i));

        await waitFor(() => {
            expect(screen.getByText(/What are your top 3 priorities/i)).toBeDefined();
        });

        await user.click(screen.getByText(/Start Your Day/i));
    });

    it("should step through evening ritual", async () => {
        const user = userEvent.setup();
        render(<PlanningRitual type="evening" open={true} onOpenChange={() => { }} userId="test_user_123" />);
        await act(async () => {
            await flushPromises();
        });

        expect(screen.getByText(/Evening Review/i)).toBeDefined();

        await user.click(screen.getByText(/Reflect on Your Day/i));

        await waitFor(() => {
            expect(screen.getByText(/Daily Reflection/i)).toBeDefined();
        });

        await user.click(screen.getByText(/Finish Day/i));
    });

    it("should handle empty tasks", async () => {
        render(<PlanningRitual type="morning" open={true} onOpenChange={() => { }} userId="test_user_123" />);
        await act(async () => {
            await flushPromises();
        });
        expect(screen.getByText(/Morning Planning Ritual/i)).toBeDefined();
    });
});
