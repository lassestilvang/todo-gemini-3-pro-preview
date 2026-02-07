"use client";

import { useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
          <h2 className="text-lg font-semibold">{listName}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Unplanned tasks</p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={containerRef} className="p-2 space-y-0.5">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No unplanned tasks in this list.
            </div>
          ) : (
            tasks.map((task) => (
              <DraggableTaskRow key={task.id} task={task} onEdit={onEditTask} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
