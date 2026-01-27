# Project Improvements & TODOs

## 🚨 High Priority (Bugs & Core Issues)

- [x] **[Perf] Fix CSP blocking `react-grab`**: Resolve content security policy violation.
  - *Status*: **RESOLVED** - Loading `react-grab` via HTTPS to align with CSP.
- [x] **[Perf] Optimize Initial Load**: Investigate and improve TTFB/FCP (~2.5s).
  - *Status*: **RESOLVED** - Implemented streaming (Suspense) and parallelized data fetching.
- [x] **Fix Hydration Mismatch**: Warning on initial load.
  - *Status*: **RESOLVED** - Added `suppressHydrationWarning` and fixed class mismatches.
- [x] **Fix Search Indexing Latency**: New tasks not appearing immediately.
  - *Status*: **RESOLVED** - Verified with E2E test `e2e/search-latency.spec.ts`.
- [x] **Fix Dialog Accessibility Warnings**: Missing `Description` or `aria-describedby`.
  - *Status*: **RESOLVED** - Added `<DialogDescription className="sr-only">` to all dialogs.

## 🚀 Features & Enhancements

- [x] **Task Estimates**: Add estimated time for tasks. Add presets for quickly selecting time (e.g. 15m, 30m, 1h, 2h, 3h, 4h, 8h) but let users set custom times as well. Add time tracking. Display time spent on tasks. Add time tracking history. Add time tracking chart. Add time tracking export. Display time estimated/spent on tasks in the task list. Use your frontend-skill to design this feature so it will be user-friendly and look great.
- [ ] **Calendar View Feature**: Add a visual calendar component for task scheduling and overview.
- [ ] **Implement Board/Calendar view on lists**: Enable different layouts for task lists, selectable via the "View" settings modal.
  - **Board View**: A Trello-style Kanban board grouping tasks by status (To Do, In Progress, Done) or priority.
  - **Calendar View**: A grid-based month/week view showing tasks on their due dates with drag-and-drop rescheduling.
  - **State Management**: Persist view preference per list/view using the existing `ViewSettings` system.
  - **Responsive Design**: Ensure Board and Calendar views are usable on mobile with horizontal scrolling or simplified layouts.
- [ ] **AI-Powered Task Suggestions**: Leverage Gemini to suggest next tasks based on user habits and patterns.
- [ ] **Internationalization (i18n) Support**: Add language files, locale-switcher, and Next.js i18n routing.
- [x] **Manual Task Sorting**: Implement manual task reordering within lists.
  - **Logic**: When view sorting is set to "manual", allow users to drag-and-drop tasks to change their order.
  - **Schema**: Ensure tasks have a `position` or `sort_order` field.
  - **Consistency**: Sorting should keep todo and completed tasks separated (sorting within their respective groups).
  - *Status*: **RESOLVED** - Added `position` column, `reorderTasks` action, and integrated `@dnd-kit` in `TaskListWithSettings`. Server query enforcing todo/completed separation.
- [x] **Activity Log System**: Implement a detailed activity log page and sidebar entry.
  - **Tracking**: Log all actions including task completion, list renames, manual sorting, deletions, and metadata changes.
  - **Page**: Dedicated `/activity` page with a searchable/filterable audit trail.
  - **Sidebar**: Add "Activity Log" to the main navigation.
  - *Status*: **RESOLVED** - Extended `taskLogs` schema with `listId`/`labelId`, added logging to list/label actions, built `ActivityLogContent.tsx` with search, filters, date grouping, action icons, and deep links.
- [x] **Sidebar Reordering**: Allow users to manually reorder Lists and Labels in the sidebar (drag-and-drop).
  - *Status*: **RESOLVED** - Implemented using `@dnd-kit`, added `position` column to schema, and new server actions for reordering.
- [x] **Inline Task Creation Refinement**:
  - **Inbox Support**: Add the `CreateTaskInput` component (inline adder) to the Inbox view.
  - **Details Toggle**: When the inline adder is active, add an option ("Full Details" button) to open the task in the full `TaskDialog` for advanced editing.
  - **UI Consolidation**: Remove the legacy "+ Add Task" button from all headers/views once the inline adder is ubiquitous to avoid duplication.
  - *Status*: **RESOLVED** - Added `CreateTaskInput` to Inbox, implemented "Full Details" toggle which opens pre-filled `TaskDialog`, and hid legacy "Add Task" button in Inbox and List views.
- [ ] **Offline-First Background Sync**: Implement a sync queue (e.g., Workbox or IndexedDB) for offline reliability.
- [x] **24-Hour Time Preference**: Detect user/system preference for 24-hour clock automatically, and provide a manual toggle in the Settings to override it.
  - **Logic**: Use `Intl.DateTimeFormat` for auto-detection and persist the manual override in user settings/local storage.
  - **UI**: Update all time-related displays (task due times, analytics, logs) to respect this setting.
  - *Status*: **RESOLVED** - Added `use24HourClock` to users schema, created `TimeSettings.tsx` toggle in Settings, built `UserProvider` context and `formatTimePreference()` utility.
- [x] **First Day of Week Setting**: Add a user preference for the start of the week (Monday vs. Sunday).
  - **Logic**: Default to the user's locale but allow a manual override in Settings.
  - **Integration**: Ensure this setting is respected across the application, specifically in:
    - Date pickers (e.g., in `CreateTaskInput` and `TaskDialog`)
    - "Upcoming" view grouping and headers
    - Analytics charts (e.g., weekly productivity heatmap)
    - Calendar views (when implemented)
  - **Persistence**: Save the preference in the `users` table via Drizzle ORM.
  - *Status*: **RESOLVED** - Added `weekStartsOnMonday` to users schema, created `WeekStartSettings.tsx`, updated `UserProvider` with `getWeekStartDay()` helper, and integrated with `CalendarView` and `react-day-picker`.
- [x] **"Upcoming" view refinement**: Group tasks by date with sticky headers for better readability.
  - **Logic**: Tasks in the /upcoming view should be grouped by their due date (e.g., Today, Tomorrow, Monday, etc.).
  - **UI**: Use sticky headers for each date group so users can easily see which day they are looking at while scrolling.
  - *Status*: **RESOLVED** - Updated `TaskListWithSettings.tsx` with default date grouping for "upcoming" view, sticky headers, and friendly date formatting (Today, Tomorrow, weekday).
- [x] **Descriptions for Lists and Labels**: Add a description field to lists and labels.
  - **Logic**: Allow users to provide context or instructions for specific lists and labels.
  - **Schema**: Add a `description` field to the `lists` and `labels` tables in the database.
  - **UI**: Display the description below the title in the main view (similar to the "Today" view).
  - **Editing**: Update the list and label edit dialogs to include a description input.
  - *Status*: **RESOLVED** - Added `description` column to `lists` and `labels`, updated `ManageListDialog` and `ManageLabelDialog` with textarea inputs, and updated `ListPage` and `LabelPage` to display the description.
- [ ] **Task List Density Options**: Introduce selectable density views for task lists to improve visibility and focus.
  - **Compact**: Minimal padding and margin, optimized for power users with many tasks.
  - **Standard**: The current default layout and spacing.
  - **Spacious**: Increased padding and vertical rhythm for better readability and focus.
  - **Settings**: Integrate density selection into the `ViewOptionsPopover` and persist it per view using the `ViewSettings` system.
- [ ] **Sidebar Favorites Sections**: Allow users to favorite lists and labels for quick access.
  - **Logic**: Add a `isFavorite` or `favorite` field to the `lists` and `labels` tables.
  - **UI**: Add a "star" or "favorite" icon toggle in the sidebar (next to titles) and in the manage dialogs.
  - **Combined View**: Display all favorited items in a new "Favorites" section at the top of the sidebar.
  - **Reordering**: Allow manual reordering within the Favorites section.
  - **UX**: This is especially helpful for users with many lists and labels, providing a way to pin the most important ones.

- [ ] **Privacy-Friendly Analytics**: Connect WebVitals/page-events to a provider (Plausible/PostHog) with opt-out.
- [ ] **Real-User Monitoring (RUM) Dashboard**: Dashboard for Web Vitals metrics.
- [ ] **Feature-Flag System**: Simple flag mechanism to toggle experimental features.
- [x] **[Feature] Productivity Analytics Dashboard**: Heatmap, Radar Chart, and smart text insights.
- [x] **[Feature] Voice Capture**: Web Speech API for voice-to-text task creation (Mobile optimized).
- [x] **[Feature] Quick Actions**: Floating action button (FAB) for instant task creation (`QuickCapture.tsx`).
- [x] **[UX] "Zen Mode" (Focus View)**: Distraction-free task view with glassmorphism overlay.
- [x] **[UX] Visual Keyboard Shortcuts Guide**: Vim-style J/K navigation, visible focus states.
- [x] **[Feature] Pomodoro Timer**: Focus timer integrated into Zen Mode.
- [x] **Export / Import Functionality**: JSON/CSV backup with ID mapping.

## 🎨 UI/UX Polish

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
  - *Status*: **RESOLVED** - Added "performance" theme to `themes.ts`, created CSS variables in `globals.css` with global animation/transition kill switch, added `PerformanceProvider` context, and updated components (`PageTransition`, `TaskItem`, `QuickCapture`, `ZenOverlay`) to skip animations.
- [ ] **[UX] Sidebar Resize**: Make the sidebar resizable.

## 🛠 Engineering & Quality

- [ ] **React Compiler?**: Are we using the React compiler?
- [x] **[Improvement] CI E2E Test Splitting**: Investigate and implement better test distribution for E2E tests.
  - **Status**: **RESOLVED** - Analyzed bottlenecks using `gh` CLI and increased shard count from 2 to 4 in `ci.yml`. This distributes the 42+ tests more evenly across runners.
- [ ] **[Improvement] Settings Page A11y Test**: Complete the skipped accessibility test in `e2e/a11y.spec.ts`.
- [ ] **[Improvement] Visual Regression CI baselines**: Add Linux-based snapshots for CI.
- [ ] **[Improvement] LazyMotion domMax**: Consider upgrading `domAnimation` to `domMax` in `LazyMotionProvider.tsx`.
- [ ] **[Perf] Search Scalability**: Monitor client-side search performance with >2000 tasks.
- [ ] **[Perf] Search Index Warm-up**: Prefetch or persist search index to eliminate warm-up delay.
- [ ] **[Refactor] Split globals.css**: Modularize the large CSS file (`globals.css` is ~600 lines) for better maintainability.
- [ ] **[Perf] Remove console.time**: Replace `console.time('search')` in `SearchDialog.tsx` with proper telemetry or remove for production.
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
