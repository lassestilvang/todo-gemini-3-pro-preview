import { db } from "./index";
import { lists, labels, tasks } from "./schema";

async function seed() {
    console.log("Seeding database...");

    // Create Inbox list if not exists
    const inbox = await db.insert(lists).values({
        name: "Inbox",
        slug: "inbox",
        color: "#3b82f6", // Blue
        icon: "inbox",
    }).returning().get();

    // Create some default labels
    await db.insert(labels).values([
        { name: "Work", color: "#ef4444" }, // Red
        { name: "Personal", color: "#10b981" }, // Green
        { name: "Urgent", color: "#f59e0b" }, // Amber
    ]);

    console.log("Database seeded!");
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
