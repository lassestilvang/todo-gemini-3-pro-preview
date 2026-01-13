# Project Improvements & TODOs

## High Priority (Bugs & Core Issues)

- [ ] **Fix Hydration Mismatch**: A specific hydration warning appears on initial load.
  - *Investigation*: Likely caused by client-side specific rendering (e.g., local storage, window properties) in `MainLayout` or `ThemeProvider` not being guarded by `useEffect` or `suppressHydrationWarning`.
  - *Action*: debug `src/app/layout.tsx` and immediate children.

- [ ] **Fix Search Indexing Latency**: New tasks do not immediately appear in the Command Palette (Cmd+K).
  - *Investigation*: The search component likely relies on a cached list that isn't invalidated or updated upon task creation.
  - *Action*: Ensure `queryClient.invalidateQueries` is called for the search data query when a task is created.

- [ ] **Fix Dialog Accessibility Warnings**: Tests report "Missing `Description` or `aria-describedby`" for `DialogContent`.
  - *Action*: Add `<DialogDescription>` or `aria-describedby` to all Radix UI Dialogs (e.g., `src/components/tasks/TaskDialog.tsx`, `TemplateFormDialog.tsx`).

## UI/UX Polish

- [ ] **Empty States**:
  - *Issue*: Views like "Upcoming" and "Next 7 Days" are blank when empty.
  - *Action*: Create a consistent, friendly empty state component (similar to the one in `TaskListWithSettings` or the Inbox) for all list views.

- [ ] **Navigation Performance**:
  - *Issue*: Noticeable lag when switching views or adding tasks.
  - *Action*: Profile React renders. Check if `TaskListWithSettings` calculation (sorting/filtering) is blocking the main thread or if data fetching is causing waterfalls.

- [ ] **"I'm Behind" Clarity**:
  - *Issue*: The sidebar button is useful but ambiguous.
  - *Action*: Add a tooltip or a clearer label explaining it catches up on overdue tasks.

## Code Quality & Best Practices

- [ ] **Strict Type Checking**: Ensure no implicit `any` usage in new components (lint passed, but worth enforcing strictly).
- [ ] **Component Optimization**:
  - Review `TaskListWithSettings.tsx`: The `applyViewSettings` and `groupTasks` functions run on every render. Ensure `useMemo` dependency arrays are correct and minimal.

## Testing

- [ ] **E2E Test for Task Creation**:
  - *Action*: Add a Playwright test (in `e2e/`) that:
    1. Creates a task "Buy Milk".
    2. Navigates to "Upcoming".
    3. Verifies "Buy Milk" is visible.
- [ ] **Visual Regression (Optional)**: Consider adding visual snapshots for the "Neo-Brutalism" theme to catch contrast regressions.

## Future / Features
- [ ] **Offline Mode Robustness**: Verify `next-pwa` config covers all dynamic routes.
