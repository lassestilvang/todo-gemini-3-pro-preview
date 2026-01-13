# Project Improvements & TODOs

## High Priority (Bugs & Core Issues)

- [ ] **Fix Hydration Mismatch**: A hydration warning appears on initial load.
  - *Root Cause*: The `<body>` tag has different classes on server (`font-sans`) vs client (`font-sans antigravity-scroll-lock`). The `antigravity-scroll-lock` class is injected by the `react-grab` development tool script in `layout.tsx` (lines 59-67).
  - *Action*: Add `suppressHydrationWarning` to the `<body>` tag in `src/app/layout.tsx`, or conditionally load the react-grab script after hydration.

- [ ] **Fix Search Indexing Latency**: New tasks do not immediately appear in the Command Palette (Cmd+K).
  - *Root Cause*: `SearchDialog.tsx` calls `searchTasks()` server action with 300ms debounce. The server action queries the database directly (`src/lib/actions.ts`). New tasks should appear immediately since there's no client-side caching - verify if this is still an issue after task creation invalidates the query.
  - *Action*: Add `revalidatePath` or manually test to confirm the issue persists. If so, consider adding an optimistic update.

- [x] **Fix Dialog Accessibility Warnings**: ~~Tests report "Missing `Description` or `aria-describedby`" for `DialogContent`.~~
  - *Status*: **RESOLVED** - All dialogs (`TaskDialog.tsx`, `TemplateFormDialog.tsx`) already have proper `<DialogDescription>` elements (TaskDialog uses `sr-only` class for screen readers).

## UI/UX Polish

- [x] **Empty States**:
  - *Status*: **RESOLVED** - `TaskListWithSettings.tsx` (lines 205-209) already implements a consistent empty state with "No tasks found" message and "Create one?" action button.

- [ ] **Navigation Performance**:
  - *Issue*: Browser testing showed the dev server has slow chunk loading (2s+ for some requests), but this is expected in development mode.
  - *Action*: Profile React renders in production build. Verify if `TaskListWithSettings` calculations block the main thread using React DevTools profiler.

- [ ] **"I'm Behind" Clarity**:
  - *Issue*: The sidebar button is useful but its purpose may not be obvious to new users.
  - *Action*: Add a tooltip explaining "Catch up on overdue tasks" when hovering.

## Code Quality & Best Practices

- [x] **Strict Type Checking**: TypeScript `strict: true` is enabled in `tsconfig.json`. ESLint passes with zero errors.

- [x] **Component Optimization**:
  - *Status*: **VERIFIED** - `TaskListWithSettings.tsx` properly uses `useMemo` for `processedTasks` (line 172-174) and `groupedTasks` (line 177-179) with correct minimal dependency arrays.

- [ ] **Profile Settings UI**:
  - *Issue*: The "Profile Settings" menu item in `UserProfile.tsx` (line 80) is marked as `disabled`. Consider either implementing the feature or removing the menu item to avoid user confusion.

- [ ] **Console.log Cleanup**:
  - *Finding*: `PwaRegister.tsx` has console.logs for service worker registration. Consider using a proper logging utility for production with log levels.

- [ ] **Error Boundary Coverage**:
  - *Finding*: There's an `ErrorBoundary` component wrapping the main content in `layout.tsx`, but individual routes may benefit from more granular error boundaries for better error isolation.

## Security & Production Readiness

- [ ] **Security Headers**:
  - *Action*: Review `next.config.ts` and add security headers (CSP, X-Frame-Options, etc.) for production deployment.

- [ ] **Rate Limiting**:
  - *Action*: Consider adding rate limiting to API routes and server actions to prevent abuse.

- [ ] **Environment Variables Validation**:
  - *Action*: Add runtime validation for required environment variables at startup to fail fast on misconfigurations.

## Testing

- [ ] **E2E Test for Task Creation → Upcoming Verification**:
  - *Action*: Add a Playwright test (in `e2e/`) that:
    1. Creates a task "Buy Milk" with a future date.
    2. Navigates to "Upcoming".
    3. Verifies "Buy Milk" is visible.
  - *Note*: Existing `e2e/task-creation.spec.ts` covers task creation on "Today" page but not cross-view verification.

- [ ] **Test Coverage Report**:
  - *Finding*: 97 unit tests pass. Coverage script exists (`bun test --coverage`). 
  - *Action*: Generate and review coverage report to identify untested code paths.

- [ ] **Visual Regression (Optional)**: Consider adding visual snapshots for the "Neo-Brutalism" theme to catch contrast regressions.

## Performance Monitoring

- [ ] **Performance Metrics**:
  - *Action*: Add Web Vitals monitoring (LCP, FID, CLS) for production. Next.js has built-in support via `next/web-vitals`.

- [ ] **Bundle Size Analysis**:
  - *Action*: Run `next build` and analyze the bundle to identify large dependencies that could be code-split or lazy-loaded.

## Future / Features

- [ ] **Offline Mode Robustness**: Verify `next-pwa` config covers all dynamic routes. Current service worker registration is in `PwaRegister.tsx`.

- [ ] **Profile Settings Implementation**: Replace disabled menu item with actual settings page (theme preferences are currently in a separate settings dialog).

---

## Analysis Summary (2026-01-13)

### What's Working Well ✅
- **Testing**: 97 unit tests pass, 6 E2E test files with comprehensive coverage
- **Accessibility**: All dialogs have proper `DialogDescription` elements
- **TypeScript**: Strict mode enabled, ESLint passes with zero errors
- **Performance**: Proper `useMemo` usage for expensive calculations
- **Empty States**: Already implemented in `TaskListWithSettings`
- **Code Organization**: Clean separation with custom hooks (`useTaskForm`, `useTaskData`)

### Areas for Improvement 🔧
- Hydration mismatch from dev tools (easy fix)
- Security headers for production
- More granular error boundaries
- Web Vitals monitoring
- Cross-view E2E testing

### Browser Testing Results 🌐
- Navigation between views is snappy
- Task creation and completion work smoothly
- Confetti animation on task completion is polished
- Calendar view renders correctly
- No major accessibility issues detected
