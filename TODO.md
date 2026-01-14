# Project Improvements & TODOs

## High Priority (Bugs & Core Issues)

- [x] **Fix Hydration Mismatch**: A hydration warning appears on initial load.
  - *Status*: **RESOLVED** - Added `suppressHydrationWarning` to `<body>` in `src/app/layout.tsx`.
  - *Root Cause*: The `<body>` tag has different classes on server (`font-sans`) vs client (`font-sans antigravity-scroll-lock`). The `antigravity-scroll-lock` class is injected by the `react-grab` development tool script in `layout.tsx` (lines 59-67).
  - *Action*: Add `suppressHydrationWarning` to the `<body>` tag in `src/app/layout.tsx`.

- [x] **Fix Search Indexing Latency**: New tasks do not immediately appear in the Command Palette (Cmd+K).
  - *Status*: **RESOLVED** - Verified with E2E test (`e2e/search-latency.spec.ts`) that new tasks appear in search results immediately after creation.
  - *Root Cause*: Previous suspicion of latency due to debounce/caching was unfounded as long as task creation completes.
  - *Action*: Added regression test `e2e/search-latency.spec.ts`.

- [x] **Fix Dialog Accessibility Warnings**: Tests report "Missing `Description` or `aria-describedby`" for `DialogContent`.
  - *Status*: **RESOLVED** - Added `<DialogDescription className="sr-only">` to `PlanningRitual.tsx` and `ManageLabelDialog.tsx`.
  - *Affected Files*: `PlanningRitual.tsx`, `ManageLabelDialog.tsx`.
  - *Action*: Add `<DialogDescription className="sr-only">` to provide context for screen readers in all dialogs.

## UI/UX Polish

- [x] **Empty States**:
  - *Status*: **RESOLVED** - `TaskListWithSettings.tsx` (lines 205-209) already implements a consistent empty state with "No tasks found" message and "Create one?" action button.

- [x] **Navigation & Sidebar Responsiveness**:
  - *Status*: **RESOLVED** - Implemented mobile-first hamburger menu using `Sheet` component. The sidebar is now hidden on mobile and accessible via a top header.
  - *Issue*: Sidebar is fixed-width (256px) and does not hide/collapse on smaller screens, causing layout issues on mobile.
  - *Action*: Implemented `MobileNav` component and updated `MainLayout` to handle responsive states.

- [x] **"I'm Behind" Clarity**:
  - *Status*: **RESOLVED** - Added a Tooltip to the "I'm Behind!" button in `RescheduleButton.tsx`.
  - *Issue*: The sidebar button is useful but its purpose may not be obvious to new users.
  - *Action*: Add a tooltip explaining "Catch up on overdue tasks" when hovering.

## Code Quality & Best Practices

- [x] **Strict Type Checking**: TypeScript `strict: true` is enabled in `tsconfig.json`. ESLint passes with zero errors.

- [x] **Frontend Performance Optimization**:
  - *Status*: **RESOLVED** - Updated `TaskListWithSettings` to accept `initialSettings`. Modified all page components (`today`, `upcoming`, `next-7-days`, `all`, `inbox`, `lists/[id]`, `labels/[id]`) to fetch view settings server-side and pass them props, eliminating the client-side fetch delay and layout flash.
  - *Issue*: `TaskListWithSettings` fetches view settings in a `useEffect`, causing a flash of default layout and additional client-side roundtrip.
  - *Action*: Fetch view settings on the server in `Page` components and pass them as props to `TaskListWithSettings`.

- [x] **AI Best Practices & Efficiency**:
  - *Status*: **RESOLVED** - Updated `ai-actions.ts` to use Gemini's `response_mime_type: 'application/json'` and removed manual regex cleaning. Confirmed `gemini-2.5-flash` is a valid model.
  - *Issue*: Prompting in `ai-actions.ts` uses manual JSON cleaning.
  - *Action*: Use Gemini's structured output (`response_mime_type: 'application/json'`) and check if `gemini-2.5-flash` is a typo for `gemini-2.0-flash`.

- [x] **Error Boundary Coverage**:
  - *Status*: **RESOLVED** - Moved error handling from `RootLayout` (via `ErrorBoundary`) to granular `src/app/error.tsx`. This ensures that if a page crashes, the Sidebar remains visible. Refactored UI into reuseable `ErrorState` component.
  - *Finding*: There's an `ErrorBoundary` component wrapping the main content in `layout.tsx`, but individual routes may benefit from more granular error boundaries for better error isolation.

## Security & Production Readiness

- [x] **Security Headers**:
  - *Status*: **RESOLVED** - Added `headers()` configuration to `next.config.ts` including HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and a basic Content-Security-Policy.
  - *Action*: Review `next.config.ts` and add security headers (CSP, X-Frame-Options, etc.) for production deployment.

- [x] **Rate Limiting**:
  - *Status*: **RESOLVED** - Implemented a database-backed rate limiter in `src/lib/rate-limit.ts` and applied it to AI actions, task creation, and search.
  - *Action*: Consider adding rate limiting to API routes and server actions to prevent abuse.

- [x] **Environment Variables Validation**:
  - *Status*: **RESOLVED** - Added `src/lib/env.ts` for runtime validation and integrated it into `src/app/layout.tsx`.
  - *Action*: Add runtime validation for required environment variables at startup to fail fast on misconfigurations.

## Testing

- [x] **E2E Test for Task Creation → Upcoming Verification**:
  - *Status*: **RESOLVED** - Added `e2e/task-upcoming.spec.ts` which covers cross-view verification for "Upcoming" and "Next 7 Days".
  - *Action*: Add a Playwright test (in `e2e/`) that:
    1. Creates a task "Buy Milk" with a future date.
    2. Navigates to "Upcoming".
    3. Verifies "Buy Milk" is visible.
  - *Note*: Existing `e2e/task-creation.spec.ts` covers task creation on "Today" page but not cross-view verification.

- [x] **Test Coverage Report**:
  - *Status*: **RESOLVED** - Generated and reviewed coverage report. Most server actions now have >80% coverage. Added unit tests for new rate limiter.
  - *Finding*: 439 unit tests pass with high coverage in core logic. Improved database isolation in test setup.

- [x] **Visual Regression**: Added visual snapshots for the core views (Inbox, Today, Upcoming) and mobile view to catch UI/UX regressions.
  - *Status*: **RESOLVED** - Implemented basic visual regression testing in `e2e/visual-regression.spec.ts`.
  - *Action*: Added Playwright snapshots for key pages and a mobile viewport test.

- [x] **Multi-Theme Visual Regression**: Expand visual regression tests to cover all available themes (Light, Dark, Glassmorphism, Neubrutalism, Minimalist).
  - *Status*: **RESOLVED** - Updated `e2e/visual-regression.spec.ts` to iterate through all themes and capture snapshots.
  - *Action*: Created 16 visual snapshots covering core views across 5 themes plus a mobile neubrutalism snapshot.

## Performance Monitoring

- [x] **Performance Metrics**:
  - *Status*: **RESOLVED** - Added `src/components/WebVitals.tsx` using `next/web-vitals` to monitor LCP, FID, CLS.
  - *Action*: Add Web Vitals monitoring (LCP, FID, CLS) for production. Next.js has built-in support via `next/web-vitals`.

- [x] **Bundle Size Analysis**:
  - *Status*: **RESOLVED** - Integrated `@next/bundle-analyzer` and optimized several components.
  - *Action*:
    1. Added `@next/bundle-analyzer` to the build process (`ANALYZE=true`).
    2. Optimized `canvas-confetti` usage by switching to dynamic imports in `TaskItem`, `FocusMode`, `XPBar`, and `LevelUpModal`. This reduced the initial bundle size for all pages as confetti is now only loaded when needed.
    3. Verified that `react-grab` is only loaded in development mode.

## Future / Features

- [x] **Offline Mode Robustness**:
  - *Status*: **RESOLVED** - Verified `@ducanh2912/next-pwa` configuration in `next.config.ts`. It correctly handles dynamic routes and offline caching.
  - *Action*: Verify `next-pwa` config covers all dynamic routes. Current service worker registration is in `PwaRegister.tsx`.

- [x] **Profile Settings Implementation**:
  - *Status*: **RESOLVED** - Enabled "Profile Settings" link in `UserProfile.tsx` pointing to existing `/settings` page.
  - *Action*: Replace disabled menu item with actual settings page (theme preferences are currently in a separate settings dialog).

## Cleanup & Refactoring

- [x] **ThemeSwitcher: Use Shared Theme Constant**: The `ThemeSwitcher.tsx` imports `AVAILABLE_THEMES` but doesn't use it, instead defining a local `themes` array.
  - *Status*: **RESOLVED** - Moved theme metadata to `src/lib/themes.ts` as `THEME_METADATA` record. Updated `ThemeSwitcher.tsx` to use both `AVAILABLE_THEMES` and `THEME_METADATA`.
  - *Issue*: Duplication of theme definitions; adding a new theme requires changes in multiple places.
  - *Action*: Refactor `ThemeSwitcher.tsx` to derive its `themes` array from `AVAILABLE_THEMES` for consistency.

- [x] **UserProfile: Implement Sign-Out Error Notification**: The `handleSignOut` function in `UserProfile.tsx` has a TODO comment for showing a user-facing error notification.
  - *Status*: **RESOLVED** - Added `toast.error()` call using sonner to display error message when sign-out fails.
  - *Issue*: Sign-out errors are only logged to console, not shown to users.
  - *Action*: Use the `toast` component from `sonner` to display an error message when sign-out fails.

- [x] **Remove Unused Imports**: ESLint warns about unused imports in several files.
  - *Status*: **RESOLVED** - Removed unused imports and fixed `any` type warning with proper `Page` type from Playwright.
  - *Affected Files*: `e2e/task-upcoming.spec.ts`, `e2e/visual-regression.spec.ts`, `src/lib/rate-limit.ts`.
  - *Action*: Remove unused imports to clean up warnings.

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
