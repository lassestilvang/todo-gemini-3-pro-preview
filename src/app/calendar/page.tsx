import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Calendar",
  description: "Manage your tasks efficiently with Todo Gemini."
};


import { getCurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
const CalendarView = dynamic(() => import("@/components/calendar/CalendarView").then(mod => mod.CalendarView), {
    loading: () => <div className="flex-1 min-h-0 w-full animate-pulse bg-muted rounded-lg" />,
});
import { redirect } from "next/navigation";

import { type Task } from "@/lib/types";

export default async function CalendarPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch all tasks to display on the calendar
    // In a real app with thousands of tasks, we'd want to fetch by date range
    // But for this scale, fetching all is fine and allows for smooth client-side navigation
    // OPTIM: Hydrate from client store
    const tasks: Task[] = [];

    return (
        <div className="container mx-auto p-6 h-full flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold">Calendar 📅</h1>
                <p className="text-muted-foreground mt-1">
                    Visualize your schedule and manage deadlines
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <CalendarView tasks={tasks} />
            </div>
        </div>
    );
}
