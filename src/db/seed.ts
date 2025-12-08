import { db, lists, labels, achievements } from "./index";

async function seed() {
    console.log("Seeding database...");

    // Create Inbox list if not exists
    await db.insert(lists).values({
        name: "Inbox",
        slug: "inbox",
        color: "#3b82f6", // Blue
        icon: "inbox",
    }).onConflictDoNothing();

    // Create some default labels
    await db.insert(labels).values([
        { name: "Work", color: "#ef4444" }, // Red
        { name: "Personal", color: "#10b981" }, // Green
        { name: "Urgent", color: "#f59e0b" }, // Amber
    ]).onConflictDoNothing();

    // Seed Achievements
    await db.insert(achievements).values([
        {
            id: "first_blood",
            name: "First Blood",
            description: "Complete your first task",
            icon: "⚔️",
            conditionType: "count_total",
            conditionValue: 1,
            xpReward: 50
        },
        {
            id: "hat_trick",
            name: "Hat Trick",
            description: "Complete 3 tasks in a day",
            icon: "🎩",
            conditionType: "count_daily",
            conditionValue: 3,
            xpReward: 100
        },
        {
            id: "on_fire",
            name: "On Fire",
            description: "Maintain a 3-day streak",
            icon: "🔥",
            conditionType: "streak",
            conditionValue: 3,
            xpReward: 200
        },
        {
            id: "task_master",
            name: "Task Master",
            description: "Complete 100 tasks total",
            icon: "👑",
            conditionType: "count_total",
            conditionValue: 100,
            xpReward: 500
        }
    ]).onConflictDoNothing();

    console.log("Database seeded!");
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
