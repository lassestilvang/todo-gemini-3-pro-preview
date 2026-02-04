import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { db, users, templates } from "@/db";

// Mock sonner toast - removed local mock to use global from setup.tsx

// Mock actions to avoid DB dependencies and improve test stability
const mockGetTemplates = mock(async () => [
  {
    id: 1,
    userId: "test_user_123",
    name: "Weekly Report",
    content: JSON.stringify({ title: "Weekly Report Task", priority: "high" }),
    createdAt: new Date("2024-01-15"),
  },
  {
    id: 2,
    userId: "test_user_123",
    name: "Daily Standup",
    content: JSON.stringify({ title: "Daily Standup Task", priority: "medium" }),
    createdAt: new Date("2024-01-16"),
  }
]);

const mockDeleteTemplate = mock(async () => { });
const mockInstantiateTemplate = mock(async () => { });
const mockUpdateTemplate = mock(async () => ({ success: true }));
const mockCreateTemplate = mock(async () => ({ success: true }));

mock.module("@/lib/actions", () => ({
  getTemplates: mockGetTemplates,
  deleteTemplate: mockDeleteTemplate,
  instantiateTemplate: mockInstantiateTemplate,
  createTemplate: mockCreateTemplate,
  updateTemplate: mockUpdateTemplate,
}));

// Also mock the specific file path to be safe, as TemplateManager might be importing from there
mock.module("@/lib/actions/templates", () => ({
  getTemplates: mockGetTemplates,
  deleteTemplate: mockDeleteTemplate,
  instantiateTemplate: mockInstantiateTemplate,
  createTemplate: mockCreateTemplate,
  updateTemplate: mockUpdateTemplate,
}));

// Mock window.confirm
const originalConfirm = globalThis.confirm;

// PointerEvent mocks are provided globally in setup.tsx (upstream change),
// but adding them here defensively to ensure tests pass in all environments
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

describe("TemplateManager", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let TemplateManager: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let templateIds: number[] = [];

  beforeEach(async () => {
    // Restore DB seeding as a fallback in case mocks fail (belt and suspenders)
    // This ensures that even if the real getTemplates is called, it returns data.
    await setupTestDb();
    await resetTestDb();
    await createTestUser(testUserId, `${testUserId}@example.com`);

    // Set mock user to match the one expected by tests
    setMockAuthUser({
      id: testUserId,
      email: `${testUserId}@example.com`,
      firstName: "Test",
      lastName: "User",
      profilePictureUrl: null
    });

    // Create user first to satisfy FK constraint
    await db.insert(users).values({
      id: "test_user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });

    // Seed templates
    // Capture IDs for tests that need them
    const inserted = await db.insert(templates).values([
      {
        userId: testUserId,
        name: "Weekly Report",
        content: JSON.stringify({ title: "Weekly Report Task", priority: "high" }),
        createdAt: new Date("2024-01-15"),
      },
      {
        userId: testUserId,
        name: "Daily Standup",
        content: JSON.stringify({ title: "Daily Standup Task", priority: "medium" }),
        createdAt: new Date("2024-01-16"),
      }
    ]).returning();

    templateIds = inserted.map(t => t.id);

    // Dynamic import to ensure mock is applied
    const importedModule = await import("./TemplateManager");
    TemplateManager = importedModule.TemplateManager;

    globalThis.confirm = mock(() => true);
    mockGetTemplates.mockClear();
    mockDeleteTemplate.mockClear();
    mockInstantiateTemplate.mockClear();
    mockUpdateTemplate.mockClear();
    mockCreateTemplate.mockClear();
  });

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  describe("template list dialog", () => {
    it("should render Templates button", () => {
      render(<TemplateManager userId="test_user_123" />);
      expect(screen.getByText("Templates")).toBeInTheDocument();
    });

    it("should open template list dialog when Templates button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      // Explicitly wait for dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Task Templates")).toBeInTheDocument();
      });
    });

    it("should load and display templates when dialog opens", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByText("Task Templates")).toBeInTheDocument();

      await waitFor(() => {
        expect(mockGetTemplates).toHaveBeenCalled();
        expect(screen.getByText("Weekly Report")).toBeInTheDocument();
        expect(screen.getByText("Daily Standup")).toBeInTheDocument();
      });
    });

    it("should show empty state when no templates exist", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await db.delete(templates);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByText("No templates found. Create one to get started.")).toBeInTheDocument();
      });
    });
  });

  describe("create dialog", () => {
    it("should open create dialog when New Template button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId("new-template-button")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("new-template-button"));

      expect(await screen.findByRole("heading", { name: "Create Template" })).toBeInTheDocument();
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    });

    it("should show empty form fields in create mode", async () => {
      render(<TemplateManager userId="test_user_123" />);

      // Open template list dialog
      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("new-template-button")).toBeInTheDocument();
      });

      // Click New Template button
      await React.act(async () => {
        fireEvent.click(screen.getByTestId("new-template-button"));
      });

      await waitFor(() => {
        const nameInput = screen.getByTestId("template-name-input") as HTMLInputElement;
        const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
        expect(nameInput.value).toBe("");
        expect(titleInput.value).toBe("");
      });
    });
  });

  describe("edit dialog", () => {
    it("should render edit button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId(`edit-template-${templateIds[0]}`)).toBeInTheDocument();
      expect(screen.getByTestId(`edit-template-${templateIds[1]}`)).toBeInTheDocument();
    });

    it("should open edit dialog with template data when edit button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      const editBtn = await screen.findByTestId(`edit-template-${templateIds[0]}`);
      fireEvent.click(editBtn);

      const nameInput = await screen.findByTestId("template-name-input") as HTMLInputElement;
      expect(nameInput.value).toBe("Weekly Report");
    });

    it("should pre-populate task title from template content", async () => {
      render(<TemplateManager userId="test_user_123" />);

      // Open template list dialog
      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId(`edit-template-${templateIds[0]}`)).toBeInTheDocument();
      });

      // Click edit button for first template
      await React.act(async () => {
        fireEvent.click(screen.getByTestId(`edit-template-${templateIds[0]}`));
      });

      await waitFor(() => {
        const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
        expect(titleInput.value).toBe("Weekly Report Task");
      });
    });
  });

  describe("template actions", () => {
    it("should render Use button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId(`use-template-${templateIds[0]}`)).toBeInTheDocument();
        expect(screen.getByTestId(`use-template-${templateIds[1]}`)).toBeInTheDocument();
      });
    });

    it("should render delete button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId(`delete-template-${templateIds[0]}`)).toBeInTheDocument();
        expect(screen.getByTestId(`delete-template-${templateIds[1]}`)).toBeInTheDocument();
      });
    });
  });

  describe("without userId", () => {
    it("should not load templates when userId is not provided", async () => {
      render(<TemplateManager />);

      fireEvent.click(screen.getByText("Templates"));

      await waitFor(() => {
        expect(screen.getByText("No templates found. Create one to get started.")).toBeInTheDocument();
      });
    });
  });
});
