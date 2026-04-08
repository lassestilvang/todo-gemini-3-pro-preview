import { db, taskLabels, tasks, schema } from "./src/db";
import { inArray, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Ensure tables are created in SQLite
if (process.env.NODE_ENV === "test") {
  const { sqliteConnection } = await import("./src/db");
  sqliteConnection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      list_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      priority TEXT DEFAULT 'none',
      due_date INTEGER,
      due_date_precision TEXT,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      is_recurring INTEGER DEFAULT 0,
      recurring_rule TEXT,
      parent_id INTEGER,
      estimate_minutes INTEGER,
      position INTEGER DEFAULT 0 NOT NULL,
      actual_minutes INTEGER,
      energy_level TEXT,
      context TEXT,
      is_habit INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      deadline INTEGER
    );
    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, label_id)
    );
  `);
}

async function fetchTaskLabelsBaseline(taskIds: number[]) {
  if (taskIds.length === 0) {
    return new Map<number, number[]>();
  }

  const rows = await db
    .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
    .from(taskLabels)
    .where(inArray(taskLabels.taskId, taskIds));

  const map = new Map<number, number[]>();
  for (const row of rows) {
    const current = map.get(row.taskId) ?? [];
    current.push(row.labelId);
    map.set(row.taskId, current);
  }

  return map;
}

// Memory cache to mimic optimized version
const taskLabelCache = new Map<number, number[]>();

async function fetchTaskLabelsOptimized(taskIds: number[], cache = taskLabelCache) {
  if (taskIds.length === 0) {
    return new Map<number, number[]>();
  }

  const result = new Map<number, number[]>();
  const missingIds: number[] = [];

  for (const id of taskIds) {
    const cached = cache.get(id);
    if (cached) {
      result.set(id, [...cached]); // copy to avoid mutation issues
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const rows = await db
      .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
      .from(taskLabels)
      .where(inArray(taskLabels.taskId, missingIds));

    for (const id of missingIds) {
      result.set(id, []);
      cache.set(id, []);
    }

    for (const row of rows) {
      const current = result.get(row.taskId)!;
      current.push(row.labelId);
      const cached = cache.get(row.taskId)!;
      cached.push(row.labelId);
    }
  }

  return result;
}

async function run() {
  const dummyUserId = randomUUID();

  console.log("Seeding tasks...");
  const insertedTasks = await db.insert(tasks).values(
    Array.from({ length: 500 }, (_, i) => ({
      userId: dummyUserId,
      title: `Task ${i}`,
      position: i
    }))
  ).returning({ id: tasks.id });

  const taskIds = insertedTasks.map((t: any) => t.id);

  // Seed some labels
  const labelsToInsert = taskIds.flatMap((id: number, index: number) => {
    return [
      { taskId: id, labelId: index % 5 },
      { taskId: id, labelId: (index % 5) + 1 }
    ];
  });

  await db.insert(taskLabels).values(labelsToInsert);

  console.log("Running baseline (no cache)...");
  const startBaseline = performance.now();
  for (let i = 0; i < 50; i++) {
    await fetchTaskLabelsBaseline(taskIds);
  }
  const endBaseline = performance.now();
  console.log(`Baseline (50 runs, 500 IDs each): ${(endBaseline - startBaseline).toFixed(2)}ms`);

  console.log("Running optimized (with cache)...");
  taskLabelCache.clear(); // Clear cache
  const startOptimized = performance.now();
  for (let i = 0; i < 50; i++) {
    await fetchTaskLabelsOptimized(taskIds);
  }
  const endOptimized = performance.now();
  console.log(`Optimized (50 runs, 500 IDs each): ${(endOptimized - startOptimized).toFixed(2)}ms`);

  process.exit(0);
}

run().catch(console.error);
