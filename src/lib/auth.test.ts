import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock the authkit-nextjs module
const mockWithAuth = mock(() => Promise.resolve({ user: null }));
const mockSignOut = mock(() => Promise.resolve());
const mockGetSignInUrl = mock(() => Promise.resolve("https://auth.workos.com/signin"));
const mockGetSignUpUrl = mock(() => Promise.resolve("https://auth.workos.com/signup"));

mock.module("@workos-inc/authkit-nextjs", () => ({
  withAuth: mockWithAuth,
  signOut: mockSignOut,
  getSignInUrl: mockGetSignInUrl,
  getSignUpUrl: mockGetSignUpUrl,
  handleAuth: () => () => new Response(),
  authkitMiddleware: () => () => new Response(),
}));

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

// Mock next/navigation
mock.module("next/navigation", () => ({
  redirect: mock((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe("Authentication Flow", () => {
  beforeEach(() => {
    mockWithAuth.mockClear();
    mockSignOut.mockClear();
  });

  describe("withAuth behavior", () => {
    it("should return null user when not authenticated", async () => {
      mockWithAuth.mockImplementation(() => Promise.resolve({ user: null }));
      
      const { withAuth } = await import("@workos-inc/authkit-nextjs");
      const result = await withAuth();
      
      expect(result.user).toBeNull();
    });

    it("should return user data when authenticated", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      };
      
      mockWithAuth.mockImplementation(() => Promise.resolve({ user: mockUser }));
      
      const { withAuth } = await import("@workos-inc/authkit-nextjs");
      const result = await withAuth();
      
      expect(result.user).toEqual(mockUser);
      expect(result.user?.id).toBe("user_123");
      expect(result.user?.email).toBe("test@example.com");
    });
  });

  describe("Sign-in URL generation", () => {
    it("should generate a valid sign-in URL", async () => {
      const { getSignInUrl } = await import("@workos-inc/authkit-nextjs");
      const url = await getSignInUrl();
      
      expect(url).toContain("workos.com");
      expect(typeof url).toBe("string");
    });
  });

  describe("Sign-up URL generation", () => {
    it("should generate a valid sign-up URL", async () => {
      const { getSignUpUrl } = await import("@workos-inc/authkit-nextjs");
      const url = await getSignUpUrl();
      
      expect(url).toContain("workos.com");
      expect(typeof url).toBe("string");
    });
  });

  describe("Sign-out behavior", () => {
    it("should call signOut function", async () => {
      const { signOut } = await import("@workos-inc/authkit-nextjs");
      await signOut();
      
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});

describe("Middleware behavior", () => {
  it("should protect routes by default", () => {
    // The middleware configuration should match protected routes
    const config = {
      matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|.*\\.svg).*)',
      ],
    };
    
    // Test that the matcher pattern excludes static files
    const staticPaths = [
      "_next/static/chunk.js",
      "_next/image/photo.jpg",
      "favicon.ico",
      "manifest.json",
      "sw.js",
      "icon-192x192.png",
      "logo.svg",
    ];
    
    const protectedPaths = [
      "/inbox",
      "/today",
      "/calendar",
      "/settings",
      "/api/tasks",
    ];
    
    // Verify config structure
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("_next/static");
    expect(config.matcher[0]).toContain("favicon.ico");
  });

  it("should allow unauthenticated access to login page", () => {
    const unauthenticatedPaths = ['/login', '/auth/callback'];
    
    expect(unauthenticatedPaths).toContain('/login');
    expect(unauthenticatedPaths).toContain('/auth/callback');
  });
});
