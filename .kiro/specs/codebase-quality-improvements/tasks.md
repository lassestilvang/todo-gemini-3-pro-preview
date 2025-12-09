# Implementation Plan

- [x] 1. Set up error handling infrastructure
  - [x] 1.1 Create ActionResult type and helper functions
    - Create `src/lib/action-result.ts` with Result type, ErrorCode enum, ActionError interface
    - Implement `success<T>()` and `failure<T>()` helper functions
    - Implement `withErrorHandling()` wrapper function
    - Add sensitive data sanitization for error logging
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Write property test for Result type validity
    - **Property 7: Result type validity**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 1.3 Write property test for error wrapper
    - **Property 8: Error wrapper always returns Result**
    - **Validates: Requirements 7.4**

  - [x] 1.4 Write property test for sensitive data sanitization
    - **Property 9: Error logging sanitizes sensitive data**
    - **Validates: Requirements 7.5**

- [x] 2. Migrate Server Actions to use error handling
  - [x] 2.1 Add custom error classes
    - Create ValidationError, AuthorizationError, DatabaseError classes
    - Add error code mapping for each error type
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Update task-related Server Actions
    - Wrap createTask, updateTask, deleteTask, toggleTaskCompletion with error handling
    - Add validation for required fields
    - Return ActionResult instead of throwing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.3 Update list and label Server Actions
    - Wrap createList, updateList, deleteList, createLabel, updateLabel, deleteLabel
    - Add authorization checks returning proper error codes
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 2.4 Write property test for database error handling
    - **Property 1: Database error returns structured error response**
    - **Validates: Requirements 1.1**

  - [x] 2.5 Write property test for validation error handling
    - **Property 2: Validation error returns field-level details**
    - **Validates: Requirements 1.2**

  - [x] 2.6 Write property test for authorization error handling
    - **Property 3: Authorization error returns 403 without internal details**
    - **Validates: Requirements 1.3**

  - [x] 2.7 Write property test for success response
    - **Property 4: Success response contains result data**
    - **Validates: Requirements 1.4**

  - [x] 2.8 Write property test for unexpected error handling
    - **Property 5: Unexpected errors return generic response**
    - **Validates: Requirements 1.5**

- [x] 3. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update UI components for error handling
  - [x] 4.1 Create error handling hooks for components
    - Create `useActionResult` hook for handling ActionResult responses
    - Integrate with toast notifications for error display
    - Add retry logic for network errors
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.2 Update TaskDialog error handling
    - Handle createTask and updateTask ActionResult responses
    - Display field-level validation errors
    - Preserve user input on failure
    - _Requirements: 6.1, 6.2_

  - [x] 4.3 Update authentication error handling
    - Redirect to login on UNAUTHORIZED errors
    - Display session expired message
    - _Requirements: 6.4_

  - [x] 4.4 Write property test for UI error toast display
    - **Property 10: UI displays error toast on task creation failure**
    - **Validates: Requirements 6.1**

  - [x] 4.5 Write property test for input preservation on failure
    - **Property 11: UI preserves input on task update failure**
    - **Validates: Requirements 6.2**

- [x] 5. Fix CI test flakiness
  - [x] 5.1 Audit and fix test isolation issues
    - Review tests that share state between files
    - Add proper beforeEach/afterEach cleanup
    - Ensure mocks are reset between tests
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Fix async test race conditions
    - Add proper await statements for async operations
    - Use waitFor utilities where needed
    - _Requirements: 3.3_

  - [x] 5.3 Configure property tests for CI reproducibility
    - Set fixed seed for fast-check in CI environment
    - Document skipped tests with reasons
    - _Requirements: 3.4, 3.5_

- [x] 6. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Improve test coverage
  - [x] 7.1 Add missing Server Action tests
    - Write tests for uncovered actions in actions.ts
    - Cover success and error paths
    - _Requirements: 4.1, 4.3_

  - [x] 7.2 Add missing utility function tests
    - Write tests for uncovered functions in lib/
    - Cover edge cases
    - _Requirements: 4.1, 4.4_

  - [x] 7.3 Add missing component tests
    - Write tests for components without test files
    - Focus on user interaction and rendering
    - _Requirements: 4.2_

  - [x] 7.4 Configure coverage reporting
    - Set up coverage thresholds (70% lib, 60% components)
    - Configure CI to report coverage without failing
    - _Requirements: 4.5_

- [x] 8. Set up E2E testing with Playwright
  - [x] 8.1 Install and configure Playwright
    - Add Playwright dependencies
    - Create playwright.config.ts with headless mode for CI
    - Set up test database isolation
    - _Requirements: 5.1, 5.6, 5.7_

  - [x] 8.2 Write task creation E2E test
    - Test creating a task with title, description, due date
    - Verify task appears in list
    - Verify XP is awarded
    - _Requirements: 5.2_

  - [x] 8.3 Write task completion E2E test
    - Test completing a task
    - Verify status change
    - Verify XP and streak updates
    - _Requirements: 5.3_

  - [x] 8.4 Write authentication E2E test
    - Test login flow
    - Test accessing protected routes
    - Test logout flow
    - _Requirements: 5.4_

  - [x] 8.5 Write list and label management E2E tests
    - Test creating and deleting lists
    - Test creating and applying labels
    - Test filtering by label
    - _Requirements: 5.5_

- [x] 9. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
