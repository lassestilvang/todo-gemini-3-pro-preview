import { expect, afterEach, mock, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { sqliteConnection } from "@/db";
import { getMockAuthUser, clearMockAuthUser } from "./mocks";
import React from "react";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-errors";

// Register happy-dom for component testing
GlobalRegistrator.register();

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

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
    (global as typeof globalThis & { PointerEvent: typeof MockPointerEvent }).PointerEvent = MockPointerEvent;
}

if (!global.Element.prototype.setPointerCapture) {
    global.Element.prototype.setPointerCapture = () => {};
}
if (!global.Element.prototype.releasePointerCapture) {
    global.Element.prototype.releasePointerCapture = () => {};
}
if (!global.Element.prototype.hasPointerCapture) {
    global.Element.prototype.hasPointerCapture = () => false;
}
// Mock scrollIntoView
if (!global.Element.prototype.scrollIntoView) {
    global.Element.prototype.scrollIntoView = () => {};
}

import { DEFAULT_MOCK_USER, setMockAuthUser } from "./mocks";

beforeEach(() => {
    setMockAuthUser(DEFAULT_MOCK_USER);
});

// Comprehensive mock for authentication
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
        if (!user) {
            throw new UnauthorizedError();
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
    requireUser: mock(async (userId: string) => {
        const user = getMockAuthUser();
        if (!user) {
            throw new UnauthorizedError();
        }
        if (user.id !== userId) {
            const err = new ForbiddenError("You are not authorized to access this user's data");
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
    syncUser: mock((user: { id: string; email: string }) => Promise.resolve({
        id: user.id,
        email: user.email,
    })),
    signOut: mock(() => Promise.resolve()),
    checkResourceOwnership: mock((resourceUserId: string, authUserId: string) => Promise.resolve(resourceUserId === authUserId)),
    requireResourceOwnership: mock(async (resourceUserId: string, authUserId: string) => {
        if (resourceUserId !== authUserId) {
            const err = new ForbiddenError();
            Object.defineProperty(err, 'name', { value: 'ForbiddenError', enumerable: true });
            throw err;
        }
    }),
}));

// Mock SyncProvider with a dummy dispatch that does nothing by default
// Individual tests can spy on it or override it if needed.
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
}));

// Mock next/navigation
mock.module("next/navigation", () => ({
    useRouter: () => ({ push: mock(() => { }), back: mock(() => { }), replace: mock(() => { }), refresh: mock(() => { }) }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    redirect: mock(() => { }),
    permanentRedirect: mock(() => { }),
    notFound: mock(() => { }),
}));

// Mock next/dynamic
mock.module("next/dynamic", () => ({
    default: (_fn: () => Promise<unknown>) => (props: Record<string, unknown>) => React.createElement('div', { 'data-testid': 'dynamic-component', ...props })
}));

/**
 * Setup database schema for tests.
 */
export async function setupTestDb() {
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL, first_name TEXT, last_name TEXT, avatar_url TEXT, is_initialized INTEGER NOT NULL DEFAULT 0, use_24h_clock INTEGER, week_starts_on_monday INTEGER, calendar_use_native_tooltips_on_dense_days INTEGER, calendar_dense_tooltip_threshold INTEGER, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS lists(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT DEFAULT '#000000', icon TEXT, slug TEXT NOT NULL, description TEXT, position INTEGER DEFAULT 0 NOT NULL, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')));");
    sqliteConnection.run("CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, icon TEXT, priority TEXT DEFAULT 'none', due_date INTEGER, is_completed INTEGER DEFAULT 0, completed_at INTEGER, is_recurring INTEGER DEFAULT 0, recurring_rule TEXT, parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, estimate_minutes INTEGER, position INTEGER DEFAULT 0 NOT NULL, actual_minutes INTEGER, energy_level TEXT, context TEXT, is_habit INTEGER DEFAULT 0, created_at INTEGER DEFAULT(strftime('%s', 'now')), updated_at INTEGER DEFAULT(strftime('%s', 'now')), deadline INTEGER);");
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
}

/**
 * Helper to create a test user in the SQLite database.
 */
export async function createTestUser(id: string, email: string) {
    sqliteConnection.run("INSERT INTO users (id, email, first_name, last_name) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email", [id, email, "Test", "User"]);
    return { id, email, firstName: "Test", lastName: "User" };
}

/**
 * Reset database tables for test isolation.
 */
export async function resetTestDb() {
    try {
        sqliteConnection.run("DELETE FROM time_entries");
        sqliteConnection.run("DELETE FROM saved_views");
        sqliteConnection.run("DELETE FROM user_achievements");
        sqliteConnection.run("DELETE FROM achievements");
        sqliteConnection.run("DELETE FROM view_settings");
        sqliteConnection.run("DELETE FROM user_stats");
        sqliteConnection.run("DELETE FROM task_logs");
        sqliteConnection.run("DELETE FROM reminders");
        sqliteConnection.run("DELETE FROM habit_completions");
        sqliteConnection.run("DELETE FROM task_dependencies");
        sqliteConnection.run("DELETE FROM task_labels");
        sqliteConnection.run("DELETE FROM tasks");
        sqliteConnection.run("DELETE FROM labels");
        sqliteConnection.run("DELETE FROM lists");
        sqliteConnection.run("DELETE FROM templates");
        sqliteConnection.run("DELETE FROM users");
        sqliteConnection.run("DELETE FROM rate_limits");
    } catch {
        // Ignore errors if tables don't exist yet
    }
}

/**
 * Global afterEach hook to ensure test isolation.
 */
afterEach(async () => {
    await resetTestDb();
    clearMockAuthUser();
    document.body.innerHTML = "";
});
setupTestDb();
