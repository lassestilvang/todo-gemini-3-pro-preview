/**
 * Global mocks that must be registered before any other imports.
 * This file is preloaded before setup.ts to ensure mocks are in place
 * before any modules that depend on them are loaded.
 */
import { mock } from "bun:test";

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
    unstable_cache: (fn: unknown) => fn,
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
    insert: (_table: unknown) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
        values: (data: unknown) => ({
            returning: () => Promise.resolve([Object.assign({}, data, { id: Math.random().toString(36).substring(7) })]),
        }),
    }),
    update: (_table: unknown) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
        set: (data: unknown) => ({
            where: (_condition: unknown) => Promise.resolve([Object.assign({}, data, { id: "mock-id" })]), // eslint-disable-line @typescript-eslint/no-unused-vars
        }),
    }),
    delete: (_table: unknown) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
        where: (_condition: unknown) => Promise.resolve({ deleted: true }), // eslint-disable-line @typescript-eslint/no-unused-vars
    }),
};

// Use globalThis to ensure the mock state is shared across module boundaries
const mockState = globalThis as unknown as { __mockAuthUser: MockAuthUser | null | typeof DEFAULT_MOCK_USER };
mockState.__mockAuthUser = DEFAULT_MOCK_USER;

export function setMockAuthUser(user: MockAuthUser | null) {
    mockState.__mockAuthUser = user;
}

export function clearMockAuthUser() {
    mockState.__mockAuthUser = null;
}

export function getMockAuthUser(): MockAuthUser | null {
    return mockState.__mockAuthUser as MockAuthUser | null;
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
