import { AsyncLocalStorage } from "node:async_hooks";

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

// Storage for mock auth user to ensure thread-safety in parallel tests
const authStorage = new AsyncLocalStorage<MockAuthUser | null>();

/**
 * Runs a function within a specific authentication context.
 * This is the preferred way to set a mock user for a specific test block.
 * When in an auth context, getMockAuthUser will prioritize this user.
 */
export function runInAuthContext<T>(user: MockAuthUser | null, fn: () => T): T {
    const previousUser = mockState[GLOBAL_MOCK_USER_KEY];
    mockState[GLOBAL_MOCK_USER_KEY] = user;
    const previousGlobalUser = (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser;
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = user ?? null;
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
                (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = previousGlobalUser ?? null;
                if (previousEnv !== undefined) {
                    process.env.MOCK_AUTH_USER = previousEnv;
                } else {
                    delete process.env.MOCK_AUTH_USER;
                }
            }) as T;
        }

        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = previousGlobalUser ?? null;
        if (previousEnv !== undefined) {
            process.env.MOCK_AUTH_USER = previousEnv;
        } else {
            delete process.env.MOCK_AUTH_USER;
        }
        return result;
    } catch (error) {
        mockState[GLOBAL_MOCK_USER_KEY] = previousUser;
        (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = previousGlobalUser ?? null;
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
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = user ?? null;
    if (user) {
        process.env.MOCK_AUTH_USER = JSON.stringify(user);
    } else {
        delete process.env.MOCK_AUTH_USER;
    }
}

export function clearMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = null;
    delete process.env.MOCK_AUTH_USER;
}

export function resetMockAuthUser() {
    mockState[GLOBAL_MOCK_USER_KEY] = null;
    (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser = null;
    delete process.env.MOCK_AUTH_USER;
}

export function getMockAuthUser(): MockAuthUser | null {
    const contextUser = authStorage.getStore();
    if (contextUser !== undefined) {
        return contextUser;
    }
    const globalUser = (globalThis as { __mockAuthUser?: MockAuthUser | null }).__mockAuthUser;
    if (globalUser !== undefined && globalUser !== null) {
        return globalUser;
    }
    const stateUser = mockState[GLOBAL_MOCK_USER_KEY];
    if (stateUser !== undefined && stateUser !== null) {
        return stateUser;
    }
    return null;
}
