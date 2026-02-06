"use client";

import dynamic from "next/dynamic";

const Calendar2Client = dynamic(
  () => import("@/components/calendar2/Calendar2Client").then(mod => mod.Calendar2Client),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-0 w-full animate-pulse bg-muted rounded-lg" />
    ),
  }
);

interface Calendar2LoaderProps {
  initialTasks: import("@/lib/types").Task[];
  initialLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
}

export function Calendar2Loader({ initialTasks, initialLists }: Calendar2LoaderProps) {
  return <Calendar2Client initialTasks={initialTasks} initialLists={initialLists} />;
}
