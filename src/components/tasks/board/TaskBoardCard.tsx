"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/types";
import { Calendar, Flag, Clock, CheckCircle2, Circle } from "lucide-react";
import { formatFriendlyDate } from "@/lib/time-utils";
import { formatDuePeriod, type DuePrecision } from "@/lib/due-utils";

interface TaskBoardCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
  none: "border-l-gray-300",
};

export function TaskBoardCard({ task, onEdit }: TaskBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
    });

  const dueDateValue = task.dueDate
    ? (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate))
    : null;
  const periodLabel = dueDateValue && task.dueDatePrecision && task.dueDatePrecision !== "day"
    ? formatDuePeriod({
      dueDate: dueDateValue,
      dueDatePrecision: task.dueDatePrecision as DuePrecision,
    })
    : null;
  const dueAriaLabel = periodLabel ? `Due ${periodLabel}` : undefined;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(task)}
      className={cn(
        "bg-background border border-l-2 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
        priorityColors[task.priority || "none"],
        isDragging && "opacity-50 shadow-lg z-50",
        task.isCompleted && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {task.isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <span
          className={cn(
            "text-sm font-medium line-clamp-2",
            task.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.dueDate && (
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={dueAriaLabel}
            aria-label={dueAriaLabel}
          >
            <Calendar className="h-3 w-3" />
            {periodLabel
              ? periodLabel
              : formatFriendlyDate(dueDateValue!)}
          </span>
        )}
        {task.priority && task.priority !== "none" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
            <Flag className="h-3 w-3" />
            {task.priority}
          </span>
        )}
        {task.estimateMinutes && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {task.estimateMinutes >= 60
              ? `${Math.floor(task.estimateMinutes / 60)}h${task.estimateMinutes % 60 > 0 ? ` ${task.estimateMinutes % 60}m` : ""}`
              : `${task.estimateMinutes}m`}
          </span>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full border"
              style={{
                borderColor: label.color || undefined,
                color: label.color || undefined,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {task.subtaskCount !== undefined && task.subtaskCount > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          {task.completedSubtaskCount || 0}/{task.subtaskCount} subtasks
        </div>
      )}
    </div>
  );
}
