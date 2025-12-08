import { db, users, lists, labels, achievements, userStats } from "./index";
import { eq } from "drizzle-orm";

/**
 * Default test user for development and seeding
 * In production, users are created via WorkOS authentication
 */
const TEST_USER = {
    id: "test_user_seed",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
};

/**
 * Ensure the test user exists in the database
 * Creates the user if not exists, returns the user ID
 */
async function ensureTestUser(): Promise<string> {
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, TEST_USER.id))
        .limit(1);

    if (existingUser.length > 0) {
        console.log(`   ✅ Test user already exists: ${TEST_USER.email}`);
        return TEST_USER.id;
    }

    await db.insert(users).values({
        id: TEST_USER.id,
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        avatarUrl: null,
    });

    console.log(`   ✅ Created test user: ${TEST_USER.email}`);
    return TEST_USER.id;
}

/**
 * Initialize default data for a user (Inbox list and stats)
 */
async function initializeUserData(userId: string): Promise<void> {
    // Check if user already has an Inbox list
    const existingInbox = await db
        .select()
        .from(lists)
        .where(eq(lists.userId, userId))
        .limit(1);

    if (existingInbox.length === 0) {
        await db.insert(lists).values({
            userId,
            name: "Inbox",
            slug: "inbox",
            color: "#6366f1", // Indigo
            icon: "inbox",
        });
        console.log("   ✅ Created Inbox list for test user");
    } else {
        console.log("   ⏭️  Inbox list already exists");
    }

    // Check if user already has stats
    const existingStats = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

    if (existingStats.length === 0) {
        await db.insert(userStats).values({
            userId,
            xp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
        });
        console.log("   ✅ Created user stats for test user");
    } else {
        console.log("   ⏭️  User stats already exist");
    }

    // Create default labels for the user
    const existingLabels = await db
        .select()
        .from(labels)
        .where(eq(labels.userId, userId))
        .limit(1);

    if (existingLabels.length === 0) {
        await db.insert(labels).values([
            { userId, name: "Work", color: "#ef4444" }, // Red
            { userId, name: "Personal", color: "#10b981" }, // Green
            { userId, name: "Urgent", color: "#f59e0b" }, // Amber
        ]);
        console.log("   ✅ Created default labels for test user");
    } else {
        console.log("   ⏭️  Labels already exist");
    }
}

/**
 * Seed global achievements (not user-specific)
 */
async function seedAchievements(): Promise<void> {
    console.log("\n📦 Seeding achievements...");
    
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
    
    console.log("   ✅ Achievements seeded");
}

async function seed() {
    console.log("\n🌱 Seeding database...\n");
    console.log("=".repeat(50));

    // Step 1: Create test user
    console.log("\n👤 Setting up test user...");
    const userId = await ensureTestUser();

    // Step 2: Initialize user data (Inbox, stats, labels)
    console.log("\n📦 Initializing user data...");
    await initializeUserData(userId);

    // Step 3: Seed global achievements
    await seedAchievements();

    console.log("\n" + "=".repeat(50));
    console.log("✅ Database seeded successfully!");
    console.log("\n📝 Test user credentials:");
    console.log(`   ID: ${TEST_USER.id}`);
    console.log(`   Email: ${TEST_USER.email}`);
    console.log("\n💡 Note: In production, users are created via WorkOS authentication.");
}

seed().catch((err) => {
    console.error("\n❌ Seeding failed:", err);
    process.exit(1);
});
