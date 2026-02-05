import { exportTimeData } from "@/lib/time-export";

type ExportFormat = "json" | "csv";

const userId = process.env.USER_ID;
if (!userId) {
    console.error("Missing USER_ID env var for benchmark-time-export.");
    process.exit(1);
}

const format = (process.env.EXPORT_FORMAT as ExportFormat | undefined) ?? "json";
const startDate = process.env.START_DATE ? new Date(process.env.START_DATE) : undefined;
const endDate = process.env.END_DATE ? new Date(process.env.END_DATE) : undefined;
const taskId = process.env.TASK_ID ? Number(process.env.TASK_ID) : undefined;
const iterations = process.env.ITERATIONS ? Number(process.env.ITERATIONS) : 3;

if (!Number.isFinite(iterations) || iterations <= 0) {
    console.error("ITERATIONS must be a positive number.");
    process.exit(1);
}

const options = {
    format,
    startDate,
    endDate,
    taskId,
    includeTaskDetails: true,
};

const results: number[] = [];

// Warm-up run to reduce first-call overhead from DB connection initialization.
await exportTimeData(userId, options);

for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    const result = await exportTimeData(userId, options);
    const durationMs = performance.now() - start;

    if (!result.success) {
        console.error("Export failed:", result.error);
        process.exit(1);
    }

    results.push(durationMs);
    console.log(`Run ${i + 1}/${iterations}: ${durationMs.toFixed(2)}ms`);
}

const total = results.reduce((sum, value) => sum + value, 0);
const average = total / results.length;
const min = Math.min(...results);
const max = Math.max(...results);

console.log("\nSummary");
console.log(`Average: ${average.toFixed(2)}ms`);
console.log(`Min: ${min.toFixed(2)}ms`);
console.log(`Max: ${max.toFixed(2)}ms`);
