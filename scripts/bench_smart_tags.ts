import { db, lists, labels, eq } from "@/db";
import { getListsInternal, getLabelsInternal } from "@/lib/actions";
import { suggestMetadata } from "@/lib/smart-tags";

// Mock implementation of current suggestMetadata (fetching full data)
async function currentSuggestMetadata(userId: string, taskTitle: string) {
    // Current behavior: Fetch *all* lists and labels with full fields
    const allLists = await getListsInternal(userId);
    const allLabels = await getLabelsInternal(userId);

    // Simulate processing (simplified)
    return suggestMetadata(taskTitle, allLists, allLabels);
}

// Mock implementation of optimized suggestMetadata (fetching minimal data)
async function optimizedSuggestMetadata(userId: string, taskTitle: string) {
    // Optimized: Fetch only IDs and names
    const minimalLists = await db
        .select({ id: lists.id, name: lists.name })
        .from(lists)
        .where(eq(lists.userId, userId));

    const minimalLabels = await db
        .select({ id: labels.id, name: labels.name })
        .from(labels)
        .where(eq(labels.userId, userId));

    // Simulate processing (reuse existing logic but with minimal data)
    return suggestMetadata(taskTitle, minimalLists as any, minimalLabels as any);
}

async function runBenchmark() {
    console.log("Starting Benchmark...");

    // Setup dummy user and data
    const userId = "bench_user_" + Math.random().toString(36).substring(7);

    // Create 50 lists
    const listPromises = [];
    for (let i = 0; i < 50; i++) {
        listPromises.push(db.insert(lists).values({
            userId,
            name: `List ${i}`,
            slug: `list-${i}`,
            position: i
        }));
    }
    await Promise.all(listPromises);

    // Create 50 labels
    const labelPromises = [];
    for (let i = 0; i < 50; i++) {
        labelPromises.push(db.insert(labels).values({
            userId,
            name: `Label ${i}`,
            position: i
        }));
    }
    await Promise.all(labelPromises);

    const iterations = 100;

    // Measure Current Implementation
    const startCurrent = performance.now();
    for (let i = 0; i < iterations; i++) {
        await currentSuggestMetadata(userId, "Buy groceries");
    }
    const endCurrent = performance.now();
    const durationCurrent = endCurrent - startCurrent;

    // Measure Optimized Implementation
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
        await optimizedSuggestMetadata(userId, "Buy groceries");
    }
    const endOptimized = performance.now();
    const durationOptimized = endOptimized - startOptimized;

    console.log(`Current (Fetch All): ${durationCurrent.toFixed(2)}ms`);
    console.log(`Optimized (Fetch Minimal): ${durationOptimized.toFixed(2)}ms`);
    console.log(`Improvement: ${((durationCurrent - durationOptimized) / durationCurrent * 100).toFixed(2)}%`);

    // Cleanup
    await db.delete(lists).where(eq(lists.userId, userId));
    await db.delete(labels).where(eq(labels.userId, userId));
}

runBenchmark();
