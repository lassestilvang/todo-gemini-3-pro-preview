import { getTasks } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { CalendarView } from "@/components/calendar/CalendarView";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch all tasks to display on the calendar
    // In a real app with thousands of tasks, we'd want to fetch by date range
    // But for this scale, fetching all is fine and allows for smooth client-side navigation
    const tasks = (await getTasks(user.id, undefined, "all")).map(t => ({
        ...t,
        isCompleted: t.isCompleted ?? false,
        priority: (t.priority || "none") as "none" | "low" | "medium" | "high"
    }));

    return (
        <div className="container mx-auto p-6 h-screen flex flex-col">
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
