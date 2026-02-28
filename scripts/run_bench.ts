// Lightweight benchmark focused on object allocation/serialization overhead.

async function memoryBenchmark() {
    const iterations = 10000;
    const listCount = 100;

    // Simulate full objects (like current implementation)
    const createFullLists = () => Array.from({ length: listCount }, (_, i) => ({
        id: i,
        userId: "user1",
        name: `List ${i}`,
        slug: `list-${i}`,
        position: i,
        createdAt: new Date(),
        updatedAt: new Date(),
        icon: "list",
        color: "blue"
    }));

    // Simulate minimal objects (optimized)
    const createMinimalLists = () => Array.from({ length: listCount }, (_, i) => ({
        id: i,
        name: `List ${i}`
    }));

    console.log("Starting Memory/Allocation Benchmark...");

    const startFull = performance.now();
    for (let i = 0; i < iterations; i++) {
        const data = createFullLists();
        JSON.stringify(data); // Simulate some processing
    }
    const endFull = performance.now();

    const startMinimal = performance.now();
    for (let i = 0; i < iterations; i++) {
        const data = createMinimalLists();
        JSON.stringify(data); // Simulate some processing
    }
    const endMinimal = performance.now();

    console.log(`Full Objects (Simulated DB Fetch): ${(endFull - startFull).toFixed(2)}ms`);
    console.log(`Minimal Objects (Optimized Fetch): ${(endMinimal - startMinimal).toFixed(2)}ms`);
    console.log(`Improvement: ${((endFull - startFull) - (endMinimal - startMinimal)) / (endFull - startFull) * 100}%`);
}

memoryBenchmark();
