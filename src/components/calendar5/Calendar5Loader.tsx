"use client";

import dynamic from "next/dynamic";

const Calendar5Client = dynamic(
  () => import("@/components/calendar5/Calendar5Client").then((mod) => mod.Calendar5Client),
  {
    ssr: false,
    loading: () => <div className="flex-1 min-h-0 w-full animate-pulse rounded-lg bg-muted" />,
  }
);

interface Calendar5LoaderProps {
  initialTasks: import("@/lib/types").Task[];
  initialLists: Array<{
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
    position?: number;
  }>;
}

export function Calendar5Loader({ initialTasks, initialLists }: Calendar5LoaderProps) {
  return <Calendar5Client initialTasks={initialTasks} initialLists={initialLists} />;
}
