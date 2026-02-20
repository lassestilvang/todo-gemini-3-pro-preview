"use client";

import dynamic from "next/dynamic";

const Calendar3Client = dynamic(
   () => import("@/components/calendar3/Calendar3Client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-0 w-full animate-pulse bg-muted rounded-lg" />
    ),
  }
);

interface Calendar3LoaderProps {
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

export function Calendar3Loader({ initialTasks, initialLists }: Calendar3LoaderProps) {
  return <Calendar3Client initialTasks={initialTasks} initialLists={initialLists} />;
}
