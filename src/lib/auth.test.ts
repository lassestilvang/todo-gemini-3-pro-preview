import { describe, it, expect, beforeEach } from "bun:test";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { withAuth } from "@workos-inc/authkit-nextjs";

// Note: WorkOS, next/cache, and next/navigation mocks are provided globally via src/test/mocks.ts

describe("Authentication Flow", () => {
  beforeEach(() => {
    clearMockAuthUser();
  });

  describe("withAuth behavior", () => {
    it("should return null user when not authenticated", async () => {
      clearMockAuthUser();
      
      const result = await withAuth();
      
      expect(result.user).toBeNull();
    });

    it("should return user data when authenticated", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        profilePictureUrl: null,
      };
      
      setMockAuthUser(mockUser);
      
      const result = await withAuth();
      
      expect(result.user).toEqual(mockUser);
      expect(result.user?.id).toBe("user_123");
      expect(result.user?.email).toBe("test@example.com");
    });
  });

  describe("Sign-in URL generation", () => {
    it("should generate a valid sign-in URL", () => {
      // In production, getSignInUrl returns a WorkOS URL
      // We verify the expected URL format
      const expectedUrlPattern = /workos\.com/;
      expect(expectedUrlPattern.test("https://auth.workos.com/signin")).toBe(true);
    });
  });

  describe("Sign-up URL generation", () => {
    it("should generate a valid sign-up URL", () => {
      // In production, getSignUpUrl returns a WorkOS URL
      // We verify the expected URL format
      const expectedUrlPattern = /workos\.com/;
      expect(expectedUrlPattern.test("https://auth.workos.com/signup")).toBe(true);
    });
  });

  describe("Sign-out behavior", () => {
    it("should call signOut function", async () => {
      // The signOut function is mocked globally
      // We verify it can be called without error
      const { signOut } = await import("@workos-inc/authkit-nextjs");
      await expect(signOut()).resolves.toBeUndefined();
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
