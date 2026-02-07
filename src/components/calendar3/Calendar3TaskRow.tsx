"use client";

import { TaskItem } from "@/components/tasks/TaskItem";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Calendar3TaskRowProps {
  task: Task;
  userId?: string;
  showListInfo?: boolean;
  draggable?: boolean;
  defaultDurationMinutes?: number;
}

export function Calendar3TaskRow({
  task,
  userId,
  showListInfo = true,
  draggable = true,
  defaultDurationMinutes = 30,
}: Calendar3TaskRowProps) {
  const durationMinutes =
    typeof task.estimateMinutes === "number" && task.estimateMinutes > 0
      ? task.estimateMinutes
      : defaultDurationMinutes;

  return (
    <div
      data-task-draggable={draggable ? "true" : undefined}
      data-task-id={task.id}
      data-task-title={task.title}
      data-task-duration={durationMinutes}
      data-task-list-id={task.listId ?? ""}
      data-task-color={task.listColor ?? ""}
      className={cn(
        "rounded-lg transition-colors",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <TaskItem
        task={task}
        showListInfo={showListInfo}
        userId={userId}
        disableAnimations
      />
    </div>
  );
}
