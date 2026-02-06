"use client";

import { TaskDialog } from "@/components/tasks/TaskDialog";

interface CalendarQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDueDate?: Date;
  defaultListId?: number;
  userId?: string;
}

export function CalendarQuickCreateDialog({
  open,
  onOpenChange,
  defaultDueDate,
  defaultListId,
  userId,
}: CalendarQuickCreateDialogProps) {
  return (
    <TaskDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultDueDate={defaultDueDate}
      defaultListId={defaultListId}
      userId={userId}
    />
  );
}
