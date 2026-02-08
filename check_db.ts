import { db, tasks } from "./src/db";
import { eq, and, isNull } from "drizzle-orm";

async function check() {
    const userId = "dev_user";
    console.log(`Checking tasks for user: ${userId}`);

    const all = await db.select().from(tasks).where(eq(tasks.userId, userId));
    console.log(`Total tasks: ${all.length}`);

    const parents = await db.select().from(tasks).where(and(eq(tasks.userId, userId), isNull(tasks.parentId)));
    console.log(`Parent tasks: ${parents.length}`);

    const activeParents = parents.filter(t => !t.isCompleted);
    console.log(`Active parent tasks: ${activeParents.length}`);

    const completedParents = parents.filter(t => t.isCompleted);
    console.log(`Completed parent tasks: ${completedParents.length}`);

    const now = new Date();
    const overdue = activeParents.filter(t => t.dueDate && t.dueDate < now);
    console.log(`Overdue active parent tasks: ${overdue.length}`);

    const futureOrNoDate = activeParents.filter(t => !t.dueDate || t.dueDate >= now);
    console.log(`Active parent tasks (Future or No Date): ${futureOrNoDate.length}`);

    if (futureOrNoDate.length > 0) {
        console.log("Sample active tasks (Future or No Date):");
        futureOrNoDate.slice(0, 5).forEach(t => console.log(`- ${t.title} (Due: ${t.dueDate})`));
    }
}

check().catch(console.error);
