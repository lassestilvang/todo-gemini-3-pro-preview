# Daily Task Planner

A modern, professional daily task planner built with **Next.js 16**, **Bun**, and **Neon PostgreSQL**. Designed for speed, simplicity, and a great user experience.

![CI](https://github.com/lassestilvang/todo-gemini-3-pro-preview/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Bun](https://img.shields.io/badge/Bun-1.0+-orange)
![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green)

## ✨ Features

- **📝 Task Management**: Create, update, delete, and organize tasks effortlessly.
- **📅 Smart Views**:
  - **Inbox**: Capture everything.
  - **Today**: Focus on what matters now.
  - **Next 7 Days**: Plan your week ahead.
  - **Upcoming**: See the big picture.
- **⚡ Fast & Serverless**: Powered by Neon PostgreSQL and Drizzle ORM for instant interactions.
- **🎨 Modern UI**: Built with **shadcn/ui** and **Tailwind CSS** for a clean, dark-mode aesthetic.
- **🏷️ Organization**: Priority levels, due dates, and completion tracking.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Database**: [Neon PostgreSQL](https://neon.tech/) (serverless)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [WorkOS AuthKit](https://workos.com/docs/user-management)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lassestilvang/todo-gemini-3-pro-preview.git
   cd todo-gemini-3-pro-preview
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment variables**:
   Copy the environment template and configure your settings:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and set the following:
   ```bash
   # Database (Neon PostgreSQL)
   DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
   
   # Authentication (WorkOS AuthKit)
   WORKOS_API_KEY=sk_...
   WORKOS_CLIENT_ID=client_...
   WORKOS_COOKIE_PASSWORD=your-32-character-or-longer-password
   NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

4. **Setup the database**:
   Apply migrations to your Neon database and seed it with default data.
   ```bash
   bun run db:migrate
   bun run db:seed
   ```
   
   Or for interactive development (auto-detects schema changes):
   ```bash
   bun run db:push
   bun run db:seed
   ```

5. **Run the development server**:
   ```bash
   bun dev
   ```

6. **Verify Installation**:
   Ensure everything is running correctly by verifying:
   - The app loads at http://localhost:3000
   - You can create a new task
   - The "Inbox" list is visible

## 🔐 Authentication

This app uses [WorkOS AuthKit](https://workos.com/docs/user-management) for authentication, providing:

- Email/password authentication
- Social login (Google, GitHub, etc.)
- Enterprise SSO support
- Secure session management

### Setting Up WorkOS

1. Create a [WorkOS account](https://dashboard.workos.com/signup)
2. Create a new project in the WorkOS dashboard
3. Enable "AuthKit" in your project settings
4. Configure redirect URIs in the WorkOS dashboard (Redirects section):
   - `http://localhost:3000/auth/callback` (local development)
   - `https://your-production-domain.com/auth/callback` (production)
   - `https://*.vercel.app/auth/callback` (Vercel preview deployments - wildcard)
5. Copy your API key and Client ID to `.env.local`
6. Generate a secure cookie password (32+ characters) for `WORKOS_COOKIE_PASSWORD`

### Dynamic Redirect URI for Vercel

The app automatically handles redirect URIs for different environments:

- **Local development**: Uses `NEXT_PUBLIC_WORKOS_REDIRECT_URI` from `.env.local`
- **Vercel preview deployments**: Automatically uses `VERCEL_URL` to construct the redirect URI
- **Production**: Set `NEXT_PUBLIC_WORKOS_REDIRECT_URI` in Vercel environment variables

This is configured in `next.config.ts` and requires no additional setup for preview deployments.

### Authentication Flow

- Unauthenticated users are redirected to `/login`
- After successful authentication, users are redirected to `/inbox`
- Each user has isolated data (tasks, lists, labels, etc.)
- User profile and sign-out available in the sidebar

## 🗄️ Database Branching

This project uses [Neon's database branching](https://neon.tech/docs/introduction/branching) for isolated development environments via the **Vercel + Neon integration**.

### How It Works

Database branching is automatically managed by the [Neon Vercel Integration](https://neon.tech/docs/guides/vercel):

1. **Create a preview deployment**: When you push a branch or open a PR, Vercel creates a preview deployment with its own Neon database branch
2. **Isolated environment**: Each preview has its own copy of the database, inheriting data from the main branch
3. **Automatic cleanup**: When the preview is removed, the corresponding Neon branch is automatically deleted

### Setup

The Vercel + Neon integration handles database branching automatically. To enable:

1. Connect your Neon project to Vercel via the [Neon Vercel Integration](https://vercel.com/integrations/neon)
2. Enable "Create a branch for each preview deployment" in the integration settings
3. Add these GitHub secrets for CI migrations:
   - `NEON_API_KEY` - From Neon dashboard → Account Settings → API Keys
   - `NEON_PROJECT_ID` - From your Neon project settings
   - `DATABASE_URL` - Main branch connection string
4. That's it! Preview deployments will automatically get isolated database branches with migrations applied

### Local Development with Branches

To work with a specific database branch locally:

1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project and the desired branch
3. Copy the connection string
4. Update your `.env.local`:
   ```bash
   DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
   ```

## 🔄 Database Migrations

This project uses [Drizzle migrations](https://orm.drizzle.team/docs/migrations) for schema changes.

### Making Schema Changes

```bash
# 1. Edit the schema
#    Modify src/db/schema.ts

# 2. Generate a migration
bun run db:generate

# 3. Apply the migration locally
bun run db:migrate

# 4. Commit the migration files
git add drizzle/*.sql drizzle/meta/
git commit -m "Add migration for schema changes"
```

### Available Commands

| Command | Description |
|---------|-------------|
| `bun run db:push` | Interactive schema push (local dev) |
| `bun run db:generate` | Generate migration from schema changes |
| `bun run db:migrate` | Apply migrations locally |
| `bun run db:migrate:ci` | Apply migrations in CI (used by GitHub Actions) |
| `bun run db:seed` | Seed database with default data |

### CI/CD

Migrations are automatically applied in CI:
- **Pull requests**: Migrations run against the Neon preview branch
- **Main branch**: Migrations run against the production database

The `db:migrate:ci` script handles both fresh databases and existing ones that predate the migration system.

## 🧪 Running Tests

We use `bun test` for running unit and integration tests.

```bash
# Run all tests
bun test

# Run specific test file
bun test src/components/tasks/TaskDialog.test.tsx
```

## 📂 Project Structure

src/
├── app/                  # Next.js App Router pages (routes)
│   ├── (dashboard)/      # Dashboard routes (inbox, today, etc.)
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── gamification/     # XP, Achievements, Streaks
│   ├── layout/           # App shell (Sidebar, Main content area)
│   ├── tasks/            # Task management (Dialogs, Lists, Items)
│   ├── settings/         # User settings
│   └── ui/               # Reusable primitives (shadcn/ui)
├── db/                   # Database configuration
│   ├── schema.ts         # Drizzle ORM schema definitions
│   └── seed.ts           # Initial data seeding script
├── lib/                  # Utilities and core logic
│   ├── actions.ts        # Server Actions (CRUD operations)
│   ├── hooks/            # Custom React hooks
│   └── smart-scheduler.ts # AI task scheduling logic
└── ...

## 🧪 Running Tests

Run the unit tests for server actions:

```bash
bun test
```

## 📄 License

This project is licensed under the MIT License.
