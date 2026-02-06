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
}

export function CalendarSidebar({
  lists,
  visibleListIds,
  onToggleList,
  onToggleAll,
}: CalendarSidebarProps) {
  const totalCount = lists.length + 1; // + Inbox
  const visibleCount = visibleListIds.size;
  const allChecked = visibleCount === totalCount;

  return (
    <aside className="w-64 shrink-0 border-r bg-card/50 backdrop-blur-xl p-4 flex flex-col gap-4">
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

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={visibleListIds.has(null)}
            onCheckedChange={() => onToggleList(null)}
          />
          <span className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            Inbox
          </span>
        </label>

        {lists.map((list) => (
          <label key={list.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={visibleListIds.has(list.id)}
              onCheckedChange={() => onToggleList(list.id)}
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
          </label>
        ))}
      </div>
    </aside>
  );
}
