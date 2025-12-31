# Implementation Plan: Template Form Interface

## Overview

This plan implements a form-based interface for creating and editing task templates, replacing the current JSON-based approach. The implementation follows the existing codebase patterns using React components with shadcn/ui primitives and server actions.

## Tasks

- [x] 1. Create template form utility functions
  - [x] 1.1 Create `src/lib/template-form-utils.ts` with TypeScript interfaces
    - Define `TemplateFormData`, `SubtaskFormData`, `ValidationErrors`, `TemplateContent` interfaces
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7_
  - [x] 1.2 Implement `serializeFormToJson` function
    - Convert form data to JSON string for database storage
    - Handle due date type conversion to variables ({date}, {tomorrow}, {next_week})
    - Include subtasks in output
    - _Requirements: 1.3, 2.6, 4.2_
  - [x] 1.3 Implement `deserializeJsonToForm` function
    - Parse JSON content and populate form data structure
    - Handle variable placeholders in due date
    - Return null for malformed JSON
    - _Requirements: 3.2, 3.4_
  - [x] 1.4 Implement `validateTemplateForm` function
    - Validate template name is not empty
    - Validate task title is not empty
    - Return ValidationErrors object
    - _Requirements: 1.2, 6.1, 6.2_
  - [x] 1.5 Write property test for serialization round-trip
    - **Property 1: Serialization Round-Trip**
    - **Validates: Requirements 1.3, 2.6, 3.2, 4.2**
  - [x] 1.6 Write property test for name validation
    - **Property 2: Name Validation**
    - **Validates: Requirements 1.2, 6.1**
  - [x] 1.7 Write property test for title validation
    - **Property 3: Title Validation**
    - **Validates: Requirements 6.2**

- [x] 2. Add updateTemplate server action
  - [x] 2.1 Add `updateTemplate` function to `src/lib/actions/templates.ts`
    - Update template name and content by ID
    - Validate user ownership
    - Use `withErrorHandling` wrapper
    - _Requirements: 3.3_
  - [x] 2.2 Write unit test for updateTemplate action
    - Test successful update
    - Test validation errors
    - _Requirements: 3.3_

- [x] 3. Checkpoint - Ensure utility functions and server action work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create SubtaskForm component
  - [x] 4.1 Create `src/components/tasks/SubtaskForm.tsx`
    - Display list of subtask entries with title and description inputs
    - Add "Add Subtask" button
    - Add delete button for each subtask
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 4.2 Write unit tests for SubtaskForm
    - Test add subtask functionality
    - Test remove subtask functionality
    - Test update subtask fields
    - _Requirements: 2.2, 2.4_

- [x] 5. Create TemplatePreview component
  - [x] 5.1 Create `src/components/tasks/TemplatePreview.tsx`
    - Display task title, description, priority, due date, energy, context
    - Display subtasks nested under main task
    - Show variables as-is without substitution
    - _Requirements: 5.1, 5.3, 5.4, 4.3_
  - [x] 5.2 Write unit tests for TemplatePreview
    - Test displays all form properties
    - Test displays subtasks
    - Test preserves variable syntax
    - _Requirements: 5.3, 5.4, 4.3_

- [x] 6. Create TemplateFormDialog component
  - [x] 6.1 Create `src/components/tasks/TemplateFormDialog.tsx`
    - Form fields: name, title, description, priority dropdown, due date dropdown, energy dropdown, context dropdown, estimate
    - Integrate SubtaskForm component
    - Integrate TemplatePreview component
    - Display variable helper text near text fields
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 4.1, 5.2_
  - [x] 6.2 Implement form validation and error display
    - Highlight invalid fields with red border
    - Display error messages adjacent to fields
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 6.3 Implement create mode
    - Initialize empty form
    - Call createTemplate on submit
    - _Requirements: 1.3_
  - [x] 6.4 Implement edit mode
    - Pre-populate form from existing template
    - Handle malformed JSON with error message
    - Call updateTemplate on submit
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.5 Write unit tests for TemplateFormDialog
    - Test renders all form fields
    - Test validation error display
    - Test create mode submission
    - Test edit mode pre-population
    - _Requirements: 1.1, 3.1, 6.3, 6.4_

- [-] 7. Update TemplateManager to use new form dialog
  - [x] 7.1 Update `src/components/tasks/TemplateManager.tsx`
    - Replace JSON textarea with TemplateFormDialog
    - Add edit button to template list items
    - Pass template data to dialog for editing
    - _Requirements: 3.1_
  - [ ] 7.2 Write unit tests for updated TemplateManager
    - Test opens create dialog
    - Test opens edit dialog with template data
    - _Requirements: 3.1_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
