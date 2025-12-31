import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SubtaskForm } from "./SubtaskForm";
import type { SubtaskFormData } from "@/lib/template-form-utils";

describe("SubtaskForm", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("should render Add Subtask button", () => {
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={[]}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    expect(screen.getByText("Add Subtask")).toBeInTheDocument();
  });

  it("should show empty state when no subtasks", () => {
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={[]}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    expect(screen.getByText(/No subtasks added yet/)).toBeInTheDocument();
  });

  it("should call onAdd when Add Subtask button is clicked", () => {
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={[]}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(screen.getByText("Add Subtask"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("should display subtasks with title and description inputs", () => {
    const subtasks: SubtaskFormData[] = [
      { id: "subtask-1", title: "First subtask", description: "Description 1" },
      { id: "subtask-2", title: "Second subtask", description: "" },
    ];
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={subtasks}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    // Check subtask labels
    expect(screen.getByText("Subtask 1")).toBeInTheDocument();
    expect(screen.getByText("Subtask 2")).toBeInTheDocument();

    // Check input values
    const titleInputs = screen.getAllByPlaceholderText("Subtask title");
    expect(titleInputs).toHaveLength(2);
    expect(titleInputs[0]).toHaveValue("First subtask");
    expect(titleInputs[1]).toHaveValue("Second subtask");

    const descInputs = screen.getAllByPlaceholderText("Subtask description");
    expect(descInputs).toHaveLength(2);
    expect(descInputs[0]).toHaveValue("Description 1");
    expect(descInputs[1]).toHaveValue("");
  });

  it("should call onRemove with correct id when delete button is clicked", () => {
    const subtasks: SubtaskFormData[] = [
      { id: "subtask-1", title: "First subtask", description: "" },
      { id: "subtask-2", title: "Second subtask", description: "" },
    ];
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={subtasks}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    // Find delete buttons (there should be 2)
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    // Filter to only the delete buttons (they have the Trash2 icon)
    const trashButtons = deleteButtons.filter(btn => 
      btn.querySelector("svg") && btn.classList.contains("text-destructive")
    );
    
    expect(trashButtons).toHaveLength(2);
    
    // Click the first delete button
    fireEvent.click(trashButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("subtask-1");
  });

  it("should call onUpdate when title input changes", () => {
    const subtasks: SubtaskFormData[] = [
      { id: "subtask-1", title: "Original title", description: "" },
    ];
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={subtasks}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    const titleInput = screen.getByPlaceholderText("Subtask title");
    fireEvent.change(titleInput, { target: { value: "Updated title" } });

    expect(onUpdate).toHaveBeenCalledWith("subtask-1", "title", "Updated title");
  });

  it("should call onUpdate when description input changes", () => {
    const subtasks: SubtaskFormData[] = [
      { id: "subtask-1", title: "Test", description: "Original description" },
    ];
    const onAdd = mock(() => {});
    const onRemove = mock(() => {});
    const onUpdate = mock(() => {});

    render(
      <SubtaskForm
        subtasks={subtasks}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />
    );

    const descInput = screen.getByPlaceholderText("Subtask description");
    fireEvent.change(descInput, { target: { value: "Updated description" } });

    expect(onUpdate).toHaveBeenCalledWith("subtask-1", "description", "Updated description");
  });
});
