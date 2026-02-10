import { db, tasks } from "./src/db";
import { getTasks } from "./src/lib/actions/tasks";
import { eq } from "drizzle-orm";

async function reproduce() {
    const userId = "dev_user"; // Default dev user

    console.log("--- All Tasks (filter='all') ---");
    const allTasks = await getTasks(userId, undefined, "all");
    console.log(`Count: ${allTasks.length}`);
    allTasks.forEach(t => {
        console.log(`- [${t.isCompleted ? 'x' : ' '}] ${t.title} (Due: ${t.dueDate})`);
    });

    console.log("\n--- Active Tasks in DB ---");
    const activeTasksInDb = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, false)));
    console.log(`Count: ${activeTasksInDb.length}`);
}

import { and } from "drizzle-orm";
reproduce().catch(console.error);
