import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calendar2Loader } from "@/components/calendar2/Calendar2Loader";
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";

export default async function Calendar2Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [tasks, lists] = await Promise.all([
    getTasks(user.id, undefined, "all", undefined, true),
    getLists(user.id),
  ]);

  return (
    <div className="container mx-auto p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Calendar V2</h1>
        <p className="text-muted-foreground mt-1">
          Plan your schedule with FullCalendar v7.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <Calendar2Loader initialTasks={tasks} initialLists={lists} />
      </div>
    </div>
  );
}
