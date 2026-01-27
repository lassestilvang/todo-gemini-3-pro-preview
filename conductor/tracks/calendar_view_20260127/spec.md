# Specification - Calendar View Feature

## Overview
Add a visual calendar component to the Todo Gemini application. This feature will provide users with a monthly and weekly grid view of their tasks, allowing for better long-term planning and scheduling.

## User Stories
- As a user, I want to see my tasks on a calendar grid so I can visualize my workload over time.
- As a user, I want to switch between monthly and weekly views.
- As a user, I want to drag and drop tasks to reschedule them.
- As a user, I want to click on a day to quickly add a task for that date.
- As a user, I want the calendar to reflect my "First Day of Week" preference.

## Functional Requirements
- **Grid Views:** Support for Month and Week layouts.
- **Task Display:** Tasks should appear on their due dates. Completed tasks should be visually distinct (e.g., strikethrough or faded).
- **Navigation:** Buttons to move to previous/next month/week and a "Today" button.
- **Interactivity:**
    - Drag-and-drop rescheduling (updates `dueDate`).
    - Click-to-add functionality.
    - Hover states for task details.
- **Persistence:** View settings (Month/Week) should be saved per user.
- **Responsive Design:** Adaptive layout for mobile devices.

## Technical Requirements
- **Library:** Use `react-day-picker` or a custom CSS Grid implementation (consistent with existing UI).
- **Drag and Drop:** Utilize `@dnd-kit` (already used in the project for sorting).
- **State Management:** React Query for data fetching and optimistic updates.
- **Components:** Reuse `TaskItem` and `TaskDialog` where possible.
