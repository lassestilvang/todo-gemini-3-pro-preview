import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { clearMockAuthUser, setMockAuthUser } from "@/test/mocks";
import { eq } from "drizzle-orm";

// Mock UI components are now handled globally in src/test/setup.tsx via src/test/mocks-ui.tsx

// Mock window.confirm
const originalConfirm = globalThis.confirm;

describe("TemplateManager", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let TemplateManager: any;
  let templateIds: number[] = [];
  const testUserId = "test_user_123";

  beforeEach(async () => {
    // Reset DB for each test to ensure clean state
    await setupTestDb();
    await resetTestDb();

    await createTestUser(testUserId, `${testUserId}@example.com`);

    setMockAuthUser({
      id: testUserId,
      email: `${testUserId}@example.com`,
      firstName: "Test",
      lastName: "User",
      profilePictureUrl: null
    });

    const { templates } = await import("@/db/schema-sqlite");
    const { db } = await import("@/db");

    // Insert test data
    await db.insert(templates).values([
      {
        id: 1,
        userId: testUserId,
        name: "Weekly Report",
        content: JSON.stringify({ title: "Weekly Report Task", priority: "high" }),
        createdAt: new Date("2024-01-15"),
      },
      {
        id: 2,
        userId: testUserId,
        name: "Daily Standup",
        content: JSON.stringify({ title: "Daily Standup Task", priority: "medium" }),
        createdAt: new Date("2024-01-16"),
      }
    ]);

    templateIds = [1, 2];

    const importedModule = await import("./TemplateManager");
    TemplateManager = importedModule.TemplateManager;

    globalThis.confirm = mock(() => true);
  });

  afterEach(() => {
    globalThis.confirm = originalConfirm;
    clearMockAuthUser();
    mock.restore();
    cleanup();
  });

  describe("template list dialog", () => {
    it("should render Templates button", () => {
      render(<TemplateManager userId="test_user_123" />);
      expect(screen.getByText("Templates")).toBeInTheDocument();
    });

    it("should open template list dialog when Templates button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      // Ensure button is present and click it
      const button = screen.getByText("Templates");
      expect(button).toBeInTheDocument();
      fireEvent.click(button);

      // Wait for dialog content with extremely generous timeout for CI
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      }, { timeout: 30000 });

      await waitFor(() => {
        expect(screen.getByText("Task Templates")).toBeInTheDocument();
      }, { timeout: 30000 });
    }, 40000);

    it("should load and display templates when dialog opens", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByText("Task Templates", {}, { timeout: 30000 })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Weekly Report")).toBeInTheDocument();
        expect(screen.getByText("Daily Standup")).toBeInTheDocument();
      }, { timeout: 30000 });
    }, 40000);

    it("should show empty state when no templates exist", async () => {
      const { templates } = await import("@/db/schema-sqlite");
      const { db } = await import("@/db");
      await db.delete(templates).where(eq(templates.userId, testUserId));

      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByText("No templates found. Create one to get started.")).toBeInTheDocument();
      }, { timeout: 30000 });
    }, 40000);
  });

  describe("create dialog", () => {
    it("should open create dialog when New Template button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId("new-template-button", {}, { timeout: 30000 })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("new-template-button"));

      expect(await screen.findByRole("heading", { name: "Create Template" }, { timeout: 30000 })).toBeInTheDocument();
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    }, 40000);

    it("should show empty form fields in create mode", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId("new-template-button")).toBeInTheDocument();
      }, { timeout: 30000 });

      fireEvent.click(screen.getByTestId("new-template-button"));

      await waitFor(() => {
        const nameInput = screen.getByTestId("template-name-input") as HTMLInputElement;
        const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
        expect(nameInput.value).toBe("");
        expect(titleInput.value).toBe("");
      }, { timeout: 30000 });
    }, 40000);
  });

  describe("edit dialog", () => {
    it("should render edit button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId(`edit-template-${templateIds[0]}`, {}, { timeout: 30000 })).toBeInTheDocument();
      expect(screen.getByTestId(`edit-template-${templateIds[1]}`)).toBeInTheDocument();
    }, 40000);

    it("should open edit dialog with template data when edit button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId("edit-template-1")).toBeInTheDocument();
      }, { timeout: 30000 });

      const editBtn = await screen.findByTestId(`edit-template-${templateIds[0]}`, {}, { timeout: 30000 });
      fireEvent.click(editBtn);

      const nameInput = await screen.findByTestId("template-name-input", {}, { timeout: 30000 }) as HTMLInputElement;
      expect(nameInput.value).toBe("Weekly Report");

      await waitFor(() => {
        const nameInput = screen.getByTestId("template-name-input") as HTMLInputElement;
        expect(nameInput).toBeInTheDocument();
        expect(nameInput.value).toBe("Weekly Report");
      }, { timeout: 30000 });
    }, 40000);

    it("should pre-populate task title from template content", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId(`edit-template-${templateIds[0]}`)).toBeInTheDocument();
      }, { timeout: 30000 });

      fireEvent.click(screen.getByTestId(`edit-template-${templateIds[0]}`));

      await waitFor(() => {
        const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
        expect(titleInput.value).toBe("Weekly Report Task");
      }, { timeout: 30000 });
    }, 40000);
  });

  describe("template actions", () => {
    it("should render Use button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId(`use-template-${templateIds[0]}`)).toBeInTheDocument();
        expect(screen.getByTestId(`use-template-${templateIds[1]}`)).toBeInTheDocument();
      }, { timeout: 30000 });
    }, 40000);

    it("should render delete button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId(`delete-template-${templateIds[0]}`)).toBeInTheDocument();
        expect(screen.getByTestId(`delete-template-${templateIds[1]}`)).toBeInTheDocument();
      }, { timeout: 30000 });
    }, 40000);

    it("should have accessible labels for action buttons", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByTestId(`edit-template-${templateIds[0]}`)).toHaveAttribute("aria-label", "Edit template");
        expect(screen.getByTestId(`delete-template-${templateIds[0]}`)).toHaveAttribute("aria-label", "Delete template");
      }, { timeout: 30000 });
    }, 40000);
  });

  describe("without userId", () => {
    it("should not load templates when userId is not provided", async () => {
      render(<TemplateManager />);

      // If no userId, it should not load
      await waitFor(() => {
        expect(screen.queryByText("Weekly Report")).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
