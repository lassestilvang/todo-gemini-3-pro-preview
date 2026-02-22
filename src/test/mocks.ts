/**
 * Global mocks that must be registered before any other imports.
 * This file is preloaded before setup.ts to ensure mocks are in place
 * before any modules that depend on them are loaded.
 */
import { mock } from "bun:test";
import React from "react";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-errors";

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
        if (!user) throw new UnauthorizedError();
        if (user.id !== userId) {
            if (process.env.CI) {
                console.error(`[requireUser Mock] Forbidden userId=${userId} mockUser=${user.id} env=${process.env.MOCK_AUTH_USER ?? "unset"}`);
            }
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

// Initialize mock state
const GLOBAL_MOCK_USER_KEY = "__mockAuthUser";
const mockState = globalThis as unknown as Record<string, MockAuthUser | null>;

// Initialize to null (unauthenticated) by default to prevent accidental access
if (mockState[GLOBAL_MOCK_USER_KEY] === undefined) {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
}

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
// (Defined above to ensure early initialization)

/**
 * Runs a function within a specific authentication context.
 * This is the preferred way to set a mock user for a specific test block.
 * When in an auth context, getMockAuthUser will prioritize this user.
 */
export function runInAuthContext<T>(user: MockAuthUser | null, fn: () => T): T {
    const previousUser = mockState[GLOBAL_MOCK_USER_KEY];
    mockState[GLOBAL_MOCK_USER_KEY] = user;
    const previousEnv = process.env.MOCK_AUTH_USER;
    if (user) {
        process.env.MOCK_AUTH_USER = JSON.stringify(user);
    } else {
        delete process.env.MOCK_AUTH_USER;
    }

    try {
        const result = authStorage.run(user, fn);
        if (result && typeof (result as unknown as Promise<unknown>).finally === "function") {
            return (result as unknown as Promise<unknown>).finally(() => {
                mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
                if (previousEnv !== undefined) {
                    process.env.MOCK_AUTH_USER = previousEnv;
                } else {
                    delete process.env.MOCK_AUTH_USER;
                }
            }) as T;
        }

        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        if (previousEnv !== undefined) {
            process.env.MOCK_AUTH_USER = previousEnv;
        } else {
            delete process.env.MOCK_AUTH_USER;
        }
        return result;
    } catch (error) {
        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        if (previousEnv !== undefined) {
            process.env.MOCK_AUTH_USER = previousEnv;
        } else {
            delete process.env.MOCK_AUTH_USER;
        }
        throw error;
    }
}

export function setMockAuthUser(user: MockAuthUser | null) {
    mockState[GLOBAL_MOCK_USER_KEY] = user;
    authStorage.enterWith(user);
    if (user) {
        process.env.MOCK_AUTH_USER = JSON.stringify(user);
    } else {
        delete process.env.MOCK_AUTH_USER;
    }
}

export function clearMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
    delete process.env.MOCK_AUTH_USER;
}

export function resetMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
    delete process.env.MOCK_AUTH_USER;
}

export function getMockAuthUser(): MockAuthUser | null {
    const contextUser = authStorage.getStore();
    if (contextUser !== undefined) {
        return contextUser;
    }
    if (process.env.MOCK_AUTH_USER) {
        try {
            const parsed = JSON.parse(process.env.MOCK_AUTH_USER) as MockAuthUser | null;
            return parsed ?? null;
        } catch {
            return null;
        }
    }
    const globalUser = mockState[GLOBAL_MOCK_USER_KEY];
    if (globalUser !== undefined && globalUser !== null) {
        return globalUser;
    }
    return null;
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
