"use client";

import { useState, type ReactNode, type Ref } from "react";
import { Calendar3TaskRow } from "@/components/calendar3/Calendar3TaskRow";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type Calendar3List = {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
};

interface Calendar3TaskColumnProps {
  title: string;
  subtitle?: string;
  list?: Calendar3List | null;
  tasks: Task[];
  completedTasks: Task[];
  userId?: string;
  listId?: number | null;
  defaultDueDate?: Date;
  showListInfo?: boolean;
  headerAction?: ReactNode;
  emptyState?: string;
  dragContainerRef?: Ref<HTMLDivElement>;
}

export function Calendar3TaskColumn({
  title,
  subtitle,
  list,
  tasks,
  completedTasks,
  userId,
  listId,
  defaultDueDate,
  showListInfo = true,
  headerAction,
  emptyState = "No tasks yet.",
  dragContainerRef,
}: Calendar3TaskColumnProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <section className="flex flex-col min-h-0 w-[320px] shrink-0 border-r bg-card/40">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {subtitle ?? "Tasks"}
            </p>
            <div className="flex items-center gap-2">
              {list ? (
                <ResolvedIcon
                  icon={list.icon}
                  className="h-5 w-5 shrink-0"
                  color={list.color || undefined}
                />
              ) : null}
              <h2 className="text-lg font-semibold truncate">{title}</h2>
            </div>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </div>

      {userId ? (
        <div className="border-b p-4">
          <CreateTaskInput
            listId={listId === null ? undefined : listId}
            defaultDueDate={defaultDueDate}
            userId={userId}
          />
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div ref={dragContainerRef} className="space-y-2">
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            tasks.map((task) => (
              <Calendar3TaskRow
                key={task.id}
                task={task}
                userId={userId}
                showListInfo={showListInfo}
                draggable={!task.isCompleted}
              />
            ))
          )}
        </div>

        {completedTasks.length > 0 ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted((prev) => !prev)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showCompleted && "rotate-180"
                )}
              />
              Done {completedTasks.length}
            </Button>
            {showCompleted ? (
              <div className="mt-3 space-y-2">
                {completedTasks.map((task) => (
                  <Calendar3TaskRow
                    key={task.id}
                    task={task}
                    userId={userId}
                    showListInfo={showListInfo}
                    draggable={false}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
