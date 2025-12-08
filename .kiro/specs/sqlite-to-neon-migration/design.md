# Design Document: SQLite to Neon PostgreSQL Migration

## Overview

This design document outlines the technical approach for migrating the Todo Gemini application from SQLite to Neon PostgreSQL. The migration involves creating a new Neon project, converting the Drizzle ORM schema from SQLite to PostgreSQL dialect, implementing a data migration strategy, setting up automatic database branching via GitHub Actions, and updating the application's database connection layer.

The migration preserves all existing functionality while gaining the benefits of Neon's serverless PostgreSQL: database branching for isolated development environments, autoscaling, and scale-to-zero for cost efficiency.

## Architecture

### Current Architecture (SQLite)

```mermaid
graph TB
    subgraph "Application"
        A[Next.js App] --> B[Drizzle ORM]
        B --> C[better-sqlite3 / bun:sqlite]
        C --> D[(sqlite.db file)]
    end
```

### Target Architecture (Neon PostgreSQL)

```mermaid
graph TB
    subgraph "Application"
        A[Next.js App] --> B[Drizzle ORM]
        B --> C[@neondatabase/serverless]
    end
    
    subgraph "Neon Cloud"
        C --> D{Branch Router}
        D --> E[(main branch)]
        D --> F[(feature-x branch)]
        D --> G[(feature-y branch)]
    end
    
    subgraph "GitHub Actions"
        H[Push Event] --> I[Create Branch Action]
        J[PR Merge/Delete] --> K[Delete Branch Action]
        I --> D
        K --> D
    end
```

### Environment-Based Connection Flow

```mermaid
flowchart TD
    A[Application Start] --> B{Check Environment}
    B -->|Production| C[Use DATABASE_URL]
    B -->|Preview/Branch| D[Use DATABASE_URL from Vercel/GitHub]
    B -->|Test| E[Use Test Database Branch]
    B -->|Local Dev| F[Use DATABASE_URL from .env.local]
    C --> G[Connect to main branch]
    D --> H[Connect to feature branch]
    E --> I[Connect to test branch]
    F --> J[Connect to configured branch]
```

## Components and Interfaces

### 1. Database Schema (src/db/schema.ts)

The schema will be converted from SQLite to PostgreSQL dialect:

**Key Changes:**
- Import from `drizzle-orm/pg-core` instead of `drizzle-orm/sqlite-core`
- Replace `integer` with `serial` for auto-increment primary keys
- Replace `integer("...", { mode: "timestamp" })` with `timestamp("...")` 
- Replace `integer("...", { mode: "boolean" })` with `boolean("...")`
- Replace `text("...", { enum: [...] })` with `text("...")` (PostgreSQL text works fine for enums)
- Update `sql` template literals for PostgreSQL syntax (e.g., `NOW()` instead of `unixepoch()`)

**Tables to Convert:**
1. `lists` - Task lists
2. `tasks` - Main tasks table with all fields
3. `labels` - Task labels/tags
4. `taskLabels` - Many-to-many junction table
5. `reminders` - Task reminders
6. `taskLogs` - Activity log
7. `habitCompletions` - Habit tracking
8. `taskDependencies` - Task blocking relationships
9. `templates` - Task templates
10. `userStats` - XP, level, streaks (singleton)
11. `achievements` - Achievement definitions
12. `userAchievements` - Unlocked achievements
13. `viewSettings` - View configuration per page

### 2. Database Connection (src/db/index.ts)

**Interface:**
```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Test Environment:**
For tests, we'll use a dedicated test branch or mock the database connection.

### 3. Drizzle Configuration (drizzle.config.ts)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
```

### 4. GitHub Actions Workflow

**Branch Creation (.github/workflows/neon-branch-create.yml):**
- Triggers on: `push` to non-main branches
- Creates a Neon branch with the same name as the Git branch
- Outputs the branch connection string

**Branch Deletion (.github/workflows/neon-branch-delete.yml):**
- Triggers on: `delete` event or PR merge
- Deletes the corresponding Neon branch

### 5. Data Migration Script (scripts/migrate-data.ts)

A one-time migration script that:
1. Connects to SQLite database
2. Reads all data from each table
3. Transforms data types (timestamps, booleans)
4. Inserts into PostgreSQL via Neon connection
5. Verifies record counts match

## Data Models

### Schema Type Mapping (SQLite → PostgreSQL)

| SQLite Type | PostgreSQL Type | Notes |
|-------------|-----------------|-------|
| `integer().primaryKey({ autoIncrement: true })` | `serial().primaryKey()` | Auto-increment |
| `integer("...", { mode: "timestamp" })` | `timestamp("...")` | Native timestamp |
| `integer("...", { mode: "boolean" })` | `boolean("...")` | Native boolean |
| `text("...", { enum: [...] })` | `text("...")` | Keep as text |
| `sql\`(unixepoch())\`` | `sql\`NOW()\`` | Default timestamp |

### Data Transformation Rules

1. **Timestamps**: SQLite stores as Unix epoch integers → PostgreSQL uses native TIMESTAMP
   - Transform: `new Date(sqliteTimestamp * 1000)` for seconds-based epochs
   
2. **Booleans**: SQLite stores as 0/1 integers → PostgreSQL uses native BOOLEAN
   - Transform: `!!sqliteValue`

3. **Foreign Keys**: Preserved as-is (integer IDs remain integers)

4. **Indexes**: Recreated with PostgreSQL syntax



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following testable properties have been identified. Many requirements in this migration are configuration or infrastructure-related (CI/CD, schema files, documentation) and are not amenable to property-based testing. The testable properties focus on the data migration logic.

### Property 1: Timestamp Transformation Correctness

*For any* valid SQLite timestamp (Unix epoch integer), transforming it to a PostgreSQL-compatible Date should produce a Date object where converting back to Unix epoch yields the original value.

**Validates: Requirements 1.5.2**

### Property 2: Boolean Transformation Correctness

*For any* SQLite boolean value (0 or 1), transforming it to a PostgreSQL-compatible boolean should produce `false` for 0 and `true` for 1, and this transformation should be idempotent when applied to already-boolean values.

**Validates: Requirements 1.5.2**

### Property 3: Data Migration Record Count Preservation

*For any* table in the SQLite database, after migration, the record count in the PostgreSQL database should equal the record count in the source SQLite database.

**Validates: Requirements 1.5.1, 1.5.4**

### Property 4: Data Migration Relationship Preservation

*For any* foreign key relationship in the source data, the same relationship should exist in the migrated data (i.e., if task X references list Y in SQLite, task X should reference list Y in PostgreSQL).

**Validates: Requirements 1.5.3**

## Error Handling

### Database Connection Errors

1. **Missing DATABASE_URL**: Application should fail fast with a clear error message if `DATABASE_URL` is not set
2. **Invalid Connection String**: Drizzle/Neon driver will throw connection errors; these should be logged with context
3. **Network Timeouts**: Neon serverless driver handles retries; configure appropriate timeout values

### Migration Errors

1. **Data Type Conversion Failures**: Log the specific record and field that failed conversion
2. **Foreign Key Violations**: Migrate tables in dependency order (lists before tasks, tasks before taskLabels, etc.)
3. **Duplicate Key Errors**: Handle gracefully for idempotent re-runs of migration

### GitHub Actions Errors

1. **Branch Creation Failure**: Log error, do not block PR; developers can manually create branch
2. **Branch Deletion Failure**: Log warning; orphaned branches can be cleaned up manually
3. **API Rate Limits**: Implement exponential backoff in GitHub Actions

## Testing Strategy

### Dual Testing Approach

This migration requires both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property-based tests**: Verify universal properties of data transformation functions

### Property-Based Testing

**Library**: `fast-check` (already in devDependencies)

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Annotation Format**: Each property-based test must be tagged with:
`**Feature: sqlite-to-neon-migration, Property {number}: {property_text}**`

### Test Categories

#### 1. Data Transformation Tests (Property-Based)

Test the transformation functions that convert SQLite data types to PostgreSQL:

```typescript
// Property 1: Timestamp round-trip
fc.assert(
  fc.property(fc.integer({ min: 0, max: 2147483647 }), (unixTimestamp) => {
    const date = transformTimestamp(unixTimestamp);
    const backToUnix = Math.floor(date.getTime() / 1000);
    return backToUnix === unixTimestamp;
  })
);

// Property 2: Boolean transformation
fc.assert(
  fc.property(fc.integer({ min: 0, max: 1 }), (sqliteBool) => {
    const pgBool = transformBoolean(sqliteBool);
    return (sqliteBool === 0 && pgBool === false) || 
           (sqliteBool === 1 && pgBool === true);
  })
);
```

#### 2. Schema Compatibility Tests (Unit Tests)

- Verify all table exports exist in the new schema
- Verify column types are correct for PostgreSQL
- Verify indexes are defined

#### 3. Integration Tests (Example-Based)

- Test database connection with valid credentials
- Test CRUD operations work with new schema
- Run existing test suite to verify backward compatibility

### Test Environment

For tests, we have two options:

1. **Dedicated Test Branch**: Create a `test` branch in Neon that gets reset before each test run
2. **Mock Database**: Use Drizzle's mock capabilities for unit tests

Recommended approach: Use mocks for unit tests, dedicated test branch for integration tests.

## Implementation Notes

### Migration Order

Tables must be migrated in dependency order to satisfy foreign key constraints:

1. `lists` (no dependencies)
2. `labels` (no dependencies)
3. `achievements` (no dependencies)
4. `tasks` (depends on lists)
5. `taskLabels` (depends on tasks, labels)
6. `reminders` (depends on tasks)
7. `taskLogs` (depends on tasks)
8. `habitCompletions` (depends on tasks)
9. `taskDependencies` (depends on tasks)
10. `templates` (no dependencies)
11. `userStats` (no dependencies)
12. `userAchievements` (depends on achievements)
13. `viewSettings` (no dependencies)

### Environment Variables

```bash
# .env.local (development)
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require

# .env.example (template)
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# GitHub Secrets (for Actions)
NEON_API_KEY=neon_api_key_here
NEON_PROJECT_ID=project_id_here
```

### Package Changes

**Add:**
- `@neondatabase/serverless` - Neon's serverless PostgreSQL driver
- `pg` - PostgreSQL client (peer dependency)

**Remove:**
- `better-sqlite3` - No longer needed
- `@types/better-sqlite3` - No longer needed

### Vercel Integration (Optional)

If deploying to Vercel, the Neon integration can automatically:
- Set `DATABASE_URL` for production
- Create preview branches for PR deployments
- This may replace or complement the GitHub Actions approach
