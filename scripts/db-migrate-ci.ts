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
        // NOTE: Drizzle uses the "drizzle" schema for migrations, not "public"
        const result = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'achievements'
            ) as has_old_schema,
            EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'drizzle' 
                AND table_name = '__drizzle_migrations'
            ) as has_migrations_table
        `;
        
        const { has_old_schema, has_migrations_table } = result[0];
        
        // Read the journal to get correct migration timestamps
        const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8"));
        const migration0000Entry = journal.entries.find((e: { tag: string }) => e.tag === "0000_jittery_cloak");
        const migration0000Timestamp = migration0000Entry?.when || 0;
        
        // Compute the hash for migration 0000 (same way Drizzle does it)
        const migration0000Hash = computeMigrationHash("./drizzle/0000_jittery_cloak.sql");
        
        if (has_old_schema && !has_migrations_table) {
            console.log("⚠️  Detected existing database without migration tracking.");
            console.log("   Initializing migration tracking for existing schema...");
            
            // Create the drizzle schema and migrations table
            // Mark migration 0000 as applied since the old schema already exists from db:push
            await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
            await sql`
                CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
                    id SERIAL PRIMARY KEY,
                    hash text NOT NULL,
                    created_at bigint
                )
            `;
            
            console.log(`   Migration 0000 hash: ${migration0000Hash}`);
            console.log(`   Migration 0000 timestamp: ${migration0000Timestamp}`);
            
            // Mark the first migration (0000_jittery_cloak) as already applied
            // Use the timestamp from the journal so Drizzle knows to run later migrations
            await sql`
                INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
                VALUES (${migration0000Hash}, ${migration0000Timestamp})
            `;
            
            console.log("   ✓ Migration tracking initialized");
        } else if (has_old_schema && has_migrations_table) {
            // Check if migration 0000 is properly recorded with correct hash AND timestamp
            const migrationCheck = await sql`
                SELECT hash, created_at FROM drizzle."__drizzle_migrations" 
                WHERE hash = ${migration0000Hash}
            `;
            
            if (migrationCheck.length === 0) {
                console.log("⚠️  Migration tracking exists but migration 0000 not recorded.");
                console.log(`   Adding migration 0000 hash: ${migration0000Hash}`);
                
                // Insert the correct hash for migration 0000 with correct timestamp
                await sql`
                    INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
                    VALUES (${migration0000Hash}, ${migration0000Timestamp})
                `;
                
                console.log("   ✓ Migration 0000 recorded");
            } else {
                // Check if the timestamp is correct (should be <= migration 0000's when)
                const storedTimestamp = Number(migrationCheck[0].created_at);
                if (storedTimestamp > migration0000Timestamp) {
                    console.log(`⚠️  Migration 0000 has incorrect timestamp: ${storedTimestamp} > ${migration0000Timestamp}`);
                    console.log("   Fixing timestamp...");
                    
                    // Update to correct timestamp
                    await sql`
                        UPDATE drizzle."__drizzle_migrations" 
                        SET created_at = ${migration0000Timestamp}
                        WHERE hash = ${migration0000Hash}
                    `;
                    
                    console.log("   ✓ Timestamp fixed");
                }
            }
        }
        
        // Debug: show what's in the migrations table before running
        const existingMigrations = await sql`SELECT hash, created_at FROM drizzle."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1`;
        console.log("   Last migration in DB:", existingMigrations[0]?.hash?.substring(0, 16) + "...", "created_at:", existingMigrations[0]?.created_at);
        
        // Show journal entries for debugging
        console.log("   Journal entries:");
        for (const entry of journal.entries) {
            console.log(`     - ${entry.tag}: when=${entry.when}`);
        }
        
        // Compute hash for migration 0001 to check
        const migration0001Hash = computeMigrationHash("./drizzle/0001_sloppy_mauler.sql");
        console.log(`   Migration 0001 hash: ${migration0001Hash.substring(0, 16)}...`);
        
        // Check: should migration 0001 run?
        const lastCreatedAt = Number(existingMigrations[0]?.created_at || 0);
        const migration0001Entry = journal.entries.find((e: { tag: string }) => e.tag === "0001_sloppy_mauler");
        const migration0001When = migration0001Entry?.when || 0;
        console.log(`   Comparison: lastCreatedAt(${lastCreatedAt}) < migration0001When(${migration0001When}) = ${lastCreatedAt < migration0001When}`);
        
        // Run all pending migrations
        // Drizzle automatically skips migrations that are already in __drizzle_migrations
        console.log("   Running Drizzle migrate...");
        await migrate(db, { migrationsFolder: "./drizzle" });
        
        // Debug: show what's in the migrations table after running
        const migrationsAfter = await sql`SELECT hash, created_at FROM drizzle."__drizzle_migrations" ORDER BY id`;
        console.log("   Migrations after:", migrationsAfter.map(m => m.hash.substring(0, 16) + "..."));
        
        // Check if users table exists now
        const usersCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            ) as has_users_table
        `;
        console.log("   Users table exists:", usersCheck[0].has_users_table);
        
        console.log("✅ Migrations completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigrations();
