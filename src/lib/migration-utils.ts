/**
 * Data transformation utilities for SQLite to PostgreSQL migration.
 * 
 * SQLite stores:
 * - Timestamps as Unix epoch integers (seconds since 1970-01-01)
 * - Booleans as integers (0 = false, 1 = true)
 * 
 * PostgreSQL uses native TIMESTAMP and BOOLEAN types.
 */

/**
 * Transforms a SQLite Unix epoch timestamp (seconds) to a JavaScript Date.
 * 
 * **Feature: sqlite-to-neon-migration, Property 1: Timestamp Transformation Correctness**
 * For any valid SQLite timestamp (Unix epoch integer), transforming it to a 
 * PostgreSQL-compatible Date should produce a Date object where converting 
 * back to Unix epoch yields the original value.
 * 
 * @param sqliteEpoch - Unix timestamp in seconds (SQLite integer timestamp)
 * @returns Date object for PostgreSQL TIMESTAMP
 */
export function transformTimestamp(sqliteEpoch: number): Date {
    // SQLite stores timestamps as seconds since Unix epoch
    // JavaScript Date uses milliseconds
    return new Date(sqliteEpoch * 1000);
}

/**
 * Converts a Date back to Unix epoch seconds.
 * Used for round-trip testing of timestamp transformation.
 * 
 * @param date - JavaScript Date object
 * @returns Unix timestamp in seconds
 */
export function dateToEpoch(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

/**
 * Transforms a SQLite integer boolean (0 or 1) to a native boolean.
 * 
 * **Feature: sqlite-to-neon-migration, Property 2: Boolean Transformation Correctness**
 * For any SQLite boolean value (0 or 1), transforming it to a PostgreSQL-compatible 
 * boolean should produce `false` for 0 and `true` for 1, and this transformation 
 * should be idempotent when applied to already-boolean values.
 * 
 * @param sqliteInt - Integer value (0 or 1) from SQLite
 * @returns Native boolean for PostgreSQL BOOLEAN
 */
export function transformBoolean(sqliteInt: number | boolean): boolean {
    // Handle already-boolean values (idempotent)
    if (typeof sqliteInt === "boolean") {
        return sqliteInt;
    }
    // SQLite stores booleans as 0 (false) or 1 (true)
    return sqliteInt !== 0;
}

/**
 * Transforms a nullable SQLite timestamp to a nullable Date.
 * 
 * @param sqliteEpoch - Unix timestamp in seconds or null
 * @returns Date object or null
 */
export function transformNullableTimestamp(sqliteEpoch: number | null): Date | null {
    if (sqliteEpoch === null || sqliteEpoch === undefined) {
        return null;
    }
    return transformTimestamp(sqliteEpoch);
}

/**
 * Transforms a nullable SQLite boolean to a nullable native boolean.
 * 
 * @param sqliteInt - Integer value (0 or 1) or null from SQLite
 * @returns Native boolean or null
 */
export function transformNullableBoolean(sqliteInt: number | boolean | null): boolean | null {
    if (sqliteInt === null || sqliteInt === undefined) {
        return null;
    }
    return transformBoolean(sqliteInt);
}
