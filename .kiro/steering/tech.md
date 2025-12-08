# Tech Stack

## Core Technologies

- **Runtime**: Bun (package manager, test runner, runtime)
- **Framework**: Next.js 16 with App Router and React 19
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via `better-sqlite3` (file: `sqlite.db`)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (new-york style) with Radix primitives
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Key Libraries

- `@tanstack/react-query` - Data fetching and caching
- `date-fns` - Date manipulation
- `rrule` - Recurring task rules
- `sonner` - Toast notifications
- `recharts` - Analytics charts
- `cmdk` - Command palette
- `next-themes` - Theme management
- `@google/generative-ai` - Gemini AI integration
- `canvas-confetti` - Celebration effects

## Common Commands

```bash
# Development
bun dev              # Start dev server
bun build            # Production build
bun start            # Start production server

# Database
bun run db:push      # Push schema changes to SQLite
bun run db:seed      # Seed database with initial data

# Testing
bun test             # Run all tests
bun test <file>      # Run specific test file

# Linting
bun lint             # Run ESLint
```

## Configuration Files

- `drizzle.config.ts` - Drizzle ORM config (schema at `src/db/schema.ts`)
- `components.json` - shadcn/ui configuration
- `next.config.ts` - Next.js config with PWA and React Compiler enabled
- `tsconfig.json` - TypeScript config with `@/*` path alias to `./src/*`
