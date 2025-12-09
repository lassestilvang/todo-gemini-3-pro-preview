import { getActivityLog } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { redirect } from "next/navigation";

export default async function ActivityLogPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const logs = await getActivityLog(user.id);

    return (
        <div className="flex flex-col h-full p-8">
            <h1 className="text-3xl font-bold mb-6">Activity Log</h1>
            <ScrollArea className="flex-1 border rounded-md p-4">
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex flex-col border-b pb-2 last:border-0">
                            <div className="flex justify-between items-start">
                                <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                                <span className="text-sm text-muted-foreground">{format(log.createdAt, "PPP p")}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Task: <span className="font-medium text-foreground">{log.taskTitle}</span>
                            </div>
                            {log.details && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{log.details}</p>}
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-muted-foreground">No activity recorded.</p>}
                </div>
            </ScrollArea>
        </div>
    );
}
