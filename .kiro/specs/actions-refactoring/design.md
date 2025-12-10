# Design Document: Actions Refactoring

## Overview

This design document outlines the approach for refactoring the monolithic `src/lib/actions.ts` file (1652 lines) into domain-specific modules. The refactoring will:

1. Split the file into 9 domain modules (tasks, lists, labels, reminders, dependencies, templates, gamification, logs, view-settings)
2. Ensure consistent ActionResult pattern usage across all Server Actions
3. Maintain backward compatibility through a barrel export
4. Eliminate duplicate "Safe" function variants by using the `withErrorHandling` wrapper

## Architecture

### Module Structure

```
src/lib/actions/
├── index.ts              # Barrel export for backward compatibility
├── tasks.ts              # Task CRUD, subtasks, search, completion
├── lists.ts              # List CRUD operations
├── labels.ts             # Label CRUD operations
├── reminders.ts          # Reminder CRUD operations
├── dependencies.ts       # Task dependency management
├── templates.ts          # Template CRUD and instantiation
├── gamification.ts       # XP, streaks, achievements
├── logs.ts               # Activity and task logs
└── view-settings.ts      # View preferences per user
```

### Import Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Consumer Code                                │
│  import { createTask, getLists } from "@/lib/actions"           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  src/lib/actions/index.ts                        │
│  export * from "./tasks"                                         │
│  export * from "./lists"                                         │
│  export * from "./labels"                                        │
│  export * from "./reminders"                                     │
│  export * from "./dependencies"                                  │
│  export * from "./templates"                                     │
│  export * from "./gamification"                                  │
│  export * from "./logs"                                          │
│  export * from "./view-settings"                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ tasks.ts │   │ lists.ts │   │  ...     │
        └──────────┘   └──────────┘   └──────────┘
```

### ActionResult Pattern

All mutation operations will use the `withErrorHandling` wrapper from `action-result.ts`:

```typescript
// Before: Duplicate implementations
export async function createTask(data) { ... }
export async function createTaskSafe(data) { ... }  // Duplicate!

// After: Single implementation with wrapper
const createTaskImpl = async (data) => { ... };
export const createTask = withErrorHandling(createTaskImpl);
```

## Components and Interfaces

### Domain Module Template

Each domain module follows this structure:

```typescript
/**
 * @module actions/tasks
 * @description Server Actions for task management including CRUD operations,
 * subtasks, search, and completion handling.
 */
"use server";

import { db, tasks, taskLabels, ... } from "@/db";
import { eq, and, ... } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  success,
  failure,
  withErrorHandling,
  ValidationError,
  AuthorizationError,
  NotFoundError,
} from "../action-result";

// Internal implementation (not exported)
async function createTaskImpl(
  data: typeof tasks.$inferInsert & { labelIds?: number[] }
): Promise<typeof tasks.$inferSelect> {
  // Implementation...
}

/**
 * Creates a new task with optional labels
 * 
 * @param data - Task data including optional labelIds
 * @returns ActionResult with created task or error
 * @throws {VALIDATION_ERROR} When title is empty or too long
 * @throws {FORBIDDEN} When userId is missing
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const createTask = withErrorHandling(createTaskImpl);
```

### Function Distribution by Module

#### tasks.ts (~400 lines)
- `getTasks` - List tasks with filters
- `getTask` - Get single task with labels/reminders/blockers
- `createTask` - Create task with smart tagging
- `updateTask` - Update task with change logging
- `deleteTask` - Delete task
- `toggleTaskCompletion` - Complete/uncomplete with XP
- `getSubtasks` - List subtasks
- `createSubtask` - Create subtask
- `updateSubtask` - Update subtask completion
- `deleteSubtask` - Delete subtask
- `searchTasks` - Search by title/description

#### lists.ts (~80 lines)
- `getLists` - List all lists for user
- `getList` - Get single list
- `createList` - Create list
- `updateList` - Update list
- `deleteList` - Delete list

#### labels.ts (~80 lines)
- `getLabels` - List all labels for user
- `getLabel` - Get single label
- `createLabel` - Create label
- `updateLabel` - Update label
- `deleteLabel` - Delete label

#### reminders.ts (~50 lines)
- `getReminders` - List reminders for task
- `createReminder` - Create reminder
- `deleteReminder` - Delete reminder

#### dependencies.ts (~80 lines)
- `addDependency` - Add blocker relationship
- `removeDependency` - Remove blocker relationship
- `getBlockers` - Get tasks blocking this task
- `getBlockedTasks` - Get tasks blocked by this task

#### templates.ts (~100 lines)
- `getTemplates` - List templates
- `createTemplate` - Create template
- `deleteTemplate` - Delete template
- `instantiateTemplate` - Create tasks from template

#### gamification.ts (~150 lines)
- `getUserStats` - Get XP, level, streak
- `addXP` - Award XP to user
- `updateStreak` - Update daily streak
- `checkAchievements` - Check and unlock achievements
- `getAchievements` - List all achievements
- `getUserAchievements` - List user's unlocked achievements

#### logs.ts (~40 lines)
- `getTaskLogs` - Get logs for specific task
- `getActivityLog` - Get recent activity for user

#### view-settings.ts (~60 lines)
- `getViewSettings` - Get view preferences
- `saveViewSettings` - Save view preferences
- `resetViewSettings` - Reset to defaults

## Data Models

No changes to data models. The refactoring only reorganizes code without changing the database schema or types.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties will be verified:

### Property 1: Function signature preservation
*For any* Server Action that existed in the original actions.ts, calling it with the same arguments after refactoring SHALL produce the same result type and behavior.
**Validates: Requirements 1.4**

### Property 2: Mutation actions return ActionResult
*For any* Server Action that performs a mutation (create, update, delete), the return value SHALL be a valid ActionResult with either success=true and data, or success=false and an ActionError.
**Validates: Requirements 2.1, 2.4**

### Property 3: Error codes are valid
*For any* Server Action that returns a failure ActionResult, the error code SHALL be one of: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, DATABASE_ERROR, NETWORK_ERROR, or UNKNOWN_ERROR.
**Validates: Requirements 2.5**

### Property 4: Barrel export completeness
*For any* function that was exported from the original actions.ts, that function SHALL be importable from `@/lib/actions` after refactoring.
**Validates: Requirements 3.2, 3.3**

## Error Handling

All Server Actions will use the existing `withErrorHandling` wrapper from `action-result.ts`. The wrapper:

1. Catches all exceptions
2. Maps known error types (ValidationError, AuthorizationError, NotFoundError, DatabaseError) to appropriate error codes
3. Sanitizes error messages to remove sensitive data
4. Returns a generic UNKNOWN_ERROR for unexpected exceptions

### Error Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Server Action                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 withErrorHandling(fn)                        ││
│  │                                                              ││
│  │  try {                                                       ││
│  │    const result = await fn(...args);                         ││
│  │    return success(result);                                   ││
│  │  } catch (error) {                                           ││
│  │    if (error instanceof ValidationError)                     ││
│  │      return failure({ code: "VALIDATION_ERROR", ... });      ││
│  │    if (error instanceof AuthorizationError)                  ││
│  │      return failure({ code: "FORBIDDEN", ... });             ││
│  │    if (error instanceof NotFoundError)                       ││
│  │      return failure({ code: "NOT_FOUND", ... });             ││
│  │    if (error instanceof DatabaseError)                       ││
│  │      return failure({ code: "DATABASE_ERROR", ... });        ││
│  │    return failure({ code: "UNKNOWN_ERROR", ... });           ││
│  │  }                                                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Dual Testing Approach

This refactoring uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples and edge cases for each domain module
- **Property-based tests**: Verify universal properties that should hold across all Server Actions

### Property-Based Testing Framework

The project uses **fast-check** for property-based testing with Bun's test runner.

```typescript
import { test, expect } from "bun:test";
import * as fc from "fast-check";

// Property tests configured for 100 iterations minimum
// Fixed seed in CI for reproducibility (FAST_CHECK_SEED=12345)
```

### Unit Testing Requirements

Unit tests will verify:
- Each domain module exports the expected functions
- Functions return correct ActionResult structure
- Error cases return appropriate error codes
- Existing test coverage is maintained

### Property-Based Testing Requirements

Each property-based test MUST:
- Be tagged with: `**Feature: actions-refactoring, Property {number}: {property_text}**`
- Run a minimum of 100 iterations
- Use a fixed seed in CI for reproducibility
- Test a single correctness property

### Test File Organization

```
src/lib/actions/
├── __tests__/
│   ├── tasks.test.ts
│   ├── lists.test.ts
│   ├── labels.test.ts
│   └── ...
src/test/properties/
├── actions-refactoring.property.test.ts
```

### Migration Testing Strategy

1. **Before refactoring**: Capture current test results as baseline
2. **During refactoring**: Run tests after each module extraction
3. **After refactoring**: Verify all tests pass, no regressions

### Coverage Thresholds

Maintain existing coverage thresholds:
- `src/lib/`: 70% line coverage minimum
- Coverage reports generated but do not fail the build

