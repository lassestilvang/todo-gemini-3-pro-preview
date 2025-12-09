#!/usr/bin/env bun
/**
 * CI Database Migration Script
 * 
 * Handles migrations for both fresh databases and existing ones.
 * - For fresh DBs: runs all migrations from scratch
 * - For existing DBs without migration tracking: initializes tracking, marks
 *   pre-existing migrations as applied, then runs pending migrations
 * 
 * This script is idempotent and safe to run multiple times.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { createHash } from "crypto";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Compute the hash the same way Drizzle does (SHA256 of file content)
function computeMigrationHash(filePath: string): string {
    const content = readFileSync(filePath, "utf8");
    return createHash("sha256").update(content).digest("hex");
}

async function runMigrations() {
    console.log("Running database migrations...");

    try {
        // Check if this is an existing database with old schema (no migration tracking)
        // This handles the transition from db:push to proper migrations
        const result = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'achievements'
            ) as has_old_schema,
            EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '__drizzle_migrations'
            ) as has_migrations_table
        `;
        
        const { has_old_schema, has_migrations_table } = result[0];
        
        // Compute the hash for migration 0000 (same way Drizzle does it)
        const migration0000Hash = computeMigrationHash("./drizzle/0000_jittery_cloak.sql");
        
        if (has_old_schema && !has_migrations_table) {
            console.log("⚠️  Detected existing database without migration tracking.");
            console.log("   Initializing migration tracking for existing schema...");
            
            // Create the migrations table and mark migration 0000 as applied
            // since the old schema already exists from db:push
            await sql`
                CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
                    id SERIAL PRIMARY KEY,
                    hash text NOT NULL,
                    created_at bigint
                )
            `;
            
            console.log(`   Migration 0000 hash: ${migration0000Hash}`);
            
            // Mark the first migration (0000_jittery_cloak) as already applied
            // This migration created the original single-user schema
            await sql`
                INSERT INTO "__drizzle_migrations" (hash, created_at)
                VALUES (${migration0000Hash}, ${Date.now()})
            `;
            
            console.log("   ✓ Migration tracking initialized");
        } else if (has_old_schema && has_migrations_table) {
            // Check if migration 0000 is properly recorded with correct hash
            const migrationCheck = await sql`
                SELECT EXISTS (
                    SELECT FROM "__drizzle_migrations" 
                    WHERE hash = ${migration0000Hash}
                ) as has_migration_0000
            `;
            
            if (!migrationCheck[0].has_migration_0000) {
                console.log("⚠️  Migration tracking exists but migration 0000 not recorded.");
                console.log(`   Adding migration 0000 hash: ${migration0000Hash}`);
                
                // Insert the correct hash for migration 0000
                await sql`
                    INSERT INTO "__drizzle_migrations" (hash, created_at)
                    VALUES (${migration0000Hash}, ${Date.now()})
                `;
                
                console.log("   ✓ Migration 0000 recorded");
            }
        }
        
        // Run all pending migrations
        // Drizzle automatically skips migrations that are already in __drizzle_migrations
        await migrate(db, { migrationsFolder: "./drizzle" });
        
        console.log("✅ Migrations completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigrations();
