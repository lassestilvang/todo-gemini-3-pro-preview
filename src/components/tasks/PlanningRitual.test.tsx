import { describe, it, expect, afterEach, beforeEach, beforeAll, mock } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { sqliteConnection } from "@/db";
import { setMockAuthUser } from "@/test/mocks";
import userEvent from "@testing-library/user-event";
// Mocks should be targeted and not leak to other tests

const getTasksMock = mock(() => Promise.resolve([]));
mock.module("@/lib/actions", () => ({
    getTasks: getTasksMock
}));

let PlanningRitual: typeof import("./PlanningRitual").PlanningRitual;

describe("PlanningRitual", () => {
    beforeAll(async () => {
        ({ PlanningRitual } = await import("./PlanningRitual"));
    });

    beforeEach(async () => {
        getTasksMock.mockClear();
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

        expect(await screen.findByText(/Morning Planning Ritual/i)).toBeDefined();
        await waitFor(() => {
            expect(getTasksMock).toHaveBeenCalled();
        });

        await user.click(screen.getByText(/Set Priorities/i));

        await waitFor(() => {
            expect(screen.getByText(/What are your top 3 priorities/i)).toBeDefined();
        });

        await user.click(screen.getByText(/Start Your Day/i));
    });

    it("should step through evening ritual", async () => {
        const user = userEvent.setup();
        render(<PlanningRitual type="evening" open={true} onOpenChange={() => { }} userId="test_user_123" />);

        expect(await screen.findByText(/Evening Review/i)).toBeDefined();
        await waitFor(() => {
            expect(getTasksMock).toHaveBeenCalled();
        });

        await user.click(screen.getByText(/Reflect on Your Day/i));

        await waitFor(() => {
            expect(screen.getByText(/Daily Reflection/i)).toBeDefined();
        });

        await user.click(screen.getByText(/Finish Day/i));
    });

    it("should handle empty tasks", async () => {
        render(<PlanningRitual type="morning" open={true} onOpenChange={() => { }} userId="test_user_123" />);
        expect(await screen.findByText(/Morning Planning Ritual/i)).toBeDefined();
        await waitFor(() => {
            expect(getTasksMock).toHaveBeenCalled();
        });
    });
});
