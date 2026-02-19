import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Habits",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { getHabits } from "@/lib/habits";
import { getCurrentUser } from "@/lib/auth";
import { TaskItem } from "@/components/tasks/TaskItem";
import { redirect } from "next/navigation";

export default async function HabitsPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const habits = await getHabits(user.id);

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Habits 🔥</h1>
                <p className="text-muted-foreground mt-2">
                    Build streaks and track your daily habits
                </p>
            </div>

            {habits.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-lg text-muted-foreground mb-2">No habits yet</p>
                    <p className="text-sm text-muted-foreground">
                        Create a recurring task and toggle &quot;Track as Habit&quot; to get started
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {habits.map((habit) => (
                        <TaskItem key={habit.id} task={habit as unknown as Parameters<typeof TaskItem>[0]['task']} userId={user.id} />
                    ))}
                </div>
            )}
        </div>
    );
}
