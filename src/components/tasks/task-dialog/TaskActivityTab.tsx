"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { TabsContent } from "@/components/ui/tabs";

type LogType = {
    id: number;
    action: string;
    details: string | null;
    createdAt: Date;
};

interface TaskActivityTabProps {
    logs: LogType[];
}

export function TaskActivityTab({ logs }: TaskActivityTabProps) {
    return (
        <TabsContent value="activity" className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Activity Log</h3>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                                    <span className="text-xs text-muted-foreground">{format(log.createdAt, "Pp")}</span>
                                </div>
                                <p className="text-muted-foreground text-xs whitespace-pre-wrap">{log.details}</p>
                            </div>
                        ))}
                        {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
                    </div>
                </ScrollArea>
            </div>
        </TabsContent>
    );
}
