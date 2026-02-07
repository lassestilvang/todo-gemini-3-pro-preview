"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type CalendarList = {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
};

interface CalendarSidebarProps {
  lists: CalendarList[];
  visibleListIds: Set<number | null>;
  onToggleList: (listId: number | null) => void;
  onToggleAll: (nextChecked: boolean) => void;
  selectedListId: number | null;
  onSelectList: (listId: number | null) => void;
}

export function CalendarSidebar({
  lists,
  visibleListIds,
  onToggleList,
  onToggleAll,
  selectedListId,
  onSelectList,
}: CalendarSidebarProps) {
  const totalCount = lists.length + 1; // + Inbox
  const visibleCount = visibleListIds.size;
  const allChecked = visibleCount === totalCount;

  return (
    <aside className="w-56 shrink-0 border-r bg-card/50 backdrop-blur-xl p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Calendars
        </h2>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={allChecked}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
        />
        <span>All</span>
      </label>

      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 text-sm px-2 py-1.5 rounded-md cursor-pointer transition-colors",
            selectedListId === null && "bg-accent"
          )}
          onClick={() => onSelectList(null)}
        >
          <Checkbox
            checked={visibleListIds.has(null)}
            onCheckedChange={() => onToggleList(null)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            Inbox
          </span>
        </div>

        {lists.map((list) => (
          <div
            key={list.id}
            className={cn(
              "flex items-center gap-2 text-sm px-2 py-1.5 rounded-md cursor-pointer transition-colors",
              selectedListId === list.id && "bg-accent"
            )}
            onClick={() => onSelectList(list.id)}
          >
            <Checkbox
              checked={visibleListIds.has(list.id)}
              onCheckedChange={() => onToggleList(list.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  !list.color && "bg-muted"
                )}
                style={list.color ? { backgroundColor: list.color } : undefined}
              />
              <span className="truncate">{list.name}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
