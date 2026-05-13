"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ListTree } from "lucide-react";
import type { SubtaskFormData } from "@/lib/template-form-utils";

interface SubtaskFormProps {
  subtasks: SubtaskFormData[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof SubtaskFormData, value: string) => void;
}

export function SubtaskForm({
  subtasks,
  onAdd,
  onRemove,
  onUpdate,
}: SubtaskFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Subtasks</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Subtask
        </Button>
      </div>

      {subtasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 mb-3">
            <ListTree className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No subtasks</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
            Break down this task into smaller, manageable pieces.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAdd}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add First Subtask
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {subtasks.map((subtask, index) => (
            <div key={subtask.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Subtask {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(subtask.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete subtask"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`subtask-title-${subtask.id}`}
                  className="text-sm"
                >
                  Title
                </Label>
                <Input
                  id={`subtask-title-${subtask.id}`}
                  value={subtask.title}
                  aria-label="Subtask title"
                  onChange={(e) =>
                    onUpdate(subtask.id, "title", e.target.value)
                  }
                  placeholder="Subtask title"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`subtask-description-${subtask.id}`}
                  className="text-sm"
                >
                  Description (optional)
                </Label>
                <Textarea
                  id={`subtask-description-${subtask.id}`}
                  value={subtask.description}
                  onChange={(e) =>
                    onUpdate(subtask.id, "description", e.target.value)
                  }
                  placeholder="Subtask description"
                  className="min-h-[60px]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
