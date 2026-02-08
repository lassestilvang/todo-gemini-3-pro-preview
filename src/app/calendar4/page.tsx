
import { Suspense } from "react";
import { db } from "@/db";
import { tasks, lists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Calendar4Client } from "@/components/calendar4/Calendar4Client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Calendar V4 - Todo Gemini",
    description: "Advanced calendar view for your tasks",
};

async function getInitialData() {
    const user = await getCurrentUser();
    if (!user) return { tasks: [], lists: [] };

    const [userTasks, userLists] = await Promise.all([
        db.select().from(tasks).where(eq(tasks.userId, user.id)),
        db.select().from(lists).where(eq(lists.userId, user.id)),
    ]);

    return { tasks: userTasks, lists: userLists };
}

export default async function Calendar4Page() {
    const { tasks, lists } = await getInitialData();

    return (
        <Suspense fallback={<div>Loading calendar...</div>}>
            <Calendar4Client initialTasks={tasks} initialLists={lists} />
        </Suspense>
    );
}
