import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Calendar3",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calendar3Loader } from "@/components/calendar3/Calendar3Loader";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";

export default async function Calendar3Page() {
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
    <div className="container mx-auto p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Calendar V3</h1>
        <p className="text-muted-foreground mt-1">
          Plan your schedule with a three-column layout.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <Calendar3Loader initialTasks={tasks} initialLists={lists} />
      </div>
    </div>
  );
}
