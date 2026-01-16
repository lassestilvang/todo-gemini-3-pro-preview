# Contributing to Todo Gemini

Thank you for your interest in contributing to Todo Gemini! We welcome contributions from everyone. This document will help you get started.

## 🚀 Getting Started

### Prerequisites

- **Bun**: This project uses [Bun](https://bun.sh/) as the runtime and package manager.
- **Node.js**: Required for some tooling compatibility.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/lassestilvang/todo-gemini-3-pro-preview.git
    cd todo-gemini-3-pro-preview
    ```

2.  **Install dependencies**:
    ```bash
    bun install
    ```

3.  **Environment Setup**:
    Copy `.env.example` to `.env.local` and fill in the required values.
    ```bash
    cp .env.example .env.local
    ```

4.  **Database Setup**:
    Start the local development server (or set up Neon branching).
    ```bash
    bun run db:push
    bun run db:seed
    ```

5.  **Run Development Server**:
    ```bash
    bun dev
    ```

## 🛠️ Development Workflow

### Branching Strategy

We use the [GitHub Flow](https://guides.github.com/introduction/flow/):
- `main` is the production branch.
- Create feature branches from `main`.
- Open a Pull Request (PR) to merge back into `main`.

### Database Changes

We use **Drizzle ORM** for database management.

1.  Modify the schema in `src/db/schema.ts`.
2.  Generate a migration:
    ```bash
    bun run db:generate
    ```
3.  Changes are applied automatically in CI/CD via `bun run db:migrate:ci`.

### Code Style

- **Linting**: We use ESLint. Run `bun run lint` to check your code.
- **Formatting**: We use Prettier (via ESLint config).

### Testing

Please add tests for new features.
- **Unit Tests**: `bun test`
- **E2E Tests**: `bun run test:e2e`

## 📬 Pull Request Process

1.  Ensure all tests pass.
2.  Update documentation if necessary.
3.  Open a PR with a descriptive title and description.
4.  Wait for CI checks to pass (Lint, Test, Build, E2E).

## 🤝 Community

Join our discussions on [GitHub Discussions](https://github.com/lassestilvang/todo-gemini-3-pro-preview/discussions).
