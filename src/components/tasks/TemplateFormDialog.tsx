"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Textarea } from "@/components/ui/textarea";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Select,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SelectContent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SelectItem,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SelectTrigger,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from "@/lib/utils";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Info } from "lucide-react";

import { TemplateBasicInfo } from "./template-form/TemplateBasicInfo";
import { TemplateTaskProperties } from "./template-form/TemplateTaskProperties";

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

type TemplateInitialState = {
  formData: TemplateFormData;
  jsonParseError: string | null;
};

function getInitialTemplateState(template?: Template | null): TemplateInitialState {
  if (!template) {
    return {
      formData: createEmptyFormData(),
      jsonParseError: null,
    };
  }

  const parsed = deserializeJsonToForm(template.content);
  if (parsed) {
    return {
      formData: { ...parsed, name: template.name },
      jsonParseError: null,
    };
  }

  return {
    formData: { ...createEmptyFormData(), name: template.name },
    jsonParseError:
      "Could not parse template content. The template may have been created with an incompatible format.",
  };
}

export function TemplateFormDialog(props: TemplateFormDialogProps) {
  const dialogStateKey = `${props.open ? "open" : "closed"}-${props.template?.id ?? "new"}`;
  return <TemplateFormDialogContent key={dialogStateKey} {...props} />;
}

function TemplateFormDialogContent({
  open,
  onOpenChange,
  template,
  userId,
  onSave,
}: TemplateFormDialogProps) {
  const initialState = getInitialTemplateState(template);
  const [formData, setFormData] = useState<TemplateFormData>(() => initialState.formData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const jsonParseError = initialState.jsonParseError;

  const isEditMode = !!template;

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
    const content = serializeFormToJson(formData);

    const result = isEditMode && template
      ? await updateTemplate(template.id, userId, formData.name, content).catch((error) => {
        console.error("Failed to update template:", error);
        return null;
      })
      : await createTemplate(userId, formData.name, content).catch((error) => {
        console.error("Failed to create template:", error);
        return null;
      });

    if (!result) {
      toast.error("Failed to save template");
      setIsSubmitting(false);
      return;
    }

    if (result.success) {
      if (isEditMode) {
        toast.success("Template updated");
      } else {
        toast.success("Template created");
      }
      onSave();
      onOpenChange(false);
    } else {
      toast.error(result.error?.message || `Failed to ${isEditMode ? "update" : "create"} template`);
    }

    setIsSubmitting(false);
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
          <TemplateBasicInfo
            formData={formData}
            errors={errors}
            updateField={updateField}
          />

          <TemplateTaskProperties
            formData={formData}
            updateField={updateField}
          />

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
