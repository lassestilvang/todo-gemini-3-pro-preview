/**
 * Global mocks that must be registered before any other imports.
 * This file is preloaded before setup.ts to ensure mocks are in place
 * before any modules that depend on them are loaded.
 */
import { mock } from "bun:test";
import React from "react";

// Ensure DB module initializes in test mode even if NODE_ENV isn't set.
if (!process.env.NODE_ENV) {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
}

// Mock react cache to prevent state leakage across tests in the same worker
mock.module("react", () => ({
    ...React,
    cache: <T,>(fn: T) => fn,
}));

// Mock next/navigation globally - must be before any component imports
mock.module("next/navigation", () => ({
    useRouter: () => ({
        push: () => { },
        replace: () => { },
        prefetch: () => { },
        back: () => { },
        forward: () => { },
        refresh: () => { },
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
    notFound: () => { throw new Error("NOT_FOUND"); },
}));

// Mock next/cache globally
mock.module("next/cache", () => ({
    revalidatePath: () => { },
    revalidateTag: () => { },
    unstable_cache: <T,>(fn: T) => fn,
}));

// Mock next/headers globally
mock.module("next/headers", () => ({
    cookies: mock(async () => ({
        get: () => undefined,
        set: () => { },
        delete: () => { },
    })),
    headers: mock(async () => new Map()),
}));

// Mock gemini client globally to prevent AI calls during tests
// Individual tests can override this mock if they need to test AI functionality
mock.module("@/lib/gemini", () => ({
    getGeminiClient: () => null,
    GEMINI_MODEL: "gemini-pro",
}));

// Mock canvas-confetti
mock.module("canvas-confetti", () => ({
    default: () => Promise.resolve(),
}));

/**
 * WorkOS AuthKit mock for testing.
 * Tests can control the mock user via setMockAuthUser().
 * 
 * Note: We use a global object to store the mock user so that the mock function
 * can dynamically read the current value when called.
 */
interface MockAuthUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
}

export const DEFAULT_MOCK_USER = {
    id: "test_user_123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    profilePictureUrl: null,
};

export const mockDb: {
    select: () => { from: () => { where: () => Promise<unknown[]>; limit: () => Promise<unknown[]>; orderBy: () => Promise<unknown[]>; execute: () => Promise<unknown[]> } };
    insert: (table: unknown) => { values: (data: unknown) => { returning: () => Promise<unknown[]> } };
    update: (table: unknown) => { set: (data: unknown) => { where: (condition: unknown) => Promise<unknown[]> } };
    delete: (table: unknown) => { where: (condition: unknown) => Promise<{ deleted: boolean }> };
} = {
    select: () => ({
        from: () => ({
            where: () => Promise.resolve([]),
            limit: () => Promise.resolve([]),
            orderBy: () => Promise.resolve([]),
            execute: () => Promise.resolve([]),
        }),
    }),
    insert: (_table: unknown) => ({
        values: (data: unknown) => ({
            returning: () => Promise.resolve([Object.assign({}, data, { id: Math.random().toString(36).substring(7) })]),
        }),
    }),
    update: (_table: unknown) => ({
        set: (data: unknown) => ({
            where: (_condition: unknown) => Promise.resolve([Object.assign({}, data, { id: "mock-id" })]),
        }),
    }),
    delete: (_table: unknown) => ({
        where: (_condition: unknown) => Promise.resolve({ deleted: true }),
    }),
};

import { AsyncLocalStorage } from "node:async_hooks";

// Storage for mock auth user to ensure thread-safety in parallel tests
const authStorage = new AsyncLocalStorage<MockAuthUser | null>();

// Use globalThis to ensure the mock state is shared across module boundaries as a fallback
const GLOBAL_MOCK_USER_KEY = "__mockAuthUser";
const mockState = globalThis as unknown as Record<string, MockAuthUser | null>;

// Initialize only if not present to preserve state across module reloads
if (mockState[GLOBAL_MOCK_USER_KEY] === undefined) {
    mockState[GLOBAL_MOCK_USER_KEY] = DEFAULT_MOCK_USER;
}

/**
 * Runs a function within a specific authentication context.
 * This is the preferred way to set a mock user for a specific test block.
 * When in an auth context, getMockAuthUser will prioritize this user.
 */
export function runInAuthContext<T>(user: MockAuthUser | null, fn: () => T): T {
    const previousUser = mockState[GLOBAL_MOCK_USER_KEY];
    mockState[GLOBAL_MOCK_USER_KEY] = user;

    try {
        const result = authStorage.run(user, fn);
        if (result && typeof (result as unknown as Promise<unknown>).finally === "function") {
            return (result as unknown as Promise<unknown>).finally(() => {
                mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
            }) as T;
        }

        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        return result;
    } catch (error) {
        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        throw error;
    }
}

export function setMockAuthUser(user: MockAuthUser | null) {
    mockState[GLOBAL_MOCK_USER_KEY] = user;
}

export function clearMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
}

export function resetMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
}

export function getMockAuthUser(): MockAuthUser | null {
    const contextUser = authStorage.getStore();
    // Prioritize AsyncLocalStorage context if we are inside a runInAuthContext call
    if (contextUser !== undefined) {
        return contextUser;
    }
    // Fallback to global state for tests not using runInAuthContext
    return mockState[GLOBAL_MOCK_USER_KEY];
}

mock.module("@workos-inc/authkit-nextjs", () => ({
    withAuth: mock(async () => ({ user: getMockAuthUser() })),
    signOut: mock(() => Promise.resolve()),
}));

/**
 * Reset all mock state to ensure test isolation.
 * Call this in afterEach hooks to prevent state leakage between tests.
 * 
 * Requirements: 3.1, 3.2 - Test isolation and mock reset
 */
export function resetAllMocks() {
    clearMockAuthUser();
}
