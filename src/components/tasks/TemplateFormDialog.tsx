"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubtaskForm } from "./SubtaskForm";
import { TemplatePreview } from "./TemplatePreview";
import { createTemplate, updateTemplate } from "@/lib/actions";
import {
  type TemplateFormData,
  type SubtaskFormData,
  type ValidationErrors,
  serializeFormToJson,
  deserializeJsonToForm,
  validateTemplateForm,
  hasValidationErrors,
  createEmptyFormData,
} from "@/lib/template-form-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

type Template = {
  id: number;
  name: string;
  content: string;
  createdAt: Date;
};

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null; // null for create, Template for edit
  userId: string;
  onSave: () => void;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  userId,
  onSave,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState<TemplateFormData>(createEmptyFormData());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  const isEditMode = !!template;

  // Initialize form data when dialog opens or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        // Edit mode: parse existing template content
        const parsed = deserializeJsonToForm(template.content);
        if (parsed) {
          setFormData({ ...parsed, name: template.name });
          setJsonParseError(null);
        } else {
          // Malformed JSON - show error and use empty form with name
          setFormData({ ...createEmptyFormData(), name: template.name });
          setJsonParseError("Could not parse template content. The template may have been created with an incompatible format.");
        }
      } else {
        // Create mode: start with empty form
        setFormData(createEmptyFormData());
        setJsonParseError(null);
      }
      setErrors({});
    }
  }, [open, template]);

  const updateField = useCallback(<K extends keyof TemplateFormData>(
    field: K,
    value: TemplateFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleAddSubtask = useCallback(() => {
    const newSubtask: SubtaskFormData = {
      id: `subtask-${Date.now()}`,
      title: "",
      description: "",
    };
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask],
    }));
  }, []);

  const handleRemoveSubtask = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((s) => s.id !== id),
    }));
  }, []);

  const handleUpdateSubtask = useCallback((
    id: string,
    field: keyof SubtaskFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  }, []);

  const handleSubmit = async () => {
    // Validate form
    const validationErrors = validateTemplateForm(formData);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const content = serializeFormToJson(formData);

      if (isEditMode && template) {
        const result = await updateTemplate(template.id, userId, formData.name, content);
        if (result.success) {
          toast.success("Template updated");
          onSave();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || "Failed to update template");
        }
      } else {
        const result = await createTemplate(userId, formData.name, content);
        if (result.success) {
          toast.success("Template created");
          onSave();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || "Failed to create template");
        }
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modify your template settings below."
              : "Create a reusable task template with predefined properties."}
          </DialogDescription>
        </DialogHeader>

        {jsonParseError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {jsonParseError}
          </div>
        )}

        <div className="grid gap-6 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Weekly Report"
              className={cn(errors.name && "border-destructive")}
              data-testid="template-name-input"
            />
            {errors.name && (
              <p className="text-sm text-destructive" data-testid="name-error">
                {errors.name}
              </p>
            )}
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g., Complete {date} report"
              className={cn(errors.title && "border-destructive")}
              data-testid="task-title-input"
            />
            {errors.title && (
              <p className="text-sm text-destructive" data-testid="title-error">
                {errors.title}
              </p>
            )}
            <VariableHelperText />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Add a description..."
              className="min-h-[80px]"
              data-testid="task-description-input"
            />
            <VariableHelperText />
          </div>

          {/* Dropdowns Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  updateField("priority", value as TemplateFormData["priority"])
                }
              >
                <SelectTrigger data-testid="priority-select">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date Type */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Select
                value={formData.dueDateType}
                onValueChange={(value) =>
                  updateField("dueDateType", value as TemplateFormData["dueDateType"])
                }
              >
                <SelectTrigger data-testid="due-date-select">
                  <SelectValue placeholder="Select due date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="next_week">Next Week</SelectItem>
                  <SelectItem value="custom">Custom (days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Days Input (shown when dueDateType is "custom") */}
          {formData.dueDateType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="due-date-days">Days from now</Label>
              <Input
                id="due-date-days"
                type="number"
                min="1"
                value={formData.dueDateDays || ""}
                onChange={(e) =>
                  updateField(
                    "dueDateDays",
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                placeholder="e.g., 3"
                data-testid="due-date-days-input"
              />
            </div>
          )}

          {/* Second Row of Dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Energy Level */}
            <div className="space-y-2">
              <Label>Energy Level</Label>
              <Select
                value={formData.energyLevel}
                onValueChange={(value) =>
                  updateField("energyLevel", value as TemplateFormData["energyLevel"])
                }
              >
                <SelectTrigger data-testid="energy-select">
                  <SelectValue placeholder="Select energy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low 🪫</SelectItem>
                  <SelectItem value="medium">Medium 🔌</SelectItem>
                  <SelectItem value="high">High 🔋</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Context */}
            <div className="space-y-2">
              <Label>Context</Label>
              <Select
                value={formData.context}
                onValueChange={(value) =>
                  updateField("context", value as TemplateFormData["context"])
                }
              >
                <SelectTrigger data-testid="context-select">
                  <SelectValue placeholder="Select context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="computer">Computer 💻</SelectItem>
                  <SelectItem value="phone">Phone 📱</SelectItem>
                  <SelectItem value="errands">Errands 🏃</SelectItem>
                  <SelectItem value="meeting">Meeting 👥</SelectItem>
                  <SelectItem value="home">Home 🏠</SelectItem>
                  <SelectItem value="anywhere">Anywhere 🌍</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimate */}
          <div className="space-y-2">
            <Label htmlFor="estimate">Time Estimate (minutes)</Label>
            <Input
              id="estimate"
              type="number"
              min="0"
              value={formData.estimateMinutes || ""}
              onChange={(e) =>
                updateField(
                  "estimateMinutes",
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              placeholder="e.g., 30"
              data-testid="estimate-input"
            />
          </div>

          {/* Subtasks */}
          <SubtaskForm
            subtasks={formData.subtasks}
            onAdd={handleAddSubtask}
            onRemove={handleRemoveSubtask}
            onUpdate={handleUpdateSubtask}
          />

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <TemplatePreview formData={formData} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEditMode
              ? "Save Changes"
              : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper text showing available variables for text fields
 */
function VariableHelperText() {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Info className="h-3 w-3" />
      <span>
        Available variables: <code className="bg-muted px-1 rounded">{"{date}"}</code>,{" "}
        <code className="bg-muted px-1 rounded">{"{tomorrow}"}</code>,{" "}
        <code className="bg-muted px-1 rounded">{"{next_week}"}</code>
      </span>
    </p>
  );
}
