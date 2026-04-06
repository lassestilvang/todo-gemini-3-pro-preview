import { performance } from "perf_hooks";

const tasks = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: "Task " + i }));

function measure(name: string, fn: () => void) {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
}

measure("Array.map", () => {
  return tasks.map(t => t.id);
});

measure("Pre-allocated array loop", () => {
  const len = tasks.length;
  const ids = new Array(len);
  for (let i = 0; i < len; i++) {
    ids[i] = tasks[i].id;
  }
  return ids;
});

measure("for...of loop", () => {
  const ids = [];
  for (const t of tasks) {
    ids.push(t.id);
  }
  return ids;
});
