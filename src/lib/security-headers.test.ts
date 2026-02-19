import { describe, it, expect } from "bun:test";
import nextConfig from "../../next.config";

type HeaderEntry = { key: string; value: string };
type HeaderConfig = { source: string; headers: HeaderEntry[] };

describe("Security Headers", () => {
  it("should return basic security headers (non-prod)", async () => {
    // Check if headers function exists
    expect(typeof nextConfig.headers).toBe("function");

    // Invoke headers()
    const headersConfig = (await nextConfig.headers!()) as HeaderConfig[];

    // Find the headers for catch-all route (/:path*)
    const catchAllHeaders = headersConfig.find((h) => h.source === "/:path*");
    expect(catchAllHeaders).toBeDefined();

    const headers = catchAllHeaders!.headers;
    const headerMap = new Map(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

    // HSTS should NOT be present in non-prod
    expect(headerMap.has("Strict-Transport-Security")).toBe(false);

    // Basic headers should be present
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
    expect(headerMap.get("Permissions-Policy")).not.toContain("microphone=()");
  });

  it("should have correct CSP and HSTS in production", async () => {
    // Mock process.env.NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
        const headersConfig = (await nextConfig.headers!()) as HeaderConfig[];
        const catchAllHeaders = headersConfig.find((h) => h.source === "/:path*");
        const headers = catchAllHeaders!.headers;
        const headerMap = new Map(headers.map((h) => [h.key, h.value]));

        // HSTS should be present
        expect(headerMap.get("Strict-Transport-Security")).toBe(
            "max-age=63072000; includeSubDomains; preload"
        );

        // CSP should be present
        const csp = headerMap.get("Content-Security-Policy");
        expect(csp).toBeDefined();

        // Check for specific directives
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self'");
        // Check for google/github/workos avatars in img-src
        expect(csp).toContain("https://*.googleusercontent.com");
        expect(csp).toContain("https://avatars.githubusercontent.com");
        expect(csp).toContain("https://*.workos.com");
        // Check for connect-src
        expect(csp).toContain("connect-src 'self' https://*.workos.com");

    } finally {
        process.env.NODE_ENV = originalEnv;
    }
  });
});
