"use client";

import { useRef, useState } from "react";
import { DraggableTaskRow } from "./DraggableTaskRow";
import { useExternalDrag } from "./hooks/useExternalDrag";
import { ChevronDown, CheckCircle2 } from "lucide-react";
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
          <h2 className="text-base font-semibold tracking-tight">Today</h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto calendar2-column"
      >
        <div className="p-1.5 space-y-px">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/60">
              No tasks for today
            </div>
          ) : (
            tasks.map((task) => (
              <DraggableTaskRow key={task.id} task={task} showTime onEdit={onEditTask} />
            ))
          )}
        </div>

        {doneTasks.length > 0 && (
          <div className="border-t mt-1">
            <button
              onClick={() => setShowDone(!showDone)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  !showDone && "-rotate-90"
                )}
              />
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">Done</span>
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {doneTasks.length}
              </span>
            </button>

            {showDone && (
              <div className="px-1.5 pb-1.5 space-y-px">
                {doneTasks.map((task) => (
                  <DraggableTaskRow key={task.id} task={task} showTime onEdit={onEditTask} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
