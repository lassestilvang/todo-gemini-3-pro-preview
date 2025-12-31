# Requirements Document

## Introduction

The Template System currently requires users to write JSON manually to create task templates. This creates a significant barrier for non-technical users who want to leverage templates for recurring task patterns. This feature replaces the JSON-based interface with an intuitive form-based interface that allows users to create, edit, and manage templates without any JSON knowledge.

## Glossary

- **Template**: A reusable task structure that can be instantiated to create new tasks with predefined properties
- **Template_Form**: The form-based interface for creating and editing templates
- **Subtask**: A child task nested under a parent task within a template
- **Variable**: A placeholder in template fields (e.g., `{date}`, `{tomorrow}`, `{next_week}`) that gets replaced with actual values during instantiation
- **Instantiation**: The process of creating actual tasks from a template

## Requirements

### Requirement 1: Form-Based Template Creation

**User Story:** As a user, I want to create templates using a form interface, so that I can define reusable task structures without writing JSON.

#### Acceptance Criteria

1. WHEN a user opens the create template dialog, THE Template_Form SHALL display input fields for template name, task title, description, priority, due date type, energy level, context, and estimated time
2. WHEN a user enters a template name and task details, THE Template_Form SHALL validate that the template name is not empty
3. WHEN a user submits a valid template form, THE Template_Form SHALL serialize the form data to JSON and save it to the database
4. THE Template_Form SHALL provide a dropdown for priority selection with options: none, low, medium, high
5. THE Template_Form SHALL provide a dropdown for due date type with options: none, today, tomorrow, next week, custom relative days
6. THE Template_Form SHALL provide a dropdown for energy level with options: none, low, medium, high
7. THE Template_Form SHALL provide a dropdown for context with options: none, computer, phone, errands, meeting, home, anywhere

### Requirement 2: Subtask Management in Templates

**User Story:** As a user, I want to add subtasks to my templates, so that I can create complex task structures with nested items.

#### Acceptance Criteria

1. THE Template_Form SHALL display an "Add Subtask" button below the main task fields
2. WHEN a user clicks "Add Subtask", THE Template_Form SHALL add a new subtask entry with title and description fields
3. WHEN a user has added subtasks, THE Template_Form SHALL display each subtask with a delete button
4. WHEN a user clicks the delete button on a subtask, THE Template_Form SHALL remove that subtask from the list
5. THE Template_Form SHALL support adding multiple subtasks to a single template
6. WHEN the template is saved, THE Template_Form SHALL include all subtasks in the serialized JSON content

### Requirement 3: Template Editing

**User Story:** As a user, I want to edit existing templates, so that I can modify template details without recreating them.

#### Acceptance Criteria

1. WHEN a user clicks an edit button on a template, THE Template_Form SHALL open with all existing template data pre-populated
2. WHEN editing a template, THE Template_Form SHALL parse the existing JSON content and populate form fields accordingly
3. WHEN a user saves an edited template, THE Template_Form SHALL update the template in the database
4. IF the template JSON content is malformed, THEN THE Template_Form SHALL display an error message and allow manual JSON editing as fallback

### Requirement 4: Variable Support in Form Fields

**User Story:** As a user, I want to use date variables in my templates, so that tasks created from templates have dynamic dates.

#### Acceptance Criteria

1. THE Template_Form SHALL display available variables ({date}, {tomorrow}, {next_week}) as helper text near text fields
2. WHEN a user types a variable placeholder in the title or description field, THE Template_Form SHALL preserve the variable syntax
3. WHEN displaying the template preview, THE Template_Form SHALL show variables as-is without substitution

### Requirement 5: Template Preview

**User Story:** As a user, I want to preview how my template will look when instantiated, so that I can verify the template structure before saving.

#### Acceptance Criteria

1. THE Template_Form SHALL display a live preview section showing the task structure
2. WHEN form fields are updated, THE Template_Form SHALL update the preview in real-time
3. THE preview SHALL display the main task with all configured properties
4. THE preview SHALL display all subtasks nested under the main task

### Requirement 6: Form Validation

**User Story:** As a user, I want clear validation feedback, so that I can correct errors before saving templates.

#### Acceptance Criteria

1. WHEN a user attempts to save without a template name, THE Template_Form SHALL display a validation error on the name field
2. WHEN a user attempts to save without a task title, THE Template_Form SHALL display a validation error on the title field
3. THE Template_Form SHALL highlight invalid fields with visual indicators
4. THE Template_Form SHALL display error messages adjacent to invalid fields
