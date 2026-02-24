/**
 * Global mocks that must be registered before any other imports.
 * This file is preloaded before setup.ts to ensure mocks are in place
 * before any modules that depend on them are loaded.
 */
import { afterEach, mock } from "bun:test";
import React from "react";
import { getMockAuthUser, resetMockAuthUser } from "./auth-helpers";

// Re-export auth helpers for convenience, though direct import is preferred
export * from "./auth-helpers";

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
    resetMockAuthUser();
}

afterEach(() => {
    resetMockAuthUser();
});
