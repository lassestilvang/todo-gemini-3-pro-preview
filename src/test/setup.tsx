import { expect, afterEach, mock, beforeEach } from "bun:test";
// GlobalRegistrator is now loaded via register-dom.ts in bunfig.toml
import * as matchers from "@testing-library/jest-dom/matchers";
import { db, sqliteConnection } from "@/db";
import { labels, lists, tasks, timeEntries, templates, userStats, achievements, userAchievements, viewSettings, savedViews, rateLimits, taskDependencies, taskLabels, reminders, habitCompletions, taskLogs, customIcons, externalIntegrations, externalSyncState, externalEntityMap, externalSyncConflicts } from "@/db";
import { getMockAuthUser, resetMockAuthUser } from "./mocks";
import React from "react";
import { cleanup } from "@testing-library/react";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-errors";



// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock PointerEvent methods for Radix UI (if using happy-dom)
if (typeof Element !== 'undefined') {
    if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = () => { };
    }
    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = () => { };
    }
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false;
    }
}

// Set act environment for React 18/19 tests
(global as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock indexedDB for happy-dom/idb tests
const createMockIDBTransaction = () => {
    const listeners: Record<string, ((event: Event) => void)[]> = {};
    const transaction = Object.assign(Object.create((global as unknown as { IDBTransaction: { prototype: object } }).IDBTransaction?.prototype ?? {}), {
        error: null as unknown,
        objectStoreNames: ["store"],
        addEventListener: (type: string, handler: (event: Event) => void) => {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        removeEventListener: (type: string, handler: (event: Event) => void) => {
            listeners[type] = (listeners[type] || []).filter((listener) => listener !== handler);
        },
        dispatchEvent: (event: Event) => {
            const handlers = listeners[event.type] || [];
            handlers.forEach((listener) => listener(event));
            return true;
        },
        objectStore: () => ({
            get: () => createMockIDBRequest(),
            put: () => createMockIDBRequest(),
            add: () => createMockIDBRequest(),
            delete: () => createMockIDBRequest(),
            clear: () => createMockIDBRequest(),
            index: () => ({
                get: () => createMockIDBRequest(),
                getAll: () => createMockIDBRequest(),
            }),
        }),
    });
    return transaction;
};

const createMockIDBRequest = () => {
    const listeners: Record<string, ((event: Event) => void)[]> = {};
    return Object.assign(Object.create((global as unknown as { IDBRequest: { prototype: object } }).IDBRequest?.prototype ?? {}), {
        onerror: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onupgradeneeded: null as ((event: Event) => void) | null,
        result: null as unknown,
        transaction: createMockIDBTransaction() as unknown as IDBTransaction,
        error: null as unknown,
        addEventListener: (type: string, handler: (event: Event) => void) => {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        removeEventListener: (type: string, handler: (event: Event) => void) => {
            listeners[type] = (listeners[type] || []).filter((listener) => listener !== handler);
        },
        dispatchEvent: (event: Event) => {
            const handler = listeners[event.type] || [];
            handler.forEach((listener) => listener(event));
            return true;
        },
    });
};

// Mock sonner globally
mock.module("sonner", () => ({
    toast: {
        success: mock(() => { }),
        error: mock(() => { }),
        info: mock(() => { }),
        warning: mock(() => { }),
        message: mock(() => { }),
        promise: mock(() => { }),
        custom: mock(() => { }),
        dismiss: mock(() => { }),
    },
}));

mock.module("idb", () => {
    const createTransaction = () => ({
        store: {
            put: async () => undefined,
            delete: async () => undefined,
            get: async () => undefined,
            getAll: async () => [],
            getAllFromIndex: async () => [],
        },
        done: Promise.resolve(),
    });

    const db = {
        transaction: () => createTransaction(),
        getAll: async () => [],
        getAllFromIndex: async () => [],
        get: async () => undefined,
        put: async () => undefined,
        delete: async () => undefined,
    };

    return {
        openDB: async () => db,
    };
});

const createMockIDBDatabase = () => Object.assign(
    Object.create((global as unknown as { IDBDatabase: { prototype: object } }).IDBDatabase?.prototype ?? {}),
    {
        close: () => { },
        addEventListener: () => { },
        transaction: () => createMockIDBTransaction(),
        getAll: async () => [],
        getAllFromIndex: async () => [],
        get: async () => undefined,
        put: async () => undefined,
        delete: async () => undefined,
    }
);

if (!global.IDBRequest) {
    class MockIDBRequest { }
    (global as unknown as { IDBRequest: unknown }).IDBRequest = MockIDBRequest;
}

if (!global.IDBTransaction) {
    class MockIDBTransaction { }
    (global as unknown as { IDBTransaction: unknown }).IDBTransaction = MockIDBTransaction;
}

if (!global.IDBDatabase) {
    class MockIDBDatabase { }
    (global as unknown as { IDBDatabase: unknown }).IDBDatabase = MockIDBDatabase;
}

if (!global.IDBObjectStore) {
    class MockIDBObjectStore { }
    (global as unknown as { IDBObjectStore: unknown }).IDBObjectStore = MockIDBObjectStore;
}

if (!global.IDBIndex) {
    class MockIDBIndex { }
    (global as unknown as { IDBIndex: unknown }).IDBIndex = MockIDBIndex;
}

if (!global.IDBCursor) {
    class MockIDBCursor { }
    (global as unknown as { IDBCursor: unknown }).IDBCursor = MockIDBCursor;
}

global.indexedDB = {
    open: () => {
        const request = createMockIDBRequest() as unknown as IDBOpenDBRequest;
        setTimeout(() => {
            const db = createMockIDBDatabase();
            Object.defineProperty(request, 'result', { value: db as unknown as IDBDatabase, writable: true });
            const event = { target: request, oldVersion: 0, newVersion: 1 } as unknown as Event;
            if (request.onupgradeneeded) {
                (request.onupgradeneeded as (this: IDBOpenDBRequest, ev: Event) => unknown).call(request, event);
            }
            if (request.onsuccess) {
                (request.onsuccess as (this: IDBOpenDBRequest, ev: Event) => unknown).call(request, event);
            }
            if (typeof request.dispatchEvent === "function") {
                request.dispatchEvent(event);
            }
            if (typeof request.dispatchEvent === "function") {
                request.dispatchEvent({ type: "success" } as Event);
            }
        }, 0);
        return request;
    },
    deleteDatabase: () => createMockIDBRequest() as unknown as IDBOpenDBRequest,
} as unknown as IDBFactory;

// Mock PointerEvent and Element pointer methods
if (!global.PointerEvent) {
    class MockPointerEvent extends Event {
        button: number;
        ctrlKey: boolean;
        shiftKey: boolean;
        altKey: boolean;
        metaKey: boolean;
        key: string;
        keyCode: number;
        clientX: number;
        clientY: number;
        screenX: number;
        screenY: number;
        pageX: number;
        pageY: number;
        pointerId: number;
        pointerType: string;
        isPrimary: boolean;
        pressure: number;

        constructor(type: string, props: PointerEventInit = {}) {
            super(type, props);
            this.button = props.button || 0;
            this.ctrlKey = props.ctrlKey || false;
            this.shiftKey = props.shiftKey || false;
            this.altKey = props.altKey || false;
            this.metaKey = props.metaKey || false;
            this.key = (props as PointerEventInit & { key?: string }).key || "";
            this.keyCode = (props as PointerEventInit & { keyCode?: number }).keyCode || 0;
            this.clientX = props.clientX || 0;
            this.clientY = props.clientY || 0;
            this.screenX = props.screenX || 0;
            this.screenY = props.screenY || 0;
            this.pageX = (props as PointerEventInit & { pageX?: number }).pageX || 0;
            this.pageY = (props as PointerEventInit & { pageY?: number }).pageY || 0;
            this.pointerId = props.pointerId || 0;
            this.pointerType = props.pointerType || "mouse";
            this.isPrimary = props.isPrimary || false;
            this.pressure = props.pressure || 0;
        }
    }
    (global as unknown as { PointerEvent: unknown }).PointerEvent = MockPointerEvent;
}

if (!global.Element.prototype.setPointerCapture) {
    global.Element.prototype.setPointerCapture = () => { };
}
if (!global.Element.prototype.releasePointerCapture) {
    global.Element.prototype.releasePointerCapture = () => { };
}
if (!global.Element.prototype.hasPointerCapture) {
    global.Element.prototype.hasPointerCapture = () => false;
}
// Mock scrollIntoView
if (!global.Element.prototype.scrollIntoView) {
    global.Element.prototype.scrollIntoView = () => { };
}

// Silence logs globally to prevent terminal buffer deadlocks in high-concurrency mode
// console.log = () => { };
// console.warn = () => { };
// console.error = () => { };

// Mock SyncProvider
mock.module("@/components/providers/sync-provider", () => ({
    SyncProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useSync: () => ({
        isOnline: true,
        lastSynced: new Date(),
        sync: mock(() => Promise.resolve()),
        pendingCount: 0,
        dispatch: mock(() => Promise.resolve({ success: true, data: null })),
        pendingActions: [],
        status: 'online' as const,
        conflicts: [],
        resolveConflict: mock(() => Promise.resolve()),
    }),
    useOptionalSync: () => ({
        dispatch: mock(() => Promise.resolve({ success: true, data: null })),
    }),
}));

// Traditional auth mock for broad support across all test types
mock.module("@/lib/auth", () => ({
    getCurrentUser: mock(async () => {
        const user = getMockAuthUser();
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.profilePictureUrl,
            use24HourClock: false,
            weekStartsOnMonday: false,
            calendarUseNativeTooltipsOnDenseDays: true,
            calendarDenseTooltipThreshold: 6,
        };
    }),
    requireAuth: mock(async () => {
        const user = getMockAuthUser();
        if (!user) throw new UnauthorizedError();
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.profilePictureUrl,
            use24HourClock: false,
            weekStartsOnMonday: false,
            calendarUseNativeTooltipsOnDenseDays: true,
            calendarDenseTooltipThreshold: 6,
        };
    }),
    requireUser: mock(async (userId: string) => {
        const user = getMockAuthUser();
        // Add logging for debugging CI failures
        // console.log(`[requireUser Mock] userId=${userId}, current mock user=${user?.id}`);
        if (!user) throw new UnauthorizedError();
        if (user.id !== userId) {
            // console.log(`[requireUser Mock] Forbidden: user.id=${user.id} !== userId=${userId}`);
            const err = new ForbiddenError("Forbidden");
            Object.defineProperty(err, 'name', { value: 'ForbiddenError', enumerable: true });
            throw err;
        }
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.profilePictureUrl,
            use24HourClock: false,
            weekStartsOnMonday: false,
            calendarUseNativeTooltipsOnDenseDays: true,
            calendarDenseTooltipThreshold: 6,
        };
    }),
    requireResourceOwnership: mock(async (resourceUserId: string, authUserId: string) => {
        if (resourceUserId !== authUserId) {
            const err = new ForbiddenError("Forbidden");
            Object.defineProperty(err, 'name', { value: 'ForbiddenError', enumerable: true });
            throw err;
        }
    }),
    signOut: mock(async () => { }),
    syncUser: mock(async (workosUser: { id: string; email: string; firstName?: string | null; lastName?: string | null; profilePictureUrl?: string | null }) => ({
        id: workosUser.id,
        email: workosUser.email,
        firstName: workosUser.firstName ?? null,
        lastName: workosUser.lastName ?? null,
        avatarUrl: workosUser.profilePictureUrl ?? null,
        use24HourClock: false,
        weekStartsOnMonday: false,
        calendarUseNativeTooltipsOnDenseDays: true,
        calendarDenseTooltipThreshold: 6,
    })),
    checkResourceOwnership: mock(async (resourceUserId: string | null | undefined, authenticatedUserId: string) => {
        if (!resourceUserId) return false;
        return resourceUserId === authenticatedUserId;
    }),
}));

// Note: Tests are responsible for setting auth context explicitly.

let testMutex = Promise.resolve();

beforeEach(async () => {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
        release = resolve;
    });
    const previous = testMutex;
    testMutex = next;
    await previous;
    (globalThis as { __testMutexRelease?: () => void }).__testMutexRelease = release!;
});

let isDbSetup = false;

// Mock next/cache
mock.module("next/cache", () => ({
    unstable_cache: <T,>(fn: T) => fn,
    revalidateTag: mock(() => { }),
    revalidatePath: mock(() => { }),
}));

/**
 * Setup the SQLite database schema for tests.
 */
export async function setupTestDb() {
    if (isDbSetup) return;
    isDbSetup = true;

    sqliteConnection.run("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL, first_name TEXT, last_name TEXT, avatar_url TEXT, is_initialized INTEGER NOT NULL DEFAULT 0, use_24h_clock INTEGER, week_starts_on_monday INTEGER, calendar_use_native_tooltips_on_dense_days INTEGER, calendar_dense_tooltip_threshold INTEGER, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS lists(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT DEFAULT '#000000', icon TEXT, slug TEXT NOT NULL, description TEXT, position INTEGER DEFAULT 0 NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, icon TEXT, priority TEXT DEFAULT 'none', due_date INTEGER, due_date_precision TEXT, is_completed INTEGER DEFAULT 0, completed_at INTEGER, is_recurring INTEGER DEFAULT 0, recurring_rule TEXT, parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, estimate_minutes INTEGER, position INTEGER DEFAULT 0 NOT NULL, actual_minutes INTEGER, energy_level TEXT, context TEXT, is_habit INTEGER DEFAULT 0, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')), deadline INTEGER);");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS labels(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT DEFAULT '#000000', icon TEXT, description TEXT, position INTEGER DEFAULT 0 NOT NULL);");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS task_labels(task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE, PRIMARY KEY(task_id, label_id));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS reminders(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, remind_at INTEGER NOT NULL, is_sent INTEGER DEFAULT 0, created_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS task_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE, label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE, action TEXT NOT NULL, details TEXT, created_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS habit_completions(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, completed_at INTEGER NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS task_dependencies(task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, blocker_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, PRIMARY KEY(task_id, blocker_id));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS templates(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS user_stats(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, last_login INTEGER, current_streak INTEGER NOT NULL DEFAULT 0, longest_streak INTEGER NOT NULL DEFAULT 0, streak_freezes INTEGER NOT NULL DEFAULT 0);");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS achievements(id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL, condition_type TEXT NOT NULL, condition_value INTEGER NOT NULL, xp_reward INTEGER NOT NULL);");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS user_achievements(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE, unlocked_at INTEGER DEFAULT(strftime('%s', 'now')), PRIMARY KEY(user_id, achievement_id));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS view_settings(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, view_id TEXT NOT NULL, layout TEXT DEFAULT 'list', show_completed INTEGER DEFAULT 1, group_by TEXT DEFAULT 'none', sort_by TEXT DEFAULT 'manual', sort_order TEXT DEFAULT 'asc', filter_date TEXT DEFAULT 'all', filter_priority TEXT, filter_label_id INTEGER, filter_energy_level TEXT, filter_context TEXT, updated_at INTEGER DEFAULT(strftime('%s', 'now')), PRIMARY KEY(user_id, view_id));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS saved_views(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, icon TEXT, settings TEXT NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, last_request INTEGER NOT NULL DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS time_entries(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, started_at INTEGER NOT NULL, ended_at INTEGER, duration_minutes INTEGER, notes TEXT, is_manual INTEGER DEFAULT 0, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS custom_icons(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, url TEXT NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS external_integrations(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, access_token_encrypted TEXT NOT NULL, access_token_iv TEXT NOT NULL, access_token_tag TEXT NOT NULL, access_token_key_id TEXT NOT NULL DEFAULT 'default', refresh_token_encrypted TEXT, refresh_token_iv TEXT, refresh_token_tag TEXT, scopes TEXT, expires_at INTEGER, metadata TEXT, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS external_sync_state(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, sync_token TEXT, last_synced_at INTEGER, status TEXT DEFAULT 'idle' NOT NULL, error TEXT, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS external_entity_map(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, entity_type TEXT NOT NULL, local_id INTEGER, external_id TEXT NOT NULL, external_parent_id TEXT, external_etag TEXT, external_updated_at INTEGER, deleted_at INTEGER, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS external_sync_conflicts(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, entity_type TEXT NOT NULL, local_id INTEGER, external_id TEXT, conflict_type TEXT NOT NULL, local_payload TEXT, external_payload TEXT, status TEXT DEFAULT 'pending' NOT NULL, resolution TEXT, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')), resolved_at INTEGER);");
    sqliteConnection.run("CREATE UNIQUE INDEX IF NOT EXISTS external_integrations_provider_user_unique ON external_integrations(user_id, provider);");
    sqliteConnection.run("CREATE UNIQUE INDEX IF NOT EXISTS external_sync_state_provider_user_unique ON external_sync_state(user_id, provider);");
    sqliteConnection.run("CREATE UNIQUE INDEX IF NOT EXISTS external_entity_map_provider_entity_unique ON external_entity_map(user_id, provider, entity_type, external_id);");

    // Add indexes manually since we're not running migrations in test setup
    sqliteConnection.run("CREATE INDEX IF NOT EXISTS tasks_all_view_idx ON tasks(user_id, is_completed, position);");
}

/**
 * Helper to create a test user in the SQLite database.
 */
export async function createTestUser(id: string, email: string) {
    sqliteConnection.run("INSERT INTO users (id, email, first_name, last_name) VALUES (?, ?, 'Test', 'User') ON CONFLICT(id) DO UPDATE SET email=excluded.email", [id, email]);
    return { id, email, firstName: "Test", lastName: "User" };
}

/**
 * Reset database tables for test isolation.
 */
let resetQueue = Promise.resolve();

export async function resetTestDb() {
    // Ensure mock auth is cleared before resetting DB
    resetMockAuthUser();

    resetQueue = resetQueue.then(async () => {
        try {
            // Turn off FKs to speed up and simplify deletion
            sqliteConnection.run("PRAGMA foreign_keys = OFF;");

            await Promise.all([
                db.delete(timeEntries),
                db.delete(savedViews),
                db.delete(userAchievements),
                db.delete(achievements),
                db.delete(viewSettings),
                db.delete(userStats),
                db.delete(taskLogs),
                db.delete(reminders),
                db.delete(habitCompletions),
                db.delete(taskDependencies),
                db.delete(taskLabels),
                db.delete(tasks),
                db.delete(labels),
                db.delete(lists),
                db.delete(templates),
                db.delete(rateLimits),
                db.delete(customIcons),
                db.delete(externalSyncConflicts),
                db.delete(externalEntityMap),
                db.delete(externalSyncState),
                db.delete(externalIntegrations)
            ]);

            // Delete users last using direct SQL for performance
            sqliteConnection.run("DELETE FROM users");

            // Re-enable FKs
            sqliteConnection.run("PRAGMA foreign_keys = ON;");
        } catch (e) {
            console.error("Failed to reset test DB:", e);
        }
    });
    await resetQueue;
}

afterEach(() => {
    const release = (globalThis as { __testMutexRelease?: () => void }).__testMutexRelease;
    if (release) {
        release();
        (globalThis as { __testMutexRelease?: () => void }).__testMutexRelease = undefined;
    }

    try {
        cleanup();
    } catch { }

    if (typeof document !== 'undefined') {
        document.body.innerHTML = "";
    }

    resetMockAuthUser();
});

// Run setup immediately
setupTestDb();
