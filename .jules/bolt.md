## 2025-12-31 - Bun Lockfile Churn
**Learning:** Running `bun install` to ensure dependencies are present can implicitly upgrade/pin all dependencies in `bun.lock` if not careful, leading to massive unrelated changes in PRs.
**Action:** After running `bun install` or similar commands, always verify `bun.lock` status and revert if it contains unintended changes, especially when no package versions were explicitly changed in `package.json`.
