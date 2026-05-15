// Just a simulated test for our own understanding.
// In idb, tx.store.get() returns a Promise.
// Promise.all(items.map(i => tx.store.get(i.id))) creates multiple promises.
// Is it actually slow compared to a loop? No, Promise.all usually triggers internal idb optimization,
// as noted in our bolt.md memory: "To avoid N+1 sequential request stalls in a transaction, parallelize multiple `get` operations using `await Promise.all(ids.map(id => tx.store.get(id)))`. This allows the IndexedDB engine to optimize internal scheduling and significantly reduces cumulative latency..."
