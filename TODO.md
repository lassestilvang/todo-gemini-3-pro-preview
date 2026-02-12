# Project Improvements & TODOs

## 💡 Ideas

- Snooze? Eller er det bare "This week"?
- Som Hey/Timestripe?
- Timeline view? Har full calendar det?
- blacksmith/depot?
- Convex...

## 🚨 High Priority (Bugs & Core Issues)

## 🚀 Features & Enhancements

- [-] **[Feature] Todoist Sync**: Add support for syncing tasks with Todoist. It should be 2-way sync, with the limitation of a maximum of 5 Todoist Projects (Lists). So for additional lists in this app, they should be synced to labels in Todoist. https://developer.todoist.com/api/v1/
- [ ] **[Feature] Google Tasks Sync**: Add support for syncing tasks with Google Tasks. https://developers.google.com/workspace/tasks/reference/rest
- [ ] **[Feature] Google Calendar Sync**: Sync events from Google Calendar to the calendar view - not as tasks but as events. https://developers.google.com/workspace/calendar/api/guides/overview
- [ ] **[Feature] Calendar Version 4**: New page: /calendar4 and add it to the sidebar. Use "Full Calendar v7". It should support drag and drop of tasks to reschedule them. It should support resizing to change the duration of a task. It should also support multiple lists/calendars. It should be possible to create a new task by clicking on a date in the calendar. It should support multiple views (month, week, day). The installation guide is here: https://raw.githubusercontent.com/fullcalendar/fullcalendar-docs/refs/heads/v7/INSTALL-GUIDE.md
  - **Support for weekly/monthly/yearly tasks**: Display like HEY.com
- [ ] **[Feature] AI-Powered Task Suggestions**: Leverage Gemini to suggest next tasks based on user habits and patterns.
- [ ] **[Feature] Internationalization (i18n)**: Add language files, locale-switcher, and Next.js i18n routing.
- [ ] **[UX] Task List Density Options**: Introduce selectable density views for task lists to improve visibility and focus.
  - **Compact**: Minimal padding and margin, optimized for power users with many tasks.
  - **Standard**: The current default layout and spacing.
  - **Spacious**: Increased padding and vertical rhythm for better readability and focus.
  - **Settings**: Integrate density selection into the `ViewOptionsPopover` and persist it per view using the `ViewSettings` system.
- [ ] **[Feature] Starred tasks**: Allow users to mark tasks as starred.
- [ ] **[Feature] Sidebar Favorites**: Allow users to favorite lists and labels for quick access.
  - **Logic**: Add a `isFavorite` or `favorite` field to the `lists` and `labels` tables.
  - **UI**: Add a "star" or "favorite" icon toggle in the sidebar (next to titles) and in the manage dialogs.
  - **Combined View**: Display all favorited items in a new "Favorites" section at the top of the sidebar.
  - **Reordering**: Allow manual reordering within the Favorites section.
  - **UX**: This is especially helpful for users with many lists and labels, providing a way to pin the most important ones.
- [ ] **[Infra] Privacy-Friendly Analytics**: Connect WebVitals/page-events to a provider (Plausible/PostHog) with opt-out.
- [ ] **[Infra] Real-User Monitoring (RUM) Dashboard**: Dashboard for Web Vitals metrics.
- [ ] **[Infra] Feature-Flag System**: Simple flag mechanism to toggle experimental features.

## 🎨 UI/UX Polish

- [ ] **[UX] Keyboard Shortcuts**: Add keyboard shortcuts for common actions.
- [ ] **[UX] WorkOS User Profile Link**: Add a link to the WorkOS user profile in the settings page. It should open the user profile in a new tab - or even better, open the WorkOS user profile in a modal dialog if possible. Investigate their documentation to see if this is possible.

## 🛠 Engineering & Quality

- [ ] **[Improvement] Settings Page A11y Test**: Complete the skipped accessibility test in `e2e/a11y.spec.ts`.
- [ ] **[Improvement] Visual Regression CI baselines**: Add Linux-based snapshots for CI.
- [ ] **[Improvement] LazyMotion domMax**: Consider upgrading `domAnimation` to `domMax` in `LazyMotionProvider.tsx`.
- [ ] **[Perf] Batch Template Instantiation**: Replace per-task `createTask` calls with a bulk insert pipeline.
  - **Approach**: Flatten template tree into top-level + subtask batches, insert with `RETURNING` to map IDs.
  - **Parent Mapping**: Use insert order or a stable key to map old IDs to new IDs, then update `parentId` in one batched `CASE` update.
  - **Goal**: Reduce template instantiation from O(n) roundtrips to O(1–3) queries per level.
- [ ] **[Perf] Search Scalability**: Monitor client-side search performance with >2000 tasks.
- [ ] **[Perf] Search Index Warm-up**: Prefetch or persist search index to eliminate warm-up delay.
- [ ] **[Refactor] Split globals.css**: Modularize the large CSS file (`globals.css` is ~600 lines) for better maintainability.
- [ ] **[Perf] Remove console.time**: Replace `console.time('search')` in `SearchDialog.tsx` with proper telemetry or remove for production.

---

## ✅ Completed

- [x] **[Feature] Slim Sidebar**: Add a slim version of the sidebar that only shows the icons.
- [x] **[Feature] Sidebar Toggle**: Add a toggle to the sidebar to toggle between slim, normal and hidden sidebar. When hidden we should have a small icon in the top left corner to toggle it back.
- [x] **[UX] Sidebar Resize**: Make the sidebar resizable.
- [x] **[Feature] Weekly/Monthly/Yearly Tasks**: Figure out a way to let the user schedule tasks for a specific week/month/year - not a specific date.
- [x] **[Feature] Sync Status**: When the Sync Error/Pending icon is shown, it should be possible to click on it to see the sync issues / what is pending sync.
- [x] **[Feature] Board/Calendar View on Lists**: Enable different layouts for task lists, selectable via the "View" settings modal (there are placeholder buttons for it).
  - **Board View**: A Trello-style Kanban board grouping tasks by status (To Do, In Progress, Done) or priority or dates.
  - **Calendar View**: A grid-based month/week view showing tasks on their due dates with drag-and-drop rescheduling.
  - **State Management**: Persist view preference per list/view using the existing `ViewSettings` system.
  - **Responsive Design**: Ensure Board and Calendar views are usable on mobile with horizontal scrolling or simplified layouts.
- [x] **[UX] Performance Theme**: Should have no CSS animations or transitions anywhere - just instant rendering. Pure speed!
- [x] **[Bug] Emoji/Icon Picker**: The emoji/icon picker is not working. It should display the emoji/icon and allow the user to select it. Nothing is displayed. Debug in browser to see for yourself.
  - _Status_: **RESOLVED** - Verified in dev environment; picker displays correctly and allows selection. Cannot reproduce "Nothing is displayed".
- [x] **[Feature] View Setting Indicator**: Show indicator/text next to the view button to indicate active settings.
  - **Logic**: Implemented in `TaskListWithSettings` to show "Sort: [Value]", "Group: [Value]", or "Filter: Active", prioritized in that order.
  - _Status_: **RESOLVED** - Verified "Sort: Created" appears when sorted by creation date.
- [x] **[Feature] Task Sorting**: Add a "Created" option to the sorting dropdown - newest on top.
  - **Logic**: Implemented "Created" sort option in `TaskListWithSettings`, updated `ViewOptionsPopover`, and set "Created" descending as default for Lists via `src/app/lists/[id]/page.tsx`.
  - **Manual Sort**: Updated `createTask` server action to insert new tasks at the top (min position - 1024) when manual sorting is active.
  - _Status_: **RESOLVED** - Verified logic ensuring new tasks appear at top in both "Created" and "Manual" modes.
- [x] **[Bug] Task Sorting**: If sorting is applied then the task list is first rendered with tasks in the wrong order, then they are sorted. So a flash of wrong order is visible.
  - _Status_: **RESOLVED** - Fetched view settings server-side in all pagesto prevent hydration mismatch flash.
- [x] **[Feature] Sidebar Task Counts**: Add a count of tasks in each list/label to the sidebar.
- [x] **[Infra] Offline-First Background Sync**: Implement a sync queue (e.g., Workbox or IndexedDB) for offline reliability.
- [x] **[Perf] Fix CSP blocking `react-grab`**: Resolve content security policy violation.
  - _Status_: **RESOLVED** - Loading `react-grab` via HTTPS to align with CSP.
- [x] **[Perf] Optimize Initial Load**: Investigate and improve TTFB/FCP (~2.5s).
  - _Status_: **RESOLVED** - Implemented streaming (Suspense) and parallelized data fetching.
- [x] **Fix Hydration Mismatch**: Warning on initial load.
  - _Status_: **RESOLVED** - Added `suppressHydrationWarning` and fixed class mismatches.
- [x] **Fix Search Indexing Latency**: New tasks not appearing immediately.
  - _Status_: **RESOLVED** - Verified with E2E test `e2e/search-latency.spec.ts`.
- [x] **Fix Dialog Accessibility Warnings**: Missing `Description` or `aria-describedby`.
  - _Status_: **RESOLVED** - Added `<DialogDescription className="sr-only">` to all dialogs.
- [x] **Task Estimates**: Add estimated time for tasks. Add presets for quickly selecting time (e.g. 15m, 30m, 1h, 2h, 3h, 4h, 8h) but let users set custom times as well. Add time tracking. Display time spent on tasks. Add time tracking history. Add time tracking chart. Add time tracking export. Display time estimated/spent on tasks in the task list. Use your frontend-skill to design this feature so it will be user-friendly and look great.
- [x] **Manual Task Sorting**: Implement manual task reordering within lists.
  - **Logic**: When view sorting is set to "manual", allow users to drag-and-drop tasks to change their order.
  - **Schema**: Ensure tasks have a `position` or `sort_order` field.
  - **Consistency**: Sorting should keep todo and completed tasks separated (sorting within their respective groups).
  - _Status_: **RESOLVED** - Added `position` column, `reorderTasks` action, and integrated `@dnd-kit` in `TaskListWithSettings`. Server query enforcing todo/completed separation.
- [x] **Activity Log System**: Implement a detailed activity log page and sidebar entry.
  - **Tracking**: Log all actions including task completion, list renames, manual sorting, deletions, and metadata changes.
  - **Page**: Dedicated `/activity` page with a searchable/filterable audit trail.
  - **Sidebar**: Add "Activity Log" to the main navigation.
  - _Status_: **RESOLVED** - Extended `taskLogs` schema with `listId`/`labelId`, added logging to list/label actions, built `ActivityLogContent.tsx` with search, filters, date grouping, action icons, and deep links.
- [x] **Sidebar Reordering**: Allow users to manually reorder Lists and Labels in the sidebar (drag-and-drop).
  - _Status_: **RESOLVED** - Implemented using `@dnd-kit`, added `position` column to schema, and new server actions for reordering.
- [x] **Inline Task Creation Refinement**:
  - **Inbox Support**: Add the `CreateTaskInput` component (inline adder) to the Inbox view.
  - **Details Toggle**: When the inline adder is active, add an option ("Full Details" button) to open the task in the full `TaskDialog` for advanced editing.
  - **UI Consolidation**: Remove the legacy "+ Add Task" button from all headers/views once the inline adder is ubiquitous to avoid duplication.
  - _Status_: **RESOLVED** - Added `CreateTaskInput` to Inbox, implemented "Full Details" toggle which opens pre-filled `TaskDialog`, and hid legacy "Add Task" button in Inbox and List views.
- [x] **24-Hour Time Preference**: Detect user/system preference for 24-hour clock automatically, and provide a manual toggle in the Settings to override it.
  - **Logic**: Use `Intl.DateTimeFormat` for auto-detection and persist the manual override in user settings/local storage.
  - **UI**: Update all time-related displays (task due times, analytics, logs) to respect this setting.
  - _Status_: **RESOLVED** - Added `use24HourClock` to users schema, created `TimeSettings.tsx` toggle in Settings, built `UserProvider` context and `formatTimePreference()` utility.
- [x] **First Day of Week Setting**: Add a user preference for the start of the week (Monday vs. Sunday).
  - **Logic**: Default to the user's locale but allow a manual override in Settings.
  - **Integration**: Ensure this setting is respected across the application, specifically in:
    - Date pickers (e.g., in `CreateTaskInput` and `TaskDialog`)
    - "Upcoming" view grouping and headers
    - Analytics charts (e.g., weekly productivity heatmap)
    - Calendar views (when implemented)
  - **Persistence**: Save the preference in the `users` table via Drizzle ORM.
  - _Status_: **RESOLVED** - Added `weekStartsOnMonday` to users schema, created `WeekStartSettings.tsx`, updated `UserProvider` with `getWeekStartDay()` helper, and integrated with `CalendarView` and `react-day-picker`.
- [x] **"Upcoming" view refinement**: Group tasks by date with sticky headers for better readability.
  - **Logic**: Tasks in the /upcoming view should be grouped by their due date (e.g., Today, Tomorrow, Monday, etc.).
  - **UI**: Use sticky headers for each date group so users can easily see which day they are looking at while scrolling.
  - _Status_: **RESOLVED** - Updated `TaskListWithSettings.tsx` with default date grouping for "upcoming" view, sticky headers, and friendly date formatting (Today, Tomorrow, weekday).
- [x] **Descriptions for Lists and Labels**: Add a description field to lists and labels.
  - **Logic**: Allow users to provide context or instructions for specific lists and labels.
  - **Schema**: Add a `description` field to the `lists` and `labels` tables in the database.
  - **UI**: Display the description below the title in the main view (similar to the "Today" view).
  - **Editing**: Update the list and label edit dialogs to include a description input.
  - _Status_: **RESOLVED** - Added `description` column to `lists` and `labels`, updated `ManageListDialog` and `ManageLabelDialog` with textarea inputs, and updated `ListPage` and `LabelPage` to display the description.
- [x] **[Feature] Productivity Analytics Dashboard**: Heatmap, Radar Chart, and smart text insights.
- [x] **[Feature] Voice Capture**: Web Speech API for voice-to-text task creation (Mobile optimized).
- [x] **[Feature] Quick Actions**: Floating action button (FAB) for instant task creation (`QuickCapture.tsx`).
- [x] **[UX] "Zen Mode" (Focus View)**: Distraction-free task view with glassmorphism overlay.
- [x] **[UX] Visual Keyboard Shortcuts Guide**: Vim-style J/K navigation, visible focus states.
- [x] **[Feature] Pomodoro Timer**: Focus timer integrated into Zen Mode.
- [x] **Export / Import Functionality**: JSON/CSV backup with ID mapping.
- [x] **[UX] Modal sizes**: Make modals responsive and adjust sizes based on screen size. On smaller screens it is not possible to see the whole modal. Verify this on mobile devices and tablets, as well as on desktop in various screen resolutions/windows sizes.
- [x] **[UX] Sidebar Identity Section**: Detailed profile view in sidebar footer.
- [x] **[UX] Missing Navigation Links**: Added "Analytics" and "Settings" to sidebar.
- [x] **[UX] "World Class" Page Transitions**: `framer-motion` transitions with custom bezier curves.
- [x] **[UX] Refine Design System**: Refined font weights, contrast, spacing, and border radius.
- [x] **[UX] Sidebar Scroll**: Fixed flexbox layout to allow scrolling on small screens.
- [x] **[UX] Sidebar Pop-in**: Fixed loading skeletons and dynamic imports to prevent layout shift.
- [x] **[UX] Implement 'Synthwave' Theme**: Neon-inspired dark theme with Orbitron font.
- [x] **[UX] Glassmorphism Themes**: Added `glassmorphism` and `glassmorphism-dark` with blur effects.
- [x] **[UX] Onboarding Flow**: Fixed viewport overflow issues for tour tooltips.
- [x] **[UX] Sidebar Structure**: Move "Templates" nav item below "Smart Schedule", move "I'm behind" below "Smart Schedule", relocate "Install App" to user menu, and move gamification (XP Bar) to the bottom.
- [x] **[UX] Sidebar Reordering Toggle**: Move the list/label reordering functionality behind a toggle or icon. Since reordering is infrequent, it shouldn't be active by default to prevent accidental drags and keep the UI clean.
- [x] **[UX] Performance Theme**: Add a new theme that has no animations, transitions or any other fancy effects. It should be super clean and fast. Focus on raw performance and a "no-nonsense" aesthetic. Use your frontend skill to create a theme that is as fast and beautiful as possible.
  - _Status_: **RESOLVED** - Added "performance" theme to `themes.ts`, created CSS variables in `globals.css` with global animation/transition kill switch, added `PerformanceProvider` context, and updated components (`PageTransition`, `TaskItem`, `QuickCapture`, `ZenOverlay`) to skip animations.
- [x] **[Improvement] CI E2E Test Splitting**: Investigate and implement better test distribution for E2E tests.
  - **Status**: **RESOLVED** - Analyzed bottlenecks using `gh` CLI and increased shard count from 2 to 4 in `ci.yml`. This distributes the 42+ tests more evenly across runners.
- [x] **Strict Type Checking**: TypeScript `strict: true` and zero ESLint errors.
- [x] **Frontend Performance**: Server-side view settings fetching to prevent layout flash.
- [x] **AI Best Practices**: Using Gemini structured output (`application/json`).
- [x] **Error Boundary Coverage**: Granular `error.tsx` and `ErrorState` components.
- [x] **Security Headers**: HSTS, X-Frame-Options, CSP in `next.config.ts`.
- [x] **Rate Limiting**: Database-backed rate limiter in `src/lib/rate-limit.ts`.
- [x] **Environment Variables Validation**: Runtime validation in `src/lib/env.ts`.
- [x] **E2E Tests**: Task creation, Upcoming view, and cross-view verification.
- [x] **Visual Regression**: Multi-theme snapshots (Light, Dark, Glassmorphism, Neubrutalism).
- [x] **Bundle Size Analysis**: Optimized `canvas-confetti` and `react-grab` loading.

---

## 📊 Status Summary

- **Verified Working**: Core features, UI polish, Performance optimizations, Testing infrastructure.
- **Focus Areas**: Advanced features (Calendar, AI Suggestions), Offline robustness, and Refactoring (CSS, Search telemetry).
