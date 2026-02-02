import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ManageListDialog } from "./ManageListDialog";
import React from "react";

// Mock actions
import { db, lists as listsTable } from "@/db";
import { eq } from "drizzle-orm";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";

describe("ManageListDialog", () => {
    let TEST_USER_ID: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        // await resetTestDb();
        // Unique ID per test for isolation
        TEST_USER_ID = `user_${Math.random().toString(36).substring(7)}`;
        await createTestUser(TEST_USER_ID, `${TEST_USER_ID}@example.com`);
        setMockAuthUser({ id: TEST_USER_ID, email: `${TEST_USER_ID}@example.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger button", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} userId={TEST_USER_ID} />);
        expect(screen.getByText("Manage Lists")).toBeInTheDocument();
    });

    it("should open dialog and show form", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} userId={TEST_USER_ID} />);
        fireEvent.click(screen.getByText("Manage Lists"));

        expect(await screen.findByText("New List")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("List Name")).toBeInTheDocument();
    });

    it("should create a new list", async () => {
        render(<ManageListDialog trigger={<button>Manage Lists</button>} userId={TEST_USER_ID} />);
        fireEvent.click(screen.getByText("Manage Lists"));

        const nameInput = await screen.findByPlaceholderText("List Name");
        fireEvent.change(nameInput, { target: { value: "New List" } });

        const form = nameInput.closest("form");
        expect(form).not.toBeNull();
        fireEvent.submit(form!);

        // Wait for list to appear in DB or verify action completed successfully
        await waitFor(async () => {
            const list = await db.select().from(listsTable).where(eq(listsTable.name, "New List"));
            expect(list.length).toBe(1);
            expect(list[0].userId).toBe(TEST_USER_ID);
        });
    });
});
