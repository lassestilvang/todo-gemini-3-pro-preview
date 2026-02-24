/**
 * Global mocks that must be registered before any other imports.
 * This file is preloaded before setup.ts to ensure mocks are in place
 * before any modules that depend on them are loaded.
 */
import { afterEach, mock } from "bun:test";
import React from "react";
import { AsyncLocalStorage } from "async_hooks";

// Ensure DB module initializes in test mode even if NODE_ENV isn't set.
if (!process.env.NODE_ENV) {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
}

// Create AsyncLocalStorage for isolated test auth context
export const authStorage = new AsyncLocalStorage<MockAuthUser | null>();

/**
 * Runs a callback within an isolated auth context.
 * Use this to ensure tests running in parallel don't interfere with each other's auth state.
 */
export function runInAuthContext<T>(user: MockAuthUser | null, callback: () => T): T {
    // console.log(`[MOCK] Running in auth context: ${user?.id ?? "null"}`);
    return authStorage.run(user, callback);
}

// Mock react cache to prevent state leakage across tests in the same worker
mock.module("react", () => ({
    ...React,
    cache: <T,>(fn: T) => fn,
}));

// Mock next/navigation globally - must be before any component imports
export const mockPush = mock();
export const mockReplace = mock();
export const mockPrefetch = mock();
export const mockBack = mock();
export const mockForward = mock();
export const mockRefresh = mock();

export const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
};

export const mockUseRouter = mock(() => mockRouter);
export const mockUsePathname = mock(() => "/");
export const mockUseSearchParams = mock(() => new URLSearchParams());
export const mockUseParams = mock(() => ({}));
export const mockRedirect = mock((url: string) => { throw new Error(`REDIRECT:${url}`); });
export const mockNotFound = mock(() => { throw new Error("NOT_FOUND"); });

mock.module("next/navigation", () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
    useParams: mockUseParams,
    redirect: mockRedirect,
    notFound: mockNotFound,
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
export const mockGetGeminiClient = mock(() => null);

mock.module("@/lib/gemini", () => ({
    getGeminiClient: mockGetGeminiClient,
    GEMINI_MODEL: "gemini-pro",
}));

// Mock canvas-confetti
mock.module("canvas-confetti", () => ({
    default: () => Promise.resolve(),
}));

// Mock sonner
mock.module("sonner", () => ({
    toast: {
        success: mock(),
        error: mock(),
        info: mock(),
        warning: mock(),
        message: mock(),
    }
}));

// Mock audio library
mock.module("@/lib/audio", () => ({
    playLevelUpSound: mock(() => { }),
    playSuccessSound: mock(() => { }),
}));

// Mock next/dynamic globally
mock.module("next/dynamic", () => ({
    __esModule: true,
    default: () => {
        const DynamicComponent = () => null;
        DynamicComponent.displayName = "DynamicComponentMock";
        return DynamicComponent;
    },
}));

// Mock Stores
export const mockUseTaskStore = mock(() => ({
    tasks: {},
    subtaskIndex: {},
    isInitialized: true,
    initialize: mock(() => Promise.resolve()),
    setTasks: mock(() => {}),
    replaceTasks: mock(() => {}),
    upsertTasks: mock(() => {}),
    upsertTask: mock(() => {}),
    deleteTasks: mock(() => {}),
    deleteTask: mock(() => {}),
    updateSubtaskCompletion: mock(() => {}),
    getTaskBySubtaskId: mock(() => undefined),
}));

export const mockUseListStore = mock(() => ({
    lists: {},
    isInitialized: true,
    initialize: mock(() => Promise.resolve()),
    setLists: mock(() => {}),
    replaceLists: mock(() => {}),
    upsertLists: mock(() => {}),
    upsertList: mock(() => {}),
    deleteLists: mock(() => {}),
    deleteList: mock(() => {}),
}));

export const mockUseLabelStore = mock(() => ({
    labels: {},
    isInitialized: true,
    initialize: mock(() => Promise.resolve()),
    setLabels: mock(() => {}),
    replaceLabels: mock(() => {}),
    upsertLabels: mock(() => {}),
    upsertLabel: mock(() => {}),
    deleteLabels: mock(() => {}),
    deleteLabel: mock(() => {}),
}));

mock.module("@/lib/store/task-store", () => ({
    useTaskStore: mockUseTaskStore
}));

mock.module("@/lib/store/list-store", () => ({
    useListStore: mockUseListStore
}));

mock.module("@/lib/store/label-store", () => ({
    useLabelStore: mockUseLabelStore
}));

export function resetGlobalStoreMocks() {
    mockUseTaskStore.mockImplementation(() => ({
        tasks: {},
        subtaskIndex: {},
        isInitialized: true,
        initialize: mock(() => Promise.resolve()),
        setTasks: mock(() => {}),
        replaceTasks: mock(() => {}),
        upsertTasks: mock(() => {}),
        upsertTask: mock(() => {}),
        deleteTasks: mock(() => {}),
        deleteTask: mock(() => {}),
        updateSubtaskCompletion: mock(() => {}),
        getTaskBySubtaskId: mock(() => undefined),
    }));
    mockUseListStore.mockImplementation(() => ({
        lists: {},
        isInitialized: true,
        initialize: mock(() => Promise.resolve()),
        setLists: mock(() => {}),
        replaceLists: mock(() => {}),
        upsertLists: mock(() => {}),
        upsertList: mock(() => {}),
        deleteLists: mock(() => {}),
        deleteList: mock(() => {}),
    }));
    mockUseLabelStore.mockImplementation(() => ({
        labels: {},
        isInitialized: true,
        initialize: mock(() => Promise.resolve()),
        setLabels: mock(() => {}),
        replaceLabels: mock(() => {}),
        upsertLabels: mock(() => {}),
        upsertLabel: mock(() => {}),
        deleteLabels: mock(() => {}),
        deleteLabel: mock(() => {}),
    }));
    mockUseTaskCounts.mockImplementation(() => ({
        total: 0,
        inbox: 0,
        today: 0,
        upcoming: 0,
        listCounts: {},
        labelCounts: {},
    }));
}

// Mock useTaskCounts
export const mockUseTaskCounts = mock(() => ({
    total: 0,
    inbox: 0,
    today: 0,
    upcoming: 0,
    listCounts: {},
    labelCounts: {},
}));

mock.module("@/hooks/use-task-counts", () => ({
    useTaskCounts: mockUseTaskCounts
}));

// Mock next-themes
export const mockSetTheme = mock(() => { });
export const mockUseTheme = mock(() => ({
    theme: "light",
    setTheme: mockSetTheme,
}));

mock.module("next-themes", () => ({
    useTheme: mockUseTheme,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sync-provider
export const mockDispatch = mock(() => Promise.resolve());
export const mockUseSync = mock(() => ({ dispatch: mockDispatch }));
export const mockUseSyncActions = mock(() => ({ dispatch: mockDispatch }));
export const mockUseOptionalSyncActions = mock(() => ({ dispatch: mockDispatch }));

mock.module("@/components/providers/sync-provider", () => ({
    SyncProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useSyncState: () => ({
        isOnline: true,
        pendingActions: [],
        status: 'online' as const,
        conflicts: [],
    }),
    useSync: mockUseSync,
    useSyncActions: mockUseSyncActions,
    useOptionalSyncActions: mockUseOptionalSyncActions
}));

/**
 * WorkOS AuthKit mock for testing.
 * Tests can control the mock user via setMockAuthUser().
 * 
 * Note: We use a global object to store the mock user so that the mock function
 * can dynamically read the current value when called.
 */
export interface MockAuthUser {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    profilePictureUrl?: string | null;
}

export const DEFAULT_MOCK_USER: MockAuthUser = {
    id: "user_1",
    email: "user_1@example.com",
    firstName: "Test",
    lastName: "User",
    profilePictureUrl: null
};

const GLOBAL_MOCK_USER_KEY = "mockAuthUser";
// Use a global object that persists across module reloads in the same worker
const mockState = globalThis as unknown as Record<string, MockAuthUser | null>;

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

/**
 * Sets the mock user for the current test context.
 * This user will be returned by getCurrentUser() in @/lib/auth.
 * 
 * Usage:
 * beforeEach(() => {
 *   setMockAuthUser({ id: "user_1", email: "test@example.com" });
 * });
 */
export function setMockAuthUser(user: MockAuthUser) {
    console.log(`[MOCK] Setting mock user: ${user.id} (Global: ${!!(globalThis as any).__mockAuthUser}, Env: ${!!process.env.MOCK_AUTH_USER})`);
    mockState[GLOBAL_MOCK_USER_KEY] = user;
    // Also set on globalThis for direct access if needed
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = user;
    // Set env var as fallback/compatibility
    process.env.MOCK_AUTH_USER = JSON.stringify(user);
    console.log(`[MOCK] Set complete. Global matches: ${(globalThis as any).__mockAuthUser?.id === user.id}`);
}

/**
 * Clears the mock user.
 * getCurrentUser() will return null (unauthenticated).
 */
export function clearMockAuthUser() {
    console.log("[MOCK] Clearing mock user");
    mockState[GLOBAL_MOCK_USER_KEY] = null;
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = null;
    delete process.env.MOCK_AUTH_USER;
}

/**
 * Resets the mock user to null.
 * Alias for clearMockAuthUser.
 */
export function resetMockAuthUser() {
    clearMockAuthUser();
}

/**
 * Gets the current mock user.
 * Used by @/lib/auth to retrieve the mocked identity.
 */
export function getMockAuthUser(): MockAuthUser | null {
    // 0. Check AsyncLocalStorage (highest priority, isolated)
    const storageUser = authStorage.getStore();
    if (storageUser !== undefined) {
        console.log(`[MOCK] Getting mock user (storage): ${storageUser?.id}`);
        return storageUser;
    }

    // 1. Check globalThis (primary source)
    const globalUser = (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser;
    console.log(`[MOCK] Getting mock user. Global: ${globalUser?.id}, State: ${mockState[GLOBAL_MOCK_USER_KEY]?.id}, Env: ${!!process.env.MOCK_AUTH_USER}`);
    if (globalUser !== undefined && globalUser !== null) {
        // console.log(`[MOCK] Getting mock user (global): ${globalUser.id}`);
        return globalUser;
    }
    
    // 2. Check mockState (secondary source)
    const stateUser = mockState[GLOBAL_MOCK_USER_KEY];
    if (stateUser !== undefined && stateUser !== null) {
        // console.log(`[MOCK] Getting mock user (state): ${stateUser.id}`);
        return stateUser;
    }
    
    // 3. Check env var (fallback)
    if (process.env.MOCK_AUTH_USER) {
        try {
            const envUser = JSON.parse(process.env.MOCK_AUTH_USER);
            // console.log(`[MOCK] Getting mock user (env): ${envUser.id}`);
            return envUser;
        } catch (e) {
            console.error("[MOCK] Failed to parse MOCK_AUTH_USER", e);
        }
    }
    
    return null;
}

// Expose getMockAuthUser globally to ensure single instance across dynamic imports
(globalThis as any).__getMockAuthUser = getMockAuthUser;

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

afterEach(() => {
    resetMockAuthUser();
});
