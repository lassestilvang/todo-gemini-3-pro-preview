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

3. **Configure the database**:
   Copy the environment template and add your Neon database connection string:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set DATABASE_URL to your Neon connection string
   ```

4. **Setup the database**:
   Push the schema to your Neon database and seed it with default data (Inbox, Labels).
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

## 🗄️ Database Branching

This project uses [Neon's database branching](https://neon.tech/docs/introduction/branching) for isolated development environments. Each Git branch automatically gets its own database branch.

### How It Works

1. **Push a new branch**: When you push a non-main branch to GitHub, a corresponding Neon database branch is automatically created
2. **Isolated environment**: Each branch has its own copy of the database, inheriting data from the main branch
3. **Automatic cleanup**: When a branch is merged or deleted, the corresponding Neon branch is automatically deleted

### Required GitHub Secrets

To enable database branching, configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret | Description | How to Get |
|--------|-------------|------------|
| `NEON_API_KEY` | Neon API key for authentication | [Neon Console](https://console.neon.tech/) → Account Settings → API Keys |
| `NEON_PROJECT_ID` | Your Neon project identifier | [Neon Console](https://console.neon.tech/) → Project Settings → General |

### Local Development with Branches

To work with a specific database branch locally:

1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project and the desired branch
3. Copy the connection string
4. Update your `.env.local`:
   ```bash
   DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
   ```

### Creating Branches Manually

You can also create branches manually via the Neon Console or CLI:

```bash
# Using Neon CLI
neonctl branches create --name feature-xyz --project-id your-project-id
```

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
