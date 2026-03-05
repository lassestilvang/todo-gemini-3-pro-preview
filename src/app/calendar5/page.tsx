import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";
import { Calendar5Loader } from "@/components/calendar5/Calendar5Loader";

export const metadata: Metadata = {
  title: "Todo Gemini | Calendar5",
  description: "Manage your tasks with CalendarKit.",
};

export default async function Calendar5Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [tasksResult, lists] = await Promise.all([
    getTasks(user.id, undefined, "all", undefined, true),
    getLists(user.id),
  ]);

  if (!tasksResult.success) {
    console.error(tasksResult.error.message);
  }

  const tasks = tasksResult.success ? tasksResult.data : [];

  return (
    <div className="container mx-auto flex h-full min-h-0 flex-col p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Calendar V5</h1>
        <p className="mt-1 text-muted-foreground">CalendarKit-powered scheduler for planning tasks.</p>
      </div>

      <div className="flex-1 min-h-0">
        <Calendar5Loader initialTasks={tasks} initialLists={lists} />
      </div>
    </div>
  );
}
