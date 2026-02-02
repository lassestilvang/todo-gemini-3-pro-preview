import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TemplateManager } from "./TemplateManager";
import React from "react";

// Mock sonner toast - removed local mock to use global from setup.tsx

// Mock window.confirm
const originalConfirm = globalThis.confirm;

import { setMockAuthUser } from "@/test/mocks";
import { success } from "@/lib/action-result";

// PointerEvent mocks are provided globally in setup.tsx

// Mock Actions
const mockGetTemplates = mock(() => Promise.resolve([
  {
    id: 1,
    name: "Weekly Report",
    content: JSON.stringify({ title: "Weekly Report Task", priority: "high" }),
    createdAt: new Date("2024-01-15"),
    userId: "test_user_123"
  },
  {
    id: 2,
    name: "Daily Standup",
    content: JSON.stringify({ title: "Daily Standup Task", priority: "medium" }),
    createdAt: new Date("2024-01-16"),
    userId: "test_user_123"
  }
]));

const mockDeleteTemplate = mock(() => Promise.resolve({ success: true }));
const mockInstantiateTemplate = mock(() => Promise.resolve({ success: true }));
const mockUpdateTemplate = mock(() => Promise.resolve({ success: true }));
const mockCreateTemplate = mock(() => Promise.resolve({ success: true }));

mock.module("@/lib/actions", () => ({
  getTemplates: mockGetTemplates,
  deleteTemplate: mockDeleteTemplate,
  instantiateTemplate: mockInstantiateTemplate,
  updateTemplate: mockUpdateTemplate,
  createTemplate: mockCreateTemplate
}));

describe("TemplateManager", () => {
  beforeEach(async () => {
    // Set mock user to match the one expected by tests
    setMockAuthUser({
      id: "test_user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      profilePictureUrl: null
    });

    globalThis.confirm = mock(() => true);
    mockGetTemplates.mockReset();
    mockDeleteTemplate.mockReset();
    mockInstantiateTemplate.mockReset();
    mockUpdateTemplate.mockReset();
    mockCreateTemplate.mockReset();

    // Re-setup initial implementation
    mockGetTemplates.mockResolvedValue([
      {
        id: 1,
        name: "Weekly Report",
        content: JSON.stringify({ title: "Weekly Report Task", priority: "high" }),
        createdAt: new Date("2024-01-15"),
        userId: "test_user_123"
      },
      {
        id: 2,
        name: "Daily Standup",
        content: JSON.stringify({ title: "Daily Standup Task", priority: "medium" }),
        createdAt: new Date("2024-01-16"),
        userId: "test_user_123"
      }
    ]);
    mockDeleteTemplate.mockResolvedValue(success(undefined));
    mockInstantiateTemplate.mockResolvedValue(success(undefined));
    mockUpdateTemplate.mockResolvedValue(success(undefined));
    mockCreateTemplate.mockResolvedValue(success(undefined));
  });

  afterEach(() => {
    document.body.innerHTML = "";
    globalThis.confirm = originalConfirm;
  });

  describe("template list dialog", () => {
    it("should render Templates button", () => {
      render(<TemplateManager userId="test_user_123" />);
      expect(screen.getByText("Templates")).toBeInTheDocument();
    });

    it.skip("should open template list dialog when Templates button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByText("Task Templates")).toBeInTheDocument();
      });
    });

    it.skip("should load and display templates when dialog opens", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByText("Task Templates")).toBeInTheDocument();

      await waitFor(() => {
        expect(mockGetTemplates).toHaveBeenCalledWith("test_user_123");
        expect(screen.getByText("Weekly Report")).toBeInTheDocument();
        expect(screen.getByText("Daily Standup")).toBeInTheDocument();
      });
    });

    it.skip("should show empty state when no templates exist", async () => {
      mockGetTemplates.mockResolvedValueOnce([]);

      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByText("No templates found. Create one to get started.")).toBeInTheDocument();
      });
    });
  });

  describe("create dialog", () => {
    it.skip("should open create dialog when New Template button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId("new-template-button")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("new-template-button"));

      expect(await screen.findByRole("heading", { name: "Create Template" })).toBeInTheDocument();
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    });

    it.skip("should show empty form fields in create mode", async () => {
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
    it.skip("should render edit button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      expect(await screen.findByTestId("edit-template-1")).toBeInTheDocument();
      expect(screen.getByTestId("edit-template-2")).toBeInTheDocument();
    });

    it.skip("should open edit dialog with template data when edit button is clicked", async () => {
      render(<TemplateManager userId="test_user_123" />);

      fireEvent.click(screen.getByText("Templates"));

      const editBtn = await screen.findByTestId("edit-template-1");
      fireEvent.click(editBtn);

      const nameInput = await screen.findByTestId("template-name-input") as HTMLInputElement;
      expect(nameInput.value).toBe("Weekly Report");
    });

    it.skip("should pre-populate task title from template content", async () => {
      render(<TemplateManager userId="test_user_123" />);

      // Open template list dialog
      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("edit-template-1")).toBeInTheDocument();
      });

      // Click edit button for first template
      await React.act(async () => {
        fireEvent.click(screen.getByTestId("edit-template-1"));
      });

      await waitFor(() => {
        const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
        expect(titleInput.value).toBe("Weekly Report Task");
      });
    });
  });

  describe("template actions", () => {
    it.skip("should render Use button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("use-template-1")).toBeInTheDocument();
        expect(screen.getByTestId("use-template-2")).toBeInTheDocument();
      });
    });

    it.skip("should render delete button for each template", async () => {
      render(<TemplateManager userId="test_user_123" />);

      await React.act(async () => {
        fireEvent.click(screen.getByText("Templates"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("delete-template-1")).toBeInTheDocument();
        expect(screen.getByTestId("delete-template-2")).toBeInTheDocument();
      });
    });
  });

  describe("without userId", () => {
    it.skip("should not load templates when userId is not provided", async () => {
      render(<TemplateManager />);

      fireEvent.click(screen.getByText("Templates"));

      // Wait a bit to ensure no call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetTemplates).not.toHaveBeenCalled();
      expect(screen.queryByText("Weekly Report")).not.toBeInTheDocument();
    });
  });
});
