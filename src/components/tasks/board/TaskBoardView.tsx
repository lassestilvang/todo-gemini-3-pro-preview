"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";
import { Task } from "@/lib/types";
import { TaskBoardColumn } from "./TaskBoardColumn";
import { TaskBoardCard } from "./TaskBoardCard";
import {
  BoardGroupMode,
  getBoardColumns,
  groupTasksByColumn,
  getTaskColumnId,
  getPatchForDrop,
} from "./board-utils";
import { useTaskStore } from "@/lib/store/task-store";
import { useSync } from "@/components/providers/sync-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskBoardViewProps {
  tasks: Task[];
  userId: string;
  onEdit: (task: Task) => void;
}

export function TaskBoardView({ tasks, userId, onEdit }: TaskBoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [boardGroupMode, setBoardGroupMode] =
    useState<BoardGroupMode>("priority");
  const { dispatch } = useSync();

  const columns = useMemo(
    () => getBoardColumns(boardGroupMode),
    [boardGroupMode]
  );

  const columnTasks = useMemo(
    () => groupTasksByColumn(tasks, boardGroupMode, columns),
    [tasks, boardGroupMode, columns]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as number;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let columnId: string | null = null;
      if (typeof over.id === "string" && over.id.startsWith("column:")) {
        columnId = over.id.replace("column:", "");
      } else if (over.data.current?.columnId) {
        columnId = over.data.current.columnId as string;
      }
      if (!columnId) return;

      const currentColumnId = getTaskColumnId(task, boardGroupMode);
      if (currentColumnId === columnId) return;

      const patch = getPatchForDrop(boardGroupMode, columnId);

      useTaskStore.getState().upsertTask({
        ...task,
        ...patch,
      } as Task);

      dispatch("updateTask", taskId, userId, {
        ...patch,
        expectedUpdatedAt: task.updatedAt ?? null,
      });
    },
    [tasks, boardGroupMode, userId, dispatch]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <Select
          value={boardGroupMode}
          onValueChange={(v) => setBoardGroupMode(v as BoardGroupMode)}
        >
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="dueDate">Due Date</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {columns.map((column) => (
            <TaskBoardColumn
              key={column.id}
              column={column}
              tasks={columnTasks.get(column.id) || []}
              onEdit={onEdit}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 scale-105">
              <TaskBoardCard task={activeTask} onEdit={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
