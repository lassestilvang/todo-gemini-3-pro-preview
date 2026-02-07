"use client";

import { useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DraggableTaskRow } from "./DraggableTaskRow";
import { useExternalDrag } from "./hooks/useExternalDrag";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface TodayColumnProps {
  tasks: Task[];
  doneTasks: Task[];
  onEditTask?: (task: Task) => void;
}

export function TodayColumn({ tasks, doneTasks, onEditTask }: TodayColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDone, setShowDone] = useState(false);
  useExternalDrag(containerRef);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={containerRef} className="p-2 space-y-0.5">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tasks for today.
            </div>
          ) : (
            tasks.map((task) => (
              <DraggableTaskRow key={task.id} task={task} showTime onEdit={onEditTask} />
            ))
          )}
        </div>

        {doneTasks.length > 0 && (
          <div className="px-2 pb-2">
            <button
              onClick={() => setShowDone(!showDone)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  !showDone && "-rotate-90"
                )}
              />
              <span>Done</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {doneTasks.length}
              </span>
            </button>

            {showDone && (
              <div className="space-y-0.5">
                {doneTasks.map((task) => (
                  <DraggableTaskRow key={task.id} task={task} showTime onEdit={onEditTask} />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
