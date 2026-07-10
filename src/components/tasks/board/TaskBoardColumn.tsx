"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/types";
import { TaskBoardCard } from "./TaskBoardCard";
import type { BoardColumn } from "./board-utils";

interface TaskBoardColumnProps {
  column: BoardColumn;
  tasks: Task[];
  onEdit: (task: Task) => void;
}

const colorMap: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  gray: "bg-gray-400",
};

export function TaskBoardColumn({ column, tasks, onEdit }: TaskBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-xl border transition-colors",
        isOver && "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            colorMap[column.color || "gray"]
          )}
        />
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <span className="text-xs text-muted-foreground ml-auto bg-muted px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[100px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed rounded-lg">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskBoardCard key={task.id} task={task} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}
