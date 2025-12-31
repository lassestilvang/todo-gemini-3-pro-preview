import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { TemplatePreview } from "./TemplatePreview";
import type { TemplateFormData } from "@/lib/template-form-utils";

describe("TemplatePreview", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  const createFormData = (overrides: Partial<TemplateFormData> = {}): TemplateFormData => ({
    name: "Test Template",
    title: "Test Task",
    description: "",
    priority: "none",
    dueDateType: "none",
    dueDateDays: undefined,
    energyLevel: "none",
    context: "none",
    estimateMinutes: undefined,
    subtasks: [],
    ...overrides,
  });

  it("should show empty state when no content", () => {
    const formData = createFormData({
      title: "",
      description: "",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByText(/Fill in the form to see a preview/)).toBeInTheDocument();
  });

  it("should display task title", () => {
    const formData = createFormData({ title: "My Task Title" });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-title")).toHaveTextContent("My Task Title");
  });

  it("should display task description", () => {
    const formData = createFormData({
      title: "Task",
      description: "This is a description",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-description")).toHaveTextContent("This is a description");
  });

  it("should display priority when set", () => {
    const formData = createFormData({
      title: "Task",
      priority: "high",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-priority")).toHaveTextContent("high");
  });

  it("should display due date variable for today", () => {
    const formData = createFormData({
      title: "Task",
      dueDateType: "today",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-due-date")).toHaveTextContent("{date}");
  });

  it("should display due date variable for tomorrow", () => {
    const formData = createFormData({
      title: "Task",
      dueDateType: "tomorrow",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-due-date")).toHaveTextContent("{tomorrow}");
  });

  it("should display due date variable for next week", () => {
    const formData = createFormData({
      title: "Task",
      dueDateType: "next_week",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-due-date")).toHaveTextContent("{next_week}");
  });

  it("should display custom due date days", () => {
    const formData = createFormData({
      title: "Task",
      dueDateType: "custom",
      dueDateDays: 5,
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-due-date")).toHaveTextContent("+5d");
  });

  it("should display estimate minutes", () => {
    const formData = createFormData({
      title: "Task",
      estimateMinutes: 30,
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-estimate")).toHaveTextContent("30m");
  });

  it("should display energy level emoji", () => {
    const formData = createFormData({
      title: "Task",
      energyLevel: "high",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-energy")).toHaveTextContent("🔋");
  });

  it("should display context emoji", () => {
    const formData = createFormData({
      title: "Task",
      context: "computer",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-context")).toHaveTextContent("💻");
  });

  it("should display subtasks nested under main task", () => {
    const formData = createFormData({
      title: "Main Task",
      subtasks: [
        { id: "sub-1", title: "Subtask 1", description: "Description 1" },
        { id: "sub-2", title: "Subtask 2", description: "" },
      ],
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-subtasks")).toBeInTheDocument();
    const subtaskTitles = screen.getAllByTestId("preview-subtask-title");
    expect(subtaskTitles).toHaveLength(2);
    expect(subtaskTitles[0]).toHaveTextContent("Subtask 1");
    expect(subtaskTitles[1]).toHaveTextContent("Subtask 2");
  });

  it("should display subtask descriptions when present", () => {
    const formData = createFormData({
      title: "Main Task",
      subtasks: [
        { id: "sub-1", title: "Subtask 1", description: "Subtask description" },
      ],
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-subtask-description")).toHaveTextContent("Subtask description");
  });

  it("should display subtask count indicator", () => {
    const formData = createFormData({
      title: "Main Task",
      subtasks: [
        { id: "sub-1", title: "Subtask 1", description: "" },
        { id: "sub-2", title: "Subtask 2", description: "" },
        { id: "sub-3", title: "Subtask 3", description: "" },
      ],
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-subtask-count")).toHaveTextContent("3");
  });

  it("should filter out subtasks with empty titles", () => {
    const formData = createFormData({
      title: "Main Task",
      subtasks: [
        { id: "sub-1", title: "Valid Subtask", description: "" },
        { id: "sub-2", title: "", description: "" },
        { id: "sub-3", title: "   ", description: "" },
      ],
    });

    render(<TemplatePreview formData={formData} />);

    const subtaskTitles = screen.getAllByTestId("preview-subtask-title");
    expect(subtaskTitles).toHaveLength(1);
    expect(subtaskTitles[0]).toHaveTextContent("Valid Subtask");
  });

  it("should preserve variable syntax in title", () => {
    const formData = createFormData({
      title: "Task for {date}",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-title")).toHaveTextContent("Task for {date}");
  });

  it("should preserve variable syntax in description", () => {
    const formData = createFormData({
      title: "Task",
      description: "Due by {tomorrow}",
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-description")).toHaveTextContent("Due by {tomorrow}");
  });

  it("should display all form properties together", () => {
    const formData = createFormData({
      title: "Complete Task",
      description: "Full description",
      priority: "medium",
      dueDateType: "tomorrow",
      energyLevel: "low",
      context: "home",
      estimateMinutes: 45,
      subtasks: [
        { id: "sub-1", title: "Step 1", description: "" },
      ],
    });

    render(<TemplatePreview formData={formData} />);

    expect(screen.getByTestId("preview-title")).toHaveTextContent("Complete Task");
    expect(screen.getByTestId("preview-description")).toHaveTextContent("Full description");
    expect(screen.getByTestId("preview-priority")).toHaveTextContent("medium");
    expect(screen.getByTestId("preview-due-date")).toHaveTextContent("{tomorrow}");
    expect(screen.getByTestId("preview-energy")).toHaveTextContent("🪫");
    expect(screen.getByTestId("preview-context")).toHaveTextContent("🏠");
    expect(screen.getByTestId("preview-estimate")).toHaveTextContent("45m");
    expect(screen.getByTestId("preview-subtasks")).toBeInTheDocument();
  });
});
