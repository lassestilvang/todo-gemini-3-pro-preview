// Micro-benchmark for data processing overhead
// Simulates the difference between fetching full rows vs specific columns

const ITERATIONS = 100000;
const LIST_COUNT = 50;
const LABEL_COUNT = 50;

// Simulate a full DB row
const createFullList = (i: number) => ({
    id: i,
    userId: "user_123456789",
    name: `List ${i}`,
    slug: `list-${i}`,
    position: i,
    icon: "list-icon",
    color: "#ff0000",
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
    description: "A very long description that might be fetched unnecessarily if we select * from the database."
});

// Simulate an optimized minimal object
const createMinimalList = (i: number) => ({
    id: i,
    name: `List ${i}`
});

console.log(`Starting benchmark: ${ITERATIONS} iterations, ${LIST_COUNT} items per list...`);

// 1. Measure "Full Fetch" Simulation
const startFull = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    // Simulate DB fetch allocation
    const lists = Array.from({ length: LIST_COUNT }, (_, idx) => createFullList(idx));
    // Simulate JSON serialization for LLM prompt (common in smart tags)
    JSON.stringify(lists);
}
const endFull = performance.now();
const durationFull = endFull - startFull;

// 2. Measure "Optimized Fetch" Simulation
const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    // Simulate DB fetch allocation (minimal)
    const lists = Array.from({ length: LIST_COUNT }, (_, idx) => createMinimalList(idx));
    // Simulate JSON serialization for LLM prompt
    JSON.stringify(lists);
}
const endOpt = performance.now();
const durationOpt = endOpt - startOpt;

console.log("-".repeat(40));
console.log(`Full Fetch Duration:      ${durationFull.toFixed(2)}ms`);
console.log(`Optimized Fetch Duration: ${durationOpt.toFixed(2)}ms`);
console.log(`Speedup:                  ${(durationFull / durationOpt).toFixed(2)}x`);
console.log("-".repeat(40));
