# Implementation Plan

- [x] 1. Set up module structure and barrel export
  - [x] 1.1 Create actions directory and barrel export file
    - Create `src/lib/actions/` directory
    - Create `src/lib/actions/index.ts` with placeholder exports
    - Verify imports from `@/lib/actions` still work
    - _Requirements: 1.5, 3.1, 3.2_

  - [x] 1.2 Create shared utilities module
    - Create `src/lib/actions/shared.ts` for common imports and helpers
    - Export db, schema tables, drizzle operators, date-fns functions
    - Export action-result types and helpers
    - _Requirements: 1.2_

- [x] 2. Extract list and label modules (simplest domains first)
  - [x] 2.1 Create lists.ts module
    - Extract getLists, getList, createList, updateList, deleteList
    - Add "use server" directive
    - Wrap mutations with withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 2.2 Create labels.ts module
    - Extract getLabels, getLabel, createLabel, updateLabel, deleteLabel
    - Add "use server" directive
    - Wrap mutations with withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 2.3 Update barrel export for lists and labels
    - Add exports from lists.ts and labels.ts to index.ts
    - Remove list/label functions from original actions.ts
    - _Requirements: 3.1, 3.2_

  - [x]* 2.4 Write property test for mutation ActionResult
    - **Property 2: Mutation actions return ActionResult**
    - **Validates: Requirements 2.1, 2.4**

- [x] 3. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extract supporting domain modules
  - [x] 4.1 Create reminders.ts module
    - Extract getReminders, createReminder, deleteReminder
    - Add "use server" directive and withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 4.2 Create dependencies.ts module
    - Extract addDependency, removeDependency, getBlockers, getBlockedTasks
    - Add "use server" directive and withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 4.3 Create logs.ts module
    - Extract getTaskLogs, getActivityLog
    - Add "use server" directive
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

  - [x] 4.4 Create view-settings.ts module
    - Extract getViewSettings, saveViewSettings, resetViewSettings
    - Add "use server" directive and withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 4.5 Update barrel export for supporting modules
    - Add exports from reminders, dependencies, logs, view-settings to index.ts
    - Remove these functions from original actions.ts
    - _Requirements: 3.1, 3.2_

- [x] 5. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extract templates and gamification modules
  - [x] 6.1 Create templates.ts module
    - Extract getTemplates, createTemplate, deleteTemplate, instantiateTemplate
    - Add "use server" directive and withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 6.2 Create gamification.ts module
    - Extract getUserStats, addXP, updateStreak, checkAchievements, getAchievements, getUserAchievements
    - Add "use server" directive and withErrorHandling
    - Add JSDoc comments
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

  - [x] 6.3 Update barrel export for templates and gamification
    - Add exports from templates.ts and gamification.ts to index.ts
    - Remove these functions from original actions.ts
    - _Requirements: 3.1, 3.2_

- [x] 7. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extract tasks module (largest and most complex)
  - [x] 8.1 Create tasks.ts module
    - Extract getTasks, getTask, createTask, updateTask, deleteTask
    - Extract toggleTaskCompletion, updateStreak (move to gamification if needed)
    - Extract getSubtasks, createSubtask, updateSubtask, deleteSubtask
    - Extract searchTasks
    - Add "use server" directive
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

  - [x] 8.2 Wrap task mutations with withErrorHandling
    - Wrap createTask, updateTask, deleteTask, toggleTaskCompletion
    - Wrap createSubtask, updateSubtask, deleteSubtask
    - Remove duplicate "Safe" versions (createTaskSafe, updateTaskSafe, etc.)
    - Add JSDoc comments with error codes
    - _Requirements: 2.1, 2.3, 4.2, 4.3_

  - [x] 8.3 Update barrel export for tasks
    - Add exports from tasks.ts to index.ts
    - Remove task functions from original actions.ts
    - _Requirements: 3.1, 3.2_

  - [x]* 8.4 Write property test for error code validity
    - **Property 3: Error codes are valid**
    - **Validates: Requirements 2.5**

- [x] 9. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Finalize refactoring and cleanup
  - [x] 10.1 Remove original actions.ts file
    - Verify all functions have been migrated
    - actions.ts is now a re-export hub with Safe wrapper functions
    - Update any remaining direct imports
    - _Requirements: 1.4, 3.3_

  - [x] 10.2 Update test imports
    - Update src/lib/actions.test.ts to import from new location
    - Verify all test files use @/lib/actions import
    - _Requirements: 5.1, 5.4_

  - [x]* 10.3 Write property test for barrel export completeness
    - **Property 4: Barrel export completeness**
    - **Validates: Requirements 3.2, 3.3**

  - [x]* 10.4 Write property test for function signature preservation
    - **Property 1: Function signature preservation**
    - **Validates: Requirements 1.4**

- [x] 11. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

