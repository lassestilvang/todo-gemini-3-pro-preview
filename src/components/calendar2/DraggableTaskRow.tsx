"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Flag, Clock, GripVertical } from "lucide-react";
import { useSync } from "@/components/providers/sync-provider";
import { useUser } from "@/components/providers/UserProvider";
import { useTaskStore } from "@/lib/store/task-store";
import { formatTimePreference } from "@/lib/time-utils";
import { getLabelStyle } from "@/lib/style-utils";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { playSuccessSound } from "@/lib/audio";
import type { Task } from "@/lib/types";

interface DraggableTaskRowProps {
  task: Task;
  showTime?: boolean;
  onEdit?: (task: Task) => void;
}

const priorityColors = {
  high: "text-red-500",
  medium: "text-orange-500",
  low: "text-blue-500",
  none: "text-gray-400",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const DraggableTaskRow = memo(function DraggableTaskRow({
  task,
  showTime = false,
  onEdit,
}: DraggableTaskRowProps) {
  const [isCompleted, setIsCompleted] = useState(task.isCompleted || false);
  const { dispatch } = useSync();
  const { userId, use24HourClock } = useUser();

  useEffect(() => {
    setIsCompleted(task.isCompleted || false);
  }, [task.isCompleted]);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (!userId) return;
      setIsCompleted(checked);

      if (checked) {
        playSuccessSound();
      }

      const existing = useTaskStore.getState().tasks[task.id];
      if (existing) {
        useTaskStore.getState().upsertTask({
          ...existing,
          isCompleted: checked,
        });
      }

      dispatch("toggleTaskCompletion", task.id, userId, checked);
    },
    [dispatch, task.id, userId]
  );

  const hasTime =
    task.dueDate &&
    (task.dueDate instanceof Date
      ? task.dueDate.getHours() !== 0 || task.dueDate.getMinutes() !== 0
      : new Date(task.dueDate).getHours() !== 0 || new Date(task.dueDate).getMinutes() !== 0);

  const dueDate = task.dueDate
    ? task.dueDate instanceof Date
      ? task.dueDate
      : new Date(task.dueDate)
    : null;

  return (
    <div
      className={cn(
        "fc-external-task group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-grab active:cursor-grabbing",
        isCompleted && "opacity-50"
      )}
      data-task-id={task.id}
      data-task-title={task.icon ? `${task.icon} ${task.title}` : task.title}
      data-duration={task.estimateMinutes || 30}
      data-list-color={task.listColor || ""}
      onClick={() => onEdit?.(task)}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        className="rounded-full h-5 w-5 border-2 border-muted-foreground/30 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate flex items-center gap-1.5", isCompleted && "line-through text-muted-foreground")}>
          {task.icon && <ResolvedIcon icon={task.icon} className="h-4 w-4 shrink-0" />}
          <span className="truncate">{task.title}</span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {showTime && hasTime && dueDate && (
            <span className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[11px] font-medium text-foreground">
              {formatTimePreference(dueDate, use24HourClock)}
            </span>
          )}

          {task.priority && task.priority !== "none" && (
            <Flag className={cn("h-3 w-3", priorityColors[task.priority])} />
          )}

          {task.estimateMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(task.estimateMinutes)}
            </span>
          )}

          {task.listName && (
            <span className="flex items-center gap-1 text-[10px]">
              <ResolvedIcon icon={task.listIcon || null} className="w-3 h-3" color={task.listColor} />
              {task.listName}
            </span>
          )}
        </div>

        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {task.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                style={getLabelStyle(label.color)}
                className="text-[10px] px-1.5 py-0 h-4 font-normal"
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
