# Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Redirects to /inbox
│   ├── globals.css         # Global styles and Tailwind
│   ├── [route]/page.tsx    # Route pages (inbox, today, calendar, etc.)
│   └── api/                # API routes (if needed)
│
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, dialog, etc.)
│   ├── layout/             # App shell (MainLayout, AppSidebar)
│   ├── tasks/              # Task-related components
│   │   ├── TaskItem.tsx    # Individual task display
│   │   ├── TaskList.tsx    # Task list container
│   │   ├── TaskDialog.tsx  # Task create/edit modal
│   │   ├── hooks/          # Task-specific hooks
│   │   └── task-dialog/    # Dialog tab components
│   ├── gamification/       # XP bar, achievements, level-up
│   ├── analytics/          # Charts and weekly review
│   ├── calendar/           # Calendar view
│   ├── settings/           # Settings dialog and theme switcher
│   ├── providers/          # React Query provider
│   └── error/              # Error boundary
│
├── db/
│   ├── schema.ts           # Drizzle schema definitions
│   ├── index.ts            # Database connection
│   └── seed.ts             # Initial data seeding
│
├── lib/
│   ├── actions.ts          # Server Actions (CRUD operations)
│   ├── ai-actions.ts       # AI-powered features
│   ├── gamification.ts     # XP/level calculations
│   ├── smart-scheduler.ts  # AI task scheduling
│   ├── smart-tags.ts       # Auto-tagging logic
│   ├── utils.ts            # Utility functions (cn, etc.)
│   └── *.ts                # Other utilities
│
└── test/
    ├── setup.ts            # Test configuration and DB helpers
    └── integration/        # Integration tests
```

## Conventions

- **Server Actions**: All database operations go through `src/lib/actions.ts` using `"use server"`
- **Components**: Use `"use client"` directive only when needed (interactivity, hooks)
- **UI Components**: Located in `src/components/ui/`, follow shadcn/ui patterns
- **Tests**: Co-located with components as `*.test.tsx` files
- **Path Alias**: Use `@/` to import from `src/` (e.g., `@/components/ui/button`)
- **Styling**: Use Tailwind classes with `cn()` utility for conditional classes
