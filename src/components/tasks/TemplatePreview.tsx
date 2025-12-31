"use client";

import { cn } from "@/lib/utils";
import { Calendar, Flag, Clock, Zap, MapPin, GitBranch } from "lucide-react";
import type { TemplateFormData } from "@/lib/template-form-utils";

interface TemplatePreviewProps {
  formData: TemplateFormData;
}

/**
 * Displays a live preview of the template structure.
 * Shows variables as-is without substitution.
 */
export function TemplatePreview({ formData }: TemplatePreviewProps) {
  const priorityColors = {
    high: "text-red-500",
    medium: "text-orange-500",
    low: "text-blue-500",
    none: "text-gray-400",
  };

  const getDueDateDisplay = (): string | null => {
    switch (formData.dueDateType) {
      case "today":
        return "{date}";
      case "tomorrow":
        return "{tomorrow}";
      case "next_week":
        return "{next_week}";
      case "custom":
        return formData.dueDateDays ? `+${formData.dueDateDays}d` : null;
      default:
        return null;
    }
  };

  const getEnergyEmoji = (): string | null => {
    switch (formData.energyLevel) {
      case "high":
        return "🔋";
      case "medium":
        return "🔌";
      case "low":
        return "🪫";
      default:
        return null;
    }
  };

  const getContextEmoji = (): string | null => {
    switch (formData.context) {
      case "computer":
        return "💻";
      case "phone":
        return "📱";
      case "errands":
        return "🏃";
      case "meeting":
        return "👥";
      case "home":
        return "🏠";
      case "anywhere":
        return "🌍";
      default:
        return null;
    }
  };

  const dueDateDisplay = getDueDateDisplay();
  const energyEmoji = getEnergyEmoji();
  const contextEmoji = getContextEmoji();
  const hasSubtasks = formData.subtasks.filter((s) => s.title.trim()).length > 0;
  const validSubtasks = formData.subtasks.filter((s) => s.title.trim());

  // Check if there's anything to preview
  const hasContent =
    formData.title.trim() ||
    formData.description.trim() ||
    formData.priority !== "none" ||
    dueDateDisplay ||
    formData.energyLevel !== "none" ||
    formData.context !== "none" ||
    formData.estimateMinutes ||
    hasSubtasks;

  if (!hasContent) {
    return (
      <div className="rounded-lg border border-dashed p-4" data-testid="template-preview">
        <p className="text-sm text-muted-foreground text-center">
          Fill in the form to see a preview of your template
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 bg-card" data-testid="template-preview">
      {/* Main Task Preview */}
      <div className="space-y-2">
        {/* Title */}
        <div className="font-medium text-sm" data-testid="preview-title">
          {formData.title || <span className="text-muted-foreground italic">No title</span>}
        </div>

        {/* Description */}
        {formData.description && (
          <p className="text-sm text-muted-foreground" data-testid="preview-description">
            {formData.description}
          </p>
        )}

        {/* Properties Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {/* Subtask count indicator */}
          {hasSubtasks && (
            <div className="flex items-center gap-1" data-testid="preview-subtask-count">
              <GitBranch className="h-3 w-3" />
              <span>{validSubtasks.length}</span>
            </div>
          )}

          {/* Due Date */}
          {dueDateDisplay && (
            <div className="flex items-center gap-1" data-testid="preview-due-date">
              <Calendar className="h-3 w-3" />
              <span>{dueDateDisplay}</span>
            </div>
          )}

          {/* Priority */}
          {formData.priority !== "none" && (
            <div
              className={cn("flex items-center gap-1", priorityColors[formData.priority])}
              data-testid="preview-priority"
            >
              <Flag className="h-3 w-3" />
              <span className="capitalize">{formData.priority}</span>
            </div>
          )}

          {/* Estimate */}
          {formData.estimateMinutes && formData.estimateMinutes > 0 && (
            <div className="flex items-center gap-1" data-testid="preview-estimate">
              <Clock className="h-3 w-3" />
              <span>{formData.estimateMinutes}m</span>
            </div>
          )}

          {/* Energy Level */}
          {energyEmoji && (
            <div className="flex items-center gap-1" data-testid="preview-energy">
              <Zap className="h-3 w-3" />
              <span>{energyEmoji}</span>
            </div>
          )}

          {/* Context */}
          {contextEmoji && (
            <div className="flex items-center gap-1" data-testid="preview-context">
              <MapPin className="h-3 w-3" />
              <span>{contextEmoji}</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks Preview */}
      {hasSubtasks && (
        <div className="mt-3 ml-4 space-y-1 border-l-2 border-muted pl-3" data-testid="preview-subtasks">
          {validSubtasks.map((subtask) => (
            <div key={subtask.id} className="py-1">
              <div className="text-sm" data-testid="preview-subtask-title">
                {subtask.title}
              </div>
              {subtask.description && (
                <div className="text-xs text-muted-foreground" data-testid="preview-subtask-description">
                  {subtask.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
