import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { TemplateFormDialog } from "./TemplateFormDialog";

// Mock sonner toast
mock.module("sonner", () => ({
  toast: {
    success: mock(() => { }),
    error: mock(() => { }),
  },
}));

import { db, templates } from "@/db";
import { eq } from "drizzle-orm";
import { setupTestDb, resetTestDb } from "@/test/setup";

describe("TemplateFormDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: mock(() => { }),
    userId: "test_user_123",
    onSave: mock(() => { }),
  };

  beforeEach(async () => {
    await setupTestDb();
    await resetTestDb();
    defaultProps.onOpenChange.mockClear();
    defaultProps.onSave.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  describe("renders all form fields", () => {
    it("should render template name input", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    });

    it("should render task title input", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("task-title-input")).toBeInTheDocument();
    });

    it("should render task description input", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("task-description-input")).toBeInTheDocument();
    });

    it("should render priority select", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("priority-select")).toBeInTheDocument();
    });

    it("should render due date select", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("due-date-select")).toBeInTheDocument();
    });

    it("should render energy select", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("energy-select")).toBeInTheDocument();
    });

    it("should render context select", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("context-select")).toBeInTheDocument();
    });

    it("should render estimate input", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("estimate-input")).toBeInTheDocument();
    });

    it("should render Add Subtask button", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByText("Add Subtask")).toBeInTheDocument();
    });

    it("should render template preview", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      expect(screen.getByTestId("template-preview")).toBeInTheDocument();
    });

    it("should render variable helper text", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      // There are two helper texts (one for title, one for description)
      const helperTexts = screen.getAllByText(/Available variables:/);
      expect(helperTexts.length).toBeGreaterThan(0);
    });
  });

  describe("validation error display", () => {
    it("should show error when template name is empty on submit", async () => {
      render(<TemplateFormDialog {...defaultProps} />);

      // Fill in title but leave name empty
      const titleInput = screen.getByTestId("task-title-input");
      fireEvent.change(titleInput, { target: { value: "Test Task" } });

      // Click submit button (use role to be more specific)
      const submitButton = screen.getByRole("button", { name: /Create Template/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("name-error")).toHaveTextContent("Template name is required");
      }, { timeout: 3000 });
    });

    it("should show error when task title is empty on submit", async () => {
      render(<TemplateFormDialog {...defaultProps} />);

      // Fill in name but leave title empty
      const nameInput = screen.getByTestId("template-name-input");
      fireEvent.change(nameInput, { target: { value: "Test Template" } });

      // Click submit button
      const submitButton = screen.getByRole("button", { name: /Create Template/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("title-error")).toBeInTheDocument();
        expect(screen.getByTestId("title-error")).toHaveTextContent("Task title is required");
      }, { timeout: 3000 });
    });

    it("should clear error when user starts typing in invalid field", async () => {
      render(<TemplateFormDialog {...defaultProps} />);

      // Submit with empty fields to trigger errors
      const submitButton = screen.getByRole("button", { name: /Create Template/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start typing in name field
      const nameInput = screen.getByTestId("template-name-input");
      fireEvent.change(nameInput, { target: { value: "T" } });

      // Error should be cleared
      expect(screen.queryByTestId("name-error")).not.toBeInTheDocument();
    });
  });

  describe("create mode", () => {
    it("should show Create Template title when no template prop", () => {
      render(<TemplateFormDialog {...defaultProps} />);
      // Use heading role to be specific
      expect(screen.getByRole("heading", { name: "Create Template" })).toBeInTheDocument();
    });

    it("should initialize with empty form", () => {
      render(<TemplateFormDialog {...defaultProps} />);

      const nameInput = screen.getByTestId("template-name-input") as HTMLInputElement;
      const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
      const descInput = screen.getByTestId("task-description-input") as HTMLTextAreaElement;

      expect(nameInput.value).toBe("");
      expect(titleInput.value).toBe("");
      expect(descInput.value).toBe("");
    });

    it("should call createTemplate on valid submit", async () => {
      render(<TemplateFormDialog {...defaultProps} />);

      // Fill in required fields
      const nameInput = screen.getByTestId("template-name-input");
      fireEvent.change(nameInput, { target: { value: "New Template" } });

      const titleInput = screen.getByTestId("task-title-input");
      fireEvent.change(titleInput, { target: { value: "My Task" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: /Create Template/i });
      fireEvent.click(submitButton);

      await waitFor(async () => {
        // expect(defaultProps.onSave).toHaveBeenCalled(); // Kept this as prop spy?
        // Check DB
        const templatesInDb = await db.select().from(templates).where(eq(templates.name, "New Template"));
        expect(templatesInDb.length).toBe(1);
        expect(templatesInDb[0].userId).toBe("test_user_123");
      }, { timeout: 3000 });
    });
  });

  describe("edit mode", () => {
    const existingTemplate = {
      id: 1,
      name: "Existing Template",
      content: JSON.stringify({
        title: "Existing Task",
        description: "Existing description",
        priority: "high",
        dueDate: "{tomorrow}",
        energyLevel: "medium",
        context: "computer",
        estimateMinutes: 30,
        subtasks: [{ title: "Subtask 1", description: "Subtask desc" }],
      }),
      createdAt: new Date(),
    };

    it("should show Edit Template title when template prop is provided", () => {
      render(<TemplateFormDialog {...defaultProps} template={existingTemplate} />);
      expect(screen.getByRole("heading", { name: "Edit Template" })).toBeInTheDocument();
    });

    it("should pre-populate form with existing template data", () => {
      render(<TemplateFormDialog {...defaultProps} template={existingTemplate} />);

      const nameInput = screen.getByTestId("template-name-input") as HTMLInputElement;
      const titleInput = screen.getByTestId("task-title-input") as HTMLInputElement;
      const descInput = screen.getByTestId("task-description-input") as HTMLTextAreaElement;

      expect(nameInput.value).toBe("Existing Template");
      expect(titleInput.value).toBe("Existing Task");
      expect(descInput.value).toBe("Existing description");
    });

    it("should pre-populate subtasks from existing template", () => {
      render(<TemplateFormDialog {...defaultProps} template={existingTemplate} />);

      // Check for subtask in the preview section using testid
      const preview = screen.getByTestId("template-preview");
      expect(within(preview).getByTestId("preview-subtask-title")).toHaveTextContent("Subtask 1");
    });

    it("should call updateTemplate on valid submit in edit mode", async () => {
      const inserted = await db.insert(templates).values({
        userId: "test_user_123",
        name: "Existing Template",
        content: JSON.stringify({ title: "Existing Task", description: "Existing description" }),
      }).returning();
      const template = inserted[0];

      render(<TemplateFormDialog {...defaultProps} template={template} />);

      // Modify the name
      const nameInput = screen.getByTestId("template-name-input");
      fireEvent.change(nameInput, { target: { value: "Updated Template" } });

      // Submit
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(async () => {
        const updated = await db.select().from(templates).where(eq(templates.id, template.id));
        expect(updated.length).toBe(1);
        expect(updated[0].name).toBe("Updated Template");
      }, { timeout: 3000 });
    });

    it("should show error message for malformed JSON content", () => {
      const malformedTemplate = {
        id: 2,
        name: "Bad Template",
        content: "not valid json",
        createdAt: new Date(),
      };

      render(<TemplateFormDialog {...defaultProps} template={malformedTemplate} />);

      expect(screen.getByText(/Could not parse template content/)).toBeInTheDocument();
    });
  });

  describe("dialog behavior", () => {
    it("should call onOpenChange when Cancel is clicked", () => {
      render(<TemplateFormDialog {...defaultProps} />);

      fireEvent.click(screen.getByText("Cancel"));

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should call onSave and close dialog on successful create", async () => {
      render(<TemplateFormDialog {...defaultProps} />);

      // Fill in required fields
      const nameInput = screen.getByTestId("template-name-input");
      const titleInput = screen.getByTestId("task-title-input");

      fireEvent.change(nameInput, { target: { value: "My Template" } });
      fireEvent.change(titleInput, { target: { value: "My Task" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: /Create Template/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalled();
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      }, { timeout: 3000 });
    });
  });
});
