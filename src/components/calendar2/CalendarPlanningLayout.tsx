"use client";

import type { ReactNode } from "react";

interface CalendarPlanningLayoutProps {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
}

export function CalendarPlanningLayout({ left, middle, right }: CalendarPlanningLayoutProps) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-card/30">
        {left}
      </div>
      <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-card/30">
        {middle}
      </div>
      <div className="flex-1 min-w-0 min-h-0 p-3 flex flex-col">
        {right}
      </div>
    </div>
  );
}
