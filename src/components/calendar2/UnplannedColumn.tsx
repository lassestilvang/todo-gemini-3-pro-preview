"use client";

import { useRef } from "react";
import { DraggableTaskRow } from "./DraggableTaskRow";
import { useExternalDrag } from "./hooks/useExternalDrag";
import type { Task } from "@/lib/types";

interface UnplannedColumnProps {
  tasks: Task[];
  listName: string;
  onEditTask?: (task: Task) => void;
}

export function UnplannedColumn({ tasks, listName, onEditTask }: UnplannedColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useExternalDrag(containerRef);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{listName}</h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unplanned</p>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto calendar2-column p-1.5 space-y-px"
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/60">
            No unplanned tasks
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTaskRow key={task.id} task={task} onEdit={onEditTask} />
          ))
        )}
      </div>
    </div>
  );
}
