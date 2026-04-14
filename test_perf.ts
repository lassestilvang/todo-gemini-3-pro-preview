import { run, bench, group } from "mitata";

const promises = new Array(100);
for(let i=0; i<100; i++) {
    promises[i] = Promise.resolve();
}

group("Sequential vs Concurrent db updates", () => {
    bench("Sequential", async () => {
        for(let i=0; i<100; i++) {
            await Promise.resolve(); // Simulate db.update()
        }
    });

    bench("Concurrent", async () => {
        const updatePromises: Promise<any>[] = [];
        for(let i=0; i<100; i++) {
            updatePromises.push(Promise.resolve());
        }
        await Promise.all(updatePromises);
    });
});

await run();
