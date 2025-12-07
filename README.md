# Daily Task Planner

A modern, professional daily task planner built with **Next.js 16**, **Bun**, and **SQLite**. Designed for speed, simplicity, and a great user experience.

![CI](https://github.com/lassestilvang/todo-gemini3/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Bun](https://img.shields.io/badge/Bun-1.0+-orange)

## ✨ Features

- **📝 Task Management**: Create, update, delete, and organize tasks effortlessly.
- **📅 Smart Views**:
  - **Inbox**: Capture everything.
  - **Today**: Focus on what matters now.
  - **Next 7 Days**: Plan your week ahead.
  - **Upcoming**: See the big picture.
- **⚡ Fast & Local**: Powered by SQLite and Drizzle ORM for instant interactions.
- **🎨 Modern UI**: Built with **shadcn/ui** and **Tailwind CSS** for a clean, dark-mode aesthetic.
- **🏷️ Organization**: Priority levels, due dates, and completion tracking.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Database**: SQLite (via `better-sqlite3`)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lassestilvang/todo-gemini3.git
   cd todo-gemini3
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Setup the database**:
   Initialize the SQLite database and seed it with default data (Inbox, Labels).
   ```bash
   bun run db:push
   bun run db:seed
   ```

4. **Run the development server**:
   ```bash
   bun dev
   ```

5. **Open the app**:
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── layout/       # Layout components (Sidebar, Main)
│   ├── tasks/        # Task-related components
│   └── ui/           # shadcn/ui primitives
├── db/               # Database schema and connection
├── lib/              # Server actions and utilities
└── ...
```

## 🧪 Running Tests

Run the unit tests for server actions:

```bash
bun test
```

## 📄 License

This project is licensed under the MIT License.
