# Implementation Plan

- [x] 1. Create TimePicker component with core functionality
  - [x] 1.1 Implement TimePicker component with input field and popover
    - Create component with `time`, `setTime`, and `placeholder` props
    - Add Clock icon and input styling consistent with existing components
    - Implement popover with ScrollArea for time suggestions
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Implement roundUpTo15Minutes utility function
    - Round any time up to the next 15-minute boundary
    - Handle edge cases (already on boundary, crossing hour/day)
    - _Requirements: 1.2_

  - [x] 1.3 Write property test for roundUpTo15Minutes
    - **Property 1: Round-up to 15-minute interval**
    - **Validates: Requirements 1.2**

  - [x] 1.4 Implement generateTimeOptions function
    - Generate 96 time options (24 hours in 15-min intervals)
    - Start from rounded-up current time
    - _Requirements: 1.2_

  - [x] 1.5 Implement parseTimeInput function
    - Parse HH:mm, H:mm, HHmm, and HH formats
    - Return null for invalid inputs
    - _Requirements: 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.6 Write property test for parseTimeInput (valid inputs)
    - **Property 2: Valid time parsing produces correct format**
    - **Validates: Requirements 1.4, 5.1, 5.2, 5.3, 5.4**

  - [x] 1.7 Write property test for parseTimeInput (invalid inputs)
    - **Property 3: Invalid time rejection**
    - **Validates: Requirements 1.5, 5.5**

- [x] 2. Add user interaction handling
  - [x] 2.1 Implement time selection from dropdown
    - Handle click on time option
    - Update input value and call setTime
    - Close popover after selection
    - _Requirements: 1.3_

  - [x] 2.2 Implement manual time input handling
    - Handle input change and blur events
    - Parse and validate on blur
    - Revert to previous value if invalid
    - _Requirements: 1.4, 1.5_

  - [x] 2.3 Implement keyboard navigation
    - Handle Enter key to apply value
    - Handle Escape key to cancel and close
    - _Requirements: 4.1, 4.2_

  - [x] 2.4 Implement clear functionality
    - Add clear button when time is set
    - Reset to undefined on clear
    - _Requirements: 2.1_

  - [x] 2.5 Write unit tests for TimePicker component
    - Test rendering with placeholder
    - Test opening suggestions on focus
    - Test time selection from dropdown
    - Test manual input handling
    - Test keyboard navigation
    - Test clear functionality
    - _Requirements: 1.1, 1.3, 2.1, 4.1, 4.2_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate TimePicker into TaskDetailsTab
  - [x] 4.1 Add TimePicker for Due Date
    - Import TimePicker component
    - Add TimePicker next to DatePicker for Due Date
    - Wire up time extraction and setting from Date object
    - _Requirements: 3.4_

  - [x] 4.2 Add TimePicker for Deadline
    - Add TimePicker next to DatePicker for Deadline
    - Wire up time extraction and setting from Date object
    - _Requirements: 3.5_

  - [x] 4.3 Implement date-time merging logic
    - Preserve time when date changes
    - Preserve date when time changes
    - Auto-set today's date when time is set without date
    - Handle time clear (reset to midnight)
    - _Requirements: 2.2, 3.1, 3.2, 3.3_

  - [x] 4.4 Write property test for date-time independence
    - **Property 4: Date-time component independence**
    - **Validates: Requirements 3.2, 3.3**

- [x] 5. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Manual verification with chrome-devtools
  - [x] 6.1 Verify TimePicker UI and functionality
    - Open application in browser
    - Create or edit a task
    - Verify time picker appears next to date picker for Due Date and Deadline
    - Test clicking time input shows 15-minute interval suggestions
    - Test first suggestion is current time rounded up
    - Test typing a custom time (e.g., "14:30")
    - Test selecting a time from dropdown
    - Verify selected date+time is saved correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.4, 3.5_
