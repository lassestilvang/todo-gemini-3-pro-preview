import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

// Type for the database connection
type DbConnection = NeonHttpDatabase<typeof pgSchema>;

let db: DbConnection;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteConnection: any = null; // Raw SQLite connection for direct access in tests

// Select schema based on environment - SQLite for tests, PostgreSQL for production
// Cast to pgSchema type for TypeScript compatibility (both schemas have same structure)
const schema = (process.env.NODE_ENV === "test" ? sqliteSchema : pgSchema) as typeof pgSchema;

if (process.env.NODE_ENV === "test") {
    // Use in-memory SQLite for tests to maintain fast test execution
    // and avoid requiring a database connection during CI
    const { Database } = await import("bun:sqlite");
    const { drizzle } = await import("drizzle-orm/bun-sqlite");

    // Create SQLite database
    sqliteConnection = new Database(":memory:");

    // Use SQLite-specific schema that has compatible defaults (datetime('now') instead of NOW())
    // Cast to DbConnection for type compatibility - tests use SQLite but share the same interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db = drizzle(sqliteConnection, { schema: sqliteSchema }) as any;
} else {
    // Use Neon PostgreSQL for development and production
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    db = drizzleNeon(sql, { schema: pgSchema });
}

// Export schema tables - uses SQLite schema at runtime for tests, PostgreSQL for production
// TypeScript sees these as PostgreSQL types for consistent type checking
export const {
    users,
    lists,
    tasks,
    labels,
    taskLabels,
    reminders,
    taskLogs,
    habitCompletions,
    taskDependencies,
    templates,
    userStats,
    achievements,
    userAchievements,
    viewSettings,
    rateLimits,
    savedViews,
    timeEntries,
} = schema;

export { db, sqliteConnection, schema };
