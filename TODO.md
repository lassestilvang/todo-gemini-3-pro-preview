# Project Improvements & TODOs

## 🚨 High Priority (Bugs & Core Issues)

- [x] **[Bug] Fix Sidebar Duplication**: Remove duplicate "Smart Schedule" link in the sidebar.
  - *Status*: **RESOLVED** - Removed redundant "Smart Schedule" button and state from `AppSidebar.tsx`.
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

- [ ] **Calendar View Feature**: Add a visual calendar component for task scheduling and overview.
- [ ] **AI-Powered Task Suggestions**: Leverage Gemini to suggest next tasks based on user habits and patterns.
- [ ] **Internationalization (i18n) Support**: Add language files, locale-switcher, and Next.js i18n routing.
- [ ] **Offline-First Background Sync**: Implement a sync queue (e.g., Workbox or IndexedDB) for offline reliability.
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

- [x] **[UX] Sidebar Identity Section**: Detailed profile view in sidebar footer.
- [x] **[UX] Missing Navigation Links**: Added "Analytics" and "Settings" to sidebar.
- [x] **[UX] "World Class" Page Transitions**: `framer-motion` transitions with custom bezier curves.
- [x] **[UX] Refine Design System**: Refined font weights, contrast, spacing, and border radius.
- [x] **[UX] Sidebar Scroll**: Fixed flexbox layout to allow scrolling on small screens.
- [x] **[UX] Sidebar Pop-in**: Fixed loading skeletons and dynamic imports to prevent layout shift.
- [x] **[UX] Implement 'Synthwave' Theme**: Neon-inspired dark theme with Orbitron font.
- [x] **[UX] Glassmorphism Themes**: Added `glassmorphism` and `glassmorphism-dark` with blur effects.
- [x] **[UX] Onboarding Flow**: Fixed viewport overflow issues for tour tooltips.

## 🛠 Engineering & Quality

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
