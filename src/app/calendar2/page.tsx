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

  const [tasksResult, lists] = await Promise.all([
    getTasks(user.id, undefined, "all", undefined, true),
    getLists(user.id),
  ]);
  if (!tasksResult.success) {
    console.error(tasksResult.error.message);
  }
  const tasks = tasksResult.success ? tasksResult.data : [];

  return (
    <div className="h-full flex flex-col min-h-0">
      <Calendar2Loader initialTasks={tasks} initialLists={lists} />
    </div>
  );
}
