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
  const totalCount = lists.length + 1;
  const visibleCount = visibleListIds.size;
  const allChecked = visibleCount === totalCount;

  return (
    <aside className="w-52 shrink-0 border-r bg-card/30 backdrop-blur-xl flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Calendars
        </h2>
      </div>

      <div className="p-2 space-y-px overflow-y-auto calendar2-column flex-1">
        <label htmlFor="calendar-all-checked" className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
          <Checkbox
            id="calendar-all-checked"
            checked={allChecked}
            onCheckedChange={(checked) => onToggleAll(checked === true)}
            className="h-4 w-4"
          />
          <span className="text-muted-foreground font-medium text-xs">All</span>
        </label>

        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md cursor-pointer transition-colors",
            selectedListId === null ? "bg-accent" : "hover:bg-muted/50"
          )}
          onClick={() => onSelectList(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectList(null);
            }
          }}
        >
          <Checkbox
            checked={visibleListIds.has(null)}
            onCheckedChange={() => onToggleList(null)}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />
          <span className="inline-flex h-2 w-2 rounded-full bg-primary shrink-0" />
          <span className="text-xs truncate">Inbox</span>
        </div>

        {lists.map((list) => (
          <div
            key={list.id}
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md cursor-pointer transition-colors",
              selectedListId === list.id ? "bg-accent" : "hover:bg-muted/50"
            )}
            onClick={() => onSelectList(list.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectList(list.id);
              }
            }}
          >
            <Checkbox
              checked={visibleListIds.has(list.id)}
              onCheckedChange={() => onToggleList(list.id)}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
            <span
              className={cn(
                "inline-flex h-2 w-2 rounded-full shrink-0",
                !list.color && "bg-muted-foreground/40"
              )}
              style={list.color ? { backgroundColor: list.color } : undefined}
            />
            <span className="text-xs truncate">{list.name}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
