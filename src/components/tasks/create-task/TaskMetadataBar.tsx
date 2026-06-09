import React from "react";
import { Calendar, Flag, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { IconPicker } from "@/components/ui/icon-picker";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatFriendlyDate } from "@/lib/time-utils";
import { State, Action } from "@/lib/tasks/create-task-reducer";

interface TaskMetadataBarProps {
  state: State;
  dispatchState: React.Dispatch<Action>;
  userId: string;
  isClient: boolean;
}

export function TaskMetadataBar({
  state,
  dispatchState,
  userId,
  isClient,
}: TaskMetadataBarProps) {
  const { dueDate, priority, isCalendarOpen, isPriorityOpen, icon } = state;

  return (
    <div className="flex items-center justify-between p-2 border-t bg-muted/20 rounded-b-lg">
      <div className="flex items-center gap-2">
        <Popover
          open={isCalendarOpen}
          onOpenChange={(open) =>
            dispatchState({
              type: "SET_UI_STATE",
              payload: { isCalendarOpen: open },
            })
          }
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(dueDate && "text-primary")}
              aria-label={`Set due date, current date is ${dueDate ? (isClient ? formatFriendlyDate(dueDate, "MMM d") : format(dueDate, "MMM d")) : "Not set"}`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dueDate
                ? isClient
                  ? formatFriendlyDate(dueDate, "MMM d")
                  : format(dueDate, "MMM d")
                : "Due Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={dueDate}
              onSelect={(date) => {
                dispatchState({
                  type: "SET_DUE_DATE",
                  payload: {
                    date: date || undefined,
                    source: "manual",
                    precision: "day",
                  },
                });
                dispatchState({
                  type: "SET_UI_STATE",
                  payload: { isCalendarOpen: false },
                });
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover
          open={isPriorityOpen}
          onOpenChange={(open) =>
            dispatchState({
              type: "SET_UI_STATE",
              payload: { isPriorityOpen: open },
            })
          }
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(priority !== "none" && "text-primary")}
              aria-label={`Set priority, current priority is ${priority === "none" ? "None" : priority}`}
            >
              <Flag className="mr-2 h-4 w-4" />
              {priority === "none"
                ? "Priority"
                : priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2">
            <div className="grid gap-1">
              {["none", "low", "medium", "high"].map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    dispatchState({ type: "SET_PRIORITY", payload: p as any });
                    dispatchState({
                      type: "SET_UI_STATE",
                      payload: { isPriorityOpen: false },
                    });
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <IconPicker
          value={icon}
          onChange={(i) =>
            dispatchState({ type: "SET_ICON", payload: i || undefined })
          }
          userId={userId}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className={cn(icon && "text-primary")}
              aria-label={`Set icon${icon ? `, current icon is ${icon}` : ""}`}
            >
              {icon ? (
                <ResolvedIcon icon={icon} className="mr-2 h-4 w-4" />
              ) : (
                <Smile className="mr-2 h-4 w-4" />
              )}
              Icon
            </Button>
          }
        />
        {icon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() =>
                  dispatchState({ type: "SET_ICON", payload: undefined })
                }
                aria-label="Remove icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove icon</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
