## 2026-04-10 - ⚡ Bolt: Optimize Google Tasks sync concurrency

**Learning:** When optimizing sequential asynchronous operations (e.g., external API syncs) to avoid burst rate limits, `p-limit` provides superior throughput compared to manual array chunking + `Promise.all`. Manual chunking creates uneven execution patterns where the entire batch is gated by the slowest task, leaving concurrency windows unutilized. `p-limit(N)` maintains exactly `N` concurrent operations at all times.

**Action:** Replaced manual array chunking in `src/app/api/google-tasks-sync/route.ts` with `p-limit(5)`. This optimization was already present in `todoist-sync/route.ts` but missing from Google Tasks sync.
