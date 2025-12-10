# Requirements Document

## Introduction

This document specifies the requirements for refactoring the monolithic `src/lib/actions.ts` file (1652 lines) into domain-specific modules and ensuring consistent ActionResult pattern usage across all Server Actions. The refactoring aims to improve code maintainability, reduce cognitive load, and provide a consistent error handling experience throughout the application.

## Glossary

- **Server Action**: A Next.js server-side function marked with "use server" that handles database operations and mutations
- **ActionResult**: A discriminated union type that represents either a success with data or a failure with an ActionError
- **Domain Module**: A focused module containing Server Actions for a specific business domain (e.g., tasks, lists, labels)
- **Safe Action**: A Server Action that returns ActionResult instead of throwing exceptions or returning raw data
- **Barrel Export**: An index.ts file that re-exports functions from multiple modules for convenient importing

## Requirements

### Requirement 1

**User Story:** As a developer, I want Server Actions organized into domain-specific modules, so that I can easily find and maintain related functionality.

#### Acceptance Criteria

1. WHEN organizing Server Actions THEN the System SHALL create separate modules for tasks, lists, labels, reminders, dependencies, templates, gamification, logs, and view-settings domains
2. WHEN creating domain modules THEN each module SHALL contain only Server Actions related to that specific domain
3. WHEN creating domain modules THEN each module SHALL include the "use server" directive at the top
4. WHEN splitting the actions file THEN the System SHALL maintain all existing function signatures and return types
5. WHEN splitting the actions file THEN the System SHALL create a barrel export file that re-exports all functions for backward compatibility

### Requirement 2

**User Story:** As a developer, I want all Server Actions to use the ActionResult pattern consistently, so that error handling is predictable across the codebase.

#### Acceptance Criteria

1. WHEN a Server Action performs a mutation (create, update, delete) THEN the Server Action SHALL return an ActionResult type
2. WHEN a Server Action performs a query (get, list, search) THEN the Server Action SHALL return an ActionResult type for operations that can fail due to authorization
3. WHEN migrating existing actions THEN the System SHALL replace duplicate "Safe" versions with properly wrapped original functions
4. WHEN an action returns ActionResult THEN the action SHALL use the success() and failure() helper functions from action-result.ts
5. WHEN an action encounters an error THEN the action SHALL return an appropriate error code (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, DATABASE_ERROR, UNKNOWN_ERROR)

### Requirement 3

**User Story:** As a developer, I want to import Server Actions from a single location, so that I don't need to update imports throughout the codebase.

#### Acceptance Criteria

1. WHEN creating the barrel export THEN the System SHALL export all Server Actions from `src/lib/actions/index.ts`
2. WHEN creating the barrel export THEN the System SHALL maintain the same export names as the original actions.ts
3. WHEN updating imports THEN the System SHALL ensure all existing imports from `@/lib/actions` continue to work
4. WHEN a consumer imports from actions THEN the consumer SHALL be able to import any Server Action without knowing its domain module

### Requirement 4

**User Story:** As a developer, I want clear documentation for each domain module, so that I understand the module's purpose and available functions.

#### Acceptance Criteria

1. WHEN creating a domain module THEN the module SHALL include a JSDoc comment describing its purpose
2. WHEN a function is exported THEN the function SHALL have a JSDoc comment describing its parameters and return type
3. WHEN a function uses ActionResult THEN the JSDoc SHALL document possible error codes that can be returned

### Requirement 5

**User Story:** As a developer, I want the refactoring to not break existing tests, so that I can verify the refactoring is correct.

#### Acceptance Criteria

1. WHEN refactoring is complete THEN all existing unit tests SHALL pass without modification
2. WHEN refactoring is complete THEN all existing E2E tests SHALL pass without modification
3. WHEN refactoring is complete THEN the CI pipeline SHALL pass all checks
4. WHEN a test imports from actions THEN the test SHALL continue to work with the new module structure

