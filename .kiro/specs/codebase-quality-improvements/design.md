# Design Document: Codebase Quality Improvements

## Overview

This design document outlines the architecture and implementation approach for improving the Todo Gemini codebase quality. The improvements span five key areas:

1. **Error Handling**: Implementing a consistent Result type pattern for Server Actions
2. **Component Architecture**: Guidelines and patterns for decomposing large components
3. **Test Reliability**: Fixing CI test flakiness through proper isolation and mocking
4. **Test Coverage**: Achieving industry-standard coverage with focused testing
5. **E2E Testing**: Implementing Playwright for critical user flow verification

## Architecture

### Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Component   │───▶│ Server      │───▶│ Toast/Error Display │ │
│  │ (calls      │    │ Action      │    │ (shows user         │ │
│  │  action)    │◀───│ Response    │◀───│  feedback)          │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server Actions Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    withErrorHandling()                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ Validation   │  │ Authorization│  │ Database         │  ││
│  │  │ Errors       │  │ Errors       │  │ Errors           │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  │                           │                                  ││
│  │                           ▼                                  ││
│  │              ┌─────────────────────────┐                    ││
│  │              │ Result<T, E>            │                    ││
│  │              │ - success: true | false │                    ││
│  │              │ - data?: T              │                    ││
│  │              │ - error?: ActionError   │                    ││
│  │              └─────────────────────────┘                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                              │
│                                                                  │
│                         ┌───────┐                               │
│                         │ E2E   │  Playwright (critical flows)  │
│                         │ Tests │  ~5-10 tests                  │
│                       ┌─┴───────┴─┐                             │
│                       │Integration│  Task flows, auth flows     │
│                       │  Tests    │  ~10-20 tests               │
│                     ┌─┴───────────┴─┐                           │
│                     │  Unit Tests   │  Actions, utils, hooks    │
│                     │               │  ~100+ tests              │
│                   ┌─┴───────────────┴─┐                         │
│                   │  Property Tests   │  Invariants, round-trips│
│                   │                   │  ~20-30 properties      │
│                   └───────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Error Handling Types

```typescript
// src/lib/action-result.ts

/**
 * Error codes for categorizing Server Action failures
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Structured error response from Server Actions
 */
export interface ActionError {
  code: ErrorCode;
  message: string;
  field?: string;  // For validation errors
  details?: Record<string, string>;  // Field-level errors
}

/**
 * Result type for Server Actions - either success with data or failure with error
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

/**
 * Helper to create a success result
 */
export function success<T>(data: T): ActionResult<T>;

/**
 * Helper to create an error result
 */
export function failure<T>(error: ActionError): ActionResult<T>;

/**
 * Wrapper for Server Actions that handles try-catch and returns Result type
 */
export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ActionResult<T>>;
```

### Component Decomposition Patterns

For large components like TaskDialog, the decomposition follows this pattern:

```typescript
// Container Component (handles state and logic)
// src/components/tasks/TaskDialog.tsx
export function TaskDialog(props: TaskDialogProps) {
  // Delegates to hooks for state management
  // Renders presentation components
}

// Custom Hooks (encapsulate reusable logic)
// src/components/tasks/hooks/useTaskForm.ts
export function useTaskForm(options: TaskFormOptions) {
  // Form state, validation, submission logic
}

// src/components/tasks/hooks/useTaskData.ts
export function useTaskData(options: TaskDataOptions) {
  // Data fetching, subtasks, reminders, dependencies
}

// Presentation Components (pure rendering)
// src/components/tasks/task-dialog/TaskDetailsTab.tsx
// src/components/tasks/task-dialog/TaskDependenciesTab.tsx
// src/components/tasks/task-dialog/TaskActivityTab.tsx
```

### E2E Test Structure

```typescript
// e2e/task-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login, navigate to inbox
  });

  test('should create a task with all fields', async ({ page }) => {
    // Test implementation
  });
});
```

## Data Models

### ActionResult Type Definition

```typescript
// The Result type is a discriminated union
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

// Usage in Server Actions:
export async function createTask(
  data: TaskInput
): Promise<ActionResult<Task>> {
  // Returns either success with task or failure with error
}
```

### Error Response Structure

```typescript
// Validation error example
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid task data",
    details: {
      title: "Title is required",
      dueDate: "Due date must be in the future"
    }
  }
}

// Authorization error example
{
  success: false,
  error: {
    code: "FORBIDDEN",
    message: "You do not have permission to access this resource"
  }
}

// Database error example
{
  success: false,
  error: {
    code: "DATABASE_ERROR",
    message: "Unable to save task. Please try again."
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties will be verified through property-based testing:

### Property 1: Database error returns structured error response
*For any* Server Action that encounters a database error, the returned response SHALL be a valid ActionResult with success=false, an error code of "DATABASE_ERROR", and a non-empty user-friendly message.
**Validates: Requirements 1.1**

### Property 2: Validation error returns field-level details
*For any* Server Action receiving invalid input data, the returned response SHALL be a valid ActionResult with success=false, an error code of "VALIDATION_ERROR", and a details object containing field-specific error messages.
**Validates: Requirements 1.2**

### Property 3: Authorization error returns 403 without internal details
*For any* Server Action called with an invalid or missing userId, the returned response SHALL be a valid ActionResult with success=false, an error code of "FORBIDDEN" or "UNAUTHORIZED", and a message that does not contain stack traces, database queries, or internal identifiers.
**Validates: Requirements 1.3**

### Property 4: Success response contains result data
*For any* Server Action that completes successfully, the returned response SHALL be a valid ActionResult with success=true and a data field containing the operation result.
**Validates: Requirements 1.4**

### Property 5: Unexpected errors return generic response
*For any* Server Action that throws an unexpected error, the returned response SHALL be a valid ActionResult with success=false, an error code of "UNKNOWN_ERROR", and a generic message that does not expose internal error details.
**Validates: Requirements 1.5**

### Property 6: Component refactoring preserves behavior
*For any* valid props passed to a refactored component, the rendered output SHALL be functionally equivalent to the original component's output for the same props.
**Validates: Requirements 2.4**

### Property 7: Result type validity
*For any* call to the success() or failure() helper functions, the returned value SHALL be a valid ActionResult that is either a success variant with data or an error variant with an ActionError, never both or neither.
**Validates: Requirements 7.1, 7.2**

### Property 8: Error wrapper always returns Result
*For any* function wrapped with withErrorHandling(), regardless of whether the wrapped function throws or returns normally, the wrapper SHALL always return a valid ActionResult.
**Validates: Requirements 7.4**

### Property 9: Error logging sanitizes sensitive data
*For any* error containing sensitive patterns (passwords, tokens, API keys, connection strings), the logged output SHALL not contain those sensitive values.
**Validates: Requirements 7.5**

### Property 10: UI displays error toast on task creation failure
*For any* task creation that fails, the UI SHALL display a toast notification containing a non-empty error message.
**Validates: Requirements 6.1**

### Property 11: UI preserves input on task update failure
*For any* task update that fails, the UI SHALL preserve the user's input values in the form fields.
**Validates: Requirements 6.2**

## Error Handling

### Server Action Error Handling Pattern

```typescript
// src/lib/action-result.ts

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /secret/i,
  /credential/i,
  /connection[_-]?string/i,
];

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  let sanitized = message;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return sanitized;
}

export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      const result = await fn(...args);
      return success(result);
    } catch (error) {
      // Log sanitized error for debugging
      console.error('[Server Action Error]', sanitizeError(error));
      
      // Return generic error to client
      if (error instanceof ValidationError) {
        return failure({
          code: "VALIDATION_ERROR",
          message: error.message,
          details: error.fieldErrors,
        });
      }
      
      if (error instanceof AuthorizationError) {
        return failure({
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        });
      }
      
      if (error instanceof DatabaseError) {
        return failure({
          code: "DATABASE_ERROR",
          message: "Unable to complete the operation. Please try again.",
        });
      }
      
      return failure({
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  };
}
```

### Client-Side Error Handling

```typescript
// In React components
import { toast } from "sonner";

async function handleCreateTask(data: TaskInput) {
  const result = await createTask(data);
  
  if (!result.success) {
    toast.error(result.error.message);
    
    if (result.error.code === "VALIDATION_ERROR" && result.error.details) {
      // Set field-level errors in form state
      setFieldErrors(result.error.details);
    }
    
    if (result.error.code === "UNAUTHORIZED") {
      // Redirect to login
      router.push("/login?message=session_expired");
    }
    
    return;
  }
  
  toast.success("Task created successfully");
  // Handle success...
}
```

## Testing Strategy

### Dual Testing Approach

This implementation uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property-based tests**: Verify universal properties that should hold across all inputs

### Property-Based Testing Framework

The project will use **fast-check** for property-based testing, which integrates well with Bun's test runner.

```typescript
import { test, expect } from "bun:test";
import * as fc from "fast-check";

// Property tests will be configured to run 100 iterations minimum
// and use a fixed seed in CI for reproducibility
```

### Unit Testing Requirements

Unit tests will cover:
- Server Action success and error paths
- Utility function edge cases
- Component rendering with various props
- Hook behavior with different inputs

### Property-Based Testing Requirements

Each property-based test MUST:
- Be tagged with a comment referencing the correctness property: `**Feature: codebase-quality-improvements, Property {number}: {property_text}**`
- Run a minimum of 100 iterations
- Use a fixed seed in CI for reproducibility
- Test a single correctness property

### E2E Testing with Playwright

E2E tests will cover critical user flows:

1. **Task Creation Flow**: Create task → verify in list → verify XP awarded
2. **Task Completion Flow**: Complete task → verify status → verify XP/streak
3. **Authentication Flow**: Login → access protected route → logout
4. **List Management Flow**: Create list → add task to list → delete list
5. **Label Management Flow**: Create label → apply to task → filter by label

### Test File Organization

```
src/
├── lib/
│   ├── actions.ts
│   ├── actions.test.ts           # Unit tests
│   ├── action-result.ts
│   └── action-result.test.ts     # Unit + property tests
├── test/
│   ├── properties/
│   │   ├── error-handling.property.test.ts
│   │   └── result-type.property.test.ts
│   └── setup.ts
e2e/
├── task-creation.spec.ts
├── task-completion.spec.ts
├── authentication.spec.ts
├── list-management.spec.ts
└── label-management.spec.ts
```

### CI Test Configuration

```yaml
# Tests run with fixed seed for reproducibility
env:
  FAST_CHECK_SEED: "12345"
  
# Property tests use 100 iterations
# E2E tests run in headless mode
```

### Coverage Thresholds

- `src/lib/`: 70% line coverage minimum
- `src/components/`: 60% line coverage minimum
- Coverage reports generated but do not fail the build
