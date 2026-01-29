import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ManageListDialog } from "./ManageListDialog";
import React from "react";

// Mock actions
import { db, lists as listsTable } from "@/db";
import { eq } from "drizzle-orm";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";

describe("ManageListDialog", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
        // Seed user to satisfy FK and for action logic
        const { users } = await import("@/db");
        await db.insert(users).values({ id: "test_user_123", email: "test@example.com", isInitialized: true });
        setMockAuthUser({ id: "test_user_123", email: "test@example.com", firstName: "Test", lastName: "User", profilePictureUrl: null });
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger button", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} authUserId="test_user_123" />);
        expect(screen.getByText("Manage Lists")).toBeInTheDocument();
    });

    it("should open dialog and show form", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} authUserId="test_user_123" />);
        fireEvent.click(screen.getByText("Manage Lists"));

        expect(await screen.findByText("New List")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("List Name")).toBeInTheDocument();
    });

    it("should create a new list", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} authUserId="test_user_123" />);
        fireEvent.click(screen.getByText("Manage Lists"));

        const nameInput = await screen.findByPlaceholderText("List Name");
        fireEvent.change(nameInput, { target: { value: "New List" } });

        const form = nameInput.closest("form");
        expect(form).not.toBeNull();
        fireEvent.submit(form!);

        await waitFor(async () => {
            const list = await db.select().from(listsTable).where(eq(listsTable.name, "New List"));
            expect(list.length).toBe(1);
            expect(list[0].userId).toBe("test_user_123");
        }, { timeout: 3000 });
    });
});
