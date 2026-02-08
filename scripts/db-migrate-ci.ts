#!/usr/bin/env bun
/**
 * CI Database Migration Script
 * 
 * This script is idempotent and safe to run multiple times.
 * It runs all pending migrations using Drizzle.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function runMigrations() {
    console.log("Running database migrations...");

    try {
        await migrate(db, { migrationsFolder: "./drizzle" });
        console.log("✅ Migrations completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigrations();
