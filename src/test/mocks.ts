import { mock } from "bun:test";
import { Database as BunDatabase } from "bun:sqlite";

mock.module("better-sqlite3", () => {
    return {
        default: class Database {
            private db: BunDatabase;

            constructor() {
                this.db = new BunDatabase(":memory:");
            }

            prepare(sql: string) {
                const stmt = this.db.prepare(sql);
                return {
                    get: (...args: unknown[]) => stmt.get(...(args as Parameters<typeof stmt.get>)),
                    all: (...args: unknown[]) => stmt.all(...(args as Parameters<typeof stmt.all>)),
                    run: (...args: unknown[]) => stmt.run(...(args as Parameters<typeof stmt.run>)),
                    values: (...args: unknown[]) => stmt.values(...(args as Parameters<typeof stmt.values>)),
                    raw: () => ({
                        all: (...args: unknown[]) => stmt.values(...(args as Parameters<typeof stmt.values>)),
                        get: (...args: unknown[]) => stmt.values(...(args as Parameters<typeof stmt.values>))[0],
                        run: (...args: unknown[]) => stmt.run(...(args as Parameters<typeof stmt.run>)),
                    }),
                };
            }

            transaction<T>(fn: () => T): T {
                return this.db.transaction(fn)() as T;
            }

            exec(sql: string) {
                this.db.exec(sql);
            }
        }
    };
});

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));
