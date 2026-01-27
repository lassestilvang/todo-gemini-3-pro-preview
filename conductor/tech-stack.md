# Technology Stack - Todo Gemini

## Core Framework & Runtime
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) - Utilizing Server Components, Server Actions, and the latest routing capabilities.
- **Runtime:** [Bun](https://bun.sh/) - High-performance JavaScript runtime, package manager, and test runner.

## Data & Storage
- **Database:** [Neon PostgreSQL](https://neon.tech/) - Serverless Postgres with automatic branching for isolated development/preview environments.
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) - Type-safe, lightweight ORM for PostgreSQL and SQLite (used for in-memory testing).

## Authentication & Security
- **Provider:** [WorkOS AuthKit](https://workos.com/docs/user-management) - Secure user management, social login, and session handling for Next.js.

## Frontend & UI
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS framework for modern, responsive designs.
- **Components:** [shadcn/ui](https://ui.shadcn.com/) - Reusable UI primitives built on top of Radix UI.
- **Animations:** [Framer Motion](https://www.framer.com/motion/) - For fluid transitions and gamification feedback.

## AI & Intelligence
- **LLM:** [Google Generative AI (Gemini)](https://ai.google.dev/) - Powering smart scheduling, task suggestions, and NLP features.

## Testing & Quality
- **Unit/Integration:** Bun's built-in test runner with `bun:sqlite` for fast in-memory database testing.
- **End-to-End:** [Playwright](https://playwright.dev/) - For comprehensive cross-browser testing of user flows.
